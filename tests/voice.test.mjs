import assert from "node:assert/strict";
import test from "node:test";
import { collectUtterances, missingTexts, voiceForSpeaker, voiceSettings } from "../scripts/lib/voice.mjs";

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
