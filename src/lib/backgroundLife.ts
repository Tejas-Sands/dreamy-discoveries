/** Small anonymous wildlife and plants, placed in the existing scenery's edge/sky spaces. */
export type LifeMotif = 'butterfly' | 'moth' | 'bee' | 'dragonfly' | 'bird' | 'snail' | 'fish' | 'crab' | 'jellyfish' | 'firefly' | 'ladybird' | 'lizard' |
  'flower' | 'herb' | 'fern' | 'wheat' | 'pine' | 'cactus' | 'terrarium' | 'mushroom' | 'seed' | 'ripple' | 'kettle' | 'balloon' | 'cloud' | 'satellite';
type LifeBehavior = 'visit' | 'peck' | 'crawl' | 'swim' | 'soar' | 'float' | 'sway' | 'bloom' | 'ripple' | 'orbit';

interface LifeActivity {
  id: string;
  motif: LifeMotif;
  behavior: LifeBehavior;
  x: number;
  y: number;
  period: number;
  dx?: number;
  dy?: number;
  scale?: number;
  color?: string;
}

export interface BackgroundLifeSample extends LifeActivity {
  living: boolean;
  rotation: number;
  opacity: number;
  /** Wing extension: folded when an insect is resting on its landing spot. */
  wing: number;
  /** Head dip, leaf opening, bell pulse or leg articulation, depending on the motif. */
  gesture: number;
  /** A smooth side-on turn; zero is the narrow profile during a change of direction. */
  turn: number;
}

