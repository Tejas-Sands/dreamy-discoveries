import {castMembers} from './cast.mjs';
import fs from 'node:fs';
import {hintCharacter, hintBackground} from './hints.mjs';
import {BACKGROUNDS} from './vocab.mjs';
import {auditStory} from './story-audit.mjs';
const configuredSeeds = JSON.parse(fs.readFileSync(new URL('../../library/config.json', import.meta.url), 'utf8')).storySeeds ?? [];
const sentence = (value) => typeof value === "string" && value.trim().length > 0;

const SETTINGS = [
  {id: 'pond', prop: '⛵', activity: 'make a little paper boat', obstacle: 'the boat keeps tipping'},
  {id: 'garden', prop: '🌱', activity: 'plant a small seed together', obstacle: 'the watering can is hard to carry'},
  {id: 'beach', prop: '🏰', activity: 'build a small sandcastle', obstacle: 'the sand walls keep falling'},
  {id: 'forest', prop: '🍃', activity: 'make a leaf picture', obstacle: 'the wind scatters the leaves'},
  {id: 'snow', prop: '⛄', activity: 'build a snow friend', obstacle: 'the snowballs are different sizes'},
  {id: 'playground', prop: '⚽', activity: 'play a gentle ball game', obstacle: 'one friend has not had a turn'},
  {id: 'farm', prop: '🧺', activity: 'prepare a picnic basket', obstacle: 'there is only one little basket'},
  {id: 'campfire', prop: '📖', activity: 'prepare a cozy story circle', obstacle: 'one seat is still empty'},
];
const LESSONS = {
  sharing: ['keep the best part for themselves', 'offer a part they do not want', 'the friend feels left out', 'share a valued part and invite the friend to help'],
  kindness: ['ignore a friend who needs a little care', 'offer help without listening to what the friend needs', 'the friend still feels unseen', 'listen to the friend and choose one useful caring action'],
  honesty: ['hide a small mistake', 'try fixing it quietly without help', 'the friend cannot find what went wrong', 'tell the truth and rebuild together'],
  'taking-turns': ['take another turn too soon', 'ask the friend to wait just one more time', 'the friend stops enjoying the game', 'give the friend a full turn and agree on a simple turn signal'],
  'including-others': ['keep playing with a familiar friend', 'call a vague invitation without making space', 'the quiet friend still cannot join', 'make room and offer the quiet friend a real role'],
  'apology-and-repair': ['rush and spoil a small piece of the work', 'say sorry while continuing to rush', 'the damaged work still needs care', 'slow down, listen, and help restore the damaged piece'],
  perseverance: ['rush through the difficult step', 'try the same step harder without changing it', 'the task remains unfinished', 'change one small step and practice patiently'],
  listening: ['interrupt an important instruction', 'guess the missing instruction', 'the shared work does not fit together', 'listen to the whole idea and ask one useful question'],
  gratitude: ['take quiet help for granted', 'celebrate only their own contribution', 'the helper feels unnoticed', 'notice a specific helpful act and thank the helper warmly'],
  'asking-for-help': ['pretend they already know how', 'struggle alone while saying everything is fine', 'the friend cannot help without knowing the problem', 'ask for one specific kind of help and try alongside the friend'],
  responsibility: ['leave the shared things untidy', 'move the mess where nobody sees it', 'the friend cannot find what they need', 'put the shared things in their proper places together'],
  'keeping-promises': ['get distracted after making a small promise', 'hope the friend will forget the promise', 'the friend has to wait with unfinished work', 'return, explain, and complete the promised task'],
  'fair-play': ['rush ahead to be first', 'change a small game rule to win', 'the game stops feeling fair to the friend', 'restart with fair rules and celebrate the friend too'],
};

