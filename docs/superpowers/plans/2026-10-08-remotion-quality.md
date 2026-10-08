# Remotion Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Improve acting, speech/captions, sound and delivery reliability while preserving every existing episode's presentation and cached voice identity.

**Architecture:** Extend the current Remotion compositions and Node/FFmpeg scripts. Presentation changes are gated by version 4; verification applies to all new renders. No new AI stage or rendering service.

**Tech Stack:** Node ES modules, TypeScript/React, Remotion 4.0.520, FFmpeg/ffprobe, Node test runner.

**Spec:** `docs/superpowers/specs/2026-10-08-remotion-quality-design.md`

## Global Constraints

- New episodes use `presentationVersion: 4`; versions 0–3 preserve presentation and audio behavior.
- Voice files/keys and committed scripts are immutable. Timing sidecars and new music assets are additive.
- Six named cast members only; no paid services, additional AI, external delivery or workflow dispatch.
- Preserve all Actions caches, parallel audio/video, existing timeouts and retention ceilings.
- Preserve the original workspace's staged/unstaged work; review this task against the captured baseline, not HEAD.

## Review Focus

- Partial or stale chunk sets must fail before replacing an episode; test missing middle/tail, incompatible geometry, short audio and invalid IDs.
- Old voices with missing envelopes or unusual WAV chunks must remain reusable; test PCM16/float32, silent samples and additive cache writes.
- Long words, punctuation, untimed lines and page boundary seeks must preserve readable captions and every word.
- Rapid speaker changes, cast aliases, narrator speech and quiet questions must remain deterministic and continuous.
- Local full renders and CI chunk renders must both enforce mastering/version gates and final verification; existing compilation audio must survive.

### Task 1: Reproducible runtime and version boundary

**Files:** `package.json`, `package-lock.json`, `src/lib/fonts.ts`, font consumers, `public/fonts/*`, `scripts/generate-script.mjs`, `src/lib/types.ts`, `tests/animation-generation.test.mjs`.

**Interfaces:** Produces `fontFamily` from `src/lib/fonts.ts` and new scripts with presentationVersion 4; existing scripts are never upgraded.

- [x] Capture original source/cache hashes and run baseline tests/typecheck. Expected: 256 pass, TypeScript clean.
- [x] Extend generation test to expect v4 and assert an existing v3 slug stays byte-identical; run it first. Expected: new generation assertion fails.
- [x] Pin direct Remotion dependencies to 4.0.520 without upgrading transitive packages. Centralize local Fredoka loading using matching upstream bytes/license and render readiness. Set only newly generated scripts to v4; extend type union.
- [x] Run generation/voice compatibility tests and typecheck. Expected: pass. Record task delta without committing the user's pre-existing work.

### Task 2: Validate media before delivery

**Files:** create `scripts/lib/media-check.mjs`, `scripts/verify-video.mjs`, `tests/media-check.test.mjs`; modify `scripts/stitch.mjs`, `scripts/render.mjs`, `.github/workflows/make-video.yml`.

**Interfaces:** `probeMedia(file) -> {streams,format}`; `verifyEpisode(file,{frames,fps=30,decode=true}) -> report`; `validateChunks(files,{frames,count,fps=30}) -> report`. CLI `verify-video.mjs --slug S [--file F]`; stitch accepts `--expected-chunks N`.

- [x] Write tests with tiny locally generated video/audio fixtures. Assert missing audio, noncontiguous IDs, wrong frame counts/rates, mismatched dimensions, short audio and corrupt media throw; complete media passes. Run tests. Expected: helper missing/behavior failure.
- [x] Implement checks with ffprobe and FFmpeg, explicit errors, bounded subprocess output, frame-exact video and 0.15 s audio/container tolerance. Preserve `concat(parts,null,out)` for compilations including source audio. Require audio at episode entry point and verify temporary output before replacing destination.
- [x] Wire CI expected count, verified output reports and local full-render validation. Preserve every cache/timeout and use existing FFmpeg installation or install the free package where needed.
- [x] Run media tests and workflow/timing tests. Expected: pass; output report describes checked streams/frames/durations.

### Task 3: Finish audio and add restrained score moods

**Files:** create `scripts/lib/audio-master.mjs`, `tests/audio-master.test.mjs`; modify render/stitch integration, `scripts/build-audio-assets.mjs`, `src/lib/score.ts`, `src/lib/types.ts`, `tests/scenery-score.test.mjs`; add three `public/music/*-v1.wav` assets.

**Interfaces:** `masterAudio(input,output) -> {target,before,after}` with target `{integrated:-16,truePeak:-2,range:11}`; `sceneScore` selects new assets only for v4. Existing score APIs remain unchanged.

- [x] Write/run failing tests for bounded mastering levels, silent input, invalid analysis, repeated deterministic results and v3/v4 score selection including authored silence/music.
- [x] Implement two-pass local normalization, temporary outputs and reports; apply only to v4 mixes in both local and chunk paths. Never edit cached voice files.
- [x] Add deterministic tenderness, curiosity and resolution loops using the existing synth and versioned filenames. Generate only new music assets; verify older audio hashes unchanged.
- [x] Run audio/score/media tests. Expected: pass and new assets decode successfully.

