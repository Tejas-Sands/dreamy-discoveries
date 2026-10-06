# Expressive animation

The user approved implementing every improvement in the animation research: richer acting, angled views, shot variety, physical interaction, cast mannerisms, mouth shapes, anticipation and settling, visual focus, story comedy, a visual opening, and comparable previews.

## Constraints

- Everything stays free. No new service, dependency, generated artwork, or AI stage.
- All animation is a pure function of script, recorded speech timing, and requested frame. Separate chunks and out-of-order frames agree.
- Preserve every existing library script, cached asset, workflow timeout, and `--slug` rerun path.
- Use the six established animals and their current art and voices.
- Extend the existing rigs, staging, and Director. New generation uses `presentationVersion: 3`; older episodes keep their existing presentation path.
- Existing authored staging and explicit quiet/silent choices take precedence.
- Work on top of the existing uncommitted changes; do not reset, stash, overwrite, or commit unrelated work.

## Acting

Introduce a frame-sampled performance that eases between dialogue emotions, delays listener reactions, and places small head/brow accents at important spoken phrases. Turn the storybook head and body into three-quarter/profile views using SVG geometry and occlusion, while keeping feet and reaching paws anchored. Give each cast member a distinctive timing, weight, and posture. Ears, scarves, and tails respond to starts, turns, and stops instead of adding constant movement.

Mouth shapes use the existing word timestamps and amplitude envelope. A small rule-based spelling/phrase approximation supplies closed, open, wide, and rounded shapes. It is not phoneme recognition; silence remains closed and no ASR model is introduced.

## Interaction

Extend staging with `push`, `roll`, `catch`, `open`, `water`, and `build`. Props keep persistent identities, positions, ownership, and visible state. Rolling follows distance; catching ends in a held object; books open; watering shows a can and droplets; building accumulates visible parts. Events have preparation, contact, and release. Inference accepts committed actions only; speculative questions and negatives remain unstaged. Authored events are supported even when text inference cannot determine intent.

## Direction

Version 3 uses wide setup, shared dialogue, object detail, and actor reaction shots selected at meaningful voice/event boundaries. Framing changes ease, remain bounded, and preserve space for captions and questions. Quiet and question scenes settle. Look toward an object before reaching and toward the other animal while listening. Reduce background distraction during important actions without resetting the episode's ambient clock.

Story comedy uses the actual prop action: roll, noticing pause, catch, reaction. It does not add narration or artificial repeated speech. New story prompts ask for an immediate visible problem/discovery and concrete actions within the existing single script-writing call. Director defaults keep authored openings and gags, suppress unrelated automatic gags during object sequences, and remain idempotent.

## Verification and review

Test emotion/shape timing, aliases, silence, deterministic seeking, ownership/state persistence, negative action inference, camera focus, question answer protection, and Director idempotence. Run the complete suite and TypeScript. Verify a zero-AI template in an isolated fixture. Render a new preview through the real Director and existing cached/local TTS path, sample useful frames, and compare legacy/new presentation on the same speech. Measure equal frame ranges at equal resolution/concurrency. Use the existing analytics report for real retention exports; do not fabricate audience evidence.