const ACTIVITIES: Readonly<Record<string, readonly LifeActivity[]>> = {
  autumn: [
    {id:'butterfly-visits-aster',motif:'butterfly',behavior:'visit',x:1750,y:814,dx:-95,dy:-120,period:21,color:'#e5c180'},
    {id:'aster-nods-in-breeze',motif:'flower',behavior:'sway',x:1750,y:907,period:18,color:'#d5a3bb'},
    {id:'maple-seed-turns',motif:'seed',behavior:'float',x:360,y:694,dx:38,dy:62,period:28,color:'#cdad79'},
  ],
  beach: [
    {id:'shore-crab-walks-and-rests',motif:'crab',behavior:'crawl',x:1620,y:907,dx:135,period:27,color:'#df9c89'},
    {id:'gull-rides-sea-breeze',motif:'bird',behavior:'soar',x:1040,y:438,dx:275,dy:30,period:30,color:'#f6edda',scale:.75},
  ],
  bedroom: [
    {id:'windowsill-plant-unfurls',motif:'herb',behavior:'sway',x:1710,y:430,period:22,scale:.68},
    {id:'moth-outside-window',motif:'moth',behavior:'float',x:1535,y:350,dx:28,dy:22,period:19,scale:.58,color:'#e2ceac'},
  ],
  campfire: [
    {id:'moth-circles-warm-light',motif:'moth',behavior:'float',x:974,y:663,dx:66,dy:35,period:23,color:'#d9c6ad'},
    {id:'camp-fern-breathes',motif:'fern',behavior:'sway',x:1750,y:909,period:26,color:'#91adac'},
  ],
  candy: [
    {id:'sugar-flower-opens',motif:'flower',behavior:'bloom',x:1750,y:901,period:26,color:'#d7a5d7'},
    {id:'butterfly-tastes-sugar-flower',motif:'butterfly',behavior:'visit',x:1750,y:808,dx:-98,dy:-100,period:24,color:'#9dc8df'},
  ],
  castle: [
    {id:'dove-preens-on-tower',motif:'bird',behavior:'peck',x:1746,y:459,period:24,color:'#f5ebdb',scale:.7},
    {id:'castle-ivy-unfurls',motif:'fern',behavior:'sway',x:1810,y:905,period:20,color:'#a7bc9e'},
  ],
  circus: [
    {id:'sparrow-pecks-beside-tent',motif:'bird',behavior:'peck',x:260,y:891,dx:48,period:21,color:'#c4a895'},
    {id:'tethered-balloon-bobs',motif:'balloon',behavior:'float',x:1720,y:367,dx:12,dy:17,period:16,color:'#e0a3b5',scale:.7},
  ],
  city: [
    {id:'rooftop-bird-preens',motif:'bird',behavior:'peck',x:1680,y:359,period:23,color:'#aab9c9',scale:.65},
    {id:'roof-planter-leaves-turn',motif:'herb',behavior:'sway',x:1820,y:362,period:19,scale:.62},
  ],
  desert: [
    {id:'lizard-pauses-on-warm-sand',motif:'lizard',behavior:'crawl',x:110,y:892,dx:190,period:35,color:'#a7b48b'},
    {id:'little-cactus-blooms',motif:'cactus',behavior:'bloom',x:1780,y:904,period:34,color:'#a4bea0'},
  ],
  farm: [
    {id:'sparrow-forages-by-fence',motif:'bird',behavior:'peck',x:170,y:892,dx:70,period:20,color:'#c2ab8d'},
    {id:'wheat-heads-nod',motif:'wheat',behavior:'sway',x:1810,y:905,period:17,color:'#dbc58d'},
  ],
  forest: [
    {id:'little-mushroom-nods',motif:'mushroom',behavior:'sway',x:255,y:901,period:27,color:'#d0a294'},
    {id:'snail-explores-mushroom',motif:'snail',behavior:'crawl',x:205,y:915,dx:120,period:38,color:'#c8af89'},
    {id:'firefly-traces-fern',motif:'firefly',behavior:'float',x:1685,y:689,dx:40,dy:37,period:25,color:'#e8d98e'},
  ],
  garden: [
    {id:'garden-blossom-sways',motif:'flower',behavior:'sway',x:310,y:903,period:18,color:'#e8b09d'},
    {id:'bee-visits-blossom',motif:'bee',behavior:'visit',x:310,y:810,dx:-112,dy:-100,period:20,color:'#e5c57d'},
    {id:'ladybird-walks-the-path',motif:'ladybird',behavior:'crawl',x:1670,y:904,dx:90,period:32,color:'#d99b9c',scale:.65},
  ],
  jungle: [
    {id:'jungle-fern-fans-out',motif:'fern',behavior:'sway',x:1700,y:907,period:23,color:'#92b993',scale:1.05},
    {id:'butterfly-rests-on-fern',motif:'butterfly',behavior:'visit',x:1690,y:788,dx:92,dy:-85,period:25,color:'#9dc9da'},
  ],
  kitchen: [
    {id:'counter-herbs-sway',motif:'herb',behavior:'sway',x:1785,y:860,period:21,color:'#93b994',scale:.83},
    {id:'kettle-lid-releases-steam',motif:'kettle',behavior:'sway',x:250,y:650,period:16,color:'#afc7cf',scale:.8},
  ],
  meadow: [
    {id:'meadow-daisy-nods',motif:'flower',behavior:'sway',x:310,y:907,period:17,color:'#f4d6a2'},
    {id:'butterfly-greets-daisy',motif:'butterfly',behavior:'visit',x:310,y:814,dx:98,dy:-104,period:22,color:'#dcaacb'},
    {id:'dandelion-seed-wanders',motif:'seed',behavior:'float',x:1720,y:655,dx:48,dy:60,period:29},
  ],
  mountain: [
    {id:'bird-circles-the-peaks',motif:'bird',behavior:'soar',x:970,y:373,dx:290,dy:38,period:33,color:'#a4b6c4',scale:.75},
    {id:'alpine-flower-nods',motif:'flower',behavior:'sway',x:1670,y:909,period:24,color:'#c6bbe0',scale:.72},
  ],
  night: [
    {id:'moonflower-opens-slowly',motif:'flower',behavior:'bloom',x:95,y:916,period:36,color:'#d1c9e3'},
    {id:'moth-visits-moonflower',motif:'moth',behavior:'visit',x:95,y:823,dx:85,dy:-67,period:29,color:'#d7c9df'},
  ],
  park: [
    {id:'bird-inspects-bench',motif:'bird',behavior:'peck',x:1670,y:749,dx:25,period:24,color:'#b5b6cc',scale:.7},
    {id:'park-flower-turns-to-light',motif:'flower',behavior:'bloom',x:315,y:905,period:31,color:'#e7b4c3'},
  ],
  playground: [
    {id:'ladybird-explores-clover',motif:'ladybird',behavior:'crawl',x:1695,y:912,dx:84,period:29,color:'#da9e91'},
    {id:'clover-sways-beside-slide',motif:'herb',behavior:'sway',x:1780,y:907,period:19,scale:.62},
  ],
  pond: [
    {id:'fish-turns-in-water',motif:'fish',behavior:'swim',x:1610,y:901,dx:140,dy:5,period:28,color:'#e8c183',scale:.67},
    {id:'dragonfly-lands-on-reed',motif:'dragonfly',behavior:'visit',x:246,y:648,dx:96,dy:-80,period:23,color:'#a8c9d8'},
    {id:'pond-ring-spreads',motif:'ripple',behavior:'ripple',x:1720,y:879,period:14,color:'#e9eee1'},
  ],
  rainy: [
    {id:'leaf-shelters-a-visitor',motif:'fern',behavior:'sway',x:1800,y:907,period:25,color:'#a1b99c'},
    {id:'butterfly-waits-under-leaf',motif:'butterfly',behavior:'float',x:1793,y:828,dx:4,dy:3,period:27,color:'#e7c391',scale:.6},
    {id:'raindrop-ring-in-puddle',motif:'ripple',behavior:'ripple',x:713,y:916,period:12,color:'#e2edea',scale:.8},
  ],
  sky: [
    {id:'swallow-sails-between-clouds',motif:'bird',behavior:'soar',x:425,y:452,dx:220,dy:42,period:29,color:'#a1b4cf',scale:.7},
    {id:'cloud-curl-rolls-gently',motif:'cloud',behavior:'float',x:1720,y:802,dx:23,dy:10,period:24,color:'#e2deeb'},
  ],
  snow: [
    {id:'winter-bird-finds-seeds',motif:'bird',behavior:'peck',x:300,y:891,dx:62,period:24,color:'#b0bacd'},
    {id:'snowy-pine-tip-sways',motif:'pine',behavior:'sway',x:1770,y:906,period:29,color:'#a6c1b5'},
  ],
  space: [
    {id:'terrarium-sprout-unfurls',motif:'terrarium',behavior:'sway',x:280,y:897,period:32,color:'#b3caa4',scale:.9},
    {id:'satellite-loops-the-planet',motif:'satellite',behavior:'orbit',x:1560,y:260,dx:216,dy:113,period:43,color:'#bbc6db',scale:.7},
  ],
  underwater: [
    {id:'jellyfish-pulses-and-dips',motif:'jellyfish',behavior:'float',x:250,y:504,dx:55,dy:63,period:24,color:'#c6b6de'},
    {id:'reef-crab-scuttles-and-rests',motif:'crab',behavior:'crawl',x:1640,y:915,dx:105,period:31,color:'#dfa88b',scale:.75},
  ],
};

