import type {KidsScript, Scene, SceneDirection, TransitionKind} from './types';

export function sceneDirection(scene: Scene, script?: Partial<KidsScript> & {template?: string | null}): SceneDirection;
export function sceneTransition(scene: Scene, previous?: Scene, script?: Partial<KidsScript>): TransitionKind;
