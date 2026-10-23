import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import Module from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {require} from './helpers/character.mjs';
import {ScriptSchema, scriptJsonSchema} from '../scripts/lib/script-schema.mjs';
const file=new URL('../src/lib/answerLayout.ts',import.meta.url);
const {fitAnswerText}=fs.existsSync(file)?require('../../src/lib/answerLayout.ts'):{};
const originalLoad=Module._load;
Module._load=function(name,...args){return name==='remotion'?{...originalLoad.call(this,name,...args),useCurrentFrame:()=>17,useVideoConfig:()=>({fps:30})}:originalLoad.call(this,name,...args);};
const {QuestionOverlay}=require('../../src/components/Question.tsx');
Module._load=originalLoad;
const measure=(text,size)=>[...text].length*size*.9;

test('new answer inputs stay within the readable layout budget without truncation',()=>{
  const schema=ScriptSchema.shape.scenes.element.shape.question.unwrap().shape.answer.shape.text;
  assert.equal(schema.parse('W'.repeat(120)),'W'.repeat(120));
  assert.equal(schema.safeParse('W'.repeat(121)).success,false);
  assert.equal(scriptJsonSchema.properties.scenes.items.properties.question.anyOf[0].properties.answer.properties.text.maxLength,120);
});

test('complete answer labels fit their card, including long tokens and Unicode',()=>{
  assert.equal(typeof fitAnswerText,'function');
  for(const text of ['4','Make a simple meeting plan','Tell a trusted grown-up about the problem',
    'Supercalifragilisticexpialidocious','W'.repeat(120),'友だちといっしょに考えよう 🌈']) {
    for(const hasEmoji of [false,true]) {
      const layout=fitAnswerText(text,{hasEmoji,measure});
      assert.equal(layout.lines.join('').replace(/\s/g,''),text.replace(/\s/g,''));
      assert.ok(layout.fontSize>=36&&layout.fontSize<=140);
      assert.ok(layout.lines.every(line=>measure(line,layout.fontSize)<=640));
      assert.ok(layout.lines.length*layout.fontSize*1.08+layout.emojiSize+64<=520);
    }
  }
});

test('compact and normal question reveals use bounded cards without removing answer text',()=>{
  const text='Help repair the picture together';
  for(const compact of [false,true]) {
    const markup=renderToStaticMarkup(React.createElement(QuestionOverlay,{spec:{answer:{text,emoji:'🖼️'}},
      palette:{accent:'#ff7a1a'},holdFrom:0,holdDuration:1,revealFrom:1,revealDuration:51,bubbleX:600,bubbleY:300,compact}));
    assert.ok(markup.includes('max-width:720px'),'answer card must remain inside its stage region');
    assert.ok(text.split(' ').every(word=>markup.includes(word)),'all answer words must remain available');
  }
});
