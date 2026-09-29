import db from "./db.server";

export type ClickStatRow = {
  key: string;
  label: string;
  clicks: number;
};

export async function getClickStats(
  shop: string,
  days: number,
): Promise<{ totalClicks: number; byNote: ClickStatRow[]; byGroup: ClickStatRow[] }> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const events = await db.clickEvent.findMany({
    where: { shop, createdAt: { gte: since } },
    select: { noteGid: true, noteLabel: true, groupGid: true, groupLabel: true },
  });

  const byNoteMap = new Map<string, { label: string; clicks: number }>();
  const byGroupMap = new Map<string, { label: string; clicks: number }>();

  for (const event of events) {
    const noteEntry = byNoteMap.get(event.noteGid) ?? {
      label: event.noteLabel ?? "(deleted note)",
      clicks: 0,
    };
    noteEntry.clicks += 1;
    byNoteMap.set(event.noteGid, noteEntry);

    if (event.groupGid) {
      const groupEntry = byGroupMap.get(event.groupGid) ?? {
        label: event.groupLabel ?? "(deleted group)",
        clicks: 0,
      };
      groupEntry.clicks += 1;
      byGroupMap.set(event.groupGid, groupEntry);
    }
  }

  const toRows = (map: Map<string, { label: string; clicks: number }>): ClickStatRow[] =>
    Array.from(map.entries())
      .map(([key, { label, clicks }]) => ({ key, label, clicks }))
      .sort((a, b) => b.clicks - a.clicks);

  return {
    totalClicks: events.length,
    byNote: toRows(byNoteMap),
    byGroup: toRows(byGroupMap),
  };
}
