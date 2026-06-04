# DIG

`DIG` 是一个面向数据挖掘结果展示的前端 monorepo。
它的目标不是在浏览器里重新做数据分析，而是把已经完成的数据挖掘成果整理为结构清晰、可持续迭代的展示平台。

## 项目定位

- 平台职责：展示和讲述数据挖掘结论
- 非目标：在前端直接承担数据清洗、建模、聚类或 OD 分析
- 数据分析资产：位于 `数据挖掘-期末/` 目录，前端负责消费其中整理后的结论、图表与叙事素材

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
