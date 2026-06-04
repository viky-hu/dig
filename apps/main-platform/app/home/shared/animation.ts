import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { Flip } from "gsap/Flip";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(CustomEase, Flip, ScrollTrigger);

export const LINE_DRAW_EASE = CustomEase.create(
  "line-draw-ease",
  "M0,0 C0.08,0 0.14,0.02 0.2,0.1 0.32,0.24 0.42,0.8 0.6,0.9 0.76,0.96 0.88,0.99 1,1",
);

export const LOGO_DRAW_EASE = CustomEase.create(
  "logo-draw-ease",
  "M0,0 C0.1,0.005 0.18,0.03 0.25,0.12 0.35,0.24 0.44,0.72 0.62,0.88 0.78,0.95 0.9,0.99 1,1",
);
