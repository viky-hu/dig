# window 1 初始页面——提示词

你是一位精通 Creative Coding（创意前端）和 GSAP 动画的前端架构师。请为我将本项目的初始页面改造为一个充满高级感的响应式网页，全量复刻类似 Dropbox Brand Guidelines 首页的“视口缩放画布网格”动画。

目前的初始页面我们已经实现了svg+gsap的线条与画布的动态效果，但我不清楚是否适配我们的改造需求。请先评估一下。

具体的技术栈、组件库和实现要点要求如下：

---

### 一、 技术栈与组件库要求
1. 核心框架：react，next.js
2. 动画引擎：引入 GSAP 核心库及 ScrollTrigger 插件（可以使用 CDN 链接，若有更方便的请直接提出申请）。
3. 图标/插画：内部图形一定使用 SVG 或标准的先进的图标库，绝不是传统的色块填充和传统图标
4. UI组件库：使用 Tailwind CSS
5.最佳实践：遵循现代前端开发的最佳实践，确保代码的可维护性和可扩展性，参考vercel给出的react最佳实践
6.最佳缩放：web在edge浏览器100%缩放下显示最佳

---

### 二、 核心视觉布局 (CSS Grid)
整个页面由一个固定的、全屏的容器（.canvas-container）包裹，内部是一个 5 列的 CSS Grid 网格系统。
网格之间的间距（gap）为 2px，颜色为浅灰色，形成清晰的“线条约束感”。

网格单元格（Grid Items）的精确配置如下：
| 列位置 | 行位置 | 模块名称 (Title) | 背景颜色 | 
| :--- | :--- | :--- | :--- | :--- |
| 第 1 列 | 上行 | Framework | #3A3E4E (深灰) |  
| 第 1 列 | 下行 | Iconography | #B4F239 (亮绿) |  
| 第 2 列 | 上行 | Voice & Tone | #F7D23E (亮黄) |  
| 第 2 列 | 下行 | Color | #F28424 (亮橙) |  |
| 第 3 列 | 居中(跨行) | 中心核心区块 | 动态变化 |  |
| 第 4 列 | 上行 | Logo | #6DE6ED (浅青) | 
| 第 4 列 | 下行 | Imagery | #9C2565 (梅红) | 
| 第 5 列 | 上行 | Typography | #F1382A (大红) | 
| 第 5 列 | 下行 | Motion | #D7BCEB (浅紫) | 

---

### 三、 核心动画机制与滚动逻辑 (GSAP + ScrollTrigger)

1. 初始状态 (页面未滚动)：
   - 整个 Grid 画布通过 GSAP 设置 `transform: scale(3.5)`（或更大），使其极度放大。
   - 视口（Viewport）精准锁定并居中在【第 3 列中心核心区块】上。
   - 此时【中心核心区块】样式为：纯白背景（#FFFFFF），带有细灰色边框，文本内容为亮蓝色（#0061FE）的 "At Dropbox, our Brand Guidelines help us infuse everything we make with identity."，左下角为蓝色 Logo，右下角有一个向下滚动的双箭头提示。

2. 滚动过渡状态 (Scroll Inbound)：
   - 使用 GSAP ScrollTrigger 绑定页面的原生鼠标滚轮事件（scrub: true, pin: true）。
   - 一旦开始向下滚动，【中心核心区块】瞬间或平滑发生状态反转：背景色变为亮蓝色（#0061FE），文字变为白色，内容更新为 "From icons to illustration, logos to language..."，Logo 变为白色。
   - 与此同时，整个 Grid 画布平滑地进行向后缩放（Zoom-out），从 `scale(3.5)` 平滑过渡到 `scale(1)`。
   - 随着缩放，原本在视口外的其余 8 个彩色网格单元格从屏幕边缘丝滑地向中心靠拢并成型。

3. 最终状态 (完全展开)：
   - 画布缩放至 `scale(1)`，完美适配屏幕视口。
   - 【中心核心区块】缩小至最终大小，内部文字淡出，最终仅在中心保留一个白色的 Dropbox Logo。
   - 整个页面呈现出一个紧凑、无缝隙的多颜色响应式网格墙。

