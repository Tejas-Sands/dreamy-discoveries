import type {Pose} from '../components/characters/pose';
import type {StagePoint, StageReach} from './types';
import {FEATHERED_KINDS, speciesKind} from '../components/characters/performanceProfiles';
import {UPRIGHT_LAYOUTS} from '../components/characters/chartLayout';
type BodyPose=Pick<Pose,'x'|'y'|'lean'|'sx'|'sy'|'flip'|'armL'|'armR'> & Partial<Pick<Pose,'torsoTilt'|'torsoTurn'>>;
const radians=(a:number)=>a*Math.PI/180;
const rotate=(p:StagePoint,a:number)=>({x:p.x*Math.cos(a)-p.y*Math.sin(a),y:p.x*Math.sin(a)+p.y*Math.cos(a)});
export function rigToWorld(at:StagePoint,pose:BodyPose,flip:boolean,width:number,center:StagePoint):StagePoint {
  const p=rotate({x:(at.x-100)*pose.sx*(flip?-1:1)*pose.flip,y:(at.y+pose.y-250)*pose.sy},radians(pose.lean));
  return {x:center.x+(p.x+pose.x)*width/240,y:center.y+p.y*width/240};
}
export function worldToRig(at:StagePoint,pose:BodyPose,flip:boolean,width:number,center:StagePoint):StagePoint {
  const p=rotate({x:(at.x-center.x)*240/width-pose.x,y:(at.y-center.y)*240/width},-radians(pose.lean));
  return {x:100+p.x/(pose.sx*(flip?-1:1)*pose.flip),y:250+p.y/pose.sy-pose.y};
}
/** Hip pivot is (250,510) in the storybook drawing, or (100,230) in rig space. */
const tiltTorso=(point:StagePoint,angle:number):StagePoint=>{
  const p=rotate({x:point.x-100,y:point.y-230},radians(angle));
  return {x:p.x+100,y:p.y+230};
};
const geometry=(raw:string,side:'L'|'R',pose:BodyPose)=>{
  const kind=speciesKind(raw),bird=FEATHERED_KINDS.has(kind)||kind==='penguin';
  if(kind==='turtle')return {shoulder:side==='R'?{x:132,y:201}:{x:78,y:190},paw:{x:-14,y:26},bird:true,bear:false};
  const turn=pose.torsoTurn??0;
  const layout=UPRIGHT_LAYOUTS[kind];
  const shoulder=layout?.shoulder??95,shoulderY=layout?.shoulderY??352;
  return {shoulder:{x:100+(side==='R'?1:-1)*shoulder*.4*(1-Math.abs(turn)*.22)+turn*8,y:26+shoulderY*.4+(side==='R'?-1:1)*turn*4},paw:{x:0,y:(layout?.armLength??67)*.4},bird,bear:kind==='bear'};
};
/** These anchors use the very same shoulder/paw coordinates as StorybookBody. */
export function handAnchor(kind:string,pose:BodyPose,side:'L'|'R',extension?:number):StagePoint {
  const g=geometry(kind,side,pose),angle=side==='R'?-pose.armR:pose.armL;
  const inward=Math.min(1,Math.max(0,-(side==='R'?pose.armR:pose.armL)/90));
  const stretch=extension??(g.bird?1:1+inward*(g.bear?.4:.16));
  const p=rotate({x:g.paw.x,y:g.paw.y*stretch},radians(angle));
  return tiltTorso({x:g.shoulder.x+p.x,y:g.shoulder.y+p.y},pose.torsoTilt??0);
}
/** Aim one soft arm at a world target, retaining the other gesture and body clock. */
export function solveReach(pose:BodyPose,kind:string,flip:boolean,width:number,center:StagePoint,reach:StageReach):{side:'L'|'R';extension:number} {
  const amount=Math.max(0,Math.min(1,reach.amount));
  pose.sy*=1-Math.max(0,Math.min(.4,reach.crouch))*amount;
  // A carrying paw needs a visible front rig even during an authored spin.
  pose.flip=pose.flip*(1-amount)+amount;
  if(Math.abs(pose.flip)<.1)pose.flip=.1;
  const target=tiltTorso(worldToRig(reach.target,pose,flip,width,center),-(pose.torsoTilt??0));
  const side=target.x>=100?'R':'L',g=geometry(kind,side,pose);
  const dx=target.x-g.shoulder.x,dy=target.y-g.shoulder.y;
  const extension=Math.max(.5,Math.min(2.2,Math.sqrt(Math.max(0,dx*dx+dy*dy-g.paw.x*g.paw.x))/g.paw.y));
  const angle=(Math.atan2(dy,dx)-Math.atan2(g.paw.y*extension,g.paw.x))*180/Math.PI;
  const desired=side==='R'?-angle:angle,current=side==='R'?pose.armR:pose.armL;
  const difference=((desired-current+540)%360)-180;
  if(side==='R')pose.armR=current+difference*amount;else pose.armL=current+difference*amount;
  return {side,extension:1+(extension-1)*amount};
}
