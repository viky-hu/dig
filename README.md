# DIG

`DIG` 是一个面向数据挖掘结果展示的前端 monorepo。
它的目标不是在浏览器里重新做数据分析，而是把已经完成的数据挖掘成果整理为结构清晰、可持续迭代的展示平台。

## 项目定位

- 平台职责：展示和讲述数据挖掘结论
- 非目标：在前端直接承担数据清洗、建模、聚类或 OD 分析
- 数据分析资产：位于 `数据挖掘-期末/` 目录，前端负责消费其中整理后的结论、图表与叙事素材

## 八个展示区规划

首页由八个色块组成，每个色块只呈现模块名称，使用艺术化大字放在色块左上角，可横排或竖排。首页暂不添加额外图案；色块点击后进入对应展示页，展示页必须有可操作性，不能做成只放图和文字的 PPT 式页面。

| 展示区 | 核心问题 | 页面内容 | 组件与交互 | 前端数据来源 |
| --- | --- | --- | --- | --- |
| 项目总览 | 这个项目研究了什么，核心发现是什么？ | 项目一句话、数据时间范围、总订单数、用户数、单车数、3 条核心发现 | 指标总览、核心发现卡、进入其它模块的总控入口 | 清洗与 EDA 输出摘要、本地结构化配置 |
| 数据清洗与可信度 | 数据是否可靠，哪些记录被剔除了？ | 原始 102361 条、清洗后 102210 条、4 条异常过滤规则、151 条剔除明细、剔除率、工作日/周末数量 | 数据漏斗、规则卡、剔除明细展开、工作日/周末切换 | `数据清洗.txt`、清洗脚本输出、本地明细配置 |
| 时间规律 | 什么时候骑得最多？ | 小时级订单量、每日趋势、工作日 vs 周末、早晚高峰解释 | 折线图/面积图、工作日/周末筛选、小时区间刷选、高峰标注 | `eda分析.txt`、时间聚合结果 |
| 骑行时长 | 共享单车是不是短途接驳工具？ | 平均时长、中位数、时长分布、5 到 20 分钟占比、长尾区间 | 直方图、分段占比、均值/中位数参考线、异常长尾悬停解释 | `eda分析.txt`、骑行时长分布结果 |
| 空间热点聚类 | 骑行主要发生在哪些地方？ | 热点区域、聚类中心、区域订单量、K=6 聚类结果 | 仿地图坐标图或真实地图、聚类点云、区域选择、聚类中心高亮 | `聚类分析.txt`、带聚类标签数据摘要 |
| 区域流向分析 | 车辆是在跨区流动，还是区域内循环？ | 区域节点、Top N 流向、流入流出平衡、区域内循环比例 | 节点连线图、Top N 控制、流入/流出切换、区域点击联动 | OD 流向分析输出、流向矩阵摘要 |
| 区域画像对比 | 不同热点区域有什么差异？ | 不同区域的订单量、活跃时段、平均时长、净流入/净流出特征 | 区域对比面板、雷达/条形对比、区域多选、与热点/流向页联动 | 聚类结果、EDA 指标、OD 指标的前端汇总 |
| 结论、局限与展望 | 最终能得出什么，哪里还不够？ | 最终结论、局限说明、未来可补的数据与分析方向、小组成员 credits | 结论时间线、局限卡、未来方向列表、结尾 credits 动画 | 报告文本、成员信息、本地结构化配置 |

## 展示页开发原则

- 只做前端，不新增后端接口；数据先整理为本地 JSON、TS 配置或静态资源，由前端消费。
- 每个展示页都要回答一个明确问题，并提供至少一种操作：筛选、悬停查看、点击钻取、区域选择、Top N 控制或图表联动。
- 全站优先保留统一筛选能力：工作日/周末、小时区间、区域选择。具体模块可以按需要使用其中一部分。
- 图表之间要尽量形成联动：例如选中一个区域后，热点、流向、区域画像中的对应信息同步高亮。
- 动效为结构服务。GSAP 用于页面转场、聚焦、联动反馈和 SVG 可视化渲染，不只做开场装饰。
- 后续开发按模块逐个推进；每次只改一个模块或一个明确方面，先做最重要的模块作为范本，再复用到其它模块。

## 开发约束与防崩清单

本节是 `agent.md` 中项目级约束的 README 摘要。实际开发时仍以 `agent.md` 为最高优先级；如果 README、临时笔记和 `agent.md` 冲突，优先遵守 `agent.md`。

