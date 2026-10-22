# 数据与离线分析

本目录保留原始样本、唯一一套 Python 分析脚本及随附结果。网页使用已经整理好的本地 TypeScript 数据；无需运行这些脚本即可演示网页。

## 数据来源与字段

项目原附说明将来源指向 [Heywhale 摩拜共享单车数据集](https://www.heywhale.com/mw/dataset/5d315ebbcf76a60036e565bf)，作者标注为“单眼皮小脑斧”，发布年份为 2019；原说明标注 CC0、脱敏研究用途，并描述为“2017 年 8 月”。本地文件实际时间字段为 **2016 年 8 月**，分析以随附 CSV 为准；来源页描述不能直接作为本地文件年份、字段及规模的依据。此处记录原附说明，未额外核验来源页的当前状态。

`mobike_shanghai_sample_updated.csv` 包含 102,361 条订单、9 个字段，不含原来源说明提及的 `track` 轨迹字段。

| 字段 | 含义 |
| --- | --- |
| `orderid` | 订单编号 |
| `bikeid` | 单车编号 |
| `userid` | 用户编号 |
| `start_time`、`end_time` | 骑行开始与结束时间 |
| `start_location_x`、`start_location_y` | 起点经度与纬度 |
| `end_location_x`、`end_location_y` | 终点经度与纬度 |

`main/data-mining/cleaned_mobike.csv` 为 102,210 条清洗后订单，增加时长、日期、小时、星期和周末标记等字段；`mobike_with_clusters.csv` 保存对应顺序的起点坐标与 `cluster_label`，不是包含全部原始字段的副本。

## 运行分析

推荐 Python 3.11 或更新版本，在**仓库根目录**执行。Python 分析与前端依赖独立：

```bash
python -m venv .venv
```

Windows PowerShell 激活：

```powershell
.\.venv\Scripts\Activate.ps1
```

macOS / Linux 激活：

```bash
source .venv/bin/activate
```

若 Windows 禁止执行激活脚本，可不激活，改用 `.\.venv\Scripts\python.exe` 替代下列每个 `python`。

```bash
python -m pip install -r "数据挖掘-期末/requirements.txt"
python "数据挖掘-期末/main/data-mining/data_cleaning.py"
python "数据挖掘-期末/main/data-mining/eda_analysis.py"
python "数据挖掘-期末/main/data-mining/clustering.py"
python "数据挖掘-期末/main/data-mining/od_analysis.py"
```

依赖清单限定兼容的主版本范围，没有恢复历史分析环境的精确版本。不同依赖版本可能影响聚类结果，提交材料中的统计以随附结果为准。

| 脚本 | 输入 | 输出 |
| --- | --- | --- |
| `data_cleaning.py` | 原始 CSV | 覆盖 `cleaned_mobike.csv`，清洗过程打印到终端 |
| `eda_analysis.py` | 清洗 CSV | 统计摘要，`eda_charts/` 中的图表 |
| `clustering.py` | 清洗 CSV 起点 | K=6 标签 CSV，`clustering_charts/` 中的图表及 K 值对比 |
| `od_analysis.py` | 清洗 CSV 起终点 | 独立聚类后的 OD 矩阵、热门流向，`od_charts/` 中的图表 |

清洗需先运行，后三个分析脚本均读取清洗 CSV。重跑会覆盖同名结果 CSV。脚本基于自身位置定位文件，无需修改磁盘绝对路径；绘图优先使用系统的黑体或微软雅黑，无中文字体的系统需要安装中文字体以正常显示图中文字。

## 随附结果与复现边界

- `main/data-mining/charts/`：保留本次提交所依据的 11 张分析结果图，按 EDA、聚类、OD 分类。
- `main/data-mining/outputs/`：保留四份历史运行输出，含统计数字和当时机器上的绝对路径。这些路径是历史记录，无需在当前机器上存在。
- 脚本重跑的图片默认输出到 `main/data-mining/eda_charts/`、`clustering_charts/`、`od_charts/`，不会自动替换 `charts/` 中的随附结果；重跑目录已忽略。
- 文本统计默认打印到终端，不会自动更新 `outputs/`；需要保存时可自行重定向。
- OD 脚本独立拟合聚类模型，与热点脚本的初始化设置不同，不能直接混用区域编号。网页 OD 矩阵与历史 OD 输出尚未形成统一自动导出链路，细节见[项目报告附录](../reports/DIG项目介绍与报告.md)。
- 网页清洗实验室中的代码摘录对应本目录 `data_cleaning.py` 的真实内容，保留其文件路径及行号。

系统运行、技术栈及项目报告入口见[根目录 README](../README.md)。
