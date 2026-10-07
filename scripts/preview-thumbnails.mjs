/** Render saved episodes into a local review gallery. No writing, voice or library mutations. */
import fs from 'node:fs';
import path from 'node:path';
import {parseArgs, ROOT, GENERATED_DIR} from './lib/common.mjs';
import {buildRegistry} from './build-registry.mjs';
import {still} from './lib/remotion-api.mjs';

const defaults = [
  'standby-ben-and-the-paper-boat',
  'grandpa-tillys-sweet-treat-2026-09-30',
  'standby-taffy-and-the-two-paw-umbrella',
  'standby-daisy-and-the-different-sized-baskets',
  'standby-ozzy-and-the-paper-crown',
  'standby-fiona-and-the-last-decoration',
];
const escape = text => String(text).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

async function main() {
  const args = parseArgs();
  const slugs = typeof args.slugs==='string' ? args.slugs.split(',').map(s=>s.trim()).filter(Boolean) : defaults;
  if (!slugs.length || slugs.some(slug=>!/^[a-z0-9][a-z0-9-]*$/.test(slug))) throw new Error('Supply comma-separated episode slugs');
  const output = path.resolve(typeof args.out==='string' ? args.out : path.join(ROOT,'out/review/captivating/thumbnails'));
  const scripts = slugs.map(slug=> {
    const library = path.join(ROOT,'library/scripts',`${slug}.json`);
    const file = fs.existsSync(library) ? library : path.join(GENERATED_DIR,slug,'script.json');
    return {slug,script:JSON.parse(fs.readFileSync(file,'utf8'))};
  });
  fs.mkdirSync(output,{recursive:true});
  buildRegistry();
  for (const {slug,script} of scripts) {
    const props = {slug,script};
    await still({composition:'Thumbnail',props,output:path.join(output,`${slug}.png`)});
    await still({composition:'Thumbnail',props,output:path.join(output,`${slug}.mobile.png`),scale:.25});
    console.log(`[thumbnail] ${slug}: 1280x720 + 320x180`);
  }
  const cards = scripts.map(({slug,script})=>`<article><a href="${slug}.png"><img src="${slug}.mobile.png" width="320" height="180" alt="${escape(script.title)}"></a><h2>${escape(script.title)}</h2><a href="${slug}.png" download>Download full thumbnail</a></article>`).join('\n');
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Dreamy Discoveries · Thumbnail review</title>
<style>*{box-sizing:border-box}body{margin:0;padding:32px;background:#fbf2e8;color:#5d466c;font:16px/1.5 system-ui,sans-serif}main{max-width:1040px;margin:auto}h1{line-height:1.15}section{display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:24px}article{background:#fffaf3;border:1px solid #e8d8df;border-radius:18px;padding:20px}img{display:block;max-width:100%;height:auto;border-radius:8px}h2{font-size:17px}a{color:#75518b}a:focus-visible{outline:3px solid #a66d8d;outline-offset:5px}@media(max-width:390px){body{padding:16px}section{display:block}article{padding:10px;margin-bottom:18px}}</style>
<main><h1>Bright stories, dreamy little worlds.</h1><p>Review these at the small size shown here. Each image opens the full 1280×720 thumbnail.</p><section>${cards}</section><p>Local visual samples. Click-through rate and audience retention have not been measured.</p></main></html>`;
  fs.writeFileSync(path.join(output,'index.html'),html);
  console.log(`[thumbnail] Gallery: ${path.join(output,'index.html')}`);
}

main().catch(error=>{console.error(error.message);process.exitCode=1;});
