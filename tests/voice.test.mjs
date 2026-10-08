import assert from "node:assert/strict";
import test from "node:test";
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {directScript} from '../scripts/lib/director.mjs';
import {CHARACTER_RECIPES} from '../scripts/lib/library.mjs';
import * as voiceStore from "../scripts/lib/voice.mjs";
const {collectUtterances, missingTexts, voiceForSpeaker, voiceSettings, lineHash, voiceHash} = voiceStore;

function withEnv(values, fn) {
  const before = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return fn();
  } finally {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("Kokoro gives narration a distinct energetic voice", () => {
  withEnv({ TTS_ENGINE: "kokoro", TTS_VOICE: undefined, NARRATOR_VOICE: undefined }, () => {
    const settings = voiceSettings({});
    assert.equal(settings.voice, "af_heart");
    assert.equal(settings.narratorVoice, "af_bella");
    assert.equal(voiceForSpeaker(settings, "character"), "af_heart");
    assert.equal(voiceForSpeaker(settings, "friend"), "af_heart");
    assert.equal(voiceForSpeaker(settings, "narrator"), "af_bella");
  });
});

test("NARRATOR_VOICE changes narration without changing character dialogue", () => {
  withEnv({ TTS_ENGINE: "kokoro", TTS_VOICE: "af_heart", NARRATOR_VOICE: "af_nicole" }, () => {
    const settings = voiceSettings({});
    assert.equal(settings.voice, "af_heart");
    assert.equal(settings.narratorVoice, "af_nicole");
  });
});

test("identical text remains distinct when narrator and character use different voices", () => {
  const script = {
    scenes: [{ lines: [
      { text: "What a wonderful day!", speaker: "narrator" },
      { text: "What a wonderful day!", speaker: "character" },
      { text: "What a wonderful day!", speaker: "friend" },
    ] }],
  };
  assert.deepEqual(collectUtterances(script, { voice: "af_heart", narratorVoice: "af_bella" }), [
    { text: "What a wonderful day!", speaker: "narrator", voice: "af_bella" },
    { text: "What a wonderful day!", speaker: "character", voice: "af_heart" },
  ]);
});

test("missing voice planning hashes each utterance with its selected voice", () => {
  const seen = [];
  const script = { scenes: [{ lines: [
    { text: "A unique cache line.", speaker: "narrator" },
    { text: "A unique cache line.", speaker: "character" },
  ] }] };
  const settings = { engine: "kokoro", ext: "wav", voice: "af_heart", narratorVoice: "af_bella" };
  const missing = missingTexts(script, settings, (hash, ext) => {
    seen.push([hash, ext]);
    return false;
  });
  assert.deepEqual(missing, ["A unique cache line.", "A unique cache line."]);
  assert.equal(seen.length, 2);
  assert.notEqual(seen[0][0], seen[1][0]);
  assert.deepEqual(seen.map(([, ext]) => ext), ["wav", "wav"]);
});

test('new voice keys distinguish speed and model revisions while legacy keys remain stable', () => {
  const key = speed => lineHash('kokoro','af_heart','Hello friend!',{speed,model:'kokoro-q8-v1'});
  assert.notEqual(key(.95),key(1.1));
  assert.equal(key(.95),lineHash('kokoro','af_heart','  HELLO FRIEND!  ',{speed:.95,model:'kokoro-q8-v1'}));
  assert.notEqual(key(.95),lineHash('kokoro','af_heart','Hello friend!',{speed:.95,model:'kokoro-q8-v2'}));
  assert.equal(voiceHash({engine:'kokoro',cacheVersion:2},'af_heart','Hello friend!'),lineHash('kokoro','af_heart','Hello friend!'));
});

test('new episodes pin synthesis settings across environment changes, and planning uses the pinned speed', () => {
  withEnv({TTS_ENGINE:'kokoro',TTS_SPEED:'.95'}, () => {
    const initial=voiceSettings({presentationVersion:1});
    assert.equal(initial.speed,.95);
    assert.equal(initial.cacheVersion,3);
    const script={presentationVersion:1,synthesis:initial,scenes:[{lines:[{text:'A pinned recording.',speaker:'character'}]}]};
    process.env.TTS_SPEED='1.2'; process.env.TTS_ENGINE='edge';
    assert.deepEqual(voiceSettings(script),initial);
    const expected=voiceHash(initial,initial.voice,'A pinned recording.');
    assert.deepEqual(missingTexts(script,initial,hash=>hash===expected),[]);
  });
});

test('invalid Kokoro speeds fail before cache planning instead of producing an invalid key', () => {
  for(const speed of ['nope','0','5']) withEnv({TTS_ENGINE:'kokoro',TTS_SPEED:speed},()=>assert.throws(()=>voiceSettings({presentationVersion:1}),/speed/i));
});

test('version 2 routes all six cast members to installed local voices across animal aliases and roles', async () => {
  const {KokoroTTS} = await import('kokoro-js');
  const available = new KokoroTTS().voices; // Metadata only; no model download or inference.
  withEnv({TTS_ENGINE:'kokoro',TTS_SPEED:'.95',TTS_VOICE:undefined,NARRATOR_VOICE:undefined}, () => {
    const settings = voiceSettings({presentationVersion:2,mainCharacter:{kind:'bunny',name:'Taffy'}});
    assert.equal(settings.cacheVersion,3);
    const cast = [
      ['bunny','taffy','Taffy'], ['bear','ben','Ben'], ['duck','daisy','Daisy'],
      ['fox','fiona','Fiona'], ['turtle','tilly','Grandpa Tilly'], ['owl','ozzy','Professor Ozzy'],
    ];
    const voices = cast.map(([kind,id,name]) => {
      const lead = voiceForSpeaker(settings,'character',{character:kind,secondCharacter:'none'});
      assert.ok(available[lead],`voice ${lead} must ship with installed Kokoro`);
      assert.equal(voiceForSpeaker(settings,'friend',{character:'none',secondCharacter:id}),lead);
      assert.equal(voiceForSpeaker(settings,name),lead);
      return lead;
    });
    assert.equal(new Set(voices).size,6);
    assert.ok(!voices.includes(voiceForSpeaker(settings,'narrator')));
    assert.equal(voiceForSpeaker(settings,'unknown-animal'),settings.voice);
    assert.equal(voiceForSpeaker(settings,'friend',{character:'bunny',secondCharacter:null}),settings.voice);
  });
});

test('every character recipe has a stable installed Kokoro voice as hero and friend', async () => {
  const {KokoroTTS} = await import('kokoro-js');
  const available = new KokoroTTS().voices;
  withEnv({TTS_ENGINE:'kokoro',TTS_SPEED:'.95',TTS_VOICE:undefined,NARRATOR_VOICE:undefined}, () => {
    const settings = voiceSettings({presentationVersion:4,mainCharacter:{kind:'bunny'}});
    for (const kind of Object.keys(CHARACTER_RECIPES)) {
      const assigned = settings.castVoices[kind];
      assert.ok(available[assigned], `${kind} must have an installed local voice`);
      const hero = voiceSettings({presentationVersion:4,mainCharacter:{kind}});
      assert.equal(hero.voice, assigned, `${kind} must use its own assigned hero voice`);
      assert.equal(voiceForSpeaker(settings, kind), assigned);
      assert.equal(voiceForSpeaker(settings, 'character', {character:kind}), assigned);
      assert.equal(voiceForSpeaker(settings, 'friend', {secondCharacter:kind}), assigned);
      assert.equal(voiceForSpeaker(hero, kind.toUpperCase()), assigned);
      assert.deepEqual(voiceSettings({presentationVersion:4,mainCharacter:{kind}}), hero);
    }
    assert.deepEqual(Object.fromEntries(['bunny','bear','duck','fox','turtle','owl'].map(kind => [kind,settings.castVoices[kind]])), {
      bunny:'af_heart', bear:'am_michael', duck:'af_sarah', fox:'bf_emma', turtle:'bm_george', owl:'am_fenrir',
    });
  });
});

test('expanded heroes retain authored voice overrides and pin their assignments across environment changes', () => {
  withEnv({TTS_ENGINE:'kokoro',TTS_SPEED:'.95',TTS_VOICE:undefined,NARRATOR_VOICE:undefined}, () => {
    const script = {presentationVersion:4,mainCharacter:{kind:'dragon'},castVoices:{dragon:'am_puck',cat:'af_nicole'}};
    const initial = voiceSettings(script);
    assert.equal(initial.voice, 'am_puck');
    assert.equal(voiceForSpeaker(initial,'friend',{secondCharacter:'cat'}), 'af_nicole');
    const key = voiceHash(initial, initial.voice, 'Hello from our dragon!');
    process.env.TTS_VOICE='af_nova'; process.env.TTS_SPEED='1.3'; process.env.TTS_ENGINE='edge';
    const pinned = voiceSettings({...script,synthesis:initial});
    assert.deepEqual(pinned, initial);
    assert.equal(voiceHash(pinned, pinned.voice, 'Hello from our dragon!'), key);
  });
});

test('pinned six-character and generic legacy recordings keep their voice maps and cache keys', () => {
  withEnv({TTS_ENGINE:'kokoro',TTS_SPEED:'.95',TTS_VOICE:undefined,NARRATOR_VOICE:undefined}, () => {
    const original = {engine:'kokoro',ext:'wav',voice:'am_michael',narratorVoice:'af_bella',speed:.95,
      model:'Kokoro-82M-v1.0-ONNX:q8:peak-v1',cacheVersion:3,
      castVoices:{bunny:'af_heart',bear:'am_michael',duck:'af_sarah',fox:'bf_emma',turtle:'bm_george',owl:'am_fenrir'}};
    const result = voiceSettings({presentationVersion:4,mainCharacter:{kind:'bear'},synthesis:original});
    assert.deepEqual(result, original);
    assert.equal(voiceForSpeaker(result,'cat'), 'am_michael');
    assert.equal(voiceHash(result, 'am_michael', 'A cached hello.'), voiceHash(original, 'am_michael', 'A cached hello.'));
    const {castVoices, ...generic} = original;
    const genericResult = voiceSettings({presentationVersion:4,mainCharacter:{kind:'dragon'},synthesis:generic});
    assert.deepEqual(genericResult, generic);
    assert.equal(voiceForSpeaker(genericResult,'dragon'), 'am_michael');
  });
});

test('utterance planning resolves the animal before deduplicating repeated text across swapped roles', () => {
  withEnv({TTS_ENGINE:'kokoro',TTS_SPEED:'.95',TTS_VOICE:undefined,NARRATOR_VOICE:undefined}, () => {
    const script = {presentationVersion:2,mainCharacter:{kind:'bunny'},scenes:[
      {character:'bunny',secondCharacter:'bear',lines:[{text:'We can do it!',speaker:'character'},{text:'We can do it!',speaker:'friend'}]},
      {character:'ben',secondCharacter:'taffy',lines:[{text:' WE CAN DO IT! ',speaker:'character'},{text:'We can do it!',speaker:'friend'}]},
    ]};
    const settings = voiceSettings(script);
    const utterances = collectUtterances(script,settings);
    assert.equal(utterances.length,2);
    assert.equal(utterances[0].voice,voiceForSpeaker(settings,'taffy'));
    assert.equal(utterances[1].voice,voiceForSpeaker(settings,'ben'));
    const cached = voiceHash(settings,utterances[0].voice,'We can do it!');
    assert.deepEqual(missingTexts(script,settings,hash => hash === cached),['We can do it!']);
    assert.notEqual(cached,voiceHash(settings,utterances[1].voice,'We can do it!'));
  });
});

test('greetings and rhyme bridge planning use the hero voice rather than the first scene animal', () => {
  withEnv({TTS_ENGINE:'kokoro',TTS_SPEED:'.95',TTS_VOICE:undefined,NARRATOR_VOICE:undefined}, () => {
    const script = {presentationVersion:2,type:'rhyme',mainCharacter:{kind:'owl'},intro:{text:'Hello!'},outro:{text:'Goodbye!'},scenes:[
      {character:'bear',lines:[{text:'Big bear hug!',speaker:'character'}]},
    ]};
    const settings = voiceSettings(script);
    const utterances = collectUtterances(script,settings);
    const heroVoice = voiceForSpeaker(settings,'ozzy');
    assert.notEqual(heroVoice,voiceForSpeaker(settings,'ben'));
    assert.deepEqual(utterances.filter(line => line.text !== 'Big bear hug!').map(line => line.voice),[heroVoice,heroVoice,heroVoice]);
  });
});

test('version 2 pins cast voice choices against later environment changes and retains authored per-animal overrides', () => {
  withEnv({TTS_ENGINE:'kokoro',TTS_SPEED:'.95',TTS_VOICE:undefined,NARRATOR_VOICE:undefined}, () => {
    const script = {presentationVersion:2,mainCharacter:{kind:'bear'},castVoices:{ben:'am_puck',daisy:'af_nicole'}};
    const initial = voiceSettings(script);
    assert.equal(voiceForSpeaker(initial,'ben'),'am_puck');
    assert.equal(voiceForSpeaker(initial,'Daisy'),'af_nicole');
    assert.equal(initial.voice,'am_puck');
    const pinnedScript = {...script,synthesis:initial};
    process.env.TTS_VOICE='af_sky'; process.env.NARRATOR_VOICE='af_sky'; process.env.TTS_SPEED='1.4'; process.env.TTS_ENGINE='edge';
    assert.deepEqual(voiceSettings(pinnedScript),initial);
    assert.equal(voiceForSpeaker(voiceSettings(pinnedScript),'friend',{secondCharacter:'bear'}),'am_puck');
  });
});

test('an explicit hero voice override does not collapse the other five animals into the hero voice', () => {
  withEnv({TTS_ENGINE:'kokoro',TTS_SPEED:'.95',TTS_VOICE:'af_nova',NARRATOR_VOICE:undefined}, () => {
    const initial = voiceSettings({presentationVersion:2,mainCharacter:{kind:'bear'},voice:'am_puck'});
    assert.equal(voiceForSpeaker(initial,'character',{character:'bear'}),'am_puck');
    assert.notEqual(voiceForSpeaker(initial,'friend',{secondCharacter:'bunny'}),'am_puck');
    const cliOverride = voiceSettings({presentationVersion:2,mainCharacter:{kind:'bear'}},{voice:'am_fenrir'});
    assert.equal(voiceForSpeaker(cliOverride,'ben'),'am_fenrir');
  });
});

test('version 1 and legacy scripts keep their generic dialogue voices and existing keys for every animal', () => {
  withEnv({TTS_ENGINE:'kokoro',TTS_SPEED:'.95',TTS_VOICE:undefined,NARRATOR_VOICE:undefined}, () => {
    for (const presentationVersion of [undefined,1]) {
      const settings = voiceSettings({presentationVersion,mainCharacter:{kind:'bear'}});
      assert.equal(settings.castVoices,undefined);
      assert.equal(voiceForSpeaker(settings,'character',{character:'bear'}),'af_heart');
      assert.equal(voiceForSpeaker(settings,'friend',{secondCharacter:'owl'}),'af_heart');
      assert.equal(voiceForSpeaker(settings,'ben'),'af_heart');
      assert.equal(settings.cacheVersion,presentationVersion === 1 ? 3 : 2);
    }
  });
});

test('audio generation uses the same scene animal as cache planning and reruns without synthesis', t => {
  const root = fileURLToPath(new URL('../',import.meta.url));
  const dir = fs.mkdtempSync(path.join(os.tmpdir(),'dreamy-cast-voice-'));
  t.after(() => fs.rmSync(dir,{recursive:true,force:true}));
  fs.cpSync(path.join(root,'scripts'),path.join(dir,'scripts'),{recursive:true});
  fs.cpSync(path.join(root,'src/lib'),path.join(dir,'src/lib'),{recursive:true});
  fs.cpSync(path.join(root,'library'),path.join(dir,'library'),{recursive:true,filter: file => !/\.db(?:-(?:wal|shm|journal))?$/.test(file)});
  fs.symlinkSync(path.join(root,'node_modules'),path.join(dir,'node_modules'));
  const slug = 'cached-cast-voice-test';
  const episodeDir = path.join(dir,'public/generated',slug);
  const storeDir = path.join(dir,'.cache/voice');
  fs.mkdirSync(episodeDir,{recursive:true});
  fs.mkdirSync(storeDir,{recursive:true});
  const settings = {engine:'kokoro',ext:'wav',voice:'am_michael',narratorVoice:'af_bella',speed:.95,
    model:'Kokoro-82M-v1.0-ONNX:q8:peak-v1',cacheVersion:3,
    castVoices:{bunny:'af_heart',bear:'am_michael',duck:'af_sarah',fox:'bf_emma',turtle:'bm_george',owl:'am_fenrir'}};
  const source = {version:2,presentationVersion:2,slug,type:'story',title:'Cached Cast',palette:'meadow',
    mainCharacter:{kind:'bear',name:'Ben'},intro:{text:'Hello from Ben!'},outro:{text:'Goodbye from Ben!'},
    moral:null,synthesis:settings,scenes:[
      {kind:'story',background:'meadow',character:'bunny',secondCharacter:'bear',lines:[
        {text:'We can do it!',speaker:'character'}, {text:'We can do it!',speaker:'friend'},
        {text:'What a wonderful day!',speaker:'narrator'}]},
      {kind:'story',background:'forest',character:'bear',secondCharacter:'bunny',lines:[
        {text:'We can do it!',speaker:'character'}, {text:'We can do it!',speaker:'friend'}]},
    ]};
  const directed = directScript(source);
  fs.writeFileSync(path.join(episodeDir,'script.json'),JSON.stringify(directed));
  // Seed every text/voice combination so a routing regression fails on output,
  // never starts the local model or contacts a provider.
  const hash = (voice,text) => crypto.createHash('sha1').update(JSON.stringify([
    'kokoro',voice,'v3',settings.model,.95,text.trim().toLowerCase(),
  ])).digest('hex').slice(0,20);
  const texts = [directed.intro.text,directed.outro.text,...directed.scenes.flatMap(scene => scene.lines.map(line => line.text))];
  for (const text of texts) for (const voice of [...Object.values(settings.castVoices),'af_bella']) {
    const key = hash(voice,text);
    fs.writeFileSync(path.join(storeDir,`${key}.wav`),Buffer.from(`cached voice: ${voice}`));
    fs.writeFileSync(path.join(storeDir,`${key}.json`),JSON.stringify({text,durationSec:.3,words:[]}));
  }
  const cacheBefore = fs.readdirSync(storeDir).sort().map(file => [file,fs.readFileSync(path.join(storeDir,file),'hex')]);
  const env = {...process.env,TTS_ENGINE:'kokoro',TTS_VOICE:'af_nova',NARRATOR_VOICE:'af_nova',TTS_SPEED:'1.4',TURSO_URL:'',TURSO_AUTH_TOKEN:''};
  const run = args => {
    const result = spawnSync(process.execPath,['scripts/generate-audio.mjs','--slug',slug,...args],{cwd:dir,env,encoding:'utf8',timeout:20000});
    assert.ifError(result.error);
    assert.equal(result.status,0,result.stderr);
    return result.stdout;
  };
  assert.equal(JSON.parse(run(['--check'])).missing,0);
  assert.match(run([]),/0 lines synthesized/);
  const read = () => JSON.parse(fs.readFileSync(path.join(episodeDir,'script.json'),'utf8'));
  const generated = read();
  const shared = generated.scenes.slice(0,2).map(scene => scene.lines.filter(line => line.text === 'We can do it!').map(line => line.audio));
  assert.deepEqual(shared,[
    [`line-${hash('af_heart','We can do it!')}.wav`,`line-${hash('am_michael','We can do it!')}.wav`],
    [`line-${hash('am_michael','We can do it!')}.wav`,`line-${hash('af_heart','We can do it!')}.wav`],
  ]);
  assert.equal(generated.intro.audio,`line-${hash('am_michael',directed.intro.text)}.wav`);
  assert.equal(generated.outro.audio,`line-${hash('am_michael',directed.outro.text)}.wav`);
  assert.deepEqual(generated.synthesis,settings);
  env.TTS_ENGINE='edge'; env.TTS_SPEED='1.8';
  assert.match(run([]),/0 lines synthesized/);
  assert.deepEqual(read(),generated);
  assert.deepEqual(fs.readdirSync(storeDir).sort().map(file => [file,fs.readFileSync(path.join(storeDir,file),'hex')]),cacheBefore);
});
