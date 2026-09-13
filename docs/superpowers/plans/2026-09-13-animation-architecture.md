# Animation architecture update

Approved direction: implement the recommendations in `docs/animation-research.md` using the existing free deterministic renderer. Work in the current checkout because the approved storybook artwork is uncommitted here; preserve those edits. No publication, permanent script rewrite, or new dependency is needed.

## Design

The Director owns story intent and preserves explicit overrides. Optional `scene.direction` stores a small validated intent (`dialogue`, `demonstration`, `thinking`, `celebration`, `lullaby`, `tender`). The renderer derives safe defaults for old scripts. Shared pure frame/time functions provide action runs, contact events, and musical phase; no state survives between frames. The character component accepts an outgoing action and blend progress, independent music time, stable identity, and gaze. Background motion stays in the existing live layers around baked scenery.

## Tasks

1. Director: failing regression tests, preserve explicit off semantics, validate optional direction, protect quiet beats, canonical party guests, and ensure all existing scripts remain idempotent. Owner: Director subagent.
2. Motion/acting: shared contact math and pose blending, stable character personality, gaze, independent music clock. Owner: rig subagent. Public API agreed before edits.
3. Compositor: pure action timeline and scene profiles, continuous action runs, contact-aligned SFX/camera, absolute music phase, intentional camera/entrances, gap-scheduled automatic gags. Owner: primary agent.
4. Backgrounds: restrained parallax in live layers with quiet scene profiles; preserve baked layer and cache paths. Owner: primary agent.
5. Verification: focused behavior tests first, typecheck and existing suite, all-character check, whole/chunk frame equivalence, review clips for conversation, jump, questions, chorus and lullaby. Independent code review, resolve findings, document evidence and limitations.

## Acceptance

Disabled music/gags stay disabled after reruns. Existing library JSON is unchanged. Shared contact times agree with visible jump/clap/stomp poses. Adjacent identical gestures do not restart; new gestures blend from the preceding pose. Rhythmic motion uses continuous episode music time. Scene intent controls decorative motion without hiding teaching material. All six identities use stable seeds, and legacy recipes still render. No runtime network, randomness, mutable frame state, paid tools, caching removal, or CI timeout increase.

## Execution log

- Initial research approved by user; proceeding without another approval gate.
- Existing working tree retained to build on the user's approved artwork.
- Director, rig, compositor and scenery tasks implemented. Independent review findings on quiet reprises/holds fixed with regressions.
- 54 isolated tests, typecheck and 38-recipe preservation check passed. Development reel rendered; 15 frames match byte-for-byte between independent ranges. See `docs/animation-architecture.md` for architecture and validation details.
