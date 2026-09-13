/**
 * Step 1: topic -> validated script.json, written to public/generated/<slug>/script.json
 *
 * Usage: node scripts/generate-script.mjs --topic "a shy turtle who learns to share" --type story
 * Provider is auto-detected from env keys (GEMINI_API_KEY / GROK_API_KEY /
 * GROQ_API_KEY / OPENROUTER_API_KEY / GITHUB_TOKEN) or set explicitly via
 * LLM_BASE_URL + LLM_API_KEY + LLM_MODEL.
 *
 * The LLM only writes CONTENT (words, emotions, actions, questions). Everything
 * that makes the video engaging is enforced afterwards by the Director
 * (scripts/lib/director.mjs), which also fixes whatever the model got wrong.
 */
import { z } from "zod";
import { loadDotEnv, parseArgs, slugify, writeScript, setLatestSlug } from "./lib/common.mjs";
import { BACKGROUNDS, CHARACTERS, PALETTES, EMOTIONS, ACTIONS } from "./lib/vocab.mjs";
import { CHARACTER_PARTS, BACKGROUND_PARTS } from "./lib/recipes.mjs";
import { BACKGROUND_RECIPES, CHARACTER_RECIPES } from "./lib/library.mjs";
import { directScript } from "./lib/director.mjs";
import { generateFromTemplate, TEMPLATE_IDS } from "./lib/templates/index.mjs";
import { castKinds, castHeroKind, castPrompt, castMemberById, castMemberByKind } from "./lib/cast.mjs";

loadDotEnv();

/** the Sunny Meadow universe — the only animals a script may use */
const CAST_KINDS = castKinds();

const LineSchema = z.object({
  text: z.string().min(1).max(160),
  speaker: z.string().optional(),
  emotion: z.string().optional(),
  action: z.string().optional(),
  callout: z.any().optional(),
});

const ScriptSchema = z.object({
  type: z.enum(["rhyme", "story"]),
  title: z.string().min(3).max(60),
  palette: z.string(),
  mainCharacter: z.object({ kind: z.string(), name: z.string().min(1).max(20) }),
  intro: z.string().min(3).max(200).optional().nullable(),
  outro: z.string().min(3).max(200).optional().nullable(),
  moral: z.string().nullable().optional(),
  moralRhyme: z.array(z.string().min(3).max(80)).length(2).nullable().optional(),
  youtube: z.object({
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()).min(3),
  }),
  newCharacters: z.array(z.object({ name: z.string(), recipe: z.any() })).optional().nullable(),
  newBackgrounds: z.array(z.object({ name: z.string(), recipe: z.any() })).optional().nullable(),
  scenes: z
    .array(
      z.object({
        kind: z.string().optional(),
        background: z.string(),
        character: z.string(),
        secondCharacter: z.string().nullable().optional(),
        energy: z.string().optional(),
        holdSec: z.number().min(0).max(5).optional(),
        prop: z.string().nullable().optional(),
        question: z.any().optional().nullable(),
        lines: z.array(LineSchema).min(1).max(6),
      })
    )
    .min(3)
    .max(40),
});

function resolveProvider() {
  const env = process.env;
  if (env.LLM_BASE_URL && env.LLM_API_KEY) {
    return { name: "custom", baseUrl: env.LLM_BASE_URL, apiKey: env.LLM_API_KEY, model: env.LLM_MODEL || "llama-3.3-70b-versatile" };
  }
  if (env.GEMINI_API_KEY) {
    return { name: "gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", apiKey: env.GEMINI_API_KEY, model: env.LLM_MODEL || "gemini-2.0-flash" };
  }
  if (env.GROK_API_KEY) {
    return {
      name: "grok",
      baseUrl: env.GROK_BASE_URL || env.GROK_API_BASE_URL || "https://api.x.ai/v1",
      apiKey: env.GROK_API_KEY,
      model: env.GROK_MODEL || env.LLM_MODEL || "grok-beta",
    };
  }
  if (env.GROQ_API_KEY) {
    return { name: "groq", baseUrl: "https://api.groq.com/openai/v1", apiKey: env.GROQ_API_KEY, model: env.LLM_MODEL || "llama-3.3-70b-versatile" };
  }
  if (env.OPENROUTER_API_KEY) {
    return { name: "openrouter", baseUrl: "https://openrouter.ai/api/v1", apiKey: env.OPENROUTER_API_KEY, model: env.LLM_MODEL || "meta-llama/llama-3.3-70b-instruct:free" };
  }
  if (env.GITHUB_TOKEN) {
    return { name: "github-models", baseUrl: "https://models.github.ai/inference", apiKey: env.GITHUB_TOKEN, model: env.LLM_MODEL || "openai/gpt-4o-mini" };
  }
  throw new Error("No LLM key found. Set one of GEMINI_API_KEY, GROK_API_KEY, GROQ_API_KEY, OPENROUTER_API_KEY, GITHUB_TOKEN (see .env.example).");
}

