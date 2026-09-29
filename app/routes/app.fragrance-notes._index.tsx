import { useEffect } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { useFetcher, useLoaderData, useSearchParams } from "react-router";
import { useAppBridge } from "@shopify/app-bridge-react";

import { authenticate } from "../shopify.server";
import { getPlanContext } from "../plan.server";

type MetaobjectField = {
  key: string;
  value: string | null;
  reference?: { image?: { url: string }; displayName?: string } | null;
};

type FragranceNoteRow = {
  id: string;
  handle: string;
  label: string;
  imageUrl: string | null;
  link: string | null;
  groupName: string | null;
};

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { plan, features } = await getPlanContext(session.shop);

  const response = await admin.graphql(
    `#graphql
      query FragranceNotes($first: Int!) {
        metaobjects(type: "$app:fragrance_note", first: $first, sortKey: "updated_at", reverse: true) {
          edges {
            node {
              id
              handle
              fields {
                key
                value
                reference {
                  ... on MediaImage {
                    image {
                      url
                    }
                  }
                  ... on Metaobject {
                    displayName
                  }
                }
              }
            }
          }
        }
      }`,
    { variables: { first: 50 } },
  );

  const responseJson = await response.json();
  const edges = responseJson.data?.metaobjects?.edges ?? [];

  const notes: FragranceNoteRow[] = edges.map(
    ({ node }: { node: { id: string; handle: string; fields: MetaobjectField[] } }) => {
      const fieldMap: Record<string, MetaobjectField> = {};
      for (const field of node.fields) {
        fieldMap[field.key] = field;
      }
      return {
        id: node.id,
        handle: node.handle,
        label: fieldMap.label?.value ?? "(untitled)",
        imageUrl: fieldMap.image?.reference?.image?.url ?? null,
        link: fieldMap.link?.value ?? null,
        groupName: fieldMap.group?.reference?.displayName ?? null,
      };
    },
  );

  const maxNotes = features.maxNotes;
  const atLimit = maxNotes !== null && notes.length >= maxNotes;

  return { notes, plan, maxNotes, atLimit };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const id = formData.get("id");

  if (typeof id !== "string") {
    return { error: "Missing id" };
  }

  const response = await admin.graphql(
    `#graphql
      mutation DeleteFragranceNote($id: ID!) {
        metaobjectDelete(id: $id) {
          deletedId
          userErrors {
            field
            message
          }
        }
      }`,
    { variables: { id } },
  );

  const responseJson = await response.json();
  return { deletedId: responseJson.data?.metaobjectDelete?.deletedId };
};

export default function FragranceNotesIndex() {
  const { notes, plan, maxNotes, atLimit } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const messages: Record<string, string> = {
      created: "Fragrance note created",
      updated: "Fragrance note updated",
      deleted: "Fragrance note deleted",
      limit: "Note limit reached for your plan",
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
    <s-page heading="Fragrance Notes">
      <s-button
        slot="primary-action"
        href={atLimit ? "/app/settings" : "/app/fragrance-notes/new"}
        {...(atLimit ? { disabled: true } : {})}
      >
        Add note
      </s-button>

      <s-section>
        {maxNotes !== null && (
          atLimit ? (
            <s-banner tone="warning" heading="Note limit reached">
              <s-paragraph>
                You've used {notes.length} of {maxNotes} notes on the{" "}
                {plan} plan.{" "}
                <s-link href="/app/settings">Upgrade your plan</s-link> to add
                more.
              </s-paragraph>
            </s-banner>
          ) : (
            <s-paragraph>
              {notes.length} of {maxNotes} notes used on the {plan} plan.
            </s-paragraph>
          )
        )}
        {notes.length === 0 ? (
          <s-paragraph>
            No fragrance notes yet. Add your first one to get started.
          </s-paragraph>
        ) : (
          <s-table>
            <s-table-header-row>
              <s-table-header>Image</s-table-header>
              <s-table-header>Label</s-table-header>
              <s-table-header>Link</s-table-header>
              {plan === "pro" && <s-table-header>Group</s-table-header>}
              <s-table-header listSlot="inline"></s-table-header>
            </s-table-header-row>
            <s-table-body>
              {notes.map((note) => (
                <s-table-row key={note.id}>
                  <s-table-cell>
                    {note.imageUrl ? (
                      <s-thumbnail
                        src={note.imageUrl}
                        alt={note.label}
                        size="small"
                      />
                    ) : (
                      "—"
                    )}
                  </s-table-cell>
                  <s-table-cell>{note.label}</s-table-cell>
                  <s-table-cell>{note.link || "—"}</s-table-cell>
                  {plan === "pro" && (
                    <s-table-cell>{note.groupName || "—"}</s-table-cell>
                  )}
                  <s-table-cell>
                    <s-stack direction="inline" gap="small">
                      <s-button
                        href={`/app/fragrance-notes/${note.id.split("/").pop()}`}
                        variant="tertiary"
                      >
                        Edit
                      </s-button>
                      <s-button
                        variant="tertiary"
                        tone="critical"
                        onClick={() => handleDelete(note.id)}
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
