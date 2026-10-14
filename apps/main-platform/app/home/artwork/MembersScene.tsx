import type { ArtworkAnimation } from "./types";

const CARDS = [{ x: 37, y: 72, angle: -12 }, { x: 122, y: 51, angle: 10 }, { x: 190, y: 91, angle: -5 }];

export function MembersScene() {
  return (
    <>
      <path className="members-network art-line" d="M58 49H160L262 49V216H160L58 216ZM160 49V216" data-draw="true" />
      {CARDS.map(({ x, y, angle }, index) => (
        <g key={index} className="members-card" transform={`translate(${x} ${y}) rotate(${angle} 39 60)`}>
          <rect className="art-paper art-outline" width="78" height="127" />
          <path className="art-line" d="M13 15H28M13 109H43" />
          <circle className="art-solid" cx="39" cy="48" r="17" />
          <path className="art-solid" d="M12 91V84C12 58 66 58 66 84V91Z" />
          <path className="art-paper-line" d="M39 69V89" />
          <circle className="art-solid" cx="62" cy="109" r="4" />
        </g>
      ))}
      <g className="members-nodes" data-emerge="true">
        {[58, 160, 262].map((x) => <circle key={x} className="art-solid" cx={x} cy="216" r="7" />)}
        <circle className="art-solid" cx="160" cy="49" r="7" />
      </g>
      <path className="art-line" d="M20 242H300" />
    </>
  );
}

export const animateMembers: ArtworkAnimation = (timeline, select) => {
  timeline
    .to(select(".members-card"), { x: (index) => 19 + index * 102, y: 70, rotation: 0, duration: 0.9, stagger: 0.05 }, 0)
    .fromTo(select(".members-network"), { drawSVG: "0%" }, { drawSVG: "100%", duration: 0.65, immediateRender: false }, 0.35)
    .to(select(".members-nodes"), { autoAlpha: 1, duration: 0.25 }, 0.75);
};
