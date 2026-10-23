# Animation acting pilot

`Animation-Pilot` is a 24-second authored direction study using Taffy, Ben and
the existing meadow. It explores a complete sequence: notice, anticipation,
three quick hops, a missed reach, a weighted catch, reassurance, a handover and
a return to play. The camera follows those beats. Dialogue reuses the measured
recordings from `dev-animation-v3`; no voice synthesis or additional AI runs.

The choreography remains an authored prototype. Its corrected object contacts
and slightly stronger production color grade now run through shared production
renderers; see [Production color and object contact](color-and-object-contact.md).

```sh
node scripts/preview-animation-pilot.mjs --stills
node scripts/preview-animation-pilot.mjs

# The shared production grade, comparisons and full cast/background gallery:
node scripts/preview-animation-pilot.mjs --grade production --compare --gallery
```

The source preview must already contain its recorded speech. `--source` can
select another preview containing the same Taffy/Ben rolling-ball opening;
`--slug` selects another `dev-` destination. The writer runs the Director and
creates the destination script exclusively, preserving existing recordings
and measured timing on reruns. It does not update permanent episode history.

`--grade production` is the default and is slightly stronger than `sunny`.
`original`, `sunny` and `vivid` remain explicit developer comparison options.
Captions are outside the color passes.
Carried and grounded props use the same cast pass. Foreground scenery uses the
same background pass as the cached scenery, avoiding a mismatched border.
Graded runs default to their own `dev-animation-pilot-<grade>-2026-10-23` slug.
`--compare` renders three matched frames with original/production/vivid grades
and rejects identical comparison outputs. `--gallery` adds all 38 characters,
all 25 backgrounds, individual night/interior/snow/underwater settings, and
production dialogue/handover/question frames. Night grading retains dark detail.

Current review outputs are under `out/review/dev-animation-pilot-production-2026-10-23/`: the MP4,
eight storyboard frames, `manifest.json` and a local `index.html` player.
The MP4 is rendered at 1280×720 and 30 fps. The existing two-pass audio master
targets -16 LUFS and -2 dBTP; `loudness.json` records the measured result.
`verification.json` records the frame, duration and complete decode checks.
The manifest records local rendering time; it does not predict GitHub runner performance.

The production `Character` accepts an optional `authoredPose`, copied before
scaling and hand-contact solving. Ordinary callers retain their existing pose
engine, and still artwork ignores the override. All pilot poses derive solely
from requested time; ear and scarf response samples the preceding time rather
than relying on playback history. Walking feet use the existing distance-driven
gait. Static scenery keeps the existing baked PNG.

Validate changes with `npm test`, `npm run typecheck` and
`node scripts/check-character-designs.mjs`, then review the rendered motion.
