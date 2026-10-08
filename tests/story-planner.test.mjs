import assert from "node:assert/strict";
import test from "node:test";
import { pickStorySeed, planStory, storyQualityIssues, storyTopic } from "../scripts/lib/story-planner.mjs";
import * as planner from '../scripts/lib/story-planner.mjs';
import {castMembers, castPrompt} from '../scripts/lib/cast.mjs';

test('story briefs give every hero a concrete goal, setting, attempts and repair', () => {
  assert.equal(typeof planner.buildStoryBrief, 'function');
  for (const hero of castMembers()) {
    const brief = planner.buildStoryBrief({topic: storyTopic(honesty), hero, random: () => .2});
    assert.equal(brief.hero.id, hero.id);
    assert.notEqual(brief.friend.id, hero.id);
    assert.ok(castMembers().some(member => member.kind === brief.friend.kind));
    for (const key of ['goal', 'firstAttempt', 'secondAttempt', 'consequence', 'repair', 'ending', 'fingerprint']) assert.ok(brief[key]?.length > 8, key);
    assert.notEqual(brief.firstAttempt, brief.secondAttempt);
    assert.ok(brief.settings.length >= 1 && brief.settings.length <= 2);
    assert.deepEqual(brief, planner.buildStoryBrief({topic: storyTopic(honesty), hero, random: () => .2}));
  }
});

test('recent story combinations are avoided even with the same deterministic choice', () => {
  assert.equal(typeof planner.buildStoryBrief, 'function');
  const options = {topic: storyTopic(sharing), hero: castMembers()[0], random: () => 0};
  const first = planner.buildStoryBrief(options);
  const next = planner.buildStoryBrief({...options, episodes: [{storyBrief: first}]});
  assert.notEqual(next.fingerprint, first.fingerprint);
});

test('generated cast prompt includes every available design and skips unrenderable family names', () => {
  const prompt = castPrompt();
  assert.doesNotMatch(prompt, /Toto|Grandma Nana/);
  for (const hero of castMembers()) assert.ok(prompt.includes(hero.name));
});

test('topics retain their named hero and explicit everyday moral words', () => {
  for (const [topic, hero, seed] of [
    ['a shy turtle who learns to share', 'tilly', 'sharing'],
    ['a little fox who learns to be kind', 'fiona', 'kindness'],
    ['Ben learns to take turns', 'ben', 'taking-turns'],
    ['Professor Ozzy learns to say thank you', 'ozzy', 'gratitude'],
  ]) {
    const brief = planner.buildStoryBrief({topic, random: () => 0});
    assert.equal(brief.hero.id, hero, topic);
    assert.equal(brief.seedId, seed, topic);
  }
});

test('unnamed heroes rotate through the least-used cast with seeded tie breaking', () => {
  const episodes = [{hero: 'bunny'}, {hero: 'bear'}, {hero: 'duck'}, {hero: 'fox'}, {hero: 'turtle'}];
  const brief = planner.buildStoryBrief({topic: 'A friend keeps a promise', episodes, random: () => 0});
  assert.equal(brief.hero.id, 'ozzy');
  assert.equal(planner.buildStoryBrief({topic: 'A friend keeps a promise', random: () => .99}).hero.id, castMembers().at(-1).id);
  assert.equal(planner.buildStoryBrief({topic: 'A shy turtle learns to share', hero: castMembers()[1]}).hero.id, 'ben');
});

test('explicit supported settings survive the brief, and moral matching respects word boundaries', () => {
  const pond = planner.buildStoryBrief({topic: 'Ben learns to share at the pond', random: () => .99});
  assert.deepEqual(pond.settings, ['pond']);
  assert.equal(pond.seedId, 'sharing');
  assert.deepEqual(planner.buildStoryBrief({topic: 'Daisy says thank you in the kitchen'}).settings, ['kitchen']);
  assert.equal(planner.buildStoryBrief({topic: 'Fiona believes she can keep trying'}).seedId, 'perseverance');
});

const sharing = {
  id: "sharing",
  moral: "Sharing turns something small into joy for everyone.",
  problem: "The hero has one special treat and a friend hopes to join.",
};
const honesty = {
  id: "honesty",
  moral: "Telling the truth helps us fix our mistakes.",
  problem: "The hero accidentally breaks a friend's little creation.",
};

