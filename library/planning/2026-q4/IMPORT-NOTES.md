# Using this plan with Turso later

> Update: owner-confirmed upload tracking is now implemented in `scripts/calendar.mjs` and `scripts/telegram-calendar.mjs`, with a `calendar_slots` Turso/SQLite mirror. See [connection guide](../../../docs/telegram-upload-calendar.md). The original notes below describe the still-pending date-aware production dispatcher. Upload tracking does not bulk-approve or dispatch this plan.

This folder contains **planning data only**. No live database, queue, workflow, or episode script was changed by this research task. Import into a separate planning table first; do not bulk-insert all rows into today's active `queue`.

## Why a direct queue import is unsafe

The current schema in [`scripts/lib/db.mjs`](../../../scripts/lib/db.mjs) has an integer `queue.id`, non-null `topic`, `type`, `template`, `hero`, `status`, and `created_at`. It has no due date, expiry, seed, duration, title, stable external ID, or compilation dependencies.

[`scripts/autopilot.mjs`](../../../scripts/autopilot.mjs) selects pending rows by `id`, sets `processing`, and emits a subset of fields. [`schedule.yml`](../../../.github/workflows/schedule.yml) consumes the YAML queue first and invokes autopilot only when YAML is empty. The YAML queue uses `running`; a shared status lifecycle and database completion path still need to be connected. Merely adding `publish_at` data will not make dispatch date-aware.

## Data contract

`schedule.json` is the authoritative copy: metadata, a source registry, and `entries`. `schedule.csv` contains exactly the same entry fields; array-valued cells are JSON strings. Empty strings mean not applicable, not a missing topic to generate. Unproduced rows start `planned`, which deliberately does not match today's `pending` selector. Locally completed entries may be `rendered`; preserve that status and reuse their saved slug.

| Field | Meaning / future storage |
|---|---|
| `schedule_id` | Stable external TEXT key, unique; use this for idempotent import and linking. Never overwrite the integer queue ID with it. |
| `publish_date`, `publish_at` | Planned human upload slot. Offset timestamps use `+05:30`; 18:00 IST is a placeholder. Not the generation deadline. |
| `production_not_before` | Earliest planned workflow claim time, in UTC with `Z`. Normally 09:00 IST on the previous day. |
| `review_by` | Editorial review date, normally three days before production. Opening slots are reviewed on 12 September. |
| `expires_at` | Seasonal cutoff; blank for evergreen. Never silently produce an expired holiday title. |
| `priority` | Editorial integer: seasonal stories 80, other stories 60, baseline slots 50, unconfirmed flex 40. Not a model score or predicted view count. |
| `status` | Planning lifecycle; promote to `approved` only when gates pass. Future processing/retry/completion state should be tracked separately from actual YouTube publication. |
| `format` | Routing discriminator: `existing_episode`, `template`, `story`, `compilation`, `flex`. |
| `type`, `template`, `topic` | Current make-video inputs for resolved individual episodes. Template rows have `type=rhyme`, an existing template ID, and blank topic. Story rows have `type=story`, blank template, and a concrete brief. |
| `hero`, `cast_id` | `hero` is the renderer/template species key (e.g. `owl`), `cast_id` the cast identity (`ozzy`). Current template calls should receive `hero`, not the cast identity. |
| `minutes`, `seed` | Target duration and deterministic plan seed. Existing scheduled workflow does not forward seed; future integration must preserve it. Check measured audio length before rendering—target minutes do not guarantee runtime. |
| `working_title`, `search_query` | Editorial packaging and demand hypothesis. Neither is an existing workflow input. Publish the promised title only after the generated content is reviewed. |
| `readiness`, `notes`, `fallback` | Explicit release gates and action if unavailable. `existing_template` means the template exists, not that the episode is already approved. |
| `existing_queue_id` | Link to one of the three already queued YAML entries. Reconcile it rather than enqueueing the same episode twice. |
| `existing_slug` | Reuse a rendered/committed episode through its existing slug; no generation. |
| `source_schedule_ids` | JSON array of proposed earlier individual episodes for a compilation. Resolve to actual finished slugs and media; no guessed filenames. |
| `source_ids` | JSON array of keys in the JSON file's source registry. |
| `evidence`, `llm_calls_max` | Evidence class and maximum allowed script calls after resolution. Flexible slots must be resolved first; no AI is used to select visuals/music or to conduct an automatic trend poll. |

For a future planning table, use TEXT for IDs, dates, titles, notes, and JSON arrays; INTEGER for `priority`, `seed`, and `llm_calls_max`; REAL for `minutes`. Add a unique constraint on `schedule_id`. Import with parameterized values and insert-on-conflict-do-nothing semantics so a repeat import preserves manual edits and completed work. Handle later plan revisions explicitly rather than using replace-all writes. CSV can be staged as text, then numeric fields cast with validation. Preserve Unicode and embedded quotes.

## Dispatcher behavior to implement when connecting

1. Read the planning table, not both planning and YAML independently. Reconcile the three linked YAML entries first.
2. Claim **one** approved, due, unexpired slot atomically. Prefer earliest publication date, then descending priority, then stable ID. Convert timestamps to UTC instants for comparison; do not lexically compare mixed `Z` and `+05:30` strings.
3. Preserve the plan-to-queue/episode mapping. Use a unique claimed schedule ID to prevent two Actions runs from generating the same episode. Save the actual generated slug immediately and retry later stages with `--slug`.
4. Route `template`/`story` to the existing make-video workflow; route `compilation` to compile after checking sources. An `existing_episode` needs review/delivery/upload handling, not regeneration. A `flex` row has no executable brief until reviewed and resolved.
5. Require a configured free script provider for stories. The observed GitHub Models HTTP 410 failure is not repaired by this calendar. With no provider, use an approved distinct evergreen fallback or skip; do not run an empty prompt or enter a repeated failure loop.
6. Mark production complete only after its actual required artifacts exist. Track GitHub Release URL separately from the manually uploaded YouTube video ID and `published_at`. Preserve `[skip ci]` on library commits.
7. Do not drain a backlog of expired seasonal items. Retain each record, mark it expired/deferred, and replan its evergreen lesson under a new approved item. Do not delete cached media or overwrite committed scripts.
8. Feed performance back into the next weekly review. The existing analytics table is not a retention/time-series store; a later connection must distinguish known measurements from default zero values.

## Release gates

- `rendered_locally`: the referenced Ozzy episode exists; human viewing/upload remains.
- `existing_template`: generate, direct, voice, and review; the first baselines can use the current code.
- `novelty_review`: repeated format needs a meaningful new learning experience. Hero/seed changes alone do not qualify.
- `editorial_review`: verify body-part grammar/anatomy or animal-sound labels; this is not an instruction to ship existing inaccuracies.
- `free_llm_required`: one free script call available and the resulting story reviewed.
- `free_llm_and_visual_review`: same, plus required cultural framing/decorative visuals are accurate and present.
- `released_sources_required`: compilation candidates are actually finished and reviewed, coherent together, unexpired for this date, and not a duplicate compilation.
- `evidence_and_implementation_required`: dated trend evidence and a concrete supported format; otherwise fallback/skip.

Compilation targets are about 17 minutes, using three approximately 5.5-minute episodes plus bumpers, with no new script AI or episode re-rendering. Actual duration follows source files. One compilation replaces that day's individual upload; it is not an additional daily compute commitment.

The existing three YAML items and every existing library record remain intact. This folder is ready for schema-aware import work, **not plug-and-play execution by the current queue**.
