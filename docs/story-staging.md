# Story staging and review

New generation now opts into `presentationVersion: 2`. It includes the first engagement batch plus the remaining staging, voice, scenery, score and review capabilities. Existing version-1 and legacy scripts keep their previous presentation and audio identity. No dependencies, paid services or AI stages were added; the only writing call stays in script generation.

## Delivered capabilities

- Visible vector props: apples, balls, baskets, books, flowers, kites, seeds, cookies, stars, paper boats, sandcastles, leaves, snow figures and hearts. Other authored objects get a small labeled illustration. Objects have persistent IDs and owners rather than being decorative line labels.
- Pickup, reaching, handover and drop cues follow actual speech slots. Actors approach for a reachable exchange; the receiving paw stays extended through transfer, and ownership persists across scenes and swapped lead/friend roles. Dropped objects stay put when an actor leaves. Contact and release poses ease rather than snapping.
- Eased travel paths, destination-facing poses and gaze, walk phases driven by distance, and a short foot-settling blend after travel. Sampling depends on the requested frame, not playback history.
- Bounded framing for dialogue, props, reactions, discoveries, celebrations and quiet moments. Captions and questions stay outside the camera. Continued dialogue keeps direct cuts; location changes can use leaf, page or ripple reveals. Authored transitions win.
- Distant/middle/foreground parallax, with selected foliage/weather after the actors. Windows, lamps and other architecture stay behind. Static scenery still uses cached PNGs. Small ripples, leaves or sparkles respond to completed object actions; quiet scenes limit these effects.
- Six installed local Kokoro voices: Taffy `af_heart`, Ben `am_michael`, Daisy `af_sarah`, Fiona `bf_emma`, Grandpa Tilly `bm_george`, Professor Ozzy `am_fenrir`. The animal keeps the same identity in either role. Narration remains `af_bella`. The episode pins its map, engine, speed and model/cache revision; explicit overrides are preserved from planning through synthesis.
- Scene-based arrangements reuse `story.wav` (96 BPM), `bouncy.wav` (120 BPM) and `lullaby.wav` (72 BPM). Identical adjacent tracks keep one loop, changes crossfade, quiet passages reduce gain and speech ducks the music. Actor beat clocks use the selected section's BPM and start frame. Authored silence stays silent.
- An offline narrative audit cites real scene/line text for hook, goal, distinct attempts, choice, repair and payoff. It flags repeated dialogue/attempts, missing repair and unearned moral endings. These are advisory textual candidates, not a claim that a heuristic understands the whole plot. Existing structural validation remains enforced, and generation receives stronger guidance within its existing call.
- Local YouTube Studio CSV/JSON reports normalize overview/retention metrics, align supplied retention with available script timing, mark estimates and insufficient samples, and guard against pairing unrelated videos. Separate overview and retention exports are supported. Standalone HTML includes an SVG chart. No live analytics API, OAuth, model or database mutation is involved.

## Staging authoring

The Director fills missing `scene.staging` for new scripts. A recurring prop kind is one object by default; use distinct authored IDs for multiple objects of the same kind. Held props follow their animal across locations; grounded props belong to their location. Automatic cues require committed object actions, so questions, negatives and speculative choices do not transfer ownership. Unknown narration subjects are left unstaged.

Authored staging is preserved. Positions use the 1920×1080 stage; actor `y` is the ground coordinate. A move or object event names a zero-based spoken line index. The renderer resolves that index after audio durations exist.

```json
{
  "actors": {
    "character": {"x": 850, "y": 870},
    "friend": {"x": 1060, "y": 870}
  },
  "props": [
    {"id": "picnic-apple", "kind": "apple", "owner": "bunny", "x": 940, "y": 735}
  ],
  "events": [
    {"kind": "give", "propId": "picnic-apple", "line": 0, "actor": "character", "to": "friend", "durationSec": 0.85}
  ],
  "shot": "prop"
}
```

Events support `show`, `pick-up`, `give` and `drop`. Moves use `{line, delaySec?, durationSec?, to:{x,y}}` inside an actor's `moves` array. Shot choices are `dialogue`, `prop`, `reaction`, `discovery`, `celebration` and `quiet`. Use cast species as owners; rendering also resolves canonical cast IDs. Bounds are applied at render preparation.

