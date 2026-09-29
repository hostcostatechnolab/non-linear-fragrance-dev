import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "react-router";
import { redirect, useFetcher } from "react-router";

import { authenticate } from "../shopify.server";
import { getPlanContext, requireFeature } from "../plan.server";
import { findTemplate, NOTE_TEMPLATES, type NoteTemplate } from "../templates.constants";
import { applyTemplate } from "../templates.server";

const MAX_LABEL = 100;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const { plan } = await getPlanContext(session.shop);
  requireFeature(plan, "templates");
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { plan } = await getPlanContext(session.shop);
  requireFeature(plan, "templates");

  const formData = await request.formData();
  let payload: {
    templateId?: unknown;
    link?: unknown;
    groupName?: unknown;
    notes?: unknown;
  };
  try {
    payload = JSON.parse(String(formData.get("payload") || "{}"));
  } catch {
    return { errors: ["Invalid request"] };
  }

  const template = findTemplate(payload.templateId);
  if (!template) return { errors: ["Unknown template"] };
  if (!Array.isArray(payload.notes)) return { errors: ["No notes selected"] };

  const notes = payload.notes
    .map((raw: { index?: unknown; label?: unknown; pcts?: unknown }) => {
      const source = template.notes[Number(raw.index)];
      const label = String(raw.label ?? "").trim().slice(0, MAX_LABEL);
      if (!source || !label || !Array.isArray(raw.pcts)) return null;
      const pcts = source.pcts.map((fallback, k) => {
        const value = Number((raw.pcts as unknown[])[k]);
        return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value))) : fallback;
      });
      return { label, colors: source.colors, pcts };
    })
    .filter((n): n is NonNullable<typeof n> => n !== null);

  if (notes.length === 0) return { errors: ["Select at least one note"] };

  const link = String(payload.link ?? "").trim();
  const groupName =
    typeof payload.groupName === "string" && payload.groupName.trim()
      ? payload.groupName.trim().slice(0, MAX_LABEL)
      : null;

  const { created, errors } = await applyTemplate(admin, { notes, link, groupName });
  if (created === 0) return { errors: errors.length ? errors : ["No notes were created"] };

  return redirect(`/app/fragrance-notes?templated=${created}`);
};

type EditableNote = { include: boolean; label: string; pcts: number[] };

function editableFrom(template: NoteTemplate): EditableNote[] {
  return template.notes.map((n) => ({ include: true, label: n.label, pcts: [...n.pcts] }));
}

function gradient(colors: [string, string]): string {
  return `linear-gradient(135deg, ${colors[0]}, ${colors[1]})`;
}

