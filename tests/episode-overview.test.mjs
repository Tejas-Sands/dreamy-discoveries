import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../src/lib/overview.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } });
const { episodeOverview } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);

test('opening previews unique taught topics, without revealing quiz answers or praise', () => {
  const line = text => ({ text, callout: { kind: 'word', text } });
  const script = { scenes: [
    { kind: 'verse', lines: [line('Red'), line('Red'), {...line('Well done'), role: 'praise'}] },
    { kind: 'question', question: {}, lines: [line('Secret answer')] },
    { kind: 'verse', lines: [line('Blue'), line('Green'), line('Yellow')] },
  ] };
  assert.deepEqual(episodeOverview(script).map(c => c.text), ['Red', 'Blue', 'Green']);
  assert.deepEqual(episodeOverview({scenes: [{lines: [{text: 'Hello'}]}]}), []);
});
