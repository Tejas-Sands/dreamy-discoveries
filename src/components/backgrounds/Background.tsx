import React, {useId} from "react";
import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { getPalette } from "../../lib/palettes";
import type { Palette } from "../../lib/palettes";
import { W } from "../../lib/layout";
import { BACKGROUND_RECIPES } from "../../generated/registry";
import type { BackgroundRecipe, PartGroup } from "./recipe";
import { PARTS, SceneryFrame } from "./parts";
import type { BakedMap } from "../../lib/baked";
import {sceneryColor, StorybookDetails, StorybookDistance} from "./StorybookScenery";
import {isActorForeground, sceneryParallax} from '../../lib/environment';

export const getBackgroundRecipe = (kind: string): BackgroundRecipe => BACKGROUND_RECIPES[kind] ?? BACKGROUND_RECIPES.meadow;

type PreparedPart = {Part: (typeof PARTS)[string]['Part']; options: Record<string, unknown>; index: number; name: string};
const preparedRecipes = new WeakMap<BackgroundRecipe, Record<PartGroup, PreparedPart[]>>();

/** Recipes are immutable; resolve layers and colors once rather than for every rendered frame. */
function preparedLayers(recipe: BackgroundRecipe) {
  const cached = preparedRecipes.get(recipe);
  if (cached) return cached;
  const layers: Record<PartGroup, PreparedPart[]> = {back:[],static:[],front:[]};
  recipe.parts.forEach((spec, index) => {
    const def = PARTS[spec.part];
    if (!def) return;
    const options = Object.fromEntries(Object.entries(spec).map(([key,value]) => [key,
      typeof value === 'string' ? sceneryColor(value) : Array.isArray(value) ? value.map(item => typeof item === 'string' ? sceneryColor(item) : item) : value]));
    layers[def.group].push({Part:def.Part, options, index, name:spec.part});
  });
  preparedRecipes.set(recipe,layers);
  return layers;
}

/** renders every part of one group, in recipe order; `uid` uniques any defs/gradients */
export const BackgroundLayer: React.FC<{ recipe: BackgroundRecipe; group: PartGroup; t: number; palette: Palette; selection?: 'all' | 'behind' | 'actors' }> = ({ recipe, group, t, palette, selection = 'all' }) => {
  const uid = `scenery-${useId().replace(/:/g, "")}`;
  return (
  <>
    {group === "static" ? <StorybookDistance kind={recipe.name}/> : null}
    {preparedLayers(recipe)[group].filter(({name}) => selection === 'all' || isActorForeground(name) === (selection === 'actors')).map(({Part,options,index,name}) => {
      return <g key={`${name}${index}`} data-scenery-part={name}><Part t={t} o={{ ...options, scene:recipe.name, uid: `${uid}-${index}` }} p={{...palette,ground:sceneryColor(palette.ground)}} /></g>;
    })}
    {group === "static" ? <SceneryFrame kind={recipe.name} /> : null}
    {group === "static" ? <StorybookDetails kind={recipe.name}/> : null}
  </>
);
};

/**
 * A scene background: gradient → animated back layer → scenery (a baked PNG when
 * available, else drawn live) → animated front layer.
 */
export interface BackgroundProps {kind: string; palette: Palette; frameOffset?: number; motion?: number; animationT?: number; baked?: BakedMap; splitForeground?: boolean; parallax?: {x: number; y: number}}

export const Background: React.FC<BackgroundProps> = ({ kind, palette, frameOffset = 0, motion = 0.55, animationT, baked, splitForeground = false, parallax }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = animationT ?? (frame + frameOffset) / fps;
  const drift = Math.sin(t * 0.16) * Math.max(0,Math.min(1,motion));
  const depth = sceneryParallax(t, motion, parallax);
  const layered = splitForeground || !!parallax;
  const middleTransform = layered ? `translate(${depth.middle.x}px, ${depth.middle.y}px) scale(1.01)` : undefined;
  const recipe = getBackgroundRecipe(kind);
  const [a, b] = recipe.gradient.map(sceneryColor);
  const bakedFile = baked?.[recipe.name];
  const sceneryPalette = getPalette(recipe.palette);
  // Scenery uses its recipe palette in both cached and live renders.
  const night = recipe.palette === "night";
  return (
    <AbsoluteFill style={{
      background: `linear-gradient(${a}, ${b})`,
    }}>
      {!night ? <AbsoluteFill style={{ background: "radial-gradient(ellipse at 70% 30%, #fff2d94a, transparent 60%)", pointerEvents: "none" }} /> : null}
      <svg width={W} height={1080} viewBox={`0 0 ${W} 1080`} style={{ position: "absolute", left: 0, top: 0, transform:layered ? `translate(${depth.back.x}px, ${depth.back.y}px) scale(1.012)` : `translateX(${drift*5}px) scale(1.012)` }}>
        <BackgroundLayer recipe={recipe} group="back" t={t} palette={sceneryPalette} />
      </svg>
      {bakedFile ? (
        <Img src={staticFile(`baked/${bakedFile}`)} style={{ position: "absolute", left: 0, top: 0, width: W, height: 1080, transform:middleTransform }} />
      ) : (
        <svg width={W} height={1080} viewBox={`0 0 ${W} 1080`} style={{ position: "absolute", left: 0, top: 0, transform:middleTransform }}>
          <BackgroundLayer recipe={recipe} group="static" t={0} palette={sceneryPalette} />
        </svg>
      )}
      <svg width={W} height={1080} viewBox={`0 0 ${W} 1080`} style={{ position: "absolute", left: 0, top: 0, transform:layered ? middleTransform : `translateX(${-drift*9}px) scale(1.015)` }}>
        <BackgroundLayer recipe={recipe} group="front" t={t} palette={sceneryPalette} selection={splitForeground ? 'behind' : 'all'} />
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

/** Only selected foliage/weather sits in front of actors; caption space is clipped clear. */
export const BackgroundForeground: React.FC<BackgroundProps> = ({kind, frameOffset = 0, motion = .55, animationT, parallax, splitForeground = true}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const uid = `foreground-${useId().replace(/:/g, '')}`;
  const t = animationT ?? (frame + frameOffset) / fps;
  const recipe = getBackgroundRecipe(kind), depth = sceneryParallax(t, motion, parallax).front;
  if (!splitForeground) return null;
  return <svg width={W} height={1080} viewBox={`0 0 ${W} 1080`} style={{position: 'absolute', left: 0, top: 0, pointerEvents: 'none'}}>
    <defs><clipPath id={uid}><rect width={W} height={925} /></clipPath></defs>
    <g clipPath={`url(#${uid})`} opacity={.55 + Math.max(0, Math.min(1, motion)) * .45}>
      <g transform={`translate(${depth.x} ${depth.y})`}>
        <BackgroundLayer recipe={recipe} group="front" t={t} palette={getPalette(recipe.palette)} selection="actors" />
      </g>
    </g>
  </svg>;
};
