# Production color and object contact

All 25 backgrounds and 38 character designs now receive the production color
treatment by default, including episodes, thumbnails, previews and character
sheets. No script opt-in is required. Existing slugs use it when rendered again;
saved scripts and recordings are not rewritten.

`src/lib/colorGrade.ts` holds the fixed look. Daylight scenery uses saturation
1.8, contrast 1.15 and brightness .985; characters and props use 1.4, 1.15 and
.985. This is slightly stronger than the Sunny study. Night scenery uses 1.45,
1.08 and 1.01 to retain shadow detail. Captions retain their own colors.

Background and foreground renderers each apply their own pass once. Bake and
BackgroundLayer still produce ungraded artwork, so cached PNGs remain reusable
without double grading. PropArt is raw; either Character or StageProps supplies
its color pass. Explicit original/sunny/vivid options remain developer previews.

Reach samples retain the object's world center and include its shape, size and
rotation. `propGeometry.ts` computes the actor-facing surface contact; rigHands
solves the limb to that point. Bare point reaches retain their exact targets.
Production objects draw in one layer above the actors, so the object occludes
the palm at contact instead of exposing fingers in its center. Carrying and
handover artwork follows sampled world coordinates and keeps its authored
rotation; decorative wobble does not move held or unowned objects away from
their sampled contact. Pointed or
irregular objects use bounded footprint approximations rather than a physics
simulation.

```sh
npm test
npm run typecheck
node scripts/check-character-designs.mjs
node scripts/preview-animation-pilot.mjs --grade production --compare --gallery
```

The local review directory is
`out/review/dev-animation-pilot-production-2026-10-23/`. It includes the corrected
pilot, production dialogue/handover/question frames, all-character and
all-background sheets, individual night/interior/snow/underwater examples,
matched grading comparisons, and media/loudness verification reports.

The final local check passed 325 tests, TypeScript and all 38 recipe checks.
The corrected 24-second, 720-frame pilot fully decoded and measured -16.94 LUFS
and -1.98 dBTP. These are local verification results, not GitHub runner benchmarks.
