# DIG Agent Memory

本文件是 `dig` 仓库的项目级规则记忆文件。

## Priority
- 当 `agent.md` 与 `README.md`、普通说明文档、临时笔记冲突时，优先遵循 `agent.md`。
- 若后续出现更深层目录下的 `agent.md`，则采用“就近优先”：
  - 仓库根目录 `agent.md` 管全局规则。
  - 子目录 `agent.md` 可以在本目录及子目录内补充或收窄规则。
  - 子目录规则优先于根目录规则。

## Progressive Loading
- 读取上下文时采用渐进式加载，先读最小必要范围，再按需深入，减少无效上下文。
- 默认加载顺序：
  - 当前任务直接相关文件
  - 当前目录或最近父目录的 `agent.md`
  - 相关入口文件、样式文件、依赖文件
  - 只有在仍不够判断时，再读取 `README.md`、设计文档、计划文档
- 不要先全量阅读仓库文档；优先根据任务定位最短依赖链。

## Current Homepage Baseline
- 首页入口：`apps/main-platform/app/page.tsx`
- 首页主组件：`apps/main-platform/app/home/HomeIntroPage.tsx`
- 首页样式：`apps/main-platform/app/globals.css`
- 背景动画组件：`apps/main-platform/app/beams-background.tsx`
- 首页动画常量：`apps/main-platform/app/home/shared/animation.ts`
- 首页坐标常量：`apps/main-platform/app/home/shared/coords.ts`
- 首页 SVG 几何工具：`apps/main-platform/app/home/utils.ts`

## Homepage Tech Stack
- 框架：Next.js 16 App Router
- 运行时：React 19 客户端组件
- 动画：GSAP
- 动态背景：Three.js 自定义 shader beams
- 视觉主体：SVG + `foreignObject` + CSS
- 样式组织：全局样式中承载首页专用类名，避免对现有页面引入额外设计发挥
- 字体策略：
  - 首页标题和首屏视觉优先使用 `DingTalk JinBuTi`
  - 全站基础中文回退仍可使用 `Noto Sans SC`、`PingFang SC`、`Microsoft YaHei`

## Mature Dynamic Practices
- 该首页属于“高还原动态首屏”，后续维护优先保持视觉和时序稳定，不轻易重构结构。
- 动画拆分遵循两阶段：
  - Phase 1：蓝线描边、logo 绘制、白色色块展开、标题淡入
  - Phase 2：线框收缩、白块翻转为蓝块、标题淡出、蓝块保持空白
- 坐标、尺寸、线条位置统一放在 `shared/coords.ts`，不要把关键几何数字散落到组件内。
- GSAP easing 放在 `shared/animation.ts`，避免每个页面重复定义动画曲线。
- SVG 属性更新统一走工具函数，避免在 timeline 的 `onUpdate` 中直接散写 DOM 操作。
- 动态背景作为独立组件维护，不把 Three.js 逻辑塞进首页组件。
- 对“照搬型”页面，优先保留原类名、原结构、原时序，只删除业务内容，不随意重设计。

## Homepage Content Rules
- 当前首页白色色块标题固定为两行：
  - 第一行：`上海摩拜单车`
  - 第二行：`数据挖掘分析报告`
- 第一行字号略大，第二行略小。
- 蓝色色块阶段保持空白，不放登录、按钮、输入框或说明文字。

## Change Discipline
- 修改首页时，优先检查是否破坏以下稳定点：
  - `viewBox` 与坐标比例
  - GSAP 两阶段时序
  - 蓝白翻转关系
  - 标题排版层级
  - beams 背景透明度与层级
- 若只是改文案、字号、行距，尽量只动 `HomeIntroPage.tsx` 和 `globals.css`。
- 若只是改动画节奏，优先动 `shared/animation.ts` 或 timeline 参数，不改 SVG 结构。
