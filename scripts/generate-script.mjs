/**
 * Step 1: topic -> validated script.json, written to public/generated/<slug>/script.json
 *
 * Usage: node scripts/generate-script.mjs --topic "a shy turtle who learns to share" --type story
 * Writers fail over across configured free providers (GEMINI_API_KEY /
 * GROQ_API_KEY / OPENROUTER_API_KEY) or set explicitly via
 * LLM_BASE_URL + LLM_API_KEY + LLM_MODEL.
 *
 * The LLM only writes CONTENT (words, emotions, actions, questions). Everything
 * that makes the video engaging is enforced afterwards by the Director
 * (scripts/lib/director.mjs), which also fixes whatever the model got wrong.
 */
import fs from "node:fs";
import path from "node:path";
import {loadDotEnv, parseArgs, slugify, writeScript, setLatestSlug, ROOT, GENERATED_DIR} from "./lib/common.mjs";
import {PALETTES, EMOTIONS, ACTIONS, BACKGROUNDS} from "./lib/vocab.mjs";
import {directScript} from "./lib/director.mjs";
import {voiceSettings} from './lib/voice.mjs';
import {generateFromTemplate, TEMPLATE_IDS} from "./lib/templates/index.mjs";
import {rng} from "./lib/templates/engine.mjs";
import {castKinds, castPrompt, castMemberById, castMemberByKind} from "./lib/cast.mjs";
import {buildStoryBrief, storyQualityReport} from "./lib/story-planner.mjs";
import {readCatalog} from "./lib/catalog.mjs";
import {chat} from "./lib/llm.mjs";
import {ScriptSchema, scriptJsonSchema} from "./lib/script-schema.mjs";

loadDotEnv();
const CAST_KINDS = castKinds();

