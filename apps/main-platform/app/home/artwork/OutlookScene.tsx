import type { ArtworkAnimation } from "./types";

const REST_PATH = "M32 202L93 177 148 183 208 131 267 144";
const RISE_PATH = "M32 192L93 167 148 132 208 90 290 29";

export function OutlookScene() {
  return (
    <>
      <path className="art-line" d="M19 234H301" />
      <path className="outlook-frame art-line" d="M20 156V24H269V218" />
      {[{ x: 42, height: 30 }, { x: 104, height: 52 }, { x: 166, height: 72 }, { x: 228, height: 91 }].map(({ x, height }, index) => (
        <g key={x}>
          <rect className="outlook-bar art-solid" x={x} y={225 - height} width="39" height={height} />
          <path className="art-paper-line" d={`M${x + 10} ${225 - height + 13}h19`} />
          <path className="art-line" d={`M${x + 8} 247h23`} />
          <circle className="outlook-point art-solid" cx={[32, 93, 148, 208][index]} cy={[202, 177, 183, 131][index]} r="6" />
        </g>
      ))}
      <path className="outlook-path outlook-separator art-paper-line" d={REST_PATH} strokeWidth="13" data-emerge="true" />
      <path className="outlook-path art-line" d={REST_PATH} />
      <path className="outlook-arrow art-line" d="M245 128L267 144 244 153" />
      <path className="outlook-ray art-line" d="M278 10L287 2M304 42L316 40" data-draw="true" />
    </>
  );
}

export const animateOutlook: ArtworkAnimation = (timeline, select) => {
  timeline
    .to(select(".outlook-bar"), { scaleY: (index) => [1.3, 1.65, 1.95, 2.12][index], transformOrigin: "50% 100%", duration: 0.85, stagger: 0.05 }, 0)
    .to(select(".outlook-path"), { morphSVG: RISE_PATH, duration: 1 }, 0)
    .to(select(".outlook-separator"), { autoAlpha: 1, duration: 0.2 }, 0.55)
    .to(select(".outlook-arrow"), { morphSVG: "M263 31L290 29 286 56", duration: 1 }, 0)
    .to(select(".outlook-point"), { autoAlpha: 0, duration: 0.2 }, 0)
    .to(select(".outlook-frame"), { drawSVG: "0% 65%", duration: 0.9 }, 0)
    .fromTo(select(".outlook-ray"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.25, immediateRender: false }, 0.75);
};
