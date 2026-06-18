# DIG Agent Memory
## Change Discipline (Hard Rule)
- 每次只改一个模块或一个明确方面。
- 默认只做最小改动，不重写整页、不顺手重构其它模块。
- 如果一个请求会牵动多个页面、全局动画或转场链路，先停下来拆分，再逐步改。
- 任何可能影响现有交互、动画、布局稳定性的改动，都要先确认边界再动手。

## Verification Boundary (Hard Rule)
- 禁止唤起浏览器测试 UI，不要使用 control-in-app-browser、无头浏览器或打开本地端口做视觉检查。
- 忽略 `next-env.d.ts` 等 Next.js / 构建流程自动生成或自动修改的产物，不要为了它们反复还原、解释或提交。
- 验证方式收敛为静态检查：优先使用 TypeScript type-check 和 Next build 日志确认代码逻辑与语法正确性。
- 视觉对齐、滚动动画观感、UI 细节由人类开发者在外部宿主浏览器中手动确认。

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

## GSAP React/SVG Best Practices
- 在 React 中优先使用 `@gsap/react` 的 `useGSAP()`，若暂未接入，则至少使用 `gsap.context()` 包裹动画创建与清理，避免组件重渲染后残留旧 tween、旧 timeline、旧事件回调。
- 只要出现“同一个视觉对象跨组件、跨 DOM、跨容器继续运动”的需求，优先按 shared-element handoff 处理，首选 GSAP `Flip`，不要先用手工 `visibility` 切换和克隆元素硬拼时序。
- shared-element handoff 必须先挂载目标元素，再捕获源状态并执行 `Flip.from(...)`；不要让源元素先隐藏、目标元素后出现，否则极易产生跳帧和闪烁。
- 同一阶段只能有一个可见性真源。不要让 `autoAlpha`、`visibility`、React mount/unmount、CSS 默认态同时控制同一对象的显示状态。
- 若同一视觉对象在交接阶段需要缩放、位移、淡出，请尽量都放进同一条 timeline 或同一个 `Flip` 过程里，避免一个对象走 SVG `attr`，另一个替身走 CSS transform。
- 对 `from()` / `fromTo()` 保持警惕：GSAP 的 `immediateRender` 默认行为可能提前写入初始态。凡是延迟插入 timeline 的 handoff tween，都要显式判断是否需要 `immediateRender: false`。
- 对同一目标的重叠 tween，优先统一使用单条主 timeline，或显式设置 `overwrite: "auto"`，不要依赖多个零散 `to()` 互相抢属性。
- transform 相关状态尽量全部交给 GSAP 管理。需要重置时优先用 `clearProps`，不要混用 DOM 行内样式、CSS 初始值和手工字符串拼接的 transform。
- SVG 的缩放中心、旋转中心统一使用 GSAP 管理的 `transformOrigin` / `svgOrigin`，避免在交接过程中手动切 origin 造成位置抖动。
- 当前项目里，首页中心蓝块及其自行车图案与 insight 窗口左侧 45px 按钮之间的切换，一律视为 shared-element handoff；后续新增类似模块时，优先复用 `data-flip-id` 约定和 Flip 方案。

## Homepage Content Rules
- 当前首页白色色块标题固定为两行：
  - 第一行：`上海摩拜单车`
  - 第二行：`数据挖掘分析报告`
- 第一行字号略大，第二行略小。
- 蓝色色块阶段保持空白，不放登录、按钮、输入框或说明文字。

## Transition Best Practices
- For homepage <-> detail shared-element transitions, use one transition state machine as the single source of truth. Do not let React mount state, CSS hover state, and GSAP timelines race each other on the same element.
- Lock re-entry from the moment a panel is opened until the enter or close sequence fully completes. During that lock, ignore repeated open requests and ignore close-before-open-finish edge cases unless the feature is explicitly designed for interruption.
- Always split the handoff into four phases: sample source geometry -> hide source immediately -> launch target animation -> cleanup and restore final visibility. Do not blur these phases together with ad hoc delayed callbacks.
- Every delayed callback, `requestAnimationFrame`, timeout, or deferred GSAP hook in the transition path must carry a cancel mechanism or version check so stale callbacks cannot replay after a newer transition starts.
- Shared elements are only allowed one visible source at a time. If the homepage center tile is hidden for handoff, its bike icon and hover residue must also be cleared synchronously.
- Prefer `gsap.context()` plus one primary timeline per enter or exit path. If multiple tweens touch the same target, use `overwrite: "auto"` deliberately.
- Review `from()` and `fromTo()` carefully. For late-inserted handoff tweens, default to checking whether `immediateRender: false` is needed to prevent pre-write flashes.
- When closing, clear hover-only icon states immediately before the return animation starts. Do not let menu/bike icon morphs linger after the blue tile has already moved.
- If ScrollTrigger or scroll pinning is disabled during a modal-style transition, record exactly which triggers were disabled and re-enable those same triggers during cleanup.
- Default policy for this project: stabilize the current SVG/GSAP structure first. Do not introduce broad transition rewrites or full Flip migrations unless a specific module truly requires it.
## Transition Checklist
- Before editing a transition, confirm the request is limited to one module or one aspect and avoid opportunistic rewrites.
- Check whether the change introduces a second visibility controller for the same object.
- Check whether rapid open -> close -> open can produce stale callbacks.
- Check whether hover art, bike paths, or menu lines are explicitly cleared on close.
- Check whether the provider or controller unlocks only after the visual sequence is actually complete.
- After each transition change, test rapid repeated clicks, immediate close after open, and reopen after full settle.
## Failure Lessons
- A visual `renderProgress(1)` is not enough if the homepage still has a live scroll-driven timeline behind it. The timeline progress and the ScrollTrigger scroll position must be synchronized to the same final state, or the page can snap back to a half-scrolled layout as soon as triggers wake up again.
- Disabling ScrollTrigger during an overlay transition is only half of the job. If cleanup restores visibility first and re-enables triggers later without syncing progress, old scroll state can overwrite the manually restored final layout.
- Shared-element stability problems often came from multiple truths existing at once: provider phase, GSAP tween state, DOM visibility, hover icon state, and scroll progress. Future fixes should first ask which one is the real source of truth and remove the others from the same moment in time.
- Close-path bugs were easier to miss than open-path bugs because the homepage looked visually correct for a frame or two before stale state pulled it away. Future testing must include "open module -> close immediately -> confirm final homepage is still fully settled".
- Rapid interaction failures usually were not pure performance problems. In this project they were more often ordering problems: stale callbacks, unsynchronized trigger state, or hover residue surviving longer than the blue tile itself.
## Change Discipline
- 修改首页时，优先检查是否破坏以下稳定点：
  - `viewBox` 与坐标比例
  - GSAP 两阶段时序
  - 蓝白翻转关系
  - 标题排版层级
  - beams 背景透明度与层级
- 若只是改文案、字号、行距，尽量只动 `HomeIntroPage.tsx` 和 `globals.css`。
- 若只是改动画节奏，优先动 `shared/animation.ts` 或 timeline 参数，不改 SVG 结构。
