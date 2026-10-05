# Story staging implementation plan

Goal: Implement the remaining researched capability areas with a reviewable free-code preview.

Architecture: Version 2 enables deterministic stage cues, cast-specific local voices, richer scenery and score sections; older versions keep their existing behavior. Independent file ownership allows parallel voice, narrative/report and scenery/score work while the primary worker integrates staging.

Stack: Existing Node, React, TypeScript, SVG, Remotion, Kokoro and procedural WAV assets. No dependencies or services added.

Spec: `docs/superpowers/specs/2026-10-05-story-staging-design.md`.

Global constraints: Preserve user edits and permanent scripts; append to caches; closed cast; no new AI stage or paid compute; unchanged CI timeout/cache/retention constraints; no publishing. Keep the shared checkout and leave changes uncommitted.

Review focus: Ownership and hand placement through cuts/flips, bounds and caption visibility, version-1/legacy voice compatibility, evidence-based story/analytics claims, music BPM and crossfade alignment, same-frame equivalence across chunks.

- [x] Voice task: behavioral RED→GREEN tests for distinct cast voices across character/friend roles, pinned maps and utterance/cache consistency. Own `scripts/lib/voice.mjs`, `scripts/generate-audio.mjs`, `tests/voice.test.mjs` only. API: `voiceForSpeaker(settings, speaker, scene?)`; `collectUtterances` resolves scene cast before deduplication. Add `castVoices?: Record<string,string>` to synthesis (primary owns types).
- [x] Narrative/report task: RED→GREEN audit tests for missing/duplicated attempts, repair and payoff evidence; local CSV/JSON analytics reports with insufficient-data handling and retention timing. Own new story-audit/report modules/tests plus `scripts/lib/story-planner.mjs`, `scripts/generate-script.mjs`; preserve `finish`'s version flag (primary upgrades it). Existing raw mock/library scripts must remain compatible. No Director/types edits.
- [x] Scenery/score task: RED→GREEN tests for split foreground eligibility, bounded parallax, event effects, restrained motion and music duck/crossfade/BPM. Own background component changes, new EnvironmentReaction/MusicBed/score modules and tests. API: Background `splitForeground?: boolean`, `parallax?: {x:number;y:number}`; export `BackgroundForeground` with shared clock props; `EnvironmentReaction({background,events,quiet,frameOffset?})` events `{from,kind:'ripple'|'leaf'|'sparkle',x,y}`; `MusicBed({script,schedule})`; `sceneScore(scene,script)` returns existing MusicSpec or null. Primary integrates these into KidsVideo and owns types.
- [x] Staging task: RED→GREEN tests for persistent ownership, reachable transfers, visible pickup/drop, path continuity and flipped rig anchors; implement shared stage planner, sampling, illustrated props and character reach/hold APIs. Primary owns types, Director, stage/prop/character files, KidsVideo, new transitions and staging preview.
- [x] Integrate: enable new generation version 2; keep first-batch semantics for versions 1 and 2; preserve authored cues and re-run idempotence. Test templates in an isolated fixture, all six voice identities and legacy schedules.
- [x] Verify: 171 tests/typecheck/diff checks pass; fresh read-only review fixes have RED→GREEN regressions; 47.9s H.264/AAC preview rendered/decoded/inspected, 12/12 audio and 4/4 scenery cache reuse confirmed, whole/chunk comparison and local synthetic report saved, three-run benchmark recorded. Pixel edge variations and audience/CI evidence limits are documented in `docs/story-staging.md`.