function extractJson(text) {
  const stripped = text.replace(/```(?:json)?/g, "").trim();
  const start = stripped.indexOf("{");
  const end = stripped.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("No JSON object in LLM response");
  return JSON.parse(stripped.slice(start, end + 1));
}

const systemPrompt = (type, minutes) => `You write warm, original animated stories for children aged 2-6. Return ONLY compact JSON (no indentation), no markdown.
Return exactly: type, title (3-60 chars), palette, mainCharacter {kind,name}, intro (string or null), outro (string or null), moral (string or null), moralRhyme (two rhyming strings or null), youtube {title,description,tags}, scenes.
Each scene has exactly: kind, background, character, secondCharacter (cast kind or null), energy (calm/upbeat), holdSec (0-5), prop (one emoji or null), question (null or {answer:{text,emoji},praise}), lines.
Each line has exactly: text, speaker (character/friend/narrator), emotion, action.
Use type "${type}". Palette: ${PALETTES.join(', ')}. Cast kinds: ${CAST_KINDS.join(', ')}.
Backgrounds: ${BACKGROUNDS.join(', ')}. Emotions: ${EMOTIONS.join(', ')}. Actions: ${ACTIONS.join(', ')}.
"character" speaks for the scene's character; "friend" speaks for its secondCharacter; "narrator" describes their actions. Never use friend without secondCharacter.
Do not invent characters, backgrounds, recipes, music, callouts or visual effects. The deterministic Director supplies these.
Write ${Math.ceil(minutes * (type === 'story' ? 11 : 16))} spoken lines for ${minutes} minutes in ${Math.min(40, Math.max(6, Math.ceil(minutes * (type === 'story' ? 11 : 16) / 2)))} scenes. Most scenes contain 2-3 lines (hard bounds: 3-40 scenes, 1-6 lines per scene).${type === 'story' ? ` Never return fewer than ${Math.floor(minutes * 9)} spoken lines total; count the lines before finishing.` : ''}
Every line uses 4-10 simple words. Narration uses vivid verbs and natural contractions. Keep introductions brief; start the first scene directly with the story problem.
${type === 'story' ? 'Set intro to null. Open with a visible object problem or surprising discovery already happening. For a rolling ball/apple, use a first-line reaction such as "Oops! My ball is rolling away!" or "Oh! My apple rolled away!" and set the scene prop to the matching ball/apple. A closed picture book is another concrete discovery. The hero is already visible, with a brief title overlay.' : ''}
${type === 'story' ? `Tell one focused story and one moral, using the supplied deterministic episode brief. Its selected cast and setting are binding. Let the setting cause a practical obstacle.
Follow: immediate hook -> hero's concrete goal -> first mistaken attempt -> different second attempt -> child choice -> gentle consequence -> hero chooses a repair -> warm ending proving the repair works.
Make the goal visible in spoken text with a concrete object and activity. Each attempt changes the strategy, names its action, and shows why it fails; repeating the same action harder does not count as a new attempt. Give the choice actual alternatives and let the hero decide.
An apology or promise is not a repair. Narrate the hero performing a specific reparative action with the object or friend, followed by a concrete result. The final story scene returns to the original goal and shows the friend using or enjoying the repaired result. A moral, cheer, or elder's advice alone cannot serve as the ending.
Use new information in each scene. Repeat only the catchphrase at earned moments; avoid recycling generic dialogue such as "we can be kind together" across scenes. Do not invent audit scores or narrative annotations; the offline audit cites the words you write.
Include at least six story scenes, a lesson scene showing repair, and two question scenes at real choices. A question has kind "question", holdSec 3, a simple answer and warm praise.
Give characters distinct voices based on their personalities. Elders can learn too; their advice never solves the hero's problem for them. Show brief disappointment followed by an achievable caring action. No shaming, scary danger, sudden magic fix, or long lectures.
Use concrete completed actions when they happen: pick up, give, put down, push, roll, catch, open a book, water a flower/seed, or build a sandcastle/snow friend. Name the object in the spoken line so the deterministic stage can show it. Keep an object recognizable through the story. A question or proposed action is not a completed action.
Include a small harmless comic sequence tied to the story object: something moves, a character notices, a brief pause, then a helpful catch or repair. Show the listener's reaction in the next line. Leave a short hold for the reaction and let feelings move from surprise or concern to relief. Keep the selected characters' voices distinct.
Repeat the hero's exact catchphrase three times at earned moments. State the moral only in moral and the two short moralRhyme lines. The ending returns to the original goal and demonstrates change.` : `Write an original rhyme: verse -> chorus -> verse -> chorus, with exactly repeated 3-4 line choruses. Include action words, one counting verse, one colors verse, two question scenes, and a cozy ending. Set moral and moralRhyme to null.`}
Use holdSec 2 after a meaningful feeling or before a discovery. Keep questions relevant to this story. A vox tag such as {giggle}, {wow}, {hmm}, or {yay} may appear on a few lines; never spell out fake laughter.
YouTube title under 70 characters, description 2-3 sentences plus hashtags, 10-15 short tags.
${castPrompt()}`;

function finish(script, args) {
  const slug = script.slug;
  const full = directScript({ ...script, presentationVersion: 4, voice: args.voice || process.env.TTS_VOICE || null, music: args.music ?? script.music ?? undefined });
  full.synthesis = voiceSettings(full,args);
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
  if (args.slug) {
    const existing = path.join(ROOT, "library", "scripts", `${args.slug}.json`);
    const generated = path.join(GENERATED_DIR, String(args.slug), "script.json");
    if (fs.existsSync(existing) || fs.existsSync(generated)) {
      const script = JSON.parse(fs.readFileSync(fs.existsSync(existing) ? existing : generated, "utf8"));
      writeScript(String(args.slug), script);
      setLatestSlug(String(args.slug));
      console.log(`[generate] reused existing script ${args.slug} (no AI)`);
      return;
    }
  }
  if (!Number.isFinite(minutesArg) || minutesArg < 1 || minutesArg > 8) throw new Error("minutes must be between 1 and 8");


  // ── AI-free path: a template song ──
  if (args.template) {
    const seed = args.seed !== undefined ? Number(args.seed) : Math.floor(rng(`${args.template}|${args.hero ?? ""}|${new Date().toISOString().slice(0, 10)}`)() * 1e9);
    const script = generateFromTemplate({ template: String(args.template), hero: args.hero, place: args.place, seed });
    if (args.slug) script.slug = String(args.slug);
    script.targetMinutes = minutesArg;
    console.log(`[generate] template=${args.template} hero=${script.mainCharacter.kind} seed=${seed} (no AI)`);
    finish(script, args);
    return;
  }

  const topic = args.topic;
  const type = args.type === "rhyme" ? "rhyme" : "story";
  const minutes = Number(args.minutes || process.env.TARGET_MINUTES || 5.5);
  if (!topic || typeof topic !== "string") {
    console.error(`Usage: node scripts/generate-script.mjs --topic "..." [--type rhyme|story] [--minutes 5.5] [--slug my-slug] [--voice af_heart]\n   or: node scripts/generate-script.mjs --template <${TEMPLATE_IDS.join("|")}> [--hero duck] [--place farm] [--seed 42]`);
    process.exit(1);
  }

  const heroSel = resolveHero(args.hero);
  if (args.hero && !heroSel) throw new Error(`Unknown cast hero: ${args.hero}`);
  const storyBrief = type === 'story' ? buildStoryBrief({topic, hero: heroSel, episodes: readCatalog().episodes,
    random: rng(`${topic}|${heroSel?.id ?? ''}|${new Date().toISOString().slice(0, 10)}`)}) : null;
  const userContent = `Topic: ${topic}\n${storyBrief ? `Episode brief (follow its cast, setting, attempts and repair): ${JSON.stringify(storyBrief)}` : heroSel ? `Hero: ${heroSel.name} (${heroSel.kind}).` : ''}`;
  const messages = [{role: "system", content: systemPrompt(type, minutes)}, {role: "user", content: userContent}];
  const script = await chat(messages, {schema: scriptJsonSchema, validate: raw => {
    const script = ScriptSchema.parse(extractJson(raw));
    if (script.type !== type) throw new Error(`Requested ${type}, but the writer returned ${script.type}`);
    if (type === 'story') {
      const quality = storyQualityReport(script, minutes);
      const issues = quality.issues;
      const allowed = [storyBrief.hero.kind, storyBrief.friend.kind];
      if (script.mainCharacter.kind !== storyBrief.hero.kind || script.mainCharacter.name !== storyBrief.hero.name) issues.push('use the exact hero from the brief');
      for (const scene of script.scenes) {
        if (!allowed.includes(scene.character) || scene.secondCharacter && !allowed.includes(scene.secondCharacter)) issues.push('use only the cast pair from the brief');
        if (!storyBrief.settings.includes(scene.background)) issues.push('use the setting from the brief');
        if (scene.lines.some(line => line.speaker === 'friend') && !scene.secondCharacter) issues.push('friend dialogue needs a secondCharacter');
      }
      if (issues.length) throw new Error(`Story quality check failed: ${[...new Set(issues)].join('; ')}`);
      const candidates = Object.entries(quality.audit.beats).filter(([, beat]) => beat.status === 'candidate').map(([name]) => name);
      console.log(`[generate] advisory story audit: candidates=${candidates.join(',') || 'none'}; warnings=${quality.audit.findings.length}. Review the written script with scripts/audit-story.mjs.`);
    }
    return script;
  }});

  if (script.type === "rhyme") {
    script.moral = null;
    script.moralRhyme = null;
  }
  if (heroSel) script.mainCharacter = { kind: heroSel.kind, name: heroSel.name };
  const baseSlug = args.slug || `${slugify(script.title)}-${new Date().toISOString().slice(0, 10)}`;
  let slug = baseSlug;
  for (let version = 2; fs.existsSync(path.join(ROOT, 'library', 'scripts', `${slug}.json`)) || fs.existsSync(path.join(GENERATED_DIR, slug, 'script.json')); version++) slug = `${baseSlug}-${version}`;
  finish(
    {
      ...script,
      intro: script.intro ? { text: script.intro } : null,
      outro: script.outro ? { text: script.outro } : null,
      slug,
      topic,
      targetMinutes: minutes,
      ...(storyBrief ? {storyBrief} : {}),
    },
    args
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
