"use client";

import { useId, useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MorphSVGPlugin } from "gsap/MorphSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ARTWORK_SCENES } from "./artwork";
import type { ArtworkPanelKey } from "./artwork/types";
import { MOBILE_BREAKPOINT } from "./shared/coords";

gsap.registerPlugin(useGSAP, DrawSVGPlugin, MorphSVGPlugin, MotionPathPlugin);

type HomePanelArtworkProps = {
  panelKey: ArtworkPanelKey;
  active: boolean;
  keyboardFocused: boolean;
  suspended: boolean;
};

export function HomePanelArtwork({ panelKey, active, keyboardFocused, suspended }: HomePanelArtworkProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const stateRef = useRef({ active, keyboardFocused, suspended });
  const updateRef = useRef<() => void>(() => {});
  const id = useId().replace(/:/g, "");
  const { Component, animate } = ARTWORK_SCENES[panelKey];

  useGSAP(() => {
    const svg = svgRef.current;
    const panel = svg?.closest<HTMLElement>(".home-grid-panel");
    const title = panel?.querySelector<HTMLElement>(".home-panel-title");
    if (!svg || !panel || !title) return;

    const measureTitle = () => {
      const gap = window.innerWidth >= MOBILE_BREAKPOINT ? 20 : 10;
      // The vertical heading's box fills the panel; only its glyphs occupy space.
      const lastGlyph = title.querySelector<HTMLElement>(".home-panel-title-glyph:last-child");
      const titleHeight = lastGlyph ? lastGlyph.offsetTop + lastGlyph.offsetHeight : title.offsetHeight;
      panel.style.setProperty("--home-artwork-top", `${title.offsetTop + titleHeight + gap}px`);
    };
    const observer = new ResizeObserver(measureTitle);
    observer.observe(title);
    measureTitle();

    const media = gsap.matchMedia();
    media.add({
      always: "all",
      desktop: `(min-width: ${MOBILE_BREAKPOINT}px)`,
      finePointer: "(hover: hover) and (pointer: fine)",
      reducedMotion: "(prefers-reduced-motion: reduce)",
    }, (context) => {
      const { desktop, finePointer, reducedMotion } = context.conditions!;
      const select = (selector: string) => Array.from(svg.querySelectorAll(selector));
      const timeline = gsap.timeline({ paused: true, defaults: { ease: "power2.inOut" } });
      const drawingPaths = select("[data-draw]");
      if (drawingPaths.length) gsap.set(drawingPaths, { autoAlpha: 1, drawSVG: "0%" });
      animate(timeline, select);
      timeline.pause(0);

      const update = () => {
        const state = stateRef.current;
        const isActive = Boolean(desktop && !state.suspended && ((finePointer && state.active) || state.keyboardFocused));
        panel.dataset.artActive = String(isActive);
        if (state.suspended || !desktop) {
          timeline.pause(0);
        } else if (reducedMotion) {
          timeline.progress(isActive ? 1 : 0).pause();
        } else if (isActive) {
          timeline.timeScale(1).play();
        } else {
          timeline.timeScale(1 / 0.55).reverse();
        }
      };
      updateRef.current = update;
      update();
      return () => {
        updateRef.current = () => {};
        panel.dataset.artActive = "false";
      };
    });

    return () => {
      observer.disconnect();
      media.revert();
      panel.style.removeProperty("--home-artwork-top");
    };
  }, { scope: svgRef, dependencies: [panelKey], revertOnUpdate: true });

  useGSAP(() => {
    stateRef.current = { active, keyboardFocused, suspended };
    updateRef.current();
  }, { dependencies: [active, keyboardFocused, suspended] });

  return (
    <svg
      ref={svgRef}
      className={`home-panel-artwork home-panel-artwork--${panelKey}`}
      viewBox="0 0 320 260"
      preserveAspectRatio="xMaxYMax meet"
      aria-hidden="true"
      focusable="false"
    >
      <Component id={`home-art-${id}`} />
    </svg>
  );
}
