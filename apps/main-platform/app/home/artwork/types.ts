import type { ComponentType } from "react";
import type { gsap } from "gsap";
import type { PanelKey } from "../utils";

export type ArtworkPanelKey = Exclude<PanelKey, "centerCore">;
export type ArtworkSceneProps = { id: string };
export type ArtworkAnimation = (
  timeline: gsap.core.Timeline,
  select: (selector: string) => Element[],
) => void;
export type ArtworkScene = {
  Component: ComponentType<ArtworkSceneProps>;
  animate: ArtworkAnimation;
};
