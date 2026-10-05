import type {StageSample} from './types';
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
/** Framing follows the visible action; captions and questions are outside this camera. */
export function stageCamera(stage:StageSample,role:string,elapsed:number,question:boolean) {
  const main=stage.actors.character,friend=stage.actors.friend;
  const actor=role==='friend'?friend:main;
  const center=main&&friend?(main.x+friend.x)/2:main?.x??960;
  const p=stage.props[0];
  const zoom=question?1:stage.shot==='prop'?1.10:stage.shot==='reaction'?1.12:stage.shot==='discovery'?1.08:stage.shot==='quiet'?1.025:stage.shot==='celebration'?1.035:1.055;
  const k=Math.min(1,Math.max(0,elapsed/.7));
  return {zoom:1+(zoom-1)*k*k*(3-2*k),origin:{x:clamp(stage.shot==='prop'&&p?p.x:question?center:actor?.x??center,520,1370),y:stage.shot==='prop'&&p?clamp(p.y,430,740):565}};
}