### Task 4: Refine cached speech timings without AI

**Files:** create `scripts/lib/speech-timing.mjs`, `tests/speech-timing.test.mjs`; modify `scripts/generate-audio.mjs`, `src/lib/types.ts` as needed.

**Interfaces:** `refineWords(words,durationSec,envelope) -> Word[]`; `timingForVoice({audio,meta,text}) -> {words,envelope}` writes an analysis-versioned sidecar without replacing source files. V4 Kokoro only; Edge's recorded timings are retained.

- [x] Test pause snapping within 0.18 s, onset/tail bounds, silence fallback, ordered nonzero intervals, malformed inputs, PCM16/float WAVs and immutable cached sources. Run first. Expected: missing helper failure.
- [x] Implement deterministic waveform/envelope analysis and additive caching; preserve synthesis keys and duration. Guard CLI main so imported timing estimation can be tested without executing TTS if needed.
- [x] Run speech and voice-cache/rerun tests. Expected: pass; v3 output unchanged and v4 rerun reuses sidecar without synthesis.

### Task 5: Readable phrase captions

**Files:** create `src/lib/captions.ts`, `tests/captions.test.mjs`; modify `src/components/Karaoke.tsx`, `src/KidsVideo.tsx`.

**Interfaces:** `captionPages(words,measure,{maxWidth,maxWords=8,maxLines=2}) -> pages`; `captionPageAt(pages,t) -> page`. Karaoke receives optional `presentationVersion`, default legacy.

- [x] Test all words preserved, punctuation grouping, long-token wrapping, no more than two rows/eight words, missing timing and exact/out-of-order page seeks. Run first. Expected: missing helper failure.
- [x] Implement memoized font-ready text measurement and v4 caption layout in the lower safe region, with minimum 54 px text and bounded page height. Preserve legacy JSX path.
- [x] Run captions, timing and typecheck. Expected: pass. Render a long-caption frame and inspect legibility/prop clearance.

### Task 6: Distinct, deterministic listener acting

**Files:** modify `src/lib/acting.ts`, `src/KidsVideo.tsx`, `tests/character-performance.test.mjs`; add focused tests if needed.

**Interfaces:** `preparePerformance(scene,slot,actor,fps,presentationVersion=3)` produces immutable cues; sampling preserves existing `ActorPerformance` shape. `actorPerformance` retains legacy default behavior for callers.

- [x] Write/run failing tests for distinct cast delays within 0.12–0.32 s, gratitude/reassurance reactions, aliases, narrator handling, question holds and shuffled-frame sampling. Snapshot legacy sample outputs.
- [x] Add bounded v4 responses and memoized cue preparation. Preserve old outputs, silent mouth handling and all solved hand/foot transforms.
- [x] Run performance, rig, staging and typecheck checks. Expected: pass; compare dialogue frames against v3 control.

### Task 7: Repeatable review and measured performance

**Files:** create `scripts/review-quality.mjs`, `tests/quality-review.test.mjs`; extend `scripts/benchmark-render.mjs`; add `docs/remotion-quality.md` and package scripts.

**Interfaces:** review CLI creates an exclusive `dev-` slug from an existing voiced script with cached assets; renders v3/v4 stills, optional clips, and HTML manifest. Benchmark accepts `--concurrencies 1,2,4` and reports format/scale/hardware/medians.

- [x] Test review selection for dialogue/handover/walking/question/celebration/caption cases, exclusive slug behavior, input immutability and validated benchmark settings. Run first. Expected: missing/new behavior failure.
- [x] Implement the review workflow using current compositions and reused bundle/browser. Keep generated artifacts outside permanent library/history. Make programmatic benchmarks use the same JPEG setting as production.
- [x] Inspect the cold-cache baking topology and record a concrete decision. If shared baking adds a serial job or violates limits, retain the topology and fix only cache completeness where supported by evidence.
- [x] Produce actual review stills/clips, compare at least one frame around a chunk boundary, and run local concurrency samples. Expected: readable artifacts and an honest local-only benchmark report.

### Task 8: Integrate, verify and return the complete delta

**Files:** task plan/progress/docs and the task-owned delta only.

- [x] Run full tests, typecheck, character validator and zero-AI template generation in the isolated worktree. Expected: all pass; existing library/voice hashes unchanged.
- [x] Run a short complete muted-chunks + audio + stitch flow and exercise missing-media rejection. Expected: verified MP4, thumbnail and metadata; no external delivery.
- [x] Request one independent review of the baseline-to-result delta, focused on the five Review Focus cases. Fix important findings with failing regression tests first.
- [x] Apply task changes back only where the original workspace still matches captured hashes. Preserve staged changes and unrelated files. Copy review artifacts, plan and verification record to the workspace.
- [x] Report implemented behavior, verification evidence, local render results and any remaining limits. Do not claim CI performance or publish anything.

## Completion record

See `docs/remotion-quality.md` and `out/review/remotion-quality/verification.md` for verification, preview paths, compatibility rules and the measured caching decision. Review added input/media proofs, custom-output protection, font readiness and malformed-cache regressions. No remote delivery was performed.
