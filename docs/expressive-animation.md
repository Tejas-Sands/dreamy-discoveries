# Expressive animation

Newly generated episodes use `presentationVersion: 3`. The upgrade adds blended facial acting, delayed listener reactions, phrase accents, three-quarter/profile geometry, six distinct motion styles, spelling-based speech shapes, reactive ears/tails/scarf, physical object actions, and camera changes tied to the story. Important actions soften background movement. Questions and bedtime scenes retain steady framing.

The existing Director, SVG art, cached voices, and Remotion renderer supply everything. There are no new dependencies, paid services, generated assets, or AI stages. The writing prompt still uses the existing script-generation call; templates and the developer showcase use no AI.

Every motion sample depends on script data, recorded word timing/amplitude, and an absolute requested frame. Repeated or out-of-order samples agree. Existing saved episodes retain their presentation version and voice settings through `--slug`; the implementation does not rewrite permanent scripts.

The developer showcase includes all six animals, a rolling/caught ball, an apple handover, a pushed/caught ball, a book opening, watering, construction in three steps, a question, and a quiet ending. The comparison uses the same recorded speech and schedule in both panels. Its Before panel selects presentation 2 and removes the six new interaction kinds; After supplies the only audible track. This is a controlled feature comparison, rather than a previously published episode.

```sh
node scripts/preview-animation.mjs
npm run tts -- --slug dev-animation-v3
npm run bake -- --slug dev-animation-v3
npx remotion render Animation-Comparison out/review/animation-v3/comparison.mp4 --props='{"slug":"dev-animation-v3","script":null}' --scale=0.5 --concurrency=4
npx remotion still Expressive-Cast out/review/animation-v3/cast-views.png
```

The preview writer creates a new `dev-` slug exclusively. Re-running it preserves measured audio timing and leaves the latest pointer, library, catalog, and universe alone. Use another new `dev-` slug for a revised showcase. The normal episode composition remains `Video`; `Animation-Comparison` and `Expressive-Cast` are developer compositions. `KidsVideo` and its cards support optional `muted` for the comparison; ordinary playback remains audible.

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

Verification artifacts live in `out/review/animation-v3/`: comparison video/frame, cast view sheet, action frames, schedule, preservation check, implementation reports, and review. The repository checks are `npm test` and `npm run typecheck`. Preview renders use the real cached/local Kokoro path and existing baked backgrounds. Timing reports state hardware, frame range, output scale, and concurrency; local measurements do not guarantee a GitHub runner's duration.

The published animation tree passes all 254 included tests and TypeScript. The combined local workspace also passed four separate thumbnail tests, which remain with the uncommitted thumbnail work. The voiced comparison is 60.366 seconds at 960×540/30 fps and decodes successfully from start to finish. Independent frame sampling is byte-identical after seeking; an encoded chunk boundary matches the independently rendered frame at 35.08 dB PSNR. All 50 permanent scripts remain byte-identical to the starting workspace.

A matched-source benchmark rendered the same 120 frames three times per source version, at half scale and concurrency 2, on an Intel i5-10310U. Median render time increased from 16.258 to 19.671 seconds (+21.0%). Bundle time is excluded; browser startup and encoding are included. The benchmark measures local render cost, without projecting a complete episode's CI duration.

This change has no measured audience-retention result. Use real YouTube exports with the existing engagement report after publishing enough episodes to compare. The camera and motion improvements are reviewable animation changes, not evidence of increased watch time.
