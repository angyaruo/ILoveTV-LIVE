const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const files = new Map();
let interceptor;
let calls = 0;
const spindle = {
  storage: {
    async read(name) { if (!files.has(name)) throw new Error('missing'); return files.get(name); },
    async write(name, value) { files.set(name, value); }
  },
  userStorage: {
    async read(name, userId) { assert.equal(userId, 'user-1'); if (!files.has(name)) throw new Error('missing'); return files.get(name); },
    async write(name, value, userId) { assert.equal(userId, 'user-1'); files.set(name, value); }
  },
  connections: { async list(userId) { assert.equal(userId, 'user-1'); return { data: [{ id: 'conn-1', is_default: true }] }; } },
  async assemble(request, userId) { assert.equal(userId, 'user-1'); return { messages }; },
  generate: {
    async quiet(request) {
      assert.equal(request.userId, 'user-1');
      calls += 1;
      if (calls === 1) return { content: 'not-json' };
      return { content: '{"delta":1,"dynamic":"Her interest becomes visible.","episodeTarget":"Answer the invitation.","seasonArc":"Trust grows.","bPlots":[],"coreMemories":[],"futureBranches":[]}' };
    }
  },
  chats: { async getActive() { return { id: 'chat-1' }; } },
  onFrontendMessage() {}, sendToFrontend() {},
  registerInterceptor(fn) { interceptor = fn; },
  log: { info() {}, warn() {}, error() {} }
};

const presets = fs.readFileSync(path.join(__dirname, 'dist/preset-versions.js'), 'utf8').replace('export const PRESET_VERSIONS', 'const PRESET_VERSIONS');
const backend = fs.readFileSync(path.join(__dirname, 'dist/backend.js'), 'utf8').replace(/^import .*preset-versions.*;\r?\n/m, '');
vm.runInNewContext(`${presets}\n${backend}`, { spindle, console, setTimeout, clearTimeout, AbortController, Date, JSON, Math });
const messages = [
  { role: 'system', content: '<co_star_chemistry>Pacing Cap: Maximum ±2% shift</co_star_chemistry> Heartthrob Mode: Fatal Attraction' },
  { role: 'assistant', content: 'She waits by the door.', __isChatHistory: true, sourceMessageId: 'a1', sourceIndexInChat: 1 },
  { role: 'user', content: 'I nod to her.', __isChatHistory: true, sourceMessageId: 'u1', sourceIndexInChat: 2 }
];

(async () => {
  const first = await interceptor(messages, { chatId: 'chat-1', generationType: 'normal', userId: 'user-1' });
  const firstText = first.messages[first.breakdown[0].messageIndex].content;
  assert.match(firstText, /FALLBACK/);
  const roll = firstText.match(/LOCKED PATHFINDER ROLL: (\d)\/4/)[1];
  const second = await interceptor(messages, { chatId: 'chat-1', generationType: 'regenerate', userId: 'user-1' });
  const secondText = second.messages[second.breakdown[0].messageIndex].content;
  assert.equal(calls, 2, 'failed pass must retry on the same source turn');
  assert.match(secondText, /Background pass status: SUCCESS/);
  assert.match(secondText, /Locked affinity: 1%/);
  assert.match(secondText, new RegExp(`LOCKED PATHFINDER ROLL: ${roll}/4`), 'retry must retain dice');
  console.log('background-retry-ok');
})().catch(error => { console.error(error); process.exitCode = 1; });
