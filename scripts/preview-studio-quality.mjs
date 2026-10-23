/** Review shared production components using existing recordings only. No library writes. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import ts from 'typescript';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {directScript} from './lib/director.mjs';
import {masterAudio} from './lib/audio-master.mjs';
import {runMedia, verifyEpisode} from './lib/media-check.mjs';
import {VIDEO_ENCODING} from './lib/render-profile.mjs';
import {ROOT, GENERATED_DIR, parseArgs, readScript} from './lib/common.mjs';

const args = parseArgs();
const {slug = 'dev-studio-quality-2026-10-23', stills = false} = args;
const scale = Number(args.scale ?? .5), concurrency = Number(args.concurrency ?? 4);
if (!(scale > 0 && scale <= 1) || !Number.isInteger(concurrency) || concurrency < 1) throw new Error('Use scale 0–1 and a positive concurrency');
if (!/^dev-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Use a lowercase dev- preview slug');
const source = readScript('dev-animation-v3'), sharing = readScript('sample-share');
const question = structuredClone(source.scenes[6]);
question.question.answer.text = 'Water helps our flower grow!';
const moral = structuredClone(sharing.scenes.find(s => s.kind === 'moral' && s.energy === 'upbeat'));
moral.direction = 'celebration';
const dialogue = structuredClone(source.scenes[0]);
dialogue.lines[0].speaker = 'taffy'; dialogue.lines[1].speaker = 'ben';
dialogue.lines[1].vox = [{kind: 'laugh', at: 'end'}];
const bedtime = structuredClone(source.scenes[7]);
bedtime.direction = 'lullaby';
const directory = path.join(GENERATED_DIR, slug), review = path.join(ROOT, 'out/review', slug);
const scriptFile = path.join(directory, 'script.json');
const script = fs.existsSync(scriptFile) ? readScript(slug) : directScript({...structuredClone(source), slug, title: 'Little Moments, Clearer Stories', presentationVersion: 4,
  moral: null, moralRhyme: sharing.moralRhyme, music: {file: 'lullaby.wav', bpm: 75, mood: 'lullaby'},
  scenes: [dialogue, question, moral, bedtime]});

const sources = ['dev-animation-v3', 'sample-share'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const preserved = new Map();
for (const file of fs.readdirSync(path.join(ROOT, 'library/scripts')).filter(f => f.endsWith('.json'))) {
  const absolute = path.join(ROOT, 'library/scripts', file);
  preserved.set(absolute, hash(fs.readFileSync(absolute)));
}
for (const name of sources) {
  const absolute = path.join(GENERATED_DIR, name, 'script.json');
  preserved.set(absolute, hash(fs.readFileSync(absolute)));
}
fs.mkdirSync(directory, {recursive: true});
for (const line of [script.intro, ...script.scenes.flatMap(s => s.lines), script.outro].filter(Boolean)) {
  if (!line.audio || path.basename(line.audio) !== line.audio) throw new Error(`Missing existing audio for ${line.text}`);
  const original = sources.map(name => path.join(GENERATED_DIR, name, line.audio)).find(fs.existsSync);
  if (!original) throw new Error(`Missing recorded speech: ${line.audio}`);
  preserved.set(original, hash(fs.readFileSync(original)));
  const destination = path.join(directory, line.audio);
  if (!fs.existsSync(destination)) fs.copyFileSync(original, destination, fs.constants.COPYFILE_EXCL);
}
if (!fs.existsSync(scriptFile)) fs.writeFileSync(scriptFile, JSON.stringify(script, null, 2), {flag: 'wx'});
fs.mkdirSync(review, {recursive: true});
const timing = ts.transpileModule(fs.readFileSync(path.join(ROOT, 'src/lib/timing.ts'), 'utf8'),
  {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText;
const {computeSchedule} = await import(`data:text/javascript;base64,${Buffer.from(timing).toString('base64')}`);
const schedule = computeSchedule(script);
const picks = [
  {file: 'named-dialogue.png', frame: schedule.scenes[0].from + schedule.scenes[0].lines[1].from + 24},
  {file: 'complete-answer.png', frame: schedule.scenes[1].from + schedule.scenes[1].revealFrom + 25},
  {file: 'moral-chant.png', frame: schedule.scenes[2].from + 45},
  {file: 'bedtime-scene.png', frame: schedule.scenes[3].from + 45},
  {file: 'quiet-goodbye.png', frame: schedule.endFrom + 45},
];
const publicDir = fs.mkdtempSync('/tmp/dreamy-quality-public-'), bundleDir = fs.mkdtempSync('/tmp/dreamy-quality-bundle-');
let browser;
try {
  fs.mkdirSync(path.join(publicDir, 'generated'));
  fs.cpSync(directory, path.join(publicDir, 'generated', slug), {recursive: true});
  fs.mkdirSync(path.join(publicDir, 'baked'));
  const bakedFile = path.join(ROOT, 'public/baked/manifest.json');
  const available = fs.existsSync(bakedFile) ? JSON.parse(fs.readFileSync(bakedFile, 'utf8')) : {}, baked = {};
  for (const kind of new Set(script.scenes.map(scene => scene.background))) if (available[kind]) {
    fs.copyFileSync(path.join(ROOT, 'public/baked', available[kind]), path.join(publicDir, 'baked', available[kind]));
    baked[kind] = available[kind];
  }
  fs.writeFileSync(path.join(publicDir, 'baked/manifest.json'), JSON.stringify(baked));
  for (const folder of ['fonts', 'music', 'sfx', 'brand', 'vox']) {
    const original = path.join(ROOT, 'public', folder);
    if (fs.existsSync(original)) fs.cpSync(original, path.join(publicDir, folder), {recursive: true});
  }
  const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir, outDir: bundleDir});
  browser = await openBrowser('chrome');
  const inputProps = {slug, script}, composition = await selectComposition({serveUrl, id: 'Video', inputProps, puppeteerInstance: browser, logLevel: 'error'});
  for (const pick of picks) {
    await renderStill({serveUrl, composition, inputProps, puppeteerInstance: browser, frame: pick.frame, scale,
      imageFormat: 'png', output: path.join(review, pick.file), logLevel: 'error'});
    console.log(`[quality] ${pick.file}`);
  }
  if (!stills) {
    const video = path.join(review, 'quality-reel.mp4'), raw = path.join(review, 'mix.wav'), audio = path.join(review, 'master.aac');
    let reported = -1;
    await renderMedia({...VIDEO_ENCODING, serveUrl, composition, inputProps, puppeteerInstance: browser, codec: 'h264', muted: true,
      scale, concurrency, imageFormat: 'jpeg', outputLocation: video, overwrite: true, logLevel: 'error',
      onProgress: ({progress}) => {const step = Math.floor(progress * 10); if (step > reported) {reported = step; console.log(`[quality] video ${step * 10}%`);}}});
    reported = -1;
    await renderMedia({serveUrl, composition, inputProps, puppeteerInstance: browser, codec: 'wav', concurrency,
      outputLocation: raw, overwrite: true, logLevel: 'error',
      onProgress: ({progress}) => {const step = Math.floor(progress * 10); if (step > reported) {reported = step; console.log(`[quality] audio ${step * 10}%`);}}});
    const loudness = masterAudio(raw, audio), muxed = path.join(review, 'quality-reel.mastered.mp4');
    runMedia('ffmpeg', ['-y', '-v', 'error', '-i', video, '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-movflags', '+faststart', muxed]);
    fs.renameSync(muxed, video);
    fs.writeFileSync(path.join(review, 'loudness.json'), JSON.stringify(loudness, null, 2));
    fs.writeFileSync(path.join(review, 'verification.json'), JSON.stringify(verifyEpisode(video, {frames: schedule.total}), null, 2));
  }
  for (const [file, digest] of preserved) if (hash(fs.readFileSync(file)) !== digest) throw new Error(`Source changed: ${file}`);
  const manifest = {slug, composition: 'Video', sources, scale, fps: 30, frames: schedule.total, durationSec: schedule.total / 30,
    encoding: VIDEO_ENCODING, sourceFilesVerifiedUnchanged: preserved.size, picks};
  fs.writeFileSync(path.join(review, 'manifest.json'), JSON.stringify(manifest, null, 2));
  fs.writeFileSync(path.join(review, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dreamy Discoveries · Quality review</title><style>body{margin:0;background:#f7f2e9;color:#51425c;font:17px/1.6 system-ui}main{max-width:1100px;margin:auto;padding:32px 20px}h1{line-height:1.15}video,img{width:100%;border-radius:14px}.frames{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:20px}figure{margin:0}figcaption{margin:6px 0 20px}</style><main><h1>Clearer little moments.</h1><p>A production-component review reel using existing recordings: named dialogue, a complete answer, both moral lines, and a quiet bedtime goodbye. The brighter shared grade and surface contacts remain active. This is a review montage, not a new episode.</p><video controls playsinline preload="metadata" poster="moral-chant.png" src="quality-reel.mp4"></video><div class="frames">${picks.map(p => `<figure><img loading="lazy" alt="${p.file.replace('.png', '').replaceAll('-', ' ')}" src="${p.file}"><figcaption>${p.file.replace('.png', '').replaceAll('-', ' ')}</figcaption></figure>`).join('')}</div></main></html>`);
  console.log(`[quality] ${review}/index.html`);
} finally {
  if (browser) await browser.close({silent: true});
  fs.rmSync(publicDir, {recursive: true, force: true});
  fs.rmSync(bundleDir, {recursive: true, force: true});
}
