/** Offline story writing kit and append-only import. Never calls an LLM. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import YAML from 'yaml';
import {ROOT} from './common.mjs';
import {castMembers, castMemberByKind} from './cast.mjs';
import {ACTIONS, EMOTIONS, PALETTES, BACKGROUNDS} from './vocab.mjs';
import {ScriptSchema, scriptJsonSchema} from './script-schema.mjs';
import {storyQualityReport} from './story-planner.mjs';
import {directScript} from './director.mjs';
import {voiceSettings} from './voice.mjs';
import {standbyStatus} from './standby.mjs';

const read = (file, fallback) => fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
const json = value => JSON.stringify(value, null, 2) + '\n';
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sourceHash = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const pick = (value, keys) => Object.fromEntries(keys.map(key => [key, value[key]]));

/** A complete existing story, stripped back to the writer's input contract. */
export function rawStoryExample(root = ROOT) {
  const saved = read(path.join(root, 'library/scripts/standby-ben-and-the-paper-boat.json'));
  const scenes = saved.scenes.filter(scene => ['story', 'question', 'lesson'].includes(scene.kind)).map(scene => ({
    kind: scene.kind, background: scene.background, character: scene.character,
    secondCharacter: scene.secondCharacter ?? null, energy: scene.energy ?? 'calm', holdSec: Math.min(5, scene.holdSec ?? 0),
    prop: scene.prop ?? null,
    question: scene.question ? {answer: scene.question.answer,
      praise: scene.question.praise ?? scene.lines.find(line => line.role === 'praise')?.text ?? 'Yes! You thought about our friends.'} : null,
    lines: scene.lines.filter(line => line.role !== 'praise').map(line => pick(line, ['text', 'speaker', 'emotion', 'action'])),
  }));
  return {slug: 'example-paper-boat-do-not-reimport', targetMinutes: 5.5,
    ...pick(saved, ['type', 'title', 'palette', 'mainCharacter', 'moral', 'moralRhyme', 'youtube']),
    intro: null, outro: saved.outro?.text ?? null, scenes};
}

