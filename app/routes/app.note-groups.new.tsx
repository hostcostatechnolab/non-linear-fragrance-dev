import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useFetcher } from "react-router";

import { authenticate } from "../shopify.server";
import { getPlanContext, requireFeature } from "../plan.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { plan } = await getPlanContext(session.shop);
  requireFeature(plan, "noteGroups");
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { plan } = await getPlanContext(session.shop);
  requireFeature(plan, "noteGroups");

  const formData = await request.formData();
  const name = String(formData.get("name") || "").trim();

  if (!name) {
    return { errors: [{ field: ["name"], message: "Name is required" }] };
  }

  const response = await admin.graphql(
    `#graphql
      mutation CreateFragranceNoteGroup($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject { id }
          userErrors { field message code }
        }
      }`,
    {
      variables: {
        metaobject: { type: "$app:fragrance_note_group", fields: [{ key: "name", value: name }] },
      },
    },
  );

  const responseJson = await response.json();
  const userErrors = responseJson.data?.metaobjectCreate?.userErrors ?? [];
  if (userErrors.length) {
    return { errors: userErrors };
  }

  return redirect("/app/note-groups?created=1");
};

export default function NewNoteGroup() {
  const fetcher = useFetcher<typeof action>();
  const isSaving = fetcher.state !== "idle";

  const errors: { field: string[] | null; message: string }[] =
    (fetcher.data && "errors" in fetcher.data && fetcher.data.errors) || [];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetcher.submit(new FormData(event.currentTarget), { method: "POST" });
  };

  return (
    <s-page heading="Add note group">
      <form onSubmit={handleSubmit}>
        <s-section>
          <s-stack direction="block" gap="base">
            {errors.length > 0 && (
              <s-banner tone="critical" heading="Couldn't save group">
                <s-paragraph>
                  {errors.map((e) => e.message).join(", ")}
                </s-paragraph>
              </s-banner>
            )}

            <s-text-field name="name" label="Group name" required></s-text-field>

            <s-button
              type="submit"
              variant="primary"
              {...(isSaving ? { loading: true } : {})}
            >
              Save
            </s-button>
          </s-stack>
        </s-section>
      </form>
    </s-page>
  );
}
