# AGENTS.md — Dreamy Discoveries

> **Self-running kids' YouTube studio.**
> GitHub Actions writes, voices, animates, renders and delivers 5–6 minute kids' episodes (sing-along rhymes + moral stories). The human's only job is to watch and upload.

---

## 0. Golden Rules (read first, always)

1. **Everything must be free.** No paid APIs, no paid services, no paid compute. The whole pipeline runs on GitHub Actions free tier (public repo = unlimited minutes, up to 20 parallel jobs). Every tool or API you add must have a free tier or be fully open-source.
2. **Minimise AI.** AI is used in exactly one place: writing the script text (~5k tokens, one call). Evergreen template songs use **zero AI**. Voice is a local neural model (Kokoro-82M, no API). All visual/musical/structural choices are deterministic code. Do not introduce AI into stages that currently have none.
3. **One video per day** is the target cadence (sometimes every two days). Keep computation light — the `plan` job must stay under 15 min, `voice` under 45 min, each `render` chunk under 90 min.
4. **The library grows, never shrinks.** Scripts, voices, backgrounds and recipes are committed to `library/` and `.cache/`. Never delete cached items; only add.
5. **Idempotent by design.** Every script stage can be re-run with `--slug <existing>` and must produce the same result. Never overwrite a committed script unless the user explicitly asks.
6. **Commit with `[skip ci]`** when writing back to the library so you don't trigger infinite loops.
7. **The cast is closed.** The six Sunny Meadow animals (Taffy, Ben, Daisy, Fiona, Grandpa Tilly, Professor Ozzy) are the whole world. Do not invent new named animal characters.

---

## 1. Repo Map

```
.github/workflows/
  make-video.yml      # Main pipeline: plan → voice → render×N → stitch → release → Telegram
  schedule.yml        # Daily cron (09:00 IST): pops queue.yml or calls autopilot
  compile.yml         # Compilation video: stitch finished episodes, zero AI
  assets.yml          # Regenerate music/sfx WAVs when build-audio-assets.mjs changes

scripts/
  plan.mjs            # CI entry point: generates/loads script, runs Director, emits chunk ranges
  generate-script.mjs # LLM or --template → script.json
  direct.mjs          # Runs the Director (deterministic engagement engine) on an existing script
  generate-audio.mjs  # Kokoro/Edge/Gemini TTS → .cache/voice/ (cached forever per line)
  render.mjs          # Remotion render: full / --frames chunk / --audio-only
  stitch.mjs          # ffmpeg concat chunks + mux audio → final mp4 + thumbnail
  compile.mjs         # Stitch multiple episodes into a compilation video
  publish-release.mjs # gh release create → durable GitHub Release storage
  send-telegram.mjs   # Send video/link to Telegram for human review
  queue.mjs           # YAML queue CRUD: pop, push, done
  autopilot.mjs       # When queue is empty: rotate curated moral-story seeds
  fetch-yt-stats.mjs  # Fetch YouTube analytics (view counts) to inform autopilot
  import-vox.mjs      # Normalize recordings → public/vox/ (trim, loudness-match, rename)
  fetch-vox.mjs       # Pull CC0 sounds from Freesound API (free key needed)
  bake-backgrounds.mjs # Static scenery layers → public/baked/ PNG (cached)
  build-registry.mjs  # Generate src/generated/registry.ts from public/ assets
  build-audio-assets.mjs # Synthesize music loops + SFX → public/music/ + public/sfx/
  pipeline.mjs        # Local convenience: generate + audio + render in one command
  check-character-designs.mjs

  lib/
    director.mjs      # The engagement brain (adds groove, callouts, questions, chant, etc.)
    cast.mjs          # Sunny Meadow cast graph helpers
    universe.mjs      # Universe ledger helpers (library/universe.json)
    catalog.mjs       # library/catalog.json R/W
    recipes.mjs       # Recipe vocab + validation
    hints.mjs         # keyword → recipe (rabbit→bunny, lake→pond)
    templates/        # AI-free song templates + engine (counting, colors, actions, …)
    edge-tts.mjs      # Edge TTS client (free Microsoft neural voices)
    vox.mjs           # "ha ha" extraction + vox vocabulary
    voice.mjs         # Voice store: hash-addressed, per-engine
    db.mjs            # libSQL client (local SQLite for dev)
    estimate.mjs      # Frame/duration estimator (mirrored by src/lib/timing.ts)
    vocab.mjs         # Enums (emotion, action, palette, …) sourced from library/
    common.mjs        # Shared CLI helpers

src/
  KidsVideo.tsx       # Main Remotion composition (the whole video)
  Root.tsx            # Remotion root: registers all compositions
  Thumbnail.tsx       # Thumbnail composition
  Bumper.tsx          # Compilation bumper card
  Bake.tsx            # Background baking composition
  CharacterSheet.tsx  # Dev: character preview sheet
  BackgroundSheet.tsx # Dev: background preview
  components/
    characters/       # Rigged character rig, pose engine, face, parts, recipe renderer
    backgrounds/      # Background part renderer + recipe renderer
    Callout.tsx, Cards.tsx, Karaoke.tsx, MoralChant.tsx, Particles.tsx,
    Question.tsx, StarHud.tsx, Transition.tsx, Vox.tsx, Sfx.tsx

library/
  cast.json           # Sunny Meadow cast graph (source of truth for characters)
  character-bible.json # Full character bible (imported once by import-character-bible.mjs)
  characters/*.json   # Individual character recipes (6 main + 32 legacy zoo)
  backgrounds/*.json  # 25 background recipes
  scripts/*.json      # Every produced script (hand-editable; re-run with --slug)
  universe.json       # Universe ledger: stories told, canon, cast usage
  queue.yml           # Topics waiting; items: [ {id, status, topic/template, type, hero, minutes} ]
  config.json         # autopilot settings + curated storySeeds
  catalog.json        # Every episode + compilation with release links

public/
  generated/<slug>/   # script.json + per-slug audio folder (uploaded as artifact per run)
  vox/                # CC0 reaction recordings (committed)
  vox-local/          # Licensed recordings (gitignored, local renders only)
  music/, sfx/        # Pre-built audio assets (committed)
  baked/              # Baked background PNGs (cached by Actions)

.cache/
  voice/              # Global voice store (Actions cache, grows forever)
  models/             # Kokoro-82M model weights (Actions cache)
  vox-inbox/          # Drop new recordings here; import-vox.mjs processes them
  vox-sources.json    # Original filenames (gitignored)
```

