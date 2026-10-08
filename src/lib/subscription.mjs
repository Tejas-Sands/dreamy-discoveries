/** Visual reminders reuse the existing timeline; script text and voice hashes stay untouched. */
export function subscriptionReminders(script, schedule, fps = 30) {
  const duration = Math.round(5 * fps);
  const end = { placement: 'end', from: schedule.endFrom, duration: Math.min(duration, schedule.endDuration) };
  // Let the opening title leave before a reminder can appear, including hook openings.
  const first = Math.max(schedule.intro, Math.round(2.8 * fps));
  const available = schedule.endFrom - first;
  if (available <= 0) return [end];
  const middleDuration = Math.min(duration, available);
  const last = schedule.endFrom - middleDuration;
  const target = Math.max(first, Math.min(last, Math.round(schedule.total / 2)));
  const near = Math.max(duration, Math.round((schedule.endFrom - schedule.intro) * 0.2));
  const candidates = schedule.scenes.map(slot => slot.from)
    .filter(from => from >= first && from <= last && Math.abs(from - target) <= near);
  const busy = from => schedule.scenes.some((slot, i) => {
    const scene = script.scenes[i];
    return (scene?.question || /chant|chorus|moral/.test(scene?.kind ?? '')) &&
      slot.from < from + middleDuration && slot.from + slot.duration > from;
  });
  // Prefer an ordinary scene boundary nearby; an all-question episode still gets a reminder.
  candidates.sort((a, b) => Number(busy(a)) - Number(busy(b)) || Math.abs(a - target) - Math.abs(b - target) || a - b);
  return [{ placement: 'middle', from: candidates[0] ?? target, duration: middleDuration }, end];
}
