import React from "react";
import type { CharacterRecipe } from "./recipe";

export const softMix = (color: string, target: string, amount: number) => {
  const a = parseInt(color.slice(1), 16), b = parseInt(target.slice(1), 16);
  return "#" + [16, 8, 0].map(shift => Math.round(((a >> shift) & 255) * (1-amount) + ((b >> shift) & 255) * amount).toString(16).padStart(2,"0")).join("");
};

/** Keep the species-specific anatomy, and shade its existing material colors.
 * Scoped SVG CSS also reaches nested ears, markings and clothing components.
 * No raster filters or per-frame asset generation are needed. */
export const StorybookPaint: React.FC<{recipe: CharacterRecipe; uid: string; children: React.ReactNode}> = ({recipe, uid, children}) => {
  const colors = new Set<string>();
  const collect = (value: unknown) => {
    if (typeof value === "string" && /^#[\da-f]{6}$/i.test(value)) colors.add(value);
    else if (value && typeof value === "object") Object.values(value).forEach(collect);
  };
  collect(recipe);
  // Materials drawn directly by the specialist rigs (wings, snow, horns, spots).
  collect(["#d84c46", "#40333c", "#f3c5a6", "#f7fbff", "#e4f5fc", "#e7ca77", "#eee0b8", "#f4d184", "#dc91c2", "#428c7e", "#39313a", "#342e37"]);
  const outline = softMix(recipe.colors.body, "#67516c", .65);
  const root = `${uid}-paint`;
  const material = (color: string) => `${root}-${color.slice(1)}`;
  return <g id={root} data-storybook={recipe.name}>
    <defs>{[...colors].map(color => <radialGradient key={color} id={material(color)} cx=".28" cy=".2" r=".9">
      <stop stopColor={softMix(color,"#fff7e5",.58)}/>
      <stop offset=".4" stopColor={softMix(color,"#fff0d6",.32)}/>
      <stop offset=".78" stopColor={color}/>
      <stop offset="1" stopColor={softMix(color,"#92747e",.27)}/>
    </radialGradient>)}</defs>
    <style>{[
      ...[...colors].map(color => `#${root} [fill="${color}"]{fill:url(#${material(color)})}`),
      `#${root} [stroke="#2f2438"]{stroke:${outline}}`,
      ...[3,3.5,4,4.5,5].map(width => `#${root} [stroke-width="${width}"]{stroke-width:${width*.6}}`),
    ].join("\n")}</style>
    {children}
  </g>;
};
