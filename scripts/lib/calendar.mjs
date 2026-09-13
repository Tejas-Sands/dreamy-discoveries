/** Calendar publication tracking. Rendering and human upload confirmation are separate. */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { ROOT } from './common.mjs';

export const PLAN_DIR = path.join(ROOT, 'library/planning/2026-q4');
export const STATE_FILE = path.join(ROOT, 'library/planning/publications.json');
export const emptyState = () => ({ version: 1, last_update_id: 0, entries: {}, pending_notifications: [] });
export const readCalendar = () => JSON.parse(fs.readFileSync(path.join(PLAN_DIR, 'schedule.json'), 'utf8'));
export const readPublicationState = () => fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : emptyState();
const ready = (entry) => entry.status === 'rendered' || entry.readiness === 'rendered_locally' || !!entry.release_url;

export function findSlot(plan, { slug, scheduleId, queueId } = {}) {
  const matches = plan.entries.filter(e => scheduleId ? e.schedule_id === scheduleId : (slug && e.existing_slug === slug) || (queueId && e.existing_queue_id === queueId));
  if (matches.length > 1) throw new Error('Ambiguous calendar mapping; supply an exact schedule ID');
  if (!matches.length && scheduleId) throw new Error(`Unknown calendar slot: ${scheduleId}`);
  const entry = matches[0] ?? null;
  if (entry?.existing_slug && slug && entry.existing_slug !== slug) throw new Error('Calendar slot is already bound to a different episode');
  return entry;
}

export function linkEpisode(plan, { slug, scheduleId, queueId, releaseUrl } = {}) {
  if (!slug || !/^[a-zA-Z0-9_-]+$/.test(slug)) throw new Error('A valid episode slug is required');
  const entry = findSlot(plan, {slug, scheduleId, queueId});
  if (!entry) return null;
  entry.existing_slug = slug;
  entry.status = 'rendered';
  entry.readiness = 'rendered_locally';
  if (releaseUrl) entry.release_url = releaseUrl;
  return entry;
}

export function publicationFor(entry, state) {
  const stored = state.entries[entry.schedule_id];
  if (stored && stored.slug !== entry.existing_slug) throw new Error(`Publication slug mismatch for ${entry.schedule_id}`);
  return stored ?? {slug: entry.existing_slug, publication_status: ready(entry) ? 'ready' : 'planned', uploaded_at: null};
}

const binding = slug => createHash('sha256').update(slug).digest('hex').slice(0,12);
export function uploadKeyboard(scheduleId, uploaded = false, slug) {
  if (!slug) throw new Error('An episode slug is required for the upload button');
  const data = `dd:${uploaded ? 'undo' : 'uploaded'}:${scheduleId}:${binding(slug)}`;
  if (Buffer.byteLength(data) > 64) throw new Error('Telegram callback data exceeds 64-byte length');
  return {inline_keyboard: [[{text: uploaded ? '↩ Undo upload confirmation' : '✅ Uploaded to YouTube', callback_data: data}]]};
}

/** No network or file writes: suitable for replay and fixture-based tests. */
export function applyUploadUpdate(plan, state, update, {chatId, ownerId}, now = new Date().toISOString()) {
  if (!Number.isSafeInteger(update.update_id) || update.update_id <= state.last_update_id) return null;
  state.last_update_id = update.update_id;
  const q = update.callback_query;
  if (!q || !ownerId || String(q.from?.id) !== String(ownerId) || String(q.message?.chat?.id) !== String(chatId)) return null;
  const match = /^dd:(uploaded|undo):([a-zA-Z0-9_-]+):([a-f0-9]{12})$/.exec(q.data ?? '');
  if (!match) return null;
  const [, action, scheduleId, digest] = match;
  const entry = plan.entries.find(e => e.schedule_id === scheduleId);
  const base = {callbackId:q.id, messageId:q.message.message_id, scheduleId, slug:entry?.existing_slug};
  if (!entry?.existing_slug || !ready(entry)) return {...base,error:true,text:'This calendar slot has no completed episode. Please check the calendar mapping.'};
  if (digest !== binding(entry.existing_slug)) return {...base,error:true,text:'This message belongs to a different episode. Use its current delivery message.'};
  const previous = publicationFor(entry, state);
  const uploaded = action === 'uploaded';
  state.entries[scheduleId] = {
    slug: entry.existing_slug,
    publication_status: uploaded ? 'uploaded' : 'ready',
    uploaded_at: uploaded ? previous.uploaded_at ?? now : null,
    confirmed_via: uploaded ? 'telegram' : null,
  };
  return {...base,uploaded,text:uploaded ? 'Uploaded — crossed off the calendar.' : 'Upload confirmation undone.', title:entry.working_title};
}

