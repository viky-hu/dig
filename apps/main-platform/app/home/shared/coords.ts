export const BRAND_BLUE = "#3152f4";
export const BASE_VW = 1440;
export const BASE_VH = 900;
export const GRID_GAP = 8;
export const SCROLL_SHELL_VH = 340;
export const MOBILE_BREAKPOINT = 1024;
export const PHASE1_STROKE = 1.5;
export const GRID_LINE_COLOR = "rgba(137, 174, 255, 0.48)";

export const INTRO_RECT_RATIOS = {
  x1: 0.31,
  x2: 0.69,
  y1: 0.17,
  y2: 0.83,
} as const;

export const FINAL_TRACK_RATIOS = {
  columns: [19, 27, 6, 27, 19] as const,
  rows: [43, 10, 47] as const,
};

export const PANEL_COLORS = {
  framework: "#2f3d57",
  iconography: "#B4F239",
  voiceTone: "#F7D64A",
  color: "#FF8A1D",
  centerCore: BRAND_BLUE,
  logo: "#4BC7D8",
  imagery: "#8D1B55",
  typography: "#FF4B22",
  motion: "#C9A9EB",
} as const;
