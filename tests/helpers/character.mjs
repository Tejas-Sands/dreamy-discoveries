import fs from 'node:fs';
import Module, {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

export const require = createRequire(import.meta.url);
require.extensions['.ts'] = require.extensions['.tsx'] = (module, file) => {
  module._compile(ts.transpileModule(fs.readFileSync(file, 'utf8'), {compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true, target: ts.ScriptTarget.ES2022,
  }}).outputText, file);
};
const originalLoad = Module._load;
Module._load = function(name, ...args) {
  return name === 'remotion' ? {...originalLoad.call(this, name, ...args), useCurrentFrame:()=>17, useVideoConfig:()=>({fps:30})} : originalLoad.call(this, name, ...args);
};
export const {Character, getRecipe} = require('../../src/components/characters/Character.tsx');
Module._load = originalLoad;
export const {computePose} = require('../../src/components/characters/pose.ts');
export const cast = require('../../library/cast.json').members;
export const kinds = fs.readdirSync(new URL('../../library/characters/', import.meta.url)).filter(f=>f.endsWith('.json')).map(f=>f.slice(0,-5));
export const draw = (props) => renderToStaticMarkup(React.createElement(Character, {width:450, actionT:.57, shadow:false, ...props}));

const identity = [1,0,0,1,0,0];
const multiply = (a,b) => [a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
const translate = (x,y=0) => [1,0,0,1,x,y];
const transform = value => {
  let matrix = identity;
  for (const [,name,args] of (value??'').matchAll(/(translate|rotate|scale)\(([^)]*)\)/g)) {
    const [a,b,c] = args.trim().split(/[ ,]+/).map(Number);
    let next;
    if (name === 'translate') next = translate(a,b);
    else if (name === 'scale') next = [a,0,0,b??a,0,0];
    else {
      const angle = a*Math.PI/180, r = [Math.cos(angle),Math.sin(angle),-Math.sin(angle),Math.cos(angle),0,0];
      next = b === undefined ? r : multiply(multiply(translate(b,c),r),translate(-b,-c));
    }
    matrix = multiply(matrix,next);
  }
  return matrix;
};
export const applyMatrix = (m,{x,y}) => ({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]});

/** Parse the actual rendered SVG, including inherited transforms. */
export function elements(markup) {
  const stack = [{matrix:identity}], result = [];
  for (const [tag,name,body] of markup.matchAll(/<\/?([\w:-]+)\b([^>]*?)\/?\s*>/g)) {
    if (tag.startsWith('</')) {stack.pop(); continue;}
    const attrs = Object.fromEntries([...body.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([,k,v])=>[k,v]));
    const parent = stack.at(-1), node = {name,attrs,parent,matrix:multiply(parent.matrix,transform(attrs.transform))};
    result.push(node);
    if (!tag.endsWith('/>')) stack.push(node);
  }
  return result;
}
export const below = (node,parent) => node?.parent === parent || (node?.parent ? below(node.parent,parent) : false);
export function hands(markup) {
  const nodes = elements(markup);
  return nodes.filter(n=>n.attrs['data-storybook-hand'] || n.attrs['data-native-flipper']).map(node=> {
    const paths = nodes.filter(n=>n.name==='path'&&below(n,node));
    const side = node.attrs['data-storybook-hand'] ?? node.attrs['data-native-flipper'];
    let local;
    if (node.attrs['data-native-flipper']) local = {x:-14,y:26};
    else {
      // The first cubic ends at the palm. Read the drawn contour, independently
      // of rigHands' reach calculations, to catch drawing/solver drift.
      const cubic = paths[0].attrs.d.match(/C([^A-Za-z]+)/)[1].match(/-?\d+(?:\.\d+)?/g).map(Number);
      const feather = node.attrs['data-hand-anatomy']==='wing';
      const penguin = /M-14 -9C-36/.test(paths[0].attrs.d);
      local = {x:0,y:cubic[5]+(penguin?-12:feather?5:4)};
    }
    return {...node,side,paths,contact:applyMatrix(node.matrix,local)};
  });
}
