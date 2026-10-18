import { CLEANING_SOURCE } from "./source";

// Verified against the raw CSV and outputs/数据清洗.txt. These are offline
// analysis results; the browser only replays the Python pipeline.
export const COUNTS = { raw: 102_361, clean: 102_210, long: 148, coord: 3 } as const;
export const count = (value: number) => new Intl.NumberFormat("en-US").format(value);

export const RAW_FIELDS = [
  "orderid", "bikeid", "userid", "start_time", "start_location_x",
  "start_location_y", "end_time", "end_location_x", "end_location_y",
] as const;
export const OUTPUT_FIELDS = [
  "orderid", "bikeid", "userid", "start_time", "end_time",
  "start_location_x", "start_location_y", "end_location_x", "end_location_y",
  "duration_min", "start_date", "start_hour", "start_weekday", "start_is_weekend",
] as const;

export const SAMPLE = {
  orderid: "78387", bikeid: "158357", userid: "10080",
  start_time: "2016/8/20 6:57", end_time: "2016/8/20 7:04",
  start_location_x: "121.348", start_location_y: "31.389",
  end_location_x: "121.357", end_location_y: "31.388",
};
export const SAMPLE_ROWS = [
  ["78387", "2016/8/20 6:57", "121.348", "31.389", "7"],
  ["891333", "2016/8/29 19:09", "121.508", "31.279", "22"],
  ["1106623", "2016/8/13 16:17", "121.383", "31.254", "19"],
  ["119909", "2016/8/5 8:43", "121.507", "31.258", "4725"],
] as const;
export const FEATURES = [
  { name: "start_date", value: "2016-08-20", label: "日期" },
  { name: "start_hour", value: "06", label: "小时" },
  { name: "start_weekday", value: "5", label: "星期六 · 周一为 0" },
  { name: "start_is_weekend", value: "1", label: "周末" },
] as const;
export const COORD_REJECTS = [
  { id: "1272182", lng: 120.487, lat: 31.477, duration: 45 },
  { id: "471807", lng: 120.487, lat: 31.477, duration: 11 },
  { id: "147841", lng: 120.486, lat: 31.477, duration: 26 },
] as const;

export type CleaningPhase = {
  label: string;
  match: string;
  note: string;
  rows?: number;
  fields?: number;
};
type CleaningStage = {
  key: keyof typeof CLEANING_SOURCE;
  short: string;
  title: string;
  description: string;
  ready: string;
  result: string;
  inputFields: number;
  outputFields: number;
  phases: readonly CleaningPhase[];
};