- 每次只改一个模块或一个明确方面。默认做最小必要改动，不重写整页，不顺手重构其它模块，不把一次模块开发扩大成全站改造。
- 修改前先确认边界：本次是内容页、首页网格、过渡动画、数据结构、样式细节还是文档。边界不清时先收窄范围，再动代码。
- 首页是当前系统的视觉与动效基座，必须保留已有的滚轮绘制、自行车线稿、中心蓝块、hover 黑色反馈、八色块标题和色块几何约束。
- 任何涉及首页色块到详情页的打开/关闭，都视为 shared-element transition。共享元素同一时刻只能有一个可见源，不能让 React、CSS 和 GSAP 同时争夺同一对象的显示状态。
- 过渡动画必须使用单一状态机：打开、进入完成、关闭、恢复首页最终态要有明确阶段。动画未结束前锁定重入；延迟回调、`requestAnimationFrame`、timeout 和 GSAP hook 都要有取消机制或版本校验。
- 使用 GSAP 时优先 `gsap.context()` 和单条主 timeline；多个 tween 触碰同一目标时显式使用 `overwrite: "auto"`。使用 `from()` / `fromTo()` 时检查是否需要 `immediateRender: false`。
- 若关闭详情页时禁用了 ScrollTrigger 或滚动 pinning，恢复时必须同步时间轴进度和真实滚动位置。仅仅 `renderProgress(1)` 不够，否则首页可能回到半滚动状态。
- 关闭详情页时要立即清理 hover 图标、自行车路径、菜单线条等临时视觉状态，不能等蓝块已经移动后才让残留图案消失。
- 每次改动过渡、首页布局或共享动效后，至少检查三种路径：快速连续点击不同模块、打开后立刻关闭、等待动画结束后再打开/关闭。
- 构建校验作为收尾习惯：前端逻辑改动后优先跑 `tsc --noEmit` 和 `next build`；如果只是文档改动，可以不跑构建，但要说明未跑的原因。

## 当前技术栈

- 包管理：`pnpm 11.5.0`
- Monorepo：`Turborepo 2.9.16`
- 主应用：`Next.js 16.2.6`
- UI 框架：`React 19.2.6`
- 类型系统：`TypeScript 6.0.3`
- 样式：`Tailwind CSS 4`
- 动效与图形：`GSAP`、`three`、`ogl`、`postprocessing`

## 目录结构

```text
dig/
├── apps/
│   └── main-platform/         # 前端主应用，负责页面、路由、展示编排
├── packages/
│   ├── config-eslint/         # 统一 ESLint Flat Config 片段
│   ├── typescript-config/     # 统一 TypeScript 基础配置
│   ├── ui-components/         # 可复用展示组件与视觉模块
│   └── utils/                 # 纯工具函数
├── 数据挖掘-期末/             # 数据挖掘过程、分析结果与原始项目资料
├── package.json
├── pnpm-workspace.yaml
└── turbo.json
```

## Monorepo 约定

- `apps/` 只放可独立运行或部署的应用
- `packages/` 只放共享能力，不承载页面级业务流程
- 展示逻辑、页面编排、数据叙事在 `apps/main-platform`
- 通用 UI、背景特效、可视化容器等沉淀在 `packages/ui-components`
- 纯函数与无业务上下文工具放在 `packages/utils`
- TypeScript 与 ESLint 规则优先在共享包里维护，再由应用统一消费

## 关键配置策略

### pnpm

- 根目录通过 `packageManager: "pnpm@11.5.0"` 固定包管理器版本
- workspace 只包含 `apps/*` 与 `packages/*`
- 不在根目录安装业务依赖

推荐使用 `corepack`：

```bash
corepack enable
corepack pnpm --version
```

如果要给某个 workspace 单独安装依赖，使用 `--filter`：

```bash
corepack pnpm --filter main-platform add lucide-react
corepack pnpm --filter @dig/ui-components add -D eslint
```

### Turborepo

- 根脚本只负责任务编排
- `build` 依赖上游包的 `build`
- `dev` 关闭缓存并保持常驻
- 全局依赖包含根清单、锁文件、Turbo 配置和共享 TS 配置，减少缓存漂移

### TypeScript

- `packages/typescript-config/base.json`：最基础的严格模式和模块解析约定
- `packages/typescript-config/nextjs.json`：给 Next.js 应用使用
- `packages/typescript-config/library.json`：给共享库使用

### ESLint

- 仓库根使用 `eslint.config.mjs` 作为统一入口
- `packages/config-eslint` 输出可复用的 Flat Config 片段
- `apps/main-platform` 使用 Next 规则
- `packages/ui-components` 和 `packages/utils` 使用共享库规则

## 常用命令

在仓库根目录执行：

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm build
corepack pnpm lint
corepack pnpm type-check
```

单独运行某个 workspace：

```bash
corepack pnpm --filter main-platform dev
corepack pnpm --filter @dig/ui-components type-check
```

## 当前状态

这轮整理主要解决了这些问题：

- 去掉 `latest` 与占位配置，提升可复现性
- 统一 Monorepo 的脚本入口与版本基线
- 将 `next lint` 切换为标准 `eslint` CLI，贴合 `Next.js 16`
- 修复主应用首页与 metadata 的中文乱码
- 重写 README，使其和当前仓库结构一致

## 已知限制

- 当前环境下 `pnpm` 依赖 `corepack` 拉取对应版本包管理器
- 如果网络或执行权限受限，`corepack pnpm install`、`lint`、`build` 可能无法在当前会话完整验证
- `packages/config-eslint` 新增的依赖需要执行一次安装后，Flat Config 才能真正跑通

## 后续建议

- 先完成一次 `corepack pnpm install`，同步锁文件并验证新 ESLint 链路
- 再补充 `apps/main-platform` 的真实数据结果页面
- 将 `数据挖掘-期末` 中可展示的图表、摘要与关键结论整理为结构化内容源
