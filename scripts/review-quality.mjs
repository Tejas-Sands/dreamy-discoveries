/** Local v3/v4 comparison using existing voices. Never writes library/history. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {openBrowser,renderStill,renderMedia,selectComposition} from '@remotion/renderer';
import {directScript} from './lib/director.mjs';
import {refineWords} from './lib/speech-timing.mjs';
import {getBundle} from './lib/remotion-api.mjs';
import {ROOT,GENERATED_DIR,parseArgs,readScript} from './lib/common.mjs';

// Use the renderer's actual schedule, avoiding another copy of frame arithmetic.
const timing=ts.transpileModule(fs.readFileSync(path.join(ROOT,'src/lib/timing.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {computeSchedule}=await import(`data:text/javascript;base64,${Buffer.from(timing).toString('base64')}`);

export function reviewScript(source,slug,version) {
  if(!/^dev-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error('Use a lowercase dev- review slug');
  const script=structuredClone(source);
  if(!script.scenes.length)throw new Error('Review requires voiced scenes');
  script.slug=slug;script.presentationVersion=version;
  // Controlled movement/celebration variants keep the original words and recordings.
  const walk=structuredClone(script.scenes[0]);
  walk.action='walk';walk.direction='demonstration';walk.question=null;walk.kind='story';
  walk.staging={actors:{character:{x:600,y:870,moves:[{line:0,delaySec:0,durationSec:2,to:{x:950,y:870}}]}},props:[],events:[],shot:'discovery'};
  walk.secondCharacter=null;walk.lines=walk.lines.filter(line=>line.speaker!=='friend');
  const party=structuredClone(walk);party.direction='celebration';party.action='dance';party.staging.actors.character.moves=[];party.staging.shot='celebration';
  script.scenes.push(walk,party);
  const directed=directScript(script);
  if(version>=4)for(const scene of directed.scenes)for(const line of scene.lines)if(line.words&&line.durationSec)line.words=refineWords(line.words,line.durationSec,line.envelope);
  return directed;
}

export function selectReviewFrames(script) {
  const schedule=computeSchedule(script),picks=[];
  const add=(kind,index,local=30)=>{if(index>=0)picks.push({kind,scene:index,frame:schedule.scenes[index].from+Math.min(local,schedule.scenes[index].duration-1)});};
  add('dialogue',script.scenes.findIndex(s=>s.secondCharacter));
  const handover=script.scenes.findIndex(s=>s.staging?.events.some(e=>e.kind==='give'));
  if(handover>=0){const e=script.scenes[handover].staging.events.find(e=>e.kind==='give');add('handover',handover,schedule.scenes[handover].lines[e.line].from+Math.round(((e.delaySec??0)+(e.durationSec??1)*.5)*30));}
  add('walking',script.scenes.findIndex(s=>s.staging?.actors.character?.moves?.length));
  const question=script.scenes.findIndex(s=>s.question);
  if(question>=0)add('question',question,schedule.scenes[question].holdFrom+15);
  add('celebration',script.scenes.findIndex(s=>s.direction==='celebration'));
  let longest={length:0,scene:0,local:30};
  script.scenes.forEach((scene,i)=>schedule.scenes[i].lines.forEach(slot=>{if(slot.line.text.length>longest.length)longest={length:slot.line.text.length,scene:i,local:slot.from+Math.round((slot.line.durationSec??2.2)*15)};}));
  add('captions',longest.scene,longest.local);
  return picks;
}

export function writeReview(source,sourceDirectory,slug,version,generatedDirectory=GENERATED_DIR) {
  const script=reviewScript(source,slug,version),directory=path.join(generatedDirectory,slug);
  const lines=[script.intro,...script.scenes.flatMap(s=>s.lines),script.outro].filter(Boolean);
  const audio=[...new Set(lines.map(line=>line.audio).filter(Boolean))];
  if(lines.some(line=>line.text&&!line.audio))throw new Error('Review requires existing audio for every spoken line');
  for(const file of audio)if(path.basename(file)!==file||!fs.existsSync(path.join(sourceDirectory,file)))throw new Error(`Missing cached review audio: ${file}`);
  fs.mkdirSync(directory); // exclusive: never overwrite an earlier voiced preview
  for(const file of audio)fs.copyFileSync(path.join(sourceDirectory,file),path.join(directory,file),fs.constants.COPYFILE_EXCL);
  const output=path.join(directory,'script.json');fs.writeFileSync(output,JSON.stringify(script,null,2),{flag:'wx'});return output;
}

async function main() {
  const args=parseArgs(),sourceSlug=args.source??'dev-animation-v3',slug=args.slug??`dev-quality-${Date.now()}`;
  const source=readScript(sourceSlug),sourceDirectory=path.join(GENERATED_DIR,sourceSlug);
  for(const version of [3,4])writeReview(source,sourceDirectory,`${slug}-v${version}`,version);
  const script=readScript(`${slug}-v4`),picks=selectReviewFrames(script),directory=path.join(ROOT,'out/review',slug);
  fs.mkdirSync(directory,{recursive:true});
  const serveUrl=await getBundle(),browser=await openBrowser('chrome');
  const manifest={source:sourceSlug,slug,scale:.5,versions:[3,4],picks,clips:[]};
  try {
    for(const version of [3,4]) {
      const inputProps={slug:`${slug}-v${version}`,script:null};
      const composition=await selectComposition({serveUrl,id:'Video',inputProps,puppeteerInstance:browser,logLevel:'error'});
      for(const pick of picks) {
        await renderStill({serveUrl,composition,inputProps,puppeteerInstance:browser,frame:pick.frame,scale:.5,imageFormat:'png',output:path.join(directory,`${pick.kind}-v${version}.png`),logLevel:'error'});
        console.log(`[review] ${pick.kind} v${version} frame ${pick.frame}`);
      }
      if(args.clips)for(const pick of picks.filter(p=>['handover','walking'].includes(p.kind))) {
        const frameRange=[Math.max(0,pick.frame-25),Math.min(composition.durationInFrames-1,pick.frame+34)];
        const file=`${pick.kind}-v${version}.mp4`;
        await renderMedia({serveUrl,composition,inputProps,puppeteerInstance:browser,frameRange,scale:.5,concurrency:2,codec:'h264',imageFormat:'jpeg',outputLocation:path.join(directory,file),logLevel:'error'});
        manifest.clips.push({file,version,frameRange});console.log(`[review] ${file}`);
      }
    }
  }finally{await browser.close({silent:true});}
  fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2));
  fs.writeFileSync(path.join(directory,'index.html'),`<!doctype html><meta charset="utf-8"><title>Remotion quality review</title><style>body{font:18px system-ui;background:#16202c;color:#fff;margin:24px}section{margin:30px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}img,video{width:100%}h2{font-size:20px}</style><h1>Remotion v3 / v4</h1><p>Same cached voices. Left: v3. Right: v4. Walking and celebration use controlled scene variants.</p>${picks.map(p=>`<section><h2>${p.kind} · frame ${p.frame}</h2><div class="pair">${[3,4].map(v=>`<img alt="${p.kind} version ${v}" src="${p.kind}-v${v}.png">`).join('')}</div></section>`).join('')}<h2>Motion clips</h2><div class="pair">${manifest.clips.map(c=>`<figure><figcaption>${c.file}</figcaption><video controls src="${c.file}"></video></figure>`).join('')}</div>`);
  console.log(`[review] ${directory}/index.html`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{console.error(error);process.exitCode=1;});
