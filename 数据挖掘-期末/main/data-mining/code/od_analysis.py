"""
OD 流向分析模块
================

分析从"哪个区域 → 哪个区域"的单车骑行流量。

核心逻辑：
  1. 对起点坐标做 KMeans 聚类（K=6），划分出 6 个区域
  2. 用同样的聚类模型对终点坐标打标签（保证区域定义一致）
  3. 统计 起点区域 → 终点区域 的订单量
  4. 找出最热门的 Top 10 骑行流向

"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib
from pathlib import Path
from sklearn.cluster import KMeans

# ============================================================
# 字体设置
# ============================================================
matplotlib.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans']
matplotlib.rcParams['axes.unicode_minus'] = False

# ============================================================
# 路径配置
# ============================================================
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "main" / "data-mining"
CLEANED_DATA = DATA_DIR / "cleaned_mobike.csv"
OUTPUT_DIR = DATA_DIR / "od_charts"


def load_data(filepath):
    """读取清洗数据，只取坐标字段"""
    usecols = ["start_location_x", "start_location_y", "end_location_x", "end_location_y"]
    df = pd.read_csv(filepath, usecols=usecols)
    print(f"加载数据: {len(df)} 条记录")
    return df


def cluster_regions(df):
    """
    用 KMeans（K=6）对起点坐标聚类，划分出 6 个区域。
    然后用同样的模型给终点坐标打标签。
    """
    print("\n[聚类] 对起终点打区域标签（K=6）")

    # 提取坐标矩阵
    start_coords = df[["start_location_x", "start_location_y"]].values
    end_coords = df[["end_location_x", "end_location_y"]].values

    # 对起点坐标训练 KMeans 模型
    kmeans = KMeans(n_clusters=6, random_state=42, n_init='auto')
    start_labels = kmeans.fit_predict(start_coords)

    # 用同一模型预测终点的区域（保证区域定义一致）
    end_labels = kmeans.predict(end_coords)

    # 统计各区域订单量
    for i in range(6):
        start_count = (start_labels == i).sum()
        end_count = (end_labels == i).sum()
        print(f"  区域 {i+1}: 起点 {start_count:>7,} 单 | 终点 {end_count:>7,} 单")

    return start_labels, end_labels


def build_od_matrix(start_labels, end_labels):
    """
    构造 OD 流量矩阵。
    OD 矩阵 = Origin-Destination Matrix，行=起点区域，列=终点区域。
    矩阵中的每个值 = 从区域 i 骑到区域 j 的订单数。
    """
    print("\n[OD矩阵] 统计区域间流量")

    n_regions = 6
    od_matrix = np.zeros((n_regions, n_regions), dtype=int)

    for i in range(n_regions):
        for j in range(n_regions):
            # 统计 起点在 i 且 终点在 j 的订单数
            od_matrix[i][j] = ((start_labels == i) & (end_labels == j)).sum()

    return od_matrix


def print_top_flows(od_matrix, top_n=10):
    """打印 Top N 热门流向"""
    n = od_matrix.shape[0]
    flows = []

    # 展平矩阵，记录每条流向
    for i in range(n):
        for j in range(n):
            if od_matrix[i][j] > 0:
                flows.append({
                    "排名": 0,
                    "起点区域": i + 1,
                    "终点区域": j + 1,
                    "订单量": od_matrix[i][j],
                    "占比(%)": 0.0,
                })

    flows.sort(key=lambda x: x["订单量"], reverse=True)

    total = sum(f["订单量"] for f in flows)
    for idx, f in enumerate(flows[:top_n]):
        f["排名"] = idx + 1
        f["占比(%)"] = round(f["订单量"] / total * 100, 1)

    result = pd.DataFrame(flows[:top_n])
    result = result.set_index("排名")

    print(f"\n  Top {top_n} 热门骑行流向:")
    print(result.to_string())

    return result


def plot_od_heatmap(od_matrix):
    """绘制 OD 流量热力矩阵"""
    n = od_matrix.shape[0]

    fig, ax = plt.subplots(figsize=(8, 6))

    # 用 imshow 画热力图
    im = ax.imshow(od_matrix, cmap="YlOrRd", aspect="auto")

    # 在每个格子里标注数值
    for i in range(n):
        for j in range(n):
            val = od_matrix[i][j]
            color = "white" if val > od_matrix.max() * 0.6 else "black"
            ax.text(j, i, f"{val:,}", ha="center", va="center", fontsize=10, color=color)

    ax.set_xticks(range(n))
    ax.set_yticks(range(n))
    ax.set_xticklabels([f"区域 {i+1}" for i in range(n)])
    ax.set_yticklabels([f"区域 {i+1}" for i in range(n)])
    ax.set_xlabel("终点区域", fontsize=12)
    ax.set_ylabel("起点区域", fontsize=12)
    ax.set_title("上海摩拜 OD 流量热力图", fontsize=14, fontweight="bold")

    plt.colorbar(im, ax=ax, label="订单量")
    plt.tight_layout()

    save_path = OUTPUT_DIR / "od_heatmap.png"
    fig.savefig(save_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"\n图表已保存: {save_path}")


def plot_flow_chart(od_matrix):
    """绘制 Top 5 流向水平柱状图（更直观）"""
    n = od_matrix.shape[0]
    flows = []

    for i in range(n):
        for j in range(n):
            flows.append({"from": i + 1, "to": j + 1, "count": od_matrix[i][j]})

    flows.sort(key=lambda x: x["count"], reverse=True)
    top5 = flows[:5]

    labels = [f"区域 {f['from']} → 区域 {f['to']}" for f in top5]
    values = [f["count"] for f in top5]

    fig, ax = plt.subplots(figsize=(10, 5))
    bars = ax.barh(labels[::-1], values[::-1], color="steelblue", edgecolor="white")
    for bar, val in zip(bars, values[::-1]):
        ax.text(bar.get_width() + 200, bar.get_y() + bar.get_height() / 2,
                f"{val:,}", ha="left", va="center", fontsize=10, fontweight="bold")

    ax.set_xlabel("订单量", fontsize=12)
    ax.set_title("Top 5 热门骑行流向", fontsize=14, fontweight="bold")
    ax.grid(axis="x", alpha=0.3)

    save_path = OUTPUT_DIR / "od_top5.png"
    fig.savefig(save_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"图表已保存: {save_path}")


def main():
    print("=" * 50)
    print("  OD 流向分析")
    print("=" * 50)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    df = load_data(CLEANED_DATA)
    start_labels, end_labels = cluster_regions(df)
    od_matrix = build_od_matrix(start_labels, end_labels)
    top_flows = print_top_flows(od_matrix, top_n=10)
    plot_od_heatmap(od_matrix)
    plot_flow_chart(od_matrix)

    print("\n" + "=" * 50)
    print("  OD 分析完成！")
    print(f"  图表已保存至: {OUTPUT_DIR}")
    print("=" * 50)


if __name__ == "__main__":
    main()