const clamp = (n: number, low = 0, high = 1) => Math.max(low, Math.min(high, Number.isFinite(n) ? n : low));
const ease = (n: number) => {const v=clamp(n); return v*v*(3-2*v);};

/** Rest at each end, ease outward, rest, then return to the identical starting pose. */
function excursion(q: number): number {
  if (q<.22 || q>=.9) return 0;
  if (q<.46) return ease((q-.22)/.24);
  if (q<.62) return 1;
  return 1-ease((q-.62)/.28);
}

/** Turn during the two resting intervals, including smoothly across the cycle boundary. */
function restingTurn(q: number): number {
  if(q<.14) return -1+2*ease(q/.14);
  if(q<.48) return 1;
  if(q<.60) return 1-2*ease((q-.48)/.12);
  return -1;
}

const headDip = (q: number, start: number, end: number) => q<start || q>end ? 0 : Math.sin((q-start)/(end-start)*Math.PI)**2;
const NONLIVING = new Set<LifeMotif>(['seed','ripple','kettle','balloon','cloud','satellite']);

/** The supplied clock already integrates scene speed. Motion softens geometry/contrast, never changes phase. */
export function sampleBackgroundLife(kind: string, t: number, motion = .55): BackgroundLifeSample[] {
  const m=clamp(motion), time=m===0 || !Number.isFinite(t) ? 0 : t, strength=.25+.75*m;
  return (ACTIVITIES[kind] ?? ACTIVITIES.meadow).map(activity => {
    const q=((time%activity.period)/activity.period+1)%1, angle=q*Math.PI*2, travel=excursion(q);
    const dx=(activity.dx??0)*strength, dy=(activity.dy??0)*strength;
    let x=activity.x, y=activity.y, rotation=0, wing=0, gesture=0, turn=1;
    switch(activity.behavior) {
      case 'visit': {
        const flying=ease(travel/.18);
        x+=dx*travel; y+=dy*travel;
        rotation=Math.sin(angle)*4*m*flying;
        wing=flying*(.2+.8*(.5+.5*Math.sin(angle*18)))*strength;
        gesture=flying;
        break;
      }
      case 'peck':
      case 'crawl':
      case 'swim':
        x+=dx*travel; y+=dy*Math.sin(angle);
        turn=restingTurn(q);
        gesture=activity.behavior==='peck' ? Math.max(headDip(q,.06,.20),headDip(q,.48,.61))*strength : 4*travel*(1-travel)*(.5+.5*Math.sin(angle*12))*strength;
        wing=activity.behavior==='swim' ? (.5+.5*Math.sin(angle*10))*strength : 0;
        break;
      case 'soar':
        x+=dx*Math.sin(angle); y+=dy*Math.sin(angle*2);
        turn=2*ease((Math.cos(angle)+.12)/.24)-1;
        wing=(.5+.5*Math.sin(angle*6))*strength;
        rotation=Math.sin(angle)*-5*m;
        break;
      case 'float':
      case 'orbit':
        x+=dx*(activity.behavior==='orbit' ? Math.cos(angle) : Math.sin(angle));
        y+=dy*(activity.behavior==='orbit' ? Math.sin(angle) : Math.cos(angle));
        rotation=Math.sin(angle)*(activity.behavior==='orbit' ? 12 : 5)*m;
        wing=(.5+.5*Math.sin(angle*12))*strength;
        gesture=(.5+.5*Math.sin(angle*4))*strength;
        break;
      case 'sway':
      case 'bloom':
        rotation=Math.sin(angle)*3.5*m;
        gesture=(.5-.5*Math.cos(angle))*strength;
        break;
      case 'ripple':
        gesture=(.5-.5*Math.cos(angle))*strength;
        break;
    }
    return {...activity,x,y,rotation,wing,gesture,turn,living:!NONLIVING.has(activity.motif),opacity:.65+.3*m};
  });
}
