"""
探索性数据分析（EDA）模块
======================

本模块对清洗后的摩拜单车数据进行探索性分析，包括：
1. 基础统计：总订单数、用户数、单车数、骑行时长等
2. 时间规律：小时级/日级订单量趋势、工作日 vs 周末对比
3. 骑行时长分布分析

所有图表保存为 PNG 文件，供报告和前端使用。

"""# 数据挖掘课程中，EDA 是理解数据的第一步。
# 通过统计指标和可视化图表，我们可以快速发现数据中的规律和模式。
# 老师常问：为什么要做 EDA？—— 因为只有理解了数据，才能选择合适的模型和分析方法。

import pandas as pd
import matplotlib.pyplot as plt
import matplotlib
from pathlib import Path

# ============================================================
# 字体设置：让图表中的中文正常显示
# 注意：不同系统需要调整字体名称。Windows 通常用 'SimHei' 或 'Microsoft YaHei'
# ============================================================
matplotlib.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans']
matplotlib.rcParams['axes.unicode_minus'] = False  # 解决负号显示为方块的问题

# ============================================================
# 路径配置
# 使用 pathlib 来构建路径，这样可以跨平台（Windows/Mac/Linux）运行
# ============================================================
PROJECT_ROOT = Path(__file__).resolve().parents[2]  # 从 main/data-mining 向上两级到项目根目录
DATA_DIR = PROJECT_ROOT / "main" / "data-mining"
CLEANED_DATA = DATA_DIR / "cleaned_mobike.csv"
OUTPUT_DIR = DATA_DIR / "eda_charts"  # 图表输出目录


# ============================================================
# 1. 数据加载
# ============================================================
def load_data(filepath):
    """
    读取清洗后的数据。
    清洗阶段已经处理了缺失值和异常值，这里直接使用即可。
    """
    print(f"[加载数据] {filepath}")
    df = pd.read_csv(filepath)

    # 确保时间字段是 datetime 类型（虽然清洗阶段已转换，但 CSV 保存后需要重新解析）
    df["start_time"] = pd.to_datetime(df["start_time"])
    df["end_time"] = pd.to_datetime(df["end_time"])

    print(f"  数据规模: {df.shape[0]} 行, {df.shape[1]} 列")
    print(f"  时间范围: {df['start_time'].min()} ~ {df['start_time'].max()}")
    return df


# ============================================================
# 2. 基础统计
# ============================================================
def basic_statistics(df):
    """
    计算数据集的基础统计指标，包括：
    - 总订单数：衡量数据规模
    - 唯一用户数：反映用户覆盖范围
    - 唯一单车数：反映车辆投放规模
    - 骑行时长统计：了解出行时长分布
    """
    print("\n" + "=" * 50)
    print("  基础统计")
    print("=" * 50)

    stats = {
        "总订单数": len(df),
        "唯一用户数": df["userid"].nunique(),
        "唯一单车数": df["bikeid"].nunique(),
        "平均骑行时长（分钟）": round(df["duration_min"].mean(), 2),
        "中位数骑行时长（分钟）": round(df["duration_min"].median(), 2),
        "最小时长（分钟）": int(df["duration_min"].min()),
        "最大时长（分钟）": int(df["duration_min"].max()),
    }

    # 逐行打印统计结果，对齐输出格式
    for key, value in stats.items():
        print(f"  {key}: {value:,}" if isinstance(value, int) else f"  {key}: {value}")

    return stats


