import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useSearchParams } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getPlanContext, requireFeature } from "../plan.server";

type GroupRow = { id: string; handle: string; name: string };

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { plan } = await getPlanContext(session.shop);
  requireFeature(plan, "noteGroups");

  const response = await admin.graphql(`#graphql
    query FragranceNoteGroups($first: Int!) {
      metaobjects(type: "$app:fragrance_note_group", first: $first, sortKey: "updated_at", reverse: true) {
        edges {
          node {
            id
            handle
            fields { key value }
          }
        }
      }
    }`,
    { variables: { first: 50 } },
  );

  const responseJson = await response.json();
  const edges = responseJson.data?.metaobjects?.edges ?? [];

  const groups: GroupRow[] = edges.map(
    ({ node }: { node: { id: string; handle: string; fields: { key: string; value: string | null }[] } }) => {
      const fieldMap: Record<string, string | null> = {};
      for (const field of node.fields) {
        fieldMap[field.key] = field.value;
      }
      return { id: node.id, handle: node.handle, name: fieldMap.name ?? "(untitled)" };
    },
  );

  return { groups };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { plan } = await getPlanContext(session.shop);
  requireFeature(plan, "noteGroups");

  const formData = await request.formData();
  const id = formData.get("id");

  if (typeof id !== "string") {
    return { error: "Missing id" };
  }

  const response = await admin.graphql(
    `#graphql
      mutation DeleteFragranceNoteGroup($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors { field message }
        }
      }`,
    { variables: { id } },
  );

  const responseJson = await response.json();
  return { deletedId: responseJson.data?.metaobjectDelete?.deletedId };
};

export default function NoteGroupsIndex() {
  const { groups } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const messages: Record<string, string> = {
      created: "Note group created",
      updated: "Note group updated",
      deleted: "Note group deleted",
    };
    const flag = Object.keys(messages).find((key) => searchParams.get(key));
    if (flag) {
      shopify.toast.show(messages[flag]);
      setSearchParams(
        (prev) => {
          prev.delete(flag);
          return prev;
        },
        { replace: true },
      );
    }
  }, [searchParams, setSearchParams, shopify]);

  const handleDelete = (id: string) => {
    fetcher.submit({ id }, { method: "POST" });
  };

  return (
    <s-page heading="Note Groups">
      <s-button slot="primary-action" href="/app/note-groups/new">
        Add group
      </s-button>

      <s-section>
        <s-paragraph>
          Notes assigned to a group only render in wheels whose block is set
          to that group. Deleting a group leaves its notes group-less.
        </s-paragraph>
        {groups.length === 0 ? (
          <s-paragraph>
            No note groups yet. Add one to curate a different wheel per page.
          </s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Name</s-table-header>
              <s-table-header listSlot="inline"></s-table-header>
            </s-table-header-row>
            <s-table-body>
              {groups.map((group) => (
                <s-table-row key={group.id}>
                  <s-table-cell>{group.name}</s-table-cell>
                  <s-table-cell>
                    <s-stack direction="inline" gap="small">
                      <s-button
                        href={`/app/note-groups/${group.id.split("/").pop()}`}
                        variant="tertiary"
                      >
                        Edit
                      </s-button>
                      <s-button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => handleDelete(group.id)}
                      >
                        Delete
                      </s-button>
                    </s-stack>
                  </s-table-cell>
                </s-table-row>
              ))}
            </s-table-body>
          </s-table>
        )}
      </s-section>
    </s-page>
  );
}
