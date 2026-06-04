"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { HyperspeedBackground, type HyperspeedBackgroundHandle } from "../HyperspeedBackground";
import { hyperspeedPresets } from "../hyperspeedPresets";
import { PanelBlueLines } from "./PanelBlueLines";

const ROAD_HIDE_DURATION = 0.42;

interface PanelBlueMainProps {
  isActive: boolean;
}

export function PanelBlueMain({ isActive }: PanelBlueMainProps) {
  const panel2Preset =
    (hyperspeedPresets as Record<string, unknown>).one ??
    (hyperspeedPresets as Record<string, unknown>).panelRoadNeon ??
    Object.values(hyperspeedPresets)[0];

  const [isClosing, setIsClosing] = useState(false);
  const wasActiveRef = useRef(isActive);
  const hyperspeedRef = useRef<HyperspeedBackgroundHandle>(null);
  const bgWrapRef = useRef<HTMLDivElement>(null);

  const shouldMountRoad = isActive || isClosing;

  useEffect(() => {
    const becameInactive = !isActive && wasActiveRef.current;
    wasActiveRef.current = isActive;
    if (becameInactive) setIsClosing(true);
  }, [isActive]);

  const onCloseAnimationComplete = useCallback(() => {
    hyperspeedRef.current?.stop();
    setIsClosing(false);
  }, []);

  useEffect(() => {
    if (!isClosing || !bgWrapRef.current) return;
    const el = bgWrapRef.current;
    gsap.fromTo(
      el,
      { clipPath: "inset(0 0 0% 0)" },
      { clipPath: "inset(0 0 100% 0)", duration: ROAD_HIDE_DURATION, ease: "power3.inOut", onComplete: onCloseAnimationComplete },
    );
    return () => { gsap.killTweensOf(el); };
  }, [isClosing, onCloseAnimationComplete]);

  useEffect(() => {
    if (!isActive || !bgWrapRef.current) return;
    const el = bgWrapRef.current;
    gsap.killTweensOf(el);
    gsap.set(el, { clipPath: "inset(0 0 0% 0)" });
  }, [isActive]);

  return (
    <div className="panel-blue-main">
      <div className="panel-blue-main-bg" ref={bgWrapRef}>
        {shouldMountRoad && (
          <HyperspeedBackground
            ref={hyperspeedRef}
            effectOptions={panel2Preset as Partial<typeof hyperspeedPresets.panelRoadNeon>}
          />
        )}
      </div>
      <div className="panel-blue-main-lines" aria-hidden="true">
        <PanelBlueLines isActive={isActive} />
      </div>
      <div className="panel-blue-main-content" aria-hidden="true">
        <div className="panel-blue-main-shuffle-wrap">
          <p className="panel-blue-main-shuffle-text" style={{ fontFamily: '"DingTalk JinBuTi", system-ui, sans-serif' }}>
            各端口即时交流 时空链接
          </p>
        </div>
      </div>
    </div>
  );
}
