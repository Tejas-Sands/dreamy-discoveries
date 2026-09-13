import React from "react";
import { Composition } from "remotion";
import { KidsVideo, calculateKidsVideoMetadata } from "./KidsVideo";
import { Thumbnail, calculateThumbnailMetadata } from "./Thumbnail";
import { CharacterSheet, CastPreview, LibraryPreview } from "./CharacterSheet";
import { Bumper, calculateBumperMetadata } from "./Bumper";
import { Bake } from "./Bake";
import { BackgroundSheet, BackgroundPreview } from "./BackgroundSheet";
import { BRAND_OUTRO_SEC, FPS } from "./lib/timing";
import { BrandOutro } from "./components/BrandOutro";
import {fetchBaked} from "./lib/baked";
import { BrandArt, BrandPreview } from "./BrandPreview";

const DEFAULT_SLUG = "sample-twinkle";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Channel-Outro" component={BrandOutro} width={1920} height={1080} fps={FPS} durationInFrames={BRAND_OUTRO_SEC * FPS} />
    <Composition id="Brand-Art" component={BrandArt} width={1920} height={1080} fps={FPS} durationInFrames={1} defaultProps={{ scene: "dream-sky" }} />
    <Composition id="Dreamy-Preview" component={BrandPreview} width={1920} height={1080} fps={FPS} durationInFrames={6 * FPS} />
    <Composition
      id="Video"
      component={KidsVideo}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={30 * FPS}
      defaultProps={{ slug: DEFAULT_SLUG, script: null }}
      calculateMetadata={calculateKidsVideoMetadata}
    />
    <Composition
      id="Thumbnail"
      component={Thumbnail}
      width={1280}
      height={720}
      fps={FPS}
      durationInFrames={1}
      defaultProps={{ slug: DEFAULT_SLUG, script: null }}
      calculateMetadata={calculateThumbnailMetadata}
    />
    <Composition
      id="Bumper"
      component={Bumper}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={3 * FPS}
      defaultProps={{ slug: DEFAULT_SLUG, script: null, label: "Next up!" }}
      calculateMetadata={calculateBumperMetadata}
    />
    <Composition id="Bake" component={Bake} width={1920} height={1080} fps={FPS} durationInFrames={1} defaultProps={{ background: "meadow" }} />
    {/* dev aids: every species / emotion / action / background on one screen */}
    <Composition id="Cast-Preview" component={CastPreview} width={1920} height={1080} fps={FPS} durationInFrames={12 * FPS} />
    <Composition id="Library-Preview" component={LibraryPreview} width={1920} height={1080} fps={FPS} durationInFrames={48 * FPS} />
    <Composition id="Cast-All-Motion" component={CharacterSheet} width={1920} height={1080} fps={FPS} durationInFrames={12 * FPS} defaultProps={{ mode: "species" as const, kind: "bunny", animate: true }} />
    <Composition id="Background-Preview" component={BackgroundPreview} width={1920} height={1080} fps={FPS} durationInFrames={50 * FPS} defaultProps={{kind:""}} calculateMetadata={async ({props}) => ({props:{...props,baked:await fetchBaked()}})} />
    <Composition id="Sheet-Backgrounds" component={BackgroundSheet} width={1920} height={1080} fps={FPS} durationInFrames={60} defaultProps={{ baked: {} }} />
    <Composition id="Sheet-Species" component={CharacterSheet} width={1920} height={1080} fps={FPS} durationInFrames={120} defaultProps={{ mode: "species" as const, kind: "bunny" as const }} />
    <Composition id="Sheet-Emotions" component={CharacterSheet} width={1920} height={1080} fps={FPS} durationInFrames={120} defaultProps={{ mode: "emotions" as const, kind: "bunny" as const }} />
    <Composition id="Sheet-Actions" component={CharacterSheet} width={1920} height={1080} fps={FPS} durationInFrames={120} defaultProps={{ mode: "actions" as const, kind: "bear" as const }} />
    <Composition id="Sheet-Dances" component={CharacterSheet} width={1920} height={1080} fps={FPS} durationInFrames={120} defaultProps={{ mode: "dances" as const, kind: "bear" as const }} />
  </>
);
