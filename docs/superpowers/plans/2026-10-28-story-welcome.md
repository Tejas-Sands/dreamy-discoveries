# Story welcome implementation plan

**Goal:** Implement the approved opening: Dreamy Discoveries logo and music, episode title, character greeting/setup, then story dialogue. Deliver a revised Rocky episode.

**Design and authorization:** The user approved the proposed opening in this conversation. Use the existing logo, sky artwork, local music and Kokoro voices. Add an explicit `opening: "welcome"` mode; existing `hook` and `title` episodes keep their timing. A 2.4-second logo leads the title/greeting, whose measured speech length determines when the story starts. No countdown over the greeting. New generated stories use this mode. Scheduled saved stories opt into a permanent `-welcome` revision, with `revisionOf` linking the original story; explicit old-slug reruns stay unchanged. Rocky's new greeting is “Hi friends, I'm Rocky! Today, we're getting ready for a balloon party!”

**Constraints:** No extra AI calls, paid services, dependencies, deleted caches, rewritten permanent scripts, longer workflow timeouts or artifact retention. Preserve all user thumbnail fixtures. Work in the provided checkout under the existing authorization; use temporary test workspaces for media checks. All commits use `[skip ci]`.

## Task 1: Opening policy, revision and timing

- [ ] Add failing behavioral tests for logo → complete greeting → story timing, long speech/vox, planner parity and unchanged legacy openings.
- [ ] Add deterministic welcome revisions to the Director; preserve the original story and synthesis identity. New generation defaults to welcome and prompts for a brief contextual greeting within the existing writing call.
- [ ] Add `plan --welcome` to create/reuse a new permanent revision, with collision checks; pin `revisionOf` in catalog/universe summaries so standby selection consumes the original story too.
- [ ] Add opt-in workflow input and enable it for scheduled stories. Preserve normal `--slug` reruns and all existing caches/limits. Test the production CLI and workflow argument paths.
- [ ] Run focused tests, watch failures before implementation, then verify the fixes.

## Task 2: Brand and title rendering

- [ ] Add failing component checks for the branded opening and greeting card, audio muting, and exclusive opening phases.
- [ ] Reuse existing brand artwork for the 2.4-second intro with a faded local musical signature. Schedule the title card afterwards; suppress the hook overlay/countdown for welcome episodes and keep the hero greeting visible.
- [ ] Start the episode music after the brand signature, and duck it under the greeting. Verify frame-stable rendering and no speech overlap.

## Task 3: Complete verification and revised episode

- [ ] Extend real rendering/stitching and Kokoro/cache smoke coverage to include welcome speech and opening phase boundaries.
- [ ] Run the full suite, TypeScript, real media smoke and real voice checks; inspect actual opening stills/clip.
- [ ] Request one independent final code review; resolve material findings.
- [ ] Create `rocky-balloon-party-11-welcome` through the Director, preserving original script/audio. Commit/push the reviewed change and revised script, verify hosted tests, and run the existing video workflow for the revised episode through release and Telegram.

## Review focus

Cached speech must retain its identity; revised scripts must never overwrite their sources; existing revision slugs must be reused safely; schedule retries must retain the revised slug; old hooks must still start at frame zero; measured long greetings/vox must finish before the story; logo music and scene score must not overlap; muted chunks must contain no audio; standby must not repeat a story after its revised version is released.

## Progress

- Investigation confirmed the current Director, timing tests and renderer intentionally skip the greeting for `opening: "hook"`. The existing TitleCard and channel-logo artwork can be reused.
- Task 1 and 2: implemented after failing timing, revision, workflow and component regressions. The full updated suite passed 395 tests and TypeScript. Analytics had its own opening-offset calculation; a failing regression caught its 249-frame offset versus the correct 270, so it now shares the planner's intro estimate.
- Ruling: the legacy hook regression remains valid for explicit historical hooks. The new welcome has separate tests; changing all historical timing would violate permanent-script reruns.
- Real local Kokoro smoke passed five syntheses including the greeting, then zero on cache rerun. Rocky's actual greeting took 4.975 seconds, the story starts at 8.967 seconds, and only one new line was synthesized with 59 existing recordings reused. Rendering and independent review are underway.
- The actual 1s/4s/9.5s preview frames show the logo, visible title/greeting and story in order. Real render/audio/chunk/stitch smoke passed: 715 frames, -16.22 LUFS, -2.09 dBTP. Independent review found the rolling-object opening gate still required `hook`; a failing welcome regression reproduced it, and the narrow gate now also accepts `welcome`. The final full rerun passed all 396 tests and TypeScript. Reviewer verified 21 focused tests and no remaining material findings. Original Rocky scene values, voice identities and Director idempotence are preserved.
