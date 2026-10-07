import cast from '../../../library/cast.json';
import {UPRIGHT_LAYOUTS} from './chartLayout';

/** Individually directed mannerisms. Species keys stay separate from the six
 * named story characters; the library does not expand the Sunny Meadow cast. */
export interface PerformanceProfile {
  tilt: number; dip: number; accent: number; arm: number;
  tempo: number; travel: number; softness: number;
  stepSeconds: number; stride: number; lift: number; waveHz: number;
}

const profile = (tilt: number, dip: number, accent: number, arm: number,
  tempo: number, travel: number, softness: number, stepSeconds: number,
  stride: number, lift: number, waveHz: number): PerformanceProfile =>
  ({tilt, dip, accent, arm, tempo, travel, softness, stepSeconds, stride, lift, waveHz});

export const PERFORMANCE_PROFILES: Record<string, PerformanceProfile> = {
  // Reference performances: preserve their timing and weight.
  bear: profile(2, 2, .62, -3, .7, .78, 1.18, .62, 8, 4, 1.3),
  duck: profile(4, -2, 1.05, 9, 1.4, 1.02, 1.08, .5, 6, 3, 1.65),
  bunny: profile(-3, -1, 1.15, 5, 1.8, 1.08, .95, .46, 7, 5, 1.8),
  fox: profile(-5, 0, .95, 3, 1.6, .94, .86, .48, 9, 4, 1.7),
  turtle: profile(1, 3, .42, -5, .5, .56, 1.12, .86, 4, 2, .9),
  owl: profile(6, -1, .7, 1, .85, .72, .78, .68, 5, 3, 1.1),
  cat: profile(-4, -1, .78, 3, 1.25, .88, .88, .51, 7, 3, 1.6),
  dog: profile(5, 1, .98, 6, 1.35, .98, 1.02, .5, 8, 4, 1.8),
  elephant: profile(2, 3, .48, -4, .55, .55, .82, .82, 7, 2, .95),
  cow: profile(3, 2, .57, -2, .7, .66, .88, .72, 6, 3, 1.05),
  pig: profile(-2, 1, .82, 4, 1.1, .8, 1.1, .56, 6, 3, 1.5),
  hippo: profile(2, 3, .46, -4, .55, .53, 1.12, .8, 6, 2, .95),
  panda: profile(-2, 2, .56, -2, .65, .68, 1.12, .7, 6, 3, 1.1),
  koala: profile(4, 2, .44, -3, .55, .58, 1.08, .8, 4, 2, .95),
  mouse: profile(-5, -2, .92, 4, 1.8, .92, .9, .4, 5, 3, 1.9),
  monkey: profile(5, -1, 1.1, 7, 1.7, 1.05, 1, .44, 8, 5, 1.9),
  raccoon: profile(-4, 0, .8, 2, 1.2, .84, .9, .54, 6, 3, 1.5),
  hedgehog: profile(3, 2, .48, -4, .7, .56, .86, .74, 4, 2, 1),
  sheep: profile(3, 1, .62, -1, .85, .7, 1.08, .64, 5, 3, 1.2),
  squirrel: profile(-4, -2, 1.04, 6, 1.85, 1, .9, .42, 7, 5, 1.9),
  lion: profile(1, 1, .7, 0, .85, .78, .94, .64, 8, 3, 1.15),
  tiger: profile(-3, 0, .82, 2, 1.1, .88, .9, .56, 9, 4, 1.45),
  bird: profile(5, -2, 1, 7, 1.6, .95, .94, .43, 5, 4, 1.85),
  chick: profile(-4, -2, 1.05, 8, 1.8, .95, 1.06, .4, 4, 3, 1.95),
  penguin: profile(3, 1, .7, 3, 1, .72, 1.02, .55, 4, 2, 1.3),
  horse: profile(-2, 0, .74, 0, 1, .76, .82, .58, 10, 4, 1.2),
  zebra: profile(3, -1, .8, 0, 1.15, .8, .82, .54, 9, 4, 1.35),
  unicorn: profile(-3, -1, .64, 0, .9, .7, .88, .62, 9, 4, 1.15),
  giraffe: profile(4, -1, .5, 0, .7, .55, .72, .8, 9, 3, 1),
  bee: profile(-4, -1, .98, 5, 1.8, .86, .8, .38, 3, 2, 2),
  ladybug: profile(4, 1, .72, 3, 1.15, .66, .9, .5, 3, 2, 1.5),
  fish: profile(-3, 0, .75, 2, 1.2, .76, .8, .62, 5, 0, 1.6),
  whale: profile(2, 2, .4, -2, .5, .48, .78, .9, 7, 0, .8),
  frog: profile(5, -2, 1.02, 5, 1.4, 1.12, 1.1, .54, 8, 5, 1.6),
  dinosaur: profile(-2, 1, .72, -2, .85, .72, .9, .7, 8, 3, 1.1),
  dragon: profile(4, -1, .94, 3, 1.25, .96, .98, .58, 8, 4, 1.5),
  star: profile(-3, -2, .94, 4, 1.4, .82, 1.02, .6, 4, 0, 1.6),
  snowman: profile(2, 1, .52, -2, .7, .45, .65, .86, 4, 0, 1),
};

export const STORYBOOK_KINDS = new Set(Object.keys(PERFORMANCE_PROFILES));
export const UPRIGHT_KINDS = new Set(Object.keys(UPRIGHT_LAYOUTS));
export const FEATHERED_KINDS = new Set(['duck', 'owl', 'bird', 'chick']);
// Tilly carries props with a front flipper, while retaining the horizontal shell.
export const REACHABLE_KINDS = new Set([...UPRIGHT_KINDS, 'turtle']);

const aliases: Record<string, string> = Object.fromEntries(cast.members.map(member => [member.id, member.kind]));
export const speciesKind = (kind: string) => aliases[kind] ?? kind;
export const performanceProfile = (kind: string) => PERFORMANCE_PROFILES[speciesKind(kind)];
