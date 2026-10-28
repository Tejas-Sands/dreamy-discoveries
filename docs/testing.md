# Testing the studio

Use Node 22 (production) or Node 24, `npm ci`, and local `ffmpeg`/`ffprobe`.
All checks use the existing open-source dependencies. No API credentials,
publishing, or Telegram delivery are needed.

```bash
npm run verify           # All unit/regression tests, then TypeScript
npx remotion browser ensure
npm run test:integration # Real Chrome + Remotion + AAC + chunks + stitch
npm run test:tts         # Four real local Kokoro syntheses, then cached reruns
npm run verify:full      # All three layers in sequence
```

The first browser/model check can download the free browser or Kokoro weights.
The model lives in the existing `.cache/models` cache; subsequent checks reuse
it. These commands need permission to launch local subprocesses and Chrome.

## Coverage

The fast suite covers script/provider validation and outage handling, all eight
AI-free templates, the Director, the entire renderable cast, staging and animation,
speech routing and timings, permanent script reruns, queues, releases, delivery
failure recovery, and calendar storage. Media tests use real FFmpeg encodes and
decodes to check frame counts, rates, duration, stream presence, corrupt files,
color metadata, loudness, peaks, repeatability, and preservation of earlier output.

The render integration test runs production CLIs in a temporary copy of the
repository: load a permanent script, assemble genuine cached WAV recordings,
render mastered audio and two muted chunks, stitch the full timeline, render its
thumbnail, write metadata, and decode/verify the result. It checks stale audio and
missing chunks are rejected without replacing a verified output, then verifies
the legacy direct-AAC path. External fetches are blocked.

The Kokoro check starts with an empty temporary voice store. It synthesizes hero,
friend, narrator and goodbye lines with the actual CPU model, validates audible
24 kHz WAV output and speech timings, and verifies a second run synthesizes
nothing. Only public model download hosts are allowed. Both integration checks
remove API credentials from child environments, use temporary production history,
and leave permanent scripts and existing cached recordings untouched.

## CI

`.github/workflows/test.yml` runs on main pushes, pull requests and manual dispatch.
The fast suite and TypeScript run on Node 22 and 24; real rendering and local voice
checks run on Node 22 after those pass. Chrome, npm and Kokoro model caches are
retained. The daily video planner also retains its existing tests/typecheck gate.

All test, episode and compilation jobs share `.github/scripts/install-media.sh`.
It reuses installed tools/fonts and tries the runner's cached package indexes
first. Package downloads run with `--download-only`, with one Ubuntu-only index
refresh and one download retry. Only after downloads finish does a separate
`--no-download` install unpack and configure cached packages. Downloads and
installation each have a 60-second limit; refreshing indexes has a 30-second
limit. The worst case, including four five-second kill grace periods, is 230
seconds inside the unchanged four-minute setup step. Lock/network limits remain
15 seconds, logs stay visible, and package hooks run noninteractively.

Offline regressions exercise slow and timed-out downloads, interrupted package
state, stale indexes, refresh timeouts, persistent download failures, failed
unpacking, preinstalled tools, and the font-only/render setup paths. Failed
unpacking stops clearly; refreshing indexes cannot repair an interrupted dpkg
transaction.

The first hosted test run (`40500723099`) exposed this setup gap: Node 24 passed
all 374 tests, while Node 22's quiet package setup timed out before tests started.
Local test success alone did not establish hosted setup reliability. Follow-up
changes must be verified through completion on GitHub, including both smoke jobs.

In run `40668038554` on October 28, the voice, audio and both render jobs passed.
The stitch job spent nearly a minute downloading FFmpeg dependencies; the old
combined download/install timeout then killed dpkg during unpacking. Its index
refresh succeeded, but the retry failed with “dpkg was interrupted.” The earlier
setup doubles returned failed exits without modeling partial package state. The
slow-download regression now reproduces that exact failure against the old
setup and requires the download phase to finish before unpacking can start.

## The October 27 audio failure

In run `40479332004`, local voice generation succeeded. The AAC encoder reconstructed
peaks above the PCM normalization ceiling: the episode measured -16 LUFS but
-0.56 dBTP, exceeding the existing -1.5 dBTP acceptance limit. Changing encoders
alone had not prevented it. A steady sine-wave test did not expose transient ringing.

Mastering now measures the decoded AAC and makes at most three source encodes,
adjusting the limiter ceiling and compensating loudness when necessary. Each
attempt starts from the original WAV. The final -16 +/-1 LUFS and <= -1.5 dBTP
requirements still apply; invalid output never replaces an earlier file. Mono
transient and stereo fixtures exercise the actual codec, alongside the existing
busy voice/effect and silence tests. Loudness reports include the attempt count.

The cold-to-warm voice test also caught a rerun bug: cache metadata such as
`synthesis` was copied into each script line on cache hits. Cache assembly now
copies only the audio duration, word timings and speech envelope, so cold and
warm runs produce the same script content.

This suite catches the reproduced failures and tests the production boundaries;
it cannot guarantee that external downloads, GitHub, or delivery services will
never fail.
