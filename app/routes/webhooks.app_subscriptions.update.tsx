import type { ActionFunctionArgs } from "react-router";
import { authenticate } from "../shopify.server";
import { planFromSubscriptionName, setPlan } from "../plan.server";

export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, session, admin, topic, payload } =
    await authenticate.webhook(request);

  console.log(`Received ${topic} webhook for ${shop}`);

  // Webhook requests can trigger after an app has already been uninstalled,
  // in which case there's no session/admin client to write with.
  if (!session || !admin) {
    return new Response();
  }

  const subscription = (payload as { app_subscription?: { name?: string; status?: string } })
    .app_subscription;
  const resolvedPlan =
    subscription?.status === "ACTIVE"
      ? planFromSubscriptionName(subscription.name)
      : "free";

  await setPlan(shop, resolvedPlan, admin);

  return new Response();
};
