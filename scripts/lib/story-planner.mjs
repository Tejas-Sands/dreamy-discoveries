const sentence = (value) => typeof value === "string" && value.trim().length > 0;

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
    (scene) => scene?.kind === "question" && sentence(scene.question?.answer?.text) && sentence(scene.question?.praise)
  );
  const lineCount = scenes.reduce((total, scene) => total + (Array.isArray(scene?.lines) ? scene.lines.length : 0), 0);
  const minimumLines = Math.floor(Number(minutes || 5.5) * 9);
  const issues = [];
  if (script?.type !== "story") issues.push("type must be story");
  if (!sentence(script?.moral)) issues.push("moral must be one nonempty sentence");
  if (!Array.isArray(script?.moralRhyme) || script.moralRhyme.length !== 2 || !script.moralRhyme.every(sentence)) {
    issues.push("moralRhyme must contain exactly two nonempty lines");
  }
  if (scenes[0]?.kind !== "story") issues.push("the opening scene must be the story hook");
  if (storyScenes.length < 6) issues.push("include at least six story scenes");
  if (!lessonScenes.length) issues.push("include a lesson scene where the hero understands and repairs the problem");
  if (questions.length < 2) issues.push("include at least two question scenes with an answer and praise");
  if (lineCount < minimumLines) issues.push(`include at least ${minimumLines} spoken lines for a ${Number(minutes || 5.5)}-minute story`);
  return issues;
}