export function calendarRows(plan, state) {
  return plan.entries.map(entry => {
    const publication = publicationFor(entry, state);
    return {...entry, publication_status:publication.publication_status, uploaded_at:publication.uploaded_at ?? ''};
  });
}
const md = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\|/g,'&#124;').replace(/[\r\n]+/g,' ').replace(/([\\`*_~\[\]])/g,'\\$1');
export function calendarMarkdown(plan, state) {
  const rows = calendarRows(plan,state);
  return '# Dreamy Discoveries publishing calendar\n\n' +
    'English · ages 2–5 · upload status tracking; production slots still require approval.\n\n' +
    'Publication target: 18:00 IST. ✅ means the owner confirmed a YouTube upload; rendering alone never crosses off a slot. Telegram confirmations are checked about every five minutes when the workflow is enabled (Actions can be delayed).\n\n' +
    '| Publish date | Upload | Format | Episode / candidate | Hero | Gate |\n|---|---|---|---|---|---|\n' +
    rows.map(e => `| ${md(e.publish_date)} | ${e.publication_status === 'uploaded' ? '✅ Uploaded' : e.publication_status === 'ready' ? '⬜ Ready to upload' : '⬜ Planned'} | ${md(e.format)} | ${e.publication_status === 'uploaded' ? `~~${md(e.working_title)}~~` : md(e.working_title)} | ${md(e.cast_id)} | ${md(e.readiness)} |`).join('\n') + '\n';
}
export function calendarCsv(plan, state) {
  const rows=calendarRows(plan,state);
  const fields=[...new Set(rows.flatMap(Object.keys))];
  const cell=value => {
    const text=Array.isArray(value) || (value && typeof value === 'object') ? JSON.stringify(value) : String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g,'""')}"` : text;
  };
  return fields.map(cell).join(',')+'\n'+rows.map(row=>fields.map(key=>cell(row[key])).join(',')).join('\n')+'\n';
}
function atomicWrite(file, text) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temp=`${file}.${process.pid}.tmp`;
  fs.writeFileSync(temp,text);fs.renameSync(temp,file);
}
export function saveCalendar(plan, state, {dir=PLAN_DIR, stateFile=STATE_FILE}={}) {
  const projected={...plan,publication_tracking:'telegram_owner_confirmation',entries:calendarRows(plan,state)};
  atomicWrite(path.join(dir,'schedule.json'),JSON.stringify(projected,null,2)+'\n');
  atomicWrite(path.join(dir,'schedule.csv'),calendarCsv(plan,state));
  atomicWrite(path.join(dir,'CALENDAR.md'),calendarMarkdown(plan,state));
  // Cursor is written last. CI commits all files together before acknowledging Telegram.
  atomicWrite(stateFile,JSON.stringify(state,null,2)+'\n');
}

/** Optional mirror. The committed plan/publication files remain authoritative. */
export async function syncCalendarDb(plan, state, db) {
  await db.execute(`CREATE TABLE IF NOT EXISTS calendar_slots (
    schedule_id TEXT PRIMARY KEY, slug TEXT, publish_at TEXT, title TEXT,
    production_status TEXT, publication_status TEXT, uploaded_at TEXT,
    release_url TEXT, plan_json TEXT NOT NULL
  )`);
  const statements=calendarRows(plan,state).map(e=>({
    sql:`INSERT INTO calendar_slots VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(schedule_id) DO UPDATE SET slug=excluded.slug, publish_at=excluded.publish_at,
      title=excluded.title, production_status=excluded.production_status,
      publication_status=excluded.publication_status, uploaded_at=excluded.uploaded_at,
      release_url=excluded.release_url, plan_json=excluded.plan_json`,
    args:[e.schedule_id,e.existing_slug || null,e.publish_at ?? null,e.working_title,e.status,e.publication_status,e.uploaded_at || null,e.release_url || null,JSON.stringify(e)],
  }));
  if(statements.length) await db.batch(statements,'write');
}
