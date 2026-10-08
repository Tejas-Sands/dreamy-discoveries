# Remotion quality workflow

New scripts use `presentationVersion: 4`. Existing slugs keep their stored version: no automatic script migration, voice regeneration, or library rewrite.

Version 4 adds bounded, species-specific listener reactions; short caption pages with at most two measured rows and eight words; waveform-assisted word estimates; three deterministic story music moods; and two-pass mastering of the complete mix. Speech analysis estimates boundaries from nearby silence; it is not phoneme recognition. Edge word timings are retained. New Kokoro timing sidecars are additive, and their creation saves the Actions voice cache even when no synthesis was needed.

Caption measurements wait for the locally hosted Fredoka subsets. Font bytes and their license/source hashes are in `public/fonts/fredoka-v17/`. Direct Remotion packages are pinned together at 4.0.520. No additional AI service, paid compute, or runtime font download is introduced.

## Local review

Use an already voiced developer script, such as the existing animation preview. The command creates exclusive `dev-` slugs, copies its cached audio, runs the Director, and renders paired v3/v4 images and optional two-second motion clips. Walking/celebration variants reuse the same spoken words. A slug is never overwritten; use a new one for the next review.

```sh
npm run review:quality -- --source dev-animation-v3 --slug dev-quality-check --clips
npm run benchmark:render -- --slug dev-quality-check-v4 --frames 180-239 --scale 0.5 --runs 3 --concurrencies 1,2,4
```

Open `out/review/dev-quality-check/index.html`. The manifest identifies exact sampled frames. Benchmarks use production JPEG frame capture, record hardware/resolution, and report medians including browser startup and encoding, excluding bundling. These are local measurements, not predictions of GitHub runner speed.

## Rendering and validation

Install system FFmpeg and ffprobe locally. The workflow installs the free FFmpeg package in the audio and stitch jobs. Standard Ubuntu runners also provide it for media-fixture tests.

```sh
node scripts/render.mjs --slug EXISTING --scale 0.5
node scripts/verify-video.mjs --slug EXISTING
```

A full render, including one with `--out`, uses a temporary destination and validates before replacing the final MP4. Only `--frames` selects chunk mode. Full v4 renders and the independent CI audio job master the mix to a project target of -16 LUFS and -2 dBTP; the measured acceptance limits are ±1 LU and at most -1.5 dBTP. Silent input remains silent. Cached individual recordings are unchanged.

Chunk/audio renders write `.render.json` sidecars containing the script/source/static-asset identity, exact frame range, and media hash. Keep these with their corresponding media. Stitching rejects missing proofs, stale bytes/inputs, missing or misnumbered chunks, wrong frame counts/rates, incompatible dimensions/encoding, absent audio, duration mismatches, and decode failures. Old intermediate chunks without proofs must be re-rendered; cached voices remain reusable. Compilation concatenation retains source audio.

Verified outputs have `.verification.json` reports; v4 mixes also have `.loudness.json` reports. CI carries audio proof/loudness and chunk proof artifacts within the existing retention limits. No reports are published separately by this change.

## Background caching decision

Audio and render jobs remain parallel, with existing timeouts and every cache step retained. A new shared baking job would add a serial dependency without measured runner evidence, so it was not added. The existing background cache could freeze a partial subset under one immutable global key: later episodes could repeatedly bake missing backgrounds without saving them. Cache keys now include the sorted background set, with a source-version restore prefix to reuse earlier subsets. Each exact hit represents a complete episode set. Cold matrix jobs can still duplicate baking; benchmark on Actions before changing that topology.

## Verification record

The implementation plan and design are in `docs/superpowers/`. Local rendered comparisons, the short stitched episode, media/loudness reports, boundary comparison, and benchmark report are collected under `out/review/remotion-quality/` and the linked review directories. No Actions workflow, release, Telegram delivery, or paid service was triggered during implementation.

The October 8 integration check passed all 277 tests, TypeScript, and all 38
character recipes. A missing-font failure in the isolated character-chart preview
was reproduced and fixed by including the local fonts alongside its reference
image; the bear comparison then rendered successfully. A fresh 521-frame, 30 fps
local preview at 480×270 passed complete video/audio decoding and measured
-16.00 LUFS / -1.97 dBTP. All 824 checked permanent-script, voice, music, and SFX
files retained their hashes. These checks were local; GitHub runner performance
and external delivery were not tested.
