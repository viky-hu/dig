import type { PanelKey } from "../home/utils";
import { PANEL_COLORS } from "../home/shared/coords";

export type InsightSlug =
  | "insight-01"
  | "insight-02"
  | "insight-03"
  | "insight-04"
  | "insight-05"
  | "insight-06"
  | "insight-07"
  | "insight-08";

export type InsightConfig = {
  slug: InsightSlug;
  panelKey: Exclude<PanelKey, "centerCore">;
  order: number;
  themeColor: string;
  isEnabled: boolean;
};

export const INSIGHTS: InsightConfig[] = [
  { slug: "insight-01", panelKey: "framework", order: 1, themeColor: PANEL_COLORS.framework, isEnabled: true },
  { slug: "insight-02", panelKey: "iconography", order: 2, themeColor: PANEL_COLORS.iconography, isEnabled: true },
  { slug: "insight-03", panelKey: "voiceTone", order: 3, themeColor: PANEL_COLORS.voiceTone, isEnabled: true },
  { slug: "insight-04", panelKey: "color", order: 4, themeColor: PANEL_COLORS.color, isEnabled: true },
  { slug: "insight-05", panelKey: "logo", order: 5, themeColor: PANEL_COLORS.logo, isEnabled: true },
  { slug: "insight-06", panelKey: "imagery", order: 6, themeColor: PANEL_COLORS.imagery, isEnabled: true },
  { slug: "insight-07", panelKey: "typography", order: 7, themeColor: PANEL_COLORS.typography, isEnabled: true },
  { slug: "insight-08", panelKey: "motion", order: 8, themeColor: PANEL_COLORS.motion, isEnabled: true },
];

export function getInsightBySlug(slug: string) {
  return INSIGHTS.find((insight) => insight.slug === slug);
}

export function getInsightByPanel(panelKey: PanelKey) {
  return INSIGHTS.find((insight) => insight.panelKey === panelKey);
}
