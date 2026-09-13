# Receive an episode and cross it off from Telegram

The integration is implemented locally and deliberately not enabled. No Telegram messages have been sent and no calendar slot has been marked uploaded.

## Your daily flow

1. The existing production workflow renders an episode and creates its GitHub Release.
2. Telegram receives a review video, full-quality download link, thumbnail, and upload metadata. If necessary, the bot creates a smaller 720p review copy; the full 1080p file stays in the release. If even the review copy is too large, the message contains the download link and the same confirmation button.
3. You watch it and upload it to YouTube.
4. Tap **✅ Uploaded to YouTube** on that episode's message.
5. The next successful calendar workflow run crosses off that exact calendar slot and sends you a confirmation. The button changes to **↩ Undo upload confirmation**.

Confirmation is your declaration that the video was uploaded. It does not publish to YouTube, verify a YouTube URL, or claim that an upload is public rather than scheduled/private.

## Connect later

First commit and push the implementation to the default branch using an account with write access. The current session only has read access and has not pushed these changes.

Create a dedicated Telegram bot using BotFather and start a private chat with it. Using a dedicated bot avoids competing getUpdates consumers or an existing webhook. Configure repository **Actions secrets**:

| Secret | Required |
|---|---|
| `TELEGRAM_BOT_TOKEN` | Yes |
| `TELEGRAM_CHAT_ID` | Yes, numeric private chat/group ID |
| `TELEGRAM_OWNER_ID` | Required for groups/channels; optional for private chats, where the chat ID is the owner ID |
| `TURSO_URL` | Optional; leave absent to use the committed files and local SQLite mirror |
| `TURSO_AUTH_TOKEN` | Required if your configured Turso database requires authentication |

Never put secret values in calendar files, workflow YAML, or committed `.env.example`. For local use, put them in the ignored `.env`.

Run **Update upload calendar** manually once on the default branch using `workflow_dispatch`. Runs from other branches are skipped to keep one authoritative update cursor. After it succeeds, set the repository **variable** `TELEGRAM_CALENDAR_ENABLED` to `true`. The scheduled job is gated by this variable and remains disabled otherwise. Manual execution intentionally works without the variable for setup testing.

The workflow requests checks every five minutes. GitHub can delay scheduled jobs, so this is not an instant-response service. Telegram retains pending updates for up to 24 hours; if polling was disabled or broken that long, tap the button again after fixing it. Expired callback popups are harmless: the bot updates the button and sends a separate confirmation after the calendar commit succeeds. Only one poller may run for this bot. Do not run the local poller alongside the GitHub poller.

## Calendar and data

- `library/planning/2026-q4/schedule.json`: original editorial plan plus computed publication status.
- `library/planning/2026-q4/CALENDAR.md`: readable calendar; uploaded titles are crossed off.
- `library/planning/2026-q4/schedule.csv`: matching data export.
- `library/planning/publications.json`: durable upload state, processed Telegram update cursor, and pending confirmation notifications. It contains no bot token, Telegram chat/user ID, raw updates, or callback-query IDs. Pending notifications store only the bot message number and public episode/slot data.
- Turso/SQLite `calendar_slots`: synchronized view with schedule ID, slug, publication date, title, production status, publication status, upload-confirmation timestamp, release URL, and the full plan row as JSON.

Committed JSON files are authoritative. Do not edit the Turso mirror to mark an upload: the next sync will restore the committed state. Remote Turso failures fail the run before cursor persistence, so the confirmation can be retried. Local SQLite databases are ignored by Git; they are rebuilt from committed calendar files on CI.

`uploaded_at` records when a confirmation was processed, not a verified YouTube publication timestamp. `status` continues to describe production; `publication_status` is separately `planned`, `ready`, or `uploaded`. Undo clears the upload-confirmation timestamp without changing the rendered script or media.

## Link future episodes

Existing Ozzy and Daisy slugs already map to calendar slots. The three original YAML queue items also have exact IDs in the plan. The Make video workflow links those automatically after production.

For another calendar slot, supply the optional **schedule_id** input to **Make video**, e.g. `dd-2026-09-17`. The workflow binds the actual resulting slug to that slot. A slot already bound to another slug is rejected, and ambiguous queue/slug matches fail instead of guessing. Buttons include an episode-binding digest, so an old delivery message cannot confirm a replacement episode. An unrelated manual episode can still render and be delivered, but receives no calendar upload button until explicitly linked.

For an existing fully rendered local episode:

```sh
node scripts/calendar.mjs --slug colors-daisy-2026-09-14 --schedule-id dd-2026-09-14
node scripts/send-telegram.mjs --slug colors-daisy-2026-09-14 --release-url https://github.com/OWNER/REPO/releases/tag/video-colors-daisy-2026-09-14
```

Use a real release URL. With no remote release yet, local media remains available in `out/episodes/`; do not claim a full-quality remote download exists.

The planning calendar has **not** been turned into an automatic due-date dispatcher. Editorial, cultural, trend, and compilation gates still apply. This feature closes the render → review → human upload → calendar loop; it does not auto-approve all future topics.

## Verification and recovery

```sh
node --test tests/*.test.mjs
npm run typecheck
node scripts/calendar.mjs
```

For a deliberately local-only bot test: run `node scripts/telegram-calendar.mjs poll`, persist/commit the resulting calendar files, then run `node scripts/telegram-calendar.mjs notify`. Do not start another poll after a failed GitHub push: the workflow must first persist the cursor remotely. GitHub already enforces poll → commit/push → notify and serializes this job with the production stitch job using a shared lock and `queue: max`, so a new poll does not replace a pending stitch job. Planning/publication files are excluded from the earlier script artifact, so downloading it cannot replace newer upload confirmations.

If a push fails, the workflow fails visibly and leaves new Telegram updates unacknowledged for a later run. A callback replay is idempotent. If Telegram notification fails after the successful calendar commit, the calendar is still updated and the durable notification queue retries the button edit and message on a later run. If the runner dies after sending but before committing its acknowledgement, a duplicate confirmation message is possible; it cannot duplicate the upload record. After downtime longer than Telegram's retention period, click again rather than manually inventing an offset.

## Service references

- [Telegram Bot API: video uploads](https://core.telegram.org/bots/api#sendvideo): current cloud Bot API upload cap is 50 MB; local code keeps a margin and checks the actual review file size.
- [Telegram updates](https://core.telegram.org/bots/api#getupdates): offset acknowledgement and polling/webhook exclusivity.
- [Telegram inline keyboards](https://core.telegram.org/bots/api#inlinekeyboardbutton): callback data is limited to 64 bytes.
- [GitHub scheduled workflows](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule): schedules run on the default branch and may be delayed. Public repositories can have inactive scheduled workflows disabled after 60 days.

Telegram is sufficient for this workflow; WhatsApp is not required.

- [GitHub concurrency queues](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency): `queue: max` retains pending jobs instead of replacing them.
