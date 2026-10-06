# Expressive Animation Implementation Plan

> **For agentic workers:** Use the parallel-agent and verification skills for independent tasks, then integrate and review the complete flow. Track progress in `out/review/animation-v3/progress.md`.

**Goal:** Deliver all approved animation improvements in the existing deterministic pipeline, with a playable comparison preview.

**Architecture:** Add an opt-in presentation version to the existing rigs and stage sampler. Acting and interaction have separate owners; the controller integrates camera, focus, Director rules, prompts, and previews. Keep existing scripts and presentation versions intact.

**Tech Stack:** Existing React/TypeScript, SVG, Remotion, Node tests, ffmpeg, and cached Kokoro; no additions.

**Spec:** `docs/superpowers/specs/2026-10-06-expressive-animation-design.md`

## Global constraints

- No paid service, dependency, artwork generation, or additional AI stage.
- Frame-derived deterministic animation; preserve caches and CI timeouts.
- Preserve library scripts and `--slug`; use new preview slugs only.
- Six cast members only; preserve authored stages, quiet choices, and existing workspace edits.
- Version 3 enables the new behavior; earlier versions retain their presentation.
- Do not commit or publish from this shared dirty workspace.

## Review focus

- Short speech and silence: expressive mouths close and emotion changes do not snap.
- Cast aliases, reversed roles, and overlapping cues: ownership and eyes identify the correct animal.
- Grounded objects and location cuts: completed movement/state persists without following a departed owner.
- Questions, negatives, and hidden objects: no answer leakage or speculative automatic action.
- Chunk boundaries and repeated Director passes: same frame and same script yield identical results.

## Task 1: Character performance and mouth shapes

**Files:** Create `src/lib/acting.ts`, `tests/character-performance.test.mjs`; modify `src/lib/speech.ts` and `src/components/characters/{Character,StorybookBody,StorybookFace,Face,pose}`.

**Interfaces:** `actorPerformance(scene, slot, actor, frame, fps)` returns `{emotion, fromEmotion, blend, emphasis, listening}`. `mouthShapeAt(line,t)` returns a typed mouth shape. `Character` accepts optional `performance`, `mouthShape`, and local-rig `turn` (-1 left, +1 right), leaving existing calls compatible. Preserve reaching anchors and existing kind/seed identities.

- [x] Add and observe failing behavioral tests for frame-independent emotion blending, aliases, word shapes, silence, and distinct cast motion.
- [x] Implement richer facial acting, three-quarter/profile geometry, asymmetric poses, cast movement, and secondary motion using the existing art.
- [x] Run focused tests and TypeScript; report exact APIs for integration.
- [x] Review the task diff against the saved baseline and correct findings.

## Task 2: Physical prop actions

**Files:** Modify `scripts/lib/staging.mjs`, its declaration, the Stage types in `src/lib/types.ts`, `src/components/StageProps.tsx`, and `src/lib/propMotion.ts`; create `tests/prop-interactions.test.mjs`.

**Interfaces:** `prepareStage`/`sampleStage` stay compatible. Add `push`, `roll`, `catch`, `open`, `water`, and `build` events and typed optional visible prop state; exports and fields must be reported to the integrator. New automatic inference is version-3-only. Existing event tests continue to pass.

- [x] Add and observe failing tests for all six interactions, repeated sampling, committed/negative text, scene ownership, frozen endpoints, and persistent book/build state.
- [x] Implement bounded trajectories, preparation/contact/release, ownership/state persistence, and visible vector artwork.
- [x] Run focused tests and TypeScript; report the authored event format.
- [x] Review the task diff against the saved baseline and correct findings.

## Task 3: Scene direction and integration

**Files:** Modify `src/lib/stageCamera.ts`, `src/components/Transition.tsx`, `src/KidsVideo.tsx`, `scripts/lib/director.mjs`, `scripts/generate-script.mjs`, and affected analytics timing; create `tests/cinematic-direction.test.mjs`.

**Interfaces:** Existing `stageCamera` remains the legacy path; new `cinematicCamera` exposes frame-derived zoom, focus, and pan. Questions remain shared and steady. Sample the acting and mouth APIs only on version 3 and keep UI outside the scene camera.

- [x] Add and observe failing tests for wide/object/reaction/shared shots, interrupted camera moves, question framing, object gaze, focus bounds, and version-3 analytics alignment.
- [x] Integrate acting/interaction, eased gaze and view turns, purposeful shot changes, and background focus.
- [x] Add version-3 Director defaults for coherent prop comedy and openings, and prompt guidance within the existing writing call.
- [x] Verify Director idempotence, authored controls, and existing presentation tests.

## Task 4: Comparison, performance, and documentation

**Files:** Add `scripts/preview-animation.mjs`, a comparison composition and registration, focused preview tests, and `docs/expressive-animation.md`.

- [x] Build a reproducible zero-AI showcase with all six animals and all new interactions; preserve the latest pointer and production history.
- [x] Reuse existing voice recordings where possible; synthesize only missing lines using local cached Kokoro.
- [x] Render a playable comparison, inspect representative frames, verify decode, and compare equal frame ranges and chunk samples.
- [x] Run full tests, TypeScript, isolated template generation, and script-hash checks.
- [x] Complete a fresh read-only code review, resolve material findings, and document evidence and practical limits.