export const STAGES: readonly CleaningStage[] = [
  {
    key: "load", short: "读取", title: "让十万次骑行，有迹可循。",
    description: "从原始 CSV 出发，先看见一条订单，再展开整个数据集。",
    ready: "准备读取 mobike_shanghai_sample_updated.csv",
    result: "102,361 条原始记录已读入，9 个字段构成每次骑行的起点与终点。",
    inputFields: 9, outputFields: 9,
    phases: [
      { label: "读取 CSV", match: "pd.read_csv", note: "读取原始文件，保持每条记录的字段关联。" },
      { label: "展开数据集", match: "df.shape", note: "102,361 行 × 9 列。舞台显示真实记录节选。", rows: 102361 },
    ],
  },
  {
    key: "inspect", short: "检查", title: "先检查，再决定。",
    description: "核对字段、数据类型、缺失与重复。检查通过的数据原样保留。",
    ready: "待检查：9 个字段、102,361 条记录",
    result: "缺失值 0，重复行 0。本步骤只检查，没有删除或填补任何记录。",
    inputFields: 9, outputFields: 9,
    phases: [
      { label: "字段与类型", match: "df.dtypes", note: "3 个整数标识、2 个时间字符串、4 个浮点坐标。" },
      { label: "检查缺失", match: "df.isnull()", note: "缺失单元格为 0，无需填补。" },
      { label: "检查重复", match: "df.duplicated()", note: "重复行数为 0，无需去重。" },
    ],
  },
  {
    key: "time", short: "解析", title: "时间，从文字变成刻度。",
    description: "解析起止时间，让原本的字符串可以参与时间运算。",
    ready: "起止时间仍为字符串，等待 pd.to_datetime 解析",
    result: "起止时间完成解析。出发时间覆盖 2016-08-01 00:23 至 2016-08-31 23:58。",
    inputFields: 9, outputFields: 9,
    phases: [
      { label: "解析出发时间", match: 'df["start_time"] =', note: "2016/8/20 6:57 → 2016-08-20 06:57。" },
      { label: "解析到达时间", match: 'df["end_time"] =', note: "字符串成为 datetime，记录数量与字段数量保持不变。" },
    ],
  },
  {
    key: "features", short: "派生", title: "一个时刻，四种观察维度。",
    description: "从出发时间提取日期、小时、星期与周末标记，为后续分析提供维度。",
    ready: "准备从 start_time 提取 4 个新字段",
    result: "9 → 13 个字段。过滤前工作日 76,160 条、周末 26,201 条。",
    inputFields: 9, outputFields: 13,
    phases: [
      { label: "提取日期", match: '.dt.date', note: "保留日历日期，用于每日订单统计。", fields: 10 },
      { label: "提取小时", match: '.dt.hour', note: "06:57 对应小时 6，用于一天内的时段分析。", fields: 11 },
      { label: "提取星期", match: '.dt.weekday', note: "星期六对应 5，Python 从周一的 0 开始计数。", fields: 12 },
      { label: "标记周末", match: '.isin([5, 6])', note: "星期六与星期日标记为 1，其余日期为 0。", fields: 13 },
    ],
  },
  {
    key: "duration", short: "计算", title: "两端之间，是一次骑行。",
    description: "用到达时间减去出发时间，将时间差换算成分钟。",
    ready: "准备计算 duration_min，记录尚未过滤",
    result: "新增 duration_min，第 14 个字段就绪。4,725 分钟的长尾记录留待下一步过滤。",
    inputFields: 13, outputFields: 14,
    phases: [
      { label: "计算分钟数", match: '.dt.total_seconds()', note: "订单 78387：07:04 − 06:57 = 7 分钟。", fields: 14 },
      { label: "检查时长分布", match: '.describe()', note: "原始时长最大值 4,725 分钟，当前只计算，不删除。" },
    ],
  },
  {
    key: "filter", short: "过滤", title: "让异常有去处，让结论有依据。",
    description: "按脚本顺序执行四条规则，只在命中异常时改变记录数量。",
    ready: "102,361 条记录等待四道规则依次检查",
    result: "剔除 148 条超长骑行与 3 条坐标越界记录，保留 102,210 条。",
    inputFields: 14, outputFields: 14,
    phases: [
      { label: "时长不足 1 分钟", match: 'duration_min"] >= 1', note: "命中 0 条，102,361 条记录全部通过。", rows: 102361 },
      { label: "时长超过 180 分钟", match: 'duration_min"] <= 180', note: "剔除 148 条，剩余 102,213 条。", rows: 102213 },
      { label: "起终点坐标范围", match: 'coord_mask =', note: "起点与终点的经纬度均须在范围内。剔除 3 条，剩余 102,210 条。", rows: 102210 },
      { label: "复核负数时长", match: 'duration_min"] >= 0', note: "新增剔除 0 条。负时长已被第一条规则涵盖。", rows: 102210 },
    ],
  },
  {
    key: "export", short: "归档", title: "把可信的数据，交给下一程。",
    description: "按输出字段顺序整理结果，供时间规律、空间聚类与区域流向分析使用。",
    ready: "102,210 条记录、14 个字段，准备归档",
    result: "cleaned_mobike.csv 已归档。保留率 99.85%，清洗过程到此完成。",
    inputFields: 14, outputFields: 14,
    phases: [
      { label: "整理输出字段", match: 'output_cols =', note: "按脚本指定的顺序排列 9 个原始字段与 5 个派生字段。" },
      { label: "写入结果文件", match: '.to_csv(', note: "UTF-8 编码、不导出行索引。此处回放本地分析产物。" },
    ],
  },
];
