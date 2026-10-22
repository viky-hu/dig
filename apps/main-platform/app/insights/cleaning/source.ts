// Exact source excerpts from data-analysis/main/data-mining/data_cleaning.py.
// Line numbers refer to that source file, not a rewritten demonstration.
export const CLEANING_SOURCE = {
  "load": {
    "startLine": 22,
    "lines": [
      "def load_data(filepath):",
      "    print(f\"[1/7] 读取数据: {filepath}\")",
      "    df = pd.read_csv(filepath)",
      "    print(f\"      数据规模: {df.shape[0]} 行, {df.shape[1]} 列\")",
      "    return df"
    ]
  },
  "inspect": {
    "startLine": 29,
    "lines": [
      "def inspect_data(df):",
      "    print(\"\\n[2/7] 数据初探\")",
      "    print(f\"      字段列表: {list(df.columns)}\")",
      "    print(f\"      数据类型:\\n{df.dtypes.to_string()}\")",
      "    missing = df.isnull().sum()",
      "    missing_report = missing[missing > 0]",
      "    if len(missing_report) > 0:",
      "        print(f\"      缺失值统计:\\n{missing_report.to_string()}\")",
      "    else:",
      "        print(\"      缺失值: 无\")",
      "    print(f\"      重复行数: {df.duplicated().sum()}\")",
      "    return df"
    ]
  },
  "time": {
    "startLine": 43,
    "lines": [
      "def parse_datetime(df):",
      "    print(\"\\n[3/7] 时间字段处理\")",
      "    df[\"start_time\"] = pd.to_datetime(df[\"start_time\"])",
      "    df[\"end_time\"] = pd.to_datetime(df[\"end_time\"])",
      "    print(f\"      start_time 范围: {df['start_time'].min()} ~ {df['start_time'].max()}\")",
      "    return df"
    ]
  },
  "features": {
    "startLine": 51,
    "lines": [
      "def extract_time_features(df):",
      "    print(\"\\n[4/7] 提取时间特征\")",
      "    df[\"start_date\"] = df[\"start_time\"].dt.date",
      "    df[\"start_hour\"] = df[\"start_time\"].dt.hour",
      "    df[\"start_weekday\"] = df[\"start_time\"].dt.weekday  # 0=周一",
      "    df[\"start_is_weekend\"] = df[\"start_weekday\"].isin([5, 6]).astype(int)",
      "    print(f\"      日期范围: {df['start_date'].min()} ~ {df['start_date'].max()}\")",
      "    print(f\"      工作日数据: {(~df['start_is_weekend'].astype(bool)).sum()} 条\")",
      "    print(f\"      周末数据: {df['start_is_weekend'].sum()} 条\")",
      "    return df"
    ]
  },
  "duration": {
    "startLine": 63,
    "lines": [
      "def calc_duration(df):",
      "    print(\"\\n[5/7] 计算骑行时长（分钟）\")",
      "    df[\"duration_min\"] = (df[\"end_time\"] - df[\"start_time\"]).dt.total_seconds() / 60.0",
      "    # 标记 end_time 早于 start_time 的异常",
      "    neg_duration = (df[\"duration_min\"] < 0).sum()",
      "    if neg_duration > 0:",
      "        print(f\"      警告: 发现 {neg_duration} 条 end_time 早于 start_time 的记录\")",
      "    print(f\"      骑行时长统计:\\n{df['duration_min'].describe().to_string()}\")",
      "    return df"
    ]
  },
  "filter": {
    "startLine": 74,
    "lines": [
      "def filter_anomalies(df):",
      "    print(\"\\n[6/7] 异常值过滤\")",
      "",
      "    total_before = len(df)",
      "    removed = {}",
      "",
      "    # 1. 骑行时长 < 1 分钟",
      "    before = len(df)",
      "    df = df[df[\"duration_min\"] >= 1]",
      "    removed[\"<1min\"] = before - len(df)",
      "    print(f\"      剔除时长 < 1 分钟: {removed['<1min']} 条\")",
      "",
      "    # 2. 骑行时长 > 180 分钟",
      "    before = len(df)",
      "    df = df[df[\"duration_min\"] <= 180]",
      "    removed[\">180min\"] = before - len(df)",
      "    print(f\"      剔除时长 > 180 分钟: {removed['>180min']} 条\")",
      "",
      "    # 3. 坐标异常（超出上海范围）",
      "    before = len(df)",
      "    coord_mask = (",
      "        df[\"start_location_x\"].between(SH_LNG_MIN, SH_LNG_MAX)",
      "        & df[\"start_location_y\"].between(SH_LAT_MIN, SH_LAT_MAX)",
      "        & df[\"end_location_x\"].between(SH_LNG_MIN, SH_LNG_MAX)",
      "        & df[\"end_location_y\"].between(SH_LAT_MIN, SH_LAT_MAX)",
      "    )",
      "    df = df[coord_mask]",
      "    removed[\"coord\"] = before - len(df)",
      "    print(f\"      剔除坐标异常:   {removed['coord']} 条\")",
      "",
      "    # 4. 去除 end_time 早于 start_time 的记录（负数时长）",
      "    before = len(df)",
      "    df = df[df[\"duration_min\"] >= 0]",
      "    removed[\"neg_duration\"] = before - len(df)",
      "    print(f\"      剔除时长负值:   {removed['neg_duration']} 条\")",
      "",
      "    total_removed = sum(removed.values())",
      "    print(f\"      清洗前: {total_before} 条 | 清洗后: {len(df)} 条 | \"",
      "          f\"剔除率: {total_removed/total_before*100:.1f}%\")",
      "    return df"
    ]
  },
  "export": {
    "startLine": 116,
    "lines": [
      "def save_data(df, filepath):",
      "    print(f\"\\n[7/7] 保存清洗后数据: {filepath}\")",
      "    # 选择最终保留的字段",
      "    output_cols = [",
      "        \"orderid\", \"bikeid\", \"userid\",",
      "        \"start_time\", \"end_time\",",
      "        \"start_location_x\", \"start_location_y\",",
      "        \"end_location_x\", \"end_location_y\",",
      "        \"duration_min\",",
      "        \"start_date\", \"start_hour\", \"start_weekday\", \"start_is_weekend\",",
      "    ]",
      "    df[output_cols].to_csv(filepath, index=False, encoding=\"utf-8\")",
      "    print(f\"      保存 {len(df)} 条记录, {len(output_cols)} 个字段\")",
      "    return filepath"
    ]
  }
} as const;
