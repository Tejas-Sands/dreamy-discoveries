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
| A new animal or place the topic needs | animals are a **closed cast** (the Sunny Meadow universe, below) — never invented. A new *place* still proposes a recipe made of known parts; validated, saved, never asked again |
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
   (currently moral stories only, rotated from `library/config.json` → `storySeeds`).
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

Outputs are organized under `out/`:

- `episodes/`: episode videos, thumbnails, and metadata, grouped by filename slug.
- `characters/`: current character sheets and animation previews.
- `references/`: background and other reference sheets.
- `chunks/`: temporary split renders used by the CI pipeline.

The render, stitch, compilation, release, and Telegram scripts use `out/episodes/`.
An explicit `--out` path still overrides the video destination.

### Zero-AI story samples (no LLM, no keys)

`sample-share` (sharing, bunny) and `sample-turtle` (making friends, shy turtle) are fully
voiced moral stories committed to the repo — the same storytelling the LLM path produces,
without the LLM. Hand-edit them to try story beats or build your own:

```bash
# 1. write a raw script like the samples (they are committed under public/generated/<slug>/script.json)
#    format matches the LLM output: lines = {text, speaker, emotion, action}, plus moral / moralRhyme
node scripts/direct.mjs --slug sample-turtle           # 2. run the Director (deterministic, no AI)
node scripts/generate-audio.mjs --slug sample-turtle   # 3. local Kokoro TTS (no API; store is shared)
node scripts/render.mjs --slug sample-turtle           # 4. full video + thumbnail
```

The Director adds the lesson recap → chant → "say it with me" → chant finale, questions with
stars, gags, party guests and music — everything that makes the LLM path engaging.

## The library (self-expanding, committed by CI)

```
library/
  cast.json           the Sunny Meadow universe (below): 6 animals, names, catchphrases, friend/rival/family graph
  characters/*.json   recipes: the 6 cast members (bunny bear fox duck turtle owl) plus the legacy zoo
                      (cat dog elephant frog lion pig monkey fish star penguin chick bird giraffe mouse cow
                      sheep horse zebra tiger panda koala hippo whale bee ladybug dinosaur unicorn dragon
                      snowman raccoon squirrel hedgehog — usable by scripts but not by new stories)
  backgrounds/*.json  25 recipes: meadow forest night underwater sky candy beach snow space farm
                      bedroom jungle city playground kitchen garden mountain desert castle circus
                      rainy autumn park pond campfire
  scripts/*.json      every produced script (hand-editable; re-run with --slug)
  universe.json       the universe ledger: every story told, canon firsts, cast usage (see below)
  queue.yml           topics waiting; config.json  autopilot settings + topic bank
  catalog.json        every episode and compilation, with release links
```

## The Sunny Meadow universe

A fixed cast of **six animals** lives in one world, and every story, rhyme,
party guest and gag comes from it. The relationships are a graph you pull from
in one place — `library/cast.json`:

| Who | Catchphrase | Role | Friends | Rivals | Family |
| --- | --- | --- | --- | --- | --- |
| Taffy (bunny) | "Hop, hop, hooray!" | the hero | Ben, Daisy, Fiona | Fiona | Toto (baby brother, bunny) |
| Ben (bear) | "Big bear hug!" | gentle giant | Taffy, Daisy | Fiona | Grandma Nana (bear) |
| Daisy (duck) | "Quack a-lacka-doodle!" | the singer | Taffy, Ben, Fiona | — | — |
| Fiona (fox) | "Fast and clever!" | speedy rival | Daisy | Taffy, Ben | — |
| Grandpa Tilly (turtle) | "Slow and steady!" | wise elder | everyone | — | — |
| Professor Ozzy (owl) | "Hoohoo! Let's learn together!" | the teacher | everyone | — | — |

Rules: rivalry only exists in the friendly *Sunny Meadow Games* (always ends in
high fives); family members (Toto, Grandma Nana) appear for cozy moments;
Grandpa Tilly and Professor Ozzy are the grown-ups. `scripts/lib/cast.mjs`
exposes these as helpers — `castKinds()`, `castMemberByKind(kind)`,
`castFriendsOf(kind)`, `castRivalsOf(kind)`, `castFamilyOf(kind)`, `castOrder()`
and `castPrompt()` (the block the LLM prompt is built from). The Director picks
party guests and gag cameos from this graph, and the LLM is told the cast is the
whole world — the story prompt never proposes a new animal again.

### The universe ledger

`library/universe.json` is one zod-validated JSON file that keeps track of
**everything happening in this universe** — the pipeline writes it, the LLM never
touches it:

```jsonc
{
  "counts":  { "stories": 1, "rhymes": 0, "episodes": 1, "stars": 2 },
  "usage":   { "tilly": 1 },                  // times each cast member starred
  "appeared":{ "tilly": 1, "daisy": 1, "fiona": 1 }, // times they were in a story
  "canon": [
    { "event": "First appearance: Grandpa Tilly the turtle.", "story": "sample-turtle", "at": "2026-09-06" }
  ],
  "stories": [ {
    "id": "sample-turtle", "type": "story", "title": "Tilly Finds Her Hello",
    "hero": "tilly", "cast": ["tilly", "daisy", "fiona"],
    "moral": "…", "moralRhyme": ["…", "…"], "catchphrases": ["Quack a-lacka-doodle!"],
    "questions": 2, "stars": 2, "backgrounds": ["beach", "pond"], "palette": "ocean",
    "status": "rendered", "months": "2026-09", "release": null
  } ]
}
```

- **Every finished render** records the story (`render.mjs`); **releases** update
  it with the URL (`publish-release.mjs`). First appearances write themselves
  into `canon` so the world history grows, and `library/catalog.json` stays in
  sync.
