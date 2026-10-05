/** Compact amplitude measurements from Kokoro's existing PCM, once per cached line. */
export function speechEnvelope(samples, sampleRate) {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('Invalid speech sample rate');
  const fps = 20;
  const values = [];
  for (let frame = 0; frame < Math.ceil(samples.length / sampleRate * fps); frame++) {
    const start = Math.floor(frame * sampleRate / fps);
    const end = Math.min(samples.length, Math.floor((frame + 1) * sampleRate / fps));
    let energy = 0;
    for (let i = start; i < end; i++) energy += samples[i] * samples[i];
    values.push(Math.sqrt(energy / Math.max(1,end-start)));
  }
  let peak = .015;
  for (const value of values) peak = Math.max(peak,value);
  return {fps,values:values.map(value => value < .008 ? 0 : +Math.min(1,Math.pow(value / peak,.65)).toFixed(3))};
}
