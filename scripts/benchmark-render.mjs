/** Reproducible local rendering measurements; no library, queue or voice mutations.
 * node scripts/benchmark-render.mjs --slug dev-engagement-v1 --frames 0-119 --scale 0.5 --runs 3
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
import {renderMedia,selectComposition} from '@remotion/renderer';
import {getBundle} from './lib/remotion-api.mjs';
import {parseArgs,resolveSlug,readScript,ROOT} from './lib/common.mjs';

export function benchmarkSettings(args) {
  const range=String(args.frames ?? '0-119').match(/^(\d+)-(\d+)$/);
  if (!range) throw new Error('--frames must be an inclusive START-END range');
  const frameRange=range.slice(1).map(Number);
  const scale=Number(args.scale ?? .5), runs=Number(args.runs ?? 3);
  const concurrencies=[...new Set(String(args.concurrencies ?? args.concurrency ?? '2').split(',').map(Number))];
  if (!Number.isFinite(scale) || scale <= 0 || scale > 1) throw new Error('--scale must be greater than zero and at most 1');
  if (!Number.isInteger(runs) || runs < 1 || runs > 5) throw new Error('--runs must be an integer from 1 to 5');
  if (concurrencies.some(concurrency=>!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 16)) throw new Error('--concurrency must be an integer from 1 to 16');
  if(frameRange[0]>frameRange[1])throw new Error('Frame range must be ordered');
  return {frameRange,scale,runs,concurrencies,imageFormat:'jpeg'};
}

async function main() {
  const args=parseArgs();
  const slug=resolveSlug(args);
  readScript(slug);
  const {frameRange,scale,runs,concurrencies,imageFormat}=benchmarkSettings(args);
  const inputProps={slug,script:null};
  const serveUrl=await getBundle();
  const composition=await selectComposition({serveUrl,id:'Video',inputProps,logLevel:'error'});
  if (frameRange[0] > frameRange[1] || frameRange[1] >= composition.durationInFrames) throw new Error('Frame range is outside this episode');
  const directory=path.join(ROOT,'out','review','benchmark',slug);
  fs.mkdirSync(directory,{recursive:true});
  const results=[];
  for(const concurrency of concurrencies) {
  const seconds=[];
  for (let i=0;i<runs;i++) {
    const started=performance.now();
    await renderMedia({serveUrl,composition,inputProps,frameRange,scale,concurrency,codec:'h264',muted:true,imageFormat,
      outputLocation:path.join(directory,`concurrency-${concurrency}-run-${i+1}.mp4`),logLevel:'error'});
    seconds.push(+((performance.now()-started)/1000).toFixed(3));
    console.log(`[benchmark] concurrency ${concurrency} run ${i+1}/${runs}: ${seconds.at(-1)}s`);
  }
  const sorted=[...seconds].sort((a,b)=>a-b);
  const median=(sorted[Math.floor((runs-1)/2)]+sorted[Math.floor(runs/2)])/2;
  results.push({concurrency,seconds,medianSeconds:median,
    framesPerSecond:+((frameRange[1]-frameRange[0]+1)/median).toFixed(2)});
  }
  const report={slug,frameRange,scale,imageFormat,runs,results,width:composition.width*scale,height:composition.height*scale,
    node:process.version,cpu:os.cpus()[0]?.model,logicalCpus:os.cpus().length,
    remotion:JSON.parse(fs.readFileSync(path.join(ROOT,'node_modules/remotion/package.json'),'utf8')).version,
    note:'Bundle time excluded; muted rendering includes browser startup and encoding. Compare identical frames, scale, concurrency and hardware.'};
  fs.writeFileSync(path.join(directory,'report.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main().catch(error=>{console.error(error.message);process.exitCode=1;});
