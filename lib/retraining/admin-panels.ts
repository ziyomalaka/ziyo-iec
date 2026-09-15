export type RetrainingPanel = "umumiy" | "pedagogik" | "kasbiy";

export type RetrainingType =
  | "UMUMIY_QAYTA_TAYYORLASH"
  | "PEDAGOGIK_QAYTA_TAYYORLASH"
  | "KASBIY_QAYTA_TAYYORLASH";

export type DirectionStatus = "DRAFT" | "PUBLISHED" | "INACTIVE" | "ARCHIVED";

export type RetrainingPanelConfig = {
  slug: RetrainingPanel;
  label: string;
  shortLabel: string;
  type: RetrainingType;
  route: string;
};

export const RETRAINING_PANELS: Record<RetrainingPanel, RetrainingPanelConfig> = {
  umumiy: {
    slug: "umumiy",
    label: "Umumiy qayta tayyorlash",
    shortLabel: "Umumiy",
    type: "UMUMIY_QAYTA_TAYYORLASH",
    route: "/admin/software/retraining/umumiy",
  },
  pedagogik: {
    slug: "pedagogik",
    label: "Pedagogik qayta tayyorlash",
    shortLabel: "Pedagogik",
    type: "PEDAGOGIK_QAYTA_TAYYORLASH",
    route: "/admin/software/retraining/pedagogik",
  },
  kasbiy: {
    slug: "kasbiy",
    label: "Kasbiy qayta tayyorlash",
    shortLabel: "Kasbiy",
    type: "KASBIY_QAYTA_TAYYORLASH",
    route: "/admin/software/retraining/kasbiy",
  },
};

export const RETRAINING_PANEL_LIST = Object.values(RETRAINING_PANELS);

export const RETRAINING_STATUS_OPTIONS: { value: DirectionStatus; label: string }[] = [
  { value: "DRAFT", label: "Qoralama" },
  { value: "PUBLISHED", label: "Faol / Nashr qilingan" },
  { value: "INACTIVE", label: "Faol emas" },
  { value: "ARCHIVED", label: "Arxiv" },
];

export function isRetrainingPanel(value: string): value is RetrainingPanel {
  return value === "umumiy" || value === "pedagogik" || value === "kasbiy";
}

export function getRetrainingPanelConfig(panel: RetrainingPanel) {
  return RETRAINING_PANELS[panel];
}

export function retrainingPanelRoute(panel?: RetrainingPanel | string | null, directionId?: number) {
  const slug = panel && isRetrainingPanel(String(panel)) ? (panel as RetrainingPanel) : undefined;
  if (!slug) return "/admin/software/retraining";
  const base = RETRAINING_PANELS[slug].route;
  return directionId && directionId > 0 ? `${base}/${directionId}` : base;
}

export function retrainingLessonRoute(
  panel: RetrainingPanel,
  directionId: number,
  moduleId: number,
  lessonId: number,
  blockId?: number
) {
  const base = `${retrainingPanelRoute(panel, directionId)}/modules/${moduleId}/lessons/${lessonId}`;
  if (blockId && blockId > 0) return `${base}?blockId=${blockId}`;
  return base;
}

export function retrainingMaterialUploadRoute(panel: RetrainingPanel) {
  return `${RETRAINING_PANELS[panel].route}/material/upload`;
}

export function retrainingStatusLabel(status?: string) {
  const upper = (status ?? "").toUpperCase() as DirectionStatus;
  return RETRAINING_STATUS_OPTIONS.find((item) => item.value === upper)?.label ?? status ?? "—";
}

export function panelFromRetrainingType(type?: string | null): RetrainingPanel | undefined {
  const upper = (type ?? "").toUpperCase().replace(/[\s-]+/g, "_");
  if (upper === "UMUMIY_QAYTA_TAYYORLASH" || upper === "UMUMIY") return "umumiy";
  if (upper === "PEDAGOGIK_QAYTA_TAYYORLASH" || upper === "PEDAGOGIK") return "pedagogik";
  if (upper === "KASBIY_QAYTA_TAYYORLASH" || upper === "KASBIY") return "kasbiy";
  return undefined;
}

export type RetrainingPanelHint = {
  retraining_type?: string;
  retraining_panel?: RetrainingPanel;
};

export type RetrainingPanelContext = {
  /** Route / wizard URL `[panel]` yoki `?panel=` */
  routePanel?: RetrainingPanel | string | null;
  direction?: RetrainingPanelHint | null;
};

/**
 * Admin source of truth = URL `{panel}` (umumiy | pedagogik | kasbiy).
 * Query `retraining_type` ishlatilmaydi.
 */
export function resolveRetrainingPanel(context: RetrainingPanelContext): RetrainingPanel | undefined {
  const route =
    context.routePanel && isRetrainingPanel(String(context.routePanel))
      ? (context.routePanel as RetrainingPanel)
      : undefined;
  if (route) return route;

  const fromType = panelFromRetrainingType(context.direction?.retraining_type);
  const fromDirPanel =
    context.direction?.retraining_panel && isRetrainingPanel(context.direction.retraining_panel)
      ? context.direction.retraining_panel
      : undefined;
  return fromType ?? fromDirPanel;
}

/** Wizard: URL panel yoki tanlangan yo'nalish; panel aniqlanmasa `undefined`. */
export function resolveWizardRetrainingPanel(
  urlPanel: string | null | undefined,
  direction?: RetrainingPanelHint | null
): RetrainingPanel | undefined {
  return resolveRetrainingPanel({ routePanel: urlPanel, direction });
}

export function retrainingTypeLabel(type?: string | null) {
  const panel = panelFromRetrainingType(type);
  return panel ? RETRAINING_PANELS[panel].shortLabel : type ?? "—";
}
