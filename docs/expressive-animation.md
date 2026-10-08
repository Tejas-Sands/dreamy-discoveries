# Expressive animation

**Current artwork reference (October 7):**
The supplied Pastel Kawaii Animal Limb Chart is the sole source for character
layout, proportions, native limbs, colors and clothing. An unchanged copy lives
at [public/references/pastel-kawaii-animal-limb-chart.png](../public/references/pastel-kawaii-animal-limb-chart.png).
This supersedes the earlier Daisy/Ben artwork expansion and character-bible
appearance choices. Daisy and Ben remain references for motion timing and
conversation behavior only. Existing character and cast IDs are retained.

Run `node scripts/preview-character-chart.mjs` for 38 individual comparisons at
`out/review/character-chart/index.html`. Each comparison places the original
chart cell beside the production rig at rest and with a torso tilt/native limb
gesture. Use `--kinds=turtle,zebra` to revisit individual animals. The two whale
drawings are alternate views of one existing recipe. These previews use the same
production components as episodes, thumbnails and the full character test suite.

The attachment follow-up corrects the raccoon and squirrel ear roots, anchors
the snowman's scarf collar to its neck, reshapes the turtle's face, and redraws
the unicorn and whale from the same chart. Only the snowman's hanging scarf end
receives cloth lag. The whale's native jaw retains speech and emotion input.
Use `node scripts/preview-character-chart.mjs --kinds=raccoon,snowman,squirrel,turtle,unicorn,whale --motion`
for silent eight-second clips and stills at both turn extremes. The focused
gallery is `out/review/character-chart/motion.html`. The clips use synthetic
mouth envelopes for visual inspection; they do not validate recorded dialogue.

`chartLayout.ts` records each upright animal's proportions and source cell.
`StorybookBody.tsx` draws continuous paws, wings and hooves; `StorybookDetails.tsx`
supplies individual heads, ears, tails and clothing. `SpeciesBody.tsx` handles
the horizontal flipper turtle, front-facing unicorn, insects, aquatic animals
and other specialist silhouettes. Tilly's carrying anchor follows the front
flipper. All artwork remains deterministic SVG with the existing body-motion
engine; the reference PNG is used only in developer comparisons.

Expressive animation is enabled from `presentationVersion: 3`. Newly generated episodes now use version 4, which builds on this animation with the [Remotion quality improvements](remotion-quality.md). The animation upgrade adds blended facial acting, delayed listener reactions, phrase accents, three-quarter/profile geometry, 38 individual motion profiles, spelling-based speech shapes, reactive ears/tails/scarf, physical object actions, and camera changes tied to the story. Important actions soften background movement. Questions and bedtime scenes retain steady framing.

The existing Director, SVG art, cached voices, and Remotion renderer supply everything. There are no new dependencies, paid services, generated assets, or AI stages. The writing prompt still uses the existing script-generation call; templates and the developer showcase use no AI.

Every motion sample depends on script data, recorded word timing/amplitude, and an absolute requested frame. Repeated or out-of-order samples agree. Existing saved episodes retain their presentation version and voice settings through `--slug`; the implementation does not rewrite permanent scripts.

The developer showcase includes all six animals, a rolling/caught ball, an apple handover, a pushed/caught ball, a book opening, watering, construction in three steps, a question, and a quiet ending. The comparison uses the same recorded speech and schedule in both panels. Its Before panel selects presentation 2 and removes the six new interaction kinds; After supplies the only audible track. This is a controlled feature comparison, rather than a previously published episode.

```sh
node scripts/preview-animation.mjs
npm run tts -- --slug dev-animation-v3
npm run bake -- --slug dev-animation-v3
npx remotion render Animation-Comparison out/review/animation-v3/comparison.mp4 --props='{"slug":"dev-animation-v3","script":null}' --scale=0.5 --concurrency=4
npx remotion still Sheet-Species out/characters/species.png
```

The preview writer creates a new `dev-` slug exclusively. Re-running it preserves measured audio timing and leaves the latest pointer, library, catalog, and universe alone. Use another new `dev-` slug for a revised showcase. The normal episode composition remains `Video`; `Animation-Comparison` and the character sheets are developer compositions. `KidsVideo` and its cards support optional `muted` for the comparison; ordinary playback remains audible.

Physical events retain the existing zero-based `line`, `propId`, optional `actor`/`to`, `delaySec`, and `durationSec`. They execute within measured line bounds. Optional fields extend the existing format:

