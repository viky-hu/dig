"""
空间热点聚类分析模块
====================

本模块使用 KMeans 聚类算法识别上海摩拜单车的高频使用区域。

核心思路：
  共享单车的起点位置分布并不均匀 —— 有些区域订单特别多（如地铁站、商圈），
  有些区域订单很少。通过聚类，我们可以自动发现这些"热点区域"。

算法选择理由（老师常问）：
  - KMeans 原理简单、计算快、结果容易解释
  - 对地理坐标这种连续数值型数据效果较好
  - 聚类结果可以直接可视化，便于答辩展示

数据挖掘知识点：
  - 无监督学习：数据没有标签，让算法自己发现结构
  - KMeans 步骤：初始化中心 → 分配簇 → 更新中心 → 迭代直至收敛
  - K 值选择：肘部法则（elbow method）
  - 聚类 vs 分类：分类有标签，聚类无标签

"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib
from pathlib import Path
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

# ============================================================
# 字体设置：让图表中的中文正常显示
# ============================================================
matplotlib.rcParams['font.sans-serif'] = ['SimHei', 'Microsoft YaHei', 'DejaVu Sans']
matplotlib.rcParams['axes.unicode_minus'] = False

# ============================================================
# 路径配置
# ============================================================
PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "main" / "data-mining"
CLEANED_DATA = DATA_DIR / "cleaned_mobike.csv"
OUTPUT_DIR = DATA_DIR / "clustering_charts"


# ============================================================
# 1. 数据加载
# ============================================================
def load_data(filepath):
    """
    读取清洗后的数据，只保留 needed 字段以减少内存占用。

    空间聚类只需要用到起点经纬度坐标：
      - start_location_x: 起点经度（longitude）
      - start_location_y: 起点纬度（latitude）
    经纬度是平面坐标系，适合直接计算欧氏距离。
    """
    print("[加载数据]")
    df = pd.read_csv(filepath, usecols=["start_location_x", "start_location_y"])
    print(f"  数据规模: {len(df)} 条记录")
    print(f"  坐标范围: lng=[{df['start_location_x'].min():.3f}, {df['start_location_x'].max():.3f}], "
          f"lat=[{df['start_location_y'].min():.3f}, {df['start_location_y'].max():.3f}]")

    # 检查缺失值：理论上清洗后没有缺失，但做一下防御性检查
    missing = df.isnull().sum()
    if missing.any():
        print(f"  发现缺失值，删除前: {len(df)} 条")
        df = df.dropna()
        print(f"  删除后: {len(df)} 条")
    else:
        print("  无缺失值")

    return df


# ============================================================
# 2. 肘部法则确定最佳 K 值
# ============================================================
def elbow_method(X):
    """
    使用肘部法则（Elbow Method）辅助选择聚类数量 K。

    原理：
      随着 K 增大，每个簇内的样本距离中心更近，惯性（inertia，即
      所有样本到其簇中心的距离平方和）会不断下降。
      但当 K 超过真实簇数后，下降速度会明显变缓，形成一个"肘点"。

    操作：
      计算 K=1 到 K=12 的 inertia，绘制折线图，观察肘点位置。
    """
    print("\n[肘部法则] 计算 K=1~12 的聚类惯性")

    inertias = []
    K_range = range(1, 13)

    # 注意：KMeans 每次运行可能得到不同结果（因为初始中心随机），
    # 设置 random_state=42 保证结果可复现。
    # n_init='auto' 让算法自动选择初始化次数。
    for k in K_range:
        kmeans = KMeans(n_clusters=k, random_state=42, n_init='auto')
        kmeans.fit(X)
        inertias.append(kmeans.inertia_)
        print(f"  K={k:2d}, inertia={kmeans.inertia_:,.0f}")

    # ----- 绘制肘部法则图 -----
    fig, ax = plt.subplots(figsize=(10, 5))
    ax.plot(K_range, inertias, marker='o', linestyle='-', color='steelblue', linewidth=2, markersize=6)
    ax.set_xlabel("聚类数量 K", fontsize=12)
    ax.set_ylabel("惯性（Inertia）", fontsize=12)
    ax.set_title("肘部法则 —— 不同 K 值对应的聚类惯性", fontsize=14, fontweight="bold")
    ax.set_xticks(list(K_range))
    ax.grid(alpha=0.3)

    # 标记肘点位置（通常在 K=3~6 之间）
    # 这里标注建议的 K 值范围，让读者理解如何选择
    ax.annotate("肘点区域\n（K=4~6）", xy=(5, inertias[4]), xytext=(7, inertias[4] * 1.3),
                arrowprops=dict(arrowstyle="->", color="red"), fontsize=11, color="red")

    save_path = OUTPUT_DIR / "elbow_method.png"
    fig.savefig(save_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"\n  图表已保存: {save_path}")

    return inertias


# ============================================================
# 3. KMeans 聚类
# ============================================================
def kmeans_clustering(X, n_clusters=6):
    """
    执行 KMeans 聚类，为每个坐标点分配簇标签。

    参数:
      X: 坐标数据（n_samples, 2），列为 [经度, 纬度]
      n_clusters: 聚类数量

    为什么 K=6？
      根据肘部法则，K=6 左右惯性下降趋缓，且 6 个区域
      便于在报告中解释（如：市中心、浦东、闵行等）。

    注意：
      经纬度本身已经是相似量级的值（121.x, 31.x），
      不需要标准化。但如果不同特征的量级差异大，
      就需要用 StandardScaler 标准化。
    """
    print(f"\n[KMeans聚类] K={n_clusters}")

    # 创建 KMeans 模型
    # - n_clusters: 要聚成几类
    # - random_state: 随机种子，保证结果可复现
    # - n_init: 用不同初始化运行 10 次，选最优结果
    # - max_iter: 单次运行的最大迭代次数
    kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10, max_iter=300)

    # fit_predict = 训练 + 预测一次完成
    labels = kmeans.fit_predict(X)

    # 聚类中心坐标（经度, 纬度）
    centers = kmeans.cluster_centers_

    print(f"  聚类完成:")
    for i in range(n_clusters):
        count = (labels == i).sum()
        pct = count / len(labels) * 100
        print(f"    簇 {i}: 中心 ({centers[i, 0]:.3f}, {centers[i, 1]:.3f}), "
              f"订单量 {count:,} ({pct:.1f}%)")

    return labels, centers


# ============================================================
# 4. 可视化聚类结果
# ============================================================
def plot_clusters(X, labels, centers, n_clusters=6):
    """
    绘制聚类结果散点图，展示热点区域的分布。

    X: 原始坐标数据
    labels: 每个点的簇标签（0~K-1）
    centers: 聚类中心坐标
    n_clusters: 聚类数量

    可视化要点：
      1. 不同簇用不同颜色区分
      2. 聚类中心用大号星标突出显示
      3. 添加图例说明每个簇对应的区域特征

    图1: 聚类散点图（含中心点）
    """
    print("\n[可视化] 绘制聚类结果")

    # ---- 使用预定义的配色方案 ----
    # 颜色数量要与 K 匹配，超过 10 个簇时自动循环
    colors = plt.cm.Set1(np.linspace(0, 1, n_clusters))

    # ---- 图1: 聚类散点总览图 ----
    fig1, ax1 = plt.subplots(figsize=(12, 8))

    # 绘制每个簇的点，用不同颜色显示
    for i in range(n_clusters):
        mask = labels == i
        ax1.scatter(X[mask, 0], X[mask, 1],
                    c=[colors[i]], label=f"热点区域 {i+1}",
                    s=5, alpha=0.5)

    # 用星标突出显示聚类中心
    ax1.scatter(centers[:, 0], centers[:, 1],
                c='black', marker='*', s=300, edgecolors='white',
                linewidth=1.5, label='聚类中心', zorder=5)

    # 在每个中心点旁边标注簇编号和订单量占比
    for i in range(n_clusters):
        count = (labels == i).sum()
        pct = count / len(labels) * 100
        ax1.annotate(f"  {i+1}\n  ({pct:.1f}%)",
                     (centers[i, 0], centers[i, 1]),
                     fontsize=9, fontweight="bold",
                     bbox=dict(boxstyle="round,pad=0.3", facecolor="white", edgecolor="gray", alpha=0.8))

    ax1.set_xlabel("经度 (Longitude)", fontsize=12)
    ax1.set_ylabel("纬度 (Latitude)", fontsize=12)
    ax1.set_title(f"上海摩拜共享单车起点热点区域（KMeans, K={n_clusters}）",
                  fontsize=14, fontweight="bold")
    ax1.legend(fontsize=9, loc='upper right')
    ax1.grid(alpha=0.2)

    save_path1 = OUTPUT_DIR / f"cluster_map_k{n_clusters}.png"
    fig1.savefig(save_path1, dpi=200, bbox_inches="tight")
    plt.close(fig1)
    print(f"  图表已保存: {save_path1}")

    # ---- 图2: 各热点区域订单量柱状图 ----
    fig2, ax2 = plt.subplots(figsize=(10, 5))
    cluster_counts = pd.Series(labels).value_counts().sort_index()
    cluster_names = [f"热点区域 {i+1}" for i in range(n_clusters)]
    bar_colors = [colors[i] for i in range(n_clusters)]

    bars = ax2.bar(cluster_names, cluster_counts.values, color=bar_colors, edgecolor="white")

    # 在柱子上方标注具体数值和占比
    total = len(labels)
    for bar, count in zip(bars, cluster_counts.values):
        pct = count / total * 100
        ax2.text(bar.get_x() + bar.get_width() / 2., bar.get_height(),
                f'{count:,}\n({pct:.1f}%)',
                ha='center', va='bottom', fontsize=11, fontweight="bold")

    ax2.set_xlabel("热点区域", fontsize=12)
    ax2.set_ylabel("订单量", fontsize=12)
    ax2.set_title(f"各热点区域订单量分布（K={n_clusters}）", fontsize=14, fontweight="bold")
    ax2.grid(axis="y", alpha=0.3)

    save_path2 = OUTPUT_DIR / f"cluster_counts_k{n_clusters}.png"
    fig2.savefig(save_path2, dpi=200, bbox_inches="tight")
    plt.close(fig2)
    print(f"  图表已保存: {save_path2}")


# ============================================================
# 5. 聚类结果分析
# ============================================================
def analyze_clusters(X, labels, centers, n_clusters=6):
    """
    对聚类结果进行定量分析，生成易于理解的统计表格。

    分析指标：
      1. 每个簇的订单量和占比
      2. 聚类中心坐标（可在地图上查找对应区域）
      3. 簇内点到中心的平均距离（衡量区域紧凑程度）
    """
    print("\n" + "=" * 60)
    print("  聚类结果分析")
    print("=" * 60)

    from sklearn.metrics import pairwise_distances

    results = []
    for i in range(n_clusters):
        mask = labels == i
        cluster_points = X[mask]
        count = len(cluster_points)
        pct = count / len(X) * 100

        # 计算簇内点到中心的平均距离（单位为度）
        # 1 度 ≈ 111km（赤道处），在上海地区约 105km（纬度方向）或 92km（经度方向）
        distances = pairwise_distances(cluster_points, centers[i].reshape(1, -1))
        avg_distance = distances.mean()

        results.append({
            "热点区域": f"区域 {i+1}",
            "订单量": count,
            "占比(%)": round(pct, 1),
            "中心经度": round(centers[i, 0], 4),
            "中心纬度": round(centers[i, 1], 4),
            "平均距离(度)": round(avg_distance, 4),
        })

    result_df = pd.DataFrame(results)
    result_df = result_df.sort_values("订单量", ascending=False)

    print("\n  各热点区域统计（按订单量排序）:")
    print(result_df.to_string(index=False))

    return result_df


# ============================================================
# 6. 扩展分析：不同 K 值的对比
# ============================================================
def compare_k_values(X, k_values=[4, 6, 8]):
    """
    对比不同 K 值的聚类结果，展示 K 对聚类效果的影响。

    这个分析可以帮助我们理解为什么最终选择某个 K 值，
    也是在答辩中展示"我们考虑了多种方案"的加分项。
    """
    print("\n" + "=" * 60)
    print("  不同 K 值聚类效果对比")
    print("=" * 60)

    fig, axes = plt.subplots(1, 3, figsize=(18, 6))
    colors = plt.cm.Set1(np.linspace(0, 1, max(k_values)))

    for idx, k in enumerate(k_values):
        # 对每个 K 值运行聚类
        kmeans = KMeans(n_clusters=k, random_state=42, n_init='auto')
        labels = kmeans.fit_predict(X)

        # 绘制子图
        ax = axes[idx]
        for i in range(k):
            mask = labels == i
            ax.scatter(X[mask, 0], X[mask, 1],
                       c=[colors[i]], s=3, alpha=0.4)

        # 标记中心点
        ax.scatter(kmeans.cluster_centers_[:, 0], kmeans.cluster_centers_[:, 1],
                   c='black', marker='*', s=200, edgecolors='white', linewidth=1)

        ax.set_title(f"K = {k}", fontsize=13, fontweight="bold")
        ax.set_xlabel("经度" if idx == 0 else "", fontsize=10)
        ax.set_ylabel("纬度" if idx == 0 else "", fontsize=10)
        ax.grid(alpha=0.2)

    plt.suptitle("不同 K 值聚类效果对比", fontsize=15, fontweight="bold")
    plt.tight_layout()

    save_path = OUTPUT_DIR / "k_comparison.png"
    fig.savefig(save_path, dpi=200, bbox_inches="tight")
    plt.close(fig)
    print(f"\n  图表已保存: {save_path}")


# ============================================================
# 主函数
# ============================================================
def main():
    print("=" * 60)
    print("  上海摩拜共享单车空间热点聚类分析")
    print("=" * 60)

    # 创建输出目录
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 1. 加载数据
    df = load_data(CLEANED_DATA)

    # 提取特征矩阵 X（二维：经度, 纬度）
    # 这是 KMeans 的输入数据，每行代表一个订单的起点位置
    X = df[["start_location_x", "start_location_y"]].values
    print(f"  特征矩阵形状: {X.shape}")

    # 2. 肘部法则（判断最佳 K 值）
    inertias = elbow_method(X)

    # 3. 主聚类：使用 K=6
    # 选择依据：肘部法则显示 K=6 后 inertia 下降趋缓，
    # 且 6 个热点区域在地理上可解释（市中心各区 + 浦东 + 外围）
    K = 6
    labels, centers = kmeans_clustering(X, n_clusters=K)

    # 4. 可视化
    plot_clusters(X, labels, centers, n_clusters=K)

    # 5. 结果分析
    result_df = analyze_clusters(X, labels, centers, n_clusters=K)

    # 6. 保存带聚类标签的数据（供后续模块使用）
    df["cluster_label"] = labels
    tagged_path = DATA_DIR / "mobike_with_clusters.csv"
    df.to_csv(tagged_path, index=False)
    print(f"\n  带聚类标签的数据已保存: {tagged_path}")

    # 7. 备选 K 值对比（扩展分析）
    compare_k_values(X, k_values=[4, 6, 8])

    print("\n" + "=" * 60)
    print("  空间热点聚类分析完成！")
    print(f"  所有图表已保存至: {OUTPUT_DIR}")
    print("=" * 60)


if __name__ == "__main__":
    main()
