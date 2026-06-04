import { gsap } from "gsap";
import { CustomEase } from "gsap/CustomEase";

gsap.registerPlugin(CustomEase);

export const CHAT_LINE_EASE = CustomEase.create(
  "chat-line-ease",
  "M0,0 C0.08,0.01 0.18,0.05 0.26,0.2 0.36,0.44 0.54,0.86 0.72,0.95 0.86,0.99 0.94,1 1,1",
);
