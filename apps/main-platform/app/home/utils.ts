import {
  FINAL_TRACK_RATIOS,
  FINAL_PANEL_INSET,
  FINAL_OUTER_MARGIN_RATIO,
  INTRO_RECT_RATIOS,
  PANEL_COLORS,
} from "./shared/coords";

export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
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

export type TrackState = {
  xLines: number[];
  yLines: number[];
  guideXLines?: number[];
  guideYLines?: number[];
};

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
  { key: "framework", color: PANEL_COLORS.framework, colStart: 0, colEnd: 1, rowStart: 0, rowEnd: 1 },
  { key: "iconography", color: PANEL_COLORS.iconography, colStart: 2, colEnd: 3, rowStart: 2, rowEnd: 3 },
  { key: "voiceTone", color: PANEL_COLORS.voiceTone, colStart: 4, colEnd: 5, rowStart: 4, rowEnd: 5 },
  { key: "color", color: PANEL_COLORS.color, colStart: 6, colEnd: 7, rowStart: 6, rowEnd: 7 },
  { key: "centerCore", color: PANEL_COLORS.centerCore, colStart: 8, colEnd: 9, rowStart: 8, rowEnd: 9 },
  { key: "logo", color: PANEL_COLORS.logo, colStart: 10, colEnd: 11, rowStart: 10, rowEnd: 11 },
  { key: "imagery", color: PANEL_COLORS.imagery, colStart: 12, colEnd: 13, rowStart: 12, rowEnd: 13 },
  { key: "typography", color: PANEL_COLORS.typography, colStart: 14, colEnd: 15, rowStart: 14, rowEnd: 15 },
  { key: "motion", color: PANEL_COLORS.motion, colStart: 16, colEnd: 17, rowStart: 16, rowEnd: 17 },
];

const FINAL_GRID_SPANS: Record<PanelKey, { xStart: number; xEnd: number; yStart: number; yEnd: number }> = {
  framework: { xStart: 0, xEnd: 1, yStart: 0, yEnd: 2 },
  iconography: { xStart: 0, xEnd: 1, yStart: 2, yEnd: 3 },
  voiceTone: { xStart: 1, xEnd: 3, yStart: 0, yEnd: 1 },
  color: { xStart: 1, xEnd: 2, yStart: 1, yEnd: 3 },
  centerCore: { xStart: 2, xEnd: 3, yStart: 1, yEnd: 2 },
  logo: { xStart: 3, xEnd: 4, yStart: 0, yEnd: 2 },
  imagery: { xStart: 2, xEnd: 4, yStart: 2, yEnd: 3 },
  typography: { xStart: 4, xEnd: 5, yStart: 0, yEnd: 1 },
  motion: { xStart: 4, xEnd: 5, yStart: 1, yEnd: 3 },
};

function ratioTracks(total: number, ratios: readonly number[]) {
  const sum = ratios.reduce((value, item) => value + item, 0);
  const lines = [0];
  let cursor = 0;

  ratios.forEach((ratio) => {
    cursor += (ratio / sum) * total;
    lines.push(cursor);
  });

  lines[lines.length - 1] = total;
  return lines;
}

export function rectFromTrackSpan(
  tracks: TrackState,
  spec: Pick<PanelSpec, "colStart" | "colEnd" | "rowStart" | "rowEnd">,
): Rect {
  const x = tracks.xLines[spec.colStart];
  const y = tracks.yLines[spec.rowStart];
  const right = tracks.xLines[spec.colEnd];
  const bottom = tracks.yLines[spec.rowEnd];
  const inset = FINAL_PANEL_INSET / 2;

  return {
    x: x + inset,
    y: y + inset,
    width: Math.max(0, right - x - FINAL_PANEL_INSET),
    height: Math.max(0, bottom - y - FINAL_PANEL_INSET),
  };
}

