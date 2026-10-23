# Dreamy Discoveries quality audit — 23 October 2026

This audit reviews the full path from authored story to the file the human watches
and uploads. It builds on the approved global color grade and object-surface
contact fixes. The scope is 18 concrete improvements, all scheduled for this
implementation pass. No paid services, additional AI stages, cache deletion,
permanent-script rewrites, or higher workflow timeouts are needed.

## Evidence and priorities

Evidence comes from source inspection, in-memory probes of the 131 current script
files, rendered/SSR components, actual bundled recordings, installed Remotion code,
and mocked local release/delivery commands. These are engineering and presentation
findings; they do not establish a change in audience retention or channel growth.

YouTube's quality principles emphasize coherent stories, clear audio, accurate
learning and complete resolutions. That supports prioritizing readable moral
endings, correct speaker/counting behavior and intelligible audio. This ordering
is our engineering judgment, not a measured ranking from YouTube analytics.
[YouTube children's-content principles](https://support.google.com/youtube/answer/10774223?hl=en-GB).

| ID | Priority | Area | Improvement and expected result |
|---|---|---|---|
| 01 | High | Moral ending | Make both chant lines visible, animated and readable. |
| 02 | High | Answer integrity | Preserve complete answer text rather than cutting it at character 24. |
| 03 | Medium | Answer layout | Fit and wrap answer cards inside their available area. |
| 04 | High | Cast identity | Keep named dialogue attached to its intended character and voice. |
| 05 | High | Learning accuracy | Stop numeric comparisons becoming incorrect counting animations. |
| 06 | Medium | Bedtime tone | Let lullabies finish without the celebration fanfare and confetti. |
| 07 | High | Mix clarity | Add premix headroom so loudness mastering receives unclipped audio. |
| 08 | High | Reaction timing | Reserve actual recording durations and matching ducking intervals. |
| 09 | Medium | Reproducibility | Pin reaction choices so local libraries and later additions cannot reshuffle them. |
| 10 | Medium | Audio export | Master local episodes from lossless audio, matching CI. |
| 11 | Medium | Voice planning | Reject unavailable Kokoro voices before model startup and retries. |
| 12 | High | Production history | Keep old render artifacts from replacing newer catalog/queue/universe state. |
| 13 | High | Compilations | Publish compilations without trying to load a nonexistent episode script. |
| 14 | High | Delivery recovery | Keep released episodes retryable when Telegram delivery fails. |
| 15 | Medium | Durable assets | Upload the actual per-episode script filename and support older release names. |
| 16 | High | Literal titles | Pass compilation titles as data, preserving quotes and shell characters. |
| 17 | Medium | Compilation continuity | Cache separate first/next bumper labels for reordered episodes. |
| 18 | Medium | Exported colors | Use explicit BT.709 HD encoding and verify compatible chunk color metadata. |

## Detailed findings and implementation requirements

### 01 — The first moral chant line never appears

`src/components/MoralChant.tsx` samples its entrance spring at `index * 6`, not
the current time. The first line is consequently stuck at opacity zero for the
whole scene; the second retains an unfinished entrance position. The card spring
also stays at frame zero. The chant has no deliberate font size, so it inherits
the browser's small default. Probes found 162 upbeat moral scenes in the current
library that use this path.

Use the scene clock for staggered entrances and the card spring. Give the banner
bounded width and large, intentional typography. Verify both lines after one
second, frame-seek determinism and readable long rhymes. Speech, scripts and
episode duration stay unchanged.

### 02 — Answer text is damaged before rendering

Director normalization calls `answer.text.trim().slice(0, 24)`. Existing results
include “Make a simple meeting pl” and “No, it is Buster’s shado”. Layout should
solve the space problem instead of removing part of a word.

Preserve complete trimmed answer text in new directing results. New input is
validated at 120 characters in both the local and provider schemas; labels are
never shortened to fit. Existing committed truncations
cannot be reconstructed reliably; this pass will not invent replacement text or
rewrite permanent scripts. Test full-answer preservation and Director idempotence.

### 03 — Answer cards do not fit long labels reliably

`Question.tsx` uses fixed 88–140px text and `whiteSpace: nowrap` without fitting
the label to its 780px parent. Bundled Fredoka measurements found 94 existing
answers wider than that card geometry before compact scaling. Single-character
scenes and future longer answers are especially exposed.

Add deterministic bounded wrapping/fitting with complete text, including long
tokens. Test compact and normal compositions, numeric answers, emoji, and long
phrases; inspect representative rendered cards rather than only arithmetic.

### 04 — Named dialogue can migrate to the wrong actor

The Director's speaker normalizer accepts only `character`, `friend` and
`narrator`, while the renderer and voice planner support cast IDs. A bunny/bear
scene with `speaker: ben` can become Taffy's dialogue. This affects mouth motion,
expressions and voice identity together.

Preserve or resolve valid onstage names/aliases before the generic fallback.
Keep narrator behavior and unknown-speaker fallback explicit. Test named hero,
named friend, aliases, unavailable speakers and repeated directing.

### 05 — Numeric comparisons become misleading counting lessons

Automatic inference accepts ascending numeric pairs such as “three throws ...
four”. `Callout.countTimes` then uses token positions, showing one object at
“three” and two at “four”. An existing Fiona story reproduces this. A lullaby
line beginning with four/five has the same problem.

Infer automatic counting only from an unambiguous 1…n enumeration. When a count
callout is explicitly authored, use actual number values for its timing. Keep
comparisons as dialogue. Test words, digits, enumerations starting above one,
missing timings and intentional authored callouts.

### 06 — The lullaby goodbye contains a celebration

`Cards.tsx` already recognizes sleepy endings and suppresses later celebrations,
yet its first 60-piece confetti burst and loud `tada` remain unconditional.

Apply the existing sleepy policy consistently to the initial burst, fanfare and
all-stars celebration. Preserve the goodbye, duration and ordinary upbeat ending.
Verify the actual rendered sleepy and ordinary end cards.

### 07 — Clipping occurs before the final loudness pass

Installed Remotion sums tracks without normalization and writes an intermediate
PCM16 mix. Actual cached voice plus its scheduled effect in `sample-share`
peaks at 1.4158, with 47 over-full-scale samples, even before music. A v4 review
fixture also exceeds full scale. Later loudness normalization cannot restore
flattened samples.

Use one shared premix gain across voice, music, effects, reactions and the brand
signature for mastered v4 episodes. A conservative common gain preserves the
relative mix, and existing final mastering restores delivery loudness. Keep
legacy gain behavior where mastering is not used. Test a real busy cue mix,
provider/wrapper propagation, silence, cache immutability and final peak/loudness.

### 08 — Reaction clips outlive their reserved slots

The Director budgets .9 seconds before speech and .8 after it, capped at two
cues. Bundled laugh recordings are 1.18–2.501 seconds. One committed Ben cue
extends 45 frames beyond its slot and 54 beyond the scheduled music-duck interval.
Three cues expose the reservation cap as well.

Plan from the selected recording durations and the actual inter-cue/anchor gaps.
Share those facts between playback, frame estimation, scene boundaries and music
ducking. Budget them before the plan job emits chunks. Test start/end/multiple
clips, missing assets, timing parity and reaction tails at scene boundaries.

### 09 — Reaction choices are unstable across machines

Selection currently uses a modulo over the current registry, which can contain
licensed local recordings absent from CI. In this workspace, local additions
change 57 of 82 committed scene-cue choices compared with the public-only pool.
Adding a public recording can reshuffle choices too.

Pin selected public file and measured duration in newly planned cue metadata.
Preserve explicit valid pins and keep local-only variants explicit. Verify that
library growth and local recordings cannot change a pinned episode's selection
or schedule. Preserve old files and existing voice hashes.

### 10 — Local mastering encodes AAC twice

The local v4 path renders an MP4 with AAC, decodes it for mastering, then encodes
AAC again. The CI audio job already starts from lossless WAV.

Use lossless audio for local mastering as well, render video separately/muted,
and mux the final AAC with stream-copied video. Reuse the existing audio-only
path and verification. Test that mastering receives PCM and that failed output
preserves the previous verified MP4.

### 11 — Invalid voices fail too late

Voice settings accept a syntactically plausible `zz_missing` voice which the
installed Kokoro model does not provide. The failure is deferred until synthesis,
after model loading and retries.

Check new assignments against installed voice metadata without model inference
or network access. Preserve supported pinned assignments and cache identities.
Test invalid names and every existing cast assignment.

### 12 — Old artifacts can roll production history backwards

The plan/voice artifact includes all of `library/`. Stitch checks out the latest
branch, overlays that older snapshot and later commits it. A newer catalog,
calendar, queue or universe update made during the render can disappear. A local
temporary-directory reproduction reduced a newer catalog from one episode to zero.

Transfer only immutable episode inputs, not mutable production history. Keep
the latest checkout's catalog, queue, calendar and universe, and update them
through existing helpers. Retain every Actions cache and current timeout. Test
artifact restoration against a checkout containing newer history.

### 13 — Compilation publishing fails after asset upload

The publisher unconditionally calls `recordStory(compilationSlug)`, which first
loads an episode script that compilations do not create. A mocked local upload
succeeds and the command then exits with a missing-script error.

Keep episode release recording through `recordStory`; compilation recording
belongs in the existing compilation catalog workflow. Preserve missing-script
validation for real episodes. Test both paths using local mocked `gh` commands.

### 14 — Telegram failure can consume the queue entry

The release-success catalog step also marks the queue done even when delivery
failed. Recovery then refuses to retry a done item. The published video exists,
but automatic human review delivery can be lost.

Persist release/catalog progress independently and complete the queue only after
successful delivery. Retain the saved slug on delivery failure. Test release
success plus delivery failure, normal success and later retry.

### 15 — Script asset labels are mistaken for filenames

`gh release upload script.json#slug.script.json` sets a display label, not the
asset's actual filename. Compilation downloads request the latter. A library
fallback can hide the failure but lose the final measured post-voice script.

Upload a temporary file actually named `<slug>.script.json`, preserving the
source. Support legacy releases named `script.json`. Test actual uploaded
basenames, modern/legacy downloads and failed-download cleanup.

### 16 — Compilation titles are expanded as shell code

The compilation workflow interpolates an output directly into a shell command.
A harmless title such as `Bedtime $5 Stories` already changes its literal text;
quotes and command substitutions create more serious command ambiguity.

Pass the value through an environment variable and quote the variable. Test
literal quotes, dollar signs, backticks and newlines with a mocked publisher.
No external publication is needed for this check.

### 17 — Bumper caches ignore position-dependent labels

The cache filename identifies only the episode, while rendering also depends on
whether it says “First up!” or “Next up!”. Reordering episodes can reuse the wrong
label partway through a compilation.

Include the label identity in the cache key and preserve existing cached files.
Test compiling `a,b` and then `b,a`; unchanged label variants should remain reusable.

### 18 — Export color interpretation is implicit

The installed Remotion version defaults to BT.601-compatible behavior, while our
output is HD SDR. YouTube recommends BT.709 for SDR uploads. Set encoding
explicitly rather than depending on unspecified matrix/primaries metadata.
[YouTube upload encoding guidance](https://support.google.com/youtube/answer/1722171?hl=en).

Apply BT.709 consistently to CLI and programmatic renders, record color metadata
in verification and reject incompatible chunk color characteristics. Keep JPEG
frame capture for the established CPU/storage budget, while accounting for its
full-range BT.601 input during conversion. An actual installed-renderer probe
found that its default BT.709 JPEG filter forces the wrong input matrix, shifting
one sampled RGB value from [229,169,161] to [235,174,161]. The shared export policy
must correct that conversion rather than simply relabeling the output.
JPEG frames also carry unspecified primaries/transfer attributes that override
the encoder flags. The corrected filter explicitly annotates the intended SDR
BT.709 primaries and transfer, and verifies them on both the encoded stream and
decoded frames. The RGB round-trip probe now gives [229,168,161], within one
channel level of its source.
Remotion recommends PNG
for maximum color accuracy; optional lossless export can be investigated later
with measurements rather than increasing daily-render cost blindly.
[Remotion color-space guidance](https://www.remotion.dev/docs/options/color-space).

## Existing strengths retained

- The global grade, 38-character design library and surface contacts are already implemented.
- Cached local Kokoro voices, measured mouth envelopes, timing sidecars, music ducking,
  scene motifs and final two-pass loudness mastering are already present.
- Caption pagination already bounds modern captions to two rows and eight words.
- Release proofs, frame/rate validation, full decoding and atomic final video replacement
  already protect the normal stitch path.
- Made-for-kids reminders already default to addressing parents without a bell;
  no interactive end-screen system is proposed. YouTube does not display end
  screens on videos marked made for kids.
  [YouTube end-screen guidance](https://support.google.com/youtube/answer/6388789?hl=en).
- Current thumbnails meet supported image/aspect formats. We will not spend more
  render time on a 4K default without a demonstrated benefit. Current official
  guidance recommends larger thumbnails but also has device-dependent upload
  limits, including a 2 MB mobile video-thumbnail limit.
  [YouTube thumbnail guidance](https://support.google.com/youtube/answer/72431?hl=en-GB).

## Verification record

### Implementation map

All changes use the existing deterministic Node/React/Remotion/FFmpeg stack.
The new test files exercise the observed failures, including real PCM samples,
actual small FFmpeg exports and isolated mocked release/delivery commands.

| IDs | Shared implementation | Regression evidence |
|---|---|---|
| 01 | `MoralChant.tsx`: elapsed-frame springs, staggered lines, 72px bounded banner. | `story-presentation.test.mjs`; production chant still. |
| 02 | `director.mjs`: complete trimmed answers; `script-schema.mjs`: 120-character input validation. | `director.test.mjs`, `question-layout.test.mjs`. |
| 03 | `answerLayout.ts`, `Question.tsx`: measured wrapping, token splitting, fitted font and emoji sizes. | Normal/compact SSR, Unicode and long-token layout checks; production answer still. |
| 04 | `director.mjs`: resolve valid onstage cast names and aliases before generic fallback. | Named hero/friend, alias, fallback and repeated-directing checks; existing Taffy/Ben recordings in reel. |
| 05 | `director.mjs`, `Callout.tsx`: unambiguous automatic enumeration and actual numeric-value timings. | Comparison, enumeration and sparse authored count tests. |
| 06 | `Cards.tsx`: apply sleepy policy to all confetti, fanfare and all-stars applause. | Sleepy/upbeat end-card SSR; production quiet-goodbye still. |
| 07 | `audioMix.tsx` plus every production audio component: common .25 v4 premix gain before mastering. | `audio-mix.test.mjs`: real unclipped busy mix, numeric/function volumes, silence, legacy gain and final loudness. |
| 08 | `vox.mjs`, `voxTiming.mjs`, `timing.ts`, `estimate.mjs`, `Vox.tsx`: measured slots and matching playback/ducking. | `reaction-plan.test.mjs`, timing and score tests, actual recorded reaction in reel. |
| 09 | Director pins public reaction file/duration before planning; explicit pins and silent pins survive catalog growth. | Local/public and expanded-catalog determinism tests; cached speech bytes stay unchanged. |
| 10 | `render.mjs`: shared lossless WAV rendering, muted intermediate video, mastered AAC and stream-copy mux. | `export-quality.test.mjs` plus existing failed-render/atomic-output tests. |
| 11 | `voice.mjs`: validate against installed Kokoro voice metadata before inference. | Invalid voices, all 38 designs, legacy assignments and cache-only rerun checks. |
| 12 | `make-video.yml`: transfer selected script and recipes, retaining latest mutable production history. | Snapshot overlay fixture preserves newer catalog, queue, calendar, standby and universe. |
| 13 | `publish-release.mjs`, `compile.yml`: explicit compilation publication, with episode validation retained. | Mock compilation publication succeeds without an episode script/universe mutation; incomplete episodes fail early. |
| 14 | `make-video.yml`: persist release progress; finish queue only after successful delivery. | Release-success/delivery-failure/retry/success fixture. |
| 15 | `publish-release.mjs`, `compile.mjs`: actual per-slug upload filename, legacy download fallback, temporary-copy cleanup. | Asset basename/content checks, modern/legacy downloads and partial-download failure tests. |
| 16 | `compile.yml`, `compile.mjs`: environment-passed literal titles and delimiter-safe multiline outputs. | Quotes, dollar signs, backticks, command substitutions and newlines stay literal. |
| 17 | `compile.mjs`: separate `.first` and `.next` bumper cache variants. | Reorder `a,b` → `b,a` → `a,b`; reuse correct variants and preserve older cache files. |
| 18 | Shared export policy and config, all programmatic video callers, media verification and render identity. | Mixed chunk metadata rejection and actual encoded-color probes; final JPEG conversion verification recorded below. |

### Automated and independent verification

- Final full repository suite: **359 tests passed, zero failures**, including
  all four export regressions with the final JPEG primaries/transfer refinement.
  These verify stream/frame metadata, actual RGB preservation, CLI/API policy,
  incompatible chunks and the local lossless-mastering path.
- `npm run typecheck` and `git diff --check` passed.
- `node scripts/check-character-designs.mjs` checked all **38** character recipes,
  anatomy assignments and importer preservation.
- All **eight** AI-free templates passed seeded in-memory directing, a second
  identical directing pass and frame estimation.
- Independent review found the long-answer input/layout mismatch. Its 120-character
  guard was added with a failing regression first. A second independent review
  found no important correctness issues in the integrated story, audio, layout
  and pipeline changes. Separate actual-FFmpeg review found and verified the
  JPEG conversion/tagging refinements.

The release/delivery fixtures intercept network, `gh`, rendering and shell
boundaries in isolated temporary workspaces. The media fixtures use real local
FFmpeg with small synthetic clips and existing recorded speech/effects.

### Production-component review artifact

[Watch the 46.7-second review reel](../out/review/dev-studio-quality-final-2026-10-23/quality-reel.mp4)
or [open its still gallery](../out/review/dev-studio-quality-final-2026-10-23/index.html).
This uses the normal `Video` composition, existing recordings from `dev-animation-v3`
and `sample-share`, public reaction clips, and cached baked scenery. It is a review
montage rather than a newly authored episode. No script generation or TTS ran.

The reel shows Taffy/Ben dialogue and a pinned laugh, a complete wrapped answer,
both visible moral lines with spoken highlighting, the bedroom scene and a quiet
goodbye. The earlier shared grade and surface contacts remain active. Production
still frames were inspected, and a fresh full decode verified the final MP4:

| Check | Measured result |
|---|---|
| Frames / rate | 1,402 frames at 30 fps; 46.733 seconds of video. |
| Preview size | 960×540, H.264, yuv420p; production composition stays 1920×1080. |
| Color | Limited-range BT.709 matrix, primaries and transfer. |
| Audio | AAC at 48 kHz; −16.14 LUFS integrated, −2.00 dB true peak. |
| Premix | −14.95 dB true peak before mastering; no over-full-scale mix. |
| Source preservation | 143 permanent-script/source-recording files hash-checked unchanged. |
| Decode | Full video and audio decode passed. |

The final review started before the last JPEG frame-attribute annotation landed;
its already-correct encoded pixels received equivalent H.264 VUI tags by stream
copy, with no re-encoding. `color-tags.json` records that step. New renders annotate
the JPEG frames during their original encoding. `verification.json`, `loudness.json`
and `manifest.json` alongside the video retain the measurements and frame picks.

Four sampled pixels in the real moral scene differed from its PNG still by 2–4
RGB channel levels after JPEG/H.264 compression. This is sampled color evidence,
not a claim of lossless or pixel-identical video.

Reproduce the review without rewriting its script or recordings:

```sh
node scripts/preview-studio-quality.mjs --slug dev-studio-quality-final-2026-10-23 --scale 0.5 --concurrency 4
```

Use a fresh `dev-…` slug for a new study. Reusing the existing slug retains its
planned reaction pins and recorded script. The utility writes only development
output and temporary browser bundles; it does not update the episode library,
catalog, queue, universe or latest-slug pointer.

### Scope and retained state

All Actions cache configurations and job timeouts were compared with `HEAD` and
remain identical. Tracked permanent scripts, voice recordings, music, effects,
reaction assets and dependencies have no changes. Eight seeded, AI-free templates
were directed in memory twice each; all results were idempotent and estimated
successfully. There is no new AI stage, model inference, package or paid service.

Older encoded episode colors remain properties of those files; changing the
renderer cannot retroactively grade an existing MP4. A bundled-FFmpeg mixed
legacy/new compilation probe retained per-frame H.264 color information and
decoded both sampled segments to the same RGB values as their original files.
Consequently no speculative full-compilation conversion or cache deletion was
added. Episode chunks from one render still must share a consistent profile.

Permanent answers that were already truncated cannot be recovered reliably.
This implementation preserves future/full authored answers; it does not invent
missing words or rewrite committed episodes. Audience-retention benefits have
not been measured. No live Actions execution, release upload, Telegram message
or YouTube upload was performed.
