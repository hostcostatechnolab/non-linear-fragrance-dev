import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useEffect, useState } from "react";
import { useFetcher, useLoaderData, useSearchParams } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import {
  billingPlanName,
  isTestMode,
  reconcilePlanWithBilling,
  setPlan,
} from "../plan.server";
import { PLAN_IDS, PLAN_LABELS, isPlanId, type PlanId } from "../plan.constants";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const plan = await reconcilePlanWithBilling(admin, billing, session.shop);
  return { plan };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, billing, session } = await authenticate.admin(request);
  const formData = await request.formData();
  const nextPlan = formData.get("plan");

  if (!isPlanId(nextPlan)) {
    return { errors: [{ message: "Invalid plan" }] };
  }

  if (nextPlan === "free") {
    const { appSubscriptions } = await billing.check({ isTest: isTestMode() });
    const active = appSubscriptions.find((sub) => sub.status === "ACTIVE");
    if (active) {
      await billing.cancel({ subscriptionId: active.id, isTest: isTestMode() });
    }
    await setPlan(session.shop, "free", admin);
    return { updated: true };
  }

  await billing.request({
    plan: billingPlanName(nextPlan as Exclude<PlanId, "free">),
    isTest: isTestMode(),
    trialDays: 7,
    // No returnUrl: the library's default correctly builds the embedded
    // admin.shopify.com URL — a manually-built one from request.url points
    // at our raw app host instead and drops the merchant outside the
    // embedded admin frame after approval.
  });
  // billing.request() always throws a redirect Response — this line never runs.
  return null;
};

export default function Settings() {
  const { plan } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const shopify = useAppBridge();
  const [searchParams, setSearchParams] = useSearchParams();
  const isSaving = fetcher.state !== "idle";
  const [cooldownUntil, setCooldownUntil] = useState<number>(0);
  const isInCooldown = Date.now() < cooldownUntil;

  useEffect(() => {
    // "planUpdated" comes from our own free-plan fetcher flow; "charge_id"
    // is what Shopify appends when redirecting back after a billing approval.
    if (searchParams.get("planUpdated") || searchParams.get("charge_id")) {
      shopify.toast.show("Plan updated");
      setCooldownUntil(Date.now() + 5000); // 5 second cooldown after plan change
      setSearchParams(
        (prev) => {
          prev.delete("planUpdated");
          prev.delete("charge_id");
          return prev;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams, shopify]);

  useEffect(() => {
    if (fetcher.data && "updated" in fetcher.data && fetcher.data.updated) {
      shopify.toast.show("Plan updated");
      setCooldownUntil(Date.now() + 5000); // 5 second cooldown after plan change
    }
  }, [fetcher.data, shopify]);

  useEffect(() => {
    if (!isInCooldown) return;
    const timer = setTimeout(() => {
      setCooldownUntil(0);
    }, cooldownUntil - Date.now() + 100);
    return () => clearTimeout(timer);
  }, [isInCooldown, cooldownUntil]);

  const [selectedPlan, setSelectedPlan] = useState<PlanId>(plan);

  // Free-plan changes are a normal JS fetch — no redirect involved.
  // Starter/Pro must be a REAL, un-intercepted browser form submission: the
  // billing.request() redirect only breaks out of the embedded admin iframe
  // correctly for a genuine navigation (no Authorization header attached).
  // A fetcher.submit() carries the App Bridge session-token header, which
  // routes the redirect down a different, XHR-specific path that a fetcher
  // can't follow out of the iframe, and surfaces as a raw 401 instead.
  //
  // Read the submitted value straight from the form (not the `selectedPlan`
  // state) — deciding based on React state risks a stale read if Save is
  // clicked before a state update from the select's change event has
  // committed, silently sending a paid-plan pick down the free/fetcher path.
  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (isInCooldown) {
      event.preventDefault();
      return;
    }
    const formData = new FormData(event.currentTarget);
    if (formData.get("plan") !== "free") return; // let the native submit proceed
    event.preventDefault();
    fetcher.submit(formData, { method: "POST" });
  };

  return (
    <s-page heading="Plan">
      <s-section heading="Non-Linear Fragrance plan">
        <s-stack direction="block" gap="base">
          <s-paragraph>
            You're on the <strong>{PLAN_LABELS[plan]}</strong> plan.
            {plan !== "free" &&
              " Changing plans below starts a 7-day free trial before you're charged."}
          </s-paragraph>

          <form method="post" onSubmit={handleSubmit}>
            <s-stack direction="block" gap="base">
              <s-select
                name="plan"
                label="Plan"
                value={selectedPlan}
                onChange={(event: Event) => {
                  const value = (event.target as HTMLSelectElement).value;
                  if (isPlanId(value)) setSelectedPlan(value);
                }}
              >
                {PLAN_IDS.map((id) => (
                  <s-option key={id} value={id}>
                    {PLAN_LABELS[id]}
                  </s-option>
                ))}
              </s-select>
              <s-button
                type="submit"
                variant="primary"
                disabled={isInCooldown}
                {...(isSaving ? { loading: true } : {})}
              >
                {isInCooldown ? "Wait before changing..." : "Save"}
              </s-button>
            </s-stack>
          </form>
        </s-stack>
      </s-section>
    </s-page>
  );
}