export default function Templates() {
  const fetcher = useFetcher<typeof action>();
  const isApplying = fetcher.state !== "idle";

  const [templateId, setTemplateId] = useState(NOTE_TEMPLATES[0].id);
  const template = findTemplate(templateId) ?? NOTE_TEMPLATES[0];
  const [notes, setNotes] = useState<EditableNote[]>(() => editableFrom(template));
  const [link, setLink] = useState("");
  const [createGroup, setCreateGroup] = useState(true);
  const [groupName, setGroupName] = useState(template.name);

  const selectTemplate = (id: string) => {
    const next = findTemplate(id);
    if (!next) return;
    setTemplateId(next.id);
    setNotes(editableFrom(next));
    setGroupName(next.name);
  };

  const updateNote = (index: number, patch: Partial<EditableNote>) =>
    setNotes((prev) => prev.map((n, i) => (i === index ? { ...n, ...patch } : n)));

  const included = notes
    .map((note, index) => ({ ...note, index, colors: template.notes[index].colors }))
    .filter((n) => n.include && n.label.trim());

  const stageShares = template.stageLabels.map((stageLabel, stage) => {
    const total = included.reduce((sum, n) => sum + (n.pcts[stage] || 0), 0);
    return {
      stageLabel,
      segments: included
        .filter((n) => n.pcts[stage] > 0)
        .map((n) => ({
          label: n.label,
          colors: n.colors,
          share: total ? (n.pcts[stage] / total) * 100 : 0,
        })),
    };
  });

  const errors: string[] =
    (fetcher.data && "errors" in fetcher.data && fetcher.data.errors) || [];

  const handleApply = () => {
    fetcher.submit(
      {
        payload: JSON.stringify({
          templateId: template.id,
          link,
          groupName: createGroup ? groupName : null,
          notes: included.map((n) => ({ index: n.index, label: n.label, pcts: n.pcts })),
        }),
      },
      { method: "POST" },
    );
  };

  return (
    <s-page heading="Templates">
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleApply}
        {...(isApplying ? { loading: true } : {})}
        {...(included.length === 0 ? { disabled: true } : {})}
      >
        Apply template ({included.length} notes)
      </s-button>

      <s-section>
        <s-stack direction="block" gap="base">
          {errors.length > 0 && (
            <s-banner tone="critical" heading="Couldn't apply template">
              <s-paragraph>{errors.join(" ")}</s-paragraph>
            </s-banner>
          )}
          <s-select
            label="Category"
            value={templateId}
            onChange={(event: Event) =>
              selectTemplate((event.currentTarget as HTMLSelectElement).value)
            }
          >
            {NOTE_TEMPLATES.map((t) => (
              <s-option key={t.id} value={t.id}>
                {t.name}
              </s-option>
            ))}
          </s-select>
          <s-paragraph>{template.description}</s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Preview: how the notes evolve">
        <s-stack direction="block" gap="small">
          {stageShares.map(({ stageLabel, segments }) => (
            <div
              key={stageLabel}
              style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 12, alignItems: "center" }}
            >
              <s-text>{stageLabel}</s-text>
              <div
                style={{
                  display: "flex",
                  height: 28,
                  borderRadius: 6,
                  overflow: "hidden",
                  background: "#f1f1f1",
                }}
              >
                {segments.map((s) => (
                  <div
                    key={s.label}
                    title={`${s.label}: ${Math.round(s.share)}%`}
                    style={{ width: `${s.share}%`, background: gradient(s.colors) }}
                  />
                ))}
              </div>
            </div>
          ))}
          <s-paragraph>
            Tip: in the theme editor, set the wheel's timeline labels to{" "}
            <s-text type="strong">{template.tickLabels.join(" · ")}</s-text> to
            match this template's stages.
          </s-paragraph>
        </s-stack>
      </s-section>

      <s-section heading="Notes">
        <s-table>
          <s-table-header-row>
            <s-table-header>Include</s-table-header>
            <s-table-header>Image</s-table-header>
            <s-table-header>Name</s-table-header>
            {template.stageLabels.map((stage) => (
              <s-table-header key={stage}>{stage}</s-table-header>
            ))}
          </s-table-header-row>
          <s-table-body>
            {notes.map((note, index) => (
              <s-table-row key={`${template.id}-${index}`}>
                <s-table-cell>
                  <s-checkbox
                    accessibilityLabel={`Include ${note.label}`}
                    checked={note.include}
                    onChange={(event: Event) =>
                      updateNote(index, {
                        include: (event.currentTarget as HTMLInputElement).checked,
                      })
                    }
                  />
                </s-table-cell>
                <s-table-cell>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: gradient(template.notes[index].colors),
                      opacity: note.include ? 1 : 0.35,
                    }}
                  />
                </s-table-cell>
                <s-table-cell>
                  <s-text-field
                    label="Name"
                    labelAccessibilityVisibility="exclusive"
                    value={note.label}
                    onInput={(event: Event) =>
                      updateNote(index, { label: (event.target as HTMLInputElement).value })
                    }
                  />
                </s-table-cell>
                {note.pcts.map((pct, stage) => (
                  <s-table-cell key={stage}>
                    <s-number-field
                      label={template.stageLabels[stage]}
                      labelAccessibilityVisibility="exclusive"
                      value={String(pct)}
                      min={0}
                      max={100}
                      onInput={(event: Event) => {
                        const value = Number((event.target as HTMLInputElement).value);
                        updateNote(index, {
                          pcts: note.pcts.map((p, k) => (k === stage ? value : p)),
                        });
                      }}
                    />
                  </s-table-cell>
                ))}
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
      </s-section>

      <s-section heading="Options">
        <s-stack direction="block" gap="base">
          <s-url-field
            label="Click-through link for every note"
            details="Usually the product or collection page. You can change each note's link later."
            value={link}
            onInput={(event: Event) => setLink((event.target as HTMLInputElement).value)}
          />
          <s-checkbox
            label="Put these notes in a new note group"
            details="Lets you show only this template's notes on a specific page."
            checked={createGroup}
            onChange={(event: Event) =>
              setCreateGroup((event.currentTarget as HTMLInputElement).checked)
            }
          />
          {createGroup && (
            <s-text-field
              label="Group name"
              value={groupName}
              onInput={(event: Event) => setGroupName((event.target as HTMLInputElement).value)}
            />
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}