---

### 四、 代码产出要求
1. 请提供结构清晰、注释完整的单文件代码（包含 `<style>` 和 `<script>` 标签）。
2. CSS 需要做好 Flexbox 或 Grid 的内部居中对齐，确保文字和插画在各个色块中完美居中或按照规则对齐。
3. GSAP 的 `scrollTrigger` 配置需要确保滚动极其丝滑，无卡顿感，且缩放的原点（transform-origin）必须锁定在中心区块。

## 具体技术实现参考

它本质上不是线条在运动或挤压色块，而是一个巨大的、静态的 CSS Grid 网格，被 GSAP 的 ScrollTrigger 像电影摄像机一样做了一次“从超级特写到全景大远景”的后退镜头（Zoom-out）拉伸。

下面为您呈上不包含任何内部细节、纯技术底层的前端工程实现全景蓝图：

1. 骨架搭建：双层视口与滚动“伪容器”
在 DOM 结构上，我们需要分离“用于触发滚动的页面高度”和“用于展示动画的固定视口”。

.scroll-container（滚动驱动层）：一个普通的 HTML 块级元素，设置极高的身长（例如 height: 300vh;）。它的唯一作用是让浏览器出现滚动条，为 GSAP 提供滚动的行程距离。

.viewport-wrapper（固定视口层）：绝对定位或固定定位（position: fixed; width: 100vw; height: 100vh; overflow: hidden;）。它像一个相框，死死钉在屏幕上，裁剪掉所有超出屏幕的内容。

.grid-canvas（巨型画布层）：躺在视口层内部，承载所有色块。它是整个动画的实际受体。

2. 战场布局：基于 CSS Grid 的完美九宫格
我们不需要用 JS 去计算每条线的位置，直接交给标准的 CSS Grid。

CSS
.grid-canvas {
  display: grid;
  grid-template-columns: 1fr 1fr 1.2fr 1fr 1fr; /* 5列布局，中心核心块略宽 */
  grid-template-rows: 1fr 1fr;               /* 2行布局 */
  gap: 2px;                                  /* 这就是视频里看到的“线条” */
  background-color: #e0e0e0;                 /* 缝隙颜色，即线色 */
  width: 100vw;
  height: 100vh;
  transform-origin: center center;           /* 极其关键：以中心为缩放原点 */
}
色块的网格定位（Grid Placement）
通过 grid-column 和 grid-row 将 9 个空色块塞进各自的坑位。其中最核心的中心块（Center Block）必须设置为：

grid-column: 3;（位于第 3 列）

grid-row: 1 / span 2;（纵向跨越 2 行，完美居中）

3. GSAP + ScrollTrigger 核心动画驱动轴
这是实现平滑过渡的“发动机”。通过 GSAP，我们将滚动条的位移（Scroll Progress）百分比，线性映射到画布的缩放比例（Scale）上。

核心步骤一：初始状态的“障眼法”
在页面刚加载、未滚动时，GSAP 立即执行初始化，将 .grid-canvas 放大：

transform: scale(4);（具体倍数取决于你希望中心块充斥全屏的程度）。

因为缩放原点在正中心（也就是中心块的位置），此时整个屏幕只能看到大大的中心块，其他 8 个彩色块由于尺寸被放大了 4 倍，全部被挤到了屏幕外，并被 .viewport-wrapper 的 overflow: hidden 完美裁剪。

核心步骤二：滚动对齐（Scrub & Pin）
创建 GSAP 空间序列：

JavaScript
gsap.timeline({
  scrollTrigger: {
    trigger: ".scroll-container", // 监听长页面的滚动
    start: "top top",
    end: "bottom bottom",
    scrub: true,                  // 关键：动画与滚轮强绑定，正向滚正向动，反向滚反向动
    pin: ".viewport-wrapper"      // 滚动时，把相框固定住，不让网页往下走
  }
})
.to(".grid-canvas", { scale: 1, ease: "none" }) // 将画布从 scale(4) 丝滑缩放到 scale(1)
随着滚轮向下，scale 逐渐从 4 变回 1。因为是向心缩放，原本在屏幕外的 8 个色块会以一种“从四周向中间聚拢成型”的视觉效果，平滑地滑入视口。

