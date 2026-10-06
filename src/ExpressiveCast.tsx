import React from 'react';
import {AbsoluteFill} from 'remotion';
import cast from '../library/cast.json';
import {Character} from './components/characters/Character';

/** Developer artwork sheet; renders actual rigs with three signed view angles. */
export const ExpressiveCast:React.FC=()=> <AbsoluteFill style={{background:'#fff6e9',color:'#58465e',fontFamily:'sans-serif'}}>
  <div style={{position:'absolute',left:36,top:30,fontSize:34,fontWeight:700}}>Sunny Meadow · Expressive cast</div>
  <div style={{position:'absolute',left:36,top:77,fontSize:22}}>Front, three-quarter and profile views · The same six character rigs</div>
  {cast.members.map((member,column)=><React.Fragment key={member.id}>
    <div style={{position:'absolute',left:180+column*288,top:125,width:276,textAlign:'center',fontSize:23,fontWeight:700}}>{member.name}</div>
    {[0,.6,1].map((turn,row)=><div key={turn} style={{position:'absolute',left:180+column*288,top:172+row*292,width:276,height:280,background:row%2?'#f2e7e4':'#f8efdf',borderRadius:28}}>
      <Character kind={member.kind} action="idle" emotion="happy" width={202} turn={turn} turnVelocity={0}
        performance={{emotion:'happy',fromEmotion:'happy',blend:1,emphasis:0,listening:true}}
        mouthShape="rest" actionT={3} clockT={3} style={{position:'absolute',left:37,top:10}}/>
    </div>)}
  </React.Fragment>)}
  {['Front','Three-quarter','Profile'].map((label,row)=><div key={label} style={{position:'absolute',left:26,top:290+row*292,width:140,textAlign:'center',fontSize:21,fontWeight:700}}>{label}</div>)}
</AbsoluteFill>;
