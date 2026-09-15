# AGENTS.md — `scripts/`

Context: All pipeline scripts are ES modules (`"type": "module"` in `package.json`). They run on Node 22. Read the root `AGENTS.md` for constraints that apply everywhere.

---

## Script Inventory & Responsibilities

### Entry points (called directly by CI or the user)

| Script | Purpose | Key flags |
|---|---|---|
| `plan.mjs` | CI planner: script → Director → needs manifest + chunk ranges | `--slug`, `--template`, `--topic`, `--type`, `--hero`, `--minutes`, `--library`, `--preview`, `--range N/M` |
| `generate-script.mjs` | LLM or template → `script.json` | `--template`, `--topic`, `--type`, `--hero`, `--minutes`, `--slug`, `--library` |
| `direct.mjs` | Run Director on an existing script | `--slug` |
| `generate-audio.mjs` | TTS: synthesize missing lines, assemble audio folder | `--slug` |
| `render.mjs` | Remotion render | `--slug`, `--frames START-END`, `--muted`, `--audio-only`, `--out`, `--scale` |
| `stitch.mjs` | ffmpeg concat + mux | `--slug` |
| `compile.mjs` | Compilation video | `--slugs a,b,c`, `--auto TYPE`, `--count N`, `--title` |
| `publish-release.mjs` | Create GitHub Release | `--slug`, `--tag`, `--files`, `--title` |
| `send-telegram.mjs` | Send to Telegram | `--slug`, `--link-only` |
| `queue.mjs` | Queue CRUD | `pop`, `push`, `done <id>` |
| `autopilot.mjs` | Invent next video when queue is empty | (no flags; reads config.json + catalog) |
| `pipeline.mjs` | Local: generate + audio + render in sequence | same flags as generate-script |
| `bake-backgrounds.mjs` | Bake static scenery → `public/baked/` | `--slug` (only bakes BGs used in that script) |
| `build-registry.mjs` | Generate `src/generated/registry.ts` | (no flags) |
| `build-audio-assets.mjs` | Synthesize music loops + SFX WAVs | (no flags) |
| `fetch-yt-stats.mjs` | Pull YouTube analytics for autopilot | (reads env `YOUTUBE_API_KEY`) |
| `import-vox.mjs` | Normalize recordings → `public/vox/` | `--local` |
| `fetch-vox.mjs` | Pull CC0 sounds from Freesound | `--per-kind N` |
| `check-character-designs.mjs` | Validate all character recipes render | (no flags) |
| `import-character-bible.mjs` | Bootstrap character recipes from bible JSON | (destructive bootstrap, run once) |

---

## `lib/` — Internal Modules

### `director.mjs` ⭐ The engagement brain

The most complex module. Takes a raw `script.json` and enriches it deterministically:

- **Groove** — every speaking line gets a `groove` animation marker so characters bob on the beat
- **Callouts** — detects numbers, colors, key vocabulary; inserts labeled pop-up cues
- **Questions** — inserts thinking-timer questions after key scenes, with answer reveals
- **Stars** — awards stars for correct answers; updates star-jar HUD
- **Moral chant** — builds `say-it-with-me` → `chant` → `chant-finale` sequence at the end
- **Party scenes** — at choruses and the finale, two friends hop in and dance
- **Gags** — peek-a-boo, butterfly, bee, balloon, shooting star (determined by background)
- **Reprises** — if estimated duration < target, appends "One more time!" + full repeat
- **Vox extraction** — strips `{giggle}` etc. from line text and converts to vox cue events

**Rules when editing `director.mjs`:**
- Keep all logic deterministic (no `Math.random()`, use `rng(seed)` from `templates/engine.mjs`)
- Keep it idempotent: calling it twice on the same input must produce the same output
- Do not add any network calls
- Export: `direct(script, opts?) → enrichedScript`

### `cast.mjs`

Sunny Meadow cast graph. Reads `library/cast.json`.

```js
castKinds()           // ['taffy','ben','daisy','fiona','tilly','ozzy']
castMemberByKind(k)   // full cast entry
castFriendsOf(k)      // array of kinds
castRivalsOf(k)       // array of kinds
castFamilyOf(k)       // array of kinds
castOrder()           // canonical display order
castPrompt()          // the block fed to the LLM prompt
```

**Never add new cast members programmatically.** Edit `library/cast.json` and this module together if a character is added (requires consensus with the project owner).

### `universe.mjs`

Universe ledger helpers. Reads/writes `library/universe.json`.

```js
leastStarred()                         // → {id, name} of cast member with fewest starring roles
recordStory(script, opts)              // write a new story entry into the ledger
updateStoryStatus(slug, status, url)   // update status + release URL
summary()                              // print human-readable summary
```

