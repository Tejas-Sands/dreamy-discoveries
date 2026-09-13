/** Small shared Bot API client. Never include the secret-bearing URL in errors. */
export function createTelegramClient(token, {fetchImpl=fetch}={}) {
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN is required');
  return async (method, payload={}) => {
    let data;
    try {
      const multipart=payload instanceof FormData;
      const response=await fetchImpl(`https://api.telegram.org/bot${token}/${method}`,{
        method:'POST',headers:multipart?undefined:{'content-type':'application/json'},
        body:multipart?payload:JSON.stringify(payload),signal:AbortSignal.timeout(120_000),
      });
      data=await response.json();
    } catch {
      throw new Error(`[telegram] ${method}: network failure or timeout`);
    }
    if (!data.ok) throw new Error(`[telegram] ${method}: ${String(data.description ?? 'API error').replaceAll(token,'[redacted]').slice(0,200)}`);
    return data.result;
  };
}
