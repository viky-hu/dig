import type { ArtworkAnimation } from "./types";

const SPOKES = Array.from({ length: 12 }, (_, index) => index * 30);

export function DurationScene() {
  return (
    <>
      <path className="duration-road art-line" d="M18 222H105M126 222H199M220 222H302M30 237H65M246 237H289" />
      <path className="duration-frame art-line" d="M82 157L135 78 178 157H82L153 116H236L202 70H179M119 71H149M236 116L249 157" />
      <g className="duration-rear" transform="translate(82 157)">
        <circle className="duration-bezel art-paper art-outline" r="59" />
        {SPOKES.map((angle) => <path key={angle} className="duration-spoke art-line" d="M 0 -47 L 0 -13" transform={`rotate(${angle})`} />)}
        <circle className="art-solid" r="9" />
      </g>
      <g className="duration-front" transform="translate(238 157)">
        <circle className="art-paper art-outline" r="59" />
        <circle className="art-outline" r="45" />
        <path className="duration-hand art-line" d="M0 14V-35M0 0L25 14" />
        <circle className="art-solid" r="7" />
      </g>
      <g className="duration-crown" data-emerge="true">
        <path className="art-solid" d="M145 34H177V45H145ZM155 45H167V62H155Z" />
        <path className="duration-side-button art-line" d="M216 72L229 59M224 54L235 65" transform="translate(-8 10)" />
      </g>
      <path className="duration-sweep art-line" d="M161 64A75 75 0 1 1 90 162" data-draw="true" />
    </>
  );
}

export const animateDuration: ArtworkAnimation = (timeline, select) => {
  timeline
    .to(select(".duration-frame, .duration-road"), { autoAlpha: 0, y: 12, duration: 0.4 }, 0)
    .to(select(".duration-rear"), { x: 161, y: 139, duration: 1 }, 0)
    .to(select(".duration-front"), { x: 161, y: 139, duration: 1 }, 0)
    .to(select(".duration-bezel"), { attr: { r: 75 }, duration: 0.8 }, 0.1)
    .to(select(".duration-spoke"), { morphSVG: "M 0 -68 L 0 -63", duration: 0.8 }, 0.1)
    .to(select(".duration-hand"), { rotation: 265, svgOrigin: "0 0", duration: 1 }, 0)
    .to(select(".duration-crown"), { autoAlpha: 1, duration: 0.3 }, 0.55)
    .fromTo(select(".duration-sweep"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.7, immediateRender: false }, 0.3);
};
