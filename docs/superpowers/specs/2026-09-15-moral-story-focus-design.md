# Moral-story focus design

## Goal

Make scheduled production create only strong, simple preschool stories with one clear moral, while preserving the dormant rhyme/template machinery and every existing library record. Give narration a distinct, natural, enthusiastic local voice without adding a service or invalidating the voice cache.

## Story discovery

`library/config.json` owns a curated `storySeeds` array. Each seed has a stable `id`, one universal `moral`, and one small `problem` that can happen among the six Sunny Meadow cast members. Seeds cover sharing, honesty, patience, inclusion, apologizing and repair, perseverance, listening, gratitude, asking for help, responsibility, promises, and fair play.

`scripts/autopilot.mjs` never chooses a template. It filters valid seeds, counts prior use by the exact generated topic stored in `library/catalog.json`, chooses among the least-used seeds with the existing deterministic RNG, and pairs it with `leastStarred()`. This remains local, fast, free, and deterministic. The existing template generator stays callable manually and existing slugs remain rerunnable.

Pending template queue entries are retained in an inactive `pausedTemplates` collection. Historical/running entries remain data records but are not requeued or erased by later queue rewrites.

## Story writing

The existing single LLM call receives the selected moral/problem seed and the selected hero. Gemini remains the first provider when `GEMINI_API_KEY` exists. There is no separate ideation, ranking, or research call.

The story prompt requires one focused arc:

1. Open immediately with a concrete surprise, want, promise, or tiny problem.
2. Establish what the hero wants.
3. Let the hero try twice.
4. Ask the child about the meaningful choice.
5. Show a gentle consequence.
6. Let the hero understand and repair the problem.
7. End warmly, then state and chant the moral.

Stories use two or three members of the closed cast, short speakable sentences, gentle stakes, and narration written for lively speech. They do not insert unrelated counting, colors, songs, new species, or multiple lessons.

A pure structural check rejects output missing the moral, two-line chant, opening story beat, sufficient story scenes/lines, lesson/repair beat, or two usable questions. Failures use the existing correction loop; this is error recovery for the same script request, not a second content stage.

## Narration

Kokoro remains the default local TTS engine. Character dialogue keeps the configured main voice. Narrator lines use `NARRATOR_VOICE` when set and otherwise use the engine's strongest suitable energetic narrator default (`af_bella` for Kokoro). Edge and Gemini keep valid engine-specific defaults.

Voice selection is per utterance. The existing content-addressed cache key already includes the chosen voice, so narrator audio is cached independently and forever. Missing-voice planning must evaluate the same per-speaker voice choice used by synthesis. No cached file is deleted.

## Compatibility and safety

- Existing committed scripts and `--slug` reruns continue to work.
- Template modules and manual `--template` generation remain intact but are absent from automatic scheduling.
- No dependency, paid API, new AI stage, workflow, cache removal, or timeout increase is introduced.
- The Director remains mandatory and deterministic.
- Story scripts continue to be immutable once committed.

## Verification

Node tests cover least-used deterministic seed selection, story-only autopilot output, structural story rejection/acceptance, and per-speaker narrator voice/cache detection. Run the full Node test suite, TypeScript typecheck, and a dry autopilot invocation. Validate workflow YAML by inspection through the emitted values rather than performing a network call.
