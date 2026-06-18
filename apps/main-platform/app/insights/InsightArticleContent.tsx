"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { LOGO_DRAW_EASE } from "../home/shared/animation";
import { bikePathData } from "../home/utils";
import type { InsightSlug } from "./config";
import { SHANGHAI_GEO_BOUNDS, SHANGHAI_MAP_VIEWBOX, shanghaiMapRegions } from "./shanghaiMapData";

const INSIGHT_TITLES: Record<InsightSlug, string> = {
  "insight-01": "项目总览",
  "insight-02": "数据清洗与可信度",
  "insight-03": "时间规律",
  "insight-04": "骑行时长",
  "insight-05": "空间热点聚类",
  "insight-06": "区域流向分析",
  "insight-07": "区域画像对比",
  "insight-08": "结论、局限与展望",
};

const numberFormatter = new Intl.NumberFormat("en-US");

const overviewOrderStats = {
  rawOrders: 102_361,
  validOrders: 102_210,
  removedOrders: 151,
};

const overviewCoverageStats = {
  riders: 16_883,
  bikes: 78_985,
};

const overviewDurationStat = {
  label: "单次骑行平均时长",
  value: "16.49 分钟",
  note: "中位数 11 分钟，说明短途接驳占主流",
  averageMinutes: 16.49,
  medianMinutes: 11,
  maxMinutes: 30,
};

const overviewSignals = [
  {
    label: "工作日 / 周末",
    value: "76,044 / 26,166",
    note: "工作日明显主导，周末更偏向平缓休闲出行。",
  },
  {
    label: "峰值时段",
    value: "18:00",
    note: "晚高峰高于早高峰，说明下班后的落点更分散。",
  },
  {
    label: "热点结构",
    value: "K = 6",
    note: "聚类结果把核心骑行活动压缩成六个主要热点区域。",
  },
] as const;

type TimeMode = "all" | "weekday" | "weekend";

type TimeDatum = {
  hour: number;
  total: number;
  weekday: number;
  weekend: number;
  weekdayAverage: number;
  weekendAverage: number;
};

const timeHourlyTotals = [
  942, 605, 398, 226, 231, 512, 2290, 6302, 8477, 5194, 3670, 3695,
  4148, 4208, 3957, 4399, 5374, 9271, 10118, 8987, 7465, 5986, 3858, 1897,
] as const;

const timeWeekdayTotals = [
  606, 368, 239, 157, 182, 386, 1906, 5572, 7217, 3872, 2382, 2461,
  2864, 2801, 2540, 2855, 3756, 7275, 7950, 6770, 5493, 4340, 2772, 1280,
] as const;

const timeWeekendTotals = [
  336, 237, 159, 69, 49, 126, 384, 730, 1260, 1322, 1288, 1234,
  1284, 1407, 1417, 1544, 1618, 1996, 2168, 2217, 1972, 1646, 1086, 617,
] as const;

const timeHourlyData: TimeDatum[] = timeHourlyTotals.map((total, hour) => ({
  hour,
  total,
  weekday: timeWeekdayTotals[hour],
  weekend: timeWeekendTotals[hour],
  weekdayAverage: timeWeekdayTotals[hour] / 23,
  weekendAverage: timeWeekendTotals[hour] / 8,
}));

const timeModes: Record<TimeMode, { label: string; unit: string; summary: string }> = {
  all: {
    label: "全部",
    unit: "单",
    summary: "全天曲线呈现清晰双峰，18:00 晚高峰为全月小时级最高点。",
  },
  weekday: {
    label: "工作日",
    unit: "单/工作日",
    summary: "工作日 08:00 与 18:00 尖峰最明显，是典型通勤接驳节奏。",
  },
  weekend: {
    label: "周末",
    unit: "单/周末日",
    summary: "周末从上午到夜间更平缓，10:00-20:00 保持较长的活跃平台。",
  },
};

const timeBands = [
  { label: "夜间低谷", start: 0, end: 5, className: "night" },
  { label: "早高峰", start: 7, end: 9, className: "morning" },
  { label: "午间平台", start: 12, end: 14, className: "noon" },
  { label: "晚高峰", start: 17, end: 20, className: "evening" },
] as const;

const timeFactPanels = [
  { label: "全天峰值", value: "18:00", note: "10,118 单，晚高峰最高" },
  { label: "早晚差", value: "+19%", note: "晚高峰高于 08:00 早高峰" },
  { label: "工作日占比", value: "74.4%", note: "76,044 单来自工作日" },
  { label: "日均订单", value: "3,297", note: "31 天，最高日 5,346 单" },
] as const;

const timePeakButtons = [
  { hour: 8, label: "早高峰", value: "08:00 / 8,477", note: "对应上班通勤" },
  { hour: 18, label: "晚高峰", value: "18:00 / 10,118", note: "全天最高，目的地更分散" },
] as const;

const TIME_CHART = {
  width: 960,
  height: 336,
  left: 42,
  right: 26,
  top: 38,
  bottom: 282,
};

const TIME_COMPARE = {
  width: 620,
  height: 118,
  left: 28,
  right: 18,
  top: 18,
  bottom: 88,
};

type DurationMode = "all" | "core" | "tail";
type DurationGroup = "short" | "core" | "regular" | "tail";
type DurationFocusKey = `bin:${string}` | "marker:median" | "marker:mean" | "marker:iqr";

type DurationDatum = {
  id: string;
  label: string;
  start: number;
  end: number;
  count: number;
  percent: number;
  group: DurationGroup;
  kind: "minute" | "tail";
};

const durationStats = {
  total: 102_210,
  mean: 16.49,
  median: 11,
  q1: 7,
  q3: 20,
  min: 1,
  max: 180,
  coreCount: 67_957,
  corePercent: 66.49,
  over30Count: 12_171,
  over30Percent: 11.91,
  over60Count: 2_584,
  over60Percent: 2.53,
};

const durationMinuteCounts = [
  130, 852, 2497, 4500, 5996, 6840, 7087, 6724, 5979, 5466,
  5048, 4413, 3943, 3457, 3119, 2818, 2556, 2326, 2185, 1902,
  1729, 1658, 1513, 1472, 1301, 1235, 1149, 1057, 1087, 923,
] as const;

const durationTailBins = [
  { label: "30-40", start: 30, end: 40, count: 5081 },
  { label: "40-50", start: 40, end: 50, count: 2621 },
  { label: "50-60", start: 50, end: 60, count: 1885 },
  { label: "60-90", start: 60, end: 90, count: 1779 },
  { label: "90-120", start: 90, end: 120, count: 509 },
  { label: "120-180", start: 120, end: 181, count: 296 },
] as const;

const durationDistributionData: DurationDatum[] = [
  ...durationMinuteCounts.map((count, index) => {
    const minute = index + 1;
    const group: DurationGroup = minute < 5 ? "short" : minute < 20 ? "core" : "regular";
    return {
      id: `m-${minute}`,
      label: `${minute}min`,
      start: minute,
      end: minute + 1,
      count,
      percent: (count / durationStats.total) * 100,
      group,
      kind: "minute" as const,
    };
  }),
  ...durationTailBins.map((item) => ({
    id: `t-${item.start}-${item.end}`,
    label: item.label,
    start: item.start,
    end: item.end,
    count: item.count,
    percent: (item.count / durationStats.total) * 100,
    group: "tail" as const,
    kind: "tail" as const,
  })),
];

const durationModes: Record<DurationMode, { label: string; summary: string }> = {
  all: {
    label: "全部",
    summary: "分布在 7 分钟附近达到峰值，随后快速衰减并拖出右侧长尾。",
  },
  core: {
    label: "5-20 分钟",
    summary: "5-20 分钟贡献 66.49% 的骑行，是最典型的城市短途接驳区间。",
  },
  tail: {
    label: "30 分钟以上",
    summary: "30 分钟以上仅 11.91%，60 分钟以上只有 2.53%，长途并非主流。",
  },
};

const durationFactPanels = [
  { label: "中位数", value: "11min", note: "半数订单不超过 11 分钟" },
  { label: "均值", value: "16.49min", note: "被右侧长尾拉高" },
  { label: "5-20 分钟", value: "66.49%", note: "67,957 单，短途核心" },
  { label: "60 分钟以上", value: "2.53%", note: "仅 2,584 单" },
] as const;

const durationSegmentBars = [
  { label: "<5", count: 7979, percent: 7.81, group: "short", focusKey: "bin:m-4" },
  { label: "5-10", count: 32626, percent: 31.92, group: "core", focusKey: "bin:m-7" },
  { label: "10-15", count: 22327, percent: 21.84, group: "core", focusKey: "bin:m-11" },
  { label: "15-20", count: 13004, percent: 12.72, group: "core", focusKey: "bin:m-16" },
  { label: "20-30", count: 14103, percent: 13.8, group: "regular", focusKey: "bin:m-24" },
  { label: "30-60", count: 9587, percent: 9.38, group: "tail", focusKey: "bin:t-30-40" },
  { label: "60+", count: 2584, percent: 2.53, group: "tail", focusKey: "bin:t-60-90" },
] as const;

const DURATION_CHART = {
  width: 980,
  height: 344,
  left: 44,
  right: 28,
  top: 38,
  bottom: 286,
};

const durationYAxisTicks = [0, 2000, 4000, 6000] as const;
const durationXAxisTicks = [1, 5, 10, 15, 20, 25, 30] as const;

type SpatialHotspotId =
  | "pudong-core"
  | "people-square"
  | "expo-sanlin"
  | "hongkou-yangpu"
  | "minhang-xuhui"
  | "changning-putuo";

type SpatialHotspot = {
  id: SpatialHotspotId;
  rank: number;
  name: string;
  area: string;
  lng: number;
  lat: number;
  orders: number;
  percent: number;
  radiusKm: number;
  summary: string;
};

type SpatialHotspotDot = {
  id: string;
  hotspotId: SpatialHotspotId;
  x: number;
  y: number;
  radius: number;
  opacity: number;
};

const spatialHotspots = [
  {
    id: "pudong-core",
    rank: 1,
    name: "浦东核心 / 陆家嘴",
    area: "陆家嘴",
    lng: 121.5248,
    lat: 31.2871,
    orders: 24187,
    percent: 23.7,
    radiusKm: 3.1,
    summary: "金融办公与换乘核心。",
  },
  {
    id: "people-square",
    rank: 2,
    name: "人民广场 / 南京路",
    area: "人民广场",
    lng: 121.4351,
    lat: 31.2563,
    orders: 19913,
    percent: 19.5,
    radiusKm: 3,
    summary: "商业办公高度叠加。",
  },
  {
    id: "expo-sanlin",
    rank: 3,
    name: "浦东世博 / 三林",
    area: "世博三林",
    lng: 121.4798,
    lat: 31.2034,
    orders: 16758,
    percent: 16.4,
    radiusKm: 3.4,
    summary: "南向通勤扩散明显。",
  },
  {
    id: "hongkou-yangpu",
    rank: 4,
    name: "虹口 / 杨浦",
    area: "虹口杨浦",
    lng: 121.4643,
    lat: 31.3204,
    orders: 15340,
    percent: 15,
    radiusKm: 3.1,
    summary: "北部骑行密度带。",
  },
  {
    id: "minhang-xuhui",
    rank: 5,
    name: "闵行 / 徐汇南部",
    area: "闵行徐汇",
    lng: 121.4031,
    lat: 31.1593,
    orders: 13743,
    percent: 13.4,
    radiusKm: 4,
    summary: "南部居住接驳更散。",
  },
  {
    id: "changning-putuo",
    rank: 6,
    name: "长宁 / 普陀",
    area: "长宁普陀",
    lng: 121.3548,
    lat: 31.2582,
    orders: 12269,
    percent: 12,
    radiusKm: 4.2,
    summary: "西部短途接驳稳定。",
  },
] as const satisfies readonly SpatialHotspot[];

const spatialHotspotTotal = 102210;
const spatialTopThreeShare = 59.6;
const spatialFocusBounds = {
  minLng: 121.235,
  maxLng: 121.63,
  minLat: 31.08,
  maxLat: 31.39,
} as const;

const spatialFocusScale = (() => {
  const cityWidth = SHANGHAI_GEO_BOUNDS.maxLng - SHANGHAI_GEO_BOUNDS.minLng;
  const cityHeight = SHANGHAI_GEO_BOUNDS.maxLat - SHANGHAI_GEO_BOUNDS.minLat;
  const focusWidth = spatialFocusBounds.maxLng - spatialFocusBounds.minLng;
  const focusHeight = spatialFocusBounds.maxLat - spatialFocusBounds.minLat;
  return Math.min(cityWidth / focusWidth, cityHeight / focusHeight);
})();

const spatialFocusCenter = projectShanghaiPoint(
  (spatialFocusBounds.minLng + spatialFocusBounds.maxLng) / 2,
  (spatialFocusBounds.minLat + spatialFocusBounds.maxLat) / 2,
);

const spatialMapTransform = {
  scale: spatialFocusScale,
  translateX: SHANGHAI_MAP_VIEWBOX.width / 2 - spatialFocusCenter.x * spatialFocusScale,
  translateY: SHANGHAI_MAP_VIEWBOX.height / 2 - spatialFocusCenter.y * spatialFocusScale,
} as const;
const spatialMapTransformValue = `translate(${spatialMapTransform.translateX.toFixed(2)} ${spatialMapTransform.translateY.toFixed(2)}) scale(${spatialMapTransform.scale.toFixed(4)})`;
const spatialGlobalMapTransformValue = "translate(0 0) scale(1)";
const spatialSymbolScale = 1 / spatialMapTransform.scale;
const spatialCrosshairSize = 12 * spatialSymbolScale;

const flowFocusBounds = {
  minLng: 121.32,
  maxLng: 121.555,
  minLat: 31.125,
  maxLat: 31.34,
} as const;

const flowFocusScale = (() => {
  const cityWidth = SHANGHAI_GEO_BOUNDS.maxLng - SHANGHAI_GEO_BOUNDS.minLng;
  const cityHeight = SHANGHAI_GEO_BOUNDS.maxLat - SHANGHAI_GEO_BOUNDS.minLat;
  const focusWidth = flowFocusBounds.maxLng - flowFocusBounds.minLng;
  const focusHeight = flowFocusBounds.maxLat - flowFocusBounds.minLat;
  return Math.min(cityWidth / focusWidth, cityHeight / focusHeight);
})();

const flowFocusCenter = projectShanghaiPoint(
  (flowFocusBounds.minLng + flowFocusBounds.maxLng) / 2,
  (flowFocusBounds.minLat + flowFocusBounds.maxLat) / 2,
);

const flowMapTransform = {
  scale: flowFocusScale,
  translateX: SHANGHAI_MAP_VIEWBOX.width / 2 - flowFocusCenter.x * flowFocusScale,
  translateY: SHANGHAI_MAP_VIEWBOX.height / 2 - flowFocusCenter.y * flowFocusScale,
} as const;
const flowMapTransformValue = `translate(${flowMapTransform.translateX.toFixed(2)} ${flowMapTransform.translateY.toFixed(2)}) scale(${flowMapTransform.scale.toFixed(4)})`;
const flowGlobalMapTransformValue = spatialGlobalMapTransformValue;
const flowSymbolScale = 1 / flowMapTransform.scale;

function projectShanghaiPoint(lng: number, lat: number) {
  const innerWidth = SHANGHAI_MAP_VIEWBOX.width - SHANGHAI_MAP_VIEWBOX.padding * 2;
  const innerHeight = SHANGHAI_MAP_VIEWBOX.height - SHANGHAI_MAP_VIEWBOX.padding * 2;
  const x = SHANGHAI_MAP_VIEWBOX.padding + ((lng - SHANGHAI_GEO_BOUNDS.minLng) / (SHANGHAI_GEO_BOUNDS.maxLng - SHANGHAI_GEO_BOUNDS.minLng)) * innerWidth;
  const y = SHANGHAI_MAP_VIEWBOX.padding + ((SHANGHAI_GEO_BOUNDS.maxLat - lat) / (SHANGHAI_GEO_BOUNDS.maxLat - SHANGHAI_GEO_BOUNDS.minLat)) * innerHeight;

  return { x, y };
}

function createSpatialHotspotDots(): SpatialHotspotDot[] {
  return spatialHotspots.flatMap((hotspot, hotspotIndex) => {
    const center = projectShanghaiPoint(hotspot.lng, hotspot.lat);
    const dotCount = hotspot.rank <= 3 ? 34 : 25;
    const spreadX = (18 + hotspot.radiusKm * 10 + (hotspot.rank <= 3 ? 8 : 0)) * spatialSymbolScale;
    const spreadY = (14 + hotspot.radiusKm * 8 + (hotspot.rank <= 3 ? 5 : 0)) * spatialSymbolScale;

    return Array.from({ length: dotCount }, (_, dotIndex) => {
      const turn = dotIndex * 2.399963 + hotspotIndex * 0.61;
      const ring = Math.sqrt((dotIndex + 1) / dotCount);
      const wobble = 0.82 + ((dotIndex * 37 + hotspotIndex * 11) % 17) / 48;
      const x = center.x + Math.cos(turn) * spreadX * ring * wobble;
      const y = center.y + Math.sin(turn) * spreadY * ring * (1.1 - wobble * 0.18);
      const radius = (1.8 + ((dotIndex + hotspotIndex) % 4) * 0.36) * spatialSymbolScale;
      const opacity = 0.42 + ((dotIndex * 13 + hotspotIndex) % 9) * 0.045;

      return {
        id: `${hotspot.id}-${dotIndex}`,
        hotspotId: hotspot.id,
        x,
        y,
        radius,
        opacity,
      };
    });
  });
}

const spatialHotspotDots = createSpatialHotspotDots();

type FlowRegionId = "r1" | "r2" | "r3" | "r4" | "r5" | "r6";
type FlowMode = "all" | "cross" | "internal" | "net";
type FlowTopLimit = 5 | 10 | 15;
type FlowStatus = "in" | "out" | "balanced";
type FlowMatrixRow = readonly [number, number, number, number, number, number];

