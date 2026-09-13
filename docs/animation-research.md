# Animation and Director assessment

Research date: 2026-09-13. Scope: the current working tree, including the new storybook art. This is a research decision, not an implemented animation upgrade.

## Decision

Keep the deterministic Director and existing rigs. Prioritize reliable direction, shared timing, smooth action changes, and readable acting. Add environmental detail after those improvements. All proposed work can use the existing local SVG/React/Remotion stack without additional AI, paid services, or dependencies.

The Ponytail and Superpowers plugin workflows informed the review: examine existing behavior, prefer small changes, and separate research findings from proposed design. Source inspection and in-memory Director probes supplied the project evidence. No new full-video render or audience study was performed for this assessment.

## Research basis

- Motion can help guide children toward the relevant story action. Takacs and Bus studied 39 children aged 4–6 with animated versus static storybooks and reported benefits for attention and aspects of story comprehension. This is evidence for purposeful motion, not proof that additional effects improve YouTube retention. [Original study](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.01591/full).
- Staging directs attention through composition and framing; follow-through and easing help motion feel believable. These principles support refining transitions between poses and deciding which subject should move. [Adobe animation principles](https://www.adobe.com/creativecloud/animation/discover/principles-of-animation.html).
- YouTube's children's-content guidance emphasizes clear narratives, learning, imagination, and understandable takeaways. Our design inference is to let gestures and camera choices reinforce each scene's purpose. [YouTube quality principles](https://support.google.com/youtube/answer/10774223?hl=en).
- Frame-derived interpolation and springs already fit this renderer. Any new variation must remain repeatable across parallel render workers, using stable seeds. [Remotion animation](https://www.remotion.dev/docs/animating-properties), [deterministic randomness](https://www.remotion.dev/docs/using-randomness).

## Existing strengths to preserve

The pose engine already has jump anticipation, squash/stretch, multiple dance variants, walk counter-motion, and secondary motion. Characters already blink and have height-responsive contact shadows. Mouth movement uses word intervals, and counting callouts use word timing. The Director already protects question/lesson/moral scenes from automatically inserted gags, adds participation beats, and varies repeated choruses. Backgrounds already separate animated back/front layers from cached static scenery. These are foundations to refine.

## Ranked findings and changes

| Priority | Current evidence | Recommended change and visible result |
|---|---|---|
| 1 — correctness | `scripts/lib/director.mjs:633` converts `gag:false` to `null`; `:674` does the same for disabled music. A subsequent pass treats those values as missing. Both failures were reproduced. | Preserve explicit disabling through normalization and reruns, with schema-compatible semantics. An intentionally quiet scene stays quiet. |
| 1 — contact timing | `src/components/characters/pose.ts:155` uses a 0.72-second jump cycle; `src/KidsVideo.tsx:197` uses 0.66 seconds for jump shake. Most non-clap effects start two frames after a line begins (`:348`). | Derive jump impact, shadow response, and camera shake from the same phase/contact calculation. Schedule action sounds at relevant events. Landings should feel connected to the ground. Clap and count timing already have dedicated paths; extend that approach. |
| 2 — continuous acting | `src/KidsVideo.tsx:140` resets action time at line boundaries. Only dance explicitly uses continuous scene time (`:160`). Action and emotion selections change directly. | Continue identical actions across adjacent lines and blend compatible outgoing/incoming poses over a short interval. Start with roughly 0.15–0.25 seconds as an artistic trial, not a research-established optimum. Handle jump landings and spin orientation explicitly. |
| 2 — editorial focus | The Director chooses default movement from action cycles (`scripts/lib/director.mjs:387`), sets question energy upbeat (`:510`), and schedules eligible gags at fixed 1.6/2.2-second offsets (`:649`). The compositor adds a punch on each active line (`src/KidsVideo.tsx:191`). | Use a small set of scene-purpose rules: dialogue, demonstration, thinking, celebration, and lullaby. Keep thinking and tender beats visually settled; place gags in speech gaps; reserve camera emphasis for a meaningful event. Preserve explicit scene choices. |
| 2 — musical continuity | Dance/beat calculations use scene time (`src/KidsVideo.tsx:105,160`), while music runs continuously across the episode (`:388`). Scene starts need not coincide with a musical beat. | Pass an absolute music-phase offset to rhythmic motion; retain local time for entrances and one-shot gestures. Keep dancing aligned across cuts without retiming recorded speech. |
| 3 — personality and interaction | Main-character seeds depend on scene index (`src/KidsVideo.tsx:295`). Listener behavior largely switches to a generic look pose (`:163`). Word-based mouth motion estimates opening, not phoneme shapes (`src/lib/speech.ts`). | Give each canonical character stable motion parameters, with deliberate scene variants. Add gaze toward the speaker or teaching object, small listening reactions, and eased expression changes. Refine mouth shapes only if current recordings/timings support them reliably. |
| 3 — background life | `Background.tsx:54` and `:64` already animate separate layers; the camera wraps the scene as one group. Most rich scenery is deliberately baked. | Add restrained relative layer movement and a few scene-appropriate leaf, water, or light accents. Keep the teaching region clear. Reuse baked scenery; avoid animating every decorative element or adding expensive full-frame filters. |

## Checks performed

Imported `directScript` directly and evaluated copies in memory; did not run the CLI that writes permanent scripts. Removed recipe-adoption fields from audit inputs to prevent recipe writes.

- Six local library scripts were processed twice: all six produced identical JSON between the first and second audit passes.
- Those results contained 21 question scenes and no callouts on their non-praise question lines. Therefore answer leakage from callouts was not observed in this library sample.
- A separate minimal seven-second story scene with `gag:false` and top-level `music:false` reproduced both override failures. First pass: both became `null`. Second pass: a bear peek gag and `story.wav` were inserted. Existing-library stability does not cover this explicit-off edge case.
- The jump/camera mismatch was established by comparing the actual timing constants. Its perceptual severity has not yet been measured in a new review render.

## Implementation order and acceptance

1. Fix explicit-off rerun semantics and share impact timing. Add meaningful regression checks for those failures.
2. Add action continuity, stable cast identity, and music-phase continuity. Keep motion a pure function of frame/time so separate render chunks agree.
3. Introduce restrained scene-purpose rules, then listener acting and environmental accents.

For each stage, compare short clips containing dialogue, consecutive action lines, repeated jumps, a question/reveal, a chorus transition, and a lullaby. Check readable captions, visible teaching objects, accurate contact sounds, and complete landing poses. Render a clip both whole and in chunks to check boundary agreement. Compare render time on the same machine and settings before accepting added detail. Preserve the existing CI timeouts, caches, six-member cast, and permanent scripts throughout.

Expected benefit is more coherent, expressive motion. Improvement in audience retention remains an untested hypothesis.
