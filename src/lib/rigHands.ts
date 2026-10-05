import type {Pose} from '../components/characters/pose';
import type {StagePoint, StageReach} from './types';
type BodyPose=Pick<Pose,'x'|'y'|'lean'|'sx'|'sy'|'flip'|'armL'|'armR'>;
const radians=(a:number)=>a*Math.PI/180;
const rotate=(p:StagePoint,a:number)=>({x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)});
const kinds:Record<string,string>={taffy:'bunny',ben:'bear',daisy:'duck',fiona:'fox',tilly:'turtle',ozzy:'owl'};
export function rigToWorld(at:StagePoint,pose:BodyPose,flip:boolean,width:number,center:StagePoint):StagePoint {
  const p=rotate({x:(at.x-100)*pose.sx*(flip?-1:1)*pose.flip,y:(at.y+pose.y-250)*pose.sy},radians(pose.lean));
  return {x:center.x+(p.x+pose.x)*width/240,y:center.y+p.y*width/240};
}
export function worldToRig(at:StagePoint,pose:BodyPose,flip:boolean,width:number,center:StagePoint):StagePoint {
  const p=rotate({x:(at.x-center.x)*240/width-pose.x,y:(at.y-center.y)*240/width},-radians(pose.lean));
  return {x:100+p.x/(pose.sx*(flip?-1:1)*pose.flip),y:250+p.y/pose.sy-pose.y};
}
const geometry=(raw:string,side:'L'|'R')=>{
  const kind=kinds[raw]??raw,bird=kind==='duck'||kind==='owl';
  return {shoulder:{x:side==='R'?(kind==='bear'?144.4:138):(kind==='bear'?55.6:62),y:166.8},paw:{x:bird?(side==='R'?2.4:-2.4):(side==='R'?-.8:.8),y:bird?35.2:26.8},bird,bear:kind==='bear'};
};
/** These anchors use the very same shoulder/paw coordinates as StorybookBody. */
export function handAnchor(kind:string,pose:BodyPose,side:'L'|'R',extension?:number):StagePoint {
  const g=geometry(kind,side),angle=side==='R'?-pose.armR:pose.armL;
  const inward=Math.min(1,Math.max(0,-(side==='R'?pose.armR:pose.armL)/90));
  const stretch=extension??(g.bird?1:1+inward*(g.bear?.4:.16));
  const p=rotate({x:g.paw.x,y:g.paw.y*stretch},radians(angle));
  return {x:g.shoulder.x+p.x,y:g.shoulder.y+p.y};
}
/** Aim one soft arm at a world target, retaining the other gesture and body clock. */
export function solveReach(pose:BodyPose,kind:string,flip:boolean,width:number,center:StagePoint,reach:StageReach):{side:'L'|'R';extension:number} {
  const amount=Math.max(0,Math.min(1,reach.amount));
  pose.sy*=1-Math.max(0,Math.min(.4,reach.crouch))*amount;
  // A carrying paw needs a visible front rig even during an authored spin.
  pose.flip=pose.flip*(1-amount)+amount;
  if(Math.abs(pose.flip)<.1)pose.flip=.1;
  const target=worldToRig(reach.target,pose,flip,width,center);
  const side=target.x>=100?'R':'L',g=geometry(kind,side);
  const dx=target.x-g.shoulder.x,dy=target.y-g.shoulder.y;
  const extension=Math.max(.5,Math.min(2.2,Math.sqrt(Math.max(0,dx*dx+dy*dy-g.paw.x*g.paw.x))/g.paw.y));
  const angle=(Math.atan2(dy,dx)-Math.atan2(g.paw.y*extension,g.paw.x))*180/Math.PI;
  const desired=side==='R'?-angle:angle,current=side==='R'?pose.armR:pose.armL;
  const difference=((desired-current+540)%360)-180;
  if(side==='R')pose.armR=current+difference*amount;else pose.armL=current+difference*amount;
  return {side,extension:1+(extension-1)*amount};
}
