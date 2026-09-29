export const PCT_KEYS = [
  "pct_0h",
  "pct_1h",
  "pct_2h",
  "pct_6h",
  "pct_12h",
] as const;

export const STAGE_LABELS: Record<(typeof PCT_KEYS)[number], string> = {
  pct_0h: "Strength at 0H",
  pct_1h: "Strength at 1H",
  pct_2h: "Strength at 2H",
  pct_6h: "Strength at 6H",
  pct_12h: "Strength at 12H",
};

export type PresetCurve = {
  id: string;
  label: string;
  values: Record<(typeof PCT_KEYS)[number], number>;
};

export const PRESET_CURVES: PresetCurve[] = [
  {
    id: "fast-opening",
    label: "Fast opening, long dry-down",
    values: { pct_0h: 90, pct_1h: 70, pct_2h: 40, pct_6h: 15, pct_12h: 5 },
  },
  {
    id: "slow-bloom",
    label: "Slow, steady bloom",
    values: { pct_0h: 10, pct_1h: 25, pct_2h: 45, pct_6h: 70, pct_12h: 60 },
  },
  {
    id: "sharp-top",
    label: "Sharp top note",
    values: { pct_0h: 100, pct_1h: 30, pct_2h: 10, pct_6h: 5, pct_12h: 0 },
  },
  {
    id: "flat-linear",
    label: "Flat / linear",
    values: { pct_0h: 20, pct_1h: 20, pct_2h: 20, pct_6h: 20, pct_12h: 20 },
  },
];
