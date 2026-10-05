# Engagement upgrade — first batch

This first batch introduced `presentationVersion: 1`. Newly generated episodes now use version 2, documented in [story-staging.md](story-staging.md). Existing library scripts keep their original presentation and timing. No services, dependencies or AI stages were added.

## Delivered

- Stories with no authored greeting open directly on their first story line, with both actors already visible and a small title that fades after 2.8 seconds. Authored greetings and rhyme countdowns remain available.
- Automatic transitions follow scene context: direct cuts for continued dialogue, wipes for a location change, fades for quiet changes and pops when a celebration starts. Explicit transitions take precedence.
- Listening actors respond after roughly 0.16 seconds: concern for sadness, thoughtfulness for uncertainty and warmth for affection. Question holds/reveals affect both actors.
- One integrated environmental clock controls clouds, flowers, water, snow and all other animated background parts. Thinking and bedtime scenes slow down. Both sides of a transition, the title and the end card sample the same clock.
- Background layer membership and recipe colors are prepared once per immutable recipe. The episode schedule and action-track inputs stay stable across frames. Static scenery continues to use cached PNGs.
- New synthesis settings are stored with the episode. Speed and model/normalization revision participate in new voice keys. Old default voice keys remain available for legacy episodes; no cache assets were deleted.
- New Kokoro recordings include a compact amplitude envelope for mouth movement. Silence closes the mouth; existing recordings retain the word-timed fallback. No second model or synthesis pass is involved.
- CI restores/saves the voice cache for the script's selected engine. A second local planning pass after cache restoration checks missing lines using the already selected slug, with no writing call. Job timeouts, cache steps and artifact retention limits are preserved.

## Local review

```sh
node scripts/preview-engagement.mjs
npm run tts -- --slug dev-engagement-v1
npm run bake -- --slug dev-engagement-v1
RENDER_CONCURRENCY=2 npm run render -- --slug dev-engagement-v1 --frames 0-1352 --scale 0.5 --out out/review/engagement/preview.mp4
```

The supplied sampler has five scenes: hook, dialogue, question/reveal, celebration and bedtime. Its measured audio produces 1,353 frames (45.1 seconds). Re-running the sampler preserves its generated script and leaves the latest pointer and production history alone. If synthesis settings or authored content are intentionally changed, use a new preview slug.

```sh
node scripts/benchmark-render.mjs --slug dev-engagement-v1 --frames 0-119 --scale 0.5 --runs 3 --concurrency 2
```

The benchmark saves clips and a JSON report under `out/review/benchmark/<slug>/`. Compare identical frames, scale, concurrency and hardware. Bundle time is excluded; browser startup and encoding are included.

On the local i5-10310U, Remotion 4.0.520 and Node 24.17.0, three 120-frame preview runs took 19.364, 18.549 and 18.626 seconds (median 18.626). An alternating warmed Node SVG microbenchmark had baseline/updated medians of 200.187/207.754 ms per 150 layers; this does not demonstrate a rendering speed gain. The optimization removes repeated preparation work, while total performance still needs longer isolated measurements. Audience retention remains unmeasured.

Verification: 120 tests passed, TypeScript and diff checks passed. The full 960×540 preview rendered with H.264 video and AAC audio; 1,353 video frames decode without errors. Opening, listening, question/reveal, celebration, bedtime and brand frames were visually inspected. Changing the environment to Edge/speed 1.25 still selected the pinned Kokoro configuration and reused all ten recordings. CI orchestration is covered by local workflow checks; a GitHub Actions run was not triggered.

## Follow-on batch delivered

Persistent props and handovers, travel, cast voices, narrative audits, foreground/depth, environmental reactions, additional transitions, score arrangements and local analytics are implemented in [story-staging.md](story-staging.md). Real audience data remains necessary to evaluate retention.
