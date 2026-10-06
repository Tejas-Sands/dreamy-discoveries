/** Zero-AI, exclusively written developer showcase. Production history stays untouched. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {directScript} from './lib/director.mjs';
import {voiceSettings} from './lib/voice.mjs';
import {GENERATED_DIR,parseArgs} from './lib/common.mjs';

export function animationPreview(slug='dev-animation-v3') {
  const line=(text,speaker='character',emotion='happy',action='idle',extra={})=>({text,speaker,emotion,action,durationSec:2.2,callout:null,sfx:[],...extra});
  const actors=(mainX=620,friendX=1280)=>({character:{x:mainX,y:870},friend:{x:friendX,y:870}});
  const prop=(id,kind,x,owner=null,state={})=>({id,kind,label:kind,x,y:826,owner,...(!owner?{location:'meadow'}:{}),...state});
  const stage=(props,events=[],shot='prop',cast=actors())=>({actors:cast,props,events,shot,auto:true});
  const event=(kind,propId,line,actor='character',extra={})=>({kind,propId,line,actor,delaySec:.3,durationSec:1.1,...extra});
  const scene=(character,secondCharacter,lines,staging,extra={})=>({kind:'story',background:'meadow',character,secondCharacter,lines,staging,direction:'dialogue',energy:'calm',holdSec:.35,extras:null,gag:null,transition:'none',...extra});
  const script=directScript({slug,type:'story',presentationVersion:3,opening:'hook',title:'Little Actions, Happy Friends',palette:'meadow',mainCharacter:{kind:'bunny',name:'Taffy'},intro:null,outro:line('Good night, friends!','narrator','sleepy','wave'),music:'story',scenes:[
    scene('bunny','bear',[line('Oops! My ball is rolling away!','character','surprised','point'),line('I caught it, Taffy!','friend','proud','nod')],
      stage([prop('meadow-ball','ball',790)],[event('roll','meadow-ball',0,'character',{delaySec:0,durationSec:1.3,endpoint:{x:1070,y:826}}),event('catch','meadow-ball',1,'friend',{delaySec:.15})],'discovery')),
    // Exact cached wording/voices from the existing staging preview.
    scene('bunny','bear',[line('I give Ben the apple.'),line('Thank you! Sharing makes me smile.','friend','love','nod')],
      stage([prop('apple','apple',730,'bunny')],[event('give','apple',0,'character',{to:'friend',delaySec:.75,durationSec:.85})],'prop',{character:{x:780,y:870},friend:{x:1010,y:870}})),
    scene('fox','duck',[line('A gentle push sends it your way.','character','thinking','nod'),line('Got it! Your turn, Fiona.','friend','excited','cheer')],
      stage([prop('garden-ball','ball',790)],[event('push','garden-ball',0,'character',{endpoint:{x:1050,y:826}}),event('catch','garden-ball',1,'friend')],'prop')),
    scene('owl','turtle',[line('Let us open our picture book.','character','thinking','think'),line('Look at those lovely flowers!','friend','surprised','point')],
      stage([prop('book','book',730,'owl',{openProgress:0})],[event('open','book',0)],'prop')),
    scene('duck','fox',[line('A little water for our flower.','character','love','nod'),line('Now its petals sparkle!','friend','happy','point')],
      stage([prop('flower','flower',865)],[event('water','flower',0,'character',{amount:.55,durationSec:1.5})],'prop',{character:{x:730,y:870},friend:{x:1220,y:870}})),
    scene('bear','bunny',[line('First, a strong castle base.','character','thinking','think'),line('I add the walls!','friend','proud','nod'),line('Our towers reach the sky!','character','excited','cheer')],
      stage([prop('castle','castle',950,null,{buildProgress:0})],[event('build','castle',0,'character',{amount:.34}),event('build','castle',1,'friend',{amount:.34}),event('build','castle',2,'character',{amount:.34})],'prop',{character:{x:780,y:870},friend:{x:1130,y:870}})),
    scene('fox','duck',[line('What helps a flower grow?','character','thinking','think',{role:'question'}),line('Yes, water helps our flower grow!','character','proud','nod',{role:'praise'})],
      stage([prop('flower','flower',865,null,{waterAmount:.55})],[],'quiet'),{kind:'question',direction:'thinking',holdSec:2.5,question:{answer:{text:'Water',emoji:'💧'}}}),
    scene('turtle','owl',[line('A small kindness can brighten a day.','character','love','nod'),line('Rest well, Sunny Meadow.','friend','sleepy','sleep')],
      stage([],[],'quiet'),{background:'bedroom',direction:'lullaby',transition:'page',holdSec:.7}),
  ]});
  script.synthesis=voiceSettings({...script,synthesis:{engine:'kokoro',voice:'af_heart',narratorVoice:'af_bella',speed:.95,model:'Kokoro-82M-v1.0-ONNX:q8:peak-v1',cacheVersion:3,castVoices:{bunny:'af_heart',bear:'am_michael',duck:'af_sarah',fox:'bf_emma',turtle:'bm_george',owl:'am_fenrir'}}});
  return script;
}

/** An existing preview may already contain measured voice data; never overwrite it. */
export function writeAnimationPreview(slug='dev-animation-v3',generatedDirectory=GENERATED_DIR) {
  if(!/^dev-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error('Use a lowercase dev- preview slug');
  const directory=path.join(generatedDirectory,slug),file=path.join(directory,'script.json');
  fs.mkdirSync(directory,{recursive:true});
  try {fs.writeFileSync(file,JSON.stringify(animationPreview(slug),null,2),{flag:'wx'});}
  catch(error){if(error?.code!=='EEXIST')throw error;}
  return file;
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const {slug='dev-animation-v3'}=parseArgs();
  console.log(`[preview] ${writeAnimationPreview(slug)}\nNext: npm run tts -- --slug ${slug}\nCompare: npx remotion render Animation-Comparison out/review/animation-v3/comparison.mp4 --props='{"slug":"${slug}","script":null}'`);
}
