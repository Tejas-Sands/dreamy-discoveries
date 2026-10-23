const FPS = 30;
const frames = seconds => Math.round(seconds * FPS);
const CLIP_GAP = 2;
const END_ANCHOR = 3;

const seedOf = text => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0) % 100000;
};

/** Pins are independent of the current registry; null pins deliberately retain silence. */
export function voxRecording(cue, key, index, catalog, publicOnly = false) {
  if (cue.file === null) return null;
  if (typeof cue.file === 'string' && cue.durationSec > 0) return {file: cue.file, durationSec: cue.durationSec};
  const list = (catalog[cue.kind] ?? []).filter(item => !publicOnly || item.file.startsWith('vox/'));
  return list.length ? list[seedOf(`${key}:${cue.kind}:${index}`) % list.length] : null;
}

/** Includes exactly the same clip gaps and speech-to-reaction anchor as playback. */
export function voxRoom(cues) {
  let pre = 0, post = 0;
  for (const cue of cues ?? []) {
    if (!cue.file || !(cue.durationSec > 0)) continue;
    const length = frames(cue.durationSec) + CLIP_GAP;
    if (cue.at === 'start') pre += length;
    else post += length;
  }
  return {pre: pre / FPS, post: (post ? post + END_ANCHOR : 0) / FPS};
}

export function resolveVoxEvents(line, speechFrom, pre, key, catalog) {
  let startCursor = speechFrom - pre;
  let endCursor = speechFrom + frames(line?.durationSec ?? 2.2) + END_ANCHOR;
  const events = [];
  (line?.vox ?? []).forEach((cue, index) => {
    const recording = voxRecording(cue, key, index, catalog);
    if (!recording) return;
    const length = frames(recording.durationSec) + CLIP_GAP;
    const from = cue.at === 'start' ? startCursor : endCursor;
    if (cue.at === 'start') startCursor += length;
    else endCursor += length;
    events.push({...recording, from, kind: cue.kind, speaker: cue.speaker ?? line.speaker});
  });
  return events;
}
