import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <s-page heading="Non-Linear Fragrance">
      <s-button slot="primary-action" href="/app/fragrance-notes">
        Manage fragrance notes
      </s-button>

      <s-section heading="Welcome">
        <s-paragraph>
          Add your fragrance notes here, then install the "Fragrance Wheel"
          app block from your theme editor to display the animated evolution
          wheel on your storefront.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
