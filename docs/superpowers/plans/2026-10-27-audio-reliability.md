# Audio reliability and pipeline tests

**Goal:** Fix the AAC true-peak failure in scheduled run 40479332004 and catch audio/pipeline regressions before daily production.

**Architecture:** Keep Node's built-in test runner and the existing pinned Remotion/FFmpeg dependencies. Measure decoded AAC, correct encoder overshoot with bounded re-encoding from the immutable source, and retain strict final loudness validation. Add real-media boundary tests and a small isolated pipeline smoke test; keep slow model/browser checks separate from unit tests.

**Constraints:** No paid services, no new AI stages, no changes to permanent scripts or cached recordings. Preserve reruns, all Actions caches, existing job timeout limits, and artifact retention limits. Work in the provided checkout, preserving the three pre-existing untracked thumbnail scripts.

## Tasks

- [x] Reproduce the production peak overshoot with a deterministic transient fixture and, if downloadable, the original voiced episode. Watch the regression fail before changing `scripts/lib/audio-master.mjs`.
- [x] Make mastering validate decoded AAC and correct overshoot within a bounded number of attempts; preserve the source and any prior output on errors. Test silence, short/transient/stereo audio, malformed analysis, repeatability, and failed output replacement.
- [x] Add a real Remotion pipeline smoke test in an isolated temporary workspace: directed script, cached speech assembly, audio, muted chunks, stitch, thumbnail/metadata, and decoded media validation. Add a separate real local Kokoro smoke check if practical with the cached model. Tests must not publish, deliver messages, or use API credentials.
- [x] Add push/pull-request CI and explicit npm verification commands, retaining the daily preflight checks and caches. Document fast, integration, and local model checks in `docs/testing.md`.
- [x] Run the full existing suite, TypeScript checks, new integration checks, and a separate final review. Verify the original episode locally when its artifacts are available.

## Review focus

AAC overshoot after normalization; too-short loudness windows; source/output preservation on failed encoding; stale or corrupt speech/media artifacts; frame/audio duration agreement through real rendering and stitching. External provider outages remain outside a deterministic offline suite's guarantee.

## Evidence and progress

- Production voice job succeeded; mastering failed with integrated loudness -16 LUFS and true peak -0.56 dBTP against the existing <= -1.5 dBTP limit. No TTS API failure occurred.
- Initial sandboxed tests could not spawn some media subprocesses (`EPERM`); the suite is being rerun with subprocess access before treating those as code defects.

- Added a second regression for cold/warm script consistency after the real Kokoro test exposed cache bookkeeping copied into script lines. The original cached WAVs and metadata are unchanged.
- Eight audio/mix tests passed, all eight template tests passed, and 18 voice tests passed. The full rerun passed 373 tests and TypeScript; a final run includes the added correction-exhaustion check.
- The complete real rendering/stitching smoke passed (524 frames, -16.27 LUFS, -2.03 dBTP). Real local Kokoro cold/warm checks passed (four CPU syntheses, then zero on rerun).
- Rebuilt the original episode mix locally: -16 LUFS, -1.91 dBTP. The old master also accepts this locally rebuilt mix, so the exact CI encoder result was not reproduced by the local full mix; the deterministic transient independently reproduces the old failure.
- Independent review found no remaining critical/important issues. Its environment-dependent fixture finding was fixed; the final smoke rerun explicitly selects Edge in the parent environment. Added and passed its suggested correction-exhaustion test, covering the three-encode cap and preservation of existing output after encoding starts.

- Final verification: `npm run verify` passed all 374 tests and TypeScript. The complete pipeline smoke passed again with Edge selected in the parent environment (524 frames, -16.27 LUFS, -2.03 dBTP, 221 seconds). The real Kokoro smoke passed four syntheses and a zero-synthesis rerun. Workflow YAML parses and `git diff --check` passes. GitHub-hosted jobs have not been run with these local changes.