type FlowRegionSeed = {
  id: FlowRegionId;
  regionNo: number;
  name: string;
  area: string;
  lng: number;
  lat: number;
  orders: number;
  summary: string;
};

type FlowRegion = FlowRegionSeed & {
  incoming: number;
  outgoing: number;
  internal: number;
  netFlow: number;
  internalShare: number;
  point: ReturnType<typeof projectShanghaiPoint>;
  status: FlowStatus;
  nodeRadius: number;
};

type FlowPoint = {
  x: number;
  y: number;
};

type FlowCurve = {
  start: FlowPoint;
  control: FlowPoint;
  end: FlowPoint;
};

type FlowEdge = {
  id: string;
  from: FlowRegionId;
  to: FlowRegionId;
  fromRegion: FlowRegion;
  toRegion: FlowRegion;
  count: number;
  percent: number;
  rank: number;
  path: string;
  taperedArrowPath: string;
  gradientStart: FlowPoint;
  gradientEnd: FlowPoint;
  strength: number;
};

type FlowSelection =
  | { kind: "region"; regionId: FlowRegionId }
  | { kind: "edge"; edgeId: string };

const flowRegionIds = ["r1", "r2", "r3", "r4", "r5", "r6"] as const satisfies readonly FlowRegionId[];
const flowTopLimits = [5, 10, 15] as const satisfies readonly FlowTopLimit[];
const flowModeOrder = ["all", "cross", "internal", "net"] as const satisfies readonly FlowMode[];
const flowEmptyMatrixRow = [0, 0, 0, 0, 0, 0] as const satisfies FlowMatrixRow;

const flowRegionSeeds = [
  {
    id: "r1",
    regionNo: 1,
    name: "人民广场 / 南京路",
    area: "人民广场",
    lng: 121.4351,
    lat: 31.2563,
    orders: 19913,
    summary: "中心商业与办公混合区，双向换乘和短途接驳都很密集。",
  },
  {
    id: "r2",
    regionNo: 2,
    name: "浦东世博 / 三林",
    area: "世博三林",
    lng: 121.4798,
    lat: 31.2034,
    orders: 16758,
    summary: "南向居住与通勤接驳明显，向人民广场和徐汇南部输出较多。",
  },
  {
    id: "r3",
    regionNo: 3,
    name: "浦东核心 / 陆家嘴",
    area: "陆家嘴",
    lng: 121.5248,
    lat: 31.2871,
    orders: 24187,
    summary: "订单量最高的核心区，与虹口杨浦之间形成最强跨区束线。",
  },
  {
    id: "r4",
    regionNo: 4,
    name: "长宁 / 普陀",
    area: "长宁普陀",
    lng: 121.3548,
    lat: 31.2582,
    orders: 12269,
    summary: "西侧短途循环稳定，与人民广场之间存在清晰的东西向互流。",
  },
  {
    id: "r5",
    regionNo: 5,
    name: "闵行 / 徐汇南部",
    area: "闵行徐汇",
    lng: 121.4031,
    lat: 31.1593,
    orders: 13743,
    summary: "南部居住接驳更分散，与浦东世博三林之间互流突出。",
  },
  {
    id: "r6",
    regionNo: 6,
    name: "虹口 / 杨浦",
    area: "虹口杨浦",
    lng: 121.4643,
    lat: 31.3204,
    orders: 15340,
    summary: "北部骑行密度带，整体呈净流入，并与陆家嘴形成最高强度通道。",
  },
] as const satisfies readonly FlowRegionSeed[];

const flowMatrix = [
  [15800, 1100, 557, 1062, 413, 981],
  [1385, 13644, 554, 40, 1064, 71],
  [587, 471, 21719, 2, 3, 1405],
  [950, 21, 3, 10801, 283, 211],
  [399, 963, 5, 353, 12018, 5],
  [833, 29, 1288, 177, 0, 13013],
] as const satisfies readonly FlowMatrixRow[];

const flowTotalTrips = flowMatrix.reduce(
  (total: number, row) => total + row.reduce((rowTotal: number, count) => rowTotal + count, 0),
  0,
);
const flowInternalTrips = flowMatrix.reduce((total, row, index) => total + (row[index] ?? 0), 0);
const flowCrossTrips = flowTotalTrips - flowInternalTrips;
const flowInternalShare = (flowInternalTrips / flowTotalTrips) * 100;
const flowCrossShare = (flowCrossTrips / flowTotalTrips) * 100;
const flowMaxOrders = Math.max(...flowRegionSeeds.map((region) => region.orders));

function getFlowStatus(netFlow: number): FlowStatus {
  if (netFlow >= 150) return "in";
  if (netFlow <= -150) return "out";
  return "balanced";
}

const flowRegions = flowRegionSeeds.map((seed, index) => {
  const row = flowMatrix[index] ?? flowEmptyMatrixRow;
  const outgoing = row.reduce((total: number, count) => total + count, 0);
  const incoming = flowMatrix.reduce((total, matrixRow) => total + (matrixRow[index] ?? 0), 0);
  const internal = row[index] ?? 0;
  const netFlow = incoming - outgoing;
  const point = projectShanghaiPoint(seed.lng, seed.lat);

  return {
    ...seed,
    incoming,
    outgoing,
    internal,
    netFlow,
    internalShare: (internal / outgoing) * 100,
    point,
    status: getFlowStatus(netFlow),
    nodeRadius: (6.8 + Math.sqrt(seed.orders / flowMaxOrders) * 8.8) * flowSymbolScale,
  };
}) satisfies FlowRegion[];

const flowRegionById = new Map<FlowRegionId, FlowRegion>(flowRegions.map((region) => [region.id, region]));
const flowMaxInternalTrips = Math.max(...flowRegions.map((region) => region.internal));
const flowMaxCrossCount = Math.max(
  ...flowMatrix.flatMap((row, rowIndex) =>
    row.flatMap((count, colIndex) => (rowIndex === colIndex || count <= 0 ? [] : [count])),
  ),
);

function getFlowRegion(regionId: FlowRegionId) {
  return flowRegionById.get(regionId) ?? flowRegions[0];
}

function flowEdgeId(from: FlowRegionId, to: FlowRegionId) {
  return `${from}-${to}`;
}

function createFlowCurve(fromRegion: FlowRegion, toRegion: FlowRegion): FlowCurve {
  const dx = toRegion.point.x - fromRegion.point.x;
  const dy = toRegion.point.y - fromRegion.point.y;
  const distance = Math.hypot(dx, dy) || 1;
  const unitX = dx / distance;
  const unitY = dy / distance;
  const normalX = -unitY;
  const normalY = unitX;
  const pairSign = fromRegion.regionNo < toRegion.regionNo ? 1 : -1;
  const bend = (28 + ((fromRegion.regionNo + toRegion.regionNo) % 4) * 7 + Math.min(distance * 0.04, 24)) * flowSymbolScale * pairSign;
  const startX = fromRegion.point.x + unitX * (fromRegion.nodeRadius + 5 * flowSymbolScale);
  const startY = fromRegion.point.y + unitY * (fromRegion.nodeRadius + 5 * flowSymbolScale);
  const endX = toRegion.point.x - unitX * (toRegion.nodeRadius + 10 * flowSymbolScale);
  const endY = toRegion.point.y - unitY * (toRegion.nodeRadius + 10 * flowSymbolScale);
  const controlX = (startX + endX) / 2 + normalX * bend;
  const controlY = (startY + endY) / 2 + normalY * bend;

  return {
    start: { x: startX, y: startY },
    control: { x: controlX, y: controlY },
    end: { x: endX, y: endY },
  };
}

function flowCurveToPath(curve: FlowCurve) {
  return `M ${curve.start.x.toFixed(2)} ${curve.start.y.toFixed(2)} Q ${curve.control.x.toFixed(2)} ${curve.control.y.toFixed(2)} ${curve.end.x.toFixed(2)} ${curve.end.y.toFixed(2)}`;
}

function flowCurvePoint(curve: FlowCurve, t: number): FlowPoint {
  const inv = 1 - t;
  return {
    x: inv * inv * curve.start.x + 2 * inv * t * curve.control.x + t * t * curve.end.x,
    y: inv * inv * curve.start.y + 2 * inv * t * curve.control.y + t * t * curve.end.y,
  };
}

function flowCurveNormal(curve: FlowCurve, t: number): FlowPoint {
  const dx = 2 * (1 - t) * (curve.control.x - curve.start.x) + 2 * t * (curve.end.x - curve.control.x);
  const dy = 2 * (1 - t) * (curve.control.y - curve.start.y) + 2 * t * (curve.end.y - curve.control.y);
  const length = Math.hypot(dx, dy) || 1;

  return { x: -dy / length, y: dx / length };
}

function flowCurveTangent(curve: FlowCurve, t: number): FlowPoint {
  const dx = 2 * (1 - t) * (curve.control.x - curve.start.x) + 2 * t * (curve.end.x - curve.control.x);
  const dy = 2 * (1 - t) * (curve.control.y - curve.start.y) + 2 * t * (curve.end.y - curve.control.y);
  const length = Math.hypot(dx, dy) || 1;

  return { x: dx / length, y: dy / length };
}

