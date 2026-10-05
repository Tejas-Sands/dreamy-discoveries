import type {KidsScript, Scene, StageSample,StageActorSample,Action} from '../../src/lib/types';
import type {SceneSlot} from '../../src/lib/timing';
export function stageStory<T extends KidsScript>(script:T):T;
export interface PreparedStage {events: Array<{from:number;until:number;kind:string;actor?:string;propId:string}>}
export function prepareStage(scene:Scene,slot:SceneSlot,fps?:number):PreparedStage|null;
export function sampleStage(stage:PreparedStage|null,frame:number):StageSample|null;
export function stageMotion(actor:StageActorSample|undefined,motion:{action:Action;t:number;previousAction?:{action:Action;t:number};blend:number}):{action:Action;t:number;previousAction?:{action:Action;t:number};blend:number};
