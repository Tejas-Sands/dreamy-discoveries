import type {Line, VoxCue} from './types';

type Recording = {file: string; durationSec: number};
type Catalog = Record<string, Recording[]>;
export function voxRecording(cue: VoxCue, key: string, index: number, catalog: Catalog, publicOnly?: boolean): Recording | null;
export function voxRoom(cues?: VoxCue[]): {pre: number; post: number};
export function resolveVoxEvents(line: Line | null | undefined, speechFrom: number, pre: number, key: string, catalog: Catalog):
  Array<Recording & {from: number; kind: string; speaker: Line['speaker']}>;
