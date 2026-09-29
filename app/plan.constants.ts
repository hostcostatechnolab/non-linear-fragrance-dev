export type PlanId = "free" | "starter" | "pro";

export const PLAN_IDS: PlanId[] = ["free", "starter", "pro"];

export const PLAN_LABELS: Record<PlanId, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
};

export type PlanFeatures = {
  maxNotes: number | null;
  customTickLabels: boolean;
  customColors: boolean;
  noteGroups: boolean;
  presets: boolean;
  templates: boolean;
  analytics: boolean;
  showBadge: boolean;
};

export const PLAN_FEATURES: Record<PlanId, PlanFeatures> = {
  free: {
    maxNotes: 5,
    customTickLabels: false,
    customColors: false,
    noteGroups: false,
    presets: false,
    templates: false,
    analytics: false,
    showBadge: true,
  },
  starter: {
    maxNotes: 10,
    customTickLabels: true,
    customColors: false,
    noteGroups: false,
    presets: false,
    templates: false,
    analytics: false,
    showBadge: false,
  },
  pro: {
    maxNotes: null,
    customTickLabels: true,
    customColors: true,
    noteGroups: true,
    presets: true,
    templates: true,
    analytics: true,
    showBadge: false,
  },
};

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as string[]).includes(value);
}
