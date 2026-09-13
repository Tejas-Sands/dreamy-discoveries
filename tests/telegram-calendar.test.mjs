import test from 'node:test';
import assert from 'node:assert/strict';
import { pollUploadUpdates, telegramOwner } from '../scripts/lib/telegram-calendar.mjs';
import { uploadKeyboard } from '../scripts/lib/calendar.mjs';
import { createTelegramClient } from '../scripts/lib/telegram-api.mjs';

const plan={entries:[{schedule_id:'slot-1',existing_slug:'episode',status:'rendered',working_title:'Episode'}]};
const update={update_id:1,callback_query:{id:'callback',from:{id:123},message:{chat:{id:123},message_id:5},data:uploadKeyboard('slot-1',false,'episode').inline_keyboard[0][0].callback_data}};
test('private chat owner is inferred; groups require explicit owner',()=>{
 assert.deepEqual(telegramOwner('123'),{chatId:'123',ownerId:'123'});
 assert.throws(()=>telegramOwner('-100123'),/OWNER/);
 assert.deepEqual(telegramOwner('-100123','456'),{chatId:'-100123',ownerId:'456'});
});
test('poll does not acknowledge newly fetched updates before persistence',async()=>{
 const calls=[];const state={version:1,last_update_id:0,entries:{}};
 const api=async(method,args)=>{calls.push([method,args]);return method==='getWebhookInfo'?{url:''}:[update];};
 const result=await pollUploadUpdates({api,plan,state,config:telegramOwner('123')});
 assert.equal(result.state.last_update_id,1);assert.equal(state.last_update_id,0);
 assert.deepEqual(calls.map(x=>x[0]),['getWebhookInfo','getUpdates']);
 assert.equal(calls[1][1].offset,1);
 assert.equal(result.notifications[0].uploaded,true);
});
test('existing webhook fails safely without deleting it',async()=>{
 await assert.rejects(pollUploadUpdates({api:async()=>({url:'https://existing.example'}),plan,state:{last_update_id:0,entries:{}},config:telegramOwner('123')}),/webhook/i);
});
test('API network errors never include the bot token',async()=>{
 const api=createTelegramClient('private-test-token',{fetchImpl:async()=>{throw new Error('URL https://api.telegram.org/botprivate-test-token/getUpdates');}});
 await assert.rejects(api('getUpdates',{}),e=>!String(e).includes('private-test-token'));
});

test('notification work survives a poll restart until delivery succeeds',async()=>{
 const state={version:1,last_update_id:0,entries:{}};
 const api=async method=>method==='getWebhookInfo'?{url:''}:[update];
 const first=await pollUploadUpdates({api,plan,state,config:telegramOwner('123')});
 assert.equal(first.state.pending_notifications.length,1);
 assert.equal(first.state.pending_notifications[0].messageId,5);
 assert.equal(first.state.pending_notifications[0].callbackId,undefined);
 const second=await pollUploadUpdates({api:async method=>method==='getWebhookInfo'?{url:''}:[],plan,state:first.state,config:telegramOwner('123')});
 assert.equal(second.state.pending_notifications.length,1);
});

test('failed button edits remain queued and succeed on a later delivery run',async()=>{
 const {deliverUploadNotifications}=await import('../scripts/lib/telegram-calendar.mjs');
 const api=async method=>method==='getWebhookInfo'?{url:''}:[update];
 const result=await pollUploadUpdates({api,plan,state:{version:1,last_update_id:0,entries:{}},config:telegramOwner('123')});
 let persisted=0;
 await assert.rejects(deliverUploadNotifications({api:async()=>{throw new Error('network unavailable');},plan,state:result.state,config:telegramOwner('123'),persist:async()=>{persisted++;}}));
 assert.equal(result.state.pending_notifications.length,1);assert.equal(persisted,0);
 const sent=[];
 await deliverUploadNotifications({api:async(method,args)=>{sent.push([method,args]);},plan,state:result.state,config:telegramOwner('123'),persist:async()=>{persisted++;}});
 assert.equal(result.state.pending_notifications.length,0);assert.equal(persisted,1);
 assert.match(sent[0][1].reply_markup.inline_keyboard[0][0].callback_data,/dd:undo:/);
});