function buildStartTracks(
  viewportWidth: number,
  viewportHeight: number,
  endTracks: TrackState,
  introRect: Rect,
): TrackState {
  const finalRects = getPanelEntries(endTracks).reduce<Record<PanelKey, Rect>>(
    (rects, panel) => ({ ...rects, [panel.key]: panel.rect }),
    {} as Record<PanelKey, Rect>,
  );
  const tracks = tracksFromPanelRects(getStartPanelRects(viewportWidth, viewportHeight, introRect, finalRects));

  return {
    ...tracks,
    guideXLines: [
      -viewportWidth * 0.72,
      -viewportWidth * 0.18,
      introRect.x,
      introRect.x + introRect.width,
      viewportWidth * 1.18,
      viewportWidth * 1.72,
    ],
    guideYLines: [
      -viewportHeight * 0.42,
      introRect.y,
      introRect.y + introRect.height,
      viewportHeight * 1.42,
    ],
  };
}

function getStartPanelRects(
  viewportWidth: number,
  viewportHeight: number,
  introRect: Rect,
  finalRects: Record<PanelKey, Rect>,
): Record<PanelKey, Rect> {
  const margin = Math.max(viewportWidth, viewportHeight) * 0.08;

  const voiceWidth = introRect.width * 0.72;
  const voiceHeight = viewportHeight * 0.18;
  const colorWidth = viewportWidth * 0.18;
  const colorHeight = introRect.height * 0.74;
  const logoWidth = viewportWidth * 0.2;
  const logoHeight = introRect.height * 0.78;
  const imageryWidth = introRect.width * 0.68;
  const imageryHeight = viewportHeight * 0.22;
  const frameworkWidth = viewportWidth * 0.16;
  const frameworkHeight = viewportHeight * 0.38;
  const iconographyWidth = viewportWidth * 0.13;
  const iconographyHeight = viewportHeight * 0.22;
  const typographyWidth = viewportWidth * 0.16;
  const typographyHeight = viewportHeight * 0.24;
  const motionWidth = viewportWidth * 0.14;
  const motionHeight = viewportHeight * 0.42;
  const colorX = -colorWidth - margin;
  const logoX = viewportWidth + margin;
  const logoRight = logoX + logoWidth;

  return {
    centerCore: introRect,
    voiceTone: {
      x: introRect.x + introRect.width * 0.14,
      y: -voiceHeight - margin,
      width: voiceWidth,
      height: voiceHeight,
    },
    color: {
      x: colorX,
      y: introRect.y + introRect.height * 0.1,
      width: colorWidth,
      height: colorHeight,
    },
    logo: {
      x: logoX,
      y: introRect.y + introRect.height * 0.08,
      width: logoWidth,
      height: logoHeight,
    },
    imagery: {
      x: introRect.x + introRect.width * 0.16,
      y: viewportHeight + margin,
      width: imageryWidth,
      height: imageryHeight,
    },
    framework: {
      x: colorX - frameworkWidth - margin * 0.72,
      y: Math.max(24, finalRects.framework.y * 0.42),
      width: frameworkWidth,
      height: frameworkHeight,
    },
    iconography: {
      x: colorX - iconographyWidth - margin * 0.96,
      y: viewportHeight - iconographyHeight - Math.max(24, margin * 0.72),
      width: iconographyWidth,
      height: iconographyHeight,
    },
    typography: {
      x: logoRight + margin * 0.72,
      y: Math.max(24, finalRects.typography.y + margin * 0.45),
      width: typographyWidth,
      height: typographyHeight,
    },
    motion: {
      x: logoRight + margin * 0.96,
      y: viewportHeight - motionHeight - Math.max(24, margin * 0.68),
      width: motionWidth,
      height: motionHeight,
    },
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
  const outerMargin = Math.min(viewportWidth, viewportHeight) * FINAL_OUTER_MARGIN_RATIO;
  const availableWidth = viewportWidth - outerMargin * 2;
  const availableHeight = viewportHeight - outerMargin * 2;
  const [outerLeftRatio, leftRatio, centerRatio, rightRatio, outerRightRatio] = FINAL_TRACK_RATIOS.columns;
  const [topRatio, middleRatio, bottomRatio] = FINAL_TRACK_RATIOS.rows;
  const centerSpanFromWidth = (availableWidth * centerRatio) / FINAL_TRACK_RATIOS.columns.reduce((sum, ratio) => sum + ratio, 0);
  const centerSpanFromHeight =
    (availableHeight * middleRatio) / FINAL_TRACK_RATIOS.rows.reduce((sum, ratio) => sum + ratio, 0);
  const centerSpan = Math.min(centerSpanFromWidth, centerSpanFromHeight);
  const sideXLines = ratioTracks(availableWidth - centerSpan, [
    outerLeftRatio,
    leftRatio,
    rightRatio,
    outerRightRatio,
  ]).map((line) => line + outerMargin);
  const sideYLines = ratioTracks(availableHeight - centerSpan, [topRatio, bottomRatio]).map(
    (line) => line + outerMargin,
  );
  const xLines = [
    sideXLines[0],
    sideXLines[1],
    sideXLines[2],
    sideXLines[2] + centerSpan,
    sideXLines[3] + centerSpan,
    sideXLines[4] + centerSpan,
  ];
  const yLines = [sideYLines[0], sideYLines[1], sideYLines[1] + centerSpan, sideYLines[2] + centerSpan];

  const tracks = PANEL_SPECS.reduce<TrackState>(
    (state, spec) => {
      const span = FINAL_GRID_SPANS[spec.key];

      state.xLines[spec.colStart] = xLines[span.xStart];
      state.xLines[spec.colEnd] = xLines[span.xEnd];
      state.yLines[spec.rowStart] = yLines[span.yStart];
      state.yLines[spec.rowEnd] = yLines[span.yEnd];

      return state;
    },
    { xLines: [], yLines: [] },
  );
  const centerSpec = PANEL_SPECS.find((spec) => spec.key === "centerCore")!;
  const centerRect = rectFromTrackSpan(tracks, centerSpec);

  return {
    ...tracks,
    guideXLines: [
      xLines[0],
      xLines[1],
      centerRect.x,
      centerRect.x + centerRect.width,
      xLines[4],
      xLines[5],
    ],
    guideYLines: [yLines[0], centerRect.y, centerRect.y + centerRect.height, yLines[3]],
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
  const tracks: TrackState = {
    xLines: start.xLines.map((line, index) => lerp(line, end.xLines[index], easedProgress)),
    yLines: start.yLines.map((line, index) => lerp(line, end.yLines[index], easedProgress)),
  };

  if (start.guideXLines && end.guideXLines) {
    tracks.guideXLines = start.guideXLines.map((line, index) => lerp(line, end.guideXLines![index], easedProgress));
  }

  if (start.guideYLines && end.guideYLines) {
    tracks.guideYLines = start.guideYLines.map((line, index) => lerp(line, end.guideYLines![index], easedProgress));
  }

  return tracks;
}

export function getPanelEntries(tracks: TrackState): PanelEntry[] {
  return PANEL_SPECS.map((spec) => ({
    ...spec,
    rect: rectFromTrackSpan(tracks, spec),
  }));
}

export function getGuideLines(tracks: TrackState, viewportWidth: number, viewportHeight: number): GuideLine[] {
  const xLines = tracks.guideXLines ?? tracks.xLines;
  const yLines = tracks.guideYLines ?? tracks.yLines;

  return [
    ...xLines.map((x, index) => ({
      key: `x-${index}`,
      x1: x,
      y1: 0,
      x2: x,
      y2: viewportHeight,
    })),
    ...yLines.map((y, index) => ({
      key: `y-${index}`,
      x1: 0,
      y1: y,
      x2: viewportWidth,
      y2: y,
    })),
  ];
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

function tracksFromPanelRects(rects: Record<PanelKey, Rect>): TrackState {
  const inset = FINAL_PANEL_INSET / 2;

  return PANEL_SPECS.reduce<TrackState>(
    (state, spec) => {
      const rect = rects[spec.key];

      state.xLines[spec.colStart] = rect.x - inset;
      state.xLines[spec.colEnd] = rect.x + rect.width + inset;
      state.yLines[spec.rowStart] = rect.y - inset;
      state.yLines[spec.rowEnd] = rect.y + rect.height + inset;

      return state;
    },
    { xLines: [], yLines: [] },
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function bikePathData(width: number, height: number) {
  const rearWheelX = width * 0.27;
  const frontWheelX = width * 0.73;
  const wheelY = height * 0.72;
  const wheelR = height * 0.115;

  const bottomBracketX = width * 0.5;
  const bottomBracketY = height * 0.62;
  const seatClusterX = width * 0.41;
  const seatClusterY = height * 0.43;
  const headTubeX = width * 0.63;
  const headTubeY = height * 0.43;
  const stemX = width * 0.69;
  const stemY = height * 0.35;
  const handleX = width * 0.78;
  const handleY = height * 0.36;
  const saddleLeftX = width * 0.36;
  const saddleRightX = width * 0.46;
  const saddleY = height * 0.39;
  const pedalX = width * 0.53;
  const pedalY = height * 0.7;

  return {
    paths: [
      circlePath(rearWheelX, wheelY, wheelR),
      circlePath(frontWheelX, wheelY, wheelR),
      [
        `M ${rearWheelX} ${wheelY}`,
        `L ${bottomBracketX} ${bottomBracketY}`,
        `L ${frontWheelX} ${wheelY}`,
        `M ${rearWheelX} ${wheelY}`,
        `L ${seatClusterX} ${seatClusterY}`,
        `L ${headTubeX} ${headTubeY}`,
        `L ${bottomBracketX} ${bottomBracketY}`,
        `L ${seatClusterX} ${seatClusterY}`,
      ].join(" "),
      [
        `M ${headTubeX} ${headTubeY}`,
        `L ${frontWheelX} ${wheelY}`,
        `M ${headTubeX} ${headTubeY}`,
        `L ${stemX} ${stemY}`,
      ].join(" "),
      [
        `M ${stemX} ${stemY}`,
        `C ${stemX + width * 0.035} ${stemY - height * 0.035} ${handleX + width * 0.018} ${handleY - height * 0.02} ${handleX} ${handleY}`,
        `C ${handleX - width * 0.025} ${handleY + height * 0.045} ${handleX + width * 0.035} ${handleY + height * 0.06} ${handleX + width * 0.055} ${handleY + height * 0.012}`,
      ].join(" "),
      [
        `M ${seatClusterX} ${seatClusterY}`,
        `L ${saddleLeftX} ${saddleY}`,
        `M ${saddleLeftX} ${saddleY}`,
        `C ${saddleLeftX + width * 0.025} ${saddleY - height * 0.025} ${saddleRightX - width * 0.015} ${saddleY - height * 0.018} ${saddleRightX} ${saddleY}`,
      ].join(" "),
      [
        `M ${bottomBracketX - wheelR * 0.18} ${bottomBracketY}`,
        `a ${wheelR * 0.18} ${wheelR * 0.18} 0 1 0 ${wheelR * 0.36} 0`,
        `a ${wheelR * 0.18} ${wheelR * 0.18} 0 1 0 ${-wheelR * 0.36} 0`,
        `M ${bottomBracketX} ${bottomBracketY}`,
        `L ${pedalX} ${pedalY}`,
        `M ${pedalX - width * 0.018} ${pedalY}`,
        `L ${pedalX + width * 0.03} ${pedalY}`,
      ].join(" "),
      [
        `M ${rearWheelX} ${wheelY}`,
        `L ${rearWheelX - wheelR * 0.62} ${wheelY - wheelR * 0.48}`,
        `M ${rearWheelX} ${wheelY}`,
        `L ${rearWheelX + wheelR * 0.56} ${wheelY + wheelR * 0.36}`,
        `M ${frontWheelX} ${wheelY}`,
        `L ${frontWheelX - wheelR * 0.48} ${wheelY + wheelR * 0.52}`,
        `M ${frontWheelX} ${wheelY}`,
        `L ${frontWheelX + wheelR * 0.56} ${wheelY - wheelR * 0.42}`,
      ].join(" "),
    ],
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
