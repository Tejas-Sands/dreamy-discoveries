import test from 'node:test';
import assert from 'node:assert/strict';
import {generateFromTemplate} from '../scripts/lib/templates/index.mjs';
import {directScript} from '../scripts/lib/director.mjs';
import {CHARACTER_RECIPES,BACKGROUND_RECIPES} from '../scripts/lib/library.mjs';
import {voiceSettings,collectUtterances,missingTexts} from '../scripts/lib/voice.mjs';
import {estimateFrames,chunkRanges} from '../scripts/lib/estimate.mjs';

for(const template of ['counting','colors','actions','animal-sounds','body-parts','shapes','lullaby','opposites']) {
  test(`${template} generates deterministic, renderable, cache-plannable content without AI`,()=>{
    const options={template,hero:'bunny',seed:42};
    const raw=generateFromTemplate(options),snapshot=JSON.stringify(raw);
    assert.equal(JSON.stringify(generateFromTemplate(options)),snapshot);
    const script=directScript({...raw,presentationVersion:4});
    assert.equal(JSON.stringify(raw),snapshot,'direction must not mutate authored input');
    assert.deepEqual(JSON.parse(JSON.stringify(directScript(script))),JSON.parse(JSON.stringify(script)),'direction must be idempotent');
    assert.ok(script.scenes.length>0);
    for(const scene of script.scenes) {
      assert.ok(BACKGROUND_RECIPES[scene.background],scene.background);
      for(const kind of [scene.character,scene.secondCharacter,...(scene.extras??[])]) {
        if(kind&&kind!=='none')assert.ok(CHARACTER_RECIPES[kind],kind);
      }
      assert.ok(scene.lines.every(line=>typeof line.text==='string'&&line.text.trim()));
    }
    const settings=voiceSettings({...script,synthesis:undefined},{speed:.95});
    const utterances=collectUtterances(script,settings);
    assert.ok(utterances.length>0);
    assert.equal(missingTexts(script,settings,()=>false).length,utterances.length);
    assert.deepEqual(missingTexts(script,settings,()=>true),[]);
    const frames=estimateFrames(script),ranges=chunkRanges(frames,3).map(range=>range.split('-').map(Number));
    assert.ok(Number.isInteger(frames)&&frames>0);
    assert.equal(ranges[0][0],0);assert.equal(ranges.at(-1)[1],frames-1);
    for(let i=1;i<ranges.length;i++)assert.equal(ranges[i][0],ranges[i-1][1]+1);
  });
}
