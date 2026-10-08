import React from 'react';
import {AbsoluteFill, staticFile, type CalculateMetadataFunction} from 'remotion';
import {fontFamily} from "./lib/fonts";
import type {KidsScript} from './lib/types';
import {getPalette} from './lib/palettes';
import {Background} from './components/backgrounds/Background';
import {Character, characterBox} from './components/characters/Character';
import {PropArt} from './components/StageProps';
import {headlineLines, thumbnailPlan} from './lib/thumbnail';
import {fetchBaked, type BakedMap} from './lib/baked';

export type ThumbnailProps = {
  slug: string;
  script: KidsScript | null;
  compilation?: {title: string; heroes: string[]} | null;
  /** Optional local art direction; leaves the saved episode untouched. */
  headline?: string;
  baked?: BakedMap;
};

export const calculateThumbnailMetadata: CalculateMetadataFunction<ThumbnailProps> = async ({props}) => {
  const baked = props.baked ?? await fetchBaked();
  if (props.script) return {props: {...props,baked}};
  const res = await fetch(staticFile(`generated/${props.slug}/script.json`));
  if (!res.ok) throw new Error(`Could not load script for slug "${props.slug}"`);
  return {props: {...props,baked,script:(await res.json()) as KidsScript}};
};

const canvas: React.CSSProperties = {fontFamily,width:1920,height:1080,transform:'scale(0.6666666667)',transformOrigin:'0 0',overflow:'hidden'};
const Brand: React.FC = () => <div style={{position:'absolute',left:58,top:46,background:'#fff9e9',borderRadius:36,
  padding:'12px 24px',fontSize:28,fontWeight:600,letterSpacing:1,color:'#625078'}}>Dreamy Discoveries</div>;

// Conservative Fredoka glyph widths keep long compound words on one line.
const titleSize = (lines: string[], width: number, maximum: number) => Math.min(maximum,width / Math.max(1,...lines.map(line=>
  [...line].reduce((sum,c)=>sum+(/[ilIjtfr.,!:'’]/.test(c) ? .4 : /[MW@%]/.test(c) ? 1.05 : /[mwoQOG]/.test(c) ? .85 : /[A-Z]/.test(c) ? .8 : /[ -]/.test(c) ? .4 : .68),0))));

/** A face, a real story object and a short title remain readable at 320x180. */
export const Thumbnail: React.FC<ThumbnailProps> = ({script,compilation,headline,baked}) => {
  if (!script) return <AbsoluteFill style={{background:'#222'}} />;
  const palette = getPalette(script.palette);
  if (compilation) {
    const heroes = compilation.heroes.slice(0,5);
    const lines = headlineLines(compilation.title);
    return <AbsoluteFill style={canvas}>
      <Background kind={script.scenes[0]?.background ?? 'meadow'} palette={palette} animationT={0} motion={0} baked={baked} />
      <AbsoluteFill style={{background:'linear-gradient(#fff6e9dd, transparent 58%)'}} />
      {heroes.map((hero,i)=><div key={i} style={{position:'absolute',...characterBox(960+(i-(heroes.length-1)/2)*Math.min(360,1500/Math.max(1,heroes.length)),1000,380)}}>
        <Character kind={hero} emotion='happy' action='wave' width={380} still />
      </div>)}
      <div style={{position:'absolute',left:100,right:100,top:140,textAlign:'center',fontSize:titleSize(lines,1560,145),fontWeight:700,lineHeight:1.06,
        color:'#614373',WebkitTextStroke:'12px #fff9ed',paintOrder:'stroke fill'}}>
        {lines.map((line,i)=><div key={i} style={{whiteSpace:'nowrap'}}>{line}</div>)}
      </div>
      <Brand />
      <AbsoluteFill style={{border:'20px solid #fff7e5',pointerEvents:'none'}} />
    </AbsoluteFill>;
  }
  const plan = thumbnailPlan(script,headline);
  const textSize = titleSize(plan.lines,800,178);
  return <AbsoluteFill style={canvas}>
    <Background kind={plan.background} palette={palette} animationT={0} motion={0} baked={baked} />
    <AbsoluteFill style={{background:plan.quiet
      ? 'linear-gradient(105deg,#eee2ff38,#eae3ffcc 65%,#fff2dfed),radial-gradient(ellipse at 28% 48%,#fff5dc99,transparent 56%)'
      : 'linear-gradient(105deg,#fff2dc18,#fff1dbcc 65%,#fff6e7ee),radial-gradient(ellipse at 28% 48%,#fff6debb,transparent 58%)'}} />
    <div style={{position:'absolute',left:120,top:280,width:890,height:750,borderRadius:'50%',background:'radial-gradient(ellipse,#fff7e9aa,transparent 70%)'}} />
    <div style={{position:'absolute',...characterBox(565,1230,1130),filter:'saturate(1.12) drop-shadow(0 12px 0 #72546b25)'}}>
      <Character kind={plan.hero} emotion={plan.emotion} action={plan.action} width={1130} still gaze={{x:plan.prop&&!plan.quiet?3:0,y:0}} />
    </div>
    {plan.friend ? <div style={{position:'absolute',...characterBox(plan.prop?1080:1400,1100,600),filter:'saturate(1.1) drop-shadow(0 10px 0 #72546b22)'}}>
      <Character kind={plan.friend} emotion={plan.quiet?'sleepy':'happy'} action={plan.quiet?'sleep':'idle'} width={600} still flip />
    </div> : null}
    {plan.prop ? <svg viewBox='0 0 1920 1080' style={{position:'absolute',inset:0,width:'100%',height:'100%'}} aria-label={plan.prop.label}>
      <ellipse cx='1470' cy='765' rx='270' ry='220' fill='#fff9ed' opacity='.88' />
      <g transform='translate(1470 745) rotate(-9) scale(4)'><PropArt kind={plan.prop.kind} label={plan.prop.label} /></g>
      {[[-215,-150],[220,-80],[175,180]].map(([x,y],i)=><path key={i} d='M0 -19L5 -5L19 0L5 5L0 19L-5 5L-19 0L-5 -5Z'
        transform={`translate(${1470+x} ${745+y})`} fill={plan.quiet?'#b9a4de':'#e9b760'}/>)}
    </svg> : null}
    <div style={{position:'absolute',left:930,top:135,width:870,textAlign:'center',fontSize:textSize,fontWeight:700,lineHeight:1.08,
      WebkitTextStroke:'12px #fff9ef',paintOrder:'stroke fill',textShadow:'0 9px 0 #8e6d7c24'}}>
      {plan.lines.map((line,i)=><div key={i} style={{whiteSpace:'nowrap',color:i===0?'#654372':plan.quiet?'#59618d':'#b55b71'}}>{line}</div>)}
    </div>
    <Brand />
    <AbsoluteFill style={{border:'20px solid #fff7e5',pointerEvents:'none'}} />
  </AbsoluteFill>;
};
