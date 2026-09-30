import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";

import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export default function Index() {
  return (
    <s-page heading="Blend Wheel">
      <s-button slot="primary-action" href="/app/fragrance-notes">
        Manage notes
      </s-button>

      <s-section heading="Welcome">
        <s-paragraph>
          Add your notes here, then add the "Blend Wheel" app block from your
          theme editor to display the animated evolution wheel on your
          storefront.
        </s-paragraph>
      </s-section>
    </s-page>
  );
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