**Always use these helpers, never write `universe.json` directly.**
CLI: `node scripts/lib/universe.mjs --least-starred | --summary | --record <slug> --status rendered`

### `catalog.mjs`

Reads/writes `library/catalog.json`. Used by the stitch and compile jobs to record completed episodes and compilations.

### `recipes.mjs` + `hints.mjs`

- `recipes.mjs` — validates background and character recipe JSON against a Zod schema
- `hints.mjs` — maps natural-language words to known recipe ids (e.g. `lake → pond`, `rabbit → bunny`) so the LLM prompt never needs to describe a recipe that already exists

### `templates/`

AI-free song templates. Each template is a module exporting `generate(opts) → script`. The engine (`engine.mjs`) provides:
- `rng(seed)` — seeded pseudo-random (deterministic!)
- `pick(arr, r)` — deterministic pick from array
- `shuffle(arr, r)` — deterministic shuffle

**To add a template:**
1. Create `templates/<id>.mjs` exporting `generate(opts)`
2. Register in `templates/index.mjs` → `TEMPLATE_IDS` and `HEROES`
3. Test: `npm run generate -- --template <id> --hero bunny`

### `edge-tts.mjs`

Microsoft Edge TTS client. **Free, no API key.** Uses the `edge-tts` protocol. Good for child voices (`en-US-AnaNeural`, `en-GB-MaisieNeural`).

### `voice.mjs`

Voice store: hash-addressed `.wav` files in `.cache/voice/<engine>/`. Key = `sha256(text + speaker + speed)`. A line is synthesized once ever — even across different videos.

### `vox.mjs`

- Defines the vox vocabulary: `giggle`, `laugh`, `yay`, `wow`, `gasp`, `yum`, `yawn`, `hmm`, `aww`, `sigh`
- Extracts `{tag}` markers from line text before TTS (so the voice never reads "ha ha")
- Returns extracted tags as vox cue events for the Director

### `estimate.mjs`

Estimates total frame count and duration from a script. Must stay in sync with `src/lib/timing.ts` — they implement the same formula on different sides of the pipeline.

### `db.mjs`

libSQL client (local SQLite via `@libsql/client`). Used for the DB-backed queue. Falls back gracefully if the DB file doesn't exist.

---

## Data Flow: Script JSON through the Pipeline

```
generate-script.mjs
  → public/generated/<slug>/script.json   (raw: lines[], title, moral, etc.)
        ↓
direct.mjs  (plan.mjs calls this)
  → public/generated/<slug>/script.json   (enriched: groove, callouts, questions, chant, vox cues…)
  → library/scripts/<slug>.json           (committed copy)
        ↓
generate-audio.mjs
  → .cache/voice/<engine>/<hash>.wav      (global, cached forever)
  → public/generated/<slug>/audio/        (per-episode symlinks/copies)
        ↓
render.mjs
  → out/chunks/<slug>/chunk-N.mp4         (muted video chunks, parallel)
  → out/episodes/<slug>.aac               (audio track)
        ↓
stitch.mjs
  → out/episodes/<slug>.mp4               (final video)
  → out/episodes/<slug>.png               (thumbnail)
  → out/episodes/<slug>.metadata.txt
```

---

## Coding Conventions

- **ES modules** only (`import`/`export`, `.mjs` extension)
- **No `process.exit(0)`** from library modules — only from CLI entry points
- **`GITHUB_OUTPUT`** — append `key=value\n` for Actions job outputs
- **Retry git push** with the standard 5-iteration loop (see any existing workflow step)
- **Dry-run flag** — new scripts that commit should support `--dry-run` for safe local testing
- **Determinism** — scripts that generate content must use `rng(seed)` not `Math.random()`
- **No runtime `npm install`** inside scripts — all dependencies must be in `package.json`

---

## Environment Variables

Scripts read from `.env` locally. In CI they come from secrets/vars:

```
GROQ_API_KEY / GEMINI_API_KEY / OPENROUTER_API_KEY  — LLM (one required for stories)
LLM_BASE_URL / LLM_API_KEY / LLM_MODEL              — Custom OpenAI-compatible endpoint
TTS_ENGINE      kokoro (default) | edge | gemini
TTS_VOICE       af_heart (default)
NARRATOR_VOICE  af_bella (default for Kokoro; enthusiastic narrator)
TTS_SPEED       0.95 (default)
TARGET_MINUTES  5.5 (default)
TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID               — Delivery
FREESOUND_API_KEY                                    — fetch-vox.mjs only
GITHUB_TOKEN                                         — publish-release.mjs (auto in CI)
```