Optional top-level `castVoices` overrides individual animals when first pinned. `--voice` overrides the hero, while the other animals keep their own voices. Commented `.env.example` leaves the six defaults enabled. Existing generic synthesis configurations remain generic; use a new slug when intentionally revising an episode's identity.

## Local commands

```sh
node scripts/preview-staging.mjs --slug dev-staging-v2-cast
npm run tts -- --slug dev-staging-v2-cast
npm run bake -- --slug dev-staging-v2-cast
RENDER_CONCURRENCY=2 npm run render -- --slug dev-staging-v2-cast --frames 0-1436 --scale 0.5 --out out/review/staging/preview.mp4

node scripts/audit-story.mjs --slug existing --format json --out out/reports/story-audit.json
node scripts/report-analytics.mjs --input overview.csv --retention retention.csv --slug existing --video-id VIDEO_ID --format html --out out/reports/engagement.html
node scripts/benchmark-render.mjs --slug dev-staging-v2-cast --frames 0-119 --scale 0.5 --runs 3 --concurrency 2
```

The showcase is a 47.9-second test clip, not a full production episode. Its sampler creates a new dev script only and preserves existing preview files, the latest pointer and production history. The report fixture in `tests/fixtures/studio-analytics.synthetic.json` is explicitly synthetic; it is not audience evidence. Real retention exports are still needed to judge whether the creative changes help children stay engaged.

## Verification evidence

- 171 automated tests pass; TypeScript and diff checks pass. A fresh read-only review found two important defects (dropped-object position and version-2 voice overrides); both have observed failing/passing regressions. Visual review also prompted easing at pickup/release and continuous receiver reach, with regressions.
- `npm run generate -- --template counting --hero bunny` succeeds in an isolated fixture with zero writing calls; all 11 scenes are staged and the six voice identities are pinned.
- The cast preview synthesized eight missing recordings and reused four. Rerunning under `TTS_ENGINE=edge TTS_SPEED=1.25` still selects pinned Kokoro and reuses all 12, with zero synthesis. Four backgrounds reuse the bake cache.
- The 960×540 H.264/AAC preview has 1,437 video frames at 30 FPS (47.9 seconds) and decodes cleanly. Pickup, transfer, drop, travel, celebration and bedtime frames were visually inspected; `review-sheet.png` samples the complete clip.
- Stage/rig tests cover seeking, mirrored paw geometry, movement completion, persistent ownership, multiple events, negative/question exclusions and stationary ground objects. Fourteen PNG frames around transfer and location boundaries were compared whole/separate. The largest color difference was 5/255 in one channel and the largest affected area was 0.099% of a frame, confined to SVG edges; byte-identical images are not claimed. Renderer color differences and performance measurements are recorded in the review artifacts.
- CI cache steps, timeouts and retention policies remain in place. The three renderer cache keys now include `scripts/lib/staging.mjs`. No workflow was dispatched, library row overwritten, cache item deleted or external publishing/message performed.

Render assets and evidence are under `out/review/staging/`; benchmarking writes `out/review/benchmark/dev-staging-v2-cast/`. The earlier batch's measured results remain in `docs/engagement-upgrade.md`. No speed gain or audience-retention gain is assumed from adding features. Motion stays frame-derived, as required by [Remotion’s animation guidance](https://www.remotion.dev/docs/animating-properties); the existing software-rendering setup is retained, with no GPU compute added ([renderer options](https://www.remotion.dev/docs/gl-options)).

The new preview's first 120 frames at half scale and concurrency 2 took 29.815, 30.769 and 29.578 seconds (median 29.815; 4.02 frames/second) on the local i5-10310U, Node 24.17.0 and Remotion 4.0.520. Bundle time is excluded; browser startup and encoding are included. This is a different scene workload from the earlier preview, so the two measurements do not isolate an optimization gain or regression. The added capabilities have a measurable render cost; no CI timing claim is made without an Actions run.