/** Content choices are seeded code; the writer supplies words for these beats. */
export function buildStoryBrief({topic, hero, episodes = [], random = () => 0}) {
  const cast = castMembers();
  const choose = pool => pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))];
  const usage = member => episodes.filter(e => e.hero === member.id || e.hero === member.kind).length;
  const least = Math.min(...cast.map(usage));
  const topicHero = topic.toLowerCase().split(/[^a-z]+/).map(word =>
    cast.find(m => m.id === word) ?? cast.find(m => m.kind === hintCharacter(word, cast.map(c => c.kind)))
  ).find(Boolean);
  const lead = hero ?? topicHero ?? choose(cast.filter(member => usage(member) === least));
  const curated = configuredSeeds.find(seed => topic.includes(seed.problem) || topic.includes(seed.moral));
  const seedId = (curated && LESSONS[curated.id] ? curated.id : null) ?? Object.keys(LESSONS).find(id => {
    const aliases = {sharing: 'shar(?:e|es|ed|ing)', kindness: 'kind(?:ness)?|caring', honesty: 'honest|truth|hide|hiding|lie|lying',
      'taking-turns': 'turn', 'including-others': 'invit|includ|welcom|friendship|make friends',
      'apology-and-repair': 'apolog|sorry|spoils', perseverance: 'persever|practice|patient|try again|keep trying',
      listening: 'listen|interrupt', gratitude: 'gratitude|grateful|thank', responsibility: 'responsib|tidy|clean|mess',
      'asking-for-help': 'ask.*help|unfamiliar', 'keeping-promises': 'promise', 'fair-play': 'fair|winning|cheat'};
    return new RegExp(`\\b(?:${aliases[id] ?? id})`, 'i').test(topic);
  }) ?? 'perseverance';
  const recent = episodes.slice(-12);
  const friends = cast.filter(member => member.id !== lead.id);
  const explicitSetting = hintBackground(topic, BACKGROUNDS);
  const settings = explicitSetting ? [SETTINGS.find(setting => setting.id === explicitSetting) ?? {
    id: explicitSetting, prop: '💛', activity: 'finish a small shared project', obstacle: 'one important step needs two friends working together',
  }] : SETTINGS;
  const combinations = settings.flatMap(setting => friends.map(friend => ({setting, friend,
    fingerprint: `${lead.id}|${seedId}|${setting.id}|${friend.id}`})));
  const seen = new Set(recent.map(episode => episode.storyBrief?.fingerprint));
  const fresh = combinations.filter(item => !seen.has(item.fingerprint));
  const pool = fresh.length ? fresh : combinations;
  const picked = choose(pool);
  const [first, second, consequence, repair] = LESSONS[seedId];
  const card = member => ({id: member.id, kind: member.kind, name: member.name, catchphrase: member.catchphrase});
  return {
    seedId, fingerprint: picked.fingerprint, hero: card(lead), friend: card(picked.friend),
    settings: [picked.setting.id], prop: picked.setting.prop,
    goal: `${lead.name} wants to ${picked.setting.activity} with ${picked.friend.name}.`,
    obstacle: picked.setting.obstacle,
    firstAttempt: `${lead.name} tries to ${first}.`,
    secondAttempt: `${lead.name} then tries to ${second}.`,
    consequence: `${picked.friend.name} notices that ${consequence}. Show the feeling briefly and kindly.`,
    repair: `${lead.name} chooses to ${repair}. Make this a visible action.`,
    ending: `Return to the original shared activity. Show ${picked.friend.name} enjoying the repaired result with ${lead.name}.`,
    guidance: 'Adapt the activity to the supplied topic; preserve its explicit problem and moral. Give each attempt a different observable action and result. The hero performs the repair, and the final scene shows the original goal working for both friends. No lecture, instant magic fix, or unrelated subplot.',
  };
}

function validSeed(seed) {
  return seed && sentence(seed.id) && sentence(seed.moral) && sentence(seed.problem);
}

export function storyTopic(seed) {
  if (!validSeed(seed)) throw new Error("story seed needs id, moral, and problem");
  return `Moral: ${seed.moral.trim()} Story problem: ${seed.problem.trim()}`;
}

export function pickStorySeed(seeds, episodes = [], random = Math.random) {
  const valid = (Array.isArray(seeds) ? seeds : []).filter(validSeed);
  if (!valid.length) throw new Error("library/config.json needs at least one valid story seed");
  const usage = new Map(valid.map((seed) => [seed.id, 0]));
  for (const episode of episodes) {
    const seed = valid.find((candidate) => episode?.topic === storyTopic(candidate));
    if (seed) usage.set(seed.id, usage.get(seed.id) + 1);
  }
  const least = Math.min(...usage.values());
  const pool = valid.filter((seed) => usage.get(seed.id) === least);
  return pool[Math.min(pool.length - 1, Math.floor(Math.max(0, random()) * pool.length))];
}

export function planStory(config, episodes, random, hero) {
  const seed = pickStorySeed(config?.storySeeds, episodes, random);
  return {
    topic: storyTopic(seed),
    template: "",
    type: "story",
    hero: hero.id,
    heroName: hero.name,
  };
}

export function storyQualityIssues(script, minutes = 5.5) {
  const scenes = Array.isArray(script?.scenes) ? script.scenes : [];
  const storyScenes = scenes.filter((scene) => scene?.kind === "story");
  const lessonScenes = scenes.filter((scene) => scene?.kind === "lesson");
  const questions = scenes.filter(
    (scene) => scene?.kind === "question" && sentence(scene.question?.answer?.text) &&
      (sentence(scene.question?.praise) || scene.lines?.some(line => line.role === 'praise' && sentence(line.text)))
  );
  const lineCount = scenes.reduce((total, scene) => total + (Array.isArray(scene?.lines) ? scene.lines.length : 0), 0);
  const minimumLines = Math.floor(Number(minutes || 5.5) * 9);
  // Explicit nulls opt into a story ending without a moral or chant.
  const comic = script?.moral === null && script?.moralRhyme === null;
  const issues = [];
  if (script?.type !== "story") issues.push("type must be story");
  if (!comic && !sentence(script?.moral)) issues.push("moral must be one nonempty sentence");
  if (!comic && (!Array.isArray(script?.moralRhyme) || script.moralRhyme.length !== 2 || !script.moralRhyme.every(sentence))) {
    issues.push("moralRhyme must contain exactly two nonempty lines");
  }
  if (scenes[0]?.kind !== "story") issues.push("the opening scene must be the story hook");
  if (storyScenes.length < 6) issues.push("include at least six story scenes");
  if (!comic && !lessonScenes.length) issues.push("include a lesson scene where the hero understands and repairs the problem");
  if (questions.length < 2) issues.push("include at least two question scenes with an answer and praise");
  if (lineCount < minimumLines) issues.push(`include at least ${minimumLines} spoken lines for a ${Number(minutes || 5.5)}-minute story`);
  return issues;
}

/** Preserve the established gate; stronger language evidence stays advisory for permanent and legacy scripts. */
export function storyQualityReport(script, minutes = 5.5) {
  return {issues: storyQualityIssues(script, minutes), audit: auditStory(script)};
}
