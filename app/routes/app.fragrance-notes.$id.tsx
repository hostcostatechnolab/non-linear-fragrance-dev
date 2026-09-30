import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useFetcher, useLoaderData } from "react-router";

import { authenticate } from "../shopify.server";
import { PCT_KEYS } from "../fragrance-notes.constants";
import { uploadImageIfPresent } from "../fragrance-notes.server";
import { listGroups } from "../fragrance-groups.server";
import { getPlanContext } from "../plan.server";

type MetaobjectField = {
  key: string;
  value: string | null;
  reference?: { image?: { url: string }; id?: string; displayName?: string } | null;
};

function toGid(id: string) {
  return id.startsWith("gid://") ? id : `gid://shopify/Metaobject/${id}`;
}

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { features } = await getPlanContext(session.shop);

  const response = await admin.graphql(
    `#graphql
      query FragranceNote($id: ID!) {
        metaobject(id: $id) {
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
                id
                displayName
              }
            }
          }
        }
      }`,
    { variables: { id: toGid(params.id as string) } },
  );

  const responseJson = await response.json();
  const node = responseJson.data?.metaobject;
  if (!node) {
    throw new Response("Note not found", { status: 404 });
  }

  const fieldMap: Record<string, MetaobjectField> = {};
  for (const field of node.fields as MetaobjectField[]) {
    fieldMap[field.key] = field;
  }

  const groups = features.noteGroups ? await listGroups(admin) : [];

  return {
    id: node.id as string,
    label: fieldMap.label?.value ?? "",
    link: fieldMap.link?.value ?? "",
    imageUrl: fieldMap.image?.reference?.image?.url ?? null,
    groupId: fieldMap.group?.reference?.id ?? "",
    groups,
    pcts: Object.fromEntries(
      PCT_KEYS.map((key) => [key, fieldMap[key]?.value ?? "0"]),
    ),
  };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { features } = await getPlanContext(session.shop);
  const formData = await request.formData();
  const id = toGid(params.id as string);
  const intent = formData.get("_action");

  if (intent === "delete") {
    await admin.graphql(
      `#graphql
        mutation DeleteFragranceNote($id: ID!) {
          metaobjectDelete(id: $id) {
            deletedId
            userErrors { field message }
          }
        }`,
      { variables: { id } },
    );
    return redirect("/app/fragrance-notes?deleted=1");
  }

  const label = String(formData.get("label") || "").trim();
  const link = String(formData.get("link") || "").trim();

  if (!label) {
    return { errors: [{ field: ["label"], message: "Label is required" }] };
  }

  const imageFile = formData.get("image");
  const imageId = await uploadImageIfPresent(admin, imageFile, label);

  const fields: { key: string; value: string }[] = [
    { key: "label", value: label },
    { key: "link", value: link },
  ];
  if (imageId) fields.push({ key: "image", value: imageId });
  for (const key of PCT_KEYS) {
    fields.push({ key, value: String(Number(formData.get(key)) || 0) });
  }
  if (features.noteGroups && formData.has("group")) {
    fields.push({ key: "group", value: String(formData.get("group") || "") });
  }

  const response = await admin.graphql(
    `#graphql
      mutation UpdateFragranceNote($id: ID!, $metaobject: MetaobjectUpdateInput!) {
        metaobjectUpdate(id: $id, metaobject: $metaobject) {
          metaobject { id }
          userErrors { field message code }
        }
      }`,
    { variables: { id, metaobject: { fields } } },
  );

  const responseJson = await response.json();
  const userErrors = responseJson.data?.metaobjectUpdate?.userErrors ?? [];
  if (userErrors.length) {
    return { errors: userErrors };
  }

  return redirect("/app/fragrance-notes?updated=1");
};

const STAGE_LABELS: Record<string, string> = {
  pct_0h: "Strength at 0H",
  pct_1h: "Strength at 1H",
  pct_2h: "Strength at 2H",
  pct_6h: "Strength at 6H",
  pct_12h: "Strength at 12H",
};

export default function EditFragranceNote() {
  const { groups, ...note } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const deleteFetcher = useFetcher();
  const isSaving = fetcher.state !== "idle";
  const isDeleting = deleteFetcher.state !== "idle";

  const errors: { field: string[] | null; message: string }[] =
    (fetcher.data && "errors" in fetcher.data && fetcher.data.errors) || [];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetcher.submit(new FormData(event.currentTarget), {
      method: "POST",
      encType: "multipart/form-data",
    });
  };

  const handleDelete = () => {
    deleteFetcher.submit({ _action: "delete" }, { method: "POST" });
  };

  return (
    <s-page heading="Edit note">
      <form onSubmit={handleSubmit}>
        <s-section>
          <s-stack direction="block" gap="base">
            {errors.length > 0 && (
              <s-banner tone="critical" heading="Couldn't save note">
                <s-paragraph>
                  {errors.map((e) => e.message).join(", ")}
                </s-paragraph>
              </s-banner>
            )}

            {note.imageUrl && (
              <s-thumbnail src={note.imageUrl} alt={note.label} size="large" />
            )}

            <s-text-field
              name="label"
              label="Note name"
              required
              defaultValue={note.label}
            ></s-text-field>
            <s-url-field
              name="link"
              label="Click-through link"
              defaultValue={note.link}
            ></s-url-field>
            <s-drop-zone
              name="image"
              accept="image/*"
              label="Replace note image"
            ></s-drop-zone>

            {groups.length > 0 && (
              <s-select name="group" label="Group" value={note.groupId}>
                <s-option value="">No group</s-option>
                {groups.map((group) => (
                  <s-option key={group.id} value={group.id}>
                    {group.name}
                  </s-option>
                ))}
              </s-select>
            )}

            {PCT_KEYS.map((key) => (
              <s-number-field
                key={key}
                name={key}
                label={STAGE_LABELS[key]}
                defaultValue={note.pcts[key]}
                min={0}
                max={100}
              ></s-number-field>
            ))}

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
