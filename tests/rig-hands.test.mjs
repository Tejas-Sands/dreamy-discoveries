import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
const code=ts.transpileModule(fs.readFileSync(new URL('../src/lib/rigHands.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {rigToWorld,worldToRig,solveReach,handAnchor}=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const pose=()=>({x:3,y:-5,lean:4,sx:1.01,sy:.98,flip:1,armL:0,armR:0});
test('hand transforms invert the actual rig matrix through flips and body movement',()=>{
  for(const flip of [false,true]){const p=pose(),at={x:138,y:194};const world=rigToWorld(at,p,flip,450,{x:850,y:870});const restored=worldToRig(world,p,flip,450,{x:850,y:870});assert.ok(Math.hypot(at.x-restored.x,at.y-restored.y)<1e-8);}
});
test('reaching paws meet a shared world prop for differently sized flipped actors',()=>{
  const target={x:955,y:735};
  for(const [kind,flip,width,center] of [['bunny',false,450,850],['bear',true,370,1060],['duck',true,370,1060]]) {
    const p=pose();const solved=solveReach(p,kind,flip,width,{x:center,y:870},{target,amount:1,crouch:0});
    const actual=rigToWorld(handAnchor(kind,p,solved.side,solved.extension),p,flip,width,{x:center,y:870});
    assert.ok(Math.hypot(actual.x-target.x,actual.y-target.y)<1,`${kind} misses by ${Math.hypot(actual.x-target.x,actual.y-target.y)}`);
    assert.ok(solved.extension<=2.2);
  }
});
