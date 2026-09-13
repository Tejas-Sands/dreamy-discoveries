import test from 'node:test';
import assert from 'node:assert/strict';
import { applyUploadUpdate, calendarMarkdown, calendarCsv, linkEpisode, uploadKeyboard } from '../scripts/lib/calendar.mjs';

const plan = () => ({entries:[{schedule_id:'dd-2026-09-14',publish_date:'2026-09-14',format:'template',working_title:'Colors | With "Daisy"!',cast_id:'daisy',status:'rendered',readiness:'rendered_locally',existing_slug:'colors-daisy',existing_queue_id:'q1'}]});
const state = () => ({version:1,last_update_id:0,entries:{}});
const config = {chatId:'123',ownerId:'123'};
const update = (id=10, action='uploaded', from=123, chat=123) => ({update_id:id,callback_query:{id:`cb${id}`,from:{id:from},data:uploadKeyboard('dd-2026-09-14',action==='undo','colors-daisy').inline_keyboard[0][0].callback_data,message:{message_id:77,chat:{id:chat}}}});

test('only owner confirmation crosses off the matching episode, preserving production status',()=>{
 const p=plan(),s=state(); const result=applyUploadUpdate(p,s,update(),config,'2026-09-15T10:00:00Z');
 assert.equal(s.entries['dd-2026-09-14'].publication_status,'uploaded');
 assert.equal(s.entries['dd-2026-09-14'].uploaded_at,'2026-09-15T10:00:00Z');
 assert.equal(p.entries[0].status,'rendered');
 assert.match(calendarMarkdown(p,s),/~~Colors/);
 assert.equal(result.scheduleId,'dd-2026-09-14');
});
test('duplicate updates and duplicate clicks preserve the first upload timestamp',()=>{
 const p=plan(),s=state();applyUploadUpdate(p,s,update(),config,'2026-09-15T10:00:00Z');
 assert.equal(applyUploadUpdate(p,s,update(),config,'later'),null);
 applyUploadUpdate(p,s,update(11),config,'2026-09-16T10:00:00Z');
 assert.equal(s.entries['dd-2026-09-14'].uploaded_at,'2026-09-15T10:00:00Z');
});
test('unauthorized chat and group member cannot mark an upload',()=>{
 for(const u of [update(1,'uploaded',999),update(2,'uploaded',123,999)]){
 const s=state();assert.equal(applyUploadUpdate(plan(),s,u,config),null);assert.deepEqual(s.entries,{});
 }
});
test('undo restores ready state and repeated rendering cannot undo publication',()=>{
 const p=plan(),s=state();applyUploadUpdate(p,s,update(),config);
 linkEpisode(p,{slug:'colors-daisy',queueId:'q1'});
 assert.equal(s.entries['dd-2026-09-14'].publication_status,'uploaded');
 applyUploadUpdate(p,s,update(11,'undo'),config);
 assert.equal(s.entries['dd-2026-09-14'].publication_status,'ready');
 assert.equal(s.entries['dd-2026-09-14'].uploaded_at,null);
 assert.doesNotMatch(calendarMarkdown(p,s),/~~Colors/);
});
test('unknown slots, malformed actions, unrendered and unbound episodes cannot be confirmed',()=>{
 for(const change of [p=>p.entries=[],p=>p.entries[0].existing_slug='',p=>{p.entries[0].status='planned';p.entries[0].readiness='existing_template';}]){
 const p=plan(),s=state();change(p);const result=applyUploadUpdate(p,s,update(),config);
 assert.deepEqual(s.entries,{});assert.equal(result.error,true);
 }
 const u=update();u.callback_query.data='dd:delete:dd-2026-09-14';const s=state();assert.equal(applyUploadUpdate(plan(),s,u,config),null);
});
test('linking requires an exact unique schedule, slug, or queue mapping',()=>{
 const p=plan();assert.throws(()=>linkEpisode(p,{slug:'different',scheduleId:'dd-2026-09-14'}),/different|bound/);
 const fresh=plan();fresh.entries[0].existing_slug='';linkEpisode(fresh,{slug:'new-episode',queueId:'q1'});
 assert.equal(fresh.entries[0].existing_slug,'new-episode');
 assert.equal(linkEpisode(plan(),{slug:'unrelated'}),null);
 const ambiguous=plan();ambiguous.entries.push({...ambiguous.entries[0],schedule_id:'second'});
 assert.throws(()=>linkEpisode(ambiguous,{slug:'colors-daisy'}),/ambiguous/i);
});
test('CSV preserves quotes and arrays, Markdown escapes pipes; buttons fit Telegram limit',()=>{
 const p=plan(),s=state();p.entries[0].source_ids=['a','b'];
 assert.match(calendarCsv(p,s),/"Colors \| With ""Daisy""!"/);
 assert.match(calendarCsv(p,s),/"\[""a"",""b""\]"/);
 assert.match(calendarMarkdown(p,s),/Colors \\&#124;|Colors &#124;/);
 const keyboard=uploadKeyboard('dd-2026-09-14',false,'colors-daisy');assert.match(keyboard.inline_keyboard[0][0].callback_data,/^dd:uploaded:dd-2026-09-14:[a-f0-9]{12}$/);
 assert.throws(()=>uploadKeyboard('x'.repeat(70),false,'colors-daisy'),/64|length/);
});

test('old delivered button cannot confirm a replacement slug in the same slot',()=>{
 const p=plan(),s=state();const data=uploadKeyboard('dd-2026-09-14',false,'colors-daisy').inline_keyboard[0][0].callback_data;
 p.entries[0].existing_slug='replacement';const u=update();u.callback_query.data=data;
 const result=applyUploadUpdate(p,s,u,config);assert.equal(result.error,true);assert.deepEqual(s.entries,{});
});
