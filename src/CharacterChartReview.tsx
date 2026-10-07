import React from 'react';
import {AbsoluteFill,Img,staticFile,useCurrentFrame,useVideoConfig} from 'remotion';
import {Character,characterBox,characterSeed} from './components/characters/Character';
import {CHART_IMAGE,chartCell} from './components/characters/chartLayout';
import {rand} from './lib/random';

/** One animal at a time, against the user's unchanged source image. */
export const CharacterChartReview:React.FC<{kind?:string;animate?:boolean}>=({kind='bear',animate=false})=>{
  const frame=useCurrentFrame(),{fps}=useVideoConfig(),t=animate?frame/fps:0;
  const turn=animate?.78*Math.sin(t*Math.PI/4):.55;
  const turnVelocity=animate?.78*Math.PI/4*Math.cos(t*Math.PI/4):0;
  const cell=chartCell(kind),scale=2.65;
  const seed=characterSeed(kind),period=95+Math.round(rand(seed+3)*40);
  const clock=(period*1.5-Math.round(rand(seed)*period))/30;
  return <AbsoluteFill style={{background:'#f8f3e8',color:'#514659',fontFamily:'sans-serif'}}>
    <div style={{position:'absolute',left:50,top:32,fontSize:38,fontWeight:700}}>{kind[0].toUpperCase()+kind.slice(1)} · chart comparison</div>
    <div style={{position:'absolute',left:50,top:85,fontSize:21}}>Sole layout reference: Pastel Kawaii Animal Limb Chart.png</div>
    {['Chart reference','Front layout',animate?'Both turns + talking':'Tilt + native limb gesture'].map((title,i)=><div key={title} style={{position:'absolute',left:35+i*523,top:145,width:506,height:630,borderRadius:24,background:'#fffaf2',border:'1px solid #e8ded3'}}>
      <div style={{textAlign:'center',fontSize:24,fontWeight:600,marginTop:22}}>{title}</div>
      {i===0?<div style={{position:'absolute',left:(506-cell.width*scale)/2,bottom:42,width:cell.width*scale,height:cell.height*scale,overflow:'hidden'}}>
        <Img src={staticFile(CHART_IMAGE)} style={{position:'absolute',maxWidth:'none',width:1678*scale,height:937*scale,left:-cell.x*scale,top:-cell.y*scale}}/>
      </div>:<Character kind={kind} width={440} action={i===2?'wave':'idle'} actionT={i===2?1+t:0} clockT={clock+t} still={i===1} turn={i===2?turn:0} turnVelocity={i===2?turnVelocity:0}
        mouth={i===2&&animate?Math.max(0,Math.sin(t*7))*.65:0} mouthShape={i===2&&animate?'wide':'rest'} shadow={false}
        style={{position:'absolute',...characterBox(253,575+(kind==='whale'&&i===2?95:0),440)}}/>}
    </div>)}
    <div style={{position:'absolute',left:50,bottom:20,fontSize:17}}>Character library · Original chart reference · Shared production rigs</div>
  </AbsoluteFill>;
};
