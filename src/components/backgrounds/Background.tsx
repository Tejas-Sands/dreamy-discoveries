import React from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { getPalette } from "../../lib/palettes";
import type { Palette } from "../../lib/palettes";
import { W } from "../../lib/layout";
import { BACKGROUND_RECIPES } from "../../generated/registry";
import type { BackgroundRecipe, PartGroup } from "./recipe";
import { PARTS, SceneryFrame } from "./parts";
import type { BakedMap } from "../../lib/baked";

export const getBackgroundRecipe = (kind: string): BackgroundRecipe => BACKGROUND_RECIPES[kind] ?? BACKGROUND_RECIPES.meadow;

/** renders every part of one group, in recipe order; `uid` uniques any defs/gradients */
export const BackgroundLayer: React.FC<{ recipe: BackgroundRecipe; group: PartGroup; t: number; palette: Palette }> = ({ recipe, group, t, palette }) => (
  <>
    {recipe.parts.map((spec, i) => {
      const def = PARTS[spec.part];
      if (!def || def.group !== group) return null;
      const P = def.Part;
      return <P key={`${spec.part}${i}`} t={t} o={{ ...spec, uid: `${recipe.name}-${group}-${i}` } as Record<string, unknown>} p={palette} />;
    })}
    {group === "static" ? <SceneryFrame kind={recipe.name} /> : null}
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
  const sceneryPalette = getPalette(recipe.palette);
  // Scenery uses its recipe palette in both cached and live renders.
  const night = recipe.palette === "night";
  return (
    <AbsoluteFill style={{
      background: `linear-gradient(${a}, ${b})`,
    }}>
      {!night && recipe.parts.some((part) => part.part === "sun") ? <AbsoluteFill style={{ background: parseInt(a.slice(5, 7), 16) > parseInt(a.slice(1, 3), 16)
        ? "linear-gradient(rgba(0,158,225,0.30), transparent 68%)"
        : "linear-gradient(rgba(255,182,48,0.22), transparent 68%)", pointerEvents: "none" }} /> : null}
      <svg width={W} height={1080} viewBox={`0 0 ${W} 1080`} style={{ position: "absolute", left: 0, top: 0 }}>
        <BackgroundLayer recipe={recipe} group="back" t={t} palette={sceneryPalette} />
      </svg>
      {bakedFile ? (
        <Img src={staticFile(`baked/${bakedFile}`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: 1080 }} />
      ) : (
        <svg width={W} height={1080} viewBox={`0 0 ${W} 1080`} style={{ position: "absolute", left: 0, top: 0 }}>
          <BackgroundLayer recipe={recipe} group="static" t={0} palette={sceneryPalette} />
        </svg>
      )}
      <svg width={W} height={1080} viewBox={`0 0 ${W} 1080`} style={{ position: "absolute", left: 0, top: 0 }}>
        <BackgroundLayer recipe={recipe} group="front" t={t} palette={sceneryPalette} />
      </svg>
      {/* Static colored light adds depth without extra animation or cache invalidation. */}
      <AbsoluteFill style={{ pointerEvents: "none", background: night
        ? "radial-gradient(ellipse at 78% 12%, rgba(169,154,224,0.12), transparent 55%)"
        : "radial-gradient(ellipse at 16% 5%, rgba(255,231,135,0.24), transparent 48%), radial-gradient(ellipse at 95% 85%, rgba(37,168,153,0.12), transparent 48%)" }} />
      {/* Keep a little ground weight so the characters sit in the scene. */}
      <AbsoluteFill style={{ pointerEvents: "none", background: "radial-gradient(135% 100% at 50% 38%, rgba(255,255,255,0) 55%, rgba(46,34,92,0.08) 100%)" }} />
      <AbsoluteFill style={{ pointerEvents: "none", background: "linear-gradient(to top, rgba(31,57,64,0.07), rgba(15,8,22,0) 20%)" }} />
    </AbsoluteFill>
  );
};