export function buildStoryKit({root = ROOT, batch = 3, target = 50} = {}) {
  if (!Number.isInteger(batch) || batch < 1 || batch > 10) throw new Error('batch must be an integer from 1 to 10; three stories per chat response is recommended');
  if (!Number.isInteger(target) || target < 1) throw new Error('target must be a positive integer');
  const lib = path.join(root, 'library');
  const catalog = read(path.join(lib, 'catalog.json'), {episodes: []});
  const universe = read(path.join(lib, 'universe.json'), {stories: []});
  const manifest = read(path.join(lib, 'standby.json'), {slugs: [], usage: {}});
  const scripts = fs.readdirSync(path.join(lib, 'scripts')).filter(file => file.endsWith('.json')).sort()
    .map(file => read(path.join(lib, 'scripts', file))).filter(script => script.type === 'story');
  const rows = scripts.map(script => ({slug: script.slug, title: script.title,
    hero: script.mainCharacter?.name ?? null, moral: script.moral,
    backgrounds: [...new Set((script.scenes ?? []).map(scene => scene.background))],
    summary: script.standby?.summary ?? script.storyBrief?.goal ?? script.topic ??
      (script.scenes?.[0]?.lines?.slice(0, 2).map(line => line.text).join(' ') || script.moral),
    status: standbyStatus(script.slug, manifest.usage, catalog.episodes, universe.stories).status}));
  // Include released stories whose production JSON is unavailable in this checkout.
  for (const entry of [...catalog.episodes, ...universe.stories]) {
    const slug = entry.slug ?? entry.id;
    if (entry.type !== 'story' || rows.some(row => row.slug === slug)) continue;
    rows.push({slug, title: entry.title, hero: entry.heroName ?? entry.hero, moral: entry.moral ?? null,
      backgrounds: entry.backgrounds ?? [], summary: entry.topic ?? entry.moral ?? '', status: 'used'});
  }
  const cast = castMembers().map(member => pick(member, ['id', 'kind', 'name', 'personality', 'catchphrase', 'favorite', 'livesAt']));
  const context = {universe: 'Sunny Meadow', targetStories: target, storiesPerBatch: batch,
    counts: {characters: cast.length, backgrounds: BACKGROUNDS.length, savedStories: scripts.length,
      usedStories: rows.filter(row => row.status === 'used').length, unusedStories: rows.filter(row => row.status === 'available').length},
    cast, backgrounds: BACKGROUNDS, vocabulary: {palettes: PALETTES, emotions: EMOTIONS, actions: ACTIONS,
      sceneKinds: ['story', 'question', 'lesson'], speakers: ['character', 'friend', 'narrator']},
    usedStories: rows.filter(row => row.status === 'used'), unusedStories: rows.filter(row => row.status === 'available')};
  const singleSchema = {...scriptJsonSchema, properties: {...scriptJsonSchema.properties,
    slug: {type: 'string', pattern: '^[a-z0-9]+(?:-[a-z0-9]+)*$', maxLength: 80},
    targetMinutes: {type: 'number', minimum: 1, maximum: 8}}, required: [...scriptJsonSchema.required, 'slug', 'targetMinutes']};
  const schema = {anyOf: [singleSchema, {type: 'array', minItems: 1, items: singleSchema},
    {type: 'object', additionalProperties: false, required: ['stories'], properties: {stories: {type: 'array', minItems: 1, items: singleSchema}}}]};
  const prompt = `# Write the next Sunny Meadow story batch

I am building a bank of at least ${target} original, fun and emotionally meaningful preschool stories. Write ${batch} complete stories in this response. These are narrative stories, not template songs. Return ONLY valid JSON: {"stories":[ ...complete story objects... ]}. Do not return outlines, markdown fences, ellipses or incomplete stories. Never squeeze all ${target} stories into one response. In later batches, also avoid every story already written in this chat.

Use any of the ${cast.length} renderable characters below, including the animals outside the six established personality cards. All available library character designs can be heroes, friends or cameos. Use their exact listed kinds and names; do not invent unavailable designs or separate family characters without their own recipe. Rotate heroes and pairs. Let personalities create different dialogue, comic moments and choices. Avoid reproducing any used OR unused story below: new titles alone do not make a new plot. Vary the goal, object, obstacle, mistaken attempts, practical repair, setting and emotional payoff.

Each story: a visible problem in the first line; a concrete goal; two meaningfully different failed attempts; a gentle comic cause-and-effect sequence; two brief child choices; an achievable repair PERFORMED by the hero; and an earned ending. Show feelings through actions and dialogue. No shaming, frightening danger, lectures, instant magic solutions, padding or repeated generic lines. The elder may help, but never solves the problem for the hero. Mix lesson stories with comic stories: roughly one third may finish on a funny payoff without stating a lesson. For those set BOTH moral and moralRhyme to null; the Director will not add a chant. For lesson stories keep the moral outside ordinary dialogue; the Director adds its short closing chant. Use 4–10 simple words per spoken line and occasional natural reactions. Distinct stories should still feel like one consistent world.

For 5.5 minutes, aim for 25 scenes with 3 spoken lines each (75 lines). Include at least six kind=story scenes and two kind=question scenes. Lesson stories also need a kind=lesson scene showing repair; comic stories can keep that scene kind=story. Do not submit fewer than 49 spoken lines. Each scene has 1–6 lines. Length is finally determined by speech timing, not a claim in the JSON. No song, chorus or verse scenes.

Change the background WHEN THE STORY MOVES LOCATION: use each scene's background field, e.g. meadow → forest → meadow. Keep it stable during one continuous action. Mention the move naturally in narration. Do not change backgrounds randomly or invent unavailable settings.

Every story object has exactly: slug (new lowercase-hyphen ID), targetMinutes (5.5), type ("story"), title (3–60 chars), palette, mainCharacter {kind,name}, intro (null: start with the problem), outro (short string or null), moral (one clear sentence or null for comedy), moralRhyme (two short rhyming strings, or null when moral is null), youtube {title,description,tags}, scenes.
Every scene has exactly: kind (story/question/lesson), background, character (cast kind), secondCharacter (different cast kind or null), energy ("calm" or "upbeat" ONLY), holdSec (0–5), prop (one emoji or null), question, lines.
Every line has exactly: text (1–160 chars), speaker ("character" for scene.character, "friend" for scene.secondCharacter, or "narrator"), emotion and action from the vocabulary. Never use "friend" without secondCharacter. Use the exact cast name for mainCharacter.name.
For question scenes use question={"answer":{"text":"short answer","emoji":"one emoji"},"praise":"warm short praise"} and holdSec=3. Otherwise question=null. All dialogue and narration goes in lines. Use only the allowed vocabulary below, including action="look" rather than invented "run" or "smile". Do not include music, animation recipes, generated audio, subscribe requests or audit scores; the production code supplies those. The schema and complete example in the companion files show the precise contract.

Before returning, verify all objects/arrays close, enums match, scene and line counts meet the requirement, each plot earns its ending, and every story differs from the inventory.

## Current cast, settings, vocabulary and story inventory

${JSON.stringify(context, null, 2)}
`;
  return {context, schema, example: rawStoryExample(root), prompt};
}

function incomingStories(input) {
  const absolute = path.resolve(input);
  const files = fs.statSync(absolute).isDirectory()
    ? fs.readdirSync(absolute).filter(file => file.endsWith('.json')).sort().map(file => path.join(absolute, file)) : [absolute];
  if (!files.length) throw new Error('input directory contains no JSON files');
  return files.flatMap(file => {
    let value;
    try { value = JSON.parse(fs.readFileSync(file, 'utf8')); }
    catch (error) { throw new Error(`${file}: invalid JSON: ${error.message}`); }
    const entries = Array.isArray(value) ? value : value?.stories ?? [value];
    if (!Array.isArray(entries) || !entries.length) throw new Error(`${file}: expected a story, nonempty array, or {stories:[...]}`);
    return entries;
  });
}

