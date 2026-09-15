# Moral Story Focus Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make scheduled episodes story-only, select varied curated moral seeds, enforce a hook-led preschool story structure, and synthesize narrator lines with a distinct enthusiastic local voice.

**Architecture:** A pure story-planning helper selects the least-used configured seed and validates generated story structure. Autopilot feeds that seed into the existing one-call Gemini script path. The existing voice helper resolves a voice per speaker so planning and synthesis share identical cache behavior.

**Tech Stack:** Node.js 22 ES modules, Zod, YAML, Node's built-in test runner, GitHub Actions, Kokoro-82M.

**Spec:** `docs/superpowers/specs/2026-09-15-moral-story-focus-design.md`

## Global Constraints

- Use only free/local services and retain exactly one LLM content stage.
- Do not remove caches, cached files, existing scripts, template modules, or the `--slug` rerun path.
- Scheduled production emits only `type: story`; manual template generation remains compatible.
- Use only the six Sunny Meadow cast members.
- Keep workflow timeouts unchanged and bot commit messages suffixed with `[skip ci]`.

---

### Task 1: Curated moral seed selection

**Files:**
- Create: `scripts/lib/story-planner.mjs`
- Modify: `scripts/autopilot.mjs`
- Modify: `library/config.json`
- Test: `tests/story-planner.test.mjs`

**Interfaces:**
- Produces: `storyTopic(seed) -> string`, `pickStorySeed(seeds, episodes, random) -> seed`, and `storyQualityIssues(script, minutes) -> string[]`.
- Consumes: configured `{id, moral, problem}` seeds, catalog episode topics, and the existing seeded RNG callback.

- [ ] **Step 1: Write failing seed-selection tests**

