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
| Characters and settings | all 38 library character designs and existing background recipes, selected by deterministic code |
| Voice | a local neural model, no API, cached forever per line |
| Music, sound effects, drawing, animation, thumbnails, compilations | none |

Everything visual, musical and vocal is deterministic and reproducible from
`script.json` + recipes.

## Run it online (recommended)

1. Push to a **public** GitHub repo (unlimited Actions minutes, up to 20 parallel jobs).
2. Add repository **Secrets**: `GEMINI_API_KEY`, `GROQ_API_KEY` and
   `OPENROUTER_API_KEY` for independent free-tier fallbacks (one works; all three improve availability), plus `TELEGRAM_BOT_TOKEN` and
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

Script writing tries Gemini → Groq → OpenRouter using whichever keys are configured.
Temporary errors (including Gemini 503 and rate limits) get up to three attempts per
provider with backoff and `Retry-After`, bounded by an eight-minute overall budget.
Authentication failures and missing models move straight to the next provider.
Returned scripts also pass local validation before a provider is accepted: short,
malformed, empty, truncated or invalid drafts move to the next configured provider.
A generated-schema rejection permits one JSON-object retry with the same local
checks. No separate AI repair stage is added, and the overall deadline stays fixed.
Defaults are `gemini-3.6-flash`, `openai/gpt-oss-120b` and `openrouter/free`;
optional repository Variables `GEMINI_MODEL`, `GROQ_MODEL` and `OPENROUTER_MODEL`
override them independently. OpenRouter overrides must be `:free` models.
Use free accounts; no billing or paid model routing is needed.

If script generation remains unavailable, the workflow selects an unused,
hand-authored story from `library/standby.json`. The [standby story bank](library/STANDBY.md)
contains 27 complete stories, including 24 new stories with four starring turns
for each Sunny Meadow character, 24 distinct settings and 24 hero/friend pairings.
A cataloged, rendered or explicitly marked Used story is never selected again; replenish the reserve with
new script slugs and run the Director. When it is exhausted, planning fails
clearly. A failed or cancelled scheduled episode goes back to pending and reuses its committed
script on the next attempt. Manual `--slug` runs always skip AI and preserve the
permanent script in `library/scripts/`.

The bank links to readable dialogue, story beats and production JSON for every
story. To use one immediately without an AI request, run **Make video** with its
**slug**. Completed releases automatically update the bank's **Used** status and
usage date. Scripts stay available for rerendering. For a video made separately:

```bash
npm run standby -- list
npm run standby -- used --slug <story-slug> --release <video-url>
npm run standby -- sync
```

### Prepare a bank of 50 original stories in your own chat

Export a small writing kit with every available library character (currently 38), 25 backgrounds,
allowed actions/emotions, used and unused story summaries, output schema and a
complete example:

```bash
npm run stories:brief
```

Paste `out/story-kit/PROMPT.md` into your chat model. If attachments are supported,
also attach `story.schema.json` and `example-story.json` from the same directory.
The prompt targets at least **50 distinct narrative stories**, produced **three at
a time** to avoid truncated replies. It asks for concrete goals, distinct attempts,
gentle comedy, visible repairs and earned endings. Save the complete JSON response
as `batch-01.json`. Review the stories for originality, fun and emotional impact;
schema and story-audit checks cannot judge those qualities for you.

Stories may also finish with a comic payoff instead of a stated lesson. Set both
`moral` and `moralRhyme` to `null` for those stories; the Director keeps the ending
without adding a moral chant. Keep the story's problem, attempts and resolution.

`batches/bank-01/` contains 51 edited stories: 33 lesson stories and 18 comic endings.
`batches/bank-02/` adds ten stories: five lesson stories and five comic endings.
`batches/bank-03/` and `batches/bank-04/` add another twenty stories, split equally
between lesson stories and comic endings, with twenty different heroes.

```bash
npm run stories:feed -- ./batch-01.json --dry-run  # validate without saving
npm run stories:feed -- ./batch-01.json            # import and queue
```

Feed accepts one story object, an array, `{ "stories": [...] }`, or a directory of
JSON files. The complete batch must validate before anything is saved. It runs the
Director, adds new permanent scripts and registers them in `library/standby.json`.
Each queued entry carries the saved slug, so the daily workflow loads it with
**zero LLM calls**. Existing scripts cannot be overwritten; identical reimports do
not duplicate queue entries. `--no-queue` stores stories in the reserve without
scheduling them. Refeeding an unused stored story without that flag queues it;
already used stories are not automatically queued again.

Commit and push imported library changes with `[skip ci]` so GitHub Actions can
see them. Refresh the brief after each batch to include the enlarged inventory.
Use `npm run stories:brief -- --batch 1` for a single story or `--batch 5` for a
larger response. These commands do not call an LLM, synthesize voices or render.
The kit is generated under ignored `out/`; it contains no secrets or cached audio.

Stories can move between available settings by changing `scene.background` where
the action changes location. Keep the same background through continuous action;
the renderer follows those assignments. Normal story generation still follows
the deterministic brief's chosen setting.

