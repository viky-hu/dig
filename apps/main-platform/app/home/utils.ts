import {
  FINAL_TRACK_RATIOS,
  GRID_GAP,
  INTRO_RECT_RATIOS,
  PANEL_COLORS,
} from "./shared/coords";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TrackState = {
  xLines: number[];
  yLines: number[];
};

export type GuideLine = {
  key: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export type PanelKey =
  | "framework"
  | "iconography"
  | "voiceTone"
  | "color"
  | "centerCore"
  | "logo"
  | "imagery"
  | "typography"
  | "motion";

export type PanelSpec = {
  key: PanelKey;
  color: string;
  colStart: number;
  colEnd: number;
  rowStart: number;
  rowEnd: number;
};

export type PanelEntry = PanelSpec & {
  rect: Rect;
};

export type SceneGeometry = {
  viewportWidth: number;
  viewportHeight: number;
  introRect: Rect;
  startTracks: TrackState;
  endTracks: TrackState;
  initialTracks: TrackState;
  panelSpecs: PanelSpec[];
  initialPanels: PanelEntry[];
  centerCoreRect: Rect;
  initialCenterRect: Rect;
};

const PANEL_SPECS: PanelSpec[] = [
  { key: "framework", color: PANEL_COLORS.framework, colStart: 0, colEnd: 1, rowStart: 0, rowEnd: 2 },
  { key: "iconography", color: PANEL_COLORS.iconography, colStart: 0, colEnd: 1, rowStart: 2, rowEnd: 3 },
  { key: "voiceTone", color: PANEL_COLORS.voiceTone, colStart: 1, colEnd: 3, rowStart: 0, rowEnd: 1 },
  { key: "color", color: PANEL_COLORS.color, colStart: 1, colEnd: 2, rowStart: 1, rowEnd: 3 },
  { key: "centerCore", color: PANEL_COLORS.centerCore, colStart: 2, colEnd: 3, rowStart: 1, rowEnd: 2 },
  { key: "logo", color: PANEL_COLORS.logo, colStart: 3, colEnd: 4, rowStart: 0, rowEnd: 2 },
  { key: "imagery", color: PANEL_COLORS.imagery, colStart: 2, colEnd: 4, rowStart: 2, rowEnd: 3 },
  { key: "typography", color: PANEL_COLORS.typography, colStart: 4, colEnd: 5, rowStart: 0, rowEnd: 1 },
  { key: "motion", color: PANEL_COLORS.motion, colStart: 4, colEnd: 5, rowStart: 1, rowEnd: 3 },
];

function ratioTracks(total: number, ratios: readonly number[]) {
  const usable = total - GRID_GAP * (ratios.length - 1);
  const sum = ratios.reduce((value, item) => value + item, 0);
  const lines = [0];
  let cursor = 0;

  ratios.forEach((ratio, index) => {
    cursor += (ratio / sum) * usable;
    if (index < ratios.length - 1) {
      cursor += GRID_GAP;
      lines.push(cursor);
    } else {
      lines.push(total);
    }
  });

  return lines;
}

function rectCenter(rect: Rect) {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

export function rectFromTrackSpan(tracks: TrackState, spec: Pick<PanelSpec, "colStart" | "colEnd" | "rowStart" | "rowEnd">): Rect {
  const x = tracks.xLines[spec.colStart];
  const y = tracks.yLines[spec.rowStart];
  const right = trackSpanEnd(tracks.xLines, spec.colEnd);
  const bottom = trackSpanEnd(tracks.yLines, spec.rowEnd);

  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  };
}

function trackSpanEnd(lines: number[], endIndex: number) {
  if (endIndex >= lines.length - 1) {
    return lines[endIndex];
  }
  return lines[endIndex] - GRID_GAP;
}

function buildStartTracks(viewportWidth: number, viewportHeight: number, endTracks: TrackState, introRect: Rect): TrackState {
  const endCenterRect = rectFromTrackSpan(endTracks, PANEL_SPECS.find((spec) => spec.key === "centerCore")!);
  const endCenter = rectCenter(endCenterRect);
  const introCenter = rectCenter(introRect);

  const xScale = introRect.width / endCenterRect.width;
  const yScale = introRect.height / endCenterRect.height;

  return {
    xLines: endTracks.xLines.map((line) => introCenter.x + (line - endCenter.x) * xScale),
    yLines: endTracks.yLines.map((line) => introCenter.y + (line - endCenter.y) * yScale),
  };
}

export function computeSceneGeometry(viewportWidth: number, viewportHeight: number): SceneGeometry {
  const endTracks = getEndTracks(viewportWidth, viewportHeight);
  const introRect = {
    x: INTRO_RECT_RATIOS.x1 * viewportWidth,
    y: INTRO_RECT_RATIOS.y1 * viewportHeight,
    width: (INTRO_RECT_RATIOS.x2 - INTRO_RECT_RATIOS.x1) * viewportWidth,
    height: (INTRO_RECT_RATIOS.y2 - INTRO_RECT_RATIOS.y1) * viewportHeight,
  };
  const startTracks = getStartTracks(viewportWidth, viewportHeight, endTracks, introRect);
  const initialTracks = interpolateTracks(startTracks, endTracks, 0);

  return {
    viewportWidth,
    viewportHeight,
    introRect,
    startTracks,
    endTracks,
    initialTracks,
    panelSpecs: PANEL_SPECS,
    initialPanels: getPanelEntries(initialTracks),
    centerCoreRect: rectFromTrackSpan(endTracks, PANEL_SPECS.find((spec) => spec.key === "centerCore")!),
    initialCenterRect: rectFromTrackSpan(initialTracks, PANEL_SPECS.find((spec) => spec.key === "centerCore")!),
  };
}

export function getEndTracks(viewportWidth: number, viewportHeight: number): TrackState {
  return {
    xLines: ratioTracks(viewportWidth, FINAL_TRACK_RATIOS.columns),
    yLines: ratioTracks(viewportHeight, FINAL_TRACK_RATIOS.rows),
  };
}

export function getStartTracks(
  viewportWidth: number,
  viewportHeight: number,
  endTracks = getEndTracks(viewportWidth, viewportHeight),
  introRect: Rect = {
    x: INTRO_RECT_RATIOS.x1 * viewportWidth,
    y: INTRO_RECT_RATIOS.y1 * viewportHeight,
    width: (INTRO_RECT_RATIOS.x2 - INTRO_RECT_RATIOS.x1) * viewportWidth,
    height: (INTRO_RECT_RATIOS.y2 - INTRO_RECT_RATIOS.y1) * viewportHeight,
  },
): TrackState {
  return buildStartTracks(viewportWidth, viewportHeight, endTracks, introRect);
}

export function interpolateTracks(start: TrackState, end: TrackState, progress: number): TrackState {
  const easedProgress = clamp(progress, 0, 1);
  return {
    xLines: start.xLines.map((line, index) => lerp(line, end.xLines[index], easedProgress)),
    yLines: start.yLines.map((line, index) => lerp(line, end.yLines[index], easedProgress)),
  };
}

export function getPanelEntries(tracks: TrackState): PanelEntry[] {
  return PANEL_SPECS.map((spec) => ({
    ...spec,
    rect: rectFromTrackSpan(tracks, spec),
  }));
}

export function getGuideLines(tracks: TrackState, viewportWidth: number, viewportHeight: number): GuideLine[] {
  const xEdges = uniqueSortedEdges(tracks.xLines.flatMap((line, index) => {
    if (index === 0 || index === tracks.xLines.length - 1) {
      return [line];
    }
    return [line - GRID_GAP, line];
  }));
  const yEdges = uniqueSortedEdges(tracks.yLines.flatMap((line, index) => {
    if (index === 0 || index === tracks.yLines.length - 1) {
      return [line];
    }
    return [line - GRID_GAP, line];
  }));

  return [
    ...xEdges.map((x, index) => ({
      key: `x-${index}`,
      x1: x,
      y1: 0,
      x2: x,
      y2: viewportHeight,
    })),
    ...yEdges.map((y, index) => ({
      key: `y-${index}`,
      x1: 0,
      y1: y,
      x2: viewportWidth,
      y2: y,
    })),
  ];
}

function uniqueSortedEdges(values: number[]) {
  return Array.from(new Set(values.map((value) => Math.round(value * 1000) / 1000))).sort((a, b) => a - b);
}

export function syncGridFrame(
  panels: NodeListOf<HTMLElement>,
  lines: NodeListOf<SVGLineElement>,
  tracks: TrackState,
  viewportWidth: number,
  viewportHeight: number,
) {
  const entries = getPanelEntries(tracks);
  const guideLines = getGuideLines(tracks, viewportWidth, viewportHeight);

  panels.forEach((panel) => {
    const entry = entries.find((item) => item.key === panel.dataset.panel);
    if (!entry) return;
    Object.assign(panel.style, rectToStyle(entry.rect));
  });

  lines.forEach((line, index) => {
    const guide = guideLines[index];
    if (!guide) return;
    line.setAttribute("x1", String(guide.x1));
    line.setAttribute("y1", String(guide.y1));
    line.setAttribute("x2", String(guide.x2));
    line.setAttribute("y2", String(guide.y2));
  });
}

export function rectToStyle(rect: Rect) {
  return {
    left: `${rect.x}px`,
    top: `${rect.y}px`,
    width: `${rect.width}px`,
    height: `${rect.height}px`,
  };
}

export function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function bikePathData(width: number, height: number) {
  const leftWheelX = width * 0.24;
  const rightWheelX = width * 0.76;
  const wheelY = height * 0.76;
  const wheelR = height * 0.16;

  const seatX = width * 0.42;
  const seatY = height * 0.28;
  const crankX = width * 0.51;
  const crankY = height * 0.58;
  const headX = width * 0.66;
  const headY = height * 0.3;
  const handleX = width * 0.8;
  const handleY = height * 0.16;

  return {
    leftWheel: circlePath(leftWheelX, wheelY, wheelR),
    rightWheel: circlePath(rightWheelX, wheelY, wheelR),
    frame: [
      `M ${leftWheelX} ${wheelY}`,
      `L ${seatX} ${seatY}`,
      `L ${headX} ${headY}`,
      `L ${rightWheelX} ${wheelY}`,
      `L ${crankX} ${crankY}`,
      `L ${leftWheelX} ${wheelY}`,
      `M ${crankX} ${crankY}`,
      `L ${headX} ${headY}`,
      `M ${crankX} ${crankY}`,
      `L ${seatX} ${seatY}`,
      `M ${seatX - width * 0.08} ${seatY}`,
      `L ${seatX + width * 0.03} ${seatY}`,
      `M ${headX} ${headY}`,
      `L ${handleX} ${handleY}`,
      `M ${handleX - width * 0.03} ${handleY}`,
      `L ${handleX + width * 0.01} ${handleY + height * 0.1}`,
    ].join(" "),
  };
}

function circlePath(cx: number, cy: number, r: number) {
  return [
    `M ${cx - r} ${cy}`,
    `a ${r} ${r} 0 1 0 ${r * 2} 0`,
    `a ${r} ${r} 0 1 0 ${-r * 2} 0`,
  ].join(" ");
}

export function getIntroCopy() {
  return {
    title: "上海摩拜单车",
    subtitle: "数据挖掘分析报告",
    hint: "↓↓",
  };
}
