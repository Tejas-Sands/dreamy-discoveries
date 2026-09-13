# Dreamy Discoveries: storybook visual direction

Research checked 12 September 2026. Audience: global English-speaking families, with ages 2–5 as the production assumption.

## Evidence and limits

- Disney Animation describes visual development as coordinating color, design, composition, and character appeal around the story. Its lighting team uses color and contrast to direct the viewer's eye and establish mood. These are production principles, not preschool learning experiments. [Visual development](https://www.disneyanimation.com/process/visual-development/), [Lighting](https://www.disneyanimation.com/process/lighting/).
- Takacs and Bus (2016) studied 39 children aged 4–6 using animated and static storybooks. Results support motion as an attention cue and a benefit for some story-comprehension measures; receptive vocabulary did not significantly differ between the animated and static conditions. Apply this cautiously to videos: retain motion associated with speech, counting, and answers, and reduce unrelated competing motion. It does not establish an ideal saturation level or prove results for two-year-olds. [Original study](https://www.frontiersin.org/journals/psychology/articles/10.3389/fpsyg.2016.01591/full).
- Fisher, Godwin, and Seltman's kindergarten classroom study found more distraction and smaller learning gains in the heavily decorated condition. A classroom is not an animated video; this is supporting context for keeping the teaching region clear, not evidence that colorful animation is harmful. [CMU research report](https://www.cmu.edu/news/stories/archives/2014/may/may27_decoratedclassrooms.html).
- Super Simple's color content organizes songs around concrete color vocabulary and questions. This is a relevant content reference, not evidence of a causal retention advantage or permission to reuse its artwork/music. [Official song page](https://supersimple.com/song/whats-your-favorite-color/).

## Applied art direction

Our design inference is a colorful storybook world with a clear focal subject. Richness comes from shaped foliage, different landscape layers, coordinated warm/cool accents, and restrained highlights. Increasing saturation everywhere is insufficient.

- Shared trees: layered canopies, warm branching trunks, quieter outlines and shaded pine faces.
- Shared hills: less white mixed into the crest, stronger separation between individual hills, distinct gradient IDs for each recipe part.
- Green outdoor sets: large stationary leaf silhouettes and a few flowers at the lower edges; keep the central character and right-hand teaching region clear. These are baked with the scenery.
- Farm: coral siding, teal roof, cream trim and a round attic window.
- Daylight: a stronger blue at the top of sunny skies. Night, space, indoor and seasonal sets retain their own mood and geography.
- Color badges: light sticker outline and shadow to separate the exact teaching color from the background.
- Title/finale: alternate the existing palette's accent colors across words.
- Lesson scenes: suppress ambient sparkles while questions or callouts are present; retain existing lesson-linked animation and rewards.
- Keep the six established character designs, readable caption ink, existing timing and audio.

## Rendering contract

All illustration is deterministic SVG/CSS. No generated images, paid tools, new services, or dependencies. Cached and live scenery use the recipe's own palette. Baking hashes all shared scenery inputs and retains earlier content-addressed PNGs. Existing scripts remain re-renderable by slug.

Validation artifacts are in `out/review/storybook/`. These choices still need audience feedback; no retention or virality increase is claimed.
