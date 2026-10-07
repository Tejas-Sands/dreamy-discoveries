import type {Action, Emotion, KidsScript, Scene} from './types';

const aliases: Record<string,string> = {taffy:'bunny',ben:'bear',daisy:'duck',fiona:'fox',tilly:'turtle',ozzy:'owl'};
const animal = (kind: string | null | undefined) => kind && kind !== 'none' ? aliases[kind] ?? kind : null;
const names = /\b(?:grandpa\s+tilly|professor\s+ozzy|taffy|ben|daisy|fiona|tilly|ozzy)\b['’]?s?/gi;
const objects: Array<[string, RegExp]> = [
  ['strawberry', /\bstrawberr(?:y|ies)\b|🍓/i], ['boat', /\bboats?\b|⛵/i],
  ['glasses', /\bglasses\b|👓/i], ['umbrella', /\bumbrellas?\b|☂|☔|🌂/i],
  ['parcel', /\b(?:parcels?|packages?)\b|📦/i], ['crown', /\bcrowns?\b|👑/i],
  ['cookie', /\b(?:cookies?|biscuits?)\b|🍪/i], ['apple', /\bapples?\b|🍎|🍏/i],
  ['ball', /\bballs?\b|⚽|🏀/i], ['basket', /\bbaskets?\b|🧺/i],
  ['book', /\bbooks?\b|📚|📖/i], ['flower', /\bflowers?\b|🌼|🌸/i],
  ['kite', /\bkites?\b|🪁/i], ['seed', /\bseeds?\b|🌱/i],
  ['star', /\bstars?\b|⭐/i], ['castle', /\b(?:sandcastles?|castles?)\b|🏰/i],
  ['leaf', /\b(?:leaf|leaves)\b|🍃/i], ['snowman', /\b(?:snowman|snow friend)\b|⛄/i],
  ['cloud', /\bclouds?\b|☁/i], ['heart', /\bhearts?\b|💛|❤️/i],
];
const objectIn = (text: string) => objects.find(([,pattern]) => pattern.test(text))?.[0] ?? null;

/** Shorten the actual title, without making up a promise or adding a writing call. */
function shortTitle(title: string, name = ''): string {
  let text = title;
  if (name) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`\\b${escaped}\\b['’]?s?`, 'gi'), '');
  }
  const words = text.replace(names,'').replace(/\b(?:and|the|with|a|an|that|her|his)\b/gi,'')
    .replace(/[,!?]+/g,'').trim().split(/\s+/).filter(Boolean);
  return (words.slice(0,4).join(' ') || title.trim() || 'Sunny Meadow');
}

/** Two lines, balanced by character count, with a hard bound for unusual titles. */
export function headlineLines(title: string): string[] {
  const words = shortTitle(title).split(/\s+/).map(word => word.length > 18 ? `${word.slice(0,17)}…` : word);
  const text = words.join(' ');
  if (text.length <= 18) return [text];
  let best: string[] = [];
  let difference = Infinity;
  for (let i = 1; i < words.length; i++) {
    const pair = [words.slice(0,i).join(' '),words.slice(i).join(' ')];
    const delta = Math.abs(pair[0].length-pair[1].length);
    if (pair.every(line=>line.length<=18) && delta < difference) {best=pair;difference=delta;}
  }
  if (best.length) return best;
  const lines: string[] = [];
  for (const word of words) {
    if (!lines.length) lines.push(word);
    else if (`${lines.at(-1)} ${word}`.length <= 18) lines[lines.length-1] += ` ${word}`;
    else if (lines.length < 2) lines.push(word);
    else {lines[1] = `${lines[1].slice(0,17)}…`;break;}
  }
  return lines;
}

export interface ThumbnailPlan {
  hero: string; friend: string | null; background: string;
  emotion: Emotion; action: Action; headline: string; lines: string[];
  prop: {kind: string; label: string} | null; quiet: boolean;
}

/** The selected animal, object and expression all come from one narrative scene. */
export function thumbnailPlan(script: KidsScript, headline?: string): ThumbnailPlan {
  const first = script.scenes[0];
  const named = script.title.match(/\b(taffy|ben|daisy|fiona|tilly|ozzy)\b/i)?.[1]?.toLowerCase();
  const hero = animal(script.mainCharacter?.kind) ?? animal(named) ?? animal(first?.character) ?? 'bunny';
  const titleObject = objectIn(script.title);
  const candidates = script.scenes.filter(s => !s.question && !['question','moral','lesson','chorus'].includes(s.kind ?? '') &&
    (animal(s.character) === hero || animal(s.secondCharacter) === hero));
  const sceneObject = (scene: Scene): string | null => {
    const text = `${scene.prop ?? ''} ${scene.lines.map(l=>l.text).join(' ')}`;
    const declared=scene.staging?.props ?? [];
    const props=declared.filter(p=>(!p.hidden || scene.staging?.events.some(e=>e.kind==='show'&&e.propId===p.id)) &&
      (p.owner ? !!animal(p.owner) && [animal(scene.character),animal(scene.secondCharacter)].includes(animal(p.owner)) : !p.location || p.location===scene.background));
    // Explicit staging wins over older labels and dialogue that only mention an object.
    const allowed=(kind:string)=>!declared.some(p=>p.kind===kind) || props.some(p=>p.kind===kind);
    if (titleObject && allowed(titleObject) && (objects.find(([kind])=>kind===titleObject)?.[1].test(text) || props.some(p=>p.kind===titleObject))) return titleObject;
    return props.find(p=>objects.some(([kind])=>kind===p.kind))?.kind ?? objects.find(([kind,pattern])=>allowed(kind)&&pattern.test(text))?.[0] ?? null;
  };
  const score = (scene: Scene) => (sceneObject(scene) === titleObject && titleObject ? 12 : sceneObject(scene) ? 4 : 0) +
    (scene.lines.some(l=>['surprised','thinking','worried'].includes(l.emotion ?? '')) ? 3 : 0);
  const selected = candidates.reduce<Scene | undefined>((best,s)=>!best || score(s)>score(best) ? s : best,undefined) ?? first;
  const quiet = script.template === 'lullaby' || selected?.direction === 'lullaby' || /\b(goodnight|bedtime|lullaby)\b/i.test(script.title);
  const feelings = selected?.lines.filter(l=>l.speaker === 'narrator' || !l.speaker || l.speaker === (animal(selected.character)===hero ? 'character' : 'friend') || animal(l.speaker)===hero).map(l=>l.emotion) ?? [];
  const emotion: Emotion = quiet ? 'sleepy' : feelings.find(e=>e==='surprised') ?? feelings.find(e=>e==='thinking' || e==='worried') ?? selected?.emotion ?? 'happy';
  const kind = selected ? sceneObject(selected) : null;
  const other = selected && animal(selected.character)===hero ? selected.secondCharacter : selected?.character;
  const friend = animal(other) === hero ? null : animal(other);
  const text = headline?.trim() || shortTitle(script.title,script.mainCharacter?.name);
  const lines = headlineLines(text);
  return {hero,friend,background:selected?.background ?? 'meadow',emotion,
    action:quiet ? 'sleep' : emotion==='thinking' || emotion==='worried' ? 'think' : kind ? 'point' : 'wave',
    headline:lines.join(' '),lines,prop:kind ? {kind,label:kind} : null,quiet};
}
