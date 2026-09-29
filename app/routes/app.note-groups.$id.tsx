import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useFetcher, useLoaderData } from "react-router";

import { authenticate } from "../shopify.server";
import { getPlanContext, requireFeature } from "../plan.server";

function toGid(id: string) {
  return id.startsWith("gid://") ? id : `gid://shopify/Metaobject/${id}`;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { plan } = await getPlanContext(session.shop);
  requireFeature(plan, "noteGroups");

  const response = await admin.graphql(
    `#graphql
      query FragranceNoteGroup($id: ID!) {
        metaobject(id: $id) {
          id
          fields { key value }
        }
      }`,
    { variables: { id: toGid(params.id as string) } },
  );

  const responseJson = await response.json();
  const node = responseJson.data?.metaobject;
  if (!node) {
    throw new Response("Note group not found", { status: 404 });
  }

  const fieldMap: Record<string, string | null> = {};
  for (const field of node.fields as { key: string; value: string | null }[]) {
    fieldMap[field.key] = field.value;
  }

  return { id: node.id as string, name: fieldMap.name ?? "" };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { plan } = await getPlanContext(session.shop);
  requireFeature(plan, "noteGroups");

  const formData = await request.formData();
  const id = toGid(params.id as string);
  const intent = formData.get("_action");

  if (intent === "delete") {
    await admin.graphql(
      `#graphql
        mutation DeleteFragranceNoteGroup($id: ID!) {
          metaobjectDelete(id: $id) {
            deletedId
            userErrors { field message }
          }
        }`,
      { variables: { id } },
    );
    return redirect("/app/note-groups?deleted=1");
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) {
    return { errors: [{ field: ["name"], message: "Name is required" }] };
  }

  const response = await admin.graphql(
    `#graphql
      mutation UpdateFragranceNoteGroup($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject { id }
          userErrors { field message code }
        }
      }`,
    { variables: { id, metaobject: { fields: [{ key: "name", value: name }] } } },
  );

  const responseJson = await response.json();
  const userErrors = responseJson.data?.metaobjectUpdate?.userErrors ?? [];
  if (userErrors.length) {
    return { errors: userErrors };
  }

  return redirect("/app/note-groups?updated=1");
};

export default function EditNoteGroup() {
  const group = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const deleteFetcher = useFetcher();
  const isSaving = fetcher.state !== "idle";
  const isDeleting = deleteFetcher.state !== "idle";

  const errors: { field: string[] | null; message: string }[] =
    (fetcher.data && "errors" in fetcher.data && fetcher.data.errors) || [];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetcher.submit(new FormData(event.currentTarget), { method: "POST" });
  };

  const handleDelete = () => {
    deleteFetcher.submit({ _action: "delete" }, { method: "POST" });
  };

  return (
    <s-page heading="Edit note group">
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

            <s-text-field
              name="name"
              label="Group name"
              required
              defaultValue={group.name}
            ></s-text-field>

            <s-stack direction="inline" gap="small">
              <s-button
                type="submit"
                variant="primary"
                {...(isSaving ? { loading: true } : {})}
              >
                Save
              </s-button>
              <s-button
                variant="tertiary"
                tone="critical"
                onClick={handleDelete}
                {...(isDeleting ? { loading: true } : {})}
              >
                Delete
              </s-button>
            </s-stack>
          </s-stack>
        </s-section>
      </form>
    </s-page>
  );
}
