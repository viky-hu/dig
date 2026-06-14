"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { gsap } from "gsap";
import { INSIGHTS, type InsightSlug } from "../insights/config";
import { useInsightTransition } from "../insights/InsightTransitionProvider";
import {
  BASE_VH,
  BASE_VW,
  BRAND_BLUE,
  GRID_LINE_COLOR,
  MOBILE_BREAKPOINT,
  SCROLL_SHELL_VH,
} from "./shared/coords";
import { LINE_DRAW_EASE, LOGO_DRAW_EASE } from "./shared/animation";
import {
  bikePathData,
  computeSceneGeometry,
  getGuideLines,
  interpolateTracks,
  rectToStyle,
  syncGridFrame,
  type PanelKey,
} from "./utils";

type PanelLabelConfig = {
  title: string;
  orientation: "horizontal" | "vertical";
  textColor: string;
  accent?: "large";
};

const PANEL_LABELS: Record<Exclude<PanelKey, "centerCore">, PanelLabelConfig> = {
  framework: {
    title: "项目总览",
    orientation: "vertical",
    textColor: "#b6c8e1",
  },
  iconography: {
    title: "数据清洗",
    orientation: "horizontal",
    textColor: "#1b5641",
  },
  voiceTone: {
    title: "时间规律",
    orientation: "horizontal",
    textColor: "#664509",
  },
  color: {
    title: "骑行时长",
    orientation: "horizontal",
    textColor: "#6b2e0c",
  },
  logo: {
    title: "空间热点",
    orientation: "horizontal",
    textColor: "#155463",
  },
  imagery: {
    title: "流向分析",
    orientation: "horizontal",
    textColor: "#fcafa6",
  },
  typography: {
    title: "区域画像",
    orientation: "horizontal",
    textColor: "#480118",
    accent: "large",
  },
  motion: {
    title: "结论展望",
    orientation: "horizontal",
    textColor: "#682660",
  },
};

