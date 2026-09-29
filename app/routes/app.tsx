import { useEffect } from "react";
import type { HeadersFunction, LoaderFunctionArgs } from "react-router";
import {
  Outlet,
  useLoaderData,
  useNavigation,
  useRouteError,
} from "react-router";
import { boundary } from "@shopify/shopify-app-react-router/server";
import { AppProvider } from "@shopify/shopify-app-react-router/react";

import { authenticate } from "../shopify.server";
import { ensurePlanMirrored, getPlan } from "../plan.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const plan = await getPlan(session.shop);
  await ensurePlanMirrored(admin, session.shop);

  // eslint-disable-next-line no-undef
  return { apiKey: process.env.SHOPIFY_API_KEY || "", plan };
};

export default function App() {
  const { apiKey, plan } = useLoaderData<typeof loader>();

  return (
    <AppProvider embedded apiKey={apiKey}>
      <s-app-nav>
        <s-link href="/app">Home</s-link>
        <s-link href="/app/fragrance-notes">Fragrance Notes</s-link>
        {plan === "pro" && (
          <s-link href="/app/note-groups">Note Groups</s-link>
        )}
        {plan === "pro" && <s-link href="/app/analytics">Analytics</s-link>}
        {plan === "pro" && <s-link href="/app/templates">Templates</s-link>}
        <s-link href="/app/settings">Plan</s-link>
      </s-app-nav>
      <PageLoader />
      <Outlet />
    </AppProvider>
  );
}

function PageLoader() {
  const navigation = useNavigation();
  const isLoading = navigation.state === "loading";

  useEffect(() => {
    window.shopify?.loading(isLoading);
  }, [isLoading]);

  if (!isLoading) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(241, 241, 241, 0.7)",
      }}
      aria-busy="true"
    >
      <s-spinner accessibilityLabel="Loading page" size="large" />
    </div>
  );
}

// Shopify needs React Router to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
