/** Poll -> persist/commit -> notify. Run only one poller for this dedicated bot. */
import fs from 'node:fs';
import path from 'node:path';
import { loadDotEnv, ROOT } from './lib/common.mjs';
import { getClient } from './lib/db.mjs';
import { readCalendar, readPublicationState, saveCalendar, syncCalendarDb } from './lib/calendar.mjs';
import { createTelegramClient } from './lib/telegram-api.mjs';
import { telegramOwner, pollUploadUpdates, deliverUploadNotifications } from './lib/telegram-calendar.mjs';
loadDotEnv();
const notificationsFile=path.join(ROOT,'out/telegram-notifications.json');
async function main() {
  const mode=process.argv[2] ?? 'poll';
  const config=telegramOwner(process.env.TELEGRAM_CHAT_ID,process.env.TELEGRAM_OWNER_ID);
  const api=createTelegramClient(process.env.TELEGRAM_BOT_TOKEN);
  if(mode==='notify') {
    const plan=readCalendar(),state=readPublicationState();
    await deliverUploadNotifications({api,plan,state,config,persist:async next=>saveCalendar(plan,next)});
    // Popups expire quickly; durable button updates and separate messages carry confirmation.
    const recent=fs.existsSync(notificationsFile)?JSON.parse(fs.readFileSync(notificationsFile,'utf8')):[];
    for(const n of recent) {
      try {await api('answerCallbackQuery',{callback_query_id:n.callbackId,text:n.text,show_alert:!!n.error});}
      catch(error) {if(!/query is too old|query ID is invalid|response timeout expired/i.test(error.message)) console.warn(error.message);}
    }
    console.log('[calendar] durable Telegram notification queue drained');
    return;
  }
  if(mode!=='poll') throw new Error('Usage: telegram-calendar.mjs poll | notify');
  const plan=readCalendar();
  const result=await pollUploadUpdates({api,plan,state:readPublicationState(),config});
  const db=getClient();
  try {await syncCalendarDb(plan,result.state,db);saveCalendar(plan,result.state);}
  finally {db.close();}
  fs.mkdirSync(path.dirname(notificationsFile),{recursive:true});
  fs.writeFileSync(notificationsFile,JSON.stringify(result.notifications));
  console.log(`[calendar] ${result.notifications.length} owner actions saved; commit before running notify`);
}
main().catch(error=>{console.error(`[calendar] ${error.message}`);process.exitCode=1;});
