# Studio Quality Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Implement the 18 evidence-backed findings in the studio quality audit.
**Architecture:** Fix shared deterministic rendering, planning and publishing paths; retain all cached assets and existing author text.
**Tech Stack:** Existing Node/TypeScript/React/Remotion/FFmpeg/GitHub Actions.
**Spec:** `docs/superpowers/specs/2026-10-23-studio-quality-design.md`

## Global constraints

No added AI stages, dependencies, paid services, permanent-script rewrites, cache
removal, increased timeouts, or external publication. Keep timing/estimator parity
and cache identities. v4 premix gain must be followed by existing mastering;
legacy unmastered output retains its gain.

## Review focus

- Named onstage speakers retain identity through repeated directing.
- Answer text and count meaning survive presentation/layout.
- Reactions reserve their actual durations before chunk planning and stay reproducible.
- All v4 audio paths share premix gain; local mastering receives lossless PCM.
- Artifact restoration cannot replace newer mutable history; release success and delivery success remain distinct.

### Story and presentation (01,02,04,05,06)

- [x] Reproduce invisible chant, answer cutting, named speaker migration, numeric comparison inference and sleepy fanfare.
- [x] Fix Director/Callout/MoralChant/Cards with focused RED→GREEN tests and idempotence checks.

### Audio planning and mix (07,08,09,11)

- [x] Reproduce actual busy-mix clipping, reaction overflow, registry-dependent choices and invalid voice acceptance.
- [x] Add shared premix wrapper, public cue pins with exact metadata, reservation/playback/ducking parity and early voice validation.
- [x] Integrate Cards/Director/KidsVideo at agreed ownership boundaries and test legacy behavior plus cached-recording hashes.

### Pipeline reliability (12–17)

- [x] Add mocked local regressions for each of the six pipeline findings.
- [x] Restrict artifacts to episode inputs, separate episode/compilation publication, retain delivery retries, use actual release filenames, quote titles and key bumpers by labels.
- [x] Preserve all cache steps, timeouts and universe/catalog helper contracts.

### Layout and export (03,10,18)

- [x] Fit complete question text into bounded responsive cards, including long tokens and emoji.
- [x] Render/master local v4 audio from PCM; retain atomic verified output replacement.
- [x] Apply explicit BT.709 to all video render paths and check chunk color compatibility.

### Integration and evidence

- [x] Run all focused checks, full suite, TypeScript, character validation and a zero-AI template dry preview.
- [x] Fresh independent review; address important findings with failing regressions.
- [x] Render a real-composition quality reel/stills and verify PCM mastering, color metadata, decoding and immutable source/cached assets.
- [x] Finish the audit report with implemented mappings, tests, artifacts and honest limitations.
