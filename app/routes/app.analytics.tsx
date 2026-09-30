import { useState } from "react";
import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useSearchParams } from "react-router";

import { authenticate } from "../shopify.server";
import { getPlanContext, requireFeature } from "../plan.server";
import { getClickStats } from "../analytics.server";
import { ClickBarChart, type ClickBarChartRow } from "../components/ClickBarChart";

const RANGE_OPTIONS = [7, 30, 90] as const;

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const { plan } = await getPlanContext(session.shop);
  requireFeature(plan, "analytics");

  const url = new URL(request.url);
  const daysParam = Number(url.searchParams.get("days"));
  const days = (RANGE_OPTIONS as readonly number[]).includes(daysParam)
    ? daysParam
    : 30;

  const stats = await getClickStats(session.shop, days);

  // Refresh note labels against current data where the note still exists,
  // so a rename shows up without losing history for deleted notes.
  const notesResponse = await admin.graphql(`#graphql
    query FragranceNoteLabels($first: Int!) {
      metaobjects(type: "$app:fragrance_note", first: $first) {
        edges { node { id fields { key value } } }
      }
    }`,
    { variables: { first: 250 } },
  );
  const notesJson = await notesResponse.json();
  const currentLabels = new Map<string, string>();
  for (const edge of notesJson.data?.metaobjects?.edges ?? []) {
    const labelField = edge.node.fields.find(
      (f: { key: string; value: string | null }) => f.key === "label",
    );
    if (labelField?.value) currentLabels.set(edge.node.id, labelField.value);
  }

  const byNote = stats.byNote.map((row) => ({
    ...row,
    label: currentLabels.get(row.key) ?? row.label,
  }));

  return { days, totalClicks: stats.totalClicks, byNote, byGroup: stats.byGroup };
};

function ClickStatsSection({
  heading,
  columnLabel,
  rows,
}: {
  heading: string;
  columnLabel: string;
  rows: ClickBarChartRow[];
}) {
  const [showTable, setShowTable] = useState(false);

  return (
    <s-stack direction="block" gap="small">
      <s-stack direction="inline" gap="base">
        <s-heading>{heading}</s-heading>
        <s-button variant="tertiary" onClick={() => setShowTable((v) => !v)}>
          {showTable ? "Hide table" : "View as table"}
        </s-button>
      </s-stack>
      <ClickBarChart rows={rows} />
      {showTable && (
        <s-table>
          <s-table-header-row>
            <s-table-header>{columnLabel}</s-table-header>
            <s-table-header>Clicks</s-table-header>
          </s-table-header-row>
          <s-table-body>
            {rows.map((row) => (
              <s-table-row key={row.key}>
                <s-table-cell>{row.label}</s-table-cell>
                <s-table-cell>{row.clicks}</s-table-cell>
              </s-table-row>
            ))}
          </s-table-body>
        </s-table>
      )}
    </s-stack>
  );
}

export default function Analytics() {
  const { days, totalClicks, byNote, byGroup } = useLoaderData<typeof loader>();
  const [, setSearchParams] = useSearchParams();

  const handleRangeChange = (event: Event) => {
    const value = (event.target as HTMLSelectElement).value;
    setSearchParams({ days: value });
  };

  return (
    <s-page heading="Analytics">
      <s-section>
        <s-stack direction="block" gap="base">
          <s-select
            label="Date range"
            value={String(days)}
            onChange={handleRangeChange}
          >
            {RANGE_OPTIONS.map((option) => (
              <s-option key={option} value={String(option)}>
                Last {option} days
              </s-option>
            ))}
          </s-select>

          <s-paragraph>
            {totalClicks} total click{totalClicks === 1 ? "" : "s"} in this
            range.
          </s-paragraph>

          {totalClicks === 0 ? (
            <s-paragraph>
              Add the Blend Wheel block to a page and clicks will appear
              here.
            </s-paragraph>
          ) : (
            <>
              <ClickStatsSection heading="By note" columnLabel="Note" rows={byNote} />
              {byGroup.length > 0 && (
                <ClickStatsSection heading="By group" columnLabel="Group" rows={byGroup} />
              )}
            </>
          )}
        </s-stack>
      </s-section>
    </s-page>
  );
}
