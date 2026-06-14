"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from "react";
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
  const [activeSlug, setActiveSlug] = useState<InsightSlug | null>(null);
  const [snapshot, setSnapshot] = useState<TransitionSnapshot | null>(null);
  const [phase, setPhase] = useState<WindowPhase>("closed");
  const [isHomeSettled, setIsHomeSettled] = useState(false);

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
    ScrollTrigger.getAll().forEach((trigger) => trigger.disable(false));
  }, []);

  const unlockHome = useCallback(() => {
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
      const insight = getInsightBySlug(slug);
      const panel = insight ? panelsRef.current.get(insight.panelKey) : undefined;
      const center = centerRef.current;

      if (!insight?.isEnabled) return;

      const nextSnapshot: TransitionSnapshot = {
        slug,
        panelRect: panel ? rectFromElement(panel) : undefined,
        centerRect: center ? rectFromElement(center) : undefined,
        fromHome: Boolean(panel && center),
      };

      releaseHiddenElements();
      if (center) {
        const bike = center.querySelector<SVGSVGElement>("[data-flip-id='insight-handoff-bike']");
        const sourceTargets = bike ? [center, bike] : [center];

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
      requestAnimationFrame(() => {
        setPhase("open");
      });
    },
    [lockHome, releaseHiddenElements],
  );

  const prepareHomeRestore = useCallback(() => {
    setPhase("closing");
    releaseHiddenElements();
    restoreHomeFinalRef.current?.({ revealBike: false });
  }, [releaseHiddenElements]);

  const finishHomeRestore = useCallback(() => {
    unlockHome();
    restoreHomeFinalRef.current?.({ revealBike: false });

    requestAnimationFrame(() => {
      restoreHomeFinalRef.current?.({ revealBike: false });
      setActiveSlug(null);
      setSnapshot(null);
      setPhase("closed");

      requestAnimationFrame(() => {
        restoreHomeFinalRef.current?.({ animateBike: true, revealBike: true });
      });
    });
  }, [unlockHome]);

  const setHomeSettledOnce = useCallback(() => {
    setIsHomeSettled(true);
  }, []);

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
      prepareHomeRestore,
      finishHomeRestore,
      setHomeSettledOnce,
    }),
    [
      activeSlug,
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
