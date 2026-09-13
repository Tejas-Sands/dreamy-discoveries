/** Calendar views and optional Turso mirror. Does not dispatch unapproved planning slots. */
import fs from 'node:fs';
import path from 'node:path';
import { loadDotEnv, parseArgs, OUT_DIR } from './lib/common.mjs';
import { getClient } from './lib/db.mjs';
import { readCalendar, readPublicationState, linkEpisode, saveCalendar, syncCalendarDb } from './lib/calendar.mjs';
loadDotEnv();
async function main() {
  const args=parseArgs();
  const plan=readCalendar(), state=readPublicationState();
  if(args.slug) {
    if(!fs.existsSync(path.join(OUT_DIR,`${args.slug}.mp4`))) throw new Error('Full episode MP4 is missing; cannot mark production ready');
    const entry=linkEpisode(plan,{slug:args.slug,scheduleId:args['schedule-id'] || process.env.SCHEDULE_ID,queueId:args['queue-id'] || process.env.QUEUE_ID,releaseUrl:args['release-url'] || process.env.RELEASE_URL});
    if(!entry) {console.log('[calendar] no linked slot; use --schedule-id to bind explicitly');return;}
    console.log(`[calendar] ${entry.schedule_id}: rendered, awaiting owner upload confirmation`);
  }
  const db=getClient();
  try { await syncCalendarDb(plan,state,db); saveCalendar(plan,state); }
  finally {db.close();}
  console.log(`[calendar] ${plan.entries.length} slots exported and mirrored to ${process.env.TURSO_URL ? 'Turso' : 'local SQLite'}`);
}
main().catch(error=>{console.error(`[calendar] ${error.message}`);process.exitCode=1;});
