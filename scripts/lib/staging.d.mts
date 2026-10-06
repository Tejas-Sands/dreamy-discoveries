import type {KidsScript, Scene, StageSample,StageActorSample,Action,StageEvent,StagePoint,StageProp,StageRole,SceneStaging} from '../../src/lib/types';
import type {SceneSlot} from '../../src/lib/timing';
export function stageStory<T extends KidsScript>(script:T):T;
export interface PreparedStage {
  actors: Partial<Record<StageRole, StagePoint & {owner:string; moves:Array<{from:number;until:number;toPoint:StagePoint}>}>>;
  props: StageProp[];
  events: Array<StageEvent & {from:number;until:number}>;
  background: Scene['background'];
  shot: SceneStaging['shot'];
  fps: number;
}
export function prepareStage(scene:Scene,slot:SceneSlot,fps?:number):PreparedStage|null;
export function sampleStage(stage:PreparedStage|null,frame:number):StageSample|null;
export function stageMotion(actor:StageActorSample|undefined,motion:{action:Action;t:number;previousAction?:{action:Action;t:number};blend:number}):{action:Action;t:number;previousAction?:{action:Action;t:number};blend:number};
