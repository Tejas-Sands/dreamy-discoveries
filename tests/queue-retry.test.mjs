import test from 'node:test';
import assert from 'node:assert/strict';
const queue = await import('../scripts/queue.mjs');

test('a failed queued episode retains its committed slug and becomes pending again', () => {
  assert.equal(typeof queue.retryEntry, 'function');
  const state = {items: [{id: 'q1', status: 'running', topic: 'A kind story'}]};
  queue.retryEntry(state, 'q1', 'saved-episode');
  assert.equal(state.items[0].status, 'pending');
  assert.equal(state.items[0].slug, 'saved-episode');
  queue.retryEntry(state, 'q1');
  assert.equal(state.items[0].slug, 'saved-episode');
});

test('delivery failures cannot reopen a completed queue item', () => {
  assert.equal(typeof queue.retryEntry, 'function');
  const state = {items: [{id: 'q1', status: 'done', slug: 'finished'}]};
  assert.equal(queue.retryEntry(state, 'q1', 'finished'), false);
  assert.equal(state.items[0].status, 'done');
});
