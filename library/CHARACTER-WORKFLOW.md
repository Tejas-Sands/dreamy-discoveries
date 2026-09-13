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
- `src/components/characters/Character.tsx`: silhouettes, limbs and attachment points.
- `src/components/characters/parts.tsx`: ears, tails, features and clothing.
- `src/components/characters/Face.tsx`: expressions and speaking faces.
- `SpeciesBody.tsx`: equines, insects, aquatic animals, reptiles, frog, star, snowman and giraffe.
- `MammalDetails.tsx`: species markings, fleece, quills, masks and distinctive tails.

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

All 38 characters now have a reviewed species design. Open `Cast-All-Motion` in
Studio to check the whole cast resting, waving, walking and dancing. Equines and
aquatic animals use profile artwork; mammals generally use front-facing artwork.

```sh
node scripts/check-character-designs.mjs
npx remotion render Cast-All-Motion out/characters/all-species-motion.mp4 --codec=h264
```

These are cutout rigs with a fixed drawing view per species. They support the existing stylized gestures;
true side/back views or articulated hands require additional artwork. Keep the
same component API when adding those views so episode scripts stay reusable.
