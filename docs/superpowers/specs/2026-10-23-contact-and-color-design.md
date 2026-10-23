# Object contact and permanent color treatment

The user approved the Sunny pilot and explicitly requested a slightly stronger
global treatment plus correction of paws intersecting caught/carried objects.

Use one shared production color policy, applied once at the background,
foreground, character and grounded-prop boundaries. The production daylight
treatment sits between Sunny and Vivid; night scenery receives a bounded version
that retains dark detail. Bake compositions keep ungraded source PNGs, allowing
existing cached scenery to receive the treatment without double grading. Preview
looks remain explicit opt-ins; ordinary production callers default to the new look.

Keep world-space prop centers and ownership unchanged. Add optional object
geometry to reach samples, derive a surface contact on the actor-facing boundary,
and solve the existing limb to that contact. Draw carried artwork at the prop's
world center, above the reaching limb, with no detached fingers at its center.
Bare point reaches preserve their established semantics. Apply the same geometry
to catches, pickups, handovers, drops and stationary carrying, including the pilot.

Alternatives considered: increasing saturation on the whole video would also
alter captions; moving prop centers to the hand would produce jumps and collapse
handovers. Separate shared grade boundaries and object-surface reach retain the
existing timeline, assets, anatomy and ownership model.

Preserve all permanent scripts, recordings, caches, existing slug reruns, Director
enrichment, workflow timeouts and free/local operation. No new dependencies or AI.

Verify surface contacts through mirrored, turned and differently sized rigs;
handover continuity; single grading for baked/live scenery and all characters;
full tests and typecheck; all 38 recipes; rendered production/night/background
and catch/handover examples; full pilot decoding and audio levels.
