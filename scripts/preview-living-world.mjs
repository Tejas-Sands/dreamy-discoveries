/** Local visual review: all six hands and every setting, without script or voice writes. */
import fs from 'node:fs';
import path from 'node:path';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {parseArgs, ROOT} from './lib/common.mjs';
import {BACKGROUND_RECIPES} from './lib/library.mjs';
import {buildRegistry} from './build-registry.mjs';
import {getBundle, still} from './lib/remotion-api.mjs';

const escape = text => String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function clip(composition,props,output) {
  const serveUrl=await getBundle();
  const config=await selectComposition({serveUrl,id:composition,inputProps:props,logLevel:'error'});
  const requested=Number(process.env.RENDER_CONCURRENCY);
  const concurrency=Number.isFinite(requested)&&requested>0?Math.max(1,Math.floor(requested)):2;
  await renderMedia({serveUrl,composition:config,inputProps:props,outputLocation:output,codec:'h264',
    scale:.5,concurrency,muted:true,logLevel:'error',overwrite:true});
  console.log(`[review] ${path.basename(output)}: ${(config.durationInFrames/config.fps).toFixed(1)}s`);
}

async function main() {
  const args=parseArgs();
  const output=path.resolve(typeof args.out==='string'?args.out:path.join(ROOT,'out/review/living-world'));
  fs.mkdirSync(output,{recursive:true});
  buildRegistry();
  const hands=[['wave',30],['point',120],['hold',225]];
  for (const [action,frame] of hands) {
    await still({composition:'Hand-Preview',frame,props:{},output:path.join(output,`hands-${action}.png`),scale:.5});
  }
  const names=Object.keys(BACKGROUND_RECIPES).sort();
  for (const kind of names) {
    await still({composition:'Background-Preview',frame:75,props:{kind},output:path.join(output,`${kind}.png`),scale:.5});
    console.log(`[review] ${kind}`);
  }
  await still({composition:'Sheet-Backgrounds',frame:45,output:path.join(output,'all-backgrounds.png')});
  if (!args['stills-only']) {
    await clip('Hand-Preview',{},path.join(output,'hands.mp4'));
    await clip('Background-Preview',{secondsPerSetting:3},path.join(output,'backgrounds.mp4'));
  }
  const videos=args['stills-only']?'':`<section><article><h2>Hands and fingers</h2><video src="hands.mp4" poster="hands-wave.png" controls loop playsinline preload="metadata"></video></article><article><h2>All 25 lively settings</h2><video src="backgrounds.mp4" controls loop playsinline preload="metadata"></video></article></section>`;
  const handImages=hands.map(([action])=>`<article><h2>${escape(action)}</h2><a href="hands-${action}.png"><img src="hands-${action}.png" alt="The six Sunny Meadow animals ${escape(action)}" width="960" height="540" loading="lazy"></a></article>`).join('');
  const cards=names.map(kind=>`<article><h2>${escape(kind)}</h2><a href="${kind}.png"><img src="${kind}.png" alt="${escape(kind)} with small ambient activities" width="960" height="540" loading="lazy"></a></article>`).join('');
  fs.writeFileSync(path.join(output,'index.html'),`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dreamy Discoveries · Living world review</title>
<style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#fbf2e8;color:#5d466c;font:16px/1.5 system-ui,sans-serif}main{max-width:1200px;margin:auto}h1{line-height:1.15}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,360px),1fr));gap:24px;margin:24px 0}article{background:#fffaf3;border:1px solid #e8d8df;border-radius:18px;padding:16px}img,video{display:block;width:100%;height:auto;border-radius:8px}h2{font-size:18px;text-transform:capitalize}a{color:#75518b}a:focus-visible{outline:3px solid #a66d8d;outline-offset:5px}@media(max-width:440px){body{padding:16px}}</style>
<main><h1>Little gestures. Lively worlds.</h1><p>Rounded hands for waving, pointing and holding; small activities suited to each setting. Open any image for a larger view.</p>${videos}<section>${handImages}</section><h2>Every background</h2><section>${cards}</section></main></html>`);
  console.log(`[review] Gallery: ${path.join(output,'index.html')}`);
}

main().catch(error=>{console.error(error);process.exitCode=1;});
