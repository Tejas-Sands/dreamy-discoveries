# Upload confirmation and full episode implementation plan

**Goal:** Render the complete current Daisy episode and let its owner cross off the publishing calendar from Telegram.

**Architecture:** Telegram inline callbacks are polled by a short, serialized GitHub Actions job. A committed publication-state JSON file is the durable source for callbacks and upload state; schedule JSON, CSV, Markdown and optional Turso table are synchronized views. Production completion and human upload confirmation remain separate. No hosted server or paid messaging service.

**Tech stack:** existing Node 22, native test runner/fetch, libSQL, GitHub Actions, Telegram Bot API.

## Tasks

- [x] Render saved Daisy slug at 1080p, preserve previous export, verify full decode/audio/thumbnail/metadata.
- [x] Test calendar transitions: ready vs uploaded, exact slot/slug mapping, duplicate callbacks, unauthorized clicks, undo, export escaping, persistence.
- [x] Implement calendar state and exports with optional parameterized Turso mirror; reject ambiguous mappings and unsupported callback data.
- [x] Add Telegram delivery buttons to video and link fallbacks; bound review-copy size and keep full-quality link.
- [x] Add callback polling with durable offset, replay-safe processing, failure recovery, owner checks, and no raw private payload persistence.
- [x] Wire workflow production mapping and a serialized 5-minute callback job. Persist changes with [skip ci], acknowledge updates only after commit, and fail visibly on configuration or persistence errors.
- [x] Verify tests/typecheck/workflow syntax, document setup and polling limits, attempt live delivery only when credentials are configured.

## Constraints

Keep scripts and voice caches permanent, six-character cast, free services, existing job timeouts and caches. Do not mark publication complete until the owner clicks. Never put secrets or Telegram user/chat IDs into public calendar files. Existing unrelated uncommitted work remains intact. Turso unavailability must not silently acknowledge unsaved confirmation.

Completed locally. Full render: 9374 frames, 1920×1080, 312.47 seconds. Tests: 15 passed; TypeScript and workflow structural checks passed. Review corrections cover durable notification retries, slot/slug binding, default-branch authority, queued concurrency, and stale artifact exclusion. Live delivery/Turso/GitHub activation intentionally deferred at the user’s request; no messages or uploads were recorded.
