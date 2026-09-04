import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { Palette } from "../../lib/palettes";
import { W } from "../../lib/layout";
import { BACKGROUND_RECIPES } from "../../generated/registry";
import type { BackgroundRecipe, PartGroup } from "./recipe";
import { PARTS } from "./parts";
import type { BakedMap } from "../../lib/baked";

export const getBackgroundRecipe = (kind: string): BackgroundRecipe => BACKGROUND_RECIPES[kind] ?? BACKGROUND_RECIPES.meadow;

/** renders every part of one group, in recipe order */
export const BackgroundLayer: React.FC<{ recipe: BackgroundRecipe; group: PartGroup; t: number; palette: Palette }> = ({ recipe, group, t, palette }) => (
  <>
    {recipe.parts.map((spec, i) => {
      const def = PARTS[spec.part];
      if (!def || def.group !== group) return null;
      const P = def.Part;
      return <P key={`${spec.part}${i}`} t={t} o={spec as Record<string, unknown>} p={palette} />;
    })}
  </>
);

/**
 * A scene background: gradient → animated back layer → scenery (a baked PNG when
 * available, else drawn live) → animated front layer.
 */
export const Background: React.FC<{ kind: string; palette: Palette; frameOffset?: number; baked?: BakedMap }> = ({ kind, palette, frameOffset = 0, baked }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = (frame + frameOffset) / fps;
  const recipe = getBackgroundRecipe(kind);
  const [a, b] = recipe.gradient;
  const bakedFile = baked?.[recipe.name];
  return (
    <AbsoluteFill style={{ background: `linear-gradient(${a}, ${b})` }}>
      <svg width={W} height={1080} viewBox={`0 0 ${W} 1080`} style={{ position: "absolute", left: 0, top: 0 }}>
        <BackgroundLayer recipe={recipe} group="back" t={t} palette={palette} />
      </svg>
      {bakedFile ? (
        <Img src={staticFile(`baked/${bakedFile}`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: 1080 }} />
      ) : (
        <svg width={W} height={1080} viewBox={`0 0 ${W} 1080`} style={{ position: "absolute", left: 0, top: 0 }}>
          <BackgroundLayer recipe={recipe} group="static" t={0} palette={palette} />
        </svg>
      )}
      <svg width={W} height={1080} viewBox={`0 0 ${W} 1080`} style={{ position: "absolute", left: 0, top: 0 }}>
        <BackgroundLayer recipe={recipe} group="front" t={t} palette={palette} />
      </svg>
    </AbsoluteFill>
  );
};
