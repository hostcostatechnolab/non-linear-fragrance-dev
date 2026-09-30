import prisma from "./db.server";
import { PLAN_FEATURES, type PlanFeatures, type PlanId } from "./plan.constants";
import { PRO_PLAN, STARTER_PLAN, type authenticate } from "./shopify.server";

type AdminSession = Awaited<ReturnType<typeof authenticate.admin>>;
type Admin = AdminSession["admin"];
type Billing = AdminSession["billing"];

type PaidPlanId = "starter" | "pro";

const PLAN_TO_BILLING_NAME: Record<PaidPlanId, string> = {
  starter: STARTER_PLAN,
  pro: PRO_PLAN,
};

const BILLING_NAME_TO_PLAN: Record<string, PaidPlanId> = {
  [STARTER_PLAN]: "starter",
  [PRO_PLAN]: "pro",
};

export function billingPlanName(
  plan: PaidPlanId,
): typeof STARTER_PLAN | typeof PRO_PLAN {
  return PLAN_TO_BILLING_NAME[plan] as typeof STARTER_PLAN | typeof PRO_PLAN;
}

// Real charges are opt-in: NODE_ENV is always "production" on Vercel, so it
// can't distinguish a dev-store deployment from a live App Store launch.
export function isTestMode(): boolean {
  return process.env.BILLING_LIVE !== "true";
}

export async function getPlan(shop: string): Promise<PlanId> {
  const row = await prisma.shopPlan.findUnique({ where: { shop } });
  return (row?.plan as PlanId | undefined) ?? "free";
}

export async function getPlanContext(
  shop: string,
): Promise<{ plan: PlanId; features: PlanFeatures }> {
  const plan = await getPlan(shop);
  return { plan, features: PLAN_FEATURES[plan] };
}

export function requireFeature(plan: PlanId, key: keyof PlanFeatures): void {
  if (!PLAN_FEATURES[plan][key]) {
    throw new Response("Upgrade required", { status: 403 });
  }
}

export async function setPlan(
  shop: string,
  plan: PlanId,
  admin: Admin,
): Promise<void> {
  await prisma.shopPlan.upsert({
    where: { shop },
    create: { shop, plan },
    update: { plan },
  });
  await syncPlanMetafield(admin, shop, plan);
}

async function getShopGid(admin: Admin, shop: string): Promise<string | null> {
  const row = await prisma.shopPlan.findUnique({ where: { shop } });
  if (row?.shopGid) return row.shopGid;

  const response = await admin.graphql(`#graphql
    query FragranceWheelShopId {
      shop { id }
    }`);
  const responseJson = await response.json();
  const shopGid = responseJson.data?.shop?.id ?? null;
  if (shopGid) {
    await prisma.shopPlan.upsert({
      where: { shop },
      create: { shop, shopGid },
      update: { shopGid },
    });
  }
  return shopGid;
}

async function syncPlanMetafield(
  admin: Admin,
  shop: string,
  plan: PlanId,
): Promise<void> {
  const shopGid = await getShopGid(admin, shop);
  if (!shopGid) return;

  const response = await admin.graphql(
    `#graphql
      mutation SetFragranceWheelPlan($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields { id namespace key value }
          userErrors { field message code }
        }
      }`,
    {
      variables: {
        metafields: [
          {
            ownerId: shopGid,
            namespace: "$app",
            key: "plan",
            type: "single_line_text_field",
            value: plan,
          },
        ],
      },
    },
  );
  const responseJson = await response.json();
  const userErrors = responseJson.data?.metafieldsSet?.userErrors ?? [];
  if (userErrors.length) {
    // eslint-disable-next-line no-console
    console.error("Failed to sync plan metafield", userErrors);
    return;
  }
  await prisma.shopPlan.update({ where: { shop }, data: { syncedPlan: plan } });
}

export async function ensurePlanMirrored(admin: Admin, shop: string): Promise<void> {
  const row = await prisma.shopPlan.findUnique({ where: { shop } });
  const plan = (row?.plan as PlanId | undefined) ?? "free";
  if (row?.syncedPlan === plan) return;
  await syncPlanMetafield(admin, shop, plan);
}

/** Resolves the plan implied by a shop's active Shopify subscriptions, defaulting to free. */
export function planFromSubscriptionName(name: string | undefined): PlanId {
  if (!name) return "free";
  return BILLING_NAME_TO_PLAN[name] ?? "free";
}

/**
 * Shopify's active subscription state is the source of truth. This checks it
 * against our cached ShopPlan row and re-syncs (DB + metafield) if they've
 * drifted apart — the guaranteed-eventually-correct fallback for a missed
 * app_subscriptions/update webhook.
 */
export async function reconcilePlanWithBilling(
  admin: Admin,
  billing: Billing,
  shop: string,
): Promise<PlanId> {
  const { appSubscriptions } = await billing.check({ isTest: isTestMode() });
  const active = appSubscriptions.find((sub) => sub.status === "ACTIVE");
  const resolvedPlan = planFromSubscriptionName(active?.name);

  const cached = await getPlan(shop);
  if (cached !== resolvedPlan) {
    await setPlan(shop, resolvedPlan, admin);
  }
  return resolvedPlan;
}