# ============================================================
# 3. 小时级订单量分析
# ============================================================
def hourly_analysis(df):
    """
    按小时聚合订单量，分析一天中共享单车的使用规律。

    方法：提取 start_hour 字段（0~23），统计每个小时的订单数量。

    预期结论：
    - 早高峰（7-9点）和晚高峰（17-19点）会有明显的订单量 peak
    - 这符合通勤出行的规律：人们骑车去地铁站/公交站
    """
    print("\n" + "=" * 50)
    print("  小时级订单量分析")
    print("=" * 50)

    # groupby 是 EDA 中最常用的聚合操作
    # 这里按 start_hour 分组，统计每个小时的订单数量
    hourly_counts = df.groupby("start_hour").size()

    print("\n  各小时订单量:")
    for hour, count in hourly_counts.items():
        bar = "█" * (count // 200)  # 简易文本柱状图，便于快速查看
        print(f"    {hour:02d}:00  {count:6d}  {bar}")

    # ----- 可视化 -----
    fig, ax = plt.subplots(figsize=(12, 6))
    # 柱状图：x 轴为小时（0~23），y 轴为订单量
    bars = ax.bar(hourly_counts.index, hourly_counts.values, color="steelblue", edgecolor="white")

    # 在柱子上方标注具体数值（方便答辩时直接看数字）
    for bar in bars:
        height = bar.get_height()
        ax.text(bar.get_x() + bar.get_width() / 2., height,
                f'{int(height):,}', ha='center', va='bottom', fontsize=8)

    ax.set_xlabel("小时", fontsize=12)
    ax.set_ylabel("订单量", fontsize=12)
    ax.set_title("每小时订单量分布（2017年8月上海摩拜）", fontsize=14, fontweight="bold")
    ax.set_xticks(range(24))
    ax.set_xticklabels([f"{h}:00" for h in range(24)], rotation=45)
    ax.grid(axis="y", alpha=0.3)

    # 保存图片，bbox_inches='tight' 确保标签不被截断
    save_path = OUTPUT_DIR / "hourly_orders.png"
    fig.savefig(save_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"\n  图表已保存: {save_path}")

    return hourly_counts


# ============================================================
# 4. 日级订单量分析
# ============================================================
def daily_analysis(df):
    """
    按天聚合订单量，观察整个月的使用趋势。

    方法：将 start_date 转换为 datetime 类型后，按天 groupby 统计。

    预期结论：
    - 工作日订单量高于周末（因为通勤需求）
    - 如果有特殊日期（如下雨天），订单量可能会有明显下降
    """
    print("\n" + "=" * 50)
    print("  日级订单量分析")
    print("=" * 50)

    # 将 start_date 转为 datetime 类型，方便按天聚合和绘图
    df["start_date"] = pd.to_datetime(df["start_date"])
    daily_counts = df.groupby(df["start_date"].dt.date).size()
    daily_counts.index = pd.to_datetime(list(daily_counts.index))

    print(f"\n  总天数: {len(daily_counts)} 天")
    print(f"  日均订单量: {daily_counts.mean():.0f} 单/天")
    print(f"  单日最高: {daily_counts.max():,} 单")
    print(f"  单日最低: {daily_counts.min():,} 单")

    # ----- 可视化 -----
    fig, ax = plt.subplots(figsize=(14, 5))
    ax.plot(daily_counts.index, daily_counts.values,
            marker="o", linestyle="-", color="coral", markersize=4, linewidth=1.5)

    ax.set_xlabel("日期", fontsize=12)
    ax.set_ylabel("订单量", fontsize=12)
    ax.set_title("每日订单量变化（2017年8月上海摩拜）", fontsize=14, fontweight="bold")
    ax.grid(alpha=0.3)
    fig.autofmt_xdate()  # 自动旋转日期标签，避免重叠

    save_path = OUTPUT_DIR / "daily_orders.png"
    fig.savefig(save_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"\n  图表已保存: {save_path}")

    return daily_counts


# ============================================================
# 5. 工作日 vs 周末对比分析
# ============================================================
def weekday_weekend_analysis(df):
    """
    对比工作日和周末的订单量差异。

    方法：利用清洗阶段生成的 start_is_weekend 字段（0=工作日, 1=周末）。
    分别统计工作日和周末的：
    1. 总订单量对比
    2. 小时级订单量曲线对比（看高峰时段是否不同）

    预期结论：
    - 工作日有明显的早晚双峰（通勤驱动）
    - 周末订单更分散，中午可能是高峰（休闲出行）
    - 周末总量通常低于工作日
    """
    print("\n" + "=" * 50)
    print("  工作日 vs 周末对比分析")
    print("=" * 50)

    # 分组统计
    weekend_counts = df.groupby("start_is_weekend").size()
    print(f"\n  工作日订单量: {weekend_counts[0]:,} ({weekend_counts[0]/weekend_counts.sum()*100:.1f}%)")
    print(f"  周末订单量:   {weekend_counts[1]:,} ({weekend_counts[1]/weekend_counts.sum()*100:.1f}%)")

    # ----- 图表1: 总量对比柱状图 -----
    fig1, ax1 = plt.subplots(figsize=(8, 5))
    labels = ["工作日", "周末"]
    colors = ["steelblue", "coral"]
    bars = ax1.bar(labels, [weekend_counts[0], weekend_counts[1]], color=colors, edgecolor="white", width=0.5)
    for bar in bars:
        height = bar.get_height()
        ax1.text(bar.get_x() + bar.get_width() / 2., height,
                f'{int(height):,}\n({height/weekend_counts.sum()*100:.1f}%)',
                ha='center', va='bottom', fontsize=12, fontweight="bold")
    ax1.set_ylabel("订单量", fontsize=12)
    ax1.set_title("工作日 vs 周末订单总量对比", fontsize=14, fontweight="bold")
    ax1.grid(axis="y", alpha=0.3)

    save_path1 = OUTPUT_DIR / "weekday_vs_weekend_total.png"
    fig1.savefig(save_path1, dpi=200, bbox_inches="tight")
    plt.close(fig1)
    print(f"\n  图表已保存: {save_path1}")

    # ----- 图表2: 小时级曲线对比（关键图表！可以看到双峰差异） -----
    # 分别计算工作日和周末各小时的平均订单量
    weekday_hourly = df[df["start_is_weekend"] == 0].groupby("start_hour").size()
    weekend_hourly = df[df["start_is_weekend"] == 1].groupby("start_hour").size()

    # 由于工作日和周末的天数不同，需要归一化到"日均"再对比
    #   - 2017年8月有 23 个工作日 + 8 个周末日
    #   - 这样对比才公平，否则工作日总量天然高于周末
    weekday_days = 23  # 2017年8月的工作日天数
    weekend_days = 8   # 2017年8月的周末天数
    weekday_avg = weekday_hourly / weekday_days
    weekend_avg = weekend_hourly / weekend_days

    fig2, ax2 = plt.subplots(figsize=(12, 6))
    ax2.plot(weekday_avg.index, weekday_avg.values,
             marker="o", linestyle="-", color="steelblue", linewidth=2, label="工作日（日均）")
    ax2.plot(weekend_avg.index, weekend_avg.values,
             marker="s", linestyle="--", color="coral", linewidth=2, label="周末（日均）")

    # 标注早晚高峰区域（方便答辩时快速指出关键发现）
    ax2.axvspan(7, 9, alpha=0.1, color="green", label="早高峰时段 (7-9点)")
    ax2.axvspan(17, 19, alpha=0.1, color="orange", label="晚高峰时段 (17-19点)")

    ax2.set_xlabel("小时", fontsize=12)
    ax2.set_ylabel("日均订单量", fontsize=12)
    ax2.set_title("工作日 vs 周末小时级订单量对比（日均）", fontsize=14, fontweight="bold")
    ax2.set_xticks(range(24))
    ax2.set_xticklabels([f"{h}:00" for h in range(24)], rotation=45)
    ax2.legend(fontsize=11)
    ax2.grid(alpha=0.3)

    save_path2 = OUTPUT_DIR / "weekday_vs_weekend_hourly.png"
    fig2.savefig(save_path2, dpi=200, bbox_inches="tight")
    plt.close(fig2)
    print(f"  图表已保存: {save_path2}")

    return weekday_avg, weekend_avg


# ============================================================
# 6. 骑行时长分布分析
# ============================================================
def duration_analysis(df):
    """
    分析骑行时长的分布特征。

    方法：绘制直方图，查看骑行时长的集中区间。

    预期结论：
    - 大部分骑行集中在 5-20 分钟（短途出行）
    - 分布呈右偏（长尾）：少量骑行超过 30 分钟
    - 这符合共享单车"最后一公里"的定位
    """
    print("\n" + "=" * 50)
    print("  骑行时长分布分析")
    print("=" * 50)

    # 使用 describe() 快速获得关键分位数
    desc = df["duration_min"].describe()
    print(f"\n  骑行时长描述性统计:")
    for key, value in desc.items():
        print(f"    {key}: {value:.2f}" if isinstance(value, float) else f"    {key}: {value}")

    # 分析不同时长区间的占比（分段统计，便于报告中使用）
    bins = [0, 5, 10, 15, 20, 30, 60, 120, 180]
    labels = ["<5min", "5-10", "10-15", "15-20", "20-30", "30-60", "60-120", ">120min"]
    df["duration_bucket"] = pd.cut(df["duration_min"], bins=bins, labels=labels, right=False)
    bucket_counts = df["duration_bucket"].value_counts().sort_index()

    print(f"\n  骑行时长分段统计:")
    for label, count in bucket_counts.items():
        pct = count / len(df) * 100
        bar = "█" * int(pct / 2)
        print(f"    {label:>8}: {count:6,}  ({pct:5.1f}%)  {bar}")

    # ----- 可视化 -----
    fig, axes = plt.subplots(1, 2, figsize=(14, 5))

    # 左图：直方图（展示整体分布形态）
    ax1 = axes[0]
    ax1.hist(df["duration_min"], bins=50, color="steelblue", edgecolor="white", alpha=0.8)
    ax1.set_xlabel("骑行时长（分钟）", fontsize=11)
    ax1.set_ylabel("频数", fontsize=11)
    ax1.set_title("骑行时长分布直方图", fontsize=13, fontweight="bold")
    ax1.axvline(df["duration_min"].median(), color="red", linestyle="--",
                label=f"中位数={df['duration_min'].median():.0f}min")
    ax1.axvline(df["duration_min"].mean(), color="orange", linestyle="--",
                label=f"均值={df['duration_min'].mean():.1f}min")
    ax1.legend()
    ax1.grid(alpha=0.3)

    # 右图：分段饼图（展示各区间占比）
    ax2 = axes[1]
    colors_pie = plt.cm.Set3(range(len(bucket_counts)))
    wedges, texts, autotexts = ax2.pie(
        bucket_counts.values, labels=bucket_counts.index, autopct="%1.1f%%",
        colors=colors_pie, startangle=90
    )
    ax2.set_title("骑行时长区间占比", fontsize=13, fontweight="bold")

    plt.tight_layout()
    save_path = OUTPUT_DIR / "duration_distribution.png"
    fig.savefig(save_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"\n  图表已保存: {save_path}")

    return bucket_counts


# ============================================================
# 主函数
# ============================================================
def main():
    print("=" * 50)
    print("  摩拜共享单车探索性数据分析")
    print("=" * 50)

    # 创建图表输出目录（如果不存在的话）
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. 加载数据
    df = load_data(CLEANED_DATA)

    # 2. 基础统计
    stats = basic_statistics(df)

    # 3. 小时级分析
    hourly_counts = hourly_analysis(df)

    # 4. 日级分析
    daily_counts = daily_analysis(df)

    # 5. 工作日 vs 周末
    weekday_avg, weekend_avg = weekday_weekend_analysis(df)

    # 6. 骑行时长分析
    bucket_counts = duration_analysis(df)

    print("\n" + "=" * 50)
    print("  EDA 分析完成！")
    print(f"  所有图表已保存至: {OUTPUT_DIR}")
    print("=" * 50)


if __name__ == "__main__":
    main()