- **Autopilot rotates heroes**: `scripts/lib/universe.mjs --least-starred` picks
  the cast member who has starred least, and story generation takes `--hero`
  (`node scripts/generate-script.mjs --topic "…" --type story --hero fiona`), so
  the crew stays evenly on screen.
- `scripts/lib/universe.mjs` is also a CLI: `--record <slug> --status rendered`,
  `--least-starred`, `--summary`.

A **character recipe** picks a rig (`biped`, `bird`, `fish`, `star`, `shell`,
`longNeck`, `tRex`, `whale`), ears, tail, features (snout, whiskers, mane, trunk,
horns, spikes, antennae, bee bands, wings, bamboo…), markings, accessories
(scarf, sailor collar, headphones, saddle, striped beanie…), colors and the words
the templates use.
A **background recipe** is an ordered list of parts in three groups: *back*
(animated sky things), *static* (scenery, baked to one PNG), *front* (animated
things in front). Add a JSON file and it is live everywhere: the Director, the
LLM prompt, the templates, the Studio sheets. Unknown animal or place words are
mapped to the closest recipe by `scripts/lib/hints.mjs` (rabbit → bunny, lake →
pond) before the LLM is ever asked to invent one.

## What keeps kids watching

**The first five seconds.** The hero hops in from the edge, the title slams in word
by word, the hero says hi by voice, then a "3… 2… 1… GO!" countdown (big numbers
popping on the right, a flash and confetti on GO) launches the first scene. Stories
open with a "📖 Story time!" beat and lullabies with "🌙 Sleepy time!" instead.

**Nothing stands still.** Every character bobs on the beat even while talking
(`groove`), jumps have anticipation and a landing squash, ears and tails lag behind
the body, heads nod with the voice, and a contact shadow shrinks when feet leave the
ground. On every cut the characters hop into the scene instead of just being there.

**Shots, not scenes.** Story scenes alternate a wide shot and a closer shot on
whoever is speaking, line by line, with a small camera punch on each new line and a
gentle pulse on the beat in choruses — the cut rhythm toddlers' shows use, with no
extra rendering.

**Pattern interrupts** every few scenes: a peek-a-boo from either edge, or a butterfly
/ bee / balloon / shooting star flying across the sky (chosen by the place).

**Party scenes.** Choruses, the moral chant and the finale invite two extra friends
who hop in at the edges and dance; the end card is a dance party with everyone who
appeared, a "You got ALL the stars!" banner when the child answered everything, and
a second wave of confetti.

**Sing-along cues.** A bouncing ball hops over each word as it is sung; counted
objects pop with a sound on the number words; the answer reveal flashes and ripples;
the star jar jiggles when a star lands.

Plus everything from before: direct address (the hero greets and says goodbye by
voice), lip-synced rigged characters that do what the words say, learning callouts
(numbers, counting objects, color splats, key words), call-and-response questions
with a thinking timer, praise and a star-jar reward, choruses and auto-reprises,
beat-synced dancing to procedurally generated music with ~20 synthesized sound
effects, scene transitions and camera moves, a cool tint on sad beats, and stories
that end with a lesson beat and a moral chant the child is asked to say along.

## Real laughs, not "ha ha" (vox)

A synthetic voice reading "ha ha" is the fastest way to break the spell, so the narrator
never reads sound words. The Director pulls laughs, giggles, gasps and yawns out of every
line ("Ha ha! That tickles!" → the voice says "That tickles!") and turns them into **vox
cues** that play a real recording at that moment, with the character's mouth laughing
along. The LLM writes tags instead: `{giggle} {laugh} {yay} {wow} {gasp} {yum} {yawn}
{hmm} {aww} {sigh}` at the start or end of a line.

Recordings are yours to collect (kids' giggles you record are the best):

```bash
# 1. drop files into .cache/vox-inbox/ with the kind in the file name (giggle__x.mp3, kids-laughing.wav …)
node scripts/import-vox.mjs            # → public/vox/<kind>-<n>.wav  (CC0 only: committed, no names anywhere)
node scripts/import-vox.mjs --local    # → public/vox-local/          (licences that forbid redistribution: gitignored, local renders only)

# or pull CC0 sounds from Freesound automatically (free API key: https://freesound.org/apiv2/apply)
FREESOUND_API_KEY=... node scripts/fetch-vox.mjs --per-kind 4
```

Files are trimmed, capped at 2.5 s, loudness-matched and renamed to neutral names; the
original file names are kept only in `.cache/vox-sources.json` (gitignored). A kind with no
recording on disk is simply silent — better than a fake laugh. `npm run registry` (run
automatically before render/studio) picks up whatever is in the two folders.

## Layout

```
scripts/
  plan.mjs              CI planner: script → Director → needs manifest / chunk ranges
  generate-script.mjs   LLM or --template → script.json
  lib/templates/        AI-free song templates + engine
  lib/director.mjs      the engagement brain (idempotent)
  lib/cast.mjs          the Sunny Meadow cast graph helpers (library/cast.json)
  lib/universe.mjs      the universe ledger helpers (library/universe.json; records stories/canon/usage)
  lib/recipes.mjs       recipe vocab + validation      lib/hints.mjs   keyword → recipe
  lib/library.mjs       reads library/                 lib/vocab.mjs   enums from the library
  generate-audio.mjs    Director → TTS with the global voice store
  import-vox.mjs        recordings → public/vox (trim, normalize, neutral names)   fetch-vox.mjs   CC0 from Freesound
  lib/vox.mjs           vocalization vocabulary + "ha ha" extraction
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
