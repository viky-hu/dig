import { OverviewScene, animateOverview } from "./OverviewScene";
import { CleaningScene, animateCleaning } from "./CleaningScene";
import { TimeScene, animateTime } from "./TimeScene";
import { DurationScene, animateDuration } from "./DurationScene";
import { SpatialScene, animateSpatial } from "./SpatialScene";
import { FlowScene, animateFlow } from "./FlowScene";
import { MembersScene, animateMembers } from "./MembersScene";
import { OutlookScene, animateOutlook } from "./OutlookScene";
import type { ArtworkPanelKey, ArtworkScene } from "./types";

export const ARTWORK_SCENES: Record<ArtworkPanelKey, ArtworkScene> = {
  framework: { Component: OverviewScene, animate: animateOverview },
  iconography: { Component: CleaningScene, animate: animateCleaning },
  voiceTone: { Component: TimeScene, animate: animateTime },
  color: { Component: DurationScene, animate: animateDuration },
  logo: { Component: SpatialScene, animate: animateSpatial },
  imagery: { Component: FlowScene, animate: animateFlow },
  typography: { Component: MembersScene, animate: animateMembers },
  motion: { Component: OutlookScene, animate: animateOutlook },
};
