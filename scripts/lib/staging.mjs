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
const roles=['character','friend'];
const ownerFor=(scene,role)=>animal(role==='friend'?scene.secondCharacter:scene.character);

/** Populate only missing staging. Authored stages and all older episodes survive unchanged. */
export function stageStory(script) {
  if((script.presentationVersion??0)<2)return script;
  const world=new Map(),positions=new Map();let previousBackground;
  for(const scene of script.scenes??[]) {
    const present=roles.filter(role=>ownerFor(scene,role)&&ownerFor(scene,role)!=='none');
    if(!scene.staging) {
      const actors={};
      for(const role of present)actors[role]={...(previousBackground===scene.background?positions.get(ownerFor(scene,role)):null)??{x:role==='friend'?1360:present.length>1?620:870,y:870},moves:[]};
      const declared=declaredProp(scene.prop);
      if(declared&&!world.has(declared.id)) {
        const pickup=(scene.lines??[]).some(l=>committed(l.text)&&actionKind(l.text)==='pick-up');
        world.set(declared.id,{...declared,owner:pickup||['castle','snowman'].includes(declared.kind)?null:ownerFor(scene,'character'),x:actors.character?.x+110||980,y:826,location:scene.background});
      }
      const props=[...world.values()].filter(p=>p.owner?present.some(role=>ownerFor(scene,role)===p.owner):p.location===scene.background).map(p=>({...p}));
      const working=new Map(props.map(p=>[p.id,{...p}]));
      const events=[];
      for(const [line,l] of (scene.lines??[]).entries()) {
        if(!committed(l.text)||l.role==='question'||scene.question)continue;
        const kind=actionKind(l.text);if(!kind)continue;
        const candidate=declared?props.find(p=>p.id===declared.id):props.find(p=>new RegExp(`\\b${p.kind}\\b`,'i').test(l.text));if(!candidate)continue;
        const prop=working.get(candidate.id);
        if(!new RegExp(`\\b${prop.kind}\\b|\\b(it|this|that)\\b`,'i').test(l.text)&&prop.kind!=='object')continue;
        const subject=l.text.match(/^\s*(?:grandpa\s+|professor\s+)?(taffy|ben|daisy|fiona|tilly|ozzy|bunny|bear|duck|fox|turtle|owl)\b/i)?.[1]?.toLowerCase();
        const namedRole=subject?present.find(role=>ownerFor(scene,role)===animal(subject)):null;
        if(l.speaker==='narrator'&&!namedRole)continue;
        const actor=namedRole??(l.speaker==='friend'?'friend':'character');if(!actors[actor])continue;
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
    for(const p of stage.props??[])world.set(p.id,{...p});
    for(const event of stage.events??[]) {
      const p=world.get(event.propId);if(!p)continue;
      if(event.kind==='give')p.owner=ownerFor(scene,event.to);
      if(event.kind==='pick-up')p.owner=ownerFor(scene,event.actor);
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
    const available=Math.max(6,Math.min(l?.duration??fps*2,Math.round((l?.line?.durationSec??2)*fps)));
    const delay=Math.min(Math.round((cue.delaySec??0)*fps),Math.floor(available*.45));
    const from=(l?.from??0)+delay;
    return {from,until:from+Math.max(6,Math.min(Math.round((cue.durationSec??.8)*fps),available-delay))};
  };
  const actors={};for(const role of roles)if(stage.actors?.[role]) {
    const a=stage.actors[role];actors[role]={...point(a),owner:ownerFor(scene,role),moves:(a.moves??[]).map(c=>({...range(c),toPoint:point(c.to)}))};
  }
  return {actors,props:stage.props??[],events:(stage.events??[]).map(c=>({...c,...range(c)})),background:scene.background,shot:stage.shot??'dialogue',fps};
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
export function sampleStage(stage,frame) {
  if(!stage)return null;
  const actors=sampleActors(stage,frame),reaches={};
  const roleOf=owner=>roles.find(role=>actors[role]?.owner===animal(owner));
  const held=role=>heldAt(actors,role);
  const props=stage.props.map(p=>({...p,x:clamp(p.x??960,300,1600),y:clamp(p.y??826,350,900)}));
  for(const p of props) {
    let role=roleOf(p.owner);let at=role?held(role):{x:p.x??960,y:p.y??826};let target=null;
    for(const event of stage.events.filter(e=>e.propId===p.id)) {
      if(frame<event.from){
        if(event.kind==='pick-up'&&frame>=event.from-6&&actors[event.actor])reaches[event.actor]={target:at,amount:smooth((frame-event.from+6)/6),crouch:.18};
        break;
      }
      const k=smooth((frame-event.from)/(event.until-event.from));
      const actor=event.actor??'character';if(!actors[actor])continue;
      if(event.kind==='show'){p.hidden=false;continue;}
      const carrier=held(actor);
      if(event.kind==='give'&&actors[event.to]) {
        const receiver=held(event.to),middle={x:(actors[actor].x+actors[event.to].x)/2,y:carrier.y};
        at=k<.5?{x:mix(carrier.x,middle.x,k*2),y:mix(carrier.y,middle.y,k*2)}:{x:mix(middle.x,receiver.x,(k-.5)*2),y:mix(middle.y,receiver.y,(k-.5)*2)};
        if(k<1){reaches[actor]={target:at,amount:1,crouch:0};reaches[event.to]={target:at,amount:smooth(k*3),crouch:0};target=actor;}
        else {
          p.owner=actors[event.to].owner;
          const release=1-smooth((frame-event.until)/(stage.fps*.25));
          if(release>0)reaches[actor]={target:at,amount:release,crouch:0};
        }
      } else if(event.kind==='pick-up') {
        at={x:mix(p.x??960,carrier.x,k),y:mix(p.y??826,carrier.y,k)};
        if(k<1){reaches[actor]={target:at,amount:1,crouch:(1-k)*.18};target=actor;}else p.owner=actors[actor].owner;
      } else if(event.kind==='drop') {
        const endpoint=heldAt(sampleActors(stage,event.until),actor);
        const ground={x:endpoint.x,y:826};at={x:mix(carrier.x,ground.x,k),y:mix(carrier.y,ground.y,k)};
        if(k<1){reaches[actor]={target:at,amount:1,crouch:k*.18};target=actor;}else {
          p.owner=null;p.x=ground.x;p.y=ground.y;p.location=stage.background;
          const release=1-smooth((frame-event.until)/(stage.fps*.3));
          if(release>0)reaches[actor]={target:ground,amount:release,crouch:.18};
        }
      }
    }
    role=roleOf(p.owner);if(role&&!target){at=held(role);reaches[role]={target:at,amount:1,crouch:0};}
    p.x=at.x;p.y=at.y;
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
