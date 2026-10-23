# Object Contact and Color Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix object-surface contact and make the approved, slightly stronger grade the production default.

**Architecture:** Preserve prop centers; solve reaches at shape boundaries and render carried art above limbs. Apply shared fixed color filters exactly once at renderer boundaries, leaving bake inputs raw.

**Tech Stack:** Existing TypeScript, React, deterministic SVG, Remotion and Node tests.

**Spec:** `docs/superpowers/specs/2026-10-23-contact-and-color-design.md`

## Global Constraints

- Preserve permanent scripts, recordings, cached assets, Director enrichment and existing slug reruns.
- No new dependencies, services, AI stages, or workflow timeout increases.

## Review Focus

- Point reaches without an object retain their exact target.
- Mirroring and turns must not move contact inside the object.
- Handover ownership changes must not teleport the prop.
- Baked scenery and live foreground receive exactly one grade.
- Night scenes retain visible dark detail; captions retain their own colors.

### Task 1: Shared production grade

Files: create `src/lib/colorGrade.ts`; modify `src/components/backgrounds/Background.tsx`; add a grading regression test.

Interfaces: export `ColorGradeMode`, `characterColorGrade(mode?)` and `backgroundColorGrade(palette, mode?)`; modes original/sunny/vivid/production, default production.

- [x] Pin production values between Sunny and Vivid and verify all background renderers select them once, including cached scenery and night.
- [x] Implement the shared policy and background/foreground integration; keep Bake raw.
- [x] Integrate Character, StageProps and pilot consumers with explicit preview overrides.

### Task 2: Surface contacts

Files: `src/lib/rigHands.ts`, `src/lib/types.ts`, `scripts/lib/staging.mjs`, `src/components/characters/Character.tsx`, `src/KidsVideo.tsx`, `src/AnimationPilot.tsx`; focused regression tests.

- [x] Reproduce center penetration in a rendered ball contact test.
- [x] Add optional reach object geometry and one shape-aware boundary helper; preserve bare-point reach behavior.
- [x] Position carried art at its sampled world center above the limb; remove centered floating fingers.
- [x] Apply geometry consistently to production staging and pilot reaches; verify mirroring and handover continuity.

### Task 3: Integration and visual evidence

- [x] Run the full suite, TypeScript and 38-character validation.
- [x] Render catch/handover stills and motion, plus a gallery covering all backgrounds/characters.
- [x] Render and verify the updated pilot; document global defaults and local verification evidence.

## Review record

Independent review identified an offset seed footprint and edge-clamped object
centers diverging from reach targets. Root also reproduced decorative transforms
separating unowned objects from their contact. Each failure received a failing
regression before correction. Seed contact is checked against the rendered SVG
ellipse, both stage edges retain one center, and held/unowned interactions retain
their sampled geometry. The first integration suite passed 322 tests; the final
suite includes the added regression cases. Visual checks cover the pilot catch,
handover, production apple transfer and bounded night look.

Final verification: 325/325 tests passed, TypeScript passed and all 38 character
recipes/importer preservation passed. Thumbnail-only saturation cleanup passed
the 11 focused visual-story tests and a fresh typecheck. The finished pilot
decoded completely: 720 frames, 24 seconds, 1280×720 at 30 fps, audio -16.94 LUFS
and -1.98 dBTP. The nine-image production gallery and 38-character/25-background
sheets rendered successfully. No library, voice, recipe or workflow files changed.
