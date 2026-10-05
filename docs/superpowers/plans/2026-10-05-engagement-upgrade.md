# Engagement upgrade implementation plan

Goal: Deliver the first code-only engagement batch and reviewable previews.

Architecture: Opt-in presentation version on newly generated scripts; shared deterministic scene intent; pure frame sampling; pinned synthesis configuration. Keep existing assets and caches.

Stack: Existing Node, TypeScript, React, SVG, Remotion and Kokoro; no new dependencies.

Spec: `docs/superpowers/specs/2026-10-05-engagement-upgrade-design.md`.

Global constraints: No paid services or extra AI. Preserve user edits, permanent library scripts, `--slug`, voice assets, CI cache steps/timeouts and the six-member cast. Execute inline in the current workspace; no commit or release requested.

Review focus: Legacy compatibility, idempotence, first-frame visibility, transition/audio alignment, continuous environmental time, silence-aware mouths and cache identity.

- [x] Add failing behavioral checks for hook timing, context-sensitive transitions and authored overrides; implement Director, generator and compositor integration.
- [x] Add failing checks for delayed empathetic listener reactions and continuous reduced ambient time; integrate acting and prepare background layers once per recipe.
- [x] Add failing checks for speed-sensitive voice identity, pinned settings, compact amplitude envelopes and mouth sampling; integrate planner and TTS.
- [x] Run complete tests/typecheck, generate an isolated zero-AI preview, render and inspect frames, compare short render workloads, document results and remaining batches.
