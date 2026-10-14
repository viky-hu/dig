import { gsap } from "gsap";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import type { ArtworkAnimation } from "./types";

const ROUTES = [
  "M46 65C120 9 201 27 272 91",
  "M46 132C129 68 197 177 272 124",
  "M272 166C209 238 114 232 46 197",
];
const ARROW_END_INSET = 25;
type MeasuredRawPath = ReturnType<typeof MotionPathPlugin.getRawPath> & { totalLength: number };

export function FlowScene() {
  return (
    <>
      <path className="art-solid" d="M133 15C92 73 184 117 145 167C124 198 123 225 141 251H158C140 218 143 200 162 171C205 108 117 75 151 15Z" />
      <path className="art-line" d="M18 30H81M18 30V231H81M239 30H302V231H239" />
      {ROUTES.map((route, index) => (
        <g key={route}>
          <path className="flow-route art-line" d={route} />
          <g className={`flow-traveller flow-traveller-${index}`} transform={`translate(${index === 2 ? 272 : 46} ${[65, 132, 166][index]})`}>
            <circle className="art-solid" r="8" />
          </g>
        </g>
      ))}
      <g className="art-solid">
        {[65, 132, 197].map((y) => <rect key={y} x="33" y={y - 13} width="26" height="26" />)}
        {[91, 124, 166].map((y) => <circle key={y} cx="272" cy={y} r="14" />)}
      </g>
      <g className="flow-arrows art-line" data-emerge="true">
        {ROUTES.map((route, index) => (
          <g key={route} className={`flow-arrow flow-arrow-${index}`}>
            <path d="M -14 -8 L 0 0 L -14 8" />
          </g>
        ))}
      </g>
      <path className="art-line" d="M23 247H70M250 247H297" />
    </>
  );
}

export const animateFlow: ArtworkAnimation = (timeline, select) => {
  timeline
    .fromTo(select(".flow-route"), { drawSVG: "12% 37%" }, { drawSVG: "0% 100%", duration: 0.85, stagger: 0.075 }, 0)
    .to(select(".flow-arrows"), { autoAlpha: 1, duration: 0.3 }, 0.7);
  ROUTES.forEach((route, index) => {
    // GSAP adds totalLength when measuring; its RawPath type omits this cache field.
    const rawPath = MotionPathPlugin.cacheRawPathMeasurements(MotionPathPlugin.getRawPath(route)) as MeasuredRawPath;
    const position = MotionPathPlugin.getPositionOnPath(
      rawPath,
      1 - ARROW_END_INSET / rawPath.totalLength,
      true,
    ) as gsap.plugins.getRelativePositionObject;
    // The tip is the local origin; the symmetric wings face against the tangent.
    gsap.set(select(`.flow-arrow-${index}`), {
      svgOrigin: "0 0",
      x: position.x,
      y: position.y,
      rotation: position.angle,
    });
    timeline.to(select(`.flow-traveller-${index}`), {
      motionPath: { path: route, alignOrigin: [0.5, 0.5] },
      duration: 0.8,
    }, index * 0.1);
  });
};
