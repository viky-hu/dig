"use client";

import { useRef, useState, type RefObject } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import { createCleaningTimeline } from "./animations";
import { COUNTS, STAGES } from "./data";

gsap.registerPlugin(useGSAP);

export type PlaybackStatus = "ready" | "running" | "paused" | "done";

export function useCleaningPlayback(root: RefObject<HTMLDivElement | null>, isActivated: boolean) {
  const [step, setStep] = useState(0);
  const [revision, setRevision] = useState(0);
  const [status, setStatus] = useState<PlaybackStatus>("ready");
  const [phase, setPhase] = useState(-1);
  const [metrics, setMetrics] = useState<{ rows: number; fields: number }>({ rows: COUNTS.raw, fields: 9 });
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const generation = useRef(0);
  const snapshot = useRef({ status: "ready" as PlaybackStatus, progress: 0 });
  const reduced = useRef(false);

  const { contextSafe } = useGSAP(() => {
    if (!root.current || !isActivated) return;
    const currentGeneration = generation.current;
    const media = gsap.matchMedia();
    media.add({ desktop: "(min-width: 1024px)", mobile: "(max-width: 1023px)", reduce: "(prefers-reduced-motion: reduce)" }, context => {
      reduced.current = Boolean(context.conditions?.reduce);
      const stage = STAGES[step];
      const isCurrent = () => generation.current === currentGeneration;
      const timeline = createCleaningTimeline(root.current!, step, {
        phase(index) { if (isCurrent()) setPhase(index); },
        checkpoint(index) {
          if (!isCurrent()) return;
          const point = stage.phases[index];
          if (point.rows !== undefined || point.fields !== undefined) {
            setMetrics(previous => ({ rows: point.rows ?? previous.rows, fields: point.fields ?? previous.fields }));
          }
        },
        complete() {
          if (!isCurrent()) return;
          snapshot.current = { status: "done", progress: 1 };
          setStatus("done");
          setPhase(stage.phases.length - 1);
          setMetrics({ rows: step >= 5 ? COUNTS.clean : COUNTS.raw, fields: stage.outputFields });
        },
        update(progress) { if (isCurrent()) snapshot.current.progress = progress; },
      });
      timelineRef.current = timeline;
      const saved = { ...snapshot.current };
      if (saved.status === "done") {
        timeline.progress(1, true).pause();
      } else if (saved.status === "running" || saved.status === "paused") {
        if (reduced.current) timeline.progress(1);
        else {
          timeline.progress(saved.progress, true);
          if (saved.status === "running") timeline.play();
        }
      }
      return () => { timelineRef.current = null; };
    });
    return () => media.revert();
  }, { scope: root, dependencies: [step, revision, isActivated], revertOnUpdate: true });

  const prepare = contextSafe((target: number, execute = false) => {
    if (!isActivated) return;
    timelineRef.current?.pause();
    generation.current++;
    snapshot.current = { status: execute ? "running" : "ready", progress: 0 };
    setStatus(snapshot.current.status);
    setPhase(-1);
    setMetrics({ rows: target === 6 ? COUNTS.clean : COUNTS.raw, fields: STAGES[target].inputFields });
    setStep(target);
    setRevision(value => value + 1);
  });

  const execute = contextSafe(() => {
    if (!isActivated || !timelineRef.current || snapshot.current.status !== "ready") return;
    snapshot.current.status = "running";
    setStatus("running");
    if (reduced.current) timelineRef.current.progress(1);
    else timelineRef.current.play(0);
  });

  const primary = () => {
    if (snapshot.current.status === "ready") execute();
    else if (snapshot.current.status === "done" && step < STAGES.length - 1) prepare(step + 1, true);
  };
  const togglePause = () => {
    if (snapshot.current.status === "running") {
      timelineRef.current?.pause();
      snapshot.current.status = "paused";
      setStatus("paused");
    } else if (snapshot.current.status === "paused") {
      snapshot.current.status = "running";
      setStatus("running");
      timelineRef.current?.play();
    }
  };
  const busy = status === "running" || status === "paused";
  const select = (target: number) => { if (!busy) prepare(target); };

  return {
    step, status, phase, metrics, busy, primary, togglePause, select,
    replay: () => { if (!busy) prepare(step, true); },
    previous: () => { if (!busy && step > 0) prepare(step - 1); },
    reset: () => prepare(0),
  };
}