4. 核心块的“视觉反转”技术实现
视频中伴随缩放，中心块瞬间/平滑地从“白底蓝字”变成了“蓝底”。在技术上有两种实现方案：

方案 A：GSAP 属性动画（平滑渐变）
在画布缩放的 Timeline 轴上，同时加入对中心块背景色和文字颜色的动画：

JavaScript
// 在缩放的同时，零点几秒内完成颜色切换
tl.to(".center-block", { backgroundColor: "#0061FE", duration: 0.2 }, 0)
方案 B：CSS 混合模式 / 翻转遮罩（高阶视觉）
如果希望达到视频中那种“卡点反转”的凌厉感，可以使用 CSS Class 切换。
通过 ScrollTrigger 的 onUpdate 回调或 toggleActions，当滚动通过临界点（例如滚动了 5%）时，瞬间为中心块加上 .is-active 类名，利用 CSS transition 实现背景色与文字颜色的瞬间对调。

5. 纯技术层面的避坑指南
绝对居中问题：中心块在缩放过程中，必须保证其几何中心与屏幕的物理中心重合。如果 CSS Grid 的各列比例不是绝对对称的，会导致放大时中心块发生偏移。

像素失真（Antialiasing）：在高级浏览器中，大倍率缩放文本（scale(4)）可能会导致文字边缘模糊。技术解决手段是在初始状态下，让 Canvas 保持其实际最大尺寸，或者在 CSS 中开启 will-change: transform; 硬件加速。

视口单位（Viewport Units）弹性：为了确保在各种屏幕（手机、大屏、带边栏浏览器）下都能完美聚拢成型，所有色块的外层网格必须使用 100vw 和 100vh 约束，确保 scale(1) 时精准严丝合缝。


## 具体坐标参数给定

为了确保视觉还原度达到像素级，请严格遵循以下精确的几何坐标与技术参数进行架构开发：

---

### 一、 核心视觉布局与精确网格坐标 (CSS Grid Specification)

目前我们只花了四条线，只形成了九个区域，我的改造如下：

整个页面由一个固定的、全屏的容器包裹，内部是一个 5 列、3 行的非对称 CSS Grid 网格系统。
网格之间的间距（gap）固定为 2px，背景色为浅灰色（#E2E8F0），以此形成自然的“分界线条”。

#### 1. 精确网格轨迹尺寸 (Grid Tracks)
请在 CSS 中精确声明以下比例，这是根据最终状态截图标注计算得出的最完美比例：
- grid-template-columns: 19.5fr 33.5fr 4fr 23.5fr 19.5fr; /* 总计 100% */
- grid-template-rows: 45fr 7fr 48fr;                      /* 总计 100% */

#### 2. 各个色块单元格的精确坐标映射 (Grid Placement)
请严格按照以下 `grid-column` 和 `grid-row` 坐标声明 9 个全空色块（内部暂时不放置任何内容）：

| 模块名称 | grid-column 坐标 | grid-row 坐标 | 背景颜色 (Hex) | 堆叠层级 (z-index) |
| :--- | :--- | :--- | :--- | :--- |
| Framework | 1 | 1 / span 2 | #3A3E4E | 1 |
| Iconography | 1 | 3 | #B4F239 | 1 |
| Voice & Tone | 2 / span 2 | 1 | #F7D23E | 1 |
| Color | 2 / span 2 | 2 / span 2 | #F28424 | 1 (注意：此块向右下方延伸) |
| 中心核心区块 | 3 | 2 | 动态控制 (见下文) | 10 (必须覆盖在 Color 块之上) |
| Logo | 4 | 1 / span 2 | #6DE6ED | 1 |
| Imagery | 4 | 3 | #9C2565 | 1 |
| Typography | 5 | 1 / span 2 | #F1382A | 1 |
| Motion | 5 | 3 | #D7BCEB | 1 |