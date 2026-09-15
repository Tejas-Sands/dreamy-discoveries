# AGENTS.md — `library/`

Context: The `library/` directory is the **persistent memory** of the studio. Everything here is committed by the CI bot and survives across runs. Never delete or overwrite existing files without the user's explicit instruction.

---

## File Reference

### `cast.json` — The Sunny Meadow Cast (source of truth)

The complete graph of the six main characters. Used by `scripts/lib/cast.mjs`, the Director, the LLM prompt builder, and the template engine.

**Do not add new characters here.** The cast is closed. Only edit existing entries to fix catchphrases, descriptions, or relationship data.

Schema per entry:
```jsonc
{
  "id": "taffy",
  "name": "Taffy",
  "species": "bunny",
  "catchphrase": "Hop, hop, hooray!",
  "role": "the hero",
  "friends": ["ben", "daisy", "fiona"],
  "rivals": ["fiona"],
  "family": ["toto"]
}
```

### `character-bible.json` — Full Character Bible

Imported once by `scripts/import-character-bible.mjs`. This is the design source of record. The importer is a **lossy bootstrap** — it preserves existing recipes and only fills in missing entries. Do not run the importer again unless adding brand-new characters (requires project owner approval).

### `characters/*.json` — Character Recipes

One JSON file per character. Powers the `Character` Remotion component. The recipe picks a rig, colors, ears, tail, features, markings, and accessories.

**To change a character's appearance:**
1. Edit `library/characters/<kind>.json`
2. Preview: `npm run studio` → select `Cast-Preview`
3. Do not change the `"id"` or `"species"` fields — they are referenced by scripts

### `backgrounds/*.json` — Background Recipes

25 backgrounds. Each recipe has three groups:
- `back` — animated sky elements (clouds, stars, moon)
- `static` — scenery baked to a PNG (trees, hills, buildings, water)
- `front` — animated foreground elements (grass, flowers, ripples)

**To add a new background:**
1. Create `library/backgrounds/<name>.json`
2. Implement any missing part components in `src/components/backgrounds/`
3. Run `npm run bake` — if it succeeds without errors, the background is live

**Never rename a background** — existing scripts reference backgrounds by name.

### `scripts/*.json` — Episode Scripts

Every script ever produced is committed here. Each file is the **director-enriched** version (groove, callouts, questions, chant, vox cues all included).

**These are permanent records.** If you want to experiment with a script:
1. Copy it under a new slug: `cp library/scripts/slug-a.json library/scripts/slug-a-v2.json`
2. Edit the copy
3. Re-run Director: `node scripts/direct.mjs --slug slug-a-v2`

**Never re-generate a script for an existing slug** unless the user explicitly asks. The `--slug` flag in CI skips generation by design.

### `universe.json` — The Universe Ledger

Zod-validated. Tracks everything canonical about the Sunny Meadow world:

```jsonc
{
  "counts":   { "stories": N, "rhymes": N, "episodes": N, "stars": N },
  "usage":    { "tilly": N, ... },    // times each cast member starred
  "appeared": { "tilly": N, ... },    // times each cast member appeared
  "canon": [
    { "event": "First appearance: Grandpa Tilly", "story": "sample-turtle", "at": "2026-09-06" }
  ],
  "stories": [ { "id", "type", "title", "hero", "cast", "moral", "moralRhyme", "questions",
                  "stars", "backgrounds", "palette", "status", "months", "release" } ]
}
```

**Always use `scripts/lib/universe.mjs` helpers** — never write this file directly. The Zod schema will reject malformed writes and crash the run.

CLI:
```bash
node scripts/lib/universe.mjs --summary
node scripts/lib/universe.mjs --least-starred
node scripts/lib/universe.mjs --record <slug> --status rendered
```

### `queue.yml` — Video Production Queue

```yaml
items:
  - { id: q1, status: pending, topic: "...", type: story, minutes: 5.5 }
  - { id: q2, status: pending, template: counting, hero: duck }
```

