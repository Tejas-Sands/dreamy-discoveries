# Remotion quality and delivery design

The user approved staying with Remotion and implementing the seven improvements discussed in chat, with a written plan first. The intended result is clearer, more expressive daily kids' episodes and a pipeline that refuses incomplete deliverables, using only existing free tools and deterministic processing.

## Compatibility and boundaries

- New episodes use `presentationVersion: 4`. Versions 0–3 retain their acting, captions, music selection, speech timings and audio mix. No committed episode is upgraded or rewritten.
- Existing voice identities, synthesis settings and WAV/MP3 files remain unchanged. Additional timing analysis is an additive, versioned sidecar, used only by v4 Kokoro episodes. No recognition/alignment model or extra AI call is introduced.
- The six named cast members are unchanged. No paid API, service or compute is added. Every Actions cache remains; existing timeouts and artifact retention limits are ceilings.
- Work starts from a snapshot of the user's uncommitted animation work in `/tmp/dreamy-remotion-quality`. Only this task's delta is returned to the original workspace after checking original files for concurrent edits. Existing staged changes remain staged. No remote publish, messages or workflow dispatch is part of verification.

## Selected approach

Extend the existing renderer and CLI pipeline. A renderer rewrite would discard useful staging work; adding a second animation engine would increase daily operational cost. Implement small pure helpers with deterministic tests, then validate actual FFmpeg outputs and a short Remotion showcase.

## Deliverables

1. **Reproducible dependencies and fonts.** Pin all directly consumed Remotion packages to the installed 4.0.520 version, declare renderer/bundler explicitly, and centralize Fredoka loading. Prefer vendoring the same font files with their open license and waiting for them before rendering; preserve glyph coverage and all used weights. No visual redesign.
2. **Delivery validation.** Require audio for episode stitching, require contiguous zero-based chunk IDs, and compare each chunk's frame count to the voiced script's expected ranges. CI supplies its expected chunk count. Validate final video/audio streams, frame rate, frame count, duration (audio/container tolerance 0.15 seconds), compatible chunk geometry and successful decode before thumbnail/metadata/release. Keep the low-level concatenator's compilation use working. Emit a local JSON verification report. Do not silently trim mismatched media with `-shortest`.
3. **Audio finishing.** Master only v4 episode mixes locally with FFmpeg two-pass `loudnorm` at an internal target of -16 LUFS, -2 dBTP and LRA 11; these are project choices, not claimed YouTube requirements. Report measured levels, fail malformed/non-finite analysis, and preserve silence without excessive gain. Keep original cached voices unchanged. Add three deterministic, reusable music assets for tenderness, curiosity and resolution; v4 selection honors explicit scene music and silence.
4. **Speech timing.** For v4 Kokoro, refine estimated word boundaries against nearby measurable pauses (maximum adjustment 0.18 seconds) and measured speech onset/end. Never claim phoneme precision. Fall back to current estimates if there is no useful signal. Cache analysis separately; keep valid word intervals ordered, bounded and immutable. Mouth shapes and captions consume the same refined word times.
5. **Captions.** V4 captions paginate at phrase boundaries and measured widths into at most two lines, with a maximum of eight words per page and a readable 54 px floor. Captions occupy a fixed lower safe region; text does not cover the prop contact zone. Preserve global word timing, word order and all text; oversized tokens may wrap instead of shrinking indefinitely. Preserve v0–3 markup/behavior. Memoize layout and avoid DOM measurement per frame.
6. **Acting.** V4 listeners get cast-specific response delay (0.12–0.32 seconds), bounded emphasis and deterministic contextual reactions for gratitude, concern and reassurance. Retain the existing speaking emotion and question/quiet protections, do not add motion to held-object contacts, and preserve narrator-only reactions. Reuse/memoize cue preparation so scene timelines are not rebuilt every frame. All sampling must work out of order and across chunks.
7. **Visual review and performance.** Add an exclusive `dev-` showcase based on existing cached recordings, covering dialogue, handover, walking, questions, celebration and long captions. Provide an HTML contact sheet and short clips; compare a v3 control with v4 and verify a chunk boundary. Extend existing benchmarking to compare requested concurrency settings and record image format, resolution, hardware, version and medians; do not claim Actions speedups from local measurements. Investigate shared baking; implement only if it fits timeouts and preserves parallel audio/video and all caches.

## Verification

Baseline: existing 256 tests and TypeScript pass with subprocess permissions (sandboxed subprocess tests otherwise fail with EPERM). Use failing behavior tests before code, FFmpeg-generated tiny fixtures for malformed/truncated/complete media, and existing timing/voice/Director tests for backwards compatibility. Run the full suite, typecheck, character validator and a zero-AI template generation check in the isolated worktree. Render v3/v4 representative images and clips using cached audio; inspect them. Hash permanent library scripts and original voice files before/after. Review the complete task delta independently before applying it back.

## Acceptance

All seven areas have working, documented implementations or measured, explicitly documented decisions where an optimization is not justified. New episodes opt into v4 automatically; existing slugs remain on their stored version. Final output validation fails for missing audio/chunks and duration mismatch. No cached item or permanent script is removed or overwritten, no external delivery occurs, and render limits are not raised.