test("story seed selection ignores malformed entries and prefers unused morals", () => {
  const episodes = [{ topic: storyTopic(sharing) }, { topic: storyTopic(sharing) }];
  const chosen = pickStorySeed([
    { id: "", moral: "Missing an id", problem: "A problem" },
    { id: "bad", moral: "", problem: "A problem" },
    sharing,
    honesty,
  ], episodes, () => 0);
  assert.deepEqual(chosen, honesty);
});

test("equally used story seeds use the supplied deterministic choice", () => {
  const episodes = [{ topic: storyTopic(sharing) }, { topic: storyTopic(honesty) }];
  assert.deepEqual(pickStorySeed([sharing, honesty], episodes, () => 0.99), honesty);
});

test("story topics carry one moral and one cast-neutral problem", () => {
  assert.equal(
    storyTopic(sharing),
    "Moral: Sharing turns something small into joy for everyone. Story problem: The hero has one special treat and a friend hopes to join."
  );
});

test("autopilot always emits a curated moral story", () => {
  assert.deepEqual(planStory({ storySeeds: [sharing] }, [], () => 0, { id: "taffy", name: "Taffy" }), {
    topic: storyTopic(sharing),
    template: "",
    type: "story",
    hero: "taffy",
    heroName: "Taffy",
  });
});

function validStory() {
  const storyScene = (n) => ({
    kind: "story",
    lines: Array.from({ length: 6 }, (_, i) => ({ text: `Story beat ${n}-${i}.` })),
  });
  const question = (answer) => ({
    kind: "question",
    question: { answer: { text: answer }, praise: `Yes, ${answer}!` },
    lines: [{ text: "What should our friend do?" }],
  });
  return {
    type: "story",
    moral: "Kind choices help every friend feel welcome.",
    moralRhyme: ["Kindness grows when it is shared!", "Show your friends how much you cared!"],
    scenes: [
      storyScene(1),
      storyScene(2),
      question("share"),
      storyScene(3),
      storyScene(4),
      question("tell the truth"),
      storyScene(5),
      storyScene(6),
      storyScene(7),
      { kind: "lesson", lines: Array.from({ length: 5 }, (_, i) => ({ text: `Repair beat ${i}.` })) },
    ],
  };
}

test("a hook-led moral story passes the structural quality gate", () => {
  assert.deepEqual(storyQualityIssues(validStory(), 5.5), []);
});

test('a comic story can deliberately omit its moral, rhyme and lesson scene', () => {
  const script = validStory();
  script.moral = null;
  script.moralRhyme = null;
  script.scenes = script.scenes.map(scene => scene.kind === 'lesson' ? {...scene, kind: 'story'} : scene);
  assert.deepEqual(storyQualityIssues(script, 5.5), []);
  script.moralRhyme = ['Unexpected chant!', 'Please do not chant!'];
  assert.ok(storyQualityIssues(script, 5.5).length);
});

test('directed questions retain valid praise after it moves into a spoken line', () => {
  const script = validStory();
  for (const scene of script.scenes.filter(scene => scene.kind === 'question')) {
    scene.lines.push({text: scene.question.praise, role: 'praise'});
    delete scene.question.praise;
  }
  assert.deepEqual(storyQualityIssues(script, 5.5), []);
});

test('structurally valid stories get an advisory evidence report without rejecting legacy dialogue', () => {
  assert.equal(typeof planner.storyQualityReport, 'function');
  const script = validStory();
  const report = planner.storyQualityReport(script, 5.5);
  assert.deepEqual(report.issues, []);
  assert.equal(report.audit.advisory, true);
  assert.equal(report.audit.beats.repair.status, 'missing');
  assert.deepEqual(script, validStory(), 'quality reporting does not annotate permanent scripts');
});

test("story quality reports every missing structural beat", () => {
  const weak = validStory();
  weak.type = "rhyme";
  weak.moral = "";
  weak.moralRhyme = ["Only one line"];
  weak.scenes = [
    { kind: "question", question: null, lines: [{ text: "Ready?" }] },
    { kind: "story", lines: [{ text: "A very short story." }] },
  ];
  const issues = storyQualityIssues(weak, 5.5);
  assert.deepEqual(issues, [
    "type must be story",
    "moral must be one nonempty sentence",
    "moralRhyme must contain exactly two nonempty lines",
    "the opening scene must be the story hook",
    "include at least six story scenes",
    "include a lesson scene where the hero understands and repairs the problem",
    "include at least two question scenes with an answer and praise",
    "include at least 49 spoken lines for a 5.5-minute story",
  ]);
});
