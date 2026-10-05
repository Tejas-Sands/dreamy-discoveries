/** Offline, advisory text evidence. A candidate is a cue for a human reader, not proof of story meaning. */
const normalize = text => String(text ?? '').replace(/\{[^}]+\}/g, '').toLowerCase().replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
const ignored = new Set('a an the i we you he she it they our my your their his her its to with for of in on at and or but some little small first then next again try tries tried attempt attempts taffy ben daisy fiona grandpa tilly professor ozzy together can could should will would want wants need needs let us'.split(' '));
const tokens = text => new Set(normalize(text).split(' ').filter(word => word && !/^\d+$/.test(word) && !ignored.has(word)));
const overlap = (left, right) => [...left].filter(word => right.has(word)).length;
const similar = (left, right) => overlap(left, right) / Math.max(1, Math.min(left.size, right.size)) >= .8;
const problem = /\b(?:oh no|can't|cannot|won't|missing|lost|broken|broke|torn|tore|tipp?ing|falls?|falling|spills?|stuck|scattered|empty|left out|not (?:fit|enough)|where (?:is|did)|hard to)\b/i;
const goal = /\b(?:want(?:s)? to|hope(?:s)? to|let(?:'s| us)|going to|need(?:s)? to)\s+(?:\w+\s+){0,2}(?:build|make|sail|plant|play|find|carry|finish|join|paint|draw|share|help|prepare|fix|return|learn|clean|give)\b/i;
const strategy = /\b(?:hide[sd]?|hid|tie[sd]?|tying|pull[sed]*|push[sed]*|stack[sed]*|grab[bsed]*|rush[esd]*|guess[esd]*|wrap[sped]*|pour[sed]*|keep[sing]*|kept|offer[sed]*|ask[sed]*|move[sd]*|roll[sed]*|cover[sed]*|turn[sed]*|take[sn]?|took|pretend[sed]*|ignore[sd]*|change[sd]*|try|tries|tried)\b/i;
const strategyKey = text => {
  const matches = [...text.matchAll(new RegExp(strategy.source, 'ig'))].map(match => match[0].toLowerCase()).filter(word => !['try', 'tries', 'tried'].includes(word));
  return (matches[0] ?? 'try').replace(/^hid$/, 'hide').replace(/^tying$/, 'tie').replace(/^kept$/, 'keep').replace(/^took$/, 'take').replace(/(?:ed|ing|s)$/, '');
};
const repair = /\b(?:tape[sd]?|mend[sed]*|patch[esd]*|repair[sed]*|rebuild[sing]*|rebuilt|fix[esd]*|restore[sd]*|share[sd]?|gave|give[sn]?|hand[sed]*|return[sed]*|replace[sd]*|clean[sed]*|listen[sed]*|invite[sd]*|help[sed]*|thank[sed]*|make room|made room|tell[sing]*.*truth|told.*truth)\b/i;
const result = /\b(?:floats?|works?|stands?|fits?|holds?|stays?|finished|complete[sd]?|fixed|repaired|restored|has (?:a|the|their) turn|can (?:join|play|find|carry)|smiles?|enjoy[sed]*|sail[sed]* together|no longer|not .*anymore)\b/i;
const moralWords = /\b(?:kindness|honesty|sharing|caring|lesson|learned|always|best choice|good friend|important|moral)\b/i;
const negated = text => /\b(?:cannot|can't|couldn't|won't|didn't|doesn't|isn't|wasn't|not|never|unable)\b/i.test(text);

function linesOf(script) {
  return (script?.scenes ?? []).flatMap((scene, sceneIndex) => (scene.lines ?? []).map((line, lineIndex) => ({
    sceneIndex, sceneNumber: sceneIndex + 1, lineIndex, lineNumber: lineIndex + 1,
    text: String(line.text ?? ''), speaker: line.speaker ?? 'unknown', action: line.action ?? null,
    kind: scene.kind, role: line.role ?? null,
  }))).filter(line => line.text.trim());
}

const beat = (evidence, explanation, needed = 1) => ({
  status: evidence.length >= needed ? 'candidate' : evidence.length ? 'uncertain' : 'missing',
  evidence, explanation,
});
const concrete = (text, match) => {
  if (!match) return false;
  const rest = text.slice(match.index + match[0].length);
  const words = tokens(rest);
  for (const word of ['it', 'something', 'anything', 'things', 'thing', 'kind', 'fine', 'better', 'harder', 'once', 'more', 'beat', 'scene', 'line', 'step', 'mistake', 'problem', 'kindness', 'honesty']) words.delete(word);
  return words.size > 0;
};

export function auditStory(script) {
  const lines = linesOf(script);
  const plot = lines.filter(line => ['story', 'lesson', 'question'].includes(line.kind) && line.role !== 'praise');
  const order = line => lines.indexOf(line);
  const firstScene = plot[0]?.sceneIndex;
  const hookLines = plot.filter(line => line.sceneIndex === firstScene).slice(0, 2).filter(line => problem.test(line.text));
  const goalLines = plot.filter(line => goal.test(line.text)).slice(0, 1);
  const choiceLines = plot.filter(line => /\b(?:could .*\bor\b|choose to|chooses to|chose to|decide[sd]? to|should .*\bor\b)\b/i.test(line.text)).slice(0, 2);
  const choiceStart = choiceLines[0] ? order(choiceLines[0]) : Infinity;
  const attempts = plot.filter(line => order(line) < choiceStart &&
    /\b(?:first|then|next|try|tries|tried|attempt|instead)\b/i.test(line.text) && concrete(line.text, strategy.exec(line.text)));
  const uniqueAttempts = [];
  const findings = [];
  for (const attempt of attempts) {
    const duplicate = uniqueAttempts.find(previous => strategyKey(previous.text) === strategyKey(attempt.text) && similar(tokens(previous.text), tokens(attempt.text)));
    if (duplicate) findings.push({code: 'duplicate-attempt', severity: 'warning',
      message: 'These attempts use similar words; a different strategy is not established.', evidence: [duplicate, attempt]});
    else uniqueAttempts.push(attempt);
  }
  const afterAttempt = Math.max(-1, ...uniqueAttempts.map(order), ...choiceLines.map(order));
  const repairLines = plot.filter(line => order(line) > afterAttempt && !negated(line.text) && !/\b(?:can|could|should|will|would|want(?:s)? to|need(?:s)? to|choose(?:s)? to)\b/i.test(line.text) && concrete(line.text, repair.exec(line.text))).slice(0, 1);
  const goalWords = tokens(goalLines[0]?.text);
  const payoffLines = repairLines.length && goalLines.length ? plot.filter(line =>
    order(line) > order(repairLines[0]) && !negated(line.text) && result.test(line.text) && overlap(tokens(line.text), goalWords) > 0).slice(0, 2) : [];
  const beats = {
    hook: beat(hookLines, 'A concrete problem or discovery in the opening dialogue.'),
    goal: beat(goalLines, 'An expressed goal with a concrete activity; the brief alone is not evidence.'),
    attempts: beat(uniqueAttempts, 'Two textually distinct attempts before the choice; similarity does not prove their meaning.', 2),
    choice: beat(choiceLines, 'Spoken alternatives or an expressed decision; question count alone is not a choice.'),
    repair: beat(repairLines, 'A concrete reparative act after the attempts or decision; an apology or promise alone is insufficient.'),
    payoff: beat(payoffLines, 'A result after the repair that repeats words from the original goal; a cheer alone is insufficient.'),
  };
  for (const [name, value] of Object.entries(beats)) {
    if (value.status !== 'candidate') findings.push({code: `missing-${name}`, severity: 'warning', message: `${name}: ${value.explanation}`, evidence: value.evidence});
  }
  const repeated = new Map();
  const catchphrase = normalize(script?.storyBrief?.hero?.catchphrase);
  for (const line of plot) {
    const key = normalize(line.text);
    if (key === catchphrase) continue;
    if (!repeated.has(key)) repeated.set(key, []);
    repeated.get(key).push(line);
  }
  for (const evidence of repeated.values()) {
    if (evidence.length >= 3) findings.push({code: 'repeated-dialogue', severity: 'warning',
      message: `The same dialogue appears ${evidence.length} times outside the moral/praise sections. Check whether the repetition advances the story.`, evidence});
  }
  const ending = plot.slice(-4);
  const moralEnding = ending.filter(line => moralWords.test(line.text) ||
    (tokens(script?.moral).size > 1 && overlap(tokens(line.text), tokens(script?.moral)) >= 2));
  if (!payoffLines.length && (moralEnding.length || lines.some(line => line.kind === 'moral'))) {
    findings.push({code: 'unearned-moral', severity: 'warning',
      message: 'The ending states a lesson without clear evidence that the repair achieves the original goal.', evidence: moralEnding});
  }
  return {version: 1, advisory: true, title: script?.title ?? null, slug: script?.slug ?? null, beats, findings,
    uncertainties: ['English keyword heuristics find candidates, not semantic proof. A human should read the cited scenes.',
      'Missing evidence means the audit did not establish the beat; visual intent, a scene label or the planning brief cannot prove it.']};
}

export function storyAuditText(report) {
  const rows = [`Story audit: ${report.title ?? report.slug ?? 'untitled'} (advisory)`];
  for (const [name, value] of Object.entries(report.beats)) {
    rows.push(`${name}: ${value.status}. ${value.explanation}`);
    for (const item of value.evidence) rows.push(`  scene ${item.sceneNumber}, line ${item.lineNumber}: ${JSON.stringify(item.text)}`);
  }
  for (const item of report.findings) rows.push(`Warning [${item.code}]: ${item.message}`);
  rows.push(...report.uncertainties);
  return rows.join('\n');
}
