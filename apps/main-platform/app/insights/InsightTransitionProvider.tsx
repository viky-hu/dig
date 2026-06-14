"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { PanelKey, Rect } from "../home/utils";
import { getInsightBySlug, type InsightSlug } from "./config";
import { InsightWindow } from "./InsightWindow";

type WindowPhase = "closed" | "opening" | "open" | "closing";

type TransitionSnapshot = {
  slug: InsightSlug;
  panelRect?: Rect;
  centerRect?: Rect;
  fromHome: boolean;
};

export type RestoreHomeFinalOptions = {
  animateBike?: boolean;
  revealBike?: boolean;
};

type OpeningHandoff = {
  ready: true;
};

type InsightTransitionContextValue = {
  activeSlug: InsightSlug | null;
  snapshot: TransitionSnapshot | null;
  phase: WindowPhase;
  isHomeSettled: boolean;
  registerPanel: (panelKey: PanelKey, element: HTMLElement | null) => void;
  registerCenter: (element: HTMLElement | null) => void;
  registerRestoreHomeFinal: (restore: ((options?: RestoreHomeFinalOptions) => void) | null) => void;
  openFromHome: (slug: InsightSlug) => void;
  consumeOpeningHandoff: () => OpeningHandoff | null;
  completeWindowOpen: () => void;
  prepareHomeRestore: () => void;
  finishHomeRestore: () => void;
  setHomeSettledOnce: () => void;
};

const InsightTransitionContext = createContext<InsightTransitionContextValue | null>(null);

function rectFromElement(element: HTMLElement): Rect {
  const rect = element.getBoundingClientRect();

  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
  };
}