Status flow: `pending → running → done`

The `schedule.yml` workflow pops the first pending story item each day. Template/rhyme items stay paused. When no story is queued, `autopilot.mjs` chooses a moral-story seed from `config.json`.

Paused songs live under the top-level `pausedTemplates` key so queue rewrites preserve them while `queue.mjs` ignores them.

**To schedule upcoming videos:** add items here. The bot commits status changes with `[skip ci]`.

Supported item fields:
| Field | Required | Values |
|---|---|---|
| `id` | Yes | Unique string |
| `status` | Yes | `pending` |
| `topic` | If no template | Natural-language topic for LLM |
| `template` | If no topic | `counting | colors | actions | animal-sounds | body-parts | shapes | lullaby | opposites` |
| `type` | No | `story` (default) or `rhyme` |
| `hero` | No | Cast id (auto if blank) |
| `minutes` | No | Target length (default 5.5) |
| `place` | No | Background hint (e.g. `farm`, `beach`) |

### `config.json` — Autopilot Configuration

```jsonc
{
  "autopilot": true,           // set false to pause the daily auto-run
  "minutes": 5.5,              // default video length for autopilot-chosen videos
  "storySeeds": [
    {
      "id": "sharing",
      "moral": "Sharing turns something small into joy for everyone.",
      "problem": "The hero has one special treat and a friend hopes to join."
    }
  ]
}
```

**To change the daily cadence:** edit `schedule.yml` cron (currently `30 3 * * *` = 09:00 IST). To pause entirely, set `"autopilot": false` here — the daily schedule will exit cleanly when the queue is empty.

**To add more moral stories** to the rotation: append a stable id, one-sentence moral, and cast-neutral preschool problem to `storySeeds`. Autopilot favors the least-used seeds recorded in `catalog.json`.

### `catalog.json` — Episode Catalog

```jsonc
{
  "episodes": [
    {
      "slug": "counting-owl-2026-09-12",
      "title": "Count with Me!",
      "type": "rhyme",
      "template": "counting",
      "hero": "ozzy",
      "durationSec": 330,
      "renderedAt": "2026-09-12T09:45:00Z",
      "release": "https://github.com/…/releases/tag/video-counting-owl-2026-09-12",
      "run": "1234567890"
    }
  ],
  "compilations": [ ... ]
}
```

Written by `scripts/lib/catalog.mjs`. Used by:
- `autopilot.mjs` — to rotate moral-story seeds and heroes evenly
- `compile.mjs` — to pick episodes for compilation videos
- Humans — to track what has been published

**Never manually delete a catalog entry.** If a video was incorrect, add a note in the `topic` field or add a corrected version with a new slug.

### `templates/` (if present)

Custom template overrides. Files here take precedence over `scripts/lib/templates/`. Same module interface: export `generate(opts) → script`.

---

## Naming Conventions

| Item | Pattern | Example |
|---|---|---|
| Auto-generated slug | `<template>-<hero>-<date>` | `counting-owl-2026-09-12` |
| LLM story slug | `<topic-kebab>-<date>` | `turtle-friends-2026-09-14` |
| Queue item id | `q<N>` or `auto-<date>` | `q1`, `auto-2026-09-15` |
| Compilation slug | `best-of-<type>-<date>` | `best-of-rhyme-2026-09-20` |

---

## Do's and Don'ts

✅ **Do:**
- Add to `queue.yml` to schedule upcoming videos
- Add to `config.json` `storySeeds` for more moral-story variety
- Add to `library/backgrounds/` for new settings
- Use `scripts/lib/universe.mjs` CLI to record manual renders
- Run `node scripts/check-character-designs.mjs` after any character recipe edit

❌ **Don't:**
- Delete or rename existing `scripts/*.json` entries
- Write `universe.json` directly (always use the helper)
- Add characters to `cast.json` without project owner approval
- Rename existing backgrounds (existing scripts reference them by name)
- Set `"autopilot": false` in `config.json` unless intentionally pausing the channel
