import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useFetcher, useLoaderData } from "react-router";

import { authenticate } from "../shopify.server";
import { PCT_KEYS, PRESET_CURVES, STAGE_LABELS } from "../fragrance-notes.constants";
import { countNotes, uploadImageIfPresent } from "../fragrance-notes.server";
import { listGroups } from "../fragrance-groups.server";
import { getPlanContext } from "../plan.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { features } = await getPlanContext(session.shop);

  if (features.maxNotes !== null) {
    const count = await countNotes(admin);
    if (count >= features.maxNotes) {
      throw redirect("/app/fragrance-notes?limit=1");
    }
  }

  const groups = features.noteGroups ? await listGroups(admin) : [];

  return { groups, presets: features.presets };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { features } = await getPlanContext(session.shop);

  if (features.maxNotes !== null) {
    const count = await countNotes(admin);
    if (count >= features.maxNotes) {
      return {
        errors: [{ field: null, message: "Note limit reached for your plan" }],
      };
    }
  }

  const formData = await request.formData();

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
  if (features.noteGroups) {
    const group = String(formData.get("group") || "").trim();
    if (group) fields.push({ key: "group", value: group });
  }

  const response = await admin.graphql(
    `#graphql
      mutation CreateFragranceNote($metaobject: MetaobjectCreateInput!) {
        metaobjectCreate(metaobject: $metaobject) {
          metaobject { id }
          userErrors { field message code }
        }
      }`,
    {
      variables: {
        metaobject: { type: "$app:fragrance_note", fields },
      },
    },
  );

  const responseJson = await response.json();
  const userErrors = responseJson.data?.metaobjectCreate?.userErrors ?? [];
  if (userErrors.length) {
    return { errors: userErrors };
  }

  return redirect("/app/fragrance-notes?created=1");
};

const DEFAULT_PCTS: Record<(typeof PCT_KEYS)[number], number> = {
  pct_0h: 15,
  pct_1h: 15,
  pct_2h: 15,
  pct_6h: 15,
  pct_12h: 15,
};

export default function NewFragranceNote() {
  const { groups, presets } = useLoaderData<typeof loader>();
  const fetcher = useFetcher<typeof action>();
  const isSaving = fetcher.state !== "idle";
  const [pcts, setPcts] = useState(DEFAULT_PCTS);

  const errors: { field: string[] | null; message: string }[] =
    (fetcher.data && "errors" in fetcher.data && fetcher.data.errors) || [];

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    fetcher.submit(new FormData(event.currentTarget), {
      method: "POST",
      encType: "multipart/form-data",
    });
  };

  return (
    <s-page heading="Add fragrance note">
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

            <s-text-field name="label" label="Note name" required></s-text-field>
            <s-url-field name="link" label="Click-through link"></s-url-field>
            <s-drop-zone name="image" accept="image/*" label="Note image"></s-drop-zone>

            {groups.length > 0 && (
              <s-select name="group" label="Group" value="">
                <s-option value="">No group</s-option>
                {groups.map((group) => (
                  <s-option key={group.id} value={group.id}>
                    {group.name}
                  </s-option>
                ))}
              </s-select>
            )}

            {presets && (
              <s-stack direction="block" gap="small">
                <s-text>Quick-start curve</s-text>
                <s-stack direction="inline" gap="small">
                  {PRESET_CURVES.map((preset) => (
                    <s-button
                      key={preset.id}
                      type="button"
                      variant="tertiary"
                      onClick={() => setPcts(preset.values)}
                    >
                      {preset.label}
                    </s-button>
                  ))}
                </s-stack>
              </s-stack>
            )}

            {PCT_KEYS.map((key) => (
              <s-number-field
                key={key}
                name={key}
                label={STAGE_LABELS[key]}
                value={String(pcts[key])}
                onInput={(event: Event) => {
                  const value = Number(
                    (event.target as HTMLInputElement).value,
                  );
                  setPcts((prev) => ({ ...prev, [key]: value }));
                }}
                min={0}
                max={100}
              ></s-number-field>
            ))}

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