export function importStories(input, {root = ROOT, dryRun = false, queue = true} = {}) {
  const lib = path.join(root, 'library');
  const manifestFile = path.join(lib, 'standby.json');
  const manifest = read(manifestFile, {slugs: [], usage: {}});
  const queueFile = path.join(lib, 'queue.yml');
  const pending = fs.existsSync(queueFile) ? YAML.parse(fs.readFileSync(queueFile, 'utf8')) : {items: []};
  pending.items ??= [];
  const catalog = read(path.join(lib, 'catalog.json'), {episodes: []});
  const universe = read(path.join(lib, 'universe.json'), {stories: []});
  const seen = new Set();
  const added = [], unchanged = [], warnings = [], prepared = [];
  let queued = 0, manifestChanged = false;
  // Validate the WHOLE batch, including collisions, before any persistent write.
  for (const entry of incomingStories(input)) {
    const slug = entry?.slug;
    if (typeof slug !== 'string' || slug.length > 80 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('story slug must use lowercase letters, numbers and single hyphens (max 80 chars)');
    if (seen.has(slug)) throw new Error(`Duplicate slug in batch: ${slug}`);
    seen.add(slug);
    const {slug: ignoredSlug, targetMinutes = 5.5, ...content} = entry;
    if (typeof targetMinutes !== 'number' || !Number.isFinite(targetMinutes) || targetMinutes < 1 || targetMinutes > 8) throw new Error(`${slug}: targetMinutes must be a number from 1 to 8`);
    const parsed = ScriptSchema.safeParse(content);
    if (!parsed.success) throw new Error(`${slug}: ${parsed.error.message}`);
    const raw = parsed.data;
    const quality = storyQualityReport(raw, targetMinutes);
    if (raw.type !== 'story') quality.issues.push('only narrative stories can be fed into the story bank');
    if (raw.mainCharacter.name !== castMemberByKind(raw.mainCharacter.kind)?.name) quality.issues.push('use the exact listed hero name');
    for (const scene of raw.scenes) {
      if (!['story', 'question', 'lesson'].includes(scene.kind)) quality.issues.push('use story, question or lesson scenes; the Director supplies the moral chant');
      if (scene.character === scene.secondCharacter) quality.issues.push('a scene character and friend must be different');
      if (scene.lines.some(line => line.speaker === 'friend') && !scene.secondCharacter) quality.issues.push('friend dialogue requires secondCharacter');
    }
    if (quality.issues.length) throw new Error(`${slug}: ${[...new Set(quality.issues)].join('; ')}`);
    const hash = sourceHash({slug, targetMinutes, ...raw});
    const destination = path.join(lib, 'scripts', `${slug}.json`);
    const generated = path.join(root, 'public/generated', slug, 'script.json');
    if (fs.existsSync(generated) && read(generated).imported?.sourceHash !== hash) {
      throw new Error(`${slug}: a different generated draft already exists; choose a new slug so local planning cannot load the wrong story`);
    }
    if (fs.existsSync(destination)) {
      if (read(destination).imported?.sourceHash !== hash) throw new Error(`${slug}: existing script has different content; choose a new slug, never overwrite a permanent story`);
      unchanged.push(slug);
    } else {
      const script = directScript({...raw, slug, targetMinutes, presentationVersion: 4, template: null,
        intro: raw.intro ? {text: raw.intro} : null, outro: raw.outro ? {text: raw.outro} : null,
        imported: {sourceHash: hash}});
      script.synthesis = voiceSettings(script);
      prepared.push({script, destination});
      added.push(slug);
      if (quality.audit.findings.length) warnings.push({slug, findings: quality.audit.findings});
    }
    if (!manifest.slugs.includes(slug)) {manifest.slugs.push(slug); manifestChanged = true;}
    const used = standbyStatus(slug, manifest.usage, catalog.episodes, universe.stories).status === 'used';
    if (queue && !used && !pending.items.some(item => item.slug === slug || item.id === `story-${slug}`)) {
      pending.items.push({id: `story-${slug}`, status: 'pending', slug, topic: raw.title, type: 'story',
        hero: castMemberByKind(raw.mainCharacter.kind).id, minutes: targetMinutes,
        addedAt: new Date().toISOString().slice(0, 10)});
      queued++;
    }
  }
  if (!dryRun && (prepared.length || manifestChanged || queued)) {
    fs.mkdirSync(path.join(lib, 'scripts'), {recursive: true});
    for (const {script, destination} of prepared) fs.writeFileSync(destination, json(script), {flag: 'wx'});
    if (manifestChanged) fs.writeFileSync(manifestFile, json(manifest));
    if (queued) fs.writeFileSync(queueFile, '# Topics waiting to be produced. status: pending | running | done\n' + YAML.stringify(pending));
  }
  return {added, unchanged, warnings, dryRun, queued};
}
