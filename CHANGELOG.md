# Changelog

## Added
- **Fast Preview-Render Mode**: Added a new GitHub Workflow (`preview.yml`) to quickly test different tasks (rotation, motion, multicharacter, story, thumbnail) without rendering the full video.
- **Multi-character Support**: Expanded the `speaker` type to support specific character IDs instead of just roles.
- **Preview Test Scripts**: Added dedicated test scripts (`test-motion`, `test-multichar`, `test-story`, `test-rotation`, `test-thumbnail`) in `library/scripts` for isolated testing.

## Changed
- **Animation Polish**: 
  - Substituted linear pose interpolations with `easeInOutSine` for smoother transitions.
  - Implemented blinking logic during open-eye states (every ~4 seconds).
  - Enhanced the walk cycle to use a sawtooth wave with correct opposite foot-planting mechanics and squash-and-stretch.
  - Added camera tracking elements (push-in during emotional scenes, subtle drift) in `KidsVideo.tsx`.
- **Story Depth**:
  - Tightened the LLM prompt in `scripts/generate-script.mjs` to output shorter, punchier dialogue (max 10 words).
  - Configured `holdSec` variables for more suspense and dramatic pauses.
- **Thumbnail Image (`src/Thumbnail.tsx`)**:
  - Increased background contrast and applied `saturate` and `blur` for cinematic depth of field.
  - Increased main character scale and placed them accurately according to the rule of thirds.
  - Positioned elements out of the bottom-right corner to accommodate the YouTube duration overlay.
- **Make-video Workflow**: Fixed a bash string comparison bug in `.github/workflows/make-video.yml`.

## How to Run Previews
To run a fast preview using the new GitHub Workflow:
1. Go to **Actions** -> **Preview Render**.
2. Run the workflow and select your desired `task` (e.g., `rotation`, `motion`, `multichar`, `story`, `thumbnail`).
3. You can also specify the `start` (in seconds) and `duration` (in seconds) to capture a specific window of the preview.
4. The output `.mp4` or `.png` will be accessible as an artifact when the action finishes.

To test locally:
- For thumbnails: `node scripts/render.mjs --slug <slug> --thumbnail-only`
- For previews: `node scripts/render.mjs --slug <slug> --frames 0-299 --scale 0.5`

## Known Issues
- Synthesized voice might still delay generating on completely fresh scripts requiring `generate-audio.mjs` to be run before local testing; however, using `--muted` circumvents this for visuals.
- SVG negative `scaleX` for 3D rotations creates an inversion effect horizontally; during very quick transitions, this could superficially resemble "squashing," but the underlying structural logic correctly retains the back-facing/front-facing features.
