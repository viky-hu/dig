import type { ArtworkAnimation } from "./types";

const WINDOWS = Array.from({ length: 8 }, (_, index) => ({
  x: 52 + (index % 2) * 112,
  y: 36 + Math.floor(index / 2) * 48,
}));

export function OverviewScene() {
  return (
    <>
      <path className="art-line" d="M22 225H298M22 225V207M298 225V207" />
      <g className="overview-binding">
        <path className="art-solid" d="M36 45L63 27V205L36 224Z" />
        <path className="art-line" d="M43 60V195" />
      </g>
      {WINDOWS.map(({ x, y }, index) => (
        <g
          key={index}
          className="overview-window"
          transform={`translate(${(index % 2) * -35 + 27} ${Math.floor(index / 2) * -20 + 16})`}
        >
          <rect className="art-paper art-outline" x={x} y={y} width="100" height="38" />
          <path className="art-line" d={`M${x + 11} ${y + 12}h26`} />
          <path className="art-line" d={`M${x + 11} ${y + 24}h${index % 2 ? 45 : 30}`} />
          <rect className="art-solid" x={x + 73} y={y + 10} width="15" height="18" />
        </g>
      ))}
      <g className="overview-cover" transform="translate(58 23) rotate(-9 100 100)">
        <path className="art-solid" d="M0 0H190V194H0Z" />
        <path className="art-paper" d="M17 17H173V43H17ZM17 57H93V66H17ZM17 77H125V86H17Z" />
        <path className="art-paper" d="M18 164V136H41V164ZM57 164V116H80V164ZM96 164V97H119V164ZM135 164V126H158V164Z" />
        <path className="art-paper-line" d="M17 176H173" />
      </g>
    </>
  );
}

export const animateOverview: ArtworkAnimation = (timeline, select) => {
  timeline
    .to(select(".overview-cover"), { x: -28, y: 14, rotation: -26, scaleX: 0.06, autoAlpha: 0, transformOrigin: "0% 50%", duration: 0.65 }, 0)
    .to(select(".overview-binding"), { x: -15, autoAlpha: 0, duration: 0.5 }, 0)
    .to(select(".overview-window"), { x: 0, y: 0, duration: 0.72, stagger: 0.04 }, 0);
};
