"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { gsap } from "gsap";
import { BRAND_BLUE, GRID_LINE_COLOR, PHASE1_STROKE } from "../home/shared/coords";
import { LINE_DRAW_EASE, LOGO_DRAW_EASE } from "../home/shared/animation";
import { bikePathData } from "../home/utils";
import { getInsightBySlug, type InsightSlug } from "./config";
import { useInsightTransition } from "./InsightTransitionProvider";

const WINDOW_BG = "#1E1919";
const RAIL_SIZE = 45;

function useViewportSize() {
  const [size, setSize] = useState({ width: 1440, height: 900 });

  useEffect(() => {
    const update = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return size;
}

export function InsightWindow({ slug, mode }: { slug: InsightSlug; mode: "overlay" | "standalone" }) {
  const transition = useInsightTransition();
  const viewport = useViewportSize();
  const svgRef = useRef<SVGSVGElement>(null);
  const windowRectRef = useRef<SVGRectElement>(null);
  const railLineRef = useRef<SVGLineElement>(null);
  const blueRectRef = useRef<SVGRectElement>(null);
  const openingBikeRef = useRef<SVGGElement>(null);
  const menuRef = useRef<SVGGElement>(null);
  const bikeRef = useRef<SVGGElement>(null);
  const closeTlRef = useRef<gsap.core.Timeline | null>(null);
  const insight = getInsightBySlug(slug);
  const snapshot = transition.snapshot?.slug === slug ? transition.snapshot : null;
  const fromHome = Boolean(mode === "overlay" && snapshot?.fromHome && snapshot.panelRect && snapshot.centerRect);
  const buttonY = (viewport.height - RAIL_SIZE) / 2;
  const bike = useMemo(() => bikePathData(RAIL_SIZE, RAIL_SIZE), []);
  const isClosingRef = useRef(false);
  const isIconReadyRef = useRef(false);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const windowRect = windowRectRef.current;
    const railLine = railLineRef.current;
    const blueRect = blueRectRef.current;
    const openingBikeGroup = openingBikeRef.current;
    const menu = menuRef.current;
    const bikeGroup = bikeRef.current;

    if (!svg || !windowRect || !railLine || !blueRect || !openingBikeGroup || !menu || !bikeGroup) return;

    const openingBikePaths = openingBikeGroup.querySelectorAll<SVGPathElement>(".insight-handoff-bike-path");
    const bikePaths = bikeGroup.querySelectorAll<SVGPathElement>(".insight-bike-path");
    const menuLines = menu.querySelectorAll<SVGLineElement>(".insight-menu-line");
    const panelRect = snapshot?.panelRect;
    const centerRect = snapshot?.centerRect;
    const ctx = gsap.context(() => {
      gsap.killTweensOf([windowRect, railLine, blueRect, openingBikeGroup, openingBikePaths, menuLines, bikePaths]);
      closeTlRef.current?.kill();
      isIconReadyRef.current = false;

      const startPanel = fromHome && panelRect ? panelRect : { x: 0, y: 0, width: viewport.width, height: viewport.height };
      const startCenter = fromHome && centerRect ? centerRect : { x: 0, y: buttonY, width: RAIL_SIZE, height: RAIL_SIZE };
      const openingHandoff = fromHome ? transition.consumeOpeningHandoff() : null;

      gsap.set(windowRect, {
        attr: {
          x: startPanel.x,
          y: startPanel.y,
          width: startPanel.width,
          height: startPanel.height,
        },
        fill: WINDOW_BG,
      });
      gsap.set(blueRect, {
        attr: {
          x: startCenter.x,
          y: startCenter.y,
          width: startCenter.width,
          height: startCenter.height,
        },
        fill: BRAND_BLUE,
        autoAlpha: fromHome && openingHandoff ? 1 : 0,
      });
      gsap.set(railLine, {
        attr: { x1: RAIL_SIZE + 0.5, x2: RAIL_SIZE + 0.5, y1: 0, y2: 0 },
        stroke: GRID_LINE_COLOR,
        strokeWidth: PHASE1_STROKE,
        vectorEffect: "non-scaling-stroke",
      });
      gsap.set(menuLines, { autoAlpha: 0, scaleX: 1, transformOrigin: "50% 50%" });
      gsap.set(openingBikeGroup, {
        x: startCenter.x,
        y: startCenter.y,
        scaleX: startCenter.width / RAIL_SIZE,
        scaleY: startCenter.height / RAIL_SIZE,
        autoAlpha: fromHome && openingHandoff ? 1 : 0,
        transformOrigin: "0 0",
      });
      bikePaths.forEach((path) => {
        const length = path.getTotalLength();
        gsap.set(path, { strokeDasharray: length, strokeDashoffset: length, autoAlpha: 0 });
      });
      gsap.set(openingBikePaths, { autoAlpha: fromHome && openingHandoff ? 1 : 0, strokeDasharray: "none", strokeDashoffset: 0 });

      const tl = gsap.timeline({ defaults: { ease: "expo.inOut", overwrite: "auto" } });
      tl.to(windowRect, {
        attr: { x: 0, y: 0, width: viewport.width, height: viewport.height },
        duration: fromHome ? 0.72 : 0,
      });

      if (fromHome && openingHandoff) {
        tl.to(
          blueRect,
          {
            attr: { x: 0, y: buttonY, width: RAIL_SIZE, height: RAIL_SIZE },
            duration: 0.64,
          },
          0.18,
        );
        tl.to(
          openingBikeGroup,
          {
            x: 0,
            y: buttonY,
            scaleX: 1,
            scaleY: 1,
            duration: 0.64,
          },
          0.18,
        );
        tl.to(openingBikePaths, { autoAlpha: 0, duration: 0.14, ease: "power2.out", stagger: 0.01 }, 0.5);
        tl.set(openingBikeGroup, { autoAlpha: 0 }, 0.7);
      } else {
        tl.set(openingBikeGroup, { autoAlpha: 0 }, 0);
        tl.fromTo(
          blueRect,
          {
            attr: {
              x: startCenter.x,
              y: startCenter.y,
              width: startCenter.width,
              height: startCenter.height,
            },
            autoAlpha: 0,
          },
          {
            attr: { x: 0, y: buttonY, width: RAIL_SIZE, height: RAIL_SIZE },
            autoAlpha: 1,
            duration: 0.3,
            immediateRender: false,
          },
          0,
        );
      }

      tl.to(
        railLine,
        {
          attr: { y2: viewport.height },
          duration: 0.62,
          ease: LINE_DRAW_EASE,
        },
        fromHome ? 0.5 : 0.12,
      );
      tl.to(
        menuLines,
        {
          autoAlpha: 1,
          duration: 0.16,
          ease: "power2.out",
          stagger: 0.025,
          onComplete: () => {
            isIconReadyRef.current = true;
            transition.completeWindowOpen();
          },
        },
        fromHome ? 0.68 : 0.3,
      );

      return () => {
        tl.kill();
      };
    }, svg);

    return () => ctx.revert();
  }, [buttonY, fromHome, snapshot, viewport.height, viewport.width]);

  const morphToBike = () => {
    if (isClosingRef.current || !isIconReadyRef.current) return;

    const bikeGroup = bikeRef.current;
    const menu = menuRef.current;
    if (!bikeGroup || !menu) return;

    const bikePaths = bikeGroup.querySelectorAll<SVGPathElement>(".insight-bike-path");
    const menuLines = menu.querySelectorAll<SVGLineElement>(".insight-menu-line");

    gsap.to(menuLines, {
      scaleX: 0.12,
      autoAlpha: 0,
      duration: 0.22,
      ease: "power3.in",
      stagger: 0.035,
      transformOrigin: "50% 50%",
      overwrite: "auto",
    });
    gsap.to(bikePaths, {
      autoAlpha: 1,
      strokeDashoffset: 0,
      duration: 0.45,
      ease: LOGO_DRAW_EASE,
      stagger: 0.014,
      delay: 0.08,
      overwrite: "auto",
    });
  };

  const morphToMenu = () => {
    if (isClosingRef.current || !isIconReadyRef.current) return;

    const bikeGroup = bikeRef.current;
    const menu = menuRef.current;
    if (!bikeGroup || !menu) return;

    const bikePaths = bikeGroup.querySelectorAll<SVGPathElement>(".insight-bike-path");
    const menuLines = menu.querySelectorAll<SVGLineElement>(".insight-menu-line");

    bikePaths.forEach((path) => {
      const length = path.getTotalLength();
      gsap.to(path, { strokeDashoffset: length, autoAlpha: 0, duration: 0.22, ease: "power2.in", overwrite: "auto" });
    });
    gsap.to(menuLines, {
      scaleX: 1,
      autoAlpha: 1,
      duration: 0.28,
      ease: "back.out(2)",
      stagger: 0.025,
      transformOrigin: "50% 50%",
      delay: 0.08,
      overwrite: "auto",
    });
  };

  const hideButtonIcon = () => {
    const menu = menuRef.current;
    const bikeGroup = bikeRef.current;
    const openingBikeGroup = openingBikeRef.current;
    if (!menu || !bikeGroup || !openingBikeGroup) return;

    const menuLines = menu.querySelectorAll<SVGLineElement>(".insight-menu-line");
    const bikePaths = bikeGroup.querySelectorAll<SVGPathElement>(".insight-bike-path");
    const openingBikePaths = openingBikeGroup.querySelectorAll<SVGPathElement>(".insight-handoff-bike-path");
    gsap.killTweensOf([menuLines, bikePaths, openingBikeGroup, openingBikePaths]);
    gsap.set(openingBikeGroup, { autoAlpha: 0, x: 0, y: buttonY, scaleX: 1, scaleY: 1 });
    gsap.set(bikeGroup, { autoAlpha: 0 });
    gsap.set(menu, { autoAlpha: 0 });
    gsap.set(openingBikePaths, { autoAlpha: 0 });
    gsap.set(menuLines, { autoAlpha: 0, scaleX: 1 });
    gsap.set(bikePaths, { autoAlpha: 0 });
  };

  const closeWindow = () => {
    if (isClosingRef.current || transition.phase !== "open") return;

    const windowRect = windowRectRef.current;
    const railLine = railLineRef.current;
    const blueRect = blueRectRef.current;
    const panelRect = snapshot?.panelRect;
    const centerRect = snapshot?.centerRect;

    if (!windowRect || !railLine || !blueRect) return;

    isClosingRef.current = true;
    isIconReadyRef.current = false;
    closeTlRef.current?.kill();
    hideButtonIcon();
    transition.prepareHomeRestore();

    const tl = gsap.timeline({
      defaults: { ease: "expo.inOut" },
      onComplete: () => {
        isClosingRef.current = false;
        transition.finishHomeRestore();
      },
    });

    closeTlRef.current = tl;
    tl.to(railLine, { attr: { y2: 0 }, duration: 0.38, ease: LINE_DRAW_EASE }, 0.12);
    tl.to(
      blueRect,
      {
        attr: centerRect
          ? { x: centerRect.x, y: centerRect.y, width: centerRect.width, height: centerRect.height }
          : { x: viewport.width / 2 - 120, y: viewport.height / 2 - 120, width: 240, height: 240 },
        duration: 0.64,
      },
      0.18,
    );
    tl.to(
      windowRect,
      {
        attr: panelRect
          ? { x: panelRect.x, y: panelRect.y, width: panelRect.width, height: panelRect.height }
          : { x: viewport.width / 2, y: viewport.height / 2, width: 0, height: 0 },
        duration: 0.7,
      },
      0.16,
    );
  };

  useEffect(() => {
    if (mode !== "overlay" || !fromHome) return;

    const handlePopState = () => {
      closeWindow();
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [fromHome, mode]);

  if (!insight) return null;

  return (
    <div className="insight-window-layer" data-mode={mode}>
      <svg
        ref={svgRef}
        className="insight-window-svg"
        viewBox={`0 0 ${viewport.width} ${viewport.height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <rect ref={windowRectRef} className="insight-window-bg" />
        <foreignObject x={RAIL_SIZE} y={0} width={Math.max(0, viewport.width - RAIL_SIZE)} height={viewport.height} />
        <line ref={railLineRef} className="insight-window-rail-line" />
        <g
          className="insight-window-close"
          role="button"
          tabIndex={0}
          aria-label="Close insight"
          onMouseEnter={morphToBike}
          onMouseLeave={morphToMenu}
          onClick={closeWindow}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") closeWindow();
          }}
        >
          <rect ref={blueRectRef} className="insight-window-close-bg" />
          <g ref={openingBikeRef} className="insight-opening-bike-icon" transform={`translate(0 ${buttonY})`}>
            {bike.paths.map((path, index) => (
              <path key={index} className="insight-handoff-bike-path" d={path} />
            ))}
          </g>
          <g ref={menuRef} className="insight-menu-icon" transform={`translate(0 ${buttonY})`}>
            <line className="insight-menu-line" x1="14" y1="16" x2="31" y2="16" />
            <line className="insight-menu-line" x1="14" y1="22.5" x2="31" y2="22.5" />
            <line className="insight-menu-line" x1="14" y1="29" x2="31" y2="29" />
          </g>
          <g ref={bikeRef} className="insight-bike-icon" transform={`translate(0 ${buttonY})`}>
            {bike.paths.map((path, index) => (
              <path key={index} className="insight-bike-path" d={path} />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
