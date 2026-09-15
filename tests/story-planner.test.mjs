import assert from "node:assert/strict";
import test from "node:test";
import { pickStorySeed, planStory, storyQualityIssues, storyTopic } from "../scripts/lib/story-planner.mjs";

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
