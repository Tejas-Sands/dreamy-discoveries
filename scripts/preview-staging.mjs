/** Zero-AI showcase; writes a new dev slug only, never episode history or latest. */
import fs from 'node:fs';
import path from 'node:path';
import {directScript} from './lib/director.mjs';
import {voiceSettings} from './lib/voice.mjs';
import {GENERATED_DIR,parseArgs} from './lib/common.mjs';

export function stagingPreview(slug='dev-staging-v2') {
  const line=(text,speaker='character',emotion='happy',action='idle')=>({text,speaker,emotion,action,callout:null,sfx:[]});
  const scene=(background,character,secondCharacter,lines,extra={})=>({kind:'story',background,character,secondCharacter,lines,direction:'dialogue',energy:'calm',holdSec:.5,extras:null,gag:null,...extra});
  const script=directScript({slug,type:'story',presentationVersion:2,title:'One Apple, Two Happy Friends',palette:'meadow',mainCharacter:{kind:'bunny',name:'Taffy'},intro:null,outro:{text:'Good night, friends!',speaker:'narrator',emotion:'sleepy',action:'wave'},scenes:[
    scene('meadow','bunny','bear',[line('I pick up the apple.'),line('That apple looks lovely, Taffy.','friend')],{prop:'apple'}),
    scene('meadow','bunny','bear',[line('I give Ben the apple.'),line('Thank you! Sharing makes me smile.','friend','love','nod')],{prop:'apple'}),
    scene('pond','bear','bunny',[line('We walk together by the pond.','character','happy','walk'),line('I put down the apple.'),line('Now we can enjoy our picnic.','friend')],{prop:null}),
    scene('garden','fox','duck',[line('Look! A flower for our picnic.','character','surprised','point'),line('Hooray for our caring friends!','friend','excited','cheer')],{prop:'flower',direction:'celebration',energy:'upbeat'}),
    scene('bedroom','turtle','owl',[line('A small kindness can brighten a day.','character','love','nod'),line('Rest well, Sunny Meadow.','friend','sleepy','sleep')],{direction:'lullaby',transition:'page',prop:null,holdSec:1}),
  ]});
  script.synthesis=voiceSettings({...script,synthesis:{engine:'kokoro',castVoices:{}}});
  return script;
}

function main(){
  const {slug='dev-staging-v2'}=parseArgs();
  if(!/^[a-z0-9][a-z0-9-]*$/.test(slug))throw new Error('Use a lowercase dev slug');
  const dir=path.join(GENERATED_DIR,slug);fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'script.json');
  if(!fs.existsSync(file))fs.writeFileSync(file,JSON.stringify(stagingPreview(slug),null,2),{flag:'wx'});
  console.log(`[preview] ${file}\nNext: npm run tts -- --slug ${slug}\nThen: npm run bake -- --slug ${slug}`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===new URL(import.meta.url).pathname)main();
