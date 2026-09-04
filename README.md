# 🎬 Dreamy Discoveries

A self-running studio for a kids' YouTube channel (sing-along rhymes + moral
stories). It lives entirely in GitHub Actions: a daily scheduler picks a topic,
the pipeline writes, voices, animates, renders and delivers a finished 5–6
minute episode to your Telegram, and a growing library makes every next video
cheaper than the last. You watch it and upload to YouTube — the only human step.

```
 schedule / queue / click
      │
      ▼
 1. words       LLM (one call, free tier) for stories & original rhymes — or ZERO AI for evergreen
                songs (counting, colors, actions, animal sounds, body parts, shapes, lullaby, opposites)
      ▼
 2. Director    deterministic code: emotions, actions, lip-sync, callouts, questions with answers,
                praise lines, star rewards, gags, the moral chant, transitions, music mood
      ▼
 3. voice       Kokoro-82M on the runner's CPU (no API); every line is synthesized ONCE ever
                and kept in a shared cache across all videos
      ▼
 4. render      Remotion, split into parallel chunks on several runners, stitched with ffmpeg;
                38 rigged characters + 25 backgrounds built from recipes, scenery baked to PNG once
      ▼
 5. deliver     GitHub Release (permanent), Telegram (review copy), library/catalog.json
```

## How much AI is left

| Stage | AI? |
| --- | --- |
| Evergreen songs from templates | **none** |
| Stories and original rhymes | one text call (~5k tokens, free tier) |
| A new animal or place the topic needs | the same call proposes a *recipe* made of known parts; validated, saved, never asked again |
| Voice | a local neural model, no API, cached forever per line |
| Music, sound effects, drawing, animation, thumbnails, compilations | none |

Everything visual, musical and vocal is deterministic and reproducible from
`script.json` + recipes.

## Run it online (recommended)

1. Push to a **public** GitHub repo (unlimited Actions minutes, up to 20 parallel jobs).
2. Add repository **Secrets**: one of `GROQ_API_KEY` / `GEMINI_API_KEY` /
   `OPENROUTER_API_KEY` (only needed for stories), plus `TELEGRAM_BOT_TOKEN` and
   `TELEGRAM_CHAT_ID`.
3. Actions → **Make video** → *Run workflow*. Give it a topic, or a template
   (`counting`, `colors`, `actions`, `animal-sounds`, `body-parts`, `shapes`,
   `lullaby`, `opposites`) with an optional hero, or an existing slug to re-run.
4. Or do nothing: **Scheduled video** runs daily (09:00 IST), takes the next entry
   from `library/queue.yml`, and when the queue is empty *autopilot* invents one
   (mostly template songs, sometimes a story from `library/config.json` → `topicBank`).
5. **Compilation video** stitches finished episodes into a 20–30 minute "best of"
   with bumper cards — zero AI, zero re-rendering.

Every finished episode is a GitHub Release (`video-<slug>`: mp4, thumbnail,
metadata, script), listed in `library/catalog.json`.

### What the workflow does

```
plan ──► voice ──► render ×N chunks ──► stitch → release → Telegram → catalog
             └──► audio track
```

- **plan** writes/loads the script, runs the Director, commits it to `library/scripts/`,
  and decides what is needed: which voice lines are missing from the cache, how many
  render chunks to fan out (~3000 frames each).
- **voice** synthesizes only missing lines; the store (`.cache/voice`) is an Actions
  cache shared by every run, so greetings, praise lines and choruses cost nothing.
- **render** jobs each render a frame range video-only (`--muted`) while **audio**
  renders the sound track once; **stitch** concatenates with stream copy.
- Caches: npm, Kokoro model, Chrome Headless Shell, Remotion's bundler cache, the
  voice store, baked background stills.
- Re-run from a stage: dispatch with `slug` = an existing script; nothing is
  regenerated, cached voice is reused, only render + deliver run. `preview: true`
  renders a fast 540p copy.

## Run it locally

