/** Local, zero-AI direction sampler. Does not change latest, library history or the universe. */
import fs from 'node:fs';
import path from 'node:path';
import {directScript} from './lib/director.mjs';
import {voiceSettings} from './lib/voice.mjs';
import {GENERATED_DIR,parseArgs} from './lib/common.mjs';

export function engagementPreview(slug = 'dev-engagement-v1') {
  const line = (text,speaker,emotion,action) => ({text,speaker,emotion,action,callout:null,sfx:[]});
  const scene = (background,direction,lines,extra={}) => ({background,direction,character:'bunny',secondCharacter:'bear',
    energy:direction === 'celebration' ? 'upbeat' : 'calm',holdSec:.6,gag:null,extras:null,lines,...extra});
  const script = directScript({slug,type:'story',presentationVersion:1,title:'Taffy Finds the Way',palette:'meadow',
    mainCharacter:{kind:'bunny',name:'Taffy'},intro:null,outro:{text:'Good night, friends!',emotion:'sleepy',action:'wave'},
    scenes:[
      scene('meadow','tender',[
        line("Oh no! I can't find the path!",'character','worried','point'),
        line("We can find it together, Taffy.",'friend','love','nod'),
      ]),
      scene('meadow','dialogue',[
        line('May I have some help, Ben?','character','thinking','think'),
        line('Of course! Try this way.','friend','happy','point'),
      ]),
      scene('pond','thinking',[
        line('Should we rush, or walk together?','character','thinking','think'),
      ],{kind:'question',holdSec:2.5,question:{answer:{text:'Walk together!',emoji:'💛'},praise:'Yes! We can help each other.'}}),
      scene('pond','celebration',[
        line('We found the path together!','character','excited','cheer'),
        line('Helping feels warm and cozy!','friend','happy','clap'),
      ],{holdSec:1}),
      scene('bedroom','lullaby',[
        line('Good night, my caring friend.','character','sleepy','sleep'),
      ],{holdSec:1.5}),
    ]});
  script.synthesis=voiceSettings({...script,synthesis:{engine:'kokoro'}});
  return script;
}

function main() {
  const {slug='dev-engagement-v1'} = parseArgs();
  if (!/^[a-z0-9][a-z0-9-]*$/.test(slug)) throw new Error('Preview slug must contain lowercase letters, numbers and hyphens');
  const dir=path.join(GENERATED_DIR,slug);
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,'script.json');
  if (!fs.existsSync(file)) fs.writeFileSync(file,JSON.stringify(engagementPreview(slug),null,2),{flag:'wx'});
  console.log(`[preview] ${file}\nNext: npm run tts -- --slug ${slug}\nThen: npm run bake -- --slug ${slug}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) main();
