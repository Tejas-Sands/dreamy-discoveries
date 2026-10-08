import test from 'node:test';
import assert from 'node:assert/strict';

const {chat, resolveProviders} = await import('../scripts/lib/llm.mjs').catch(() => ({}));
const keys = {GEMINI_API_KEY: 'gemini-secret', GROQ_API_KEY: 'groq-secret', OPENROUTER_API_KEY: 'router-secret'};
const messages = [{role: 'user', content: 'Write a JSON story.'}];
const ok = () => Response.json({choices: [{message: {content: '{"title":"A kind choice"}'}, finish_reason: 'stop'}]});
const error = (status, message = 'unavailable', headers = {}) => Response.json({error: {message}}, {status, headers});
const options = (fetch, extra = {}) => ({env: keys, fetch, sleep: async () => {}, logger: {log() {}, warn() {}}, ...extra});

test('all configured free providers are available with separate model overrides', () => {
  assert.equal(typeof resolveProviders, 'function');
  const providers = resolveProviders({...keys, GEMINI_MODEL: 'gemini-3.6-flash', GROQ_MODEL: 'openai/gpt-oss-120b'});
  assert.deepEqual(providers.map(p => p.name), ['gemini', 'groq', 'openrouter']);
  assert.equal(providers[1].model, 'openai/gpt-oss-120b');
  assert.equal(providers[2].model, 'openrouter/free');
  assert.throws(() => resolveProviders({OPENROUTER_API_KEY: 'x', OPENROUTER_MODEL: 'paid/model'}), /free/i);
  assert.throws(() => resolveProviders({OPENROUTER_API_KEY: 'x', LLM_MODEL: 'paid/model'}), /free/i);
  assert.throws(() => resolveProviders({GITHUB_TOKEN: 'x'}), /No LLM key/);
});

test('a temporary 503 retries the same writer and succeeds', async () => {
  assert.equal(typeof chat, 'function');
  let calls = 0;
  const result = await chat(messages, options(async () => ++calls === 1 ? error(503) : ok()));
  assert.equal(result, '{"title":"A kind choice"}');
  assert.equal(calls, 2);
});

test('persistent Gemini overload falls through to Groq', async () => {
  assert.equal(typeof chat, 'function');
  const hosts = [];
  const result = await chat(messages, options(async url => {
    const host = new URL(url).hostname;
    hosts.push(host);
    return host === 'api.groq.com' ? ok() : error(503);
  }));
  assert.match(result, /kind choice/);
  assert.equal(hosts.filter(h => h === 'generativelanguage.googleapis.com').length, 3);
  assert.equal(hosts.at(-1), 'api.groq.com');
});

test('authentication and unavailable models fail over without pointless retries', async () => {
  assert.equal(typeof chat, 'function');
  for (const status of [401, 403, 404]) {
    const hosts = [];
    await chat(messages, options(async url => {
      hosts.push(new URL(url).hostname);
      return hosts.length === 1 ? error(status) : ok();
    }));
    assert.deepEqual(hosts, ['generativelanguage.googleapis.com', 'api.groq.com']);
  }
});

test('429 honors Retry-After while keeping JSON enabled', async () => {
  assert.equal(typeof chat, 'function');
  const bodies = [], delays = [];
  await chat(messages, options(async (_, request) => {
    bodies.push(JSON.parse(request.body));
    return bodies.length === 1 ? error(429, 'rate limited', {'retry-after': '12'}) : ok();
  }, {sleep: async ms => delays.push(ms)}));
  assert.deepEqual(delays, [12000]);
  assert.deepEqual(bodies[0].response_format, bodies[1].response_format);
});

test('long daily-quota waits use another provider instead of holding the runner', async () => {
  assert.equal(typeof chat, 'function');
  let calls = 0;
  await chat(messages, options(async () => ++calls === 1 ? error(429, 'daily limit', {'retry-after': '3600'}) : ok(), {
    sleep: async () => assert.fail('must not sleep for a daily quota'),
  }));
  assert.equal(calls, 2);
});

test('an explicit unsupported format error downgrades JSON schema', async () => {
  assert.equal(typeof chat, 'function');
  const formats = [];
  await chat(messages, options(async (_, request) => {
    const body = JSON.parse(request.body);
    formats.push(body.response_format?.type);
    return formats.length === 1 ? error(400, 'response_format json_schema is not supported') : ok();
  }, {schema: {type: 'object', properties: {}, required: [], additionalProperties: false}}));
  assert.deepEqual(formats, ['json_schema', 'json_object']);
});

test('provider-generated schema violations retry JSON object once with local validation', async () => {
  const attempts = [];
  const result = await chat(messages, options(async (url, request) => {
    attempts.push([new URL(url).hostname, JSON.parse(request.body).response_format.type]);
    return attempts.length <= 2
      ? error(400, 'Generated JSON does not match the expected schema. Please adjust your prompt. See failed_generation for the generated JSON. jsonschema: energy must be one of calm, upbeat')
      : ok();
  }, {schema: {type: 'object'}, validate: JSON.parse}));
  assert.deepEqual(result, {title: 'A kind choice'});
  assert.deepEqual(attempts, [
    ['generativelanguage.googleapis.com', 'json_schema'],
    ['generativelanguage.googleapis.com', 'json_object'],
    ['api.groq.com', 'json_schema'],
  ]);
});

