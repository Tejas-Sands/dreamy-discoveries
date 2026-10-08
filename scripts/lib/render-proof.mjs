/** Identify the inputs and exact media bytes used by independently rendered jobs. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {ROOT} from './common.mjs';
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
export const mediaHash=file=>hash(fs.readFileSync(file));
export function renderIdentity(script,root=ROOT) {
  const digest=crypto.createHash('sha256').update(JSON.stringify(script));
  const visit=relative=>{
    const absolute=path.join(root,relative);
    if(!fs.existsSync(absolute)||relative==='src/generated')return;
    if(fs.statSync(absolute).isDirectory())for(const child of fs.readdirSync(absolute).sort())visit(`${relative}/${child}`);
    else digest.update(relative).update(fs.readFileSync(absolute));
  };
  for(const relative of ['src','scripts/lib/staging.mjs','remotion.config.ts','package-lock.json','library/characters','library/backgrounds','library/cast.json','public/fonts','public/brand','public/music','public/sfx','public/vox'])visit(relative);
  return digest.digest('hex');
}
export function writeRenderProof(file,identity,range=null) {
  fs.writeFileSync(`${file}.render.json`,JSON.stringify({version:1,identity,range,sha256:mediaHash(file)},null,2)+'\n');
}
export function verifyRenderProof(file,identity,range=null) {
  const sidecar=`${file}.render.json`;
  if(!fs.existsSync(sidecar))throw new Error(`Missing render proof: ${sidecar}; re-render this media`);
  const proof=JSON.parse(fs.readFileSync(sidecar,'utf8'));
  if(proof.version!==1||proof.identity!==identity||JSON.stringify(proof.range)!==JSON.stringify(range)||proof.sha256!==mediaHash(file))throw new Error(`Stale or mismatched rendered media: ${file}`);
}