```bash
npm install
cp .env.example .env            # keys are optional: templates and samples need none

npm run generate -- --template counting --hero owl     # zero-AI song
npm run generate -- --topic "a shy turtle who learns to make friends" --type story
npm run tts && npm run render && npm run telegram

node scripts/render.mjs --slug sample-share            # bundled samples render with no keys
npm run studio                                         # live preview; Sheet-* show every character/background
npm run compile -- --slugs a,b,c --title "..."
```

Outputs land in `out/`: `<slug>.mp4`, `<slug>.png`, `<slug>.metadata.txt`.

## The library (self-expanding, committed by CI)

```
library/
  characters/*.json   38 recipes: bunny bear cat dog duck elephant frog lion pig monkey fish star
                      owl penguin chick bird turtle giraffe fox mouse cow sheep horse zebra tiger
                      panda koala hippo whale bee ladybug dinosaur unicorn dragon snowman raccoon
                      squirrel hedgehog — plus whatever the LLM proposes and the Director accepts
  backgrounds/*.json  25 recipes: meadow forest night underwater sky candy beach snow space farm
                      bedroom jungle city playground kitchen garden mountain desert castle circus
                      rainy autumn park pond campfire
  scripts/*.json      every produced script (hand-editable; re-run with --slug)
  queue.yml           topics waiting; config.json  autopilot settings + topic bank
  catalog.json        every episode and compilation, with release links
```

A **character recipe** picks a rig (`biped`, `bird`, `fish`, `star`, `shell`,
`longNeck`), ears, tail, features (snout, whiskers, mane, trunk, horns, spikes,
antennae…), markings, accessories, colors and the words the templates use.
A **background recipe** is an ordered list of parts in three groups: *back*
(animated sky things), *static* (scenery, baked to one PNG), *front* (animated
things in front). Add a JSON file and it is live everywhere: the Director, the
LLM prompt, the templates, the Studio sheets. Unknown animal or place words are
mapped to the closest recipe by `scripts/lib/hints.mjs` (rabbit → bunny, lake →
pond) before the LLM is ever asked to invent one.

## What keeps kids watching

Direct address (the hero greets and says goodbye by voice), lip-synced rigged
characters that do what the words say, learning callouts (numbers, counting
objects that appear as they are spoken, color splats, key words), call-and-response
questions with a thinking timer, an answer reveal with confetti, praise and a
star-jar reward, choruses and auto-reprises, beat-synced dancing to procedurally
generated music with ~20 synthesized sound effects, peek-a-boo gags, scene
transitions and camera moves, and stories that end with a lesson beat and a moral
chant the child is asked to say along.

## Layout

```
scripts/
  plan.mjs              CI planner: script → Director → needs manifest / chunk ranges
  generate-script.mjs   LLM or --template → script.json
  lib/templates/        AI-free song templates + engine
  lib/director.mjs      the engagement brain (idempotent)
  lib/recipes.mjs       recipe vocab + validation      lib/hints.mjs   keyword → recipe
  lib/library.mjs       reads library/                 lib/vocab.mjs   enums from the library
  generate-audio.mjs    Director → TTS with the global voice store
  render.mjs            full / --frames chunk / --audio-only        stitch.mjs   concat + mux
  bake-backgrounds.mjs  static scenery → public/baked  build-registry.mjs → src/generated/registry.ts
  publish-release.mjs, queue.mjs, autopilot.mjs, compile.mjs, send-telegram.mjs, build-audio-assets.mjs
src/
  KidsVideo.tsx         the composition        lib/timing.ts  schedule (mirrored by scripts/lib/estimate.mjs)
  components/characters/ rig, pose engine, face, parts, recipe renderer
  components/backgrounds/ parts, recipe renderer       Bake.tsx, Bumper.tsx, *Sheet.tsx (dev)
.github/workflows/      make-video.yml  schedule.yml  compile.yml  assets.yml
```

## Before you upload

Watch every video. Mark uploads **Made for kids** (COPPA). Vary topics; YouTube
penalizes mass-produced low-quality kids content. Remotion is free for individuals
and companies of up to 3 people (remotion.dev/license). Release assets on a public
repo are public downloads.