---

## 2. The Pipeline (end-to-end)

```
schedule / manual dispatch
        │
        ▼
  [plan job]  15 min max
    • queue.mjs pop --stories-only → or autopilot.mjs
    • generate-script.mjs (template: zero AI | LLM: one free-tier call)
    • direct.mjs (deterministic Director: adds callouts, questions, chant, gags…)
    • Emits: slug, title, voice_needed, chunk_count, chunks[]
    • Commits library/scripts/<slug>.json  [skip ci]
        │
        ▼
  [voice job]  45 min max
    • Restores .cache/voice (Actions cache)
    • generate-audio.mjs --slug: only synthesizes lines NOT in cache
    • Saves updated .cache/voice
    • Uploads public/generated/<slug>/ as artifact
        │
        ├──────────────────────┐
        ▼                      ▼
  [audio job]           [render chunk jobs] × N  (parallel, matrix)
    render.mjs            render.mjs --frames RANGE --muted
    --audio-only          bake-backgrounds.mjs --slug (cache hit: free)
        │                      │
        └──────────────────────┘
                │
                ▼
  [stitch job]  30 min max
    • stitch.mjs: ffmpeg concat chunks + mux audio → out/episodes/<slug>.mp4
    • render.mjs thumbnail
    • publish-release.mjs → GitHub Release (permanent durable storage)
    • send-telegram.mjs → Telegram (human review)
    • catalog update + universe update → commit [skip ci]
```

---

## 3. Free-tier Budget

| Resource | Free limit | How we use it |
|---|---|---|
| GitHub Actions (public repo) | Unlimited minutes, 20 parallel jobs | All compute |
| GitHub Releases | Unlimited public assets | Permanent video storage |
| GitHub Actions cache | 10 GB total | voice store, models, Chrome, webpack, baked BGs |
| Groq API | ~14,400 req/day free | Script generation (1 call/video) |
| Gemini API (Google AI Studio) | 1,500 req/day free | Script gen fallback + optional Gemini TTS |
| OpenRouter API | Free models, daily cap | Script gen fallback |
| Kokoro-82M (local) | Free forever | TTS — no API, runs on runner CPU |
| Edge TTS (Microsoft) | Free (no key) | Alternative TTS via edge-tts.mjs |
| Freesound API | Free key, 60 req/min | CC0 reaction sounds (fetch-vox.mjs) |
| Telegram Bot API | Free | Video delivery for human review |

**Never add** any service that requires a credit card or has compute costs (e.g., Replicate, ElevenLabs paid, AWS, GCP, RunPod).

---

## 4. Adding Content (common tasks)

