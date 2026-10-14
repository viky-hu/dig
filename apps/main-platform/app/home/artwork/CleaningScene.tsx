import type { ArtworkAnimation } from "./types";

const PARTICLES = [
  [40, 41], [104, 25], [164, 49], [218, 29], [69, 89], [131, 76], [194, 91], [246, 72],
];

export function CleaningScene() {
  return (
    <>
      <path className="art-line" d="M28 120H272L231 165H69ZM69 165V224H231V165" />
      <path className="art-line" d="M57 135H243M70 149H230M81 120L107 165M126 120L138 165M174 120L162 165M219 120L193 165" />
      <path className="clean-rail art-line" d="M21 236H279" />
      {PARTICLES.map(([x, y], index) => (
        <g key={index} className="clean-particle" transform={`translate(${x} ${y})`}>
          {index % 2 ? <circle className="art-solid" r="9" /> : <rect className="art-solid" x="-9" y="-9" width="18" height="18" />}
        </g>
      ))}
      <g className="clean-reject" transform="translate(273 97)">
        <path className="art-solid" d="M0-12L12 0 0 12-12 0Z" />
      </g>
      <g className="clean-pocket" data-emerge="true">
        <path className="art-paper art-outline" d="M268 184H305V224H268Z" />
        <path className="art-line" d="M278 196L295 213M295 196L278 213" />
      </g>
      <path className="clean-check art-line" d="M130 66L146 82 176 47" data-draw="true" />
    </>
  );
}

export const animateCleaning: ArtworkAnimation = (timeline, select) => {
  timeline
    .to(select(".clean-particle"), {
      x: (index) => 90 + (index % 4) * 40,
      y: (index) => 186 + Math.floor(index / 4) * 25,
      rotation: (index) => index % 2 ? 90 : 0,
      duration: 0.78,
      stagger: 0.025,
    }, 0)
    .to(select(".clean-reject"), { x: 286, y: 204, rotation: 90, duration: 0.75 }, 0.1)
    .to(select(".clean-pocket"), { autoAlpha: 1, duration: 0.25 }, 0.5)
    .fromTo(select(".clean-check"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.3, immediateRender: false }, 0.7);
};
