import { gsap } from "gsap";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { Flip } from "gsap/Flip";

gsap.registerPlugin(DrawSVGPlugin, MotionPathPlugin, Flip);

type SceneCallbacks = {
  phase: (index: number) => void;
  checkpoint: (index: number) => void;
  complete: () => void;
  update: (progress: number) => void;
};

export function createCleaningTimeline(root: HTMLElement, step: number, callbacks: SceneCallbacks) {
  const find = (selector: string) => Array.from(root.querySelectorAll<HTMLElement | SVGElement>(selector));
  const reveal = (name: string, at: number, duration = 0.5) => {
    timeline.fromTo(find(`[data-reveal="${name}"]`), { y: 12 }, { y: 0, autoAlpha: 1, duration, immediateRender: false }, at);
  };
  const phase = (index: number, at: number, end: number) => {
    timeline.addLabel(`phase-${index}`, at);
    timeline.call(() => callbacks.phase(index), [], at);
    timeline.call(() => callbacks.checkpoint(index), [], end);
  };
  const timeline = gsap.timeline({
    paused: true,
    defaults: { duration: 0.6, ease: "power2.inOut" },
    onComplete: callbacks.complete,
    onUpdate() { callbacks.update(this.progress()); },
  });

  gsap.set(find("[data-reveal], [data-gate-result]"), { autoAlpha: 0 });
  gsap.set(find("[data-draw], [data-feature-path]"), { drawSVG: 0 });
  gsap.set(find("[data-playback-progress]"), { scaleX: 0, transformOrigin: "left center" });

  if (step === 0) {
    gsap.set(find("[data-record-row]"), { autoAlpha: 0, y: 20 });
    phase(0, 0.05, 1.2);
    phase(1, 1.2, 3.25);
    timeline.to(find("[data-draw]"), { drawSVG: "100%", duration: 0.85 }, 0.15);
    reveal("load-badge", 0.35);
    timeline.to(find("[data-record-row]"), { autoAlpha: 1, y: 0, stagger: 0.18, duration: 0.65 }, 1.05);
    reveal("load-summary", 2.3);
  } else if (step === 1) {
    gsap.set(find("[data-field-type]"), { autoAlpha: 0.3 });
    gsap.set(find("[data-field-check], [data-inspect-scan]"), { autoAlpha: 0 });
    phase(0, 0.05, 1.2);
    phase(1, 1.2, 2.2);
    phase(2, 2.2, 3.4);
    timeline.to(find("[data-field-type]"), { autoAlpha: 1, stagger: 0.07 }, 0.15);
    timeline.to(find("[data-inspect-scan]"), { autoAlpha: 1, duration: 0.15 }, 0.15);
    timeline.to(find("[data-inspect-scan]"), { y: () => (root.querySelector(".cl-inspect-field-grid")?.clientHeight ?? 180) - 3, duration: 1.1, ease: "none" }, 0.2);
    timeline.to(find("[data-inspect-scan]"), { autoAlpha: 0, duration: 0.2 }, 1.3);
    timeline.to(find("[data-field-check]"), { autoAlpha: 1, stagger: 0.06, duration: 0.3 }, 0.5);
    reveal("missing", 1.4);
    reveal("duplicate", 2.45);
  } else if (step === 2) {
    phase(0, 0.05, 1.5);
    phase(1, 1.5, 3.25);
    const arrows = find("[data-draw]");
    timeline.to(arrows[0], { drawSVG: "100%", duration: 0.6 }, 0.2);
    reveal("time-start", 0.65);
    timeline.to(arrows[1], { drawSVG: "100%", duration: 0.6 }, 1.55);
    reveal("time-end", 1.95);
    reveal("time-coverage", 2.55);
  } else if (step === 3) {
    gsap.set(find("[data-derived-field]"), { autoAlpha: 0, y: -12 });
    for (let i = 0; i < 4; i++) {
      const at = 0.1 + i * 0.8;
      phase(i, at, at + 0.78);
      timeline.to(find(`[data-feature-path="${i}"]`), { drawSVG: "100%", duration: 0.45 }, at);
      timeline.to(find(`[data-derived-field="${i}"]`), { autoAlpha: 1, y: 0, duration: 0.5 }, at + 0.25);
    }
    reveal("week-summary", 3.15);
  } else if (step === 4) {
    phase(0, 0.05, 1.6);
    phase(1, 1.6, 3.5);
    timeline.to(find("[data-draw]"), { drawSVG: "100%", duration: 1.0 }, 0.25);
    reveal("duration-answer", 0.7, 0.75);
    reveal("duration-tail", 1.9, 0.7);
  } else if (step === 5) {
    phase(0, 0.05, 1.35);
    phase(1, 1.4, 3.05);
    phase(2, 3.1, 5.55);
    phase(3, 5.6, 7.2);
    gsap.set(find("[data-flow-particle]"), { autoAlpha: 0 });
    [1.0, 2.65, 5.1, 6.65].forEach((at, i) => timeline.to(find(`[data-gate-result="${i}"]`), { autoAlpha: 1, duration: 0.3 }, at));
    const travel = (route: string, at: number, duration: number) => {
      const path = root.querySelector<SVGPathElement>(`[data-route="${route}"]`)!;
      const particles = find(`[data-flow-particle="${route}"]`);
      timeline.set(particles, { autoAlpha: 1 }, at);
      timeline.to(particles, {
        duration, ease: "none", stagger: 0.1,
        motionPath: { path, align: path, alignOrigin: [0.5, 0.5] },
      }, at);
      timeline.to(particles, { autoAlpha: 0, duration: 0.16, stagger: 0.1 }, at + duration);
    };
    travel("long", 1.65, 0.85);
    reveal("long-receipt", 2.65, 0.35);
    reveal("coordinate-plot", 3.25);
    timeline.to(find("[data-draw]"), { drawSVG: "100%", duration: 0.7 }, 3.65);
    travel("coord", 3.65, 1.0);
    reveal("coord-receipt", 4.9, 0.35);
    reveal("reject-ledger", 4.6, 0.5);
    travel("accept", 5.75, 0.75);
  } else {
    phase(0, 0.05, 1.5);
    phase(1, 1.5, 3.4);
    const fields = find("[data-output-field]") as HTMLElement[];
    const state = Flip.getState(fields);
    fields.forEach(field => gsap.set(field, { order: Number(field.dataset.outputOrder) }));
    const flip = Flip.from(state, { duration: 1.15, ease: "power2.inOut", scale: false, paused: true });
    timeline.add(flip.play(0), 0.15);
    reveal("output-check", 1.65);
    reveal("output-result", 1.7, 0.65);
    reveal("output-handoff", 2.6);
  }

  timeline.to(find("[data-playback-progress]"), { scaleX: 1, duration: timeline.duration(), ease: "none" }, 0);
  return timeline;
}