export function HomeIntroPage() {
  const { openFromHome, registerCenter, registerPanel, registerRestoreHomeFinal } = useInsightTransition();
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
      const lines = lineSvg.querySelectorAll<SVGLineElement>(".home-grid-line");
      const labels = world.querySelectorAll<HTMLElement>(".home-panel-title");
      const bikePaths = bike.querySelectorAll<SVGPathElement>(".home-bike-path");

      const renderProgress = (progress: number) => {
        const tracks = interpolateTracks(geometry.startTracks, geometry.endTracks, progress);
        syncGridFrame(panels, lines, tracks, geometry.viewportWidth, geometry.viewportHeight);
      };

      const animateBikeInPlace = () => {
        bikePaths.forEach((path) => {
          const len = path.getTotalLength();
          gsap.set(path, {
            strokeDasharray: len,
            strokeDashoffset: len,
            autoAlpha: 1,
          });
        });

        gsap.to(bikePaths, {
          strokeDashoffset: 0,
          duration: 0.46,
          ease: LOGO_DRAW_EASE,
          stagger: 0.012,
          overwrite: "auto",
        });
      };

      let scrollTl: gsap.core.Timeline | undefined;
      let scrollState: { progress: number } | undefined;

      const syncScrollFinalState = () => {
        if (!scrollTl?.scrollTrigger) return;

        scrollState = { progress: 1 };
        scrollTl.progress(1);
        scrollTl.scrollTrigger.scroll(scrollTl.scrollTrigger.end);
        scrollTl.scrollTrigger.update();
      };

      const restoreHomeFinal = ({
        animateBike = false,
        revealBike = true,
      }: { animateBike?: boolean; revealBike?: boolean } = {}) => {
        syncScrollFinalState();
        renderProgress(1);
        gsap.set(lines, { autoAlpha: 0 });
        gsap.set(centerPanel, {
          autoAlpha: 1,
          backgroundColor: BRAND_BLUE,
          scale: 1,
          clearProps: "transformOrigin",
        });
        gsap.set(introCopy, { autoAlpha: 0, y: -14 });
        gsap.set(hint, { autoAlpha: 0, y: 10 });
        gsap.set(labels, { autoAlpha: 1, x: 0, y: 0 });

        if (!revealBike) {
          gsap.set(bikePaths, { autoAlpha: 0 });
          return;
        }

        if (animateBike) {
          animateBikeInPlace();
          return;
        }

        gsap.set(bikePaths, { autoAlpha: 1, strokeDasharray: "none", strokeDashoffset: 0 });
      };

      registerRestoreHomeFinal(restoreHomeFinal);

      renderProgress(isDesktop ? 0 : 1);

      if (!isDesktop) {
        gsap.set(panels, { autoAlpha: 1 });
        gsap.set(lines, { autoAlpha: 0 });
        gsap.set(labels, { autoAlpha: 1, x: 0, y: 0 });
        gsap.set(introCopy, { autoAlpha: 0 });
        gsap.set(hint, { autoAlpha: 0 });
        gsap.set(bikePaths, { autoAlpha: 1, strokeDasharray: "none", strokeDashoffset: 0 });
        return () => {
          registerRestoreHomeFinal(null);
        };
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

      gsap.set(labels, { autoAlpha: 0, x: -22, y: 0 });
      gsap.set(introCopy, { autoAlpha: 0, y: 18 });
      gsap.set(hint, { autoAlpha: 0, y: -8 });
      gsap.set(panels, { willChange: "left, top, width, height" });
      gsap.set(centerPanel, {
        autoAlpha: 0,
        backgroundColor: "#8ea2ff",
        scale: 0.84,
        transformOrigin: "50% 50%",
      });

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
          backgroundColor: BRAND_BLUE,
          scale: 1,
          duration: 0.92,
          ease: "power3.out",
        },
        0.22,
      );
      introTl.to(
        labels,
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.42,
          stagger: 0.05,
        },
        0.54,
      );
      introTl.to(
        introCopy,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.48,
        },
        0.82,
      );
      introTl.to(
        hint,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.34,
        },
        1.04,
      );

      introTl.call(() => {
        scrollState = { progress: 0 };

        scrollTl = gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: shell,
            start: "top top",
            end: () => `+=${window.innerHeight * 1.55}`,
            pin: viewport,
            scrub: true,
            invalidateOnRefresh: true,
            anticipatePin: 1,
          },
        });

        scrollTl.to(
          scrollState,
          {
            progress: 1,
            duration: 1,
            onUpdate: () => renderProgress(scrollState?.progress ?? 0),
          },
          0,
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
            duration: 0.46,
            ease: LOGO_DRAW_EASE,
            stagger: 0.012,
          },
          0.18,
        );
        scrollTl.to(
          lines,
          {
            autoAlpha: 0,
            duration: 0.18,
          },
          0.64,
        );
      });

      return () => {
        registerRestoreHomeFinal(null);
        introTl.kill();
        scrollTl?.kill();
      };
    }, viewport);

    return () => ctx.revert();
  }, [geometry, isDesktop, registerRestoreHomeFinal]);

  const guideLines = getGuideLines(geometry.initialTracks, geometry.viewportWidth, geometry.viewportHeight);
  const introCopy = {
    title: "上海摩拜单车",
    subtitle: "数据挖掘分析报告",
    hint: "↓↓",
  };
  const bikeWidth = Math.max(geometry.centerCoreRect.width, geometry.initialCenterRect.width);
  const bikeHeight = Math.max(geometry.centerCoreRect.height, geometry.initialCenterRect.height);
  const bike = bikePathData(bikeWidth, bikeHeight);

  const panelMeta = useMemo(
    () =>
      geometry.initialPanels
        .filter((panel) => panel.key !== "centerCore")
        .map((panel) => {
          const panelKey = panel.key as Exclude<PanelKey, "centerCore">;

          return {
            ...panel,
            key: panelKey,
            label: PANEL_LABELS[panelKey],
            slug: INSIGHTS.find((item) => item.panelKey === panelKey)?.slug ?? null,
          };
        }),
    [geometry.initialPanels],
  );

  const handleOpen = (slug: InsightSlug | null) => {
    if (!slug) return;
    openFromHome(slug);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>, slug: InsightSlug | null) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleOpen(slug);
  };

  const renderPanelTitle = (label: PanelLabelConfig, useStackedVertical: boolean) => {
    if (label.accent === "large") {
      const splitIndex = Math.ceil(label.title.length / 2);
      return [label.title.slice(0, splitIndex), label.title.slice(splitIndex)].map((line, index) => (
        <span key={`${label.title}-line-${index}`} className="home-panel-title-line" aria-hidden="true">
          {line}
        </span>
      ));
    }

    if (label.orientation !== "vertical" || !useStackedVertical) {
      return label.title;
    }

    return Array.from(label.title).map((char, index) => (
      <span key={`${label.title}-${index}`} className="home-panel-title-glyph" aria-hidden="true">
        {char}
      </span>
    ));
  };

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

              if (isCenter) {
                return (
                  <div
                    key={panel.key}
                    ref={(element) => {
                      centerPanelRef.current = element;
                      registerCenter(element);
                    }}
                    data-panel={panel.key}
                    className="home-grid-panel home-center-panel"
                    style={{
                      ...rectToStyle(panel.rect),
                      backgroundColor: panel.color,
                      opacity: 1,
                    }}
                  >
                    <div ref={introCopyRef} className="home-intro-copy">
                      <h1 className="home-intro-title">{introCopy.title}</h1>
                      <p className="home-intro-subtitle">{introCopy.subtitle}</p>
                    </div>

                    <svg
                      ref={bikeRef}
                      className="home-intro-bike"
                      data-flip-id="insight-handoff-bike"
                      viewBox={`0 0 ${bikeWidth} ${bikeHeight}`}
                      aria-hidden="true"
                    >
                      {bike.paths.map((path, index) => (
                        <path key={index} className="home-bike-path" d={path} />
                      ))}
                    </svg>

                    <div ref={hintRef} className="home-scroll-hint">
                      <svg className="home-scroll-mouse" viewBox="0 0 36 40" aria-hidden="true">
                        <rect className="home-scroll-mouse-shell" x="8" y="4" width="20" height="30" rx="10" />
                        <path className="home-scroll-mouse-detail" d="M18 4 V14" />
                        <path className="home-scroll-mouse-detail" d="M9 15 H27" />
                        <rect className="home-scroll-mouse-wheel" x="16" y="9" width="4" height="7" rx="2" />
                        <path className="home-scroll-mouse-cue" d="M18 35 V38" />
                      </svg>
                    </div>
                  </div>
                );
              }

              const panelKey = panel.key as Exclude<PanelKey, "centerCore">;
              const meta = panelMeta.find((item) => item.key === panelKey);
              if (!meta) return null;

              return (
                <section
                  key={panelKey}
                  ref={(element) => {
                    registerPanel(panelKey, element);
                  }}
                  data-panel={panelKey}
                  data-openable={meta.slug ? "true" : "false"}
                  className="home-grid-panel"
                  style={{
                    ...rectToStyle(panel.rect),
                    backgroundColor: panel.color,
                    opacity: 1,
                  }}
                  role={meta.slug ? "button" : undefined}
                  tabIndex={meta.slug ? 0 : -1}
                  aria-label={meta.slug ? `打开${meta.label.title}模块` : meta.label.title}
                  onClick={() => handleOpen(meta.slug)}
                  onKeyDown={(event) => handleKeyDown(event, meta.slug)}
                >
                  <h2
                    className={`home-panel-title home-panel-title--${meta.label.orientation}${
                      meta.label.accent === "large" ? " home-panel-title--large" : ""
                    }`}
                    style={{ color: meta.label.textColor }}
                    aria-label={meta.label.title}
                  >
                    {renderPanelTitle(meta.label, isDesktop)}
                  </h2>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
