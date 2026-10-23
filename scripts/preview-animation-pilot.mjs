import {VIDEO_ENCODING} from './lib/render-profile.mjs';
/** Throwaway 24-second acting study, using exclusively existing recorded speech. */
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {directScript} from './lib/director.mjs';
import {masterAudio} from './lib/audio-master.mjs';
import {runMedia, verifyEpisode} from './lib/media-check.mjs';
import {GENERATED_DIR, ROOT, parseArgs, readScript} from './lib/common.mjs';
import {selectReviewFrames} from './review-quality.mjs';

const args = parseArgs();
const colorGrade = args.grade ?? 'production';
if (!['original', 'sunny', 'vivid', 'production'].includes(colorGrade)) throw new Error('Grade must be original, sunny, vivid or production');
const slug = args.slug ?? (colorGrade === 'original' ? 'dev-animation-pilot-2026-10-23' : `dev-animation-pilot-${colorGrade}-2026-10-23`);
const sourceSlug = args.source ?? 'dev-animation-v3';
if (!/^dev-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Use a lowercase dev- preview slug');
const source = readScript(sourceSlug);
const script = directScript({...structuredClone(source), slug, scenes: [structuredClone(source.scenes[0])]});
if (script.scenes[0].character !== 'bunny' || script.scenes[0].secondCharacter !== 'bear'
  || script.scenes[0].lines[0]?.text !== 'Oops! My ball is rolling away!'
  || script.scenes[0].lines[1]?.text !== 'I caught it, Taffy!') throw new Error('Pilot requires the recorded Taffy/Ben rolling-ball scene');
const directory = path.join(GENERATED_DIR, slug);
const review = path.join(ROOT, 'out/review', slug);
const files = [...new Set([script.intro, ...script.scenes.flatMap(s => s.lines), script.outro].filter(Boolean).map(line => line.audio).filter(Boolean))];
for (const file of files) if (path.basename(file) !== file || !fs.existsSync(path.join(GENERATED_DIR, sourceSlug, file))) throw new Error(`Missing recorded speech: ${file}`);
fs.mkdirSync(directory, {recursive: true});
for (const file of files) {
  const destination = path.join(directory, file);
  if (!fs.existsSync(destination)) fs.copyFileSync(path.join(GENERATED_DIR, sourceSlug, file), destination, fs.constants.COPYFILE_EXCL);
}
const scriptFile = path.join(directory, 'script.json');
if (!fs.existsSync(scriptFile)) fs.writeFileSync(scriptFile, JSON.stringify(script, null, 2), {flag: 'wx'});
fs.mkdirSync(review, {recursive: true});

// Keep browser bundling small: copy only this study's existing public assets.
const publicDir = fs.mkdtempSync(path.join('/tmp', 'dreamy-pilot-public-'));
const bundleDir = fs.mkdtempSync(path.join('/tmp', 'dreamy-pilot-bundle-'));
let browser;
try {
  fs.mkdirSync(path.join(publicDir, 'generated'), {recursive: true});
  fs.cpSync(directory, path.join(publicDir, 'generated', slug), {recursive: true});
  if(args.gallery&&sourceSlug!==slug)fs.cpSync(path.join(GENERATED_DIR,sourceSlug),path.join(publicDir,'generated',sourceSlug),{recursive:true});
  for (const folder of ['fonts', 'music', 'sfx']) fs.cpSync(path.join(ROOT, 'public', folder), path.join(publicDir, folder), {recursive: true});
  const manifestFile = path.join(ROOT, 'public/baked/manifest.json');
  if (fs.existsSync(manifestFile)) {
    const meadow = JSON.parse(fs.readFileSync(manifestFile, 'utf8')).meadow;
    if (meadow) {
      fs.mkdirSync(path.join(publicDir, 'baked'));
      fs.copyFileSync(path.join(ROOT, 'public/baked', meadow), path.join(publicDir, 'baked', meadow));
      fs.writeFileSync(path.join(publicDir, 'baked/manifest.json'), JSON.stringify({meadow}));
    }
  }
  console.log('[pilot] Bundling production rigs and cached assets');
  const serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir, outDir: bundleDir});
  browser = await openBrowser('chrome');
  const inputProps = {slug, script: null, colorGrade};
  const composition = await selectComposition({serveUrl, id: 'Animation-Pilot', inputProps, puppeteerInstance: browser, logLevel: 'error'});
  const beats = [1.8, 3.65, 5, 6.3, 7.7, 10.1, 14, 21.5];
  for (let i = 0; i < beats.length; i++) {
    await renderStill({serveUrl, composition, inputProps, puppeteerInstance: browser, frame: Math.round(beats[i] * 30), scale: .5,
      imageFormat: 'png', output: path.join(review, `beat-${i + 1}.png`), logLevel: 'error'});
  }
  console.log('[pilot] Eight storyboard frames rendered');
  const gallery=[];
  if(args.gallery) {
    const picks=[{id:'Sheet-Species',props:{},frame:45,file:'all-38-characters.png'},
      {id:'Sheet-Backgrounds',props:{},frame:45,file:'all-25-backgrounds.png'},
      ...['night','bedroom','snow','underwater'].map(kind=>({id:'Background-Preview',props:{kind},frame:45,file:`setting-${kind}.png`})),
      ...selectReviewFrames(source).filter(p=>['dialogue','handover','question'].includes(p.kind)).map(p=>({id:'Video',props:{slug:sourceSlug,script:source},frame:p.frame,file:`production-${p.kind}.png`}))];
    for(const pick of picks) {
      const selected=await selectComposition({serveUrl,id:pick.id,inputProps:pick.props,puppeteerInstance:browser,logLevel:'error'});
      await renderStill({serveUrl,composition:selected,inputProps:pick.props,puppeteerInstance:browser,frame:pick.frame,scale:.5,
        imageFormat:'png',output:path.join(review,pick.file),logLevel:'error'});
      gallery.push(pick.file);
    }
    console.log('[pilot] Production, full cast and background gallery rendered');
  }
  const comparisons = [];
  if (args.compare) for (const grade of ['original', 'production', 'vivid']) {
    const variantProps = {...inputProps, colorGrade: grade};
    const variant = await selectComposition({serveUrl, id: 'Animation-Pilot', inputProps: variantProps, puppeteerInstance: browser, logLevel: 'error'});
    for (const [label, frame] of [['wide', 54], ['catch', 231], ['handover', 420]]) {
      const file = `${label}-${grade}.png`;
      await renderStill({serveUrl, composition: variant, inputProps: variantProps, puppeteerInstance: browser,
        frame, scale: .5, imageFormat: 'png', output: path.join(review, file), logLevel: 'error'});
      comparisons.push({grade, label, frame, file});
    }
  }
  if (args.compare) for (const label of ['wide', 'catch', 'handover']) {
    const hashes = comparisons.filter(c => c.label === label).map(c => createHash('sha256').update(fs.readFileSync(path.join(review, c.file))).digest('hex'));
    if (new Set(hashes).size !== 3) throw new Error(`Color comparison produced identical looks for ${label}`);
  }
  const started = performance.now();
  let renderSeconds = null;
  if (!args.stills) {
    let reported = -1;
    await renderMedia({...VIDEO_ENCODING,serveUrl, composition, inputProps, puppeteerInstance: browser, codec: 'h264', crf: 18,
      scale: 2 / 3, concurrency: 2, imageFormat: 'jpeg', outputLocation: path.join(review, 'animation-pilot.mp4'), logLevel: 'error',
      onProgress: ({progress}) => {const step = Math.floor(progress * 10); if (step > reported) {reported = step; console.log(`[pilot] ${step * 10}%`);}}});
    renderSeconds = (performance.now() - started) / 1000;
    const video = path.join(review, 'animation-pilot.mp4');
    const mastered = path.join(review, 'animation-pilot.aac');
    const report = masterAudio(video, mastered);
    const muxed = path.join(review, 'animation-pilot.mastered.mp4');
    runMedia('ffmpeg', ['-y', '-v', 'error', '-i', video, '-i', mastered, '-map', '0:v:0', '-map', '1:a:0',
      '-c', 'copy', '-t', '24', '-movflags', '+faststart', muxed]);
    fs.renameSync(muxed, video);
    fs.writeFileSync(path.join(review, 'loudness.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(review, 'verification.json'), JSON.stringify(verifyEpisode(video, {frames: 720, fps: 30}), null, 2));
  }
  const labels = ['Notice', 'Anticipate', 'Chase', 'Miss', 'Catch', 'Reassure', 'Return', 'Play'];
  const manifest = {slug, source: sourceSlug, prototype: true, colorGrade, comparisons, gallery, composition: 'Animation-Pilot', durationSec: 24,
    width: 1280, height: 720, fps: 30, renderSeconds,
    beats: beats.map((time, i) => ({time, label: labels[i], frame: Math.round(time * 30), file: `beat-${i + 1}.png`}))};
  fs.writeFileSync(path.join(review, 'manifest.json'), JSON.stringify(manifest, null, 2));
  const compareHtml = comparisons.length ? `<h2>Color comparison</h2><p>The same frame with original, production and vivid grading. Production is the new shared default, slightly stronger than the Sunny study.</p>${['wide', 'catch', 'handover'].map(label => `<h3>${label}</h3><div class="frames">${comparisons.filter(c => c.label === label).map(c => `<figure><img alt="${label}, ${c.grade} color grade" src="${c.file}"><figcaption>${c.grade}</figcaption></figure>`).join('')}</div>`).join('')}` : '';
  const galleryHtml=gallery.length?`<h2>Shared production renderers</h2><div class="frames">${gallery.map(file=>`<figure><img loading="lazy" alt="${file.replace('.png','')}" src="${file}"><figcaption>${file.replace('.png','').replaceAll('-',' ')}</figcaption></figure>`).join('')}</div>`:'';
  fs.writeFileSync(path.join(review, 'index.html'), `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dreamy Discoveries · Animation pilot</title><style>body{margin:0;background:#f7f2e9;color:#51425c;font:17px/1.6 system-ui}main{max-width:1100px;margin:auto;padding:36px 24px}h1{font-size:clamp(28px,5vw,46px);line-height:1.15}p{max-width:740px}video{width:100%;border-radius:18px;background:#d5e7d5}.frames{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}figure{margin:0}img{width:100%;border-radius:12px}figcaption{font-size:15px;margin:6px 0 20px}.tag{font-size:13px;letter-spacing:.1em;text-transform:uppercase}</style><main><p class="tag">Dreamy Discoveries · Animation study · ${colorGrade}</p><h1>A little more life in Sunny Meadow.</h1><p>A 24-second prototype: Taffy notices her runaway ball, misses a reach, and Ben catches it. They return to playing together. Existing character designs, recorded voices, music and scenery; all movement is deterministic.</p><video controls playsinline preload="metadata" poster="beat-5.png" src="animation-pilot.mp4"></video><p>The production color grade and object-surface contacts are shared with normal episodes, thumbnails and character sheets. The choreography in this clip remains an authored animation study.</p>${compareHtml}${galleryHtml}<h2>Storyboard</h2><div class="frames">${manifest.beats.map(b => `<figure><img loading="lazy" alt="${b.label} at ${b.time} seconds" src="${b.file}"><figcaption>${b.label} · ${b.time.toFixed(2)}s</figcaption></figure>`).join('')}</div></main></html>`);
  console.log(`[pilot] ${review}/index.html`);
} finally {
  if (browser) await browser.close({silent: true});
  fs.rmSync(publicDir, {recursive: true, force: true});
  fs.rmSync(bundleDir, {recursive: true, force: true});
}