Test literal fixtures proving malformed seeds are ignored, unused seeds win over used seeds, equal-use selection obeys the supplied deterministic random value, and `storyTopic()` includes one moral and one problem without naming a new character.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test tests/story-planner.test.mjs`

Expected: failure because `scripts/lib/story-planner.mjs` does not exist.

- [ ] **Step 3: Implement the pure selector and configure seeds**

Implement validation with ordinary array/string operations, count exact `storyTopic(seed)` matches in catalog episodes, restrict the candidate pool to the lowest count, and select `Math.floor(random() * pool.length)` safely. Replace `templateShare` and `topicBank` with a curated `storySeeds` array in `library/config.json`.

- [ ] **Step 4: Make autopilot story-only**

Remove template selection imports and branches from `scripts/autopilot.mjs`. For file and DB queue fallbacks, ignore queued template records and emit the selected story seed when no pending story exists. Default emitted type to `story`.

- [ ] **Step 5: Verify focused tests**

Run: `node --test tests/story-planner.test.mjs`

Expected: all seed-selection tests pass.

### Task 2: Hook-led story quality gate

**Files:**
- Modify: `scripts/lib/story-planner.mjs`
- Modify: `scripts/generate-script.mjs`
- Test: `tests/story-planner.test.mjs`

**Interfaces:**
- Consumes: parsed pre-Director script and requested minutes.
- Produces: an empty issue list for a structurally sound story or concrete correction messages for the existing LLM retry loop.

- [ ] **Step 1: Write failing quality tests**

Use hand-written story fixtures to prove rejection of missing morals, missing two-line chants, a question/intro before the first story beat, fewer than six story scenes, fewer than two usable questions, no lesson scene, and an undersized script. Prove one valid compact story produces no issues.

- [ ] **Step 2: Verify the tests fail for missing behavior**

Run: `node --test tests/story-planner.test.mjs`

Expected: assertions fail because `storyQualityIssues()` does not yet enforce the contract.

- [ ] **Step 3: Implement minimal structural checks**

Return readable issue strings without mutating the script. Require `type === "story"`, nonempty moral, exactly two chant lines, first scene kind `story`, at least six story scenes, at least one lesson scene, at least two question scenes with answer text and praise, and at least `Math.floor(minutes * 9)` spoken lines.

- [ ] **Step 4: Strengthen the one-call prompt and wire validation into retry**

Make story the CLI default. Replace the generic story outline with the approved seven-beat arc, hook requirement, one-moral limit, closed-cast focus, vocal punctuation guidance, and prohibition on unrelated learning filler. After Zod parsing, append structural issues to the thrown validation error so the existing retry asks for a corrected full script.

- [ ] **Step 5: Verify focused tests**

Run: `node --test tests/story-planner.test.mjs`

Expected: all story quality tests pass.

### Task 3: Distinct enthusiastic narrator voice

**Files:**
- Modify: `scripts/lib/voice.mjs`
- Modify: `scripts/generate-audio.mjs`
- Test: `tests/voice.test.mjs`

**Interfaces:**
- Produces: `voiceForSpeaker(settings, speaker) -> string` and speaker-aware `collectUtterances(script)` / `missingTexts(script, settings)`.
- Consumes: `{engine, voice, narratorVoice, ext}`, line speaker, and existing content-addressed store helpers.

- [ ] **Step 1: Write failing voice-routing tests**

Assert Kokoro defaults narrator to literal `af_bella`, character/friend lines retain `af_heart`, `NARRATOR_VOICE` overrides the narrator only, duplicate text spoken by narrator and character produces two utterances, and missing-cache detection checks hashes for each selected voice.

- [ ] **Step 2: Verify the tests fail**

Run: `node --test tests/voice.test.mjs`

Expected: failures because settings have no narrator voice and utterances are text-only.

- [ ] **Step 3: Implement per-speaker settings and cache planning**

Add engine-specific narrator defaults, validate them with the same rules as the main voice, return `narratorVoice`, and preserve `collectTexts()` for compatibility while using speaker-aware utterances in `missingTexts()`.

- [ ] **Step 4: Route synthesis by speaker**

Change `speak(text)` to `speak(text, speaker)`, resolve the voice before the cache/map/hash lookup, pass it to the existing synthesizer, and tag intro/outro as character speech. Do not delete or rename any global cache asset.

- [ ] **Step 5: Verify focused tests**

Run: `node --test tests/voice.test.mjs`

Expected: all narrator-routing tests pass.

### Task 4: Pause songs and align scheduler defaults

**Files:**
- Modify: `library/queue.yml`
- Modify: `.github/workflows/make-video.yml`
- Modify: `.github/workflows/schedule.yml`
- Modify: `scripts/queue.mjs`

**Interfaces:**
- Scheduled queue/autopilot output passed to reusable make-video workflow as a story topic, hero, minutes, and queue id.

- [ ] **Step 1: Preserve inactive template queue records as comments**

Keep the three existing records verbatim under a `Paused template episodes` comment block and leave `items: []` as the active queue.

- [ ] **Step 2: Default all topic-based entry points to story**

Set queue output/add defaults, manual workflow type, reusable workflow type, and shell fallback to `story`. Keep template inputs and template execution branches available only for explicit manual use.

- [ ] **Step 3: Update scheduler comments and story-only wiring**

Describe automatic moral-story behavior and retain compatible blank template output without selecting it.

- [ ] **Step 4: Exercise local behavior**

Run: `node scripts/queue.mjs list`

Expected: no active queued template episode.

Run: `node scripts/autopilot.mjs`

Expected: JSON with nonempty `topic`, empty `template`, and `type: "story"`.

### Task 5: Full verification

**Files:**
- Modify only if a verification failure exposes an in-scope defect.

- [ ] **Step 1: Run focused tests together**

Run: `node --test tests/story-planner.test.mjs tests/voice.test.mjs`

Expected: zero failures.

- [ ] **Step 2: Run the full Node test suite**

Run: `node --test tests/*.test.mjs`

Expected: zero failures.

- [ ] **Step 3: Run TypeScript validation**

Run: `npm run typecheck`

Expected: exit code 0.

- [ ] **Step 4: Inspect change boundaries**

Run: `git diff --check && git status --short && git diff --stat`

Expected: no whitespace errors; only the approved story, scheduler, narrator, tests, and docs files changed.
