import type { ActionFunctionArgs } from "react-router";

import { authenticate } from "../shopify.server";
import db from "../db.server";

// Mandatory GDPR/privacy webhooks. authenticate.webhook rejects requests
// with an invalid HMAC (401), which App Store review checks for.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  const normalized = String(topic).toUpperCase().replace(/\//g, "_");

  console.log(`Received ${normalized} webhook for ${shop}`);

  switch (normalized) {
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
      // No shopper data is stored: click events hold only note identifiers.
      break;
    case "SHOP_REDACT":
      await db.$transaction([
        db.clickEvent.deleteMany({ where: { shop } }),
        db.shopPlan.deleteMany({ where: { shop } }),
        db.session.deleteMany({ where: { shop } }),
      ]);
      break;
  }

  return new Response();
};
