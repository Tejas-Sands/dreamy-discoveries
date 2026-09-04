import React from "react";
import { AbsoluteFill } from "remotion";
import { BackgroundLayer, getBackgroundRecipe } from "./components/backgrounds/Background";
import { getPalette } from "./lib/palettes";
import { W } from "./lib/layout";

/** Dev/CI composition: the static scenery of one background on a transparent canvas (baked to PNG once). */
export const Bake: React.FC<{ background: string }> = ({ background }) => {
  const recipe = getBackgroundRecipe(background);
  const palette = getPalette(recipe.palette);
  return (
    <AbsoluteFill style={{ background: "transparent" }}>
      <svg width={W} height={1080} viewBox={`0 0 ${W} 1080`}>
        <BackgroundLayer recipe={recipe} group="static" t={0} palette={palette} />
      </svg>
    </AbsoluteFill>
  );
};