### Add a new topic to the queue
Edit `library/queue.yml`:
```yaml
items:
  - { id: q1, status: pending, topic: "a little fox who learns to be kind", type: story, minutes: 5.5 }
  - { id: q2, status: pending, template: counting, hero: duck }
```
The daily `schedule.yml` pops the first `pending` item.

### Trigger a video manually
GitHub → Actions → **Make video** → Run workflow. Supply one of:
- `template`: `counting | colors | actions | animal-sounds | body-parts | shapes | lullaby | opposites`
- `topic` (story is the current default and only scheduled type)
- `slug`: re-run an existing script

### Add a new evergreen template (zero AI)
1. Create `scripts/lib/templates/<id>.mjs` — export `generate(opts)` returning `{ lines[], title, moral?, ... }`.
2. Register it in `scripts/lib/templates/index.mjs` → `TEMPLATE_IDS`.
3. Test locally: `npm run generate -- --template <id> --hero bunny`.

### Add a new background
1. Create `library/backgrounds/<name>.json` — ordered list of `back`, `static`, `front` parts.
2. Implement missing parts in `src/components/backgrounds/`.
3. Run `npm run bake` to check it renders.
4. The new background is immediately available to the Director and LLM prompt.

### Add reaction sounds (vox)
```bash
# Drop files into .cache/vox-inbox/ (name must contain the kind: giggle, laugh, yay, wow, gasp, yum, yawn, hmm, aww, sigh)
node scripts/import-vox.mjs          # → public/vox/  (CC0, committed)
node scripts/import-vox.mjs --local  # → public/vox-local/  (gitignored)
# Or fetch CC0 from Freesound:
FREESOUND_API_KEY=... node scripts/fetch-vox.mjs --per-kind 4
```

### Re-run a video from an existing script (no re-generation)
```bash
# GitHub Actions: Make video → slug = <existing-slug>
# Locally:
npm run tts    # only missing lines
npm run render
npm run telegram
```

---

## 5. Script Format (`script.json`)

Every video is fully described by a `script.json`:

```jsonc
{
  "slug": "turtle-friends",
  "title": "Tilly Finds Her Hello",
  "type": "story",       // "story" | "rhyme"
  "template": null,      // template id if AI-free, else null
  "hero": "tilly",       // cast id
  "moral": "Being brave enough to say hello can start a beautiful friendship.",
  "moralRhyme": ["Say hello, say hello!", "A smile can start the show!"],
  "palette": "ocean",    // color mood
  "lines": [
    {
      "text": "Hello there! I'm Grandpa Tilly.",
      "speaker": "tilly",
      "emotion": "happy",    // happy | sad | surprised | thinking | proud | shy | scared | angry | excited | sleepy
      "action": "wave",      // idle | wave | jump | dance | walk | nod | shake | think | cheer | sit | bow | point | spin
      "background": "pond",
      "music": "calm"        // calm | cheerful | playful | mysterious | triumphant | tender | silly
    }
  ]
}
```

The **Director** (`scripts/lib/director.mjs`) takes this and augments it — adding groove bobs, callouts, questions with timers, the moral chant, party scenes, gags, vox cues. It is deterministic and idempotent; run it as many times as you want.

---

## 6. The Director (do not bypass)

`scripts/lib/director.mjs` is the engagement brain. It:
- Inserts **groove** (beat bobs) for every character on every line
- Adds **callouts** (color splats, number pops, key-word labels)
- Injects **questions** with thinking timers + answer reveals + star rewards
- Builds the **moral chant** (`say it with me → chant → chant finale`)
- Adds **party scenes** at choruses and the finale (two extra friends hop in)
- Inserts **gags** (peek-a-boo, butterfly, bee, balloon, shooting star)
- Handles **reprises** (if video too short: "One more time!" + repeat)
- Emits **vox cues** (extracts `{giggle}`, `{laugh}`, etc. from lines)

**Do not write raw `lines[]` and skip the Director.** Always run `node scripts/direct.mjs --slug <slug>` after any manual edit to `script.json`.

---

## 7. Voice Store

- Location: `.cache/voice/`
- Key: `<engine>/<hash-of-text+speaker+speed>.wav`
- A line is synthesized **once, ever** across all videos. Greetings, praise lines, and chorus lyrics are free after the first video.
- The Actions cache key is `voice-<engine>-<run_id>` with `restore-keys: voice-<engine>-` so every run inherits all previous lines.
- **Never delete** items from the voice store.

---

## 8. Caching Strategy

