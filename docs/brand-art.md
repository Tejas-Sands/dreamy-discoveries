# Dreamy Discoveries branding

The supplied `dreamy-d.png` is preserved byte-for-byte in
`public/brand/dreamy-d-original.png`. An SVG display mask isolates the circular
insignia and white lettering border. The background outside the badge is new,
deterministic artwork inspired by its pastel palette.

Every newly rendered `Video` ends with the episode's full spoken goodbye,
followed by the same six-second `BrandOutro` animation and original music-box
phrase. The episode music finishes before this signature. The planner and
compositor both include the additional 180 frames. Existing exported MP4s are
unchanged; render an existing slug again to include the new ending.

Opening cards preview up to three distinct learning topics from the episode.
Quiz and moral scenes and praise lines are excluded. If there are no callouts,
the opening displays the existing introduction text. No additional script or
voice generation is required, and permanent scripts are not edited.

The six Sunny Meadow characters now use the approved soft storybook style in
the production renderer: Taffy, Ben, Daisy, Fiona, Grandpa Tilly and Professor
Ozzy. Their species, colors and signature accessories come from the existing
recipes. The existing pose engine still drives their actions, expressions,
blinking and speech. Both canonical names and legacy species keys resolve to
the correct character.

The other 32 library characters also have the storybook finish. `StorybookPaint`
shades the existing species-specific bodies, ears, tails, markings and clothes
with scoped SVG gradients and softer outlines. Their shared face renderer uses
glossy oval eyes and soft blush, retaining each recipe's face placement, including
single-eye profiles and offset mouths. Unique React IDs keep identical characters
from sharing paint or mouth clips. No recipes or cast membership are changed.

`Dreamy-Preview` now demonstrates the production Daisy in the pastel meadow.
`Cast-Preview` shows all six at rest, waving, talking and dancing over 12 seconds.
`Library-Preview` shows the other 32 in four groups of eight over 48 seconds.
For static review sheets, pass `{"still":true}` and select frames 45, 405, 765
and 1125 to view each group with open eyes.
The original `DreamyDaisy.tsx` study remains as the approved artwork reference.
Existing exported videos are unchanged; re-render an existing slug to use the
upgraded artwork.

## Background library

All 25 background recipes now use a softer storybook palette, shaded clouds,
fuller painted trees and flowers, layered distance, and setting-specific edge
details. Indoor scenes gain small framed decorations and trim; natural scenes
gain grass and flowers; sand and snow gain surface marks; night scenes gain fine
stars. The central area stays open for actors and captions. The bedroom window
now renders above the wall, and the pond has a visible static water surface.

Static detail is included in the existing transparent PNG bake. Animated clouds,
weather, fish, butterflies and other foreground elements keep their frame clock.
The bake hash and both CI cache keys cover the background source directory and
shared palette, random, layout, Bake and baking-script dependencies. Existing
content-addressed PNGs are retained; re-running the bake reuses the new files.

`Background-Preview` tours all 25 settings over 50 seconds, with a character for
scale. Supply a `kind` prop for a single setting. Its metadata loads the baked
manifest, so the preview exercises the same cache path as episodes.

## Preview and export

```sh
npx remotion render Channel-Outro out/review/dreamy-brand/channel-outro.mp4 --codec=h264
npx remotion render Dreamy-Preview out/review/dreamy-brand/scene-preview.mp4 --codec=h264
npx remotion still Cast-Preview out/review/storybook-cast/cast.png --frame=105
npx remotion render Cast-Preview out/review/storybook-cast/cast-motion.mp4 --codec=h264
npx remotion render Library-Preview out/review/storybook-library/library-motion.mp4 --codec=h264
npx remotion still Sheet-Species out/review/storybook-library/all-38.png --scale=2
node scripts/bake-backgrounds.mjs
npx remotion render Background-Preview out/review/storybook-backgrounds/background-tour.mp4 --codec=h264
npx remotion still Background-Preview out/review/storybook-backgrounds/meadow.png --props='{"kind":"meadow"}' --frame=45
```

## Rebuild local artwork

The static sky and meadow are baked once, then loaded as PNGs. Keep both SVG
sources and baked PNGs in version control, alongside the original logo, mask
and jingle. No new dependencies, services or AI calls are involved.

```sh
node scripts/build-brand-art.mjs
node scripts/build-logo-mask.mjs
npx remotion still Brand-Art public/brand/dream-sky.png --props='{"scene":"dream-sky"}'
npx remotion still Brand-Art public/brand/sunny-meadow.png --props='{"scene":"sunny-meadow"}'
node scripts/build-audio-assets.mjs --only sfx --name dreamy-outro
```

The logo mask builder requires the pipeline's existing FFmpeg installation.
The generated mask is specific to this supplied image, not a general-purpose
background-removal tool. The original image file is never modified.

## Validation

```sh
npm run typecheck
node --test tests/*.test.mjs
node scripts/check-character-designs.mjs
```

Visually inspect the opening, the complete goodbye-to-signature transition,
the logo at full size, and the cast's motion when changing these assets.
The cast tests cover all six characters across 20 actions and nine emotions,
mouth and blink changes, back-facing visibility, and unique SVG paint IDs.
The library tests additionally exercise all 32 remaining rigs, their actions and
emotions, speech and back-facing behavior, and simultaneous copies of all 38.
Background checks cover all 25 recipes, time-independent static layers, unique
gradient IDs across overlapping copies, the PNG cache path and CI dependencies.
