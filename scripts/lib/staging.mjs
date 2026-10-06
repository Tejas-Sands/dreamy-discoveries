/** Pure deterministic stage planning and sampling, shared by Director and renderer. */
const aliases={taffy:'bunny',ben:'bear',daisy:'duck',fiona:'fox',tilly:'turtle',ozzy:'owl'};
const animal=id=>aliases[String(id).toLowerCase()]??id;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,Number.isFinite(n)?n:a));
const smooth=n=>{const k=clamp(n,0,1);return k*k*(3-2*k);};
const mix=(a,b,k)=>a+(b-a)*k;
const point=p=>({x:clamp(p?.x,300,1600),y:clamp(p?.y??870,790,900)});
const declaredProp=raw=> {
  if(!raw)return null;
  const text=String(raw).toLowerCase();
  for(const [kind,pattern] of [['apple',/apple|🍎|🍏/],['ball',/ball|⚽|🏀/],['basket',/basket|🧺/],['book',/book|📚|📖/],['flower',/flower|🌼|🌸/],['kite',/kite|🪁/],['seed',/seed|🌱/],['cookie',/cookie|🍪/],['star',/star|⭐/],['boat',/boat|⛵/],['castle',/castle|🏰/],['leaf',/leaf|leaves|🍃/],['snowman',/snowman|snow friend|⛄/],['heart',/heart|💛|❤️/]])if(pattern.test(text))return {id:kind,kind,label:kind};
  const identity=[...text].map(c=>c.codePointAt(0).toString(16)).join('-').slice(0,80);
  return {id:`prop-${identity}`,kind:'object',label:String(raw).slice(0,32)};
};
const committed=(text)=>!/[?]/.test(text)&&! /\b(if|should|could|would|might|never|not|don't|doesn't|didn't|will|going to|let|may|can|want|hope|wish|try|tries|tried|attempt|attempted|fail|failed|miss|missed|refuse|refuses|refused|cannot|unable)\b/i.test(text);
const actionKind=text=> /\b(pick(?:s|ed)? up|lift(?:s|ed)?)\b/i.test(text)?'pick-up':/\b(drop(?:s|ped)?|put(?:s)? down|set(?:s)? down|placed)\b/i.test(text)?'drop':/\b(give|gives|gave|hand(?:s|ed)?|pass(?:es|ed)?|offer(?:s|ed)?|share(?:s|d)?)\b/i.test(text)?'give':null;
const physicalKinds=new Set(['push','roll','catch','open','water','build']);
const physicalAction=text=> {
  if(!committed(text)||/\b(almost|nearly|pretend|pretends|pretended|without|isn't|wasn't|won't|couldn't|wouldn't|hasn't|haven't|hadn't|can't)\b/i.test(text))return null;
  const match=String(text).match(/^\s*(?:I|we|(?:grandpa\s+|professor\s+)?(?:taffy|ben|daisy|fiona|tilly|ozzy|bunny|bear|duck|fox|turtle|owl))\s+(?:(?:gently|carefully|slowly|quickly|happily|then|finally)\s+)*(push(?:es|ed)?|roll(?:s|ed)?|catch(?:es)?|caught|open(?:s|ed)?|water(?:s|ed)?|build(?:s)?|built)\b/i);
  const verb=match?.[1]?.toLowerCase();
  return verb?.startsWith('push')?'push':verb?.startsWith('roll')?'roll':/^(catch|caught)/.test(verb??'')?'catch':verb?.startsWith('open')?'open':verb?.startsWith('water')?'water':/^(build|built)/.test(verb??'')?'build':null;
};
const physicalObject=(text,prop)=> {
  const object=String(text).replace(/^.*?\b(?:push(?:es|ed)?|roll(?:s|ed)?|catch(?:es)?|caught|open(?:s|ed)?|water(?:s|ed)?|build(?:s)?|built)\b\s*/i,'');
  const modifiers='(?:(?:a|an|the|my|our|his|her|their|your|small|little|big|red|blue|green|yellow|paper|sand|snow|beautiful|new|old|tiny|heavy|round|taffy[’\x27]s|ben[’\x27]s|daisy[’\x27]s|fiona[’\x27]s|tilly[’\x27]s|ozzy[’\x27]s)\\s+)*';
  const name=prop.kind==='castle'?'(?:sandcastle|castle)':prop.kind==='snowman'?'(?:snowman|snow\\s+friend)':prop.kind;
  return new RegExp(`^${modifiers}(?:${name}s?|it|this|that)\\b`,'i').test(object);
};
const roles=['character','friend'];
const ownerFor=(scene,role)=>animal(role==='friend'?scene.secondCharacter:scene.character);

/** A narrow visual hook: a present speaker notices an already rolling concrete object. */
const movingOpening=(script,scene,sceneIndex,line,lineIndex)=> {
  if((script.presentationVersion??0)<3||script.opening!=='hook'||sceneIndex!==0||lineIndex!==0||scene.question||line?.role==='question'||!committed(line?.text??''))return false;
  const match=String(line?.text??'').match(/^\s*(?:(?:oh|oops|look|uh oh)[!,:.]\s*)?(?:my|our|the|a)\s+(?:(?:little|small|red|blue|round)\s+)*(ball|apple)\s+(?:rolls?|rolled|is rolling)(?:\s+away)?[!.]*\s*$/i);
  const declared=declaredProp(scene.prop);
  if(!match||declared?.kind!==match[1].toLowerCase())return false;
  const speaker=line?.speaker??'character';
  if(speaker==='narrator')return false;
  const owner=speaker==='character'||speaker==='friend'?ownerFor(scene,speaker):animal(speaker);
  return ['bunny','bear','duck','fox','turtle','owl'].includes(owner)&&roles.some(role=>ownerFor(scene,role)===owner);
};

/** Populate only missing staging. Authored stages and all older episodes survive unchanged. */
export function stageStory(script) {
  if((script.presentationVersion??0)<2)return script;
  const v3=(script.presentationVersion??0)>=3;
  const world=new Map(),positions=new Map();let previousBackground;
  for(const [sceneIndex,scene] of (script.scenes??[]).entries()) {
    const present=roles.filter(role=>ownerFor(scene,role)&&ownerFor(scene,role)!=='none');
    if(!scene.staging) {
      const actors={};
      for(const role of present)actors[role]={...(previousBackground===scene.background?positions.get(ownerFor(scene,role)):null)??{x:role==='friend'?1360:present.length>1?620:870,y:870},moves:[]};
      const declared=declaredProp(scene.prop);
      if(declared&&!world.has(declared.id)) {
        const pickup=(scene.lines??[]).some(l=>committed(l.text)&&actionKind(l.text)==='pick-up');
        const ground=movingOpening(script,scene,sceneIndex,scene.lines?.[0],0)||v3&&['push','roll','catch','water','build'].some(kind=>(scene.lines??[]).some(l=>physicalAction(l.text)===kind));
        world.set(declared.id,{...declared,owner:pickup||ground||['castle','snowman'].includes(declared.kind)?null:ownerFor(scene,'character'),x:actors.character?.x+110||980,y:826,location:scene.background,...(v3&&declared.kind==='book'?{openProgress:0}:{}),...(v3&&['castle','snowman'].includes(declared.kind)?{buildProgress:0}:{})});
      }
      const props=[...world.values()].filter(p=>p.owner?present.some(role=>ownerFor(scene,role)===p.owner):p.location===scene.background).map(p=>({...p}));
      const working=new Map(props.map(p=>[p.id,{...p}]));
      const events=[];
      for(const [line,l] of (scene.lines??[]).entries()) {
        if(!committed(l.text)||l.role==='question'||scene.question)continue;
        const openingRoll=movingOpening(script,scene,sceneIndex,l,line);
        const kind=actionKind(l.text)??(v3?physicalAction(l.text):null)??(openingRoll?'roll':null);if(!kind)continue;
        const candidate=declared?props.find(p=>p.id===declared.id):props.find(p=>new RegExp(`\\b${p.kind}\\b`,'i').test(l.text));if(!candidate)continue;
        const prop=working.get(candidate.id);
        if(physicalKinds.has(kind)) {if(!openingRoll&&!physicalObject(l.text,prop))continue;}
        else if(!new RegExp(`\\b${prop.kind}\\b|\\b(it|this|that)\\b`,'i').test(l.text)&&prop.kind!=='object')continue;
        const subject=l.text.match(/^\s*(?:grandpa\s+|professor\s+)?(taffy|ben|daisy|fiona|tilly|ozzy|bunny|bear|duck|fox|turtle|owl)\b/i)?.[1]?.toLowerCase();
        const namedRole=subject?present.find(role=>ownerFor(scene,role)===animal(subject)):null;
        if(l.speaker==='narrator'&&!namedRole)continue;
        const speakingRole=present.find(role=>ownerFor(scene,role)===animal(l.speaker));
        if(v3&&physicalKinds.has(kind)&&subject&&!namedRole)continue;
        if(v3&&physicalKinds.has(kind)&&l.speaker&&!['character','friend','narrator'].includes(l.speaker)&&!speakingRole&&!namedRole)continue;
        const actor=namedRole??speakingRole??(l.speaker==='friend'?'friend':'character');if(!actors[actor])continue;
        if(kind==='give'&&actors.friend&&actors.character) {
          const to=actor==='character'?'friend':'character';
          if(prop.owner!==ownerFor(scene,actor))continue;
          const middle=clamp((actors.character.x+actors.friend.x)/2,620,1220);
          const left=actors.character.x<=actors.friend.x?'character':'friend';
          for(const role of present)actors[role].moves.push({line,durationSec:.7,to:{x:middle+(role===left?-105:105),y:870}});
          events.push({kind,propId:prop.id,line,actor,to,delaySec:.75,durationSec:.85});
          // Track later cues in this scene without modifying its initial snapshot.
          world.set(prop.id,{...prop,owner:ownerFor(scene,to)});
          prop.owner=ownerFor(scene,to);
        } else if(physicalKinds.has(kind)) {
          if(kind==='open'&&prop.kind!=='book'||kind==='water'&&!['flower','seed'].includes(prop.kind)||kind==='build'&&!['castle','snowman'].includes(prop.kind))continue;
          if(prop.owner&&prop.owner!==ownerFor(scene,actor)&&kind!=='catch')continue;
          const event={kind,propId:prop.id,line,actor,delaySec:openingRoll?0:.55,durationSec:1.05};
          if(['push','roll'].includes(kind)) {
            const direction=actors[actor==='character'?'friend':'character']?.x<actors[actor].x?-1:1;
            event.endpoint={x:clamp(prop.x+direction*(kind==='roll'?240:160),300,1600),y:826};
            actors[actor].moves.push({line,durationSec:.45,to:{x:clamp(prop.x-direction*90,350,1530),y:870}});
            prop.owner=null;prop.x=event.endpoint.x;prop.y=826;prop.location=scene.background;
          } else if(kind==='catch')prop.owner=ownerFor(scene,actor);
          else if(kind==='open')prop.openProgress=1;
          else if(kind==='water')prop.waterAmount=clamp((prop.waterAmount??0)+.34,0,1);
          else if(kind==='build')prop.buildProgress=clamp((prop.buildProgress??0)+.34,0,1);
          if(['water','build'].includes(kind))actors[actor].moves.push({line,durationSec:.45,to:{x:clamp(prop.x-110,350,1530),y:870}});
          events.push(event);
        } else if(kind==='pick-up'&&!prop.owner) {
          actors[actor].moves.push({line,durationSec:.55,to:{x:clamp(prop.x-90,350,1530),y:870}});
          events.push({kind,propId:prop.id,line,actor,delaySec:.6,durationSec:.8});world.set(prop.id,{...prop,owner:ownerFor(scene,actor)});
          prop.owner=ownerFor(scene,actor);
        } else if(kind==='drop'&&prop.owner===ownerFor(scene,actor)) {
          events.push({kind,propId:prop.id,line,actor,delaySec:.1,durationSec:.8});world.set(prop.id,{...prop,owner:null,location:scene.background});
          prop.owner=null;
        }
      }
      for(const role of present)if(!(actors[role].moves.length)&&(scene.lines??[]).some(l=>l.action==='walk'&&committed(l.text))) {
        const line=scene.lines.findIndex(l=>l.action==='walk'&&committed(l.text));
        actors[role].moves.push({line,durationSec:1.1,to:{x:clamp(actors[role].x+140,350,1530),y:870}});
      }
      const quiet=['tender','lullaby','thinking'].includes(scene.direction);
      scene.staging={actors,props,events,shot:quiet?'quiet':events.length?'prop':scene.direction==='celebration'?'celebration':(scene.lines??[]).some(l=>l.emotion==='surprised')?'discovery':'dialogue',auto:true};
    }
    const stage=scene.staging;
    for(const role of present) {
      const actor=stage.actors?.[role];if(actor)positions.set(ownerFor(scene,role),point(actor.moves?.at(-1)?.to??actor));
    }
    for(const p of stage.props??[])world.set(p.id,{...p,...(!p.owner&&!p.location?{location:scene.background}:{})});
    for(const event of [...(stage.events??[])].sort((a,b)=>a.line-b.line||(a.delaySec??0)-(b.delaySec??0))) {
      const p=world.get(event.propId);if(!p)continue;
      if(event.kind==='give')p.owner=ownerFor(scene,event.to);
      if(event.kind==='pick-up'||event.kind==='catch')p.owner=ownerFor(scene,event.actor);
      if(['push','roll'].includes(event.kind)) {
        const actor=stage.actors?.[event.actor??'character'];
        const direction=stage.actors?.[event.actor==='friend'?'character':'friend']?.x<actor?.x?-1:1;
        const start=p.owner?(actor?.moves?.filter(m=>m.line<=event.line).at(-1)?.to?.x??actor?.x??870)+direction*90:p.x;
        const endpoint=propPoint(event.endpoint??{x:start+direction*(event.distance??(event.kind==='roll'?240:160)),y:826});
        if(event.kind==='roll')p.rotation=(p.rotation??0)+(endpoint.x-start)/53.3*180/Math.PI;
        p.owner=null;p.x=endpoint.x;p.y=endpoint.y;p.location=scene.background;
      }
      if(event.kind==='open')p.openProgress=1;
      if(event.kind==='water')p.waterAmount=increment(p.waterAmount,event.amount);
      if(event.kind==='build')p.buildProgress=increment(p.buildProgress,event.amount,1);
      if(event.kind==='drop'){
        const actor=stage.actors?.[event.actor],at=actor?.moves?.filter(m=>m.line<=event.line).at(-1)?.to??actor;
        const other=stage.actors?.[event.actor==='friend'?'character':'friend'];
        p.owner=null;p.x=(at?.x??870)+(other&&other.x<(at?.x??870)?-90:90);p.y=826;p.location=scene.background;
      }
    }
    previousBackground=scene.background;
  }
  return script;
}

/** Convert line-indexed cues into integer frame ranges after voice durations are known. */
export function prepareStage(scene,slot,fps=30) {
  const stage=scene.staging;if(!stage)return null;
  const range=cue=> {
    const l=slot.lines[cue.line];
    const available=Math.max(1,Math.min(l?.duration??fps*2,Math.round((l?.line?.durationSec??2)*fps)));
    const delay=clamp(Math.round((cue.delaySec??0)*fps),0,Math.min(available-1,Math.floor(available*.45)));
    const from=(l?.from??0)+delay;
    return {from,until:from+Math.max(1,Math.min(Math.round((cue.durationSec??.8)*fps),available-delay))};
  };
  const actors={};for(const role of roles)if(stage.actors?.[role]) {
    const a=stage.actors[role];actors[role]={...point(a),owner:ownerFor(scene,role),moves:(a.moves??[]).map(c=>({...range(c),toPoint:point(c.to)}))};
  }
  return {actors,props:stage.props??[],events:(stage.events??[]).map(c=>({...c,...range(c)})).sort((a,b)=>a.from-b.from),background:scene.background,shot:stage.shot??'dialogue',fps};
}

/** No retained playback state: seeking and rendering separate chunks sample identically. */
function sampleActors(stage,frame) {
  const actors={};
  for(const role of roles)if(stage.actors[role]) {
    const a=stage.actors[role];let at={x:a.x,y:a.y},distance=0,moving=false,sign=1,stoppedFor=null;
    for(const move of a.moves) {
      if(frame<move.from)break;
      const k=smooth((frame-move.from)/(move.until-move.from)),next={x:mix(at.x,move.toPoint.x,k),y:mix(at.y,move.toPoint.y,k)};
      distance+=Math.hypot(next.x-at.x,next.y-at.y);sign=move.toPoint.x<at.x?-1:1;
      moving=frame<move.until;at=next;if(moving)break;
      stoppedFor=(frame-move.until)/stage.fps;
    }
    actors[role]={...at,owner:a.owner,moving,walkT:distance/140,stoppedFor:moving?null:stoppedFor,flip:moving?sign<0:role==='friend'};
  }
  if(actors.character&&actors.friend&&!actors.character.moving&&!actors.friend.moving){actors.character.flip=actors.character.x>actors.friend.x;actors.friend.flip=!actors.character.flip;}
  return actors;
}
function heldAt(actors,role) {
  const other=actors[role==='character'?'friend':'character'];
  const side=other&&other.x<actors[role].x?-1:1;
  return {x:actors[role].x+side*90,y:actors[role].y-135};
}
const propPoint=p=>({x:clamp(p?.x??960,300,1600),y:clamp(p?.y??826,350,900)});
const increment=(value,amount,defaultValue=0)=>clamp((value??defaultValue)+clamp(amount??.34,0,1),0,1);

export function sampleStage(stage,frame) {
  if(!stage)return null;
  const actors=sampleActors(stage,frame),reaches={};
  const roleOf=(owner,cast=actors)=>roles.find(role=>cast[role]?.owner===animal(owner));
  const props=stage.props.map(p=>{
    const state={...p,...propPoint(p)};
    for(const key of ['openProgress','buildProgress','waterAmount'])if(state[key]!==undefined)state[key]=clamp(state[key],0,1);
    return state;
  });
  for(const p of props) {
    const propReaches={};
    let role=roleOf(p.owner),at=role?heldAt(actors,role):propPoint(p),active=false;
    for(const event of stage.events.filter(e=>e.propId===p.id)) {
      const actor=event.actor??'character';if(!actors[actor])continue;
      if(frame<event.from) {
        if(frame>=event.from-6&&(event.kind==='pick-up'||physicalKinds.has(event.kind))) {
          const amount=smooth((frame-event.from+6)/6);
          propReaches[actor]={target:at,amount,crouch:['pick-up','push','roll'].includes(event.kind)?.18:0};
        }
        break;
      }
      if(event.kind==='show'){p.hidden=false;continue;}
      const k=smooth((frame-event.from)/Math.max(1,event.until-event.from));
      const startActors=sampleActors(stage,event.from),endActors=sampleActors(stage,event.until);
      const previousRole=roleOf(p.owner,startActors);
      const source=previousRole?heldAt(startActors,previousRole):propPoint(p);
      const carrier=heldAt(actors,actor),endCarrier=heldAt(endActors,actor);
      const release=1-smooth((frame-event.until)/(stage.fps*(event.kind==='give'?.25:.3)));
      if(event.kind==='give'&&actors[event.to]) {
        const receiver=heldAt(actors,event.to),middle={x:(actors[actor].x+actors[event.to].x)/2,y:carrier.y};
        at=k<.5?{x:mix(carrier.x,middle.x,k*2),y:mix(carrier.y,middle.y,k*2)}:{x:mix(middle.x,receiver.x,(k-.5)*2),y:mix(middle.y,receiver.y,(k-.5)*2)};
        at.y-=Math.sin(k*Math.PI)*14;
        if(k<1){propReaches[actor]={target:at,amount:1,crouch:0};propReaches[event.to]={target:at,amount:smooth(k*3),crouch:0};}
        else {p.owner=actors[event.to].owner;if(release>0)propReaches[actor]={target:at,amount:release,crouch:0};}
      } else if(event.kind==='pick-up'||event.kind==='catch') {
        const from=event.kind==='catch'&&event.endpoint?propPoint(event.endpoint):source;
        const destination=event.kind==='pick-up'?carrier:endCarrier;
        at={x:mix(from.x,destination.x,k),y:mix(from.y,destination.y,k)-Math.sin(k*Math.PI)*(event.kind==='catch'?70:18)};
        if(k<1)propReaches[actor]={target:at,amount:1,crouch:event.kind==='pick-up'?(1-k)*.18:0};
        else p.owner=actors[actor].owner;
        if(event.kind==='catch'&&previousRole&&previousRole!==actor&&k<1)propReaches[previousRole]={target:at,amount:1-smooth(k*3),crouch:0};
      } else if(event.kind==='drop'||event.kind==='push'||event.kind==='roll') {
        const direction=endCarrier.x<endActors[actor].x?-1:1;
        const ground=event.kind==='drop'?{x:endCarrier.x,y:826}:propPoint(event.endpoint??{x:source.x+direction*(event.distance??(event.kind==='roll'?240:160)),y:826});
        const departure=event.kind==='drop'?carrier:source;
        at={x:mix(departure.x,ground.x,k),y:mix(departure.y,ground.y,k)};
        if(event.kind==='roll')p.rotation=(p.rotation??0)+(at.x-source.x)/53.3*180/Math.PI;
        // A grounded endpoint belongs to the world, never to an actor's later pose.
        if(k<1)propReaches[actor]={target:at,amount:event.kind==='roll'?1-smooth(k/.45):1,crouch:event.kind==='drop'?.18*k:.18};
        else {p.owner=null;p.location=stage.background;if(release>0&&event.kind!=='roll')propReaches[actor]={target:ground,amount:release,crouch:.18};}
      } else if(event.kind==='open'||event.kind==='water'||event.kind==='build') {
        at=previousRole?carrier:source;
        if(event.kind==='open')p.openProgress=mix(clamp(p.openProgress??1,0,1),1,k);
        if(event.kind==='water') {
          p.waterAmount=mix(p.waterAmount??0,increment(p.waterAmount,event.amount),k);
          if(k<1) {
            const amount=Math.sin(k*Math.PI),side=at.x>=actors[actor].x?1:-1;
            p.watering={x:carrier.x,y:carrier.y-35,target:{x:at.x,y:at.y-12},amount,tilt:side*25*amount,flow:Math.sin(k*Math.PI)**2};
          }
        }
        if(event.kind==='build')p.buildProgress=mix(clamp(p.buildProgress??1,0,1),increment(p.buildProgress,event.amount,1),k);
        if(k<1||release>0)propReaches[actor]={target:event.kind==='water'?carrier:at,amount:k<1?1:release,crouch:event.kind==='build'?Math.sin(k*Math.PI)*.12:0};
      }
      p.x=at.x;p.y=at.y;
      if(k<1){active=true;break;}
    }
    role=roleOf(p.owner);
    if(role&&!active){at=heldAt(actors,role);propReaches[role]={target:at,amount:1,crouch:0};}
    if(!p.hidden)Object.assign(reaches,propReaches);
    p.x=clamp(at.x,300,1600);p.y=clamp(at.y,350,900);
  }
  return {actors,props:props.filter(p=>p.owner?!!roleOf(p.owner):!p.location||p.location===stage.background),reaches,shot:stage.shot};
}

/** A completed route settles the feet instead of leaving the actor walking in place. */
export function stageMotion(actor,motion) {
  if(!actor)return motion;
  if(actor.moving)return {action:'walk',t:actor.walkT,blend:1};
  const settled=actor.stoppedFor!==null&&actor.stoppedFor!==undefined;
  const action=settled&&motion.action==='walk'?'idle':motion.action;
  if(settled&&actor.stoppedFor<.18)return {action,t:actor.stoppedFor,previousAction:{action:'walk',t:actor.walkT},blend:smooth(actor.stoppedFor/.18)};
  return {...motion,action};
}