Episodes show a five-second parent-directed subscribe reminder near halfway and
during the end card. These are visual overlays, so existing voice caches and
episode duration stay valid. YouTube disables notifications for content marked
Made for kids ([YouTube Help](https://support.google.com/youtube/answer/7389684?hl=en)),
so the default does not promise bell notifications. For other content, explicitly
setting `subscription.bellEnabled: true` in a new production script enables bell
artwork and wording. Keep Made for kids episodes on the default.

Stories use a seeded brief: hero and friend, a setting-specific obstacle, two
different attempts, a gentle consequence, and a visible repair that earns the
moral. Recent briefs help avoid repeating the same pairing and setting. Strict
JSON validation checks the supported cast and vocabulary, lesson, questions and
minimum dialogue before the deterministic Director adds engagement cues.
Topics naming a cast member, species, setting or familiar moral retain those
choices. When no hero is named, the least-used cast members get priority.

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
npm test && npm run typecheck                          # includes mocked provider-outage tests
```

Outputs are organized under `out/`:

- `episodes/`: episode videos, thumbnails, and metadata, grouped by filename slug.
- `characters/`: current character sheets and animation previews.
- `references/`: background and other reference sheets.
- `chunks/`: temporary split renders used by the CI pipeline.

The render, stitch, compilation, release, and Telegram scripts use `out/episodes/`.
An explicit `--out` path overrides the video or thumbnail destination.

### Review thumbnails

Episode covers use a story scene's hero, friend, expression and visible object, with a
short title that fits two lines. The bright storybook colors and soft scenery use the
existing character rigs and vector props; no image service or extra AI call is needed.

```bash
node scripts/preview-thumbnails.mjs                    # six full-size and phone-size covers
node scripts/preview-thumbnails.mjs --slugs standby-ben-and-the-paper-boat,standby-taffy-and-the-two-paw-umbrella
node scripts/render.mjs --slug standby-ben-and-the-paper-boat --thumbnail-only --thumbnail-text "Paper Boat" --out out/review/cover.png
```

Open `out/review/captivating/thumbnails/index.html` to compare the covers at 1280×720
and 320×180. These previews read existing scripts without changing the library or
generating voices. Normal episode renders use the same cover design automatically.

### Reusable character library

All 38 approved designs share the production `Character` renderer in episodes,
thumbnails and previews. See [the character workflow](library/CHARACTER-WORKFLOW.md)
for motion, speech, turns and prop contact. The original limb chart remains the
sole artwork reference; Daisy and Ben guide performance timing.

```bash
node scripts/preview-character-chart.mjs --kinds=snowman,raccoon
node scripts/check-character-designs.mjs
npm test
npm run typecheck
```

### Review hands and background activity

```bash
node scripts/preview-living-world.mjs                  # six established characters + all 25 settings
node scripts/preview-living-world.mjs --stills-only    # faster still gallery
```

Open `out/review/living-world/index.html` for waving, pointing and holding examples,
plus the background tour. Ambient activities are drawn live over cached scenery;
quiet scenes slow them down, and thumbnails freeze them. The previews use existing
artwork and do not write scripts or synthesize voices.

### Review video quality

New episodes use presentation version 4 for phrase captions, listener reactions,
waveform-assisted speech timing, and a mastered audio mix. Existing slugs retain
their saved presentation and cached voices. Full renders and stitched episodes
are checked for complete video, audio, and valid frame counts before delivery.

```bash
npm run review:quality -- --source dev-animation-v3 --slug dev-quality-check --clips
npm run verify:video -- --slug EXISTING
```

The comparison requires an already voiced source script. See the
[quality workflow](docs/remotion-quality.md) for setup, review artifacts,
render proofs, and local benchmarks. FFmpeg and ffprobe must be installed locally.

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
  cast.json           personality and relationship overrides for the 6 established Sunny Meadow characters
  characters/*.json   all 38 available character designs, with default names and vocabulary
                      (cat dog elephant frog lion pig monkey fish star penguin chick bird giraffe mouse cow
                      sheep horse zebra tiger panda koala hippo whale bee ladybug dinosaur unicorn dragon
                      snowman raccoon squirrel hedgehog — all available for new stories)
  backgrounds/*.json  25 recipes: meadow forest night underwater sky candy beach snow space farm
                      bedroom jungle city playground kitchen garden mountain desert castle circus
                      rainy autumn park pond campfire
  scripts/*.json      every produced script (hand-editable; re-run with --slug)
  universe.json       the universe ledger: every story told, canon firsts, cast usage (see below)
  queue.yml           topics waiting; config.json  autopilot settings + topic bank
  catalog.json        every episode and compilation, with release links
```

## The Sunny Meadow universe

Every renderable design in `library/characters/` can be a hero, friend, party guest
or gag cameo in Sunny Meadow: **38 available characters** today, including elephants,
lions and the six established characters below. `library/cast.json` preserves those
six personality and relationship cards; the other designs use their recipe names
and vocabulary. Cast helpers discover the full library automatically.

| Who | Catchphrase | Role | Friends | Rivals |
| --- | --- | --- | --- | --- |
| Taffy (bunny) | "Hop, hop, hooray!" | the hero | Ben, Daisy, Fiona | Fiona |
| Ben (bear) | "Big bear hug!" | gentle giant | Taffy, Daisy | Fiona |
| Daisy (duck) | "Quack a-lacka-doodle!" | the singer | Taffy, Ben, Fiona | — |
| Fiona (fox) | "Fast and clever!" | speedy rival | Daisy | Taffy, Ben |
| Grandpa Tilly (turtle) | "Slow and steady!" | wise elder | everyone | — |
| Professor Ozzy (owl) | "Hoohoo! Let's learn together!" | the teacher | everyone | — |

Rules: rivalry only exists in the friendly *Sunny Meadow Games* (always ends in
high fives); historical family records do not create separate characters without
their own renderable recipes;
Grandpa Tilly and Professor Ozzy are the grown-ups. `scripts/lib/cast.mjs`
exposes these as helpers — `castKinds()`, `castMemberByKind(kind)`,
`castFriendsOf(kind)`, `castRivalsOf(kind)`, `castFamilyOf(kind)`, `castOrder()`
and `castPrompt()` (the block the LLM prompt is built from). The Director picks
party guests and gag cameos from the full supported inventory. The writing prompt
exports every available design and its exact name, so elephant and lion stories
are supported alongside the established six.

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