| Cache | Key | Contents |
|---|---|---|
| `voice-<engine>-*` | `voice-<engine>-<run_id>` | Global TTS store (grows forever) |
| `kokoro-82m-v1.0-q8` | static | Kokoro model weights (~90 MB) |
| `remotion-<pkg_hash>-<src_hash>` | based on package-lock + src/ | Chrome Headless Shell + webpack bundle |
| `baked-<bg_hash>` | backgrounds/** + src/components/backgrounds/** | Baked static scenery PNGs |
| npm | default | node_modules |

All caches live within GitHub's 10 GB limit. If you get close, baked background PNGs are the safest to evict (they regenerate deterministically).

---

## 9. Universe Ledger

`library/universe.json` tracks everything that has happened in the Sunny Meadow universe:
- `counts`: total stories, rhymes, episodes, stars given
- `usage`: how many times each cast member has starred
- `appeared`: how many times each cast member appeared
- `canon`: first-appearance events
- `stories`: full metadata for every produced episode

**Autopilot** uses `leastStarred()` from `scripts/lib/universe.mjs` to rotate heroes evenly. When adding new scripts manually, run `node scripts/lib/universe.mjs --record <slug> --status rendered` to keep it in sync.

---

## 10. Secrets Required

Set these in GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Required | Purpose |
|---|---|---|
| `GROQ_API_KEY` | One of these three | LLM for story/rhyme scripts |
| `GEMINI_API_KEY` | One of these three | LLM fallback + optional Gemini TTS |
| `OPENROUTER_API_KEY` | One of these three | LLM fallback (free models) |
| `TELEGRAM_BOT_TOKEN` | Yes | Delivery bot |
| `TELEGRAM_CHAT_ID` | Yes | Your chat/channel ID |

All secrets are **free**. Template videos need none of the LLM keys.

---

## 11. Constraints for AI Agents

When asked to make changes to this repo, follow these constraints:

- **Never remove caching.** Every `actions/cache` step is load-bearing. Removing one will blow the free-tier budget.
- **Never add a paid API call.** If you need data, check: Groq free tier, Gemini free tier, OpenRouter free models, Freesound free API, or a zero-dependency local computation.
- **Never break the `--slug` re-run path.** A user must always be able to re-render an existing episode without re-generating the script or re-synthesizing voice.
- **Never touch `library/universe.json` directly from a workflow without using `universe.mjs`.** The file has a Zod schema; malformed writes corrupt the ledger.
- **When editing a workflow**, keep job timeouts at or below current values. Exceeding 6-hour total for the pipeline wastes runner quota.
- **Test templates locally first.** `npm run generate -- --template <id> --hero bunny` must complete without errors before committing.
- **Scripts committed to `library/scripts/` are permanent.** Treat them like a database row. If you want a new version, give it a new slug.
- **Do not use `actions/upload-artifact` with `retention-days` > 14** for video artifacts; GitHub's storage limits apply.
- **The `[skip ci]` suffix is mandatory** on any commit the bot makes back to the repo.

---

## 12. Local Development

```bash
npm install
cp .env.example .env     # fill in at least one LLM key if you want stories

# Zero-AI template song (no keys needed):
npm run generate -- --template counting --hero owl
npm run tts && npm run render && npm run telegram

# Story (needs one LLM key):
npm run generate -- --topic "a shy turtle who learns to make friends" --type story
npm run tts && npm run render

# Re-run a committed sample (no keys, no AI):
node scripts/render.mjs --slug sample-share

# Live preview (Remotion Studio):
npm run studio    # opens browser; CharacterSheet/BackgroundSheet show all designs

# Check all character designs render:
node scripts/check-character-designs.mjs
```

---

## 13. Output Locations

```
out/
  episodes/<slug>.mp4           Final video
  episodes/<slug>.png           Thumbnail
  episodes/<slug>.metadata.txt  Human-readable metadata
  characters/                   Character sheet renders (dev)
  references/                   Background reference sheets (dev)
  chunks/<slug>/chunk-N.mp4     Temporary render chunks (CI only)
```

---

## 14. What "done" looks like for a video

1. `library/scripts/<slug>.json` committed
2. `.cache/voice/` updated (Actions cache saved)
3. `out/episodes/<slug>.mp4` + `.png` + `.metadata.txt` produced
4. GitHub Release `video-<slug>` created with all four files
5. Telegram message sent
6. `library/catalog.json` updated with release URL
7. `library/universe.json` updated (status: rendered, release URL)
8. All library changes committed with `[skip ci]`

Human watches the Telegram video and uploads to YouTube manually (Made for kids / COPPA).
