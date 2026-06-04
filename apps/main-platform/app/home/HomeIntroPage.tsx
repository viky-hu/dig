"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import {
  BASE_VH,
  BASE_VW,
  GRID_LINE_COLOR,
  MOBILE_BREAKPOINT,
  SCROLL_SHELL_VH,
} from "./shared/coords";
import { LINE_DRAW_EASE, LOGO_DRAW_EASE } from "./shared/animation";
import {
  bikePathData,
  computeSceneGeometry,
  getGuideLines,
  getIntroCopy,
  interpolateTracks,
  rectToStyle,
  syncGridFrame,
  type PanelKey,
} from "./utils";

export function HomeIntroPage() {
  const shellRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const lineSvgRef = useRef<SVGSVGElement>(null);
  const centerPanelRef = useRef<HTMLDivElement>(null);
  const introCopyRef = useRef<HTMLDivElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const bikeRef = useRef<SVGSVGElement>(null);

  const [viewportSize, setViewportSize] = useState({
    width: BASE_VW,
    height: BASE_VH,
  });

  useEffect(() => {
    const updateViewport = () => {
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  const isDesktop = viewportSize.width >= MOBILE_BREAKPOINT;
  const geometry = useMemo(
    () => computeSceneGeometry(viewportSize.width, viewportSize.height),
    [viewportSize.height, viewportSize.width],
  );

  useLayoutEffect(() => {
    const shell = shellRef.current;
    const viewport = viewportRef.current;
    const world = worldRef.current;
    const lineSvg = lineSvgRef.current;
    const centerPanel = centerPanelRef.current;
    const introCopy = introCopyRef.current;
    const hint = hintRef.current;
    const bike = bikeRef.current;

    if (!shell || !viewport || !world || !lineSvg || !centerPanel || !introCopy || !hint || !bike) {
      return;
    }

    const ctx = gsap.context(() => {
      const panels = world.querySelectorAll<HTMLElement>(".home-grid-panel");
      const orbitOnePanels = world.querySelectorAll<HTMLElement>('[data-orbit="one"]');
      const orbitTwoPanels = world.querySelectorAll<HTMLElement>('[data-orbit="two"]');
      const lines = lineSvg.querySelectorAll<SVGLineElement>(".home-grid-line");
      const bikePaths = bike.querySelectorAll<SVGPathElement>(".home-bike-path");

      const renderProgress = (progress: number) => {
        const tracks = interpolateTracks(geometry.startTracks, geometry.endTracks, progress);
        syncGridFrame(panels, lines, tracks, geometry.viewportWidth, geometry.viewportHeight);
      };

      renderProgress(isDesktop ? 0 : 1);

      if (!isDesktop) {
        gsap.set(panels, { autoAlpha: 1 });
        gsap.set(lines, { autoAlpha: 0 });
        gsap.set(introCopy, { autoAlpha: 0 });
        gsap.set(hint, { autoAlpha: 0 });
        gsap.set(bikePaths, { autoAlpha: 1, strokeDasharray: "none", strokeDashoffset: 0 });
        return;
      }

      window.scrollTo({ top: 0, behavior: "auto" });

      lines.forEach((line) => {
        const len = line.getTotalLength();
        gsap.set(line, {
          strokeDasharray: len,
          strokeDashoffset: len,
          autoAlpha: 1,
        });
      });

      bikePaths.forEach((path) => {
        const len = path.getTotalLength();
        gsap.set(path, {
          strokeDasharray: len,
          strokeDashoffset: len,
          autoAlpha: 0,
        });
      });

      gsap.set(introCopy, { autoAlpha: 0, y: 18 });
      gsap.set(hint, { autoAlpha: 0, y: -8 });
      gsap.set(orbitOnePanels, { autoAlpha: 0 });
      gsap.set(orbitTwoPanels, { autoAlpha: 0 });
      gsap.set(centerPanel, { autoAlpha: 0, scale: 0.972, transformOrigin: "50% 50%" });

      const introTl = gsap.timeline({ defaults: { ease: "power2.out" } });
      introTl.to(
        lines,
        {
          strokeDashoffset: 0,
          duration: 1.08,
          ease: LINE_DRAW_EASE,
          stagger: 0.045,
        },
        0,
      );
      introTl.to(
        centerPanel,
        {
          autoAlpha: 1,
          scale: 1,
          duration: 0.72,
          ease: "power3.out",
        },
        0.28,
      );
      introTl.to(
        introCopy,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.42,
        },
        0.76,
      );
      introTl.to(
        hint,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.28,
        },
        0.96,
      );

      let scrollTl: gsap.core.Timeline | undefined;
      introTl.call(() => {
        const state = { progress: 0 };

        scrollTl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: shell,
            start: "top top",
            end: () => `+=${window.innerHeight * 2.6}`,
            pin: viewport,
            scrub: true,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });

        scrollTl.to(
          state,
          {
            progress: 1,
            duration: 1,
            onUpdate: () => renderProgress(state.progress),
          },
          0,
        );
        scrollTl.to(
          orbitOnePanels,
          {
            autoAlpha: 1,
            duration: 0.18,
          },
          0.04,
        );
        scrollTl.to(
          orbitTwoPanels,
          {
            autoAlpha: 1,
            duration: 0.18,
          },
          0.28,
        );
        scrollTl.to(
          introCopy,
          {
            autoAlpha: 0,
            y: -14,
            duration: 0.18,
          },
          0.08,
        );
        scrollTl.to(
          hint,
          {
            autoAlpha: 0,
            y: 10,
            duration: 0.14,
          },
          0.08,
        );
        scrollTl.to(
          bikePaths,
          {
            autoAlpha: 1,
            strokeDashoffset: 0,
            duration: 0.24,
            ease: LOGO_DRAW_EASE,
            stagger: 0.03,
          },
          0.42,
        );
        scrollTl.to(
          lines,
          {
            autoAlpha: 0.22,
            duration: 0.18,
          },
          0.82,
        );
      });

      return () => {
        introTl.kill();
        scrollTl?.kill();
      };
    }, viewport);

    return () => ctx.revert();
  }, [geometry, isDesktop]);

  const guideLines = getGuideLines(geometry.initialTracks, geometry.viewportWidth, geometry.viewportHeight);
  const introCopy = getIntroCopy();
  const bikeWidth = Math.max(geometry.centerCoreRect.width, geometry.initialCenterRect.width);
  const bikeHeight = Math.max(geometry.centerCoreRect.height, geometry.initialCenterRect.height);
  const bike = bikePathData(bikeWidth, bikeHeight);

  return (
    <main className={isDesktop ? "home-scroll-page" : "home-static-page"}>
      <div
        ref={shellRef}
        className="home-scroll-shell"
        style={{ height: isDesktop ? `${SCROLL_SHELL_VH}vh` : "100vh" }}
      >
        <div ref={viewportRef} className="home-viewport">
          <div
            ref={worldRef}
            className={isDesktop ? "home-world-stage" : "home-static-stage"}
            style={{
              width: viewportSize.width,
              height: viewportSize.height,
            }}
          >
            <svg
              ref={lineSvgRef}
              className="home-grid-lines"
              viewBox={`0 0 ${viewportSize.width} ${viewportSize.height}`}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {guideLines.map((line) => (
                <line
                  key={line.key}
                  className="home-grid-line"
                  x1={line.x1}
                  y1={line.y1}
                  x2={line.x2}
                  y2={line.y2}
                  stroke={GRID_LINE_COLOR}
                />
              ))}
            </svg>

            {geometry.initialPanels.map((panel) => {
              const isCenter = panel.key === "centerCore";
              return (
                <div
                  key={panel.key}
                  ref={isCenter ? centerPanelRef : undefined}
                  data-panel={panel.key}
                  data-orbit={getPanelOrbit(panel.key)}
                  className={`home-grid-panel${isCenter ? " home-center-panel" : ""}`}
                  style={{
                    ...rectToStyle(panel.rect),
                    backgroundColor: panel.color,
                    opacity: isDesktop ? 0 : 1,
                  }}
                >
                  {isCenter && (
                    <>
                      <div ref={introCopyRef} className="home-intro-copy">
                        <h1 className="home-intro-title">{introCopy.title}</h1>
                        <p className="home-intro-subtitle">{introCopy.subtitle}</p>
                      </div>

                      <svg
                        ref={bikeRef}
                        className="home-intro-bike"
                        viewBox={`0 0 ${bikeWidth} ${bikeHeight}`}
                        aria-hidden="true"
                      >
                        <path className="home-bike-path" d={bike.leftWheel} />
                        <path className="home-bike-path" d={bike.rightWheel} />
                        <path className="home-bike-path" d={bike.frame} />
                      </svg>

                      <div ref={hintRef} className="home-scroll-hint">
                        {introCopy.hint}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}

function getPanelOrbit(panel: PanelKey) {
  if (panel === "voiceTone" || panel === "color" || panel === "logo" || panel === "imagery") {
    return "one";
  }

  if (panel === "framework" || panel === "iconography" || panel === "typography" || panel === "motion") {
    return "two";
  }

  return undefined;
}
