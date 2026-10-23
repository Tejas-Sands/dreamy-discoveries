import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {draw, kinds, require} from './helpers/character.mjs';
const {StageProps}=require('../../src/components/StageProps.tsx');

test('all 38 characters use the production grade once, including still artwork',()=>{
  for(const kind of kinds)for(const still of [false,true]) {
    const markup=draw({kind,still});
    assert.match(markup,/filter:saturate\(1\.4\) contrast\(1\.15\) brightness\(0\.985\)/,kind);
    assert.equal((markup.match(/filter:/g)??[]).length,1,`${kind}: repeated grade`);
  }
  assert.match(draw({kind:'bunny',colorGrade:'original'}),/filter:none/);
});

test('grounded props use the same production treatment as carried objects',()=>{
  const markup=renderToStaticMarkup(React.createElement(StageProps,{props:[{id:'ball',kind:'ball',x:900,y:800,owner:null}]}));
  assert.match(markup,/filter:saturate\(1\.4\) contrast\(1\.15\) brightness\(0\.985\)/);
});