export function InsightTransitionProvider({ children }: { children: ReactNode }) {
  const panelsRef = useRef(new Map<PanelKey, HTMLElement>());
  const centerRef = useRef<HTMLElement | null>(null);
  const hiddenElementsRef = useRef<HTMLElement[]>([]);
  const openingHandoffRef = useRef<OpeningHandoff | null>(null);
  const restoreHomeFinalRef = useRef<((options?: RestoreHomeFinalOptions) => void) | null>(null);
  const phaseRef = useRef<WindowPhase>("closed");
  const activeSlugRef = useRef<InsightSlug | null>(null);
  const transitionLockRef = useRef(false);
  const transitionVersionRef = useRef(0);
  const pendingFramesRef = useRef<number[]>([]);
  const disabledTriggersRef = useRef<ScrollTrigger[]>([]);
  const [activeSlug, setActiveSlugState] = useState<InsightSlug | null>(null);
  const [snapshot, setSnapshot] = useState<TransitionSnapshot | null>(null);
  const [phase, setPhaseState] = useState<WindowPhase>("closed");
  const [isHomeSettled, setIsHomeSettled] = useState(false);

  const setPhase = useCallback((nextPhase: WindowPhase) => {
    phaseRef.current = nextPhase;
    setPhaseState(nextPhase);
  }, []);

  const setActiveSlug = useCallback((nextSlug: InsightSlug | null) => {
    activeSlugRef.current = nextSlug;
    setActiveSlugState(nextSlug);
  }, []);

  const cancelPendingFrames = useCallback(() => {
    pendingFramesRef.current.forEach((frameId) => cancelAnimationFrame(frameId));
    pendingFramesRef.current = [];
  }, []);

  const scheduleFrame = useCallback(
    (version: number, callback: () => void) => {
      const frameId = requestAnimationFrame(() => {
        pendingFramesRef.current = pendingFramesRef.current.filter((id) => id !== frameId);
        if (transitionVersionRef.current !== version) return;
        callback();
      });

      pendingFramesRef.current.push(frameId);
    },
    [],
  );

  const releaseHiddenElements = useCallback(() => {
    hiddenElementsRef.current.forEach((element) => {
      element.style.visibility = "";
      element.style.transform = "";
      element.style.zIndex = "";
    });
    hiddenElementsRef.current = [];
  }, []);

  const hideHiddenElements = useCallback(() => {
    hiddenElementsRef.current.forEach((element) => {
      element.style.visibility = "hidden";
    });
  }, []);

  const lockHome = useCallback(() => {
    document.documentElement.classList.add("insight-window-lock");
    disabledTriggersRef.current = ScrollTrigger.getAll().filter(
      (trigger) => (trigger as ScrollTrigger & { enabled?: boolean }).enabled !== false,
    );
    disabledTriggersRef.current.forEach((trigger) => trigger.disable(false));
  }, []);

  const unlockHome = useCallback(() => {
    disabledTriggersRef.current.forEach((trigger) => trigger.enable(false, false));
    disabledTriggersRef.current = [];
    document.documentElement.classList.remove("insight-window-lock");
  }, []);

  const registerPanel = useCallback((panelKey: PanelKey, element: HTMLElement | null) => {
    if (element) {
      panelsRef.current.set(panelKey, element);
      return;
    }

    panelsRef.current.delete(panelKey);
  }, []);

  const registerCenter = useCallback((element: HTMLElement | null) => {
    centerRef.current = element;
  }, []);

  const registerRestoreHomeFinal = useCallback((restore: ((options?: RestoreHomeFinalOptions) => void) | null) => {
    restoreHomeFinalRef.current = restore;
  }, []);

  const consumeOpeningHandoff = useCallback(() => {
    const handoff = openingHandoffRef.current;
    if (!handoff) return null;

    hideHiddenElements();
    openingHandoffRef.current = null;
    return handoff;
  }, [hideHiddenElements]);

  const openFromHome = useCallback(
    (slug: InsightSlug) => {
      if (transitionLockRef.current || phaseRef.current !== "closed" || activeSlugRef.current) return;

      const insight = getInsightBySlug(slug);
      const panel = insight ? panelsRef.current.get(insight.panelKey) : undefined;
      const center = centerRef.current;
      const panelRect = panel ? rectFromElement(panel) : undefined;
      const centerRect = center ? rectFromElement(center) : undefined;

      if (!insight?.isEnabled) return;

      transitionLockRef.current = true;
      transitionVersionRef.current += 1;
      cancelPendingFrames();

      const nextSnapshot: TransitionSnapshot = {
        slug,
        panelRect,
        centerRect,
        fromHome: Boolean(panel && center),
      };

      releaseHiddenElements();
      if (center) {
        center.style.visibility = "hidden";
        hiddenElementsRef.current.push(center);
        openingHandoffRef.current = {
          ready: true,
        };
      } else {
        openingHandoffRef.current = null;
      }

      lockHome();
      setActiveSlug(slug);
      setSnapshot(nextSnapshot);
      setPhase("opening");
    },
    [cancelPendingFrames, lockHome, releaseHiddenElements, setActiveSlug, setPhase],
  );

  const completeWindowOpen = useCallback(() => {
    if (phaseRef.current !== "opening") return;

    transitionLockRef.current = false;
    setPhase("open");
  }, [setPhase]);

  const prepareHomeRestore = useCallback(() => {
    if (phaseRef.current !== "open") return;

    transitionLockRef.current = true;
    transitionVersionRef.current += 1;
    cancelPendingFrames();
    setPhase("closing");
    releaseHiddenElements();
    restoreHomeFinalRef.current?.({ revealBike: false });
  }, [cancelPendingFrames, releaseHiddenElements, setPhase]);

  const finishHomeRestore = useCallback(() => {
    if (phaseRef.current !== "closing") return;

    const version = transitionVersionRef.current;
    restoreHomeFinalRef.current?.({ revealBike: false });

    scheduleFrame(version, () => {
      restoreHomeFinalRef.current?.({ revealBike: false });
      setActiveSlug(null);
      setSnapshot(null);
      setPhase("closed");

      scheduleFrame(version, () => {
        restoreHomeFinalRef.current?.({ animateBike: true, revealBike: true });
        unlockHome();
        transitionLockRef.current = false;
      });
    });
  }, [scheduleFrame, setActiveSlug, setPhase, unlockHome]);

  const setHomeSettledOnce = useCallback(() => {
    setIsHomeSettled(true);
  }, []);

  useEffect(() => cancelPendingFrames, [cancelPendingFrames]);

  const value = useMemo(
    () => ({
      activeSlug,
      snapshot,
      phase,
      isHomeSettled,
      registerPanel,
      registerCenter,
      registerRestoreHomeFinal,
      openFromHome,
      consumeOpeningHandoff,
      completeWindowOpen,
      prepareHomeRestore,
      finishHomeRestore,
      setHomeSettledOnce,
    }),
    [
      activeSlug,
      completeWindowOpen,
      consumeOpeningHandoff,
      finishHomeRestore,
      isHomeSettled,
      openFromHome,
      phase,
      prepareHomeRestore,
      registerCenter,
      registerPanel,
      registerRestoreHomeFinal,
      setHomeSettledOnce,
      snapshot,
    ],
  );

  return (
    <InsightTransitionContext.Provider value={value}>
      {children}
      {activeSlug && phase !== "closed" ? <InsightWindow slug={activeSlug} mode="overlay" /> : null}
    </InsightTransitionContext.Provider>
  );
}

export function useInsightTransition() {
  const context = useContext(InsightTransitionContext);

  if (!context) {
    throw new Error("useInsightTransition must be used inside InsightTransitionProvider");
  }

  return context;
}