async function chat(messages, { useJsonMode = true } = {}) {
  const provider = resolveProvider();
  const body = { model: provider.model, messages, temperature: 0.9 };
  if (useJsonMode) body.response_format = { type: "json_object" };
  const res = await fetch(`${provider.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${provider.apiKey}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    if (useJsonMode && res.status >= 400 && res.status < 500) {
      console.warn(`[llm] ${provider.name} rejected json mode (${res.status}), retrying without it`);
      return chat(messages, { useJsonMode: false });
    }
    throw new Error(`[llm] ${provider.name} ${res.status}: ${text.slice(0, 500)}`);
  }
  const data = await res.json();
  console.log(`[llm] provider=${provider.name} model=${provider.model}`);
  return data.choices[0].message.content;
}

function extractJson(text) {
  const stripped = text.replace(/```(?:json)?/g, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in LLM response");
  return JSON.parse(stripped.slice(start, end + 1));
}

const systemPrompt = (type, minutes) => {
  const lines = Math.round(minutes * (type === "story" ? 13 : 16));
  return `You write scripts for an animated YouTube channel for children aged 2-6. The videos are rendered automatically from your JSON: a cartoon animal hero on screen sings/speaks every line with lip-sync, does the "action" you give, shows the "emotion" you give, big learning callouts pop up for numbers/colors/key words, and question scenes pause for the child to answer.

Respond with ONLY a valid JSON object (no markdown, no commentary) with exactly this shape:

{
  "type": "${type}",
  "title": "short catchy on-screen title, 2-6 words",
  "palette": "one of: ${PALETTES.join(", ")}",
  "mainCharacter": { "kind": "one of: ${CAST_KINDS.join(", ")} (the Sunny Meadow cast, from The Cast below)", "name": "the hero's name from The Cast" },
  "intro": "1-2 short sentences the hero says to greet the child, e.g. 'Hi friends! I'm Benny the bunny! Let's sing together!'",
  "outro": "1 short goodbye sentence",
  "moral": ${type === "story" ? '"one short, warm sentence stating the lesson"' : "null"},
  "moralRhyme": ${type === "story" ? '["two short rhyming lines (max 7 words each) that chant the lesson, e.g. \\"Share, share, it\'s only fair!\\", \\"Sharing shows how much we care!\\""]' : "null"},
  "youtube": {
    "title": "YouTube title under 70 chars, may include one emoji",
    "description": "2-3 kid-safe sentences, then 3-5 hashtags",
    "tags": ["10-15 short search tags"]
  },
  "scenes": [
    {
      "kind": "${type === "story" ? "story | question | lesson" : "verse | chorus | question"}",
      "background": "one of: ${BACKGROUNDS.join(", ")}",
      "character": "one of: ${CAST_KINDS.join(", ")} (usually the main character)",
      "secondCharacter": "another cast member standing next to the hero, or null",
      "energy": "calm | upbeat",
      "holdSec": 0,
      "prop": "one emoji the scene is about (e.g. 🥕) or null",
      "question": null,
      "lines": [
        {
          "text": "one line the voice says (max 12 simple words)",
          "speaker": "character | friend | narrator",
          "emotion": "one of: ${EMOTIONS.join(", ")}",
          "action": "one of: ${ACTIONS.join(", ")}",
          "callout": null
        }
      ]
    }
  ]
}

Question scenes (kind "question") talk TO the child, then pause so they can answer:
  "holdSec": 3, "question": { "answer": { "text": "Red", "emoji": "🍎" }, "praise": "Yes! Red like an apple! Great job!" }
  Ask things a 3-year-old can answer out loud or with their body: a color, a number, an animal sound, "can you clap?", or in a story: a choice ("Should Benny share? Say YES!").
Callouts (optional, max one per line) put a giant word on screen: {"kind":"word","text":"SHARE","emoji":"🥕"} or {"kind":"emoji","emoji":"💡"}. Numbers and colors in the text get callouts automatically, so you don't need to add those.

Content rules:
- Audience is toddlers/preschoolers: very simple words, short sentences, warm and positive. Nothing scary, sad for long, violent, or branded. Every line max 12 words.
- TARGET LENGTH: about ${minutes} minutes of narration — write about ${lines} lines total. This is a hard requirement; do not write a short script.
- Give the hero a NAME and use it. Use "speaker": "character" when the hero sings/talks, "friend" when the secondCharacter talks, "narrator" for storytelling sentences about them.
- NEVER write laughter or sound words for the voice to read ("ha ha", "hee hee", "yawn", "gasp"): they sound fake when synthesized. Put a tag at the START or END of the line instead and a real recording plays there: {giggle} {laugh} {yay} {wow} {gasp} {yum} {yawn} {hmm} {aww} {sigh}. Example: "That tickles! {giggle}". Use one every few lines when it fits the feeling.
- Give EVERY line an emotion and an action that matches its words (jump when it says jump, sad face when sad, hug when hugging, sleep at bedtime, think when wondering, cheer for hooray, point when asking the child something).
- Vary backgrounds between scene groups so something new appears every 20-30 seconds, and mix in 1-2 CAST members (friends or rivals) as secondCharacter, but keep the hero in almost every scene so kids bond with it.
${
  type === "rhyme"
    ? `- Write an ORIGINAL sing-song rhyme with verse/chorus structure: verse (3-4 lines) -> chorus -> verse -> chorus ...
- The CHORUS is 3-4 lines that come back word-for-word IDENTICAL every 2-3 scenes (kind "chorus", energy "upbeat"). Kids love chanting it.
- Every verse names at least one thing to DO (clap, jump, spin, stomp, wave, wiggle, dance) and the hero does it.
- Include one counting verse (one, two, three, four, five) and one colors verse (red, yellow, green, blue).
- A question scene every 4-6 scenes (kind "question", energy "upbeat", holdSec 3).
- Finish with one calm, cozy verse (energy "calm"), then a final chorus.
- Strong rhythm and end rhymes (AABB or ABAB). Each line max ~8 words.`
    : `- Structure: (1) meet the hero and what they love, (2) a friend arrives / a small problem, (3) the hero makes a choice (ask the child first!), (4) a gentle consequence and a sad moment, (5) the hero learns (kind "lesson", emotion "surprised" then "love"), (6) they fix it, (7) happy ending with the friend.
- 1-3 lines per scene. Narrator lines describe; character/friend lines are what they say out loud.
- Give the hero their catchphrase from The Cast, said IDENTICALLY 3+ times through the story (e.g. Taffy: "Hop, hop, hooray!").
- Put 2-3 question scenes at the decision points ("What should Taffy do? Share or keep them all?" answer "Share!") and one easy one (a color or number in the story).
- The story must SHOW the moral through the hero's feelings; state it only in "moral" and "moralRhyme" (the video repeats the rhyme as a chant at the end).`
}
- Pick the palette and backgrounds that fit the mood.

${castPrompt()}

BACKGROUNDS you can use (name: what it shows): ${BACKGROUNDS.map((b) => `${b}${BACKGROUND_RECIPES[b]?.description ? ` (${BACKGROUND_RECIPES[b].description})` : ""}`).join("; ")}.
Only if the topic truly needs a place that is NOT in those lists, add it as a background recipe made ONLY from these parts (the renderer draws it; no images):
  "newBackgrounds": [{ "name": "volcano", "recipe": { "gradient": ["#hex top", "#hex bottom"], "palette": "one of ${PALETTES.join("|")}", "description": "short", "parts": [ { "part": "one of back: ${BACKGROUND_PARTS.back.join("|")}" }, { "part": "one of static: ${BACKGROUND_PARTS.static.join("|")}", "x": 400 }, { "part": "one of front: ${BACKGROUND_PARTS.front.join("|")}" } ] } }]
  (parts are painted in order: back things first, scenery, then front things; hills need cx/top/rx/color, trees x/base/s, ground color/top; copy numbers from this existing recipe: ${JSON.stringify(BACKGROUND_RECIPES.pond?.parts ?? [])})
Then use the new name in "background" like any other. Otherwise leave newBackgrounds out.
Do NOT add newCharacters — The Cast above is the whole world.`;
};

function finish(script, args) {
  const slug = script.slug;
  const full = directScript({ ...script, voice: args.voice || process.env.TTS_VOICE || null, music: args.music ?? script.music ?? undefined });
  writeScript(slug, full);
  setLatestSlug(slug);
  const lineCount = full.scenes.reduce((n, s) => n + s.lines.length, 0);
  console.log(`[generate] wrote public/generated/${slug}/script.json (${full.scenes.length} scenes, ${lineCount} lines, ${full.stars?.total ?? 0} questions)`);
  console.log(`[generate] title: ${full.title} | hero: ${full.mainCharacter.name} the ${full.mainCharacter.kind} | palette: ${full.palette} | music: ${full.music?.mood}`);
}

/** `--hero` may be a cast id ("fiona") or a kind ("fox"); resolve to the cast card */
function resolveHero(raw) {
  if (!raw) return null;
  return castMemberById(String(raw)) ?? castMemberByKind(String(raw)) ?? null;
}

async function main() {
  const args = parseArgs();
  const minutesArg = Number(args.minutes || process.env.TARGET_MINUTES || 5.5);

  // ── AI-free path: a template song ──
  if (args.template) {
    const seed = args.seed !== undefined ? Number(args.seed) : Math.floor(Math.random() * 1e9);
    const script = generateFromTemplate({ template: String(args.template), hero: args.hero, place: args.place, seed });
    if (args.slug) script.slug = String(args.slug);
    script.targetMinutes = minutesArg;
    console.log(`[generate] template=${args.template} hero=${script.mainCharacter.kind} seed=${seed} (no AI)`);
    finish(script, args);
    return;
  }

  const topic = args.topic;
  const type = args.type === "story" ? "story" : "rhyme";
  const minutes = Number(args.minutes || process.env.TARGET_MINUTES || 5.5);
  if (!topic || typeof topic !== "string") {
    console.error(`Usage: node scripts/generate-script.mjs --topic "..." [--type rhyme|story] [--minutes 5.5] [--slug my-slug] [--voice af_heart]\n   or: node scripts/generate-script.mjs --template <${TEMPLATE_IDS.join("|")}> [--hero duck] [--place farm] [--seed 42]`);
    process.exit(1);
  }

  const heroSel = resolveHero(args.hero);
  const userContent = heroSel
    ? `Topic: ${topic}\nThe hero (mainCharacter) of this story MUST be ${heroSel.name} the ${heroSel.kind} from The Cast. Use that exact kind and name.`
    : `Topic: ${topic}`;

  const messages = [
    { role: "system", content: systemPrompt(type, minutes) },
    { role: "user", content: userContent },
  ];

  let script;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const raw = await chat(messages);
    try {
      const parsed = extractJson(raw);
      script = ScriptSchema.parse(parsed);
      break;
    } catch (err) {
      console.warn(`[generate] attempt ${attempt} invalid: ${err.message.slice(0, 300)}`);
      if (attempt === 3) throw err;
      messages.push({ role: "assistant", content: raw });
      messages.push({ role: "user", content: `That JSON was invalid: ${err.message.slice(0, 500)}\nRespond again with ONLY the corrected JSON object.` });
    }
  }

  if (script.type === "rhyme") {
    script.moral = null;
    script.moralRhyme = null;
  }
  if (heroSel) script.mainCharacter = { kind: heroSel.kind, name: heroSel.name };
  const slug = args.slug || `${slugify(script.title)}-${new Date().toISOString().slice(0, 10)}`;
  finish(
    {
      ...script,
      intro: script.intro ? { text: script.intro } : null,
      outro: script.outro ? { text: script.outro } : null,
      slug,
      topic,
      targetMinutes: minutes,
    },
    args
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
