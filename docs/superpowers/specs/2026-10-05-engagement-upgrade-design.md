# Engagement upgrade, first implementation batch

User authorization: “great lets do this!!!”, following the researched improvement list.

Improve the first seconds of a story, believable listening, scene continuity and background pacing using the existing deterministic Director, SVG rigs, Remotion and local Kokoro. No new services, dependencies or AI calls.

Newly generated episodes carry `presentationVersion: 1`. Existing directed scripts keep their presentation, greeting, durations and cached audio. New stories begin with the actual problem at frame zero, with a brief title overlay. Explicit authored introductions and transitions remain supported. Rhymes retain their greeting/countdown.

Context determines automatic transitions: uninterrupted dialogue uses a direct cut, a new location uses a wipe, quiet changes use a fade, and the start of a celebration uses a pop. Listeners react with concern, thoughtfulness or warmth after a short deterministic response delay. The first hook has its actors already in position.

Background motion controls the time of every animated part, using an integrated timeline so speed changes do not jump the environmental clock. Cached static scenery stays static. Recipe color conversion and layer grouping are prepared once per recipe rather than each frame.

Voice synthesis settings are pinned for new episodes. New cache keys include speed and the local model/normalization revision; legacy default keys remain available for legacy episodes. New Kokoro audio carries a compact amplitude envelope for mouth movement, without another model or audio pass. Old recordings retain word-timed fallback.

Acceptance: Director reruns remain idempotent; old timing and permanent scripts are unchanged; new hook timing matches the planner; quiet motion reaches every part; response and speech sampling are frame-independent; synthesis planning and generation use the same keys; full tests/typecheck and a short visual render pass. Compare equivalent short rendering workloads and record observations without claiming audience retention gains.

Deferred from the research list: persistent props/handovers, traveling actors, character-specific voices, expanded scenery, musical arrangements, audience analytics. These need their own implementation and visual review.
