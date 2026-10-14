import type { ArtworkAnimation, ArtworkSceneProps } from "./types";

const SUN = "M199 66a31 31 0 1 0 62 0a31 31 0 1 0-62 0Z";
const MOON = "M239 36C221 58 224 84 253 93C218 111 190 86 200 58C207 40 222 34 239 36Z";
const STARS = [[151, 52], [178, 93], [260, 131], [114, 98]];

export function TimeScene({ id }: ArtworkSceneProps) {
  return (
    <>
      <defs>
        <clipPath id={`${id}-sky`}><rect x="19" y="23" width="282" height="206" /></clipPath>
      </defs>
      <rect className="art-outline" x="19" y="23" width="282" height="206" />
      <g clipPath={`url(#${id}-sky)`}>
        <g className="time-rays art-line">
          {Array.from({ length: 8 }, (_, index) => (
            <path key={index} d="M230 20V10" transform={`rotate(${index * 45} 230 66)`} />
          ))}
        </g>
        <g className="time-orb">
          <path className="time-disc art-solid" d={SUN} />
        </g>
        <g className="time-stars" data-emerge="true">
          {STARS.map(([x, y], index) => <path key={index} className="art-solid" d={`M${x} ${y - 7}l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z`} />)}
        </g>
        <g className="time-cloud-back">
          <path className="art-paper art-outline" d="M-14 197V171C-14 150 6 138 25 143C27 117 47 103 69 110C82 82 124 91 128 120C153 112 174 130 170 153C191 155 201 175 192 197Z" />
        </g>
        <g className="time-cloud-front">
          <path className="art-solid" d="M-22 236V207C-22 181-1 168 20 174C22 145 48 128 72 139C89 117 125 126 128 154C155 144 182 165 176 189C202 188 216 212 205 236Z" />
          <path className="art-paper-line" d="M35 177C43 164 62 163 71 175M97 189H157" />
        </g>
      </g>
      <path className="art-line" d="M19 242H69M81 242H100" />
    </>
  );
}

export const animateTime: ArtworkAnimation = (timeline, select) => {
  timeline
    .to(select(".time-orb"), { motionPath: { path: [{ x: 0, y: 0 }, { x: -77, y: -15 }, { x: -151, y: 14 }], curviness: 1.2 }, duration: 1 }, 0)
    .to(select(".time-disc"), { morphSVG: { shape: MOON, shapeIndex: "auto" }, duration: 0.75 }, 0.15)
    .to(select(".time-rays"), { autoAlpha: 0, scale: 0.65, svgOrigin: "230 66", duration: 0.35 }, 0)
    .to(select(".time-cloud-back"), { x: 135, y: 9, duration: 1 }, 0)
    .to(select(".time-cloud-front"), { x: 116, y: 12, duration: 1 }, 0)
    .to(select(".time-stars"), { autoAlpha: 1, duration: 0.3 }, 0.65);
};
