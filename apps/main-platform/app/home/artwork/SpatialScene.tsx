import type { ArtworkAnimation } from "./types";

const POINTS = [[65, 72], [155, 56], [252, 85], [98, 139], [218, 151], [62, 210], [174, 222]];

export function SpatialScene() {
  return (
    <>
      <path className="art-outline" d="M22 30H111V88H22ZM128 30H204V88H128ZM222 30H298V88H222ZM22 108H73V170H22ZM90 108H204V170H90ZM222 108H298V170H222ZM22 190H111V242H22ZM128 190H204V242H128ZM222 190H298V242H222Z" />
      <path className="spatial-street art-line" d="M8 99H309M119 16V251M213 16V251M8 181H309" />
      {POINTS.map(([x, y], index) => (
        <g key={index} className="spatial-particle" transform={`translate(${x} ${y})`}>
          <circle className="art-solid" r={index % 2 ? 9 : 12} />
          <circle className="art-paper" r="3" />
        </g>
      ))}
      <g className="spatial-hotspot" data-emerge="true">
        <circle className="art-paper art-outline" cx="163" cy="136" r="75" />
        <circle className="art-outline" cx="163" cy="136" r="52" />
        <circle className="art-outline" cx="163" cy="136" r="28" />
        <circle className="art-solid" cx="163" cy="136" r="9" />
        <path className="art-line" d="M163 50V70M163 202V222M77 136H97M229 136H249" />
      </g>
      <g className="spatial-lock art-line">
        <path className="spatial-corner" d="M49 64V40H73" />
        <path className="spatial-corner" d="M253 40H277V64" />
        <path className="spatial-corner" d="M49 208V232H73" />
        <path className="spatial-corner" d="M253 232H277V208" />
      </g>
    </>
  );
}

export const animateSpatial: ArtworkAnimation = (timeline, select) => {
  timeline
    .to(select(".spatial-particle"), { x: 163, y: 136, scale: 0.3, duration: 0.72, stagger: 0.035 }, 0)
    .to(select(".spatial-hotspot"), { autoAlpha: 1, duration: 0.4 }, 0.6)
    .to(select(".spatial-lock"), { scale: 0.76, svgOrigin: "163 136", duration: 1 }, 0);
};
