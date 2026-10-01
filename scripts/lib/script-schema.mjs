import {z} from 'zod';
import {BACKGROUNDS, PALETTES, EMOTIONS, ACTIONS, SCENE_KINDS} from './vocab.mjs';
import {castKinds} from './cast.mjs';

const kinds = castKinds();
const question = z.object({answer: z.object({text: z.string().min(1), emoji: z.string()}), praise: z.string().min(1)});
const line = z.object({text: z.string().min(1).max(160), speaker: z.enum(['character', 'friend', 'narrator']),
  emotion: z.enum(EMOTIONS), action: z.enum(ACTIONS)}).strict();
export const ScriptSchema = z.object({
  type: z.enum(['story', 'rhyme']), title: z.string().min(3).max(60), palette: z.enum(PALETTES),
  mainCharacter: z.object({kind: z.enum(kinds), name: z.string().min(1).max(20)}),
  intro: z.string().min(3).max(200).nullable(), outro: z.string().min(3).max(200).nullable(),
  moral: z.string().nullable(), moralRhyme: z.array(z.string().min(3).max(80)).length(2).nullable(),
  youtube: z.object({title: z.string(), description: z.string(), tags: z.array(z.string()).min(3)}),
  scenes: z.array(z.object({kind: z.enum(SCENE_KINDS), background: z.enum(BACKGROUNDS), character: z.enum(kinds),
    secondCharacter: z.enum(kinds).nullable(), energy: z.enum(['calm', 'upbeat']), holdSec: z.number().min(0).max(5),
    prop: z.string().nullable(), question: question.nullable(), lines: z.array(line).min(1).max(6)}).strict()).min(3).max(40),
}).strict();

// A small strict schema, shared by Gemini/Groq. Detailed bounds stay in local Zod validation.
const string = {type: 'string'};
const enumOf = values => ({type: 'string', enum: values});
const nullable = schema => ({anyOf: [schema, {type: 'null'}]});
const arrayOf = items => ({type: 'array', items});
const objectOf = properties => ({type: 'object', properties, required: Object.keys(properties), additionalProperties: false});
export const scriptJsonSchema = objectOf({
  type: enumOf(['story', 'rhyme']), title: string, palette: enumOf(PALETTES),
  mainCharacter: objectOf({kind: enumOf(kinds), name: string}), intro: nullable(string), outro: nullable(string),
  moral: nullable(string), moralRhyme: nullable(arrayOf(string)),
  youtube: objectOf({title: string, description: string, tags: arrayOf(string)}),
  scenes: arrayOf(objectOf({kind: enumOf(SCENE_KINDS), background: enumOf(BACKGROUNDS), character: enumOf(kinds),
    secondCharacter: nullable(enumOf(kinds)), energy: enumOf(['calm', 'upbeat']), holdSec: {type: 'number'},
    prop: nullable(string), question: nullable(objectOf({answer: objectOf({text: string, emoji: string}), praise: string})),
    lines: arrayOf(objectOf({text: string, speaker: enumOf(['character', 'friend', 'narrator']), emotion: enumOf(EMOTIONS), action: enumOf(ACTIONS)})),
  })),
});