test('schema validation errors require a local validator before relaxing the provider format', async () => {
  const attempts = [];
  await chat(messages, options(async (url, request) => {
    attempts.push([new URL(url).hostname, JSON.parse(request.body).response_format.type]);
    return attempts.length === 1 ? error(400, 'json_validate_failed') : ok();
  }, {schema: {type: 'object'}}));
  assert.deepEqual(attempts, [
    ['generativelanguage.googleapis.com', 'json_schema'], ['api.groq.com', 'json_schema'],
  ]);
});

test('ordinary bad requests advance providers without relaxing schema', async () => {
  const attempts = [];
  await chat(messages, options(async (url, request) => {
    attempts.push([new URL(url).hostname, JSON.parse(request.body).response_format.type]);
    return attempts.length === 1 ? error(400, 'invalid temperature') : ok();
  }, {schema: {type: 'object'}, validate: JSON.parse}));
  assert.deepEqual(attempts, [
    ['generativelanguage.googleapis.com', 'json_schema'], ['api.groq.com', 'json_schema'],
  ]);
});

test('network interruptions retry without adding another writing stage', async () => {
  assert.equal(typeof chat, 'function');
  let calls = 0;
  await chat(messages, options(async () => {
    if (++calls === 1) throw new TypeError('fetch failed');
    return ok();
  }));
  assert.equal(calls, 2);
});

test('deadline bounds the entire provider chain and secrets never reach errors', async () => {
  assert.equal(typeof chat, 'function');
  let now = 0, calls = 0;
  await assert.rejects(chat(messages, options(async () => {
    calls++;
    return error(503, 'gemini-secret');
  }, {now: () => now, budgetMs: 15000, sleep: async ms => { now += ms; }})), err => {
    assert.doesNotMatch(err.message, /gemini-secret/);
    return /deadline|budget/i.test(err.message);
  });
  assert.ok(calls <= 2);
});

test('a stalled response is aborted before it exhausts the plan job', async () => {
  assert.equal(typeof chat, 'function');
  await assert.rejects(chat(messages, options(async (_, {signal}) => new Promise((_, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), {once: true});
  }), {env: {GEMINI_API_KEY: 'x'}, requestTimeoutMs: 5, maxAttempts: 1})), /timeout|abort/i);
});

test('truncated or empty completions are rejected rather than saved as scripts', async () => {
  assert.equal(typeof chat, 'function');
  for (const response of [
    {choices: [{message: {content: '{'}, finish_reason: 'length'}]},
    {choices: [{message: {content: null}, finish_reason: 'stop'}]},
  ]) await assert.rejects(chat(messages, options(async () => Response.json(response), {env: {GEMINI_API_KEY: 'x'}})), /truncat|empty/i);
});

test('truncated and empty completions advance to an independent writer', async () => {
  for (const rejected of [
    {choices: [{message: {content: '{'}, finish_reason: 'length'}]},
    {choices: [{message: {content: null}, finish_reason: 'stop'}]},
  ]) {
    const hosts = [];
    const result = await chat(messages, options(async url => {
      hosts.push(new URL(url).hostname);
      return hosts.length === 1 ? Response.json(rejected) : ok();
    }));
    assert.match(result, /kind choice/);
    assert.deepEqual(hosts, ['generativelanguage.googleapis.com', 'api.groq.com']);
  }
});

test('invalid JSON and rejected script content advance writers before accepting a parsed script', async () => {
  const hosts = [];
  const rejected = ['{', '{"title":"Too short"}'];
  const result = await chat(messages, options(async url => {
    hosts.push(new URL(url).hostname);
    return hosts.length <= rejected.length
      ? Response.json({choices: [{message: {content: rejected[hosts.length - 1]}, finish_reason: 'stop'}]})
      : ok();
  }, {validate: raw => {
    const script = JSON.parse(raw);
    if (script.title === 'Too short') throw new Error('include at least 49 spoken lines');
    return script;
  }}));
  assert.deepEqual(result, {title: 'A kind choice'});
  assert.deepEqual(hosts, ['generativelanguage.googleapis.com', 'api.groq.com', 'openrouter.ai']);
});

test('completion validation failures are redacted and reported after all providers fail', async () => {
  let calls = 0;
  await assert.rejects(chat(messages, options(async () => {calls++; return ok();}, {
    validate: () => {throw new Error('invalid script gemini-secret groq-secret router-secret');},
  })), err => {
    assert.match(err.message, /all configured providers failed/);
    assert.doesNotMatch(err.message, /gemini-secret|groq-secret|router-secret/);
    return true;
  });
  assert.equal(calls, 3);
});

test('story output has room for JSON and keeps thinking effort low on supported writers', async () => {
  for (const [env, outputTokens] of [
    [{GEMINI_API_KEY: 'x'}, 8000],
    [{GROQ_API_KEY: 'x'}, 5500],
    [{LLM_API_KEY: 'x', LLM_BASE_URL: 'https://api.groq.com/openai/v1'}, 5500],
  ]) {
    let body;
    await chat(messages, options(async (_, request) => {body = JSON.parse(request.body); return ok();}, {env}));
    assert.equal(body.max_tokens, outputTokens);
    assert.equal(body.reasoning_effort, 'low');
  }
});
