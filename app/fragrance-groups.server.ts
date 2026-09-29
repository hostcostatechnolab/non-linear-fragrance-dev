import { authenticate } from "./shopify.server";

type Admin = Awaited<ReturnType<typeof authenticate.admin>>["admin"];

export type FragranceGroup = { id: string; name: string };

export async function listGroups(admin: Admin): Promise<FragranceGroup[]> {
  const response = await admin.graphql(`#graphql
    query FragranceNoteGroupsForPicker($first: Int!) {
      metaobjects(type: "$app:fragrance_note_group", first: $first, sortKey: "updated_at", reverse: true) {
        edges {
          node {
            id
            fields { key value }
          }
        }
      }
    }`,
    { variables: { first: 50 } },
  );

  const responseJson = await response.json();
  const edges = responseJson.data?.metaobjects?.edges ?? [];

  return edges.map(
    ({ node }: { node: { id: string; fields: { key: string; value: string | null }[] } }) => {
      const nameField = node.fields.find((f) => f.key === "name");
      return { id: node.id, name: nameField?.value ?? "(untitled)" };
    },
  );
}
