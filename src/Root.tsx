import React from "react";
import { Composition } from "remotion";
import { KidsVideo, calculateKidsVideoMetadata } from "./KidsVideo";
import { Thumbnail, calculateThumbnailMetadata } from "./Thumbnail";
import { CharacterSheet } from "./CharacterSheet";
import { Bumper, calculateBumperMetadata } from "./Bumper";
import { Bake } from "./Bake";
import { BackgroundSheet } from "./BackgroundSheet";
import { FPS } from "./lib/timing";

const DEFAULT_SLUG = "sample-twinkle";

export const RemotionRoot: React.FC = () => (
  <>
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
    <Composition id="Sheet-Backgrounds" component={BackgroundSheet} width={1920} height={1080} fps={FPS} durationInFrames={60} defaultProps={{ baked: {} }} />
    <Composition id="Sheet-Species" component={CharacterSheet} width={1920} height={1080} fps={FPS} durationInFrames={120} defaultProps={{ mode: "species" as const, kind: "bunny" as const }} />
    <Composition id="Sheet-Emotions" component={CharacterSheet} width={1920} height={1080} fps={FPS} durationInFrames={120} defaultProps={{ mode: "emotions" as const, kind: "bunny" as const }} />
    <Composition id="Sheet-Actions" component={CharacterSheet} width={1920} height={1080} fps={FPS} durationInFrames={120} defaultProps={{ mode: "actions" as const, kind: "bear" as const }} />
  </>
);
