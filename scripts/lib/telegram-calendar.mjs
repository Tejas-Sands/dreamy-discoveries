import { applyUploadUpdate, publicationFor, uploadKeyboard } from './calendar.mjs';

export function telegramOwner(chatId, ownerId) {
  if (!/^-?\d+$/.test(String(chatId ?? ''))) throw new Error('TELEGRAM_CHAT_ID must be a numeric chat ID');
  const owner=ownerId || (Number(chatId)>0 ? chatId : '');
  if (!/^\d+$/.test(String(owner)) || Number(owner)<=0) throw new Error('TELEGRAM_OWNER_ID is required for a group/channel');
  return {chatId:String(chatId),ownerId:String(owner)};
}

export async function pollUploadUpdates({api,plan,state,config,now=new Date().toISOString()}) {
  const webhook=await api('getWebhookInfo');
  if (webhook.url) throw new Error('This bot has an active webhook; use a dedicated bot or remove its webhook explicitly before polling');
  // Only acknowledge offsets already persisted by an earlier successful run.
  const updates=await api('getUpdates',{offset:state.last_update_id+1,limit:100,timeout:0,allowed_updates:['callback_query']});
  const next=structuredClone(state);
  const notifications=[];
  next.pending_notifications ??= [];
  for (const update of [...updates].sort((a,b)=>a.update_id-b.update_id)) {
    const result=applyUploadUpdate(plan,next,update,config,now);
    if(result) {
      notifications.push(result);
      if(!result.error) {
        const {callbackId, ...durable}=result;
        next.pending_notifications=next.pending_notifications.filter(n=>n.messageId!==durable.messageId || n.scheduleId!==durable.scheduleId);
        next.pending_notifications.push({id:update.update_id,...durable});
      }
    }
  }
  return {state:next,notifications};
}

/** At-least-once notifications: keep failures durable so Undo remains recoverable. */
export async function deliverUploadNotifications({api,plan,state,config,persist}) {
  let failed=0;
  for(const n of [...(state.pending_notifications ?? [])]) {
    const entry=plan.entries.find(e=>e.schedule_id===n.scheduleId);
    if(!entry || entry.existing_slug!==n.slug) {failed++;continue;}
    const uploaded=publicationFor(entry,state).publication_status==='uploaded';
    try {
      try {await api('editMessageReplyMarkup',{chat_id:config.chatId,message_id:n.messageId,reply_markup:uploadKeyboard(n.scheduleId,uploaded,n.slug)});}
      catch(error) {if(!error.message.includes('message is not modified')) throw error;}
      await api('sendMessage',{chat_id:config.chatId,text:`${uploaded?'✅':'↩'} ${entry.working_title}\n${uploaded?'Uploaded — crossed off the calendar.':'Upload confirmation undone.'}\n${n.scheduleId}`});
    } catch {failed++;continue;}
    state.pending_notifications=state.pending_notifications.filter(item=>item.id!==n.id);
    await persist(state);
  }
  if(failed) throw new Error(`${failed} Telegram notifications remain queued for retry`);
}