| Kind | Additional data | Result |
| --- | --- | --- |
| `push` | `endpoint: {x,y}` or signed `distance` | Grounded destination persists |
| `roll` | `endpoint: {x,y}` or signed `distance` | Distance-derived rotation, then a stopped object |
| `catch` | Optional `endpoint` for the launch point | Arc to the receiving paw, then persistent ownership |
| `open` | Initial book `openProgress: 0` | Cover/pages open to 1 |
| `water` | Optional incremental `amount` | Can, aimed droplets, accumulated wet state |
| `build` | Initial `buildProgress: 0`, optional incremental `amount` | Castle/snowman portions accumulate to 1 |

For authored catches, keep the launch override consistent with the initial prop position. Omitted book/build state retains the complete legacy artwork. Automatically created v3 books start closed; constructions start empty. Completed state and ownership persist across cuts and reversed actor roles. Grounded objects retain their original location.

New automatic physical action inference is deliberately narrow: an affirmative first-person or present cast subject, a supported completed verb, and the concrete direct object. For example, `I push the ball.`, `Ben catches the apple.`, `I open the book.`, `I water the flower.`, and `I build a snow friend.` work. Questions, negatives, proposed actions, unrelated verbs, and unknown speakers leave the object still. Use explicit staging for complex narration. No narration is added by the motion engine.

A rolling opening also accepts a present character's first-line reaction such as `Oops! My ball is rolling away!` or `Oh! My apple rolled away!`, with the matching scene prop. It begins grounded motion at the opening frame and remains restricted to that initial hook; speculative language and narrator guesses do not trigger it.

Automatically planned stages use `staging.auto: true` and receive the cinematic wide/object/reaction/shared edit list. Authored stages without that flag retain their explicit shot preset. Authors can set `auto: true` on an otherwise fully authored stage to request the cinematic camera while keeping their positions, props, and events. Quiet and question scenes settle in either case. Outgoing event cues retire when the next action takes focus. Captions and question overlays remain outside the camera.

The rig accepts optional `performance`, `mouthShape`, `turn`, and `turnVelocity`. Turns and velocities are in local rig space and mirror with `flip`; the episode renderer samples consecutive requested frames to obtain velocity without playback state. Thumbnails ignore the new inputs. Mouth shapes approximate spelling using existing word times and speech amplitude; they are not phoneme recognition. Pauses and measured silence close the mouth.

The initial October 7 character pass extended the Daisy/Ben treatment to the remaining
36 existing designs. `performanceProfiles.ts` gives all 38 species their own
gesture weight, listening posture and step timing. `StorybookDetails.tsx` keeps
the upright animals' individual heads, ears, tails, markings and accessories;
specialist rigs retain their quadruped, aquatic, insect and reptile anatomy while
sharing the storybook eye and speech renderer. Hooves, wings and flippers keep
their own silhouettes. The six-member named cast and saved episode scripts are
unchanged by this pass.

The follow-up body-motion pass adds a hip-based torso tilt and shoulder turn to
every species. Upright feet and quadruped/reptile ground contacts stay outside
the upper-body rotation. Heads counterbalance the lean, arms move with their
shoulders, and ears/tails/loose clothing follow the body's velocity. Natural
tail movement is preserved instead of being replaced by the secondary motion.
Held-object hand anchors use the same torso transform as the visible arms.

## Production integration and verification

Episodes, thumbnails, cards and previews all use `Character`; there is no
per-episode character setup. Cast aliases resolve from `library/cast.json`,
and all 38 permanent recipes have individual performance profiles. Upright
rig selection derives from the chart layouts so anatomy and reach coordinates
cannot diverge through a separate list of species.

The superseded body, part and separate-finger renderers and one-off Ben/Daisy
approval scenes have been removed. Character review outputs can be regenerated
using the chart tool; it reuses one browser and removes its build directory even
if a render fails. It copies the reference image and local fonts without the voice library.
Permanent scripts, voices and baked scenery are preserved.

Run the complete checks after changes:

```sh
npm test
npm run typecheck
node scripts/check-character-designs.mjs
```

Coverage includes every recipe's artwork and speech, unique SVG IDs, finite and
deterministic action/emotion combinations, cast aliases, attached ear transforms,
connected limb contours, blended gestures, physical reach and carried objects.
Reach tests inspect the rendered SVG contour and transforms, including turns,
mirroring and crouching. Test targets remain within each animal's limb limits.
Pipeline tests cover Director idempotence, cached voices and existing slug reruns.

The production cleanup preserved all 342 sampled SVG poses byte-for-byte
(38 characters × three turns × idle/wave/walk). The full suite passed 256 tests,
TypeScript passed, and all 38 recipes passed the validator and importer-preservation
check. No audience-retention or GitHub runner performance claim is implied by
these local correctness checks.
