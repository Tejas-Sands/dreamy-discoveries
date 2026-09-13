import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createClient } from '@libsql/client';
import { saveCalendar, syncCalendarDb, applyUploadUpdate, uploadKeyboard } from '../scripts/lib/calendar.mjs';

test('upload survives disk reload and repeated SQLite sync; undo is mirrored',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-calendar-'));
 const db=createClient({url:`file:${path.join(dir,'test.db')}`});
 const plan={entries:[{schedule_id:'slot',existing_slug:'episode',working_title:'Daisy',publish_at:'2026-09-14T18:00:00+05:30',status:'rendered'}]};
 const state={version:1,last_update_id:0,entries:{}};
 const update={update_id:42,callback_query:{id:'q',from:{id:1},message:{message_id:9,chat:{id:1}},data:uploadKeyboard('slot',false,'episode').inline_keyboard[0][0].callback_data}};
 try{
  applyUploadUpdate(plan,state,update,{chatId:'1',ownerId:'1'},'2026-09-14T12:30:00Z');
  const stateFile=path.join(dir,'publications.json');saveCalendar(plan,state,{dir,stateFile});
  const diskState=JSON.parse(fs.readFileSync(stateFile,'utf8'));
  const diskPlan=JSON.parse(fs.readFileSync(path.join(dir,'schedule.json'),'utf8'));
  assert.equal(diskState.last_update_id,42);assert.equal(diskPlan.entries[0].publication_status,'uploaded');
  await syncCalendarDb(diskPlan,diskState,db);await syncCalendarDb(diskPlan,diskState,db);
  let result=await db.execute('SELECT * FROM calendar_slots');assert.equal(result.rows.length,1);assert.equal(result.rows[0].publication_status,'uploaded');
  applyUploadUpdate(diskPlan,diskState,{...update,update_id:43,callback_query:{...update.callback_query,data:uploadKeyboard('slot',true,'episode').inline_keyboard[0][0].callback_data}},{chatId:'1',ownerId:'1'});
  await syncCalendarDb(diskPlan,diskState,db);
  result=await db.execute('SELECT * FROM calendar_slots');assert.equal(result.rows[0].publication_status,'ready');assert.equal(result.rows[0].uploaded_at,null);
 }finally{db.close();fs.rmSync(dir,{recursive:true,force:true});}
});
