/** One writing stage, with bounded transport retries and independent free providers. */
export function resolveProviders(env = process.env) {
  const providers = [];
  const add = (name, baseUrl, apiKey, model) => {
    if (apiKey) providers.push({name, baseUrl, apiKey, model});
  };
  if (env.LLM_BASE_URL && env.LLM_API_KEY) {
    add('custom', env.LLM_BASE_URL.replace(/\/$/, ''), env.LLM_API_KEY, env.LLM_MODEL || 'openai/gpt-oss-120b');
  }
  add('gemini', 'https://generativelanguage.googleapis.com/v1beta/openai', env.GEMINI_API_KEY, env.GEMINI_MODEL || 'gemini-3.6-flash');
  add('groq', 'https://api.groq.com/openai/v1', env.GROQ_API_KEY, env.GROQ_MODEL || 'openai/gpt-oss-120b');
  const routerModel = env.OPENROUTER_MODEL || 'openrouter/free';
  add('openrouter', 'https://openrouter.ai/api/v1', env.OPENROUTER_API_KEY, routerModel);
  // Preserve the old override for the initial writer without sending its model to other providers.
  if (!env.LLM_BASE_URL && env.LLM_MODEL && providers[0]) providers[0].model = env.LLM_MODEL;
  if (providers.some(p => p.name === 'openrouter' && p.model !== 'openrouter/free' && !p.model.endsWith(':free'))) {
    throw new Error('OpenRouter model must be openrouter/free or a :free model');
  }
  if (!providers.length) throw new Error('No LLM key found. Set GEMINI_API_KEY, GROQ_API_KEY or OPENROUTER_API_KEY. Templates and --slug need no key.');
  return providers;
}

/** validate(content), when supplied, must throw for unusable output and returns the accepted script. */
export async function chat(messages, options = {}) {
  const providers = resolveProviders(options.env ?? process.env);
  const request = options.fetch ?? globalThis.fetch;
  const sleep = options.sleep ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  const now = options.now ?? Date.now;
  const logger = options.logger ?? console;
  const deadline = now() + (options.budgetMs ?? 8 * 60 * 1000);
  const maxAttempts = options.maxAttempts ?? 3;
  const failures = [];
  const redact = text => providers.reduce((safe, p) => safe.split(p.apiKey).join('[redacted]'), String(text)).slice(0, 300);
  const remaining = () => {
    const left = deadline - now();
    if (left <= 0) throw new Error('[llm] generation deadline exceeded; no script was saved');
    return left;
  };
  for (const provider of providers) {
    let format = options.schema && ['gemini', 'groq', 'custom'].includes(provider.name) ? 'json_schema' : 'json_object';
    logger.log(`[llm] trying provider=${provider.name} model=${provider.model}`);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(new Error('request timeout')), Math.min(options.requestTimeoutMs ?? 90000, remaining()));
      let retry = false, delay = 10000 * 2 ** (attempt - 1);
      try {
        const groq = /^https:\/\/api\.groq\.com(?:\/|$)/.test(provider.baseUrl);
        // Groq's free 8K TPM budget also includes the compact prompt and schema.
        const body = {model: provider.model, messages, temperature: 0.8, max_tokens: options.maxTokens ?? (groq ? 5500 : 8000)};
        if (format === 'json_schema') body.response_format = {type: format, json_schema: {name: 'kids_script', strict: true, schema: options.schema}};
        else if (format === 'json_object') body.response_format = {type: format};
        if (groq && provider.model.startsWith('openai/gpt-oss') || provider.name === 'gemini' && /^gemini-(?:2\.5|3)/.test(provider.model)) body.reasoning_effort = 'low';
        const response = await request(`${provider.baseUrl}/chat/completions`, {
          method: 'POST', headers: {'content-type': 'application/json', authorization: `Bearer ${provider.apiKey}`},
          body: JSON.stringify(body), signal: controller.signal,
        });
        if (response.ok) {
          const data = await response.json();
          const choice = data.choices?.[0];
          // Validate before accepting a provider; a failed draft advances to the next writer.
          if (choice?.finish_reason === 'length') throw new Error('truncated completion: increase the output budget or shorten the prompt');
          if (typeof choice?.message?.content !== 'string' || !choice.message.content.trim()) throw new Error('empty completion');
          const result = options.validate ? await options.validate(choice.message.content) : choice.message.content;
          remaining();
          logger.log(`[llm] provider=${provider.name} model=${provider.model} attempt=${attempt}`);
          return result;
        }
        const text = await response.text();
        failures.push(`${provider.name} ${response.status}: ${redact(text)}`);
        logger.warn(`[llm] ${failures.at(-1)}`);
        const unsupportedFormat = /response_format|json_schema|json_object/i.test(text) && /unsupported|not supported|not available/i.test(text);
        const rejectedGeneration = options.validate && format === 'json_schema' && /json_validate_failed|failed to (?:generate|validate) json|generated json does not match the expected schema/i.test(text);
        if (response.status === 400 && (unsupportedFormat || rejectedGeneration)) {
          format = format === 'json_schema' ? 'json_object' : null;
          retry = true;
          delay = 0;
        } else {
          retry = [408, 429, 500, 502, 503, 504].includes(response.status);
          const header = response.headers.get('retry-after');
          if (header) {
            const seconds = Number(header);
            const advised = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header) - now();
            if (Number.isFinite(advised)) delay = Math.max(delay, advised);
          }
          // Daily quotas and long outages should move to an independent provider.
          if (delay > 60000) retry = false;
        }
      } catch (err) {
        failures.push(`${provider.name}: ${redact(err.message)}`);
        // Retry transport failures; rejected completions use an independent provider.
        retry = controller.signal.aborted || err instanceof TypeError && /fetch|network|socket/i.test(err.message);
        logger.warn(`[llm] ${failures.at(-1)}`);
      } finally {
        clearTimeout(timer);
      }
      remaining();
      if (!retry || attempt === maxAttempts) break;
      if (delay >= remaining()) throw new Error('[llm] retry would exceed the generation deadline');
      logger.warn(`[llm] retrying ${provider.name} in ${delay / 1000}s (${attempt + 1}/${maxAttempts})`);
      await sleep(delay);
    }
  }
  throw new Error(`[llm] all configured providers failed: ${failures.join(' | ')}`);
}
