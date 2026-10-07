# Reusable characters for Remotion

Use the existing `Character` component in every scene. The SVG art stays sharp at
any video resolution, and the existing frame-driven animation handles gestures,
expressions, blinking and mouth movement. No per-episode image generation is needed.

```tsx
import { Character } from "./components/characters/Character";

<Character
  kind="bunny"
  action="wave"
  emotion="happy"
  mouth={0}
  width={300}
  seed={1}
/>
```

`mouth` accepts 0–1; pass the existing speech envelope for dialogue. `actionT`
is seconds since the current gesture started. `flip` mirrors the character;
`still` freezes it for thumbnails. Keep a character's `seed` stable across shots.
Use `characterBox(centerX, groundY, width)` to position its feet on the floor.

## Where designs live

- `library/characters/*.json`: the actual renderable recipes and cast names.
- `src/components/characters/Character.tsx`: shared rendering, placement and reach API.
- `chartLayout.ts`: approved upright proportions and original reference cells.
- `performanceProfiles.ts`: individual motion styles and cast alias resolution.
- `StorybookBody.tsx` and `StorybookDetails.tsx`: connected limbs, heads, ears, tails and clothing.
- `StorybookFace.tsx` and `Face.tsx`: shared eyes, expressions and speech parameters.
- `SpeciesBody.tsx`: turtle, pony, aquatic, insect, reptile and other native anatomy.
- `src/lib/rigHands.ts`: contact coordinates shared by reaching and carried props.

Edit the artwork code when a shape needs changing. Descriptive JSON cannot add
artwork that has no drawing implementation. The bible importer is a lossy bootstrap;
it preserves every existing recipe and only creates missing entries. It is not the normal design-editing workflow.

## Preview before making an episode

```sh
npm run studio
# Select Cast-Preview: idle, wave, talking, dance, three seconds each.

npx remotion still Cast-Preview out/characters/cast-designs.png --frame=0
npx remotion still Sheet-Species out/characters/species.png --frame=0
npx remotion render Cast-Preview out/characters/cast-motion.mp4 --codec=h264
npx remotion still Sheet-Emotions out/characters/bunny-expressions.png
npx remotion still Sheet-Actions out/characters/bunny-actions.png --props='{"kind":"bunny"}'
```

All 38 existing recipes use the approved designs. The sole layout reference is
`/home/citrux/Sides/arr/Pastel Kawaii Animal Limb Chart.png`, preserved unchanged
under `public/references/`. Daisy and Ben guide motion and conversation timing.
The six named story characters remain the closed cast; the additional recipes
remain reusable library species.

`turn` and `turnVelocity` control local head/body direction and follow-through;
`performance` blends expressions and listening accents, while `mouthShape` follows
cached word timings. `reach` plus `stageCenter` attaches supported paws, wings or
Tilly's front flipper to objects. Use `heldProp` to render the carried object at the
same contact point. `still` ignores performance and turn input for thumbnails.
All animation depends on the requested frame, allowing independent render chunks.

```sh
node scripts/preview-character-chart.mjs --kinds=raccoon,snowman
node scripts/preview-character-chart.mjs --kinds=turtle,unicorn,whale --motion
node scripts/check-character-designs.mjs
npm test
npm run typecheck
```

The chart tool generates a rebuildable gallery at `out/review/character-chart/`,
reuses a browser, and cleans up its temporary bundle. `Cast-All-Motion`,
`Library-Preview`, `Sheet-Species`, `Sheet-Actions` and `Sheet-Emotions` remain
available in Studio. See [the animation guide](../docs/expressive-animation.md)
for the production architecture and physical event format.
