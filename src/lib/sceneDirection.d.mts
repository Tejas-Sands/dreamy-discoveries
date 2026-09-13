import type {KidsScript, Scene, SceneDirection} from './types';

export function sceneDirection(scene: Scene, script?: Partial<KidsScript> & {template?: string | null}): SceneDirection;
