# DIG · 骑迹上海

上海摩拜共享单车动态规律分析可视化展示平台。项目包含完整的 Next.js 交互展示源码、Python 离线分析脚本、原始样本、分析结果和项目报告。

系统使用本地数据与静态配置展示分析结果，无业务后端、数据库或 API 密钥要求。网页运行不需要安装 Python；Python 环境仅用于重新执行离线分析。

## 下载与运行

从 [GitHub 主线](https://github.com/viky-hu/dig/tree/main) 选择 **Code → Download ZIP**，或[直接下载 main 压缩包](https://github.com/viky-hu/dig/archive/refs/heads/main.zip)。解压后在含 `package.json` 的 `dig-main` 目录打开终端，文件夹无需放在特定磁盘或改名。

推荐使用 **Node.js 24 LTS**，包管理器固定为 **pnpm 11.5.0**（与 `package.json` 一致）。先安装 Node.js，再执行：

```bash
node --version
npm install --global pnpm@11.5.0
pnpm --version
pnpm install --frozen-lockfile
pnpm dev
```

打开 <http://localhost:3000>。首次安装依赖需要联网；安装完成后，字体、地图轮廓和展示数据从项目本地加载。按 `Ctrl+C` 停止服务。

生产模式演示：

```bash
pnpm build
pnpm --filter main-platform start --port 3000
```

若端口被占用，可将生产启动命令中的 `3000` 改为 `3001`，再访问对应端口。修改源码后需要重新构建生产版本。

## 展示内容

首页通过滚动动画和八个色块组织入口，点击进入对应模块；各模块支持图表探索、筛选或过程播放。

| 模块 | 内容 |
| --- | --- |
| 项目总览 | 研究背景、样本规模、主要发现 |
| 数据清洗与可信度 | 七步源码回放、异常过滤、执行与暂停 |
| 时间规律 | 小时与日期趋势、工作日和周末对比 |
| 骑行时长 | 时长分布与区间占比 |
| 空间热点聚类 | K=6 热点区域、区域选择与地图探索 |
| 区域流向分析 | OD 流向、区域内与跨区切换、流向排名 |
| 成员介绍 | 项目协作与成员分工 |
| 结论与展望 | 研究结论、分析局限与未来方向 |

## 源码结构与技术栈

```text
dig-main/
├── apps/main-platform/
│   ├── app/
│   │   ├── home/                   # 首页、主题插画、滚动动画
│   │   ├── insights/               # 八模块、窗口转场、地图与图表
│   │   │   └── cleaning/           # 数据清洗交互实验室与源码摘录
│   │   ├── fonts/                  # 本地字体及其来源说明
│   │   ├── page.tsx                # 首页入口
│   │   ├── layout.tsx              # 全局布局
│   │   └── globals.css             # 全局与模块样式
│   └── tests/                      # OD 流线几何测试
├── packages/
│   ├── config-eslint/              # 共享 ESLint 配置
│   ├── typescript-config/          # 共享 TypeScript 配置
│   ├── ui-components/              # 共用窗口与视觉组件
│   └── utils/                      # 数学与随机数工具
├── 数据挖掘-期末/
│   ├── README.md                   # 数据说明、字段与分析复现步骤
│   ├── requirements.txt            # Python 分析依赖
│   ├── mobike_shanghai_sample_updated.csv
│   └── main/data-mining/
│       ├── data_cleaning.py
│       ├── eda_analysis.py
│       ├── clustering.py
│       ├── od_analysis.py
│       ├── cleaned_mobike.csv
│       ├── mobike_with_clusters.csv
│       ├── charts/                 # 随附分析结果图
│       └── outputs/                # 随附分析过程与统计输出
├── reports/                        # 项目报告与 AI 使用说明
├── package.json
├── pnpm-lock.yaml                  # 依赖锁文件，安装时应保留
├── pnpm-workspace.yaml
├── turbo.json
└── eslint.config.mjs
```

前端采用 **Next.js 16.2.6、React 19.2.6、TypeScript 6.0.3、Tailwind CSS 4**，由 **pnpm workspace + Turborepo 2.9.16** 管理。**GSAP / @gsap/react** 负责首页、窗口和回放动效，**SVG** 承载图表、地图与插画，**Three.js / OGL / postprocessing** 提供视觉组件。各包的精确依赖以清单与锁文件为准。

页面、业务数据配置和交互在 `apps/main-platform`；共享组件与配置在 `packages`。前端消费已经整理进 TypeScript 的统计结果，Python 脚本重新运行后不会自动更新网页配置。

## 数据与报告

原始样本为 **102,361 条订单、9 个字段**，本地时间字段覆盖 **2016 年 8 月**；清洗后保留 **102,210 条**，剔除 **151 条**。完整数据说明及复现命令见[数据分析说明](数据挖掘-期末/README.md)。原始数据、清洗数据、聚类数据、图表和文本结果均随源码提交，不需要额外下载。

- [项目介绍与报告（Markdown）](reports/DIG项目介绍与报告.md)
- [项目介绍与报告（Word）](reports/DIG项目介绍与报告.docx)
- [人工智能工具使用情况说明](reports/人工智能工具使用情况说明.md)（团队填写草稿，真实性确认以团队核对为准）

历史分析输出保留原有统计与路径记录，具体文件在当前项目中的位置以本 README 和分析说明为准。报告附录记录了时长占比、热点舍入以及 OD 区域编号与前端矩阵之间的口径差异；这些差异尚未在本次目录整理中修改。数据来源页的年份与本地样本也存在差异，详见数据说明。

## 代码检查

在根目录安装依赖后执行：

```bash
pnpm build
pnpm type-check
pnpm lint
pnpm --filter main-platform test:flow
```

首次执行时先构建，再做类型检查，使 Next.js 生成需要的路由类型文件。主应用使用 Next.js App Router，详情路由为 `/insights/insight-01` 至 `/insights/insight-08`。

当前锁定的 ESLint 10.4.1 与 typescript-eslint 8.46.2 组合存在工具兼容问题：`pnpm lint` 可能在加载配置时抛出 `Class extends value undefined`。这不属于页面运行错误，构建、类型检查和流线测试可分别执行；本次提交整理保留原有依赖版本。

提交包保留源码、依赖锁文件、数据、报告、字体及必要配置；`node_modules`、`.next`、日志、缓存、虚拟环境和本机 IDE/AI 配置不纳入 GitHub 下载包。下载包需要按上述步骤安装依赖和构建，不能通过双击 HTML 文件启动。
