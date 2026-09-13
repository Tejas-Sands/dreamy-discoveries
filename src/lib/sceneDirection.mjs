const DIRECTIONS = ['dialogue', 'demonstration', 'thinking', 'celebration', 'lullaby', 'tender'];
const SLEEPY = /\b(lullaby|bedtime|goodnight|good night|sleepy|asleep)\b/i;
const DEMONSTRATION = /\b(clap|clapping|stomp|stomping|jump|jumping|hop|hopping|spin|spinning|count|counting|point|pointing)\b/i;

/** Shared, frame-independent intent for directed and legacy scripts. */
export function sceneDirection(scene, script = {}) {
  if (DIRECTIONS.includes(scene.direction)) return scene.direction;
  if (scene.kind === 'question' || scene.question) return 'thinking';
  const lines = scene.lines ?? [];
  const sleepy = (line) => line.emotion === 'sleepy' || line.action === 'sleep' || SLEEPY.test(line.text);
  if (script.template === 'lullaby' || script.music === 'lullaby' || script.music?.mood === 'lullaby' ||
      SLEEPY.test(script.title ?? '') || scene.emotion === 'sleepy' || scene.action === 'sleep' ||
      (lines.length > 0 && lines.filter(sleepy).length > lines.length / 2)) return 'lullaby';
  if (scene.kind === 'lesson' || (scene.kind === 'moral' && scene.energy === 'calm')) return 'tender';
  if (scene.kind === 'chorus' || (scene.kind === 'moral' && scene.energy === 'upbeat')) return 'celebration';
  const tender = (line) => ['love', 'sad', 'worried'].includes(line.emotion) || ['hug', 'cry'].includes(line.action);
  if (scene.energy !== 'upbeat' && (['love', 'sad', 'worried'].includes(scene.emotion) ||
      (lines.length > 0 && lines.filter(tender).length > lines.length / 2))) return 'tender';
  if (scene.prop || DEMONSTRATION.test(scene.action ?? '') || lines.some((line) => DEMONSTRATION.test(line.action ?? '') || DEMONSTRATION.test(line.text))) return 'demonstration';
  return 'dialogue';
}
