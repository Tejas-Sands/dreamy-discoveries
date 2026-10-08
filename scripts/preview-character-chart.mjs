/** Rebuildable visual comparisons of the production rigs against the original chart. */
import fs from 'node:fs';
import path from 'node:path';
import {openBrowser,renderMedia,renderStill,selectComposition} from '@remotion/renderer';
import {bundle} from '@remotion/bundler';
import {ROOT} from './lib/common.mjs';

const output=path.join(ROOT,'out/review/character-chart');
fs.mkdirSync(output,{recursive:true});
const all=fs.readdirSync(path.join(ROOT,'library/characters')).filter(name=>name.endsWith('.json')).map(name=>name.slice(0,-5));
const kinds=process.argv.find(arg=>arg.startsWith('--kinds='))?.slice(8).split(',')??all;
const motion=process.argv.includes('--motion');
if(kinds.some(kind=>!all.includes(kind)))throw new Error('Unknown character in --kinds');
// Silent artwork reviews need the chart and local fonts, without episode audio.
const buildDirectory=fs.mkdtempSync(path.join(output,'.build-'));
const previewPublic=path.join(buildDirectory,'public');
let browser;
try {
fs.mkdirSync(path.join(previewPublic,'references'),{recursive:true});
fs.copyFileSync(path.join(ROOT,'public/references/pastel-kawaii-animal-limb-chart.png'),path.join(previewPublic,'references/pastel-kawaii-animal-limb-chart.png'));
fs.cpSync(path.join(ROOT,'public/fonts'),path.join(previewPublic,'fonts'),{recursive:true});
const serveUrl=await bundle({entryPoint:path.join(ROOT,'src/index.ts'),publicDir:previewPublic,outDir:path.join(buildDirectory,'bundle'),onProgress:()=>{}});
browser=await openBrowser('chrome',{logLevel:'error'});
for(const kind of kinds) {
  const inputProps={kind};
  const composition=await selectComposition({serveUrl,puppeteerInstance:browser,id:'Character-Chart-Review',inputProps,logLevel:'error'});
  await renderStill({serveUrl,puppeteerInstance:browser,composition,inputProps,frame:0,imageFormat:'png',output:path.join(output,`${kind}.png`),logLevel:'error'});
  if(motion) {
    const motionProps={kind,animate:true};
    const motionComposition=await selectComposition({serveUrl,puppeteerInstance:browser,id:'Character-Chart-Review',inputProps:motionProps,logLevel:'error'});
    for(const [side,second] of [['right',2],['left',6]]) {
      await renderStill({serveUrl,puppeteerInstance:browser,composition:motionComposition,inputProps:motionProps,frame:second*motionComposition.fps,imageFormat:'png',output:path.join(output,`${kind}-${side}.png`),logLevel:'error'});
    }
    await renderMedia({serveUrl,puppeteerInstance:browser,composition:motionComposition,inputProps:motionProps,codec:'h264',crf:18,concurrency:2,muted:true,outputLocation:path.join(output,`${kind}.mp4`),logLevel:'error'});
  }
  console.log(`[chart] ${kind} saved`);
}
const ready=all.filter(kind=>fs.existsSync(path.join(output,`${kind}.png`)));
fs.copyFileSync(path.join(ROOT,'public/references/pastel-kawaii-animal-limb-chart.png'),path.join(output,'reference.png'));
fs.writeFileSync(path.join(output,'index.html'),`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Character chart comparisons</title>
<style>body{max-width:1600px;margin:32px auto;padding:0 20px;background:#f8f3e8;color:#514659;font:18px/1.5 system-ui}img{display:block;width:100%;border-radius:16px}article{margin:24px 0}a{color:#675575}nav{display:flex;flex-wrap:wrap;gap:8px 18px}h1{line-height:1.2}</style>
<h1>Character chart comparisons</h1><p>The supplied <a href="reference.png">Pastel Kawaii Animal Limb Chart</a> is the sole layout reference. Each image shows the original chart cell, the front layout, and a tilted native-limb gesture. Use this gallery to inspect visual changes alongside the automated character checks.</p>
<nav>${ready.map(kind=>`<a href="#${kind}">${kind}</a>`).join('')}</nav>
${ready.map(kind=>`<article id="${kind}"><a href="${kind}.png"><img src="${kind}.png" alt="${kind}: original reference, front layout, and tilt" loading="lazy"></a>${fs.existsSync(path.join(output,`${kind}.mp4`))?`<p>Turn and speech review</p><video controls loop playsinline preload="metadata" style="width:100%;border-radius:16px" src="${kind}.mp4"></video><p><a href="${kind}-left.png">Left turn</a> · <a href="${kind}-right.png">Right turn</a></p>`:''}</article>`).join('\n')}
</html>\n`);
console.log(`[chart] ${ready.length} comparisons: ${path.join(output,'index.html')}`);
const moving=ready.filter(kind=>fs.existsSync(path.join(output,`${kind}.mp4`)));
if(moving.length) {
  fs.writeFileSync(path.join(output,'motion.html'),`<!doctype html>
<html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Character motion review</title>
<style>body{max-width:1600px;margin:32px auto;padding:0 20px;background:#f8f3e8;color:#514659;font:18px/1.5 system-ui}video{display:block;width:100%;border-radius:16px}section{margin:32px 0}a{color:#675575}nav{display:flex;flex-wrap:wrap;gap:8px 18px}h1{line-height:1.2}</style>
<h1>Character motion review</h1><p>Each silent eight-second clip shows the original chart drawing, the corrected front view, and turns in both directions with limb and mouth movement. Motion uses synthetic mouth envelopes for visual inspection.</p>
<nav>${moving.map(kind=>`<a href="#${kind}">${kind}</a>`).join('')}</nav>
${moving.map(kind=>`<section id="${kind}"><h2>${kind[0].toUpperCase()+kind.slice(1)}</h2><video controls loop playsinline preload="metadata" poster="${kind}.png" src="${kind}.mp4"></video><p><a href="${kind}.png">Front comparison</a> · <a href="${kind}-left.png">Left turn</a> · <a href="${kind}-right.png">Right turn</a> · <a href="${kind}.mp4">Open video</a></p></section>`).join('\n')}
<p><a href="index.html">All character comparisons</a></p></html>\n`);
  console.log(`[chart] ${moving.length} motion previews: ${path.join(output,'motion.html')}`);
}

} finally {
  try { if(browser) await browser.close({silent:true}); }
  finally { fs.rmSync(buildDirectory,{recursive:true,force:true}); }
}