function createFlowTaperedArrowPath(curve: FlowCurve, strength: number) {
  const samples = [0.018, 0.055, 0.11, 0.19, 0.3, 0.43, 0.58, 0.72, 0.84, 0.925, 0.972];
  const tailWidth = (38 + strength * 30) * flowSymbolScale;
  const tipWidth = (2.8 + strength * 2.8) * flowSymbolScale;
  const left: FlowPoint[] = [];
  const right: FlowPoint[] = [];

  samples.forEach((t, index) => {
    const progress = index / (samples.length - 1);
    const point = flowCurvePoint(curve, t);
    const normal = flowCurveNormal(curve, t);
    const eased = 1 - Math.pow(1 - progress, 1.55);
    const tailBloom = Math.max(0, 1 - progress / 0.22) * (6 + strength * 9) * flowSymbolScale;
    const width = tailWidth + (tipWidth - tailWidth) * eased + tailBloom;

    left.push({ x: point.x + normal.x * width * 0.5, y: point.y + normal.y * width * 0.5 });
    right.push({ x: point.x - normal.x * width * 0.5, y: point.y - normal.y * width * 0.5 });
  });

  const tip = curve.end;
  const tailCenter = flowCurvePoint(curve, samples[0]);
  const tailTangent = flowCurveTangent(curve, samples[0]);
  const capControl = {
    x: tailCenter.x - tailTangent.x * tailWidth * 0.28,
    y: tailCenter.y - tailTangent.y * tailWidth * 0.28,
  };
  const path = [`M ${left[0].x.toFixed(2)} ${left[0].y.toFixed(2)}`];

  left.slice(1).forEach((point) => {
    path.push(`L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
  });
  path.push(`L ${tip.x.toFixed(2)} ${tip.y.toFixed(2)}`);
  right
    .slice()
    .reverse()
    .forEach((point) => {
      path.push(`L ${point.x.toFixed(2)} ${point.y.toFixed(2)}`);
    });
  path.push(`Q ${capControl.x.toFixed(2)} ${capControl.y.toFixed(2)} ${left[0].x.toFixed(2)} ${left[0].y.toFixed(2)}`);
  path.push("Z");

  return path.join(" ");
}

function createFlowLoopPath(region: FlowRegion) {
  const strength = Math.sqrt(region.internal / flowMaxInternalTrips);
  const radiusX = (22 + strength * 20) * flowSymbolScale;
  const radiusY = radiusX * 0.58;
  const tilt = region.regionNo % 2 === 0 ? 1 : -1;
  const x = region.point.x;
  const y = region.point.y;
  const leftX = x - radiusX;
  const rightX = x + radiusX;
  const startY = y - tilt * radiusY * 0.12;

  return [
    `M ${leftX.toFixed(2)} ${startY.toFixed(2)}`,
    `C ${leftX.toFixed(2)} ${(y - tilt * radiusY).toFixed(2)} ${rightX.toFixed(2)} ${(y - tilt * radiusY).toFixed(2)} ${rightX.toFixed(2)} ${startY.toFixed(2)}`,
    `C ${rightX.toFixed(2)} ${(y + tilt * radiusY).toFixed(2)} ${leftX.toFixed(2)} ${(y + tilt * radiusY).toFixed(2)} ${leftX.toFixed(2)} ${startY.toFixed(2)}`,
  ].join(" ");
}

function flowLoopStrokeWidth(region: FlowRegion) {
  return 2.4 + Math.sqrt(region.internal / flowMaxInternalTrips) * 4.2;
}

const flowAllEdges = flowMatrix.flatMap((row, fromIndex) => {
  const from = flowRegionIds[fromIndex];
  const fromRegion = flowRegions[fromIndex];
  if (!from || !fromRegion) return [];

  return row.flatMap((count, toIndex) => {
    const to = flowRegionIds[toIndex];
    const toRegion = flowRegions[toIndex];
    if (!to || !toRegion || count <= 0) return [];

    const isInternal = from === to;
    const strength = Math.sqrt(count / (isInternal ? flowMaxInternalTrips : flowMaxCrossCount));
    const curve = isInternal ? null : createFlowCurve(fromRegion, toRegion);

    return [
      {
        id: flowEdgeId(from, to),
        from,
        to,
        fromRegion,
        toRegion,
        count,
        percent: (count / flowTotalTrips) * 100,
        rank: 0,
        path: curve ? flowCurveToPath(curve) : createFlowLoopPath(fromRegion),
        taperedArrowPath: curve ? createFlowTaperedArrowPath(curve, strength) : "",
        gradientStart: curve?.start ?? fromRegion.point,
        gradientEnd: curve?.end ?? toRegion.point,
        strength,
      },
    ];
  });
}) satisfies FlowEdge[];

const flowCrossEdges = flowAllEdges
  .filter((edge) => edge.from !== edge.to)
  .sort((a, b) => b.count - a.count)
  .map((edge, index) => ({ ...edge, rank: index + 1 }));
const flowTopCrossEdges = flowCrossEdges.slice(0, 15);

const flowModes: Record<FlowMode, { label: string; summary: string }> = {
  all: {
    label: "全部",
    summary: "同时显示区域内环流和 Top 跨区束线，观察主结构与少数强通道。",
  },
  cross: {
    label: "跨区",
    summary: "隐藏自循环，只保留跨区 OD 束线，强流集中在 3↔6、1↔2、2↔5。",
  },
  internal: {
    label: "区域内",
    summary: "只看每个节点周围的环流，验证 85.11% 的订单没有离开所属热点区域。",
  },
  net: {
    label: "净流向",
    summary: "节点颜色强调净流入、净流出与平衡状态，跨区线作为方向参照。",
  },
};

function formatSignedCount(value: number) {
  if (value > 0) return `+${formatCount(value)}`;
  if (value < 0) return `-${formatCount(Math.abs(value))}`;
  return "0";
}

function flowStatusLabel(status: FlowStatus) {
  if (status === "in") return "净流入";
  if (status === "out") return "净流出";
  return "基本平衡";
}

const cleanLabStages = [
  {
    id: "01",
    title: "读入 CSV",
    code: [
      "PROJECT_ROOT = Path(__file__).resolve().parents[2]",
      "RAW_DATA = PROJECT_ROOT / \"mobike_shanghai_sample_updated.csv\"",
      "",
      "def load_data(filepath):",
      "    df = pd.read_csv(filepath)",
      "    print(f\"shape: {df.shape[0]} rows x {df.shape[1]} fields\")",
      "    return df",
      "",
      "df = load_data(RAW_DATA)",
      "# evidence: 102,361 rows x 9 raw fields",
    ].join("\n"),
    tone: "cyan",
  },
  {
    id: "02",
    title: "检查字段 / 缺失 / 重复",
    code: [
      "def inspect_data(df):",
      "    columns = list(df.columns)",
      "    dtypes = df.dtypes.to_string()",
      "    missing = df.isnull().sum()",
      "    missing_report = missing[missing > 0]",
      "    duplicate_rows = df.duplicated().sum()",
      "",
      "    print(columns)",
      "    print(dtypes)",
      "    print(missing_report if len(missing_report) else \"no missing\")",
      "    print(f\"duplicate rows: {duplicate_rows}\")",
      "    # evidence: 9 fields / 0 missing / 0 duplicates",
      "    return df",
    ].join("\n"),
    tone: "cyan",
  },
  {
    id: "03",
    title: "解析时间",
    code: [
      "def parse_datetime(df):",
      "    df[\"start_time\"] = pd.to_datetime(df[\"start_time\"])",
      "    df[\"end_time\"] = pd.to_datetime(df[\"end_time\"])",
      "",
      "    print(df[\"start_time\"].min())",
      "    print(df[\"start_time\"].max())",
      "    # evidence: 2016-08-01 00:23 -> 2016-08-31 23:58",
      "    return df",
    ].join("\n"),
    tone: "amber",
  },
  {
    id: "04",
    title: "提取时间特征",
    code: [
      "def extract_time_features(df):",
      "    df[\"start_date\"] = df[\"start_time\"].dt.date",
      "    df[\"start_hour\"] = df[\"start_time\"].dt.hour",
      "    df[\"start_weekday\"] = df[\"start_time\"].dt.weekday",
      "    df[\"start_is_weekend\"] = (",
      "        df[\"start_weekday\"].isin([5, 6]).astype(int)",
      "    )",
      "",
      "    print(df[\"start_date\"].min(), df[\"start_date\"].max())",
      "    # evidence: weekdays=76,160 / weekends=26,201",
      "    return df",
    ].join("\n"),
    tone: "amber",
  },
  {
    id: "05",
    title: "计算 duration_min",
    code: [
      "def calc_duration(df):",
      "    delta = df[\"end_time\"] - df[\"start_time\"]",
      "    df[\"duration_min\"] = delta.dt.total_seconds() / 60.0",
      "",
      "    neg_duration = (df[\"duration_min\"] < 0).sum()",
      "    if neg_duration > 0:",
      "        print(f\"negative duration rows: {neg_duration}\")",
      "",
      "    print(df[\"duration_min\"].describe().to_string())",
      "    # evidence: max duration before filtering = 4725 min",
      "    return df",
    ].join("\n"),
    tone: "amber",
  },
  {
    id: "06",
    title: "4 条规则过滤",
    code: [
      "SH_LNG_MIN, SH_LNG_MAX = 120.8, 122.2",
      "SH_LAT_MIN, SH_LAT_MAX = 30.7, 31.9",
      "",
      "def filter_anomalies(df):",
      "    removed = {}",
      "",
      "    before = len(df)",
      "    df = df[df[\"duration_min\"] >= 1]",
      "    removed[\"<1min\"] = before - len(df)",
      "",
      "    before = len(df)",
      "    df = df[df[\"duration_min\"] <= 180]",
      "    removed[\">180min\"] = before - len(df)",
      "",
      "    coord_mask = (",
      "        df[\"start_location_x\"].between(SH_LNG_MIN, SH_LNG_MAX)",
      "        & df[\"start_location_y\"].between(SH_LAT_MIN, SH_LAT_MAX)",
      "        & df[\"end_location_x\"].between(SH_LNG_MIN, SH_LNG_MAX)",
      "        & df[\"end_location_y\"].between(SH_LAT_MIN, SH_LAT_MAX)",
      "    )",
      "    before = len(df)",
      "    df = df[coord_mask]",
      "    removed[\"coord\"] = before - len(df)",
      "",
      "    before = len(df)",
      "    df = df[df[\"duration_min\"] >= 0]",
      "    removed[\"neg_duration\"] = before - len(df)",
      "    # evidence: removed <1=0 / >180=148 / coord=3 / neg=0",
      "    return df",
    ].join("\n"),
    tone: "red",
  },
  {
    id: "07",
    title: "导出清洗结果",
    code: [
      "output_cols = [",
      "    \"orderid\", \"bikeid\", \"userid\",",
      "    \"start_time\", \"end_time\",",
      "    \"start_location_x\", \"start_location_y\",",
      "    \"end_location_x\", \"end_location_y\",",
      "    \"duration_min\",",
      "    \"start_date\", \"start_hour\",",
      "    \"start_weekday\", \"start_is_weekend\",",
      "]",
      "",
      "df[output_cols].to_csv(",
      "    CLEANED_DATA, index=False, encoding=\"utf-8\"",
      ")",
      "# evidence: 102,210 rows x 14 fields / 99.85% retained",
    ].join("\n"),
    tone: "green",
  },
] as const;

type CleanLabTokenKind = "number" | "time" | "coord" | "field" | "dirty" | "pass";

type CleanLabToken = {
  kind: CleanLabTokenKind;
  labels: [string, string, string, string, string, string, string, string];
  role?: "normal" | "long" | "coord" | "field" | "check" | "derived" | "output";
};

type CleanLabTokenLayout = {
  x: number;
  y: number;
  scale: number;
  rotate: number;
  opacity: number;
};

const cleanLabTokenSeed: CleanLabToken[] = [
  {
    kind: "field",
    role: "normal",
    labels: ["78387", "orderid", "orderid:int64", "orderid", "orderid", "row 78387", "row 78387", "orderid"],
  },
  {
    kind: "field",
    role: "normal",
    labels: ["158357", "bikeid", "bikeid:int64", "bikeid", "bikeid", "bikeid 158357", "bikeid 158357", "bikeid"],
  },
  {
    kind: "field",
    role: "normal",
    labels: ["10080", "userid", "userid:int64", "userid", "userid", "userid 10080", "userid 10080", "userid"],
  },
  {
    kind: "time",
    role: "normal",
    labels: ["2016/8/20 6:57", "start_time", "start_time:str", "2016-08-20 06:57", "date=2016/8/20", "start 06:57", "start 06:57", "start_time"],
  },
  {
    kind: "time",
    role: "normal",
    labels: ["2016/8/20 7:04", "end_time", "end_time:str", "2016-08-20 07:04", "hour=6", "end 07:04", "end 07:04", "end_time"],
  },
  {
    kind: "coord",
    role: "normal",
    labels: ["121.348", "start_location_x", "start_x:float64", "121.348", "weekday=5", "duration=7 min", "duration=7 min", "start_location_x"],
  },
  {
    kind: "coord",
    role: "normal",
    labels: ["31.389", "start_location_y", "start_y:float64", "31.389", "weekend=1", "valid short trip", "valid short trip", "start_location_y"],
  },
  {
    kind: "coord",
    role: "normal",
    labels: ["121.357", "end_location_x", "end_x:float64", "121.357", "raw row kept", "inside 180", "inside 180", "end_location_x"],
  },
  {
    kind: "coord",
    role: "normal",
    labels: ["31.388", "end_location_y", "end_y:float64", "31.388", "raw row kept", "Shanghai bounds", "Shanghai bounds", "end_location_y"],
  },
  {
    kind: "field",
    role: "normal",
    labels: ["891333", "row 891333", "complete row", "2016-08-29", "weekday=0", "duration=22 min", "duration=22 min", "duration_min"],
  },
  {
    kind: "field",
    role: "normal",
    labels: ["1106623", "row 1106623", "complete row", "2016-08-13", "weekend=1", "duration=19 min", "duration=19 min", "start_date"],
  },
  {
    kind: "number",
    role: "check",
    labels: ["102,361 rows", "102,361 rows", "9 raw fields", "2016-08 range", "76,160 weekdays", "count=102,361", "102,210 kept", "102,210 rows"],
  },
  {
    kind: "pass",
    role: "check",
    labels: ["9 fields", "9 columns", "0 missing", "0 missing", "26,201 weekends", "min=1", "0 <1 min", "14 fields"],
  },
  {
    kind: "pass",
    role: "check",
    labels: ["raw CSV", "typed columns", "0 duplicates", "2016 not 2017", "4 derived fields", "median=12", "0 negative", "99.85% retained"],
  },
  {
    kind: "time",
    role: "derived",
    labels: ["start_time", "time string", "start_time:str", "2016-08-01 00:23", "start_date", "start_date", "start_date", "start_hour"],
  },
  {
    kind: "time",
    role: "derived",
    labels: ["end_time", "time string", "end_time:str", "2016-08-31 23:58", "start_hour", "start_hour", "start_hour", "start_weekday"],
  },
  {
    kind: "time",
    role: "derived",
    labels: ["2017-08?", "report says 2017", "field log wins", "2016-08 confirmed", "start_weekday", "weekday tag", "weekday tag", "start_is_weekend"],
  },
  {
    kind: "time",
    role: "derived",
    labels: ["August sample", "2016/8 strings", "datetime ready", "2016-08 month", "start_is_weekend", "weekend flag", "weekend flag", "duration_min"],
  },
  {
    kind: "dirty",
    role: "long",
    labels: ["119909", "row 119909", "complete row", "2016-08-05 08:43", "start 08:43", "2016/8/5 8:43 -> 2016/8/8 15:28", "4725 min removed", ""],
  },
  {
    kind: "dirty",
    role: "long",
    labels: ["86648", "bikeid 86648", "long-tail candidate", "2016-08-08 15:28", "end 15:28", "duration=4725 min", ">180 min removed", ""],
  },
  {
    kind: "dirty",
    role: "long",
    labels: ["14312", "row 14312", "long-tail candidate", "2016-08-03 06:53", "start 06:53", "duration=3662 min", "3662 min removed", ""],
  },
  {
    kind: "dirty",
    role: "long",
    labels: ["629969", "row 629969", "long-tail candidate", "2016-08-25 15:18", "start 15:18", "duration=2947 min", "2947 min removed", ""],
  },
  {
    kind: "dirty",
    role: "long",
    labels: ["151411", "row 151411", "long-tail candidate", "2016-08-21 00:44", "start 00:44", "duration=2848 min", "2848 min removed", ""],
  },
  {
    kind: "dirty",
    role: "long",
    labels: ["1796813", "row 1796813", "long-tail candidate", "2016-08-26 21:10", "start 21:10", "duration=2479 min", "2479 min removed", ""],
  },
  {
    kind: "dirty",
    role: "coord",
    labels: ["1272182", "row 1272182", "coord candidate", "2016-08-27 17:41", "coord check", "end=(120.487,31.477)", "coord removed", ""],
  },
  {
    kind: "dirty",
    role: "coord",
    labels: ["120.487", "end_lng", "end_lng:float64", "120.487", "out of bounds", "lng 120.487 < 120.8", "3 coord rows", ""],
  },
  {
    kind: "dirty",
    role: "coord",
    labels: ["31.477", "end_lat", "end_lat:float64", "31.477", "lat valid", "paired bad lng", "coord side branch", ""],
  },
  {
    kind: "pass",
    role: "output",
    labels: ["cleaned_mobike.csv", "clean target", "ready", "ready", "ready", "151 removed", "151 removed", "cleaned_mobike.csv"],
  },
];

const cleanLabTokens = cleanLabTokenSeed;

function formatCount(value: number) {
  return numberFormatter.format(value);
}

function interpolateNumber(from: number, to: number, progress: number) {
  return from + (to - from) * progress;
}

function blendTokenLayout(index: number, fromState: number, toState: number, progress: number): CleanLabTokenLayout {
  const from = tokenLayout(index, fromState);
  const to = tokenLayout(index, toState);

  return {
    x: interpolateNumber(from.x, to.x, progress),
    y: interpolateNumber(from.y, to.y, progress),
    scale: interpolateNumber(from.scale, to.scale, progress),
    rotate: interpolateNumber(from.rotate, to.rotate, progress),
    opacity: interpolateNumber(from.opacity, to.opacity, progress),
  };
}

function OverviewBikeFigure({ play }: { play: boolean }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const bike = useMemo(() => bikePathData(360, 220), []);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const paths = svg.querySelectorAll<SVGPathElement>(".insight-overview-bike-path");
    const accent = svg.querySelector<SVGPathElement>(".insight-overview-bike-accent");
    const ctx = gsap.context(() => {
      if (!play) {
        gsap.set([paths, accent].filter(Boolean), { autoAlpha: 0 });
        return;
      }

      paths.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: length,
          strokeDashoffset: length,
          autoAlpha: 1,
        });
      });

      if (accent) {
        gsap.set(accent, { autoAlpha: 0 });
      }

      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      if (accent) {
        tl.to(accent, { autoAlpha: 1, duration: 0.18 }, 0.08);
      }
      tl.to(
        paths,
        {
          strokeDashoffset: 0,
          autoAlpha: 1,
          duration: 0.72,
          ease: LOGO_DRAW_EASE,
          stagger: 0.018,
        },
        0.12,
      );

      return () => tl.kill();
    }, svg);

    return () => ctx.revert();
  }, [play]);

  return (
    <div className="insight-overview-bike-figure" aria-hidden="true">
      <svg
        ref={svgRef}
        className="insight-overview-bike-svg"
        viewBox="0 0 360 220"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <filter id="overview-bike-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path className="insight-overview-bike-accent" d="M 24 184 C 82 122 142 96 210 106 C 262 114 305 139 336 179" />
        {bike.paths.map((path, index) => (
          <path
            key={index}
            className="insight-overview-bike-path"
            d={path}
            filter="url(#overview-bike-glow)"
          />
        ))}
      </svg>
    </div>
  );
}

function MetricDurationViz({
  averageMinutes,
  medianMinutes,
  maxMinutes,
}: {
  averageMinutes: number;
  medianMinutes: number;
  maxMinutes: number;
}) {
  const averagePercent = `${Math.min(100, (averageMinutes / maxMinutes) * 100)}%`;
  const medianPercent = `${Math.min(100, (medianMinutes / maxMinutes) * 100)}%`;

  return (
    <div className="insight-overview-duration-viz" aria-hidden="true">
      <div className="insight-overview-duration-track">
        <div className="insight-overview-duration-arrow" style={{ width: averagePercent }} />
        <div className="insight-overview-duration-median" style={{ left: medianPercent }} />
      </div>
      <div className="insight-overview-duration-labels">
        <span>0 分钟</span>
        <span>30 分钟参考上限</span>
      </div>
      <div className="insight-overview-duration-callout insight-overview-duration-callout-average" style={{ left: averagePercent }}>
        平均 16.49 分钟
      </div>
      <div className="insight-overview-duration-callout insight-overview-duration-callout-median" style={{ left: medianPercent }}>
        中位数 11 分钟
      </div>
    </div>
  );
}

function OverviewOrderQualityPanel() {
  return (
    <article className="insight-overview-metric insight-overview-metric-orders">
      <div className="insight-overview-metric-copy">
        <p className="insight-news-card-label">八月有效骑行订单</p>
        <strong className="insight-overview-metric-value">{formatCount(overviewOrderStats.validOrders)}</strong>
      </div>

      <div className="insight-overview-order-statement">
        <span>保留 {formatCount(overviewOrderStats.validOrders)} 条有效订单</span>
        <span>仅剔除 {formatCount(overviewOrderStats.removedOrders)} 条异常记录</span>
      </div>

      <div className="insight-overview-order-meta">
        <span>原始样本 {formatCount(overviewOrderStats.rawOrders)}</span>
        <span>有效保留率 99.85%</span>
      </div>
    </article>
  );
}

function OverviewCoveragePanel() {
  const ratio = overviewCoverageStats.bikes / overviewCoverageStats.riders;

  return (
    <article className="insight-overview-metric insight-overview-metric-scale">
      <div className="insight-overview-metric-copy">
        <p className="insight-news-card-label">参与骑行的独立用户 / 投入使用的独立单车</p>
        <p className="insight-overview-metric-note">
          左对齐并排对比样本中的人群规模与车辆规模，直接看出谁更多、差多少。
        </p>
      </div>

      <div className="insight-overview-scale-bars" aria-hidden="true">
        <div className="insight-overview-scale-bar-row">
          <div className="insight-overview-scale-bar-copy">
            <span className="insight-overview-scale-eyebrow">人群端</span>
            <p className="insight-overview-scale-copy">参与骑行的独立用户</p>
          </div>
          <div className="insight-overview-scale-bar-viz">
            <strong className="insight-overview-scale-value">{formatCount(overviewCoverageStats.riders)}</strong>
            <div className="insight-overview-scale-track">
              <span className="insight-overview-scale-fill insight-overview-scale-fill-users" style={{ width: `${(overviewCoverageStats.riders / overviewCoverageStats.bikes) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="insight-overview-scale-bar-row">
          <div className="insight-overview-scale-bar-copy">
            <span className="insight-overview-scale-eyebrow">车端</span>
            <p className="insight-overview-scale-copy">投入使用的独立单车</p>
          </div>
          <div className="insight-overview-scale-bar-viz">
            <strong className="insight-overview-scale-value">{formatCount(overviewCoverageStats.bikes)}</strong>
            <div className="insight-overview-scale-track">
              <span className="insight-overview-scale-fill insight-overview-scale-fill-bikes" style={{ width: "100%" }} />
            </div>
          </div>
        </div>
      </div>

      <div className="insight-overview-scale-footer">
        <span>车端 / 人端</span>
        <strong>{ratio.toFixed(2)}x</strong>
      </div>
    </article>
  );
}

function OverviewDurationPanel() {
  const item = overviewDurationStat;

  return (
    <article className="insight-overview-metric insight-overview-metric-duration">
      <div className="insight-overview-metric-copy">
        <p className="insight-news-card-label">{item.label}</p>
        <strong className="insight-overview-metric-value">{item.value}</strong>
        <p className="insight-overview-metric-note">{item.note}</p>
      </div>
      <MetricDurationViz
        averageMinutes={item.averageMinutes}
        medianMinutes={item.medianMinutes}
        maxMinutes={item.maxMinutes}
      />
    </article>
  );
}

function InsightNewsShell({
  slug,
  label,
  children,
}: {
  slug: InsightSlug;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="insight-article-shell">
      <div className="insight-article-scroll" data-insight-scroll-slug={slug}>
        <article className="insight-article" data-insight-slug={slug}>
          <header className="insight-news-topbar">
            <div className="insight-news-brandblock">
              <p className="insight-news-kicker">DIG DATA MINING DOSSIER</p>
              <h1 className="insight-news-masthead">{label}</h1>
            </div>
          </header>

          {children}
        </article>
      </div>
    </div>
  );
}

function OverviewArticle({ isActivated }: { isActivated: boolean }) {
  return (
    <InsightNewsShell slug="insight-01" label="项目总览">
      <section className="insight-overview-summary">
        <div className="insight-overview-summary-copy">
          <p className="insight-news-section-tag">Front Page / Summary</p>
          <div className="insight-overview-summary-sentence" aria-label="这是一份关于上海共享单车使用规律的城市短途出行的样本切片">
            <span>这是一份关于上海</span>
            <span>共享单车使用规律的</span>
            <span>城市短途出行的</span>
            <span>样本切片</span>
          </div>
        </div>
        <aside className="insight-overview-summary-points" aria-label="Summary highlights">
          <p className="insight-news-section-tag">Key Traits</p>
          <span>工作日双峰明显</span>
          <span>平均 16.49 分钟</span>
          <span>热点集中在核心城区</span>
        </aside>
        <OverviewBikeFigure play={isActivated} />
      </section>

      <section className="insight-overview-metrics" aria-label="Key metrics">
        <OverviewOrderQualityPanel />
        <OverviewCoveragePanel />
        <OverviewDurationPanel />
      </section>

      <section className="insight-news-two-column">
        <div className="insight-news-column insight-news-story">
          <p className="insight-news-section-tag">Lead Story</p>
          <p className="insight-news-dropcap">
            上海共享单车的使用并不是平均铺开的，而是高度受城市节奏驱动。工作日高峰清晰，骑行时长集中在 5 到 20 分钟，热点区域集中在核心城区，这些特征共同指向一个很明确的结论：共享单车承担的是地铁站、办公区、商业区与居住区之间的短途接驳角色。
          </p>
          <p className="insight-news-body">
            从数据质量看，原始样本为 102,361 条记录，清洗后保留 102,210 条有效订单，仅剔除 151 条异常记录。异常值占比很低，说明这份样本适合被用来讨论真实的城市骑行行为，而不是被噪声牵着走。
          </p>
        </div>

        <aside className="insight-news-column insight-news-signal-strip" aria-label="Fast signals">
          {overviewSignals.map((item) => (
            <div key={item.label} className="insight-news-signal-item">
              <span className="insight-news-card-label">{item.label}</span>
              <strong className="insight-news-signal-value">{item.value}</strong>
              <p className="insight-news-card-copy">{item.note}</p>
            </div>
          ))}
        </aside>
      </section>
    </InsightNewsShell>
  );
}

function getTimeValue(item: TimeDatum, mode: TimeMode) {
  if (mode === "weekday") return item.weekdayAverage;
  if (mode === "weekend") return item.weekendAverage;
  return item.total;
}

function timeHourLabel(hour: number) {
  return `${String(hour).padStart(2, "0")}:00`;
}

function getTimeModePeakHour(mode: TimeMode) {
  return timeHourlyData.reduce((peak, item) => (getTimeValue(item, mode) > getTimeValue(peak, mode) ? item : peak), timeHourlyData[0]).hour;
}

function timeBarGeometry(item: TimeDatum, mode: TimeMode) {
  const values = timeHourlyData.map((datum) => getTimeValue(datum, mode));
  const maxValue = Math.max(...values);
  const chartWidth = TIME_CHART.width - TIME_CHART.left - TIME_CHART.right;
  const chartHeight = TIME_CHART.bottom - TIME_CHART.top;
  const slot = chartWidth / timeHourlyData.length;
  const barWidth = slot * 0.58;
  const value = getTimeValue(item, mode);
  const height = Math.max(5, (value / maxValue) * chartHeight);

  return {
    x: TIME_CHART.left + item.hour * slot + (slot - barWidth) / 2,
    y: TIME_CHART.bottom - height,
    width: barWidth,
    height,
    value,
  };
}

function timeAreaPath(mode: TimeMode) {
  const points = timeHourlyData.map((item) => {
    const geometry = timeBarGeometry(item, mode);
    return {
      x: geometry.x + geometry.width / 2,
      y: geometry.y,
    };
  });
  const line = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const first = points[0];
  const last = points[points.length - 1];

  return `${line} L ${last.x.toFixed(2)} ${TIME_CHART.bottom} L ${first.x.toFixed(2)} ${TIME_CHART.bottom} Z`;
}

function compareLinePath(kind: "weekday" | "weekend") {
  const values = timeHourlyData.map((item) => (kind === "weekday" ? item.weekdayAverage : item.weekendAverage));
  const maxValue = Math.max(
    ...timeHourlyData.map((item) => item.weekdayAverage),
    ...timeHourlyData.map((item) => item.weekendAverage),
  );
  const chartWidth = TIME_COMPARE.width - TIME_COMPARE.left - TIME_COMPARE.right;
  const chartHeight = TIME_COMPARE.bottom - TIME_COMPARE.top;

  return values
    .map((value, index) => {
      const x = TIME_COMPARE.left + (index / (values.length - 1)) * chartWidth;
      const y = TIME_COMPARE.bottom - (value / maxValue) * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");
}

function durationFormatCount(value: number) {
  return numberFormatter.format(value);
}

function durationDatumActive(item: DurationDatum, mode: DurationMode) {
  if (mode === "all") return true;
  if (mode === "core") return item.group === "core";
  return item.group === "tail";
}

function durationDatumGeometry(item: DurationDatum) {
  const chartWidth = DURATION_CHART.width - DURATION_CHART.left - DURATION_CHART.right;
  const chartHeight = DURATION_CHART.bottom - DURATION_CHART.top;
  const minuteAreaWidth = chartWidth * 0.73;
  const tailAreaWidth = chartWidth - minuteAreaWidth - 26;
  const maxValue = Math.max(...durationDistributionData.map((datum) => datum.count));

  if (item.kind === "minute") {
    const slot = minuteAreaWidth / durationMinuteCounts.length;
    const width = slot * 0.68;
    const x = DURATION_CHART.left + (item.start - 1) * slot + (slot - width) / 2;
    const height = Math.max(5, (item.count / maxValue) * chartHeight);
    return { x, y: DURATION_CHART.bottom - height, width, height };
  }

  const tailItems = durationDistributionData.filter((datum) => datum.kind === "tail");
  const tailIndex = tailItems.findIndex((datum) => datum.id === item.id);
  const slot = tailAreaWidth / tailItems.length;
  const width = slot * 0.62;
  const x = DURATION_CHART.left + minuteAreaWidth + 26 + tailIndex * slot + (slot - width) / 2;
  const height = Math.max(5, (item.count / maxValue) * chartHeight);
  return { x, y: DURATION_CHART.bottom - height, width, height };
}

function durationPositionForMinute(minute: number) {
  const chartWidth = DURATION_CHART.width - DURATION_CHART.left - DURATION_CHART.right;
  const minuteAreaWidth = chartWidth * 0.73;
  const slot = minuteAreaWidth / durationMinuteCounts.length;
  return DURATION_CHART.left + (minute - 0.5) * slot;
}

function durationYForCount(count: number) {
  const maxValue = Math.max(...durationDistributionData.map((datum) => datum.count));
  const chartHeight = DURATION_CHART.bottom - DURATION_CHART.top;
  return DURATION_CHART.bottom - (count / maxValue) * chartHeight;
}

function durationAreaPath() {
  const minutePoints = durationDistributionData
    .filter((item) => item.kind === "minute")
    .map((item) => {
      const geometry = durationDatumGeometry(item);
      return { x: geometry.x + geometry.width / 2, y: geometry.y };
    });
  const first = minutePoints[0];
  const last = minutePoints[minutePoints.length - 1];
  const line = minutePoints.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  return `${line} L ${last.x.toFixed(2)} ${DURATION_CHART.bottom} L ${first.x.toFixed(2)} ${DURATION_CHART.bottom} Z`;
}

function durationLinePath() {
  return durationDistributionData
    .filter((item) => item.kind === "minute")
    .map((item, index) => {
      const geometry = durationDatumGeometry(item);
      const x = geometry.x + geometry.width / 2;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${geometry.y.toFixed(2)}`;
    })
    .join(" ");
}

function durationFocusLabel(focusKey: DurationFocusKey) {
  if (focusKey === "marker:median") return "中位数 11min：半数骑行在这里之前完成";
  if (focusKey === "marker:mean") return "均值 16.49min：右侧长尾把平均值向后拉";
  if (focusKey === "marker:iqr") return "四分位区间 7-20min：中间 50% 的订单落在这里";
  const id = focusKey.replace("bin:", "");
  const item = durationDistributionData.find((datum) => datum.id === id);
  if (!item) return durationModes.all.summary;
  return `${item.label}：${durationFormatCount(item.count)} 单，占 ${item.percent.toFixed(2)}%`;
}

function setInsightMotionReady(root: HTMLElement, ready: boolean) {
  root.dataset.motionReady = ready ? "true" : "false";
  root.closest<HTMLElement>(".insight-article")?.setAttribute("data-article-ready", ready ? "true" : "false");
}

function TimePatternArticle({ isActivated }: { isActivated: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<TimeMode>("all");
  const [hoveredHour, setHoveredHour] = useState<number | null>(18);
  const [lockedHour, setLockedHour] = useState<number | null>(18);
  const reduceMotionRef = useRef(false);

  const modePeakHour = getTimeModePeakHour(mode);
  const activeHour = lockedHour ?? hoveredHour ?? modePeakHour;
  const activeDatum = timeHourlyData[activeHour];
  const activeGeometry = timeBarGeometry(activeDatum, mode);
  const activeValue = getTimeValue(activeDatum, mode);
  const activeUnit = timeModes[mode].unit;

  const animateToMode = useCallback((nextMode: TimeMode, immediate = false) => {
    const root = rootRef.current;
    if (!root) return;

    const bars = Array.from(root.querySelectorAll<SVGRectElement>("[data-time-bar]"));
    const area = root.querySelector<SVGPathElement>("[data-time-area]");
    const callout = root.querySelector<HTMLElement>("[data-time-callout]");
    const chrome = root.querySelectorAll<HTMLElement>("[data-time-chrome]");
    const shouldJump = immediate || reduceMotionRef.current;

    bars.forEach((bar, index) => {
      const geometry = timeBarGeometry(timeHourlyData[index], nextMode);
      gsap.to(bar, {
        attr: {
          x: geometry.x,
          y: geometry.y,
          width: geometry.width,
          height: geometry.height,
        },
        duration: shouldJump ? 0 : 0.62,
        ease: "power3.inOut",
        overwrite: "auto",
      });
    });

    if (area) {
      gsap.to(area, {
        attr: { d: timeAreaPath(nextMode) },
        duration: shouldJump ? 0 : 0.62,
        ease: "power3.inOut",
        overwrite: "auto",
      });
    }

    if (callout && !shouldJump) {
      gsap.fromTo(
        callout,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out", overwrite: "auto", immediateRender: false },
      );
    }

    if (chrome.length && !shouldJump) {
      gsap.to(chrome, { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out", overwrite: "auto" });
    }
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      setInsightMotionReady(root, false);
      reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const bars = root.querySelectorAll<SVGRectElement>("[data-time-bar]");
      const area = root.querySelector<SVGPathElement>("[data-time-area]");
      const panels = root.querySelectorAll<HTMLElement>("[data-time-panel]");
      const marks = root.querySelectorAll<HTMLElement>("[data-time-mark]");
      const callout = root.querySelector<HTMLElement>("[data-time-callout]");
      const chrome = root.querySelectorAll<HTMLElement>("[data-time-chrome]");

      if (!isActivated) {
        return;
      }

      animateToMode("all", true);

      if (reduceMotionRef.current) {
        gsap.set([bars, area, panels, marks, callout, chrome], { autoAlpha: 1, y: 0, scaleY: 1 });
        setInsightMotionReady(root, true);
        return;
      }

      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      gsap.set([chrome, callout], { autoAlpha: 0, y: 8 });
      gsap.set(area, { autoAlpha: 0 });
      gsap.set(bars, { scaleY: 0, transformOrigin: "50% 100%", autoAlpha: 0 });
      gsap.set(panels, { autoAlpha: 0, y: 14 });
      gsap.set(marks, { autoAlpha: 0, y: 8 });
      setInsightMotionReady(root, true);

      tl.to(area, { autoAlpha: 1, duration: 0.36, ease: "power2.out" }, 0);
      tl.to(bars, { scaleY: 1, autoAlpha: 1, duration: 0.58, ease: "power3.out", stagger: 0.018 }, 0.08);
      tl.to(chrome, { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out", stagger: 0.018 }, 0.18);
      tl.to(panels, { autoAlpha: 1, y: 0, duration: 0.34, ease: "power2.out", stagger: 0.05 }, 0.24);
      tl.to(callout, { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out" }, 0.34);
      tl.to(marks, { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out", stagger: 0.06 }, 0.52);

      return () => tl.kill();
    }, root);

    return () => ctx.revert();
  }, [animateToMode, isActivated]);

  useEffect(() => {
    if (isActivated) {
      setMode("all");
      setHoveredHour(18);
      setLockedHour(18);
    }
  }, [isActivated]);

  const changeMode = (nextMode: TimeMode) => {
    if (nextMode === mode) return;
    const nextPeakHour = getTimeModePeakHour(nextMode);
    setMode(nextMode);
    setHoveredHour(nextPeakHour);
    setLockedHour(nextPeakHour);
    animateToMode(nextMode);
  };

  return (
    <InsightNewsShell slug="insight-03" label="时间规律">
      <div ref={rootRef} className="insight-time-shell" data-time-mode={mode}>
        <section className="insight-time-board" aria-label="小时级订单量时间控制台">
          <div className="insight-time-main">
            <div className="insight-time-toolbar">
              <div>
                <p className="insight-news-section-tag">Question</p>
                <h2>什么时候骑得最多？</h2>
              </div>
              <div className="insight-time-mode-tabs" aria-label="切换时间筛选">
                {(Object.keys(timeModes) as TimeMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={item === mode ? "is-active" : undefined}
                    onClick={() => changeMode(item)}
                    aria-pressed={item === mode}
                  >
                    {timeModes[item].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="insight-time-chart-wrap">
              <svg
                className="insight-time-chart"
                viewBox={`0 0 ${TIME_CHART.width} ${TIME_CHART.height}`}
                role="img"
                aria-label="2016 年 8 月上海摩拜单车 24 小时订单量曲线"
              >
                <defs>
                  <linearGradient id="time-area-gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(229, 190, 98, 0.4)" />
                    <stop offset="58%" stopColor="rgba(50, 221, 211, 0.13)" />
                    <stop offset="100%" stopColor="rgba(50, 221, 211, 0)" />
                  </linearGradient>
                </defs>

                {timeBands.map((band) => {
                  const start = timeBarGeometry(timeHourlyData[band.start], mode);
                  const end = timeBarGeometry(timeHourlyData[band.end], mode);
                  const x = start.x - 6;
                  const width = end.x + end.width - x + 6;
                  return (
                    <g key={band.label} className={`insight-time-band insight-time-band--${band.className}`} data-time-chrome="true">
                      <rect x={x} y={TIME_CHART.top} width={width} height={TIME_CHART.bottom - TIME_CHART.top} />
                      <text x={x + 10} y={TIME_CHART.top + 18}>{band.label}</text>
                    </g>
                  );
                })}

                <path className="insight-time-area" data-time-area="true" d={timeAreaPath(mode)} />
                <line className="insight-time-axis" data-time-chrome="true" x1={TIME_CHART.left} x2={TIME_CHART.width - TIME_CHART.right} y1={TIME_CHART.bottom} y2={TIME_CHART.bottom} />

                {timeHourlyData.map((item) => {
                  const geometry = timeBarGeometry(item, mode);
                  const isActive = item.hour === activeHour;
                  const isPeak = item.hour === 8 || item.hour === 18 || (mode === "weekend" && item.hour === modePeakHour);
                  return (
                    <g key={item.hour} className="insight-time-bar-group">
                      <rect
                        className={`insight-time-hit ${isActive ? "is-active" : ""}`}
                        x={geometry.x - 7}
                        y={TIME_CHART.top}
                        width={geometry.width + 14}
                        height={TIME_CHART.bottom - TIME_CHART.top}
                        tabIndex={0}
                        role="button"
                        aria-label={`${timeHourLabel(item.hour)} ${Math.round(getTimeValue(item, mode)).toLocaleString()} ${activeUnit}`}
                        onMouseEnter={() => setHoveredHour(item.hour)}
                        onMouseLeave={() => setHoveredHour(null)}
                        onFocus={() => setHoveredHour(item.hour)}
                        onBlur={() => setHoveredHour(null)}
                        onClick={() => setLockedHour(lockedHour === item.hour ? null : item.hour)}
                      />
                      <rect
                        className={`insight-time-bar ${isActive ? "is-active" : ""} ${isPeak ? "is-peak" : ""}`}
                        data-time-bar="true"
                        x={geometry.x}
                        y={geometry.y}
                        width={geometry.width}
                        height={geometry.height}
                        rx="3"
                      />
                      {(item.hour % 3 === 0 || isPeak) ? (
                        <text className={`insight-time-hour ${isPeak ? "is-peak" : ""}`} data-time-chrome="true" x={geometry.x + geometry.width / 2} y={TIME_CHART.bottom + 26}>
                          {String(item.hour).padStart(2, "0")}
                        </text>
                      ) : null}
                    </g>
                  );
                })}

                <g className="insight-time-cursor" data-time-chrome="true" transform={`translate(${activeGeometry.x + activeGeometry.width / 2} 0)`}>
                  <line y1={TIME_CHART.top - 2} y2={TIME_CHART.bottom} />
                  <circle cy={activeGeometry.y} r="5" />
                </g>
              </svg>

              <div
                className="insight-time-tooltip"
                data-time-callout="true"
              >
                <span>{timeHourLabel(activeHour)}</span>
                <strong>{Math.round(activeValue).toLocaleString()} {activeUnit}</strong>
                <em>
                  {activeHour === modePeakHour
                    ? mode === "weekend" ? "周末最高点，19:00 略高于 18:00" : "当前视角最高点"
                    : activeHour === 8 ? "早高峰，上班接驳" : timeModes[mode].summary}
                </em>
              </div>
            </div>

            <div className="insight-time-peak-row">
              {(mode === "weekend"
                ? [
                    timePeakButtons[0],
                    { hour: 19, label: "周末峰值", value: "19:00 / 2,217", note: "周末最高，略高于 18:00" },
                  ]
                : timePeakButtons
              ).map((peak) => (
                <button
                  key={peak.hour}
                  type="button"
                  className={lockedHour === peak.hour ? "is-active" : undefined}
                  onClick={() => {
                    setLockedHour(lockedHour === peak.hour ? null : peak.hour);
                    setHoveredHour(peak.hour);
                  }}
                  data-time-mark="true"
                >
                  <span>{peak.label}</span>
                  <strong>{peak.value}</strong>
                  <em>{peak.note}</em>
                </button>
              ))}
            </div>
          </div>

          <aside className="insight-time-side" aria-label="时间规律关键事实">
            {timeFactPanels.map((item) => (
              <article key={item.label} className="insight-time-fact" data-time-panel="true">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
            <div className="insight-time-summary" data-time-panel="true">
              <p className="insight-news-section-tag">Pattern</p>
              <p>{timeModes[mode].summary}</p>
              <span>数据窗口：2016.08.01 - 2016.08.31</span>
            </div>
          </aside>
        </section>

        <section className="insight-time-compare" aria-label="工作日与周末归一化小时曲线">
          <div className="insight-time-compare-copy">
            <p className="insight-news-section-tag">Weekday vs Weekend</p>
            <strong>工作日尖峰，周末平峰</strong>
            <span>按天数归一化后，工作日早晚高峰更尖锐；周末从午后到夜间延展更长。</span>
          </div>
          <svg className="insight-time-mini-chart" viewBox={`0 0 ${TIME_COMPARE.width} ${TIME_COMPARE.height}`} aria-hidden="true">
            <path className="insight-time-mini-grid" data-time-chrome="true" d={`M ${TIME_COMPARE.left} ${TIME_COMPARE.bottom} H ${TIME_COMPARE.width - TIME_COMPARE.right}`} />
            <path className="insight-time-mini-line insight-time-mini-line--weekday" data-time-chrome="true" d={compareLinePath("weekday")} />
            <path className="insight-time-mini-line insight-time-mini-line--weekend" data-time-chrome="true" d={compareLinePath("weekend")} />
          </svg>
          <div className="insight-time-legend" data-time-chrome="true">
            <span><i className="weekday" />工作日</span>
            <span><i className="weekend" />周末</span>
          </div>
        </section>
      </div>
    </InsightNewsShell>
  );
}

function DurationArticle({ isActivated }: { isActivated: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<DurationMode>("all");
  const [hoveredKey, setHoveredKey] = useState<DurationFocusKey | null>("marker:median");
  const [lockedKey, setLockedKey] = useState<DurationFocusKey | null>("marker:median");
  const reduceMotionRef = useRef(false);

  const activeKey = lockedKey ?? hoveredKey ?? "marker:median";

  const animateToMode = useCallback((nextMode: DurationMode, immediate = false) => {
    const root = rootRef.current;
    if (!root) return;

    const bars = Array.from(root.querySelectorAll<SVGRectElement>("[data-duration-bar]"));
    const area = root.querySelector<SVGPathElement>("[data-duration-area]");
    const areaLine = root.querySelector<SVGPathElement>("[data-duration-area-line]");
    const panels = root.querySelectorAll<HTMLElement>("[data-duration-panel]");
    const shouldJump = immediate || reduceMotionRef.current;

    bars.forEach((bar, index) => {
      const datum = durationDistributionData[index];
      const active = durationDatumActive(datum, nextMode);
      gsap.to(bar, {
        autoAlpha: active ? 1 : 0.28,
        attr: { y: durationDatumGeometry(datum).y, height: durationDatumGeometry(datum).height },
        duration: shouldJump ? 0 : 0.48,
        ease: "power3.inOut",
        overwrite: "auto",
      });
    });

    if (area) {
      gsap.to(area, {
        autoAlpha: nextMode === "tail" ? 0.18 : 0.86,
        duration: shouldJump ? 0 : 0.42,
        ease: "power2.out",
        overwrite: "auto",
      });
    }

    if (areaLine) {
      gsap.to(areaLine, {
        autoAlpha: nextMode === "tail" ? 0.4 : 1,
        duration: shouldJump ? 0 : 0.42,
        ease: "power2.out",
        overwrite: "auto",
      });
    }

    if (!shouldJump && panels.length) {
      gsap.fromTo(
        panels,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.24, ease: "power2.out", stagger: 0.025, overwrite: "auto", immediateRender: false },
      );
    }
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      setInsightMotionReady(root, false);
      reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const bars = root.querySelectorAll<SVGRectElement>("[data-duration-bar]");
      const area = root.querySelector<SVGPathElement>("[data-duration-area]");
      const areaLine = root.querySelector<SVGPathElement>("[data-duration-area-line]");
      const markers = root.querySelectorAll<HTMLElement>("[data-duration-marker]");
      const panels = root.querySelectorAll<HTMLElement>("[data-duration-panel]");
      const chartChrome = root.querySelectorAll<HTMLElement>("[data-duration-chrome]");

      if (!isActivated) {
        return;
      }

      animateToMode("all", true);

      if (reduceMotionRef.current) {
        gsap.set([bars, area, areaLine, markers, panels, chartChrome], { autoAlpha: 1, y: 0, scaleY: 1 });
        setInsightMotionReady(root, true);
        return;
      }

      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      gsap.set([chartChrome, panels], { autoAlpha: 0, y: 10 });
      gsap.set(markers, { autoAlpha: 0, y: 10 });
      gsap.set(area, { autoAlpha: 0 });
      gsap.set(areaLine, { autoAlpha: 0 });
      gsap.set(bars, { scaleY: 0, autoAlpha: 0, transformOrigin: "50% 100%" });
      setInsightMotionReady(root, true);

      tl.to(area, { autoAlpha: 0.86, duration: 0.34, ease: "power2.out" }, 0);
      tl.to(areaLine, { autoAlpha: 1, duration: 0.36, ease: "power2.out" }, 0.1);
      tl.to(bars, { scaleY: 1, autoAlpha: 1, duration: 0.54, ease: "power3.out", stagger: 0.012 }, 0.06);
      tl.to(chartChrome, { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out", stagger: 0.018 }, 0.18);
      tl.to(markers, { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out", stagger: 0.04 }, 0.34);
      tl.to(panels, { autoAlpha: 1, y: 0, duration: 0.3, ease: "power2.out", stagger: 0.04 }, 0.42);

      return () => tl.kill();
    }, root);

    return () => ctx.revert();
  }, [animateToMode, isActivated]);

  useEffect(() => {
    if (isActivated) {
      setMode("all");
      setHoveredKey("marker:median");
      setLockedKey("marker:median");
    }
  }, [isActivated]);

  const changeMode = (nextMode: DurationMode) => {
    if (nextMode === mode) return;
    setMode(nextMode);
    setLockedKey(nextMode === "core" ? "marker:iqr" : nextMode === "tail" ? "bin:t-60-90" : "marker:median");
    animateToMode(nextMode);
  };

  const toggleMarker = (key: DurationFocusKey) => {
    setLockedKey(lockedKey === key ? null : key);
    setHoveredKey(key);
  };

  const iqrX = durationPositionForMinute(durationStats.q1);
  const iqrWidth = durationPositionForMinute(durationStats.q3) - iqrX;
  const meanX = durationPositionForMinute(durationStats.mean);
  const medianX = durationPositionForMinute(durationStats.median);

  return (
    <InsightNewsShell slug="insight-04" label="骑行时长">
      <div ref={rootRef} className="insight-duration-shell" data-duration-mode={mode}>
        <section className="insight-duration-board" aria-label="骑行时长分布剖面仪表盘">
          <div className="insight-duration-main">
            <div className="insight-duration-toolbar">
              <div>
                <p className="insight-news-section-tag">Question</p>
                <h2>共享单车是不是短途接驳工具？</h2>
              </div>
              <div className="insight-duration-mode-tabs" aria-label="切换骑行时长视角">
                {(Object.keys(durationModes) as DurationMode[]).map((item) => (
                  <button key={item} type="button" className={item === mode ? "is-active" : undefined} onClick={() => changeMode(item)} aria-pressed={item === mode}>
                    {durationModes[item].label}
                  </button>
                ))}
              </div>
            </div>

            <div className="insight-duration-chart-wrap">
              <svg
                className="insight-duration-chart"
                viewBox={`0 0 ${DURATION_CHART.width} ${DURATION_CHART.height}`}
                role="img"
                aria-label="2016 年 8 月上海摩拜单车骑行时长分布，5 到 20 分钟占 66.49%"
              >
                <defs>
                  <linearGradient id="duration-area-gradient" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(72, 214, 255, 0.36)" />
                    <stop offset="62%" stopColor="rgba(229, 190, 98, 0.16)" />
                    <stop offset="100%" stopColor="rgba(229, 190, 98, 0)" />
                  </linearGradient>
                </defs>

                <g className="insight-duration-grid" data-duration-chrome="true" aria-hidden="true">
                  {durationYAxisTicks.map((tick) => {
                    const y = durationYForCount(tick);
                    return (
                      <g key={tick}>
                        <line x1={DURATION_CHART.left} x2={DURATION_CHART.width - DURATION_CHART.right} y1={y} y2={y} />
                        <text x={DURATION_CHART.left - 12} y={y + 4}>{tick === 0 ? "0" : `${tick / 1000}k`}</text>
                      </g>
                    );
                  })}
                  {durationXAxisTicks.map((tick) => {
                    const x = durationPositionForMinute(tick);
                    return <line key={tick} className="insight-duration-grid-vertical" x1={x} x2={x} y1={DURATION_CHART.top} y2={DURATION_CHART.bottom} />;
                  })}
                </g>

                <rect className="insight-duration-iqr-band" data-duration-chrome="true" x={iqrX} y={DURATION_CHART.top} width={iqrWidth} height={DURATION_CHART.bottom - DURATION_CHART.top} />
                <text className="insight-duration-band-label" data-duration-chrome="true" x={iqrX + 12} y={DURATION_CHART.top + 18}>Q1-Q3 7-20min</text>
                <path className="insight-duration-area" data-duration-area="true" d={durationAreaPath()} />
                <path className="insight-duration-line" data-duration-area-line="true" d={durationLinePath()} />
                <line className="insight-duration-axis" data-duration-chrome="true" x1={DURATION_CHART.left} x2={DURATION_CHART.width - DURATION_CHART.right} y1={DURATION_CHART.bottom} y2={DURATION_CHART.bottom} />
                <line className="insight-duration-axis" data-duration-chrome="true" x1={DURATION_CHART.left} x2={DURATION_CHART.left} y1={DURATION_CHART.top} y2={DURATION_CHART.bottom} />
                <line className="insight-duration-tail-break" data-duration-chrome="true" x1={DURATION_CHART.left + (DURATION_CHART.width - DURATION_CHART.left - DURATION_CHART.right) * 0.73 + 13} x2={DURATION_CHART.left + (DURATION_CHART.width - DURATION_CHART.left - DURATION_CHART.right) * 0.73 + 13} y1={DURATION_CHART.top} y2={DURATION_CHART.bottom} />
                <text className="insight-duration-axis-label" data-duration-chrome="true" x={DURATION_CHART.left + 8} y={DURATION_CHART.top - 13}>订单数</text>
                <text className="insight-duration-axis-label insight-duration-axis-label--x" data-duration-chrome="true" x={(DURATION_CHART.left + DURATION_CHART.width - DURATION_CHART.right) / 2} y={DURATION_CHART.height - 8}>骑行时长（分钟 / 压缩长尾区间）</text>

                {durationDistributionData.map((item) => {
                  const geometry = durationDatumGeometry(item);
                  const key: DurationFocusKey = `bin:${item.id}`;
                  const isActive = activeKey === key;
                  return (
                    <g key={item.id} className="insight-duration-bar-group">
                      <rect
                        className="insight-duration-hit"
                        x={geometry.x - 5}
                        y={DURATION_CHART.top}
                        width={geometry.width + 10}
                        height={DURATION_CHART.bottom - DURATION_CHART.top}
                        tabIndex={0}
                        role="button"
                        aria-label={`${item.label} ${durationFormatCount(item.count)} 单，占 ${item.percent.toFixed(2)}%`}
                        onMouseEnter={() => setHoveredKey(key)}
                        onMouseLeave={() => setHoveredKey(null)}
                        onFocus={() => setHoveredKey(key)}
                        onBlur={() => setHoveredKey(null)}
                        onClick={() => toggleMarker(key)}
                      />
                      <rect
                        className={`insight-duration-bar insight-duration-bar--${item.group} ${isActive ? "is-active" : ""}`}
                        data-duration-bar="true"
                        x={geometry.x}
                        y={geometry.y}
                        width={geometry.width}
                        height={geometry.height}
                        rx="3"
                      />
                      {(item.start === 5 || item.start === 10 || item.start === 15 || item.start === 20 || item.start === 30 || item.start === 60 || item.start === 120) ? (
                        <text className="insight-duration-tick" data-duration-chrome="true" x={geometry.x + geometry.width / 2} y={DURATION_CHART.bottom + 25}>{item.label}</text>
                      ) : null}
                    </g>
                  );
                })}

                <g className="insight-duration-marker" data-duration-marker="true" transform={`translate(${medianX} 0)`}>
                  <line y1={DURATION_CHART.top - 4} y2={DURATION_CHART.bottom} />
                  <text y={DURATION_CHART.top - 12}>中位数 11min</text>
                </g>
                <g className="insight-duration-marker insight-duration-marker--mean" data-duration-marker="true" transform={`translate(${meanX} 0)`}>
                  <line y1={DURATION_CHART.top - 4} y2={DURATION_CHART.bottom} />
                  <text y={DURATION_CHART.top - 12}>均值 16.49min</text>
                </g>
              </svg>

              <div
                className={`insight-duration-tooltip insight-duration-tooltip--${mode}`}
                data-duration-panel="true"
              >
                <span>{lockedKey ? "Locked Focus" : "Hover Focus"}</span>
                <strong>{durationFocusLabel(activeKey)}</strong>
                <em>{durationModes[mode].summary}</em>
              </div>
            </div>

            <div className="insight-duration-marker-row" data-duration-marker="true">
              <button type="button" className={lockedKey === "marker:median" ? "is-active" : undefined} onClick={() => toggleMarker("marker:median")}>
                <span>Median</span><strong>11min</strong><em>半数订单不超过 11 分钟</em>
              </button>
              <button type="button" className={lockedKey === "marker:mean" ? "is-active" : undefined} onClick={() => toggleMarker("marker:mean")}>
                <span>Mean</span><strong>16.49min</strong><em>长尾把均值拉到中位数右侧</em>
              </button>
              <button type="button" className={lockedKey === "marker:iqr" ? "is-active" : undefined} onClick={() => toggleMarker("marker:iqr")}>
                <span>Q1-Q3</span><strong>7-20min</strong><em>中间 50% 的真实骑行区间</em>
              </button>
            </div>
          </div>

          <aside className="insight-duration-side" aria-label="骑行时长关键事实">
            {durationFactPanels.map((item) => (
              <article key={item.label} className="insight-duration-fact" data-duration-panel="true">
                <span>{item.label}</span>
                <strong>{item.value}</strong>
                <p>{item.note}</p>
              </article>
            ))}
            <div className="insight-duration-summary" data-duration-panel="true">
              <p className="insight-news-section-tag">Pattern</p>
              <p>{durationModes[mode].summary}</p>
              <span>数据窗口：2016.08.01 - 2016.08.31</span>
            </div>
          </aside>
        </section>

        <section className="insight-duration-segments" aria-label="骑行时长分段占比">
          <div className="insight-duration-segment-copy">
            <p className="insight-news-section-tag">Composition</p>
            <strong>短途核心占据主体，长尾只是少数</strong>
            <span>5-20 分钟为主要使用场景；超过 60 分钟的骑行只占 2.53%。</span>
          </div>
          <div className="insight-duration-stack" data-duration-panel="true">
            {durationSegmentBars.map((item) => (
              <button
                key={item.label}
                type="button"
                className={`insight-duration-stack-segment insight-duration-stack-segment--${item.group}`}
                style={{ flexGrow: item.percent }}
                onMouseEnter={() => setHoveredKey(item.focusKey as DurationFocusKey)}
                onFocus={() => setHoveredKey(item.focusKey as DurationFocusKey)}
                onMouseLeave={() => setHoveredKey(null)}
                onBlur={() => setHoveredKey(null)}
                aria-label={`${item.label} 分钟区间 ${durationFormatCount(item.count)} 单，占 ${item.percent.toFixed(2)}%`}
              >
                <span>{item.label}</span>
                <strong>{item.percent.toFixed(1)}%</strong>
              </button>
            ))}
          </div>
        </section>
      </div>
    </InsightNewsShell>
  );
}

function SpatialHotspotArticle({ isActivated }: { isActivated: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const globalPreviewTimelineRef = useRef<ReturnType<typeof gsap.timeline> | null>(null);
  const globalPreviewTimeoutRef = useRef<number | null>(null);
  const [hoveredId, setHoveredId] = useState<SpatialHotspotId | null>(null);
  const [isGlobalPreviewing, setIsGlobalPreviewing] = useState(false);
  const reduceMotionRef = useRef(false);

  const activeId = hoveredId;
  const activeHotspot = activeId ? spatialHotspots.find((hotspot) => hotspot.id === activeId) ?? null : null;
  const isOverviewMode = activeHotspot === null;
  const activePoint = activeHotspot ? projectShanghaiPoint(activeHotspot.lng, activeHotspot.lat) : null;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      setInsightMotionReady(root, false);
      reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const boundaryPaths = root.querySelectorAll<SVGPathElement>("[data-spatial-boundary-path]");
      const landPaths = root.querySelectorAll<SVGPathElement>("[data-spatial-land-path]");
      const dots = root.querySelectorAll<SVGCircleElement>("[data-spatial-dot]");
      const hotspots = root.querySelectorAll<SVGGElement>("[data-spatial-hotspot]");
      const panels = root.querySelectorAll<HTMLElement>("[data-spatial-panel]");
      const labels = root.querySelectorAll<SVGTextElement>("[data-spatial-label]");
      const waterLabels = root.querySelectorAll<SVGTextElement>("[data-spatial-water-label]");
      const viewport = viewportRef.current;

      if (!isActivated) {
        return;
      }

      if (viewport) {
        gsap.set(viewport, { attr: { transform: spatialMapTransformValue } });
      }

      if (reduceMotionRef.current) {
        gsap.set([boundaryPaths, landPaths, dots, hotspots, panels, labels, waterLabels], { autoAlpha: 1, y: 0, scale: 1 });
        setInsightMotionReady(root, true);
        return;
      }

      boundaryPaths.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, autoAlpha: 1 });
      });
      gsap.set(landPaths, { autoAlpha: 0 });
      gsap.set(dots, { autoAlpha: 0, scale: 0.25, transformOrigin: "50% 50%" });
      gsap.set(hotspots, { autoAlpha: 0, scale: 0.68, transformOrigin: "50% 50%" });
      gsap.set(labels, { autoAlpha: 0, y: 6 });
      gsap.set(waterLabels, { autoAlpha: 0, y: 5 });
      gsap.set(panels, { autoAlpha: 0, y: 12 });
      setInsightMotionReady(root, true);

      const tl = gsap.timeline({ defaults: { overwrite: "auto" } });
      tl.to(landPaths, { autoAlpha: 1, duration: 0.38, ease: "power2.out" }, 0.02);
      tl.to(boundaryPaths, { strokeDashoffset: 0, duration: 0.95, ease: LOGO_DRAW_EASE, stagger: 0.012 }, 0);
      tl.to(waterLabels, { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out" }, 0.34);
      tl.to(dots, { autoAlpha: 1, scale: 1, duration: 0.56, ease: "power2.out", stagger: { each: 0.004, from: "center" } }, 0.28);
      tl.to(hotspots, { autoAlpha: 1, scale: 1, duration: 0.42, ease: "back.out(1.7)", stagger: 0.045 }, 0.5);
      tl.to(labels, { autoAlpha: 1, y: 0, duration: 0.28, ease: "power2.out", stagger: 0.035 }, 0.66);
      tl.to(panels, { autoAlpha: 1, y: 0, duration: 0.32, ease: "power2.out", stagger: 0.04 }, 0.7);

      return () => tl.kill();
    }, root);

    return () => ctx.revert();
  }, [isActivated]);

  useEffect(() => {
    if (isActivated) {
      setHoveredId(null);
    }
  }, [isActivated]);

  useEffect(() => {
    return () => {
      globalPreviewTimelineRef.current?.kill();
      if (globalPreviewTimeoutRef.current !== null) {
        window.clearTimeout(globalPreviewTimeoutRef.current);
      }
    };
  }, []);

  const focusHotspot = (id: SpatialHotspotId) => {
    setHoveredId(id);
  };

  const releaseHover = () => {
    setHoveredId(null);
  };

  const showGlobalPreview = () => {
    const viewport = viewportRef.current;
    if (!viewport || isGlobalPreviewing) return;

    globalPreviewTimelineRef.current?.kill();
    if (globalPreviewTimeoutRef.current !== null) {
      window.clearTimeout(globalPreviewTimeoutRef.current);
      globalPreviewTimeoutRef.current = null;
    }

    setIsGlobalPreviewing(true);

    if (reduceMotionRef.current) {
      gsap.set(viewport, { attr: { transform: spatialGlobalMapTransformValue } });
      globalPreviewTimeoutRef.current = window.setTimeout(() => {
        gsap.set(viewport, { attr: { transform: spatialMapTransformValue } });
        setIsGlobalPreviewing(false);
        globalPreviewTimeoutRef.current = null;
      }, 1000);
      return;
    }

    globalPreviewTimelineRef.current = gsap
      .timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          setIsGlobalPreviewing(false);
          globalPreviewTimelineRef.current = null;
        },
      })
      .to(viewport, { attr: { transform: spatialGlobalMapTransformValue }, duration: 0.5, ease: "power3.inOut" })
      .to(viewport, { duration: 1 })
      .to(viewport, { attr: { transform: spatialMapTransformValue }, duration: 0.5, ease: "power3.inOut" });
  };

  return (
    <InsightNewsShell slug="insight-05" label="空间热点聚类">
      <div
        ref={rootRef}
        className="insight-spatial-shell"
        data-active-hotspot={activeId ?? "all"}
        data-motion-ready="false"
      >
        <section className="insight-spatial-board" aria-label="上海市摩拜骑行空间热点聚类">
          <div className="insight-spatial-map-panel" data-spatial-panel="true">
            <div className="insight-spatial-toolbar">
              <div>
                <p className="insight-news-section-tag">Shanghai Hotspots</p>
                <h2>真实边界上的六簇空间密度</h2>
              </div>
              <div className="insight-spatial-toolbar-actions" data-spatial-panel="true">
                <button
                  type="button"
                  className="insight-spatial-global-button"
                  onClick={showGlobalPreview}
                  disabled={isGlobalPreviewing}
                  aria-label="短暂展示上海全貌后回到中心热点视图"
                >
                  展示全局
                </button>
                <div className="insight-spatial-metrics" aria-label="空间聚类概览">
                  <span>
                    <strong>K=6</strong>
                    <em>KMeans 聚类</em>
                  </span>
                  <span>
                    <strong>{formatCount(spatialHotspotTotal)}</strong>
                    <em>有效订单</em>
                  </span>
                  <span>
                    <strong>{spatialTopThreeShare.toFixed(1)}%</strong>
                    <em>Top 3 占比</em>
                  </span>
                </div>
              </div>
            </div>

            <div className="insight-spatial-map-wrap">
              <svg
                className="insight-spatial-map"
                viewBox={`0 0 ${SHANGHAI_MAP_VIEWBOX.width} ${SHANGHAI_MAP_VIEWBOX.height}`}
                role="img"
                aria-label="上海市行政区边界与摩拜起点空间热点聚类图"
              >
                <defs>
                  <radialGradient id="spatial-hotspot-gradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fff0df" stopOpacity="0.98" />
                    <stop offset="28%" stopColor="#ff654f" stopOpacity="0.66" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
                  </radialGradient>
                </defs>

                <g ref={viewportRef} className="insight-spatial-viewport" transform={spatialMapTransformValue}>
                  <g className="insight-spatial-land-fill" aria-hidden="true">
                    {shanghaiMapRegions.map((region) => (
                      <path
                        key={`land-${region.adcode}`}
                        className="insight-spatial-land"
                        data-spatial-land-path="true"
                        d={region.path}
                      />
                    ))}
                  </g>

                  <g className="insight-spatial-districts" aria-hidden="true">
                    {shanghaiMapRegions.map((region) => (
                      <path
                        key={region.adcode}
                        className="insight-spatial-district"
                        data-spatial-boundary-path="true"
                        d={region.path}
                      />
                    ))}
                  </g>

                  <g className="insight-spatial-water-labels" aria-hidden="true">
                    <text
                      x={projectShanghaiPoint(121.61, 31.39).x}
                      y={projectShanghaiPoint(121.61, 31.39).y}
                      data-spatial-water-label="true"
                      style={{ fontSize: `${16.5 * spatialSymbolScale}px`, strokeWidth: `${3.4 * spatialSymbolScale}px` }}
                    >
                      长江口水域
                    </text>
                    <text
                      x={projectShanghaiPoint(121.49, 31.245).x}
                      y={projectShanghaiPoint(121.49, 31.245).y}
                      data-spatial-water-label="true"
                      style={{ fontSize: `${16.5 * spatialSymbolScale}px`, strokeWidth: `${3.4 * spatialSymbolScale}px` }}
                    >
                      黄浦江
                    </text>
                  </g>

                  <g className="insight-spatial-dot-cloud" aria-hidden="true">
                    {spatialHotspotDots.map((dot) => {
                      const isActive = isOverviewMode || dot.hotspotId === activeId;
                      const isDimmed = !isActive;

                      return (
                        <circle
                          key={dot.id}
                          className={`insight-spatial-dot${isActive ? " is-active" : ""}${isDimmed ? " is-dimmed" : ""}`}
                          data-spatial-dot="true"
                          cx={dot.x.toFixed(2)}
                          cy={dot.y.toFixed(2)}
                          r={dot.radius.toFixed(2)}
                          style={{ opacity: dot.opacity }}
                        />
                      );
                    })}
                  </g>

                  <g className="insight-spatial-hotspots">
                    {spatialHotspots.map((hotspot) => {
                      const point = projectShanghaiPoint(hotspot.lng, hotspot.lat);
                      const isActive = isOverviewMode || hotspot.id === activeId;
                      const isDimmed = !isActive;
                      const outerRadius = (34 + hotspot.radiusKm * 9 + Math.max(0, 7 - hotspot.rank) * 1.6) * spatialSymbolScale;
                      const midRadius = (13 + hotspot.radiusKm * 2.8) * spatialSymbolScale;
                      const coreRadius = 5.8 * spatialSymbolScale;
                      const labelOffsetX = 16 * spatialSymbolScale;
                      const labelOffsetY = 15 * spatialSymbolScale;

                      return (
                        <g
                          key={hotspot.id}
                          className={`insight-spatial-hotspot${isActive ? " is-active" : ""}${isDimmed ? " is-dimmed" : ""}${hotspot.rank <= 3 ? " is-top" : ""}`}
                          data-spatial-hotspot="true"
                          role="button"
                          tabIndex={0}
                          aria-label={`${hotspot.name}，${formatCount(hotspot.orders)} 单，占 ${hotspot.percent.toFixed(1)}%`}
                          aria-pressed={activeId === hotspot.id}
                          onClick={() => focusHotspot(hotspot.id)}
                          onMouseEnter={() => setHoveredId(hotspot.id)}
                          onFocus={() => setHoveredId(hotspot.id)}
                          onMouseLeave={releaseHover}
                          onBlur={releaseHover}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              focusHotspot(hotspot.id);
                            }
                          }}
                        >
                          <circle className="insight-spatial-hit" cx={point.x} cy={point.y} r={outerRadius + 18 * spatialSymbolScale} />
                          <circle className="insight-spatial-heat insight-spatial-heat--outer" cx={point.x} cy={point.y} r={outerRadius} />
                          <circle className="insight-spatial-heat insight-spatial-heat--mid" cx={point.x} cy={point.y} r={midRadius} />
                          <circle className="insight-spatial-core" cx={point.x} cy={point.y} r={coreRadius} />
                          <text className="insight-spatial-rank" x={point.x} y={point.y + 3.8 * spatialSymbolScale} style={{ fontSize: `${7 * spatialSymbolScale}px` }}>{hotspot.rank}</text>
                          <text className="insight-spatial-label" data-spatial-label="true" x={point.x + labelOffsetX} y={point.y - labelOffsetY} style={{ fontSize: `${16.5 * spatialSymbolScale}px`, strokeWidth: `${4.2 * spatialSymbolScale}px` }}>{hotspot.area}</text>
                        </g>
                      );
                    })}
                  </g>

                  {activePoint ? (
                    <g className="insight-spatial-crosshair" aria-hidden="true">
                      <line x1={activePoint.x - spatialCrosshairSize} x2={activePoint.x + spatialCrosshairSize} y1={activePoint.y} y2={activePoint.y} />
                      <line x1={activePoint.x} x2={activePoint.x} y1={activePoint.y - spatialCrosshairSize} y2={activePoint.y + spatialCrosshairSize} />
                    </g>
                  ) : null}
                </g>
              </svg>
            </div>

            <div className="insight-spatial-composition" data-spatial-panel="true" aria-label="六个空间热点订单占比">
              {spatialHotspots.map((hotspot) => (
                <button
                  key={hotspot.id}
                  type="button"
                  className={hotspot.id === activeId ? "is-active" : ""}
                  style={{ flexGrow: hotspot.percent }}
                  onClick={() => focusHotspot(hotspot.id)}
                  onMouseEnter={() => setHoveredId(hotspot.id)}
                  onFocus={() => setHoveredId(hotspot.id)}
                  onMouseLeave={releaseHover}
                  onBlur={releaseHover}
                  aria-label={`${hotspot.name} 占 ${hotspot.percent.toFixed(1)}%`}
                >
                  <span>{hotspot.rank}</span>
                  <strong>{hotspot.percent.toFixed(1)}%</strong>
                </button>
              ))}
            </div>
          </div>

          <aside className="insight-spatial-side" data-spatial-panel="true" aria-label="当前空间热点信息">
            <div className="insight-spatial-focus">
              <p className="insight-news-section-tag">{isOverviewMode ? "全局概览" : "Selected Cluster"}</p>
              <span>{activeHotspot ? `#${activeHotspot.rank.toString().padStart(2, "0")}` : "ALL"}</span>
              <h3>{activeHotspot ? activeHotspot.name : "全部空间热点"}</h3>
              <strong>{formatCount(activeHotspot ? activeHotspot.orders : spatialHotspotTotal)}</strong>
              <em>{activeHotspot ? `${activeHotspot.percent.toFixed(1)}% of cleaned trips` : "六簇空间热点"}</em>
              <p>{activeHotspot ? activeHotspot.summary : "覆盖全市清洗订单。"}</p>
              <dl>
                {activeHotspot ? (
                  <>
                    <div>
                      <dt>中心经度</dt>
                      <dd>{activeHotspot.lng.toFixed(4)}</dd>
                    </div>
                    <div>
                      <dt>中心纬度</dt>
                      <dd>{activeHotspot.lat.toFixed(4)}</dd>
                    </div>
                    <div>
                      <dt>扩散半径</dt>
                      <dd>{activeHotspot.radiusKm.toFixed(1)}km</dd>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <dt>聚类数量</dt>
                      <dd>K=6</dd>
                    </div>
                    <div>
                      <dt>有效订单</dt>
                      <dd>{formatCount(spatialHotspotTotal)}</dd>
                    </div>
                    <div>
                      <dt>显示状态</dt>
                      <dd>ALL</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            <div className="insight-spatial-list" aria-label="切换六个空间热点">
              {spatialHotspots.map((hotspot) => (
                <button
                  key={hotspot.id}
                  type="button"
                  className={hotspot.id === activeId ? "is-active" : ""}
                  onClick={() => focusHotspot(hotspot.id)}
                  onMouseEnter={() => setHoveredId(hotspot.id)}
                  onFocus={() => setHoveredId(hotspot.id)}
                  onMouseLeave={releaseHover}
                  onBlur={releaseHover}
                  aria-pressed={activeId === hotspot.id}
                >
                  <span>{hotspot.rank}</span>
                  <strong>{hotspot.area}</strong>
                  <em>{formatCount(hotspot.orders)}</em>
                </button>
              ))}
            </div>

            <p className="insight-spatial-source">
              上海骑行热点分布
              <span>清洗数据覆盖全市，六簇中心集中在核心城区</span>
            </p>
          </aside>
        </section>
      </div>
    </InsightNewsShell>
  );
}

function FlowDirectionArticle({ isActivated }: { isActivated: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const globalPreviewTimelineRef = useRef<ReturnType<typeof gsap.timeline> | null>(null);
  const globalPreviewTimeoutRef = useRef<number | null>(null);
  const [mode, setMode] = useState<FlowMode>("all");
  const [topLimit, setTopLimit] = useState<FlowTopLimit>(10);
  const [selection, setSelection] = useState<FlowSelection | null>(null);
  const [isGlobalPreviewing, setIsGlobalPreviewing] = useState(false);
  const reduceMotionRef = useRef(false);

  const selectedRegion = selection?.kind === "region" ? getFlowRegion(selection.regionId) : null;
  const selectedEdge = selection?.kind === "edge" ? flowTopCrossEdges.find((edge) => edge.id === selection.edgeId) ?? null : null;
  const activeRegionIds = useMemo(() => {
    const ids = new Set<FlowRegionId>();
    if (selectedRegion) ids.add(selectedRegion.id);
    if (selectedEdge) {
      ids.add(selectedEdge.from);
      ids.add(selectedEdge.to);
    }
    return ids;
  }, [selectedEdge, selectedRegion]);
  const hasSelection = selection !== null;
  const showCrossEdges = mode !== "internal";
  const showLoops = mode !== "cross";
  const activePanelRegion = selectedRegion ?? selectedEdge?.toRegion ?? null;

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const flowElements = root.querySelectorAll<Element>(
      [
        "[data-flow-boundary-path]",
        "[data-flow-land-path]",
        "[data-flow-animated-path]",
        "[data-flow-ribbon-path]",
        "[data-flow-node]",
        "[data-flow-panel]",
        "[data-flow-label]",
        "[data-flow-share-fill]",
      ].join(","),
    );
    gsap.killTweensOf(flowElements);
    gsap.set(flowElements, { clearProps: "opacity,visibility,transform,strokeDasharray,strokeDashoffset" });
    setInsightMotionReady(root, true);
  }, [isActivated]);

  useEffect(() => {
    if (!isActivated) return;

    setMode("all");
    setTopLimit(10);
    setSelection(null);
  }, [isActivated]);

  useEffect(() => {
    return () => {
      globalPreviewTimelineRef.current?.kill();
      if (globalPreviewTimeoutRef.current !== null) {
        window.clearTimeout(globalPreviewTimeoutRef.current);
      }
    };
  }, []);

  const changeFlowMode = useCallback((nextMode: FlowMode) => {
    setMode((current) => (current === nextMode ? current : nextMode));
  }, []);

  const changeTopLimit = useCallback((nextLimit: FlowTopLimit) => {
    setTopLimit((current) => (current === nextLimit ? current : nextLimit));
  }, []);

  const clearSelection = useCallback(() => {
    setSelection((current) => (current === null ? current : null));
  }, []);

  const selectRegion = useCallback((regionId: FlowRegionId) => {
    setSelection((current) =>
      current?.kind === "region" && current.regionId === regionId ? current : { kind: "region", regionId },
    );
  }, []);

  const selectEdge = useCallback((edgeId: string) => {
    setSelection((current) => (current?.kind === "edge" && current.edgeId === edgeId ? current : { kind: "edge", edgeId }));
  }, []);

  const showGlobalPreview = () => {
    const viewport = viewportRef.current;
    if (!viewport || isGlobalPreviewing) return;

    globalPreviewTimelineRef.current?.kill();
    if (globalPreviewTimeoutRef.current !== null) {
      window.clearTimeout(globalPreviewTimeoutRef.current);
      globalPreviewTimeoutRef.current = null;
    }

    setIsGlobalPreviewing(true);

    if (reduceMotionRef.current) {
      gsap.set(viewport, { attr: { transform: flowGlobalMapTransformValue } });
      globalPreviewTimeoutRef.current = window.setTimeout(() => {
        gsap.set(viewport, { attr: { transform: flowMapTransformValue } });
        setIsGlobalPreviewing(false);
        globalPreviewTimeoutRef.current = null;
      }, 1000);
      return;
    }

    globalPreviewTimelineRef.current = gsap
      .timeline({
        defaults: { overwrite: "auto" },
        onComplete: () => {
          setIsGlobalPreviewing(false);
          globalPreviewTimelineRef.current = null;
        },
      })
      .to(viewport, { attr: { transform: flowGlobalMapTransformValue }, duration: 0.5, ease: "power3.inOut" })
      .to(viewport, { duration: 1 })
      .to(viewport, { attr: { transform: flowMapTransformValue }, duration: 0.5, ease: "power3.inOut" });
  };

  return (
    <InsightNewsShell slug="insight-06" label="区域流向分析">
      <div
        ref={rootRef}
        className="insight-flow-shell"
        data-flow-mode={mode}
        data-motion-ready="true"
      >
        <section className="insight-flow-board" aria-label="上海市摩拜区域流向分析">
          <div className="insight-flow-map-panel">
            <div className="insight-flow-toolbar">
              <div className="insight-flow-toolbar-copy">
                <p className="insight-news-section-tag">Shanghai OD Flow</p>
                <h2>区域内循环占绝对主导</h2>
              </div>
              <div className="insight-flow-toolbar-actions" data-flow-panel="true">
                <button
                  type="button"
                  className="insight-flow-global-button"
                  onClick={showGlobalPreview}
                  disabled={isGlobalPreviewing}
                  aria-label="短暂展示上海全局后回到六个流向区域"
                >
                  展示全局
                </button>
                <div className="insight-flow-mode-tabs" role="tablist" aria-label="流向显示模式">
                  {flowModeOrder.map((modeKey) => (
                    <button
                      key={modeKey}
                      type="button"
                      role="tab"
                      aria-selected={mode === modeKey}
                      className={mode === modeKey ? "is-active" : ""}
                      onClick={() => changeFlowMode(modeKey)}
                    >
                      {flowModes[modeKey].label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="insight-flow-map-wrap">
              <svg
                className="insight-flow-map"
                viewBox={`0 0 ${SHANGHAI_MAP_VIEWBOX.width} ${SHANGHAI_MAP_VIEWBOX.height}`}
                role="img"
                aria-label="上海市行政区地图上的共享单车区域流向"
              >
                <defs>
                  <radialGradient id="flow-node-gold-gradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#fff5d8" stopOpacity="0.98" />
                    <stop offset="42%" stopColor="#d6a84c" stopOpacity="0.74" />
                    <stop offset="100%" stopColor="#9b6a25" stopOpacity="0" />
                  </radialGradient>
                  <marker
                    id="flow-loop-arrow"
                    viewBox="0 -3 7 6"
                    refX="6.2"
                    refY="0"
                    markerWidth="3.2"
                    markerHeight="3.2"
                    orient="auto"
                    markerUnits="strokeWidth"
                  >
                    <path d="M 0 -2.7 L 7 0 L 0 2.7 Z" fill="#e8bc5b" />
                  </marker>
                  {flowTopCrossEdges.map((edge) => (
                    <linearGradient
                      key={`flow-edge-gradient-${edge.id}`}
                      id={`flow-edge-gradient-${edge.id}`}
                      gradientUnits="userSpaceOnUse"
                      x1={edge.gradientStart.x}
                      y1={edge.gradientStart.y}
                      x2={edge.gradientEnd.x}
                      y2={edge.gradientEnd.y}
                    >
                      <stop offset="0%" stopColor="#b98536" stopOpacity="0.08" />
                      <stop offset="30%" stopColor="#d6a84c" stopOpacity="0.2" />
                      <stop offset="68%" stopColor="#e8bc5b" stopOpacity="0.58" />
                      <stop offset="100%" stopColor="#ffe3a3" stopOpacity="0.98" />
                    </linearGradient>
                  ))}
                </defs>

                <g ref={viewportRef} className="insight-flow-viewport" transform={flowMapTransformValue}>
                  <g className="insight-flow-land-fill" aria-hidden="true">
                    {shanghaiMapRegions.map((region) => (
                      <path
                        key={`flow-land-${region.adcode}`}
                        className="insight-flow-land"
                        data-flow-land-path="true"
                        d={region.path}
                      />
                    ))}
                  </g>

                  <g className="insight-flow-districts" aria-hidden="true">
                    {shanghaiMapRegions.map((region) => (
                      <path
                        key={`flow-boundary-${region.adcode}`}
                        className="insight-flow-district"
                        data-flow-boundary-path="true"
                        d={region.path}
                      />
                    ))}
                  </g>

                  <g className="insight-flow-water-labels" aria-hidden="true">
                    <text
                      x={projectShanghaiPoint(121.61, 31.39).x}
                      y={projectShanghaiPoint(121.61, 31.39).y}
                      data-flow-label="true"
                      style={{ fontSize: `${15.5 * flowSymbolScale}px`, strokeWidth: `${3.3 * flowSymbolScale}px` }}
                    >
                      长江口水域
                    </text>
                    <text
                      x={projectShanghaiPoint(121.49, 31.245).x}
                      y={projectShanghaiPoint(121.49, 31.245).y}
                      data-flow-label="true"
                      style={{ fontSize: `${15.5 * flowSymbolScale}px`, strokeWidth: `${3.3 * flowSymbolScale}px` }}
                    >
                      黄浦江
                    </text>
                  </g>

                  <g className="insight-flow-loops" aria-hidden={showLoops ? undefined : true}>
                    {flowRegions.map((region) => {
                      const isActive = !hasSelection || activeRegionIds.has(region.id);
                      const isDimmed = hasSelection && !isActive;

                      return (
                        <path
                          key={`loop-${region.id}`}
                          className={`insight-flow-loop${isActive ? " is-active" : ""}${isDimmed ? " is-dimmed" : ""}${showLoops ? "" : " is-hidden"}`}
                          data-flow-animated-path="true"
                          d={createFlowLoopPath(region)}
                          markerEnd="url(#flow-loop-arrow)"
                          style={{ strokeWidth: flowLoopStrokeWidth(region) }}
                        />
                      );
                    })}
                  </g>

                  <g className="insight-flow-edges">
                    {flowTopCrossEdges.map((edge) => {
                      const isRelatedToRegion = selectedRegion ? edge.from === selectedRegion.id || edge.to === selectedRegion.id : false;
                      const isSelectedEdge = selectedEdge?.id === edge.id;
                      const isActive = !hasSelection || isRelatedToRegion || isSelectedEdge;
                      const isDimmed = hasSelection && !isActive;
                      const isWithinTopLimit = edge.rank <= topLimit;

                      return (
                        <g
                          key={edge.id}
                          className={`insight-flow-edge${isActive ? " is-active" : ""}${isDimmed ? " is-dimmed" : ""}${showCrossEdges && isWithinTopLimit ? "" : " is-hidden"}`}
                          role="button"
                          tabIndex={0}
                          aria-label={`R${edge.fromRegion.regionNo} 到 R${edge.toRegion.regionNo}，${formatCount(edge.count)} 单`}
                          aria-pressed={isSelectedEdge}
                          onClick={() => selectEdge(edge.id)}
                          onFocus={() => selectEdge(edge.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              selectEdge(edge.id);
                            }
                          }}
                        >
                          <path className="insight-flow-edge-hit" d={edge.path} />
                          <path
                            className="insight-flow-edge-shape"
                            data-flow-ribbon-path="true"
                            d={edge.taperedArrowPath}
                            fill={`url(#flow-edge-gradient-${edge.id})`}
                          />
                        </g>
                      );
                    })}
                  </g>

                  <g className="insight-flow-nodes">
                    {flowRegions.map((region) => {
                      const isActive = !hasSelection || activeRegionIds.has(region.id);
                      const isDimmed = hasSelection && !isActive;
                      const labelOffsetX = 15 * flowSymbolScale;
                      const labelOffsetY = 15 * flowSymbolScale;

                      return (
                        <g
                          key={region.id}
                          className={`insight-flow-node${isActive ? " is-active" : ""}${isDimmed ? " is-dimmed" : ""}`}
                          data-flow-node="true"
                          data-flow-status={region.status}
                          role="button"
                          tabIndex={0}
                          aria-label={`R${region.regionNo} ${region.name}，净流向 ${formatSignedCount(region.netFlow)}`}
                          aria-pressed={selectedRegion?.id === region.id}
                          onClick={() => selectRegion(region.id)}
                          onFocus={() => selectRegion(region.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              selectRegion(region.id);
                            }
                          }}
                        >
                          <circle className="insight-flow-node-hit" cx={region.point.x} cy={region.point.y} r={region.nodeRadius + 20 * flowSymbolScale} />
                          <circle className="insight-flow-node-aura" cx={region.point.x} cy={region.point.y} r={region.nodeRadius * 2.72} />
                          <circle className="insight-flow-node-ring" cx={region.point.x} cy={region.point.y} r={region.nodeRadius * 1.42} />
                          <circle className="insight-flow-node-core" cx={region.point.x} cy={region.point.y} r={region.nodeRadius} />
                          <text className="insight-flow-node-id" x={region.point.x} y={region.point.y + 4.1 * flowSymbolScale} style={{ fontSize: `${8 * flowSymbolScale}px` }}>
                            {region.regionNo}
                          </text>
                          <text
                            className="insight-flow-node-label"
                            data-flow-label="true"
                            x={region.point.x + labelOffsetX}
                            y={region.point.y - labelOffsetY}
                            style={{ fontSize: `${15.5 * flowSymbolScale}px`, strokeWidth: `${4 * flowSymbolScale}px` }}
                          >
                            {region.area}
                          </text>
                        </g>
                      );
                    })}
                  </g>
                </g>
              </svg>
            </div>

            <div className="insight-flow-share-rail" data-flow-panel="true" aria-label="区域内与跨区流动占比">
              <div className="insight-flow-share-track">
                <span
                  className="insight-flow-share-fill insight-flow-share-fill--internal"
                  data-flow-share-fill="true"
                  style={{ width: `${flowInternalShare.toFixed(2)}%` }}
                />
                <span
                  className="insight-flow-share-fill insight-flow-share-fill--cross"
                  data-flow-share-fill="true"
                  style={{ width: `${flowCrossShare.toFixed(2)}%` }}
                />
              </div>
              <div className="insight-flow-share-copy">
                <span>区域内循环</span>
                <strong>{flowInternalShare.toFixed(2)}%</strong>
                <em>{formatCount(flowInternalTrips)} 单</em>
                <span>跨区流动</span>
                <strong>{flowCrossShare.toFixed(2)}%</strong>
                <em>{formatCount(flowCrossTrips)} 单</em>
              </div>
            </div>
          </div>

          <aside className="insight-flow-side" data-flow-panel="true" aria-label="流向分析控制台">
            <div className="insight-flow-focus">
              <div className="insight-flow-focus-head">
                <p className="insight-news-section-tag">{selectedEdge ? "Selected Flow" : selectedRegion ? "Selected Region" : "Core Reading"}</p>
                <button type="button" className="insight-flow-reset" onClick={clearSelection} aria-label="清除当前选择">
                  <RotateCcw size={14} aria-hidden="true" />
                  <span>重置</span>
                </button>
              </div>

              {selectedEdge ? (
                <>
                  <span className="insight-flow-focus-code">R{selectedEdge.fromRegion.regionNo} -&gt; R{selectedEdge.toRegion.regionNo}</span>
                  <h3>{selectedEdge.fromRegion.area} 到 {selectedEdge.toRegion.area}</h3>
                  <strong>{formatCount(selectedEdge.count)}</strong>
                  <em>{selectedEdge.percent.toFixed(2)}% of cleaned trips</em>
                  <p>{selectedEdge.rank <= 10 ? "Top 10 跨区强流之一，代表热点之间少量但方向清晰的外溢需求。" : "跨区流线的尾部补充通道，用来解释较弱但仍可见的连接。"}</p>
                  <dl>
                    <div>
                      <dt>起点区域</dt>
                      <dd>R{selectedEdge.fromRegion.regionNo}</dd>
                    </div>
                    <div>
                      <dt>终点区域</dt>
                      <dd>R{selectedEdge.toRegion.regionNo}</dd>
                    </div>
                    <div>
                      <dt>排名</dt>
                      <dd>#{selectedEdge.rank}</dd>
                    </div>
                  </dl>
                </>
              ) : activePanelRegion ? (
                <>
                  <span className="insight-flow-focus-code">R{activePanelRegion.regionNo} / {flowStatusLabel(activePanelRegion.status)}</span>
                  <h3>{activePanelRegion.name}</h3>
                  <strong>{formatSignedCount(activePanelRegion.netFlow)}</strong>
                  <em>net inflow minus outflow</em>
                  <p>{activePanelRegion.summary}</p>
                  <dl>
                    <div>
                      <dt>流入</dt>
                      <dd>{formatCount(activePanelRegion.incoming)}</dd>
                    </div>
                    <div>
                      <dt>流出</dt>
                      <dd>{formatCount(activePanelRegion.outgoing)}</dd>
                    </div>
                    <div>
                      <dt>自循环</dt>
                      <dd>{activePanelRegion.internalShare.toFixed(1)}%</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <>
                  <span className="insight-flow-focus-code">ALL / OD MATRIX</span>
                  <h3>车辆更像在区域内周转</h3>
                  <strong>{flowInternalShare.toFixed(2)}%</strong>
                  <em>{formatCount(flowInternalTrips)} internal trips</em>
                  <p>{flowModes[mode].summary}</p>
                  <dl>
                    <div>
                      <dt>总订单</dt>
                      <dd>{formatCount(flowTotalTrips)}</dd>
                    </div>
                    <div>
                      <dt>区域内</dt>
                      <dd>{formatCount(flowInternalTrips)}</dd>
                    </div>
                    <div>
                      <dt>跨区</dt>
                      <dd>{formatCount(flowCrossTrips)}</dd>
                    </div>
                  </dl>
                </>
              )}
            </div>

            <div className="insight-flow-top">
              <div className="insight-flow-top-head">
                <p className="insight-news-section-tag">跨域流量排行榜</p>
                <div className="insight-flow-limit" aria-label="选择跨区流向数量">
                  {flowTopLimits.map((limit) => (
                    <button
                      key={limit}
                      type="button"
                      className={topLimit === limit ? "is-active" : ""}
                      onClick={() => changeTopLimit(limit)}
                      aria-pressed={topLimit === limit}
                    >
                      {limit}
                    </button>
                  ))}
                </div>
              </div>
              <div className="insight-flow-top-list" aria-label="跨区流向排名">
                {flowTopCrossEdges.slice(0, topLimit).map((edge) => (
                  <button
                    key={`top-${edge.id}`}
                    type="button"
                    className={selectedEdge?.id === edge.id ? "is-active" : ""}
                    onClick={() => selectEdge(edge.id)}
                    onFocus={() => selectEdge(edge.id)}
                    aria-pressed={selectedEdge?.id === edge.id}
                  >
                    <span>{edge.rank.toString().padStart(2, "0")}</span>
                    <strong>R{edge.fromRegion.regionNo} -&gt; R{edge.toRegion.regionNo}</strong>
                    <em>{formatCount(edge.count)}</em>
                  </button>
                ))}
              </div>
            </div>

            <div className="insight-flow-region-strip" aria-label="六个区域净流向">
              {flowRegions.map((region) => (
                <button
                  key={`strip-${region.id}`}
                  type="button"
                  className={selectedRegion?.id === region.id ? "is-active" : ""}
                  data-flow-status={region.status}
                  onClick={() => selectRegion(region.id)}
                  onFocus={() => selectRegion(region.id)}
                  aria-pressed={selectedRegion?.id === region.id}
                >
                  <span>R{region.regionNo}</span>
                  <strong>{formatSignedCount(region.netFlow)}</strong>
                </button>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </InsightNewsShell>
  );
}

function tokenLayout(index: number, stageIndex: number): CleanLabTokenLayout {
  const token = cleanLabTokens[index];
  const role = token.role;
  const wave = Math.sin(index * 1.7 + stageIndex * 0.9);
  const drift = Math.cos(index * 0.92 + stageIndex * 0.7);

  const normalIndex = Math.min(index, 10);
  const checkIndex = Math.max(0, index - 11);
  const derivedIndex = Math.max(0, index - 14);
  const longIndex = Math.max(0, index - 18);
  const coordIndex = Math.max(0, index - 24);

  const backgroundCloud = (tokenIndex: number, opacity = 0.32): CleanLabTokenLayout => ({
    x: -306 + (tokenIndex % 5) * 150 + wave * 6,
    y: -154 + Math.floor(tokenIndex / 5) * 60 + drift * 5,
    scale: 0.56,
    rotate: 0,
    opacity,
  });

  const compactRecord = (tokenIndex: number, opacity = 0.82): CleanLabTokenLayout => ({
    x: -368 + (tokenIndex % 4) * 156,
    y: -148 + Math.floor(tokenIndex / 4) * 58,
    scale: 0.76,
    rotate: 0,
    opacity,
  });

  const fieldBand = (tokenIndex: number): CleanLabTokenLayout => ({
    x: -424 + (tokenIndex % 9) * 106,
    y: tokenIndex < 9 ? -88 : 58 + Math.floor((tokenIndex - 9) / 2) * 52,
    scale: tokenIndex < 9 ? 0.7 : 0.62,
    rotate: 0,
    opacity: tokenIndex < 9 ? 0.92 : 0.3,
  });

  const timeAxisPoint = (pointIndex: number, yOffset = 0): CleanLabTokenLayout => {
    const points = [
      { x: -252, y: -80 },
      { x: -84, y: -126 },
      { x: 86, y: -78 },
      { x: 252, y: -122 },
    ];
    const point = points[pointIndex % points.length];
    return {
      x: point.x,
      y: point.y + yOffset,
      scale: 0.78,
      rotate: 0,
      opacity: 1,
    };
  };

  const derivedBranch = (pointIndex: number): CleanLabTokenLayout => {
    const branches = [
      { x: -250, y: -126 },
      { x: -84, y: -174 },
      { x: 88, y: -124 },
      { x: 250, y: -170 },
    ];
    const point = branches[pointIndex % branches.length];
    return {
      x: point.x,
      y: point.y,
      scale: 0.82,
      rotate: 0,
      opacity: 1,
    };
  };

  const durationNormal = (tokenIndex: number): CleanLabTokenLayout => ({
    x: -390 + (tokenIndex % 4) * 152,
    y: 118 + Math.floor(tokenIndex / 4) * 46,
    scale: 0.68,
    rotate: 0,
    opacity: 0.78,
  });

  const longTailPoint = (tailIndex: number, exiting = false): CleanLabTokenLayout => ({
    x: exiting ? 408 + drift * 10 : -166 + tailIndex * 118,
    y: exiting ? -174 + tailIndex * 52 : -108 + tailIndex * 32,
    scale: exiting ? 0.74 : 0.86,
    rotate: exiting ? 5 : 0,
    opacity: exiting ? 0.18 : 1,
  });

  if (stageIndex === 0) {
    return {
      x: -390 + (index % 7) * 124 + wave * 34,
      y: -178 + Math.floor(index / 7) * 78 + drift * 24,
      scale: 0.7 + ((index % 5) * 0.045),
      rotate: ((index % 9) - 4) * 7,
      opacity: role === "long" || role === "coord" ? 0.42 : 0.62 + ((index % 3) * 0.08),
    };
  }

  if (stageIndex === 1) {
    if (role === "check") {
      return {
        x: 330,
        y: -78 + checkIndex * 58,
        scale: 0.86,
        rotate: 0,
        opacity: 0.92,
      };
    }

    if (role === "long" || role === "coord") {
      return backgroundCloud(index, 0.28);
    }

    return compactRecord(normalIndex, 0.9);
  }

  if (stageIndex === 2) {
    if (role === "check") {
      return {
        x: 346,
        y: -96 + checkIndex * 66,
        scale: 0.96,
        rotate: 0,
        opacity: 1,
      };
    }

    if (role === "long" || role === "coord") {
      return backgroundCloud(index, 0.22);
    }

    return fieldBand(index);
  }

  if (stageIndex === 3) {
    if (role === "derived") {
      return timeAxisPoint(derivedIndex);
    }

    if (role === "check") {
      return {
        x: 258,
        y: 96 + checkIndex * 48,
        scale: 0.68,
        rotate: 0,
        opacity: 0.78,
      };
    }

    if (role === "normal" && (index === 3 || index === 4)) {
      return timeAxisPoint(index - 3, 76);
    }

    return backgroundCloud(index, role === "long" || role === "coord" ? 0.18 : 0.24);
  }

  if (stageIndex === 4) {
    if (role === "derived") {
      return derivedBranch(derivedIndex);
    }

    if (role === "check") {
      return {
        x: 258,
        y: 54 + checkIndex * 58,
        scale: 0.68,
        rotate: 0,
        opacity: 0.9,
      };
    }

    if (role === "normal" && index <= 4) {
      return {
        x: -252 + index * 126,
        y: 112 + (index % 2) * 42,
        scale: 0.58,
        rotate: 0,
        opacity: 0.64,
      };
    }

    return backgroundCloud(index, role === "long" || role === "coord" ? 0.14 : 0.2);
  }

  if (stageIndex === 5) {
    if (role === "long") {
      return longTailPoint(longIndex);
    }

    if (role === "coord") {
      return {
        x: 344,
        y: 20 + coordIndex * 48,
        scale: 0.68,
        rotate: 0,
        opacity: 0.48,
      };
    }

    if (role === "normal") {
      return durationNormal(normalIndex);
    }

    return {
      x: 342,
      y: role === "check" ? -126 + checkIndex * 56 : 150,
      scale: role === "output" ? 0.72 : 0.82,
      rotate: 0,
      opacity: role === "output" ? 0.36 : 0.9,
    };
  }

  if (stageIndex === 6) {
    if (role === "long") {
      return longTailPoint(longIndex, true);
    }

    if (role === "coord") {
      return {
        x: 352 + coordIndex * 34,
        y: 98 + coordIndex * 40,
        scale: 0.66,
        rotate: -5,
        opacity: 0.24,
      };
    }

    if (role === "check") {
      return {
        x: -354 + checkIndex * 186,
        y: -152 + (checkIndex % 2) * 58,
        scale: 0.86,
        rotate: 0,
        opacity: 1,
      };
    }

    if (role === "output") {
      return {
        x: 0,
        y: 150,
        scale: 0.86,
        rotate: 0,
        opacity: 0.8,
      };
    }

    return durationNormal(normalIndex);
  }

  if (role === "long" || role === "coord") {
    return {
      x: 442 + drift * 18,
      y: role === "long" ? -126 + longIndex * 38 : 112 + coordIndex * 34,
      scale: 0.62,
      rotate: 0,
      opacity: 0,
    };
  }

  if (role === "output" || role === "check") {
    const outputIndex = role === "output" ? 0 : checkIndex;
    return {
      x: role === "output" ? 0 : -286 + outputIndex * 148,
      y: role === "output" ? 44 : 126 + (outputIndex % 2) * 46,
      scale: role === "output" ? 1.08 : 0.72,
      rotate: 0,
      opacity: 1,
    };
  }

  return {
    x: -294 + (normalIndex % 5) * 146,
    y: -108 + Math.floor(normalIndex / 5) * 50,
    scale: role === "derived" ? 0.76 : 0.66,
    rotate: 0,
    opacity: 0.76,
  };
}

function CleanLabArticle({ isActivated }: { isActivated: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const stageContentRef = useRef<HTMLDivElement>(null);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [displayStageIndex, setDisplayStageIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const visualStateRef = useRef(0);
  const displayStageIndexRef = useRef(0);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const stageFadeRef = useRef<gsap.core.Tween | null>(null);
  const stageFadeFrameRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  const reduceMotionRef = useRef(false);

  const renderCleanLabState = useCallback((stateIndex: number) => {
    const root = rootRef.current;
    if (!root) return;

    const tokens = Array.from(root.querySelectorAll<HTMLElement>("[data-cleanlab-token]"));
    const shapes = Array.from(root.querySelectorAll<HTMLElement>("[data-cleanlab-shape]"));
    const clampedState = Math.max(0, Math.min(stateIndex, cleanLabStages.length));

    tokens.forEach((token, index) => {
      const tokenData = cleanLabTokens[index];
      const layout = tokenLayout(index, clampedState);
      token.textContent = tokenData?.labels[clampedState] ?? "";
      gsap.set(token, {
        xPercent: -50,
        yPercent: -50,
        x: layout.x,
        y: layout.y,
        scale: layout.scale,
        rotate: layout.rotate,
        autoAlpha: layout.opacity,
      });
    });

    shapes.forEach((shape, shapeIndex) => {
      gsap.set(shape, {
        autoAlpha: shapeIndex === Math.min(clampedState, cleanLabStages.length - 1) ? 1 : 0,
      });
    });

    visualStateRef.current = clampedState;
  }, []);

  const changeDisplayedStage = useCallback(
    (targetStageIndex: number, immediate = false) => {
      const clampedTarget = Math.max(0, Math.min(targetStageIndex, cleanLabStages.length - 1));
      const panel = stageContentRef.current;

      stageFadeRef.current?.kill();
      stageFadeRef.current = null;
      if (stageFadeFrameRef.current !== null) {
        window.cancelAnimationFrame(stageFadeFrameRef.current);
        stageFadeFrameRef.current = null;
      }

      if (immediate || reduceMotionRef.current || !panel || clampedTarget === displayStageIndexRef.current) {
        displayStageIndexRef.current = clampedTarget;
        setDisplayStageIndex(clampedTarget);
        if (panel) {
          gsap.set(panel, { opacity: 1, y: 0, clearProps: "visibility" });
        }
        return;
      }

      stageFadeRef.current = gsap.to(panel, {
        opacity: 0,
        y: 10,
        duration: 0.16,
        ease: "power2.out",
        onComplete: () => {
          displayStageIndexRef.current = clampedTarget;
          setDisplayStageIndex(clampedTarget);
          gsap.set(panel, { y: -8 });
          stageFadeFrameRef.current = window.requestAnimationFrame(() => {
            stageFadeFrameRef.current = null;
            stageFadeRef.current = gsap.to(panel, {
              opacity: 1,
              y: 0,
              duration: 0.26,
              ease: "power2.out",
            });
          });
        },
      });
    },
    [],
  );

  const resetCleanLab = useCallback(() => {
    const root = rootRef.current;
    const scroller = root?.closest(".insight-article-scroll") as HTMLElement | null;

    timelineRef.current?.kill();
    timelineRef.current = null;
    isAnimatingRef.current = false;
    setIsAnimating(false);
    setActiveStageIndex(0);
    changeDisplayedStage(0, true);

    if (scroller) {
      scroller.scrollTop = 0;
    }

    renderCleanLabState(0);
  }, [changeDisplayedStage, renderCleanLabState]);

  const animateCleanLabStage = useCallback(
    (fromState: number, toState: number, nextActiveStageIndex: number) => {
      const root = rootRef.current;
      if (!root || isAnimatingRef.current) return;

      const isReverse = toState < fromState;
      const tokens = Array.from(root.querySelectorAll<HTMLElement>("[data-cleanlab-token]"));
      const shapes = Array.from(root.querySelectorAll<HTMLElement>("[data-cleanlab-shape]"));
      const fromShapeIndex = Math.min(fromState, cleanLabStages.length - 1);
      const toShapeIndex = Math.min(toState, cleanLabStages.length - 1);

      timelineRef.current?.kill();

      if (reduceMotionRef.current) {
        renderCleanLabState(toState);
        setActiveStageIndex(nextActiveStageIndex);
        changeDisplayedStage(nextActiveStageIndex, true);
        return;
      }

      isAnimatingRef.current = true;
      setIsAnimating(true);
      changeDisplayedStage(nextActiveStageIndex);
      if (isReverse) {
        setActiveStageIndex(nextActiveStageIndex);
      }

      const progress = { value: 0 };
      const tl = gsap.timeline({
        defaults: { ease: "power2.inOut" },
        onUpdate: () => {
          tokens.forEach((token, tokenIndex) => {
            const tokenData = cleanLabTokens[tokenIndex];
            const layout = blendTokenLayout(tokenIndex, fromState, toState, progress.value);
            token.textContent = tokenData?.labels[progress.value < 0.46 ? fromState : toState] ?? "";
            gsap.set(token, {
              xPercent: -50,
              yPercent: -50,
              x: layout.x,
              y: layout.y,
              scale: layout.scale,
              rotate: layout.rotate,
              autoAlpha: layout.opacity,
            });
          });

          shapes.forEach((shape, shapeIndex) => {
            const shapeOpacity =
              fromShapeIndex === toShapeIndex
                ? shapeIndex === fromShapeIndex ? 1 : 0
                : shapeIndex === fromShapeIndex ? 1 - progress.value
                  : shapeIndex === toShapeIndex ? progress.value
                    : 0;

            gsap.set(shape, {
              autoAlpha: shapeOpacity,
            });
          });

        },
        onComplete: () => {
          renderCleanLabState(toState);
          setActiveStageIndex(nextActiveStageIndex);
          isAnimatingRef.current = false;
          setIsAnimating(false);
          timelineRef.current = null;
        },
      });

      tl.to(progress, { value: 1, duration: 1.25 });
      timelineRef.current = tl;
    },
    [changeDisplayedStage, renderCleanLabState],
  );

  const goToStage = useCallback(
    (targetStageIndex: number) => {
      if (isAnimatingRef.current) return;

      const clampedTarget = Math.max(0, Math.min(targetStageIndex, cleanLabStages.length - 1));
      timelineRef.current?.kill();
      timelineRef.current = null;
      isAnimatingRef.current = false;
      setIsAnimating(false);
      setActiveStageIndex(clampedTarget);
      changeDisplayedStage(clampedTarget);
      renderCleanLabState(clampedTarget);
    },
    [changeDisplayedStage, renderCleanLabState],
  );

  const playNext = useCallback(() => {
    if (activeStageIndex >= cleanLabStages.length - 1 && visualStateRef.current >= cleanLabStages.length) return;

    const stageIndex = activeStageIndex;
    const fromState = visualStateRef.current;
    const toState = Math.min(stageIndex + 1, cleanLabStages.length);
    const nextActiveStageIndex = Math.min(stageIndex + 1, cleanLabStages.length - 1);
    animateCleanLabStage(fromState, toState, nextActiveStageIndex);
  }, [activeStageIndex, animateCleanLabStage]);

  const playPrevious = useCallback(() => {
    if (activeStageIndex <= 0 || isAnimatingRef.current) return;

    const fromState = visualStateRef.current;
    const isCompletedFinalStage = fromState > activeStageIndex;
    const toState = isCompletedFinalStage ? activeStageIndex : Math.max(activeStageIndex - 1, 0);
    animateCleanLabStage(fromState, toState, toState);
  }, [activeStageIndex, animateCleanLabStage]);

  const replayStage = useCallback(() => {
    const stageIndex = activeStageIndex;
    const fromState = stageIndex;
    const toState = Math.min(stageIndex + 1, cleanLabStages.length);

    setActiveStageIndex(stageIndex);
    renderCleanLabState(fromState);
    animateCleanLabStage(fromState, toState, stageIndex);
  }, [activeStageIndex, animateCleanLabStage, renderCleanLabState]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      reduceMotionRef.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      renderCleanLabState(0);
    }, root);

    return () => {
      timelineRef.current?.kill();
      stageFadeRef.current?.kill();
      if (stageFadeFrameRef.current !== null) {
        window.cancelAnimationFrame(stageFadeFrameRef.current);
      }
      ctx.revert();
    };
  }, [renderCleanLabState]);

  useEffect(() => {
    if (isActivated) {
      resetCleanLab();
    }
  }, [isActivated, resetCleanLab]);

  const displayStage = cleanLabStages[displayStageIndex];
  const nextDisabled = isAnimating || (activeStageIndex >= cleanLabStages.length - 1 && visualStateRef.current >= cleanLabStages.length);

  return (
    <InsightNewsShell slug="insight-02" label="数据清洗">
      <div
        className="insight-cleanlab-shell"
        ref={rootRef}
        data-cleanlab-animating={isAnimating ? "true" : "false"}
        data-cleanlab-stage={displayStage.id}
      >
        <section className="insight-cleanlab-machine" aria-label="七步数据清洗流程">
          <div
            ref={stageContentRef}
            className={`insight-cleanlab-stage-content insight-cleanlab-stage-content--static insight-cleanlab-stage--${displayStage.tone}`}
          >
            <div className="insight-cleanlab-stage-index">{displayStage.id}</div>
            <div>
              <p className="insight-news-section-tag">Step {displayStage.id}</p>
              <h3 id={`cleanlab-stage-${displayStage.id}`} className="insight-cleanlab-section-title">{displayStage.title}</h3>
            </div>
            <pre className="insight-cleanlab-code-block">
              <code>{displayStage.code}</code>
            </pre>
          </div>

          <div className="insight-cleanlab-visual" aria-hidden="true">
            <div className="insight-cleanlab-static-frame" />
            <div className="insight-cleanlab-semantic-overlay">
              <div className="insight-cleanlab-scan-line" />
              <div className="insight-cleanlab-time-axis">
                <span />
                <span />
              </div>
              <div className="insight-cleanlab-duration-ruler">
                <span />
                <strong />
                <span />
              </div>
              <div className="insight-cleanlab-output-file" />
            </div>
            <div className="insight-cleanlab-swarm">
              <div className="insight-cleanlab-swarm-core">
                {cleanLabStages.map((stage, index) => (
                  <div key={stage.id} className={`insight-cleanlab-swarm-shape insight-cleanlab-swarm-shape--${stage.tone}`} data-cleanlab-shape={index}>
                    <span />
                    <span />
                    <span />
                    <span />
                  </div>
                ))}
                {cleanLabTokens.map((token, index) => (
                  <span
                    key={`${token.labels[0]}-${index}`}
                    className={`insight-cleanlab-token insight-cleanlab-token--${token.kind}`}
                    data-cleanlab-token="true"
                    data-cleanlab-token-role={token.role}
                  >
                    {token.labels[0]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="insight-cleanlab-controls" aria-label="数据清洗阶段控制">
            <button type="button" onClick={playPrevious} disabled={isAnimating || activeStageIndex === 0} aria-label="Previous step">
              <ArrowLeft aria-hidden="true" />
            </button>
            <button type="button" onClick={replayStage} disabled={isAnimating} aria-label="Replay step">
              <RotateCcw aria-hidden="true" />
            </button>
            <button type="button" onClick={playNext} disabled={nextDisabled} aria-label="Next step">
              <ArrowRight aria-hidden="true" />
            </button>
            <div className="insight-cleanlab-step-indicators" aria-label="跳转到清洗阶段">
              {cleanLabStages.map((stage, index) => (
                <button
                  key={stage.id}
                  type="button"
                  className={index === activeStageIndex ? "is-active" : undefined}
                  onClick={() => goToStage(index)}
                  disabled={isAnimating}
                  aria-current={index === activeStageIndex ? "step" : undefined}
                >
                  {stage.id}
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </InsightNewsShell>
  );
}

function PlaceholderArticle({ slug }: { slug: InsightSlug }) {
  const title = INSIGHT_TITLES[slug];

  return (
    <InsightNewsShell slug={slug} label={title}>
      <section className="insight-news-placeholder">
        <div className="insight-news-placeholder-card insight-news-paper-card">
          <span className="insight-news-card-label">当前状态</span>
          <h3 className="insight-news-subheadline">版面骨架已就位，内容会按模块逐块接入</h3>
          <p className="insight-news-card-copy">
            这个窗口已经切到新的黑窗模式，但具体的数据指标、图表与交互还会按模块顺序逐个补全。模块切换方式保持不变：关闭当前黑窗，回到首页最终态后再打开其它色块。
          </p>
        </div>
      </section>
    </InsightNewsShell>
  );
}

export function InsightArticleContent({ slug, isActivated = true }: { slug: InsightSlug; isActivated?: boolean }) {
  if (slug === "insight-01") {
    return <OverviewArticle isActivated={isActivated} />;
  }

  if (slug === "insight-02") {
    return <CleanLabArticle isActivated={isActivated} />;
  }

  if (slug === "insight-03") {
    return <TimePatternArticle isActivated={isActivated} />;
  }

  if (slug === "insight-04") {
    return <DurationArticle isActivated={isActivated} />;
  }

  if (slug === "insight-05") {
    return <SpatialHotspotArticle isActivated={isActivated} />;
  }

  if (slug === "insight-06") {
    return <FlowDirectionArticle isActivated={isActivated} />;
  }

  return <PlaceholderArticle slug={slug} />;
}
