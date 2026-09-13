# AGENTS.md — `.github/workflows/`

Context: This directory holds the five GitHub Actions workflows that form the complete automated studio. Read the root `AGENTS.md` before making any changes here.

---

## Workflows at a Glance

| File | Trigger | Purpose |
|---|---|---|
| `make-video.yml` | Manual dispatch + `workflow_call` | End-to-end: plan → voice → render → stitch → release → Telegram |
| `schedule.yml` | Daily cron 09:00 IST + manual | Pop queue or autopilot → calls `make-video.yml` |
| `compile.yml` | Manual dispatch | Stitch finished episodes into a compilation; zero AI, zero re-rendering |
| `telegram-calendar.yml` | Manual; 5-minute cron gated by `TELEGRAM_CALENDAR_ENABLED` | Owner upload confirmations → calendar + optional Turso mirror |
| `assets.yml` | Push to `build-audio-assets.mjs` + manual | Rebuild music loops + SFX WAVs |

---

## `make-video.yml` — Job Architecture

```
plan (ubuntu-latest, 15 min)
  └─► voice (ubuntu-latest, 45 min)
        ├─► audio  (ubuntu-latest, 30 min)   — audio-only render
        └─► render (ubuntu-latest, 90 min)×N — muted video chunks (matrix)
              └─► stitch (ubuntu-latest, 30 min)
                    — concat + mux, release, Telegram, catalog commit
```

### Job outputs (plan → downstream)
- `slug` — the episode identifier (e.g. `counting-owl-2026-09-12`)
- `title` — human-readable title
- `voice_needed` — `"true"` if any TTS lines are missing from cache
- `chunk_count` — total number of render chunks
- `chunks` — JSON array `[1,2,3,…]` for the matrix strategy

### Inputs (workflow_dispatch / workflow_call)
| Input | Default | Notes |
|---|---|---|
| `topic` | blank | LLM prompt for rhyme/story |
| `type` | `rhyme` | `rhyme` or `story` |
| `template` | blank | AI-free template id |
| `hero` | blank | Cast id (auto if blank) |
| `slug` | blank | Re-run an existing script |
| `minutes` | `5.5` | Target video length |
| `voice` | blank | TTS voice override |
| `preview` | `false` | 540p fast preview instead of full render |
| `queue_id` | blank | Internal: set by `schedule.yml` |

---

## Editing Rules for Workflows

1. **Keep all `uses: actions/cache` steps.** Every one is load-bearing. The voice store alone saves 10–40 min per run.
2. **Always use `restore-keys`** on the voice cache so a run inherits all prior synthesized lines.
3. **`[skip ci]` on all bot commits** — the bot commits to `library/` in plan and stitch jobs. Without `[skip ci]` every commit re-triggers the workflow.
4. **Matrix strategy: `fail-fast: true`** — if one render chunk fails, cancel the rest immediately rather than wasting runner-minutes.
5. **Artifact `retention-days`**: chunks = 3 days, voiced/script = 7 days, final video = 14 days. Do not increase these; they consume GitHub storage.
6. **Never add `secrets: inherit`** to a job that doesn't need LLM or Telegram keys.
7. **Timeouts are hard limits**, not suggestions. If a job needs more time, split it rather than raising the timeout.
8. **The `audio` and `render` jobs are intentionally parallel.** Do not make `audio` depend on `render` or vice versa.

---

## Adding a New Workflow

Follow this checklist:
- [ ] Use `ubuntu-latest` (always free on public repos)
- [ ] Add `permissions: contents: write` only if the job commits back
- [ ] Add `cache: npm` to every `actions/setup-node@v4` step
- [ ] Add `timeout-minutes` to every job (max 90 for heavy jobs)
- [ ] If the job commits back to the repo, use retry loop: `for i in 1 2 3 4 5; do git pull --rebase && git push && break || sleep $((i * 5)); done`
- [ ] Test with `workflow_dispatch` before enabling any `schedule` trigger
- [ ] Add the workflow to the table at the top of this file

---

## Secrets Available in Workflows

```yaml
secrets.GROQ_API_KEY          # LLM script generation
secrets.GEMINI_API_KEY        # LLM fallback + Gemini TTS
secrets.OPENROUTER_API_KEY    # LLM fallback (free models)
secrets.TELEGRAM_BOT_TOKEN    # Delivery
secrets.TELEGRAM_CHAT_ID      # Delivery target
secrets.GITHUB_TOKEN          # Auto-provided; used for gh release create
```

Repository variables (set in repo Settings → Variables):
```yaml
vars.TTS_ENGINE    # kokoro (default) | edge | gemini
vars.TTS_SPEED     # 0.95 (default)
```

---

## Cache Keys Reference

| Cache name | Key pattern | Restore key |
|---|---|---|
| Voice store | `voice-<engine>-<run_id>` | `voice-<engine>-` |
| Kokoro model | `kokoro-82m-v1.0-q8` | (none — exact match) |
| Remotion/Chrome | `remotion-<pkg_hash>-<src_hash>` | `remotion-<pkg_hash>-` |
| Baked BGs | `baked-<bg_hash>` | (none — exact match) |

The 10 GB GitHub cache limit is shared across all branches. Baked BG PNGs are the least expensive to evict — they regenerate deterministically in ~2 min.

---

## Common Failure Modes

| Symptom | Likely cause | Fix |
|---|---|---|
| `plan` fails with "Give a topic, a template, or a slug" | All three inputs are blank | Dispatch again with at least one input |
| `voice` runs for >45 min | Cache miss on Kokoro model | Check `kokoro-82m-v1.0-q8` cache — may have been evicted |
| `render` chunk fails with font error | Missing `fonts-noto-color-emoji` | Verify the `apt-get install` step is present in the render job |
| `stitch` fails with "No chunks found" | A render chunk job failed | Re-run workflow with the same slug; chunks that passed won't re-render |
| Bot commit fails with "rejected" | Another workflow pushed simultaneously | The retry loop handles this; if it fails 5 times, re-run manually |
| Telegram delivery fails | Chat ID wrong or bot not in chat | Verify `TELEGRAM_CHAT_ID` and that the bot has send permissions |
