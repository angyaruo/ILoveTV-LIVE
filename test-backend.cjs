const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const files = new Map();
let interceptor;
let frontendHandler;
let quietCalls = 0;
let assembleCalls = 0;
const frontendMessages = [];

const spindle = {
  storage: {
    async read(name) {
      if (!files.has(name)) throw new Error('missing');
      return files.get(name);
    },
    async write(name, value) { files.set(name, value); }
  },
  userStorage: {
    async read(name, userId) {
      assert.equal(userId, 'user-1');
      if (!files.has(name)) throw new Error('missing');
      return files.get(name);
    },
    async write(name, value, userId) {
      assert.equal(userId, 'user-1');
      files.set(name, value);
    }
  },
  connections: {
    async list(userId) {
      assert.equal(userId, 'user-1');
      return { data: [{ id: 'conn-1', name: 'Test', is_default: true }] };
    }
  },
  generate: {
    async assemble(request, userId) {
      assert.equal(userId, 'user-1');
      assert.equal(request.blocks.length >= 84, true);
      assembleCalls += 1;
      return { messages };
    },
    async quiet(request) {
      assert.equal(request.userId, 'user-1');
      quietCalls += 1;
      if (request.messages[0].content.startsWith('Write a roleplay input')) {
        assert.equal(request.parameters.max_tokens, 1600);
        return { content: [{ type: 'text', text: 'I cross the room and offer a careful hello.' }] };
      }
      assert.equal(request.parameters.max_tokens, 2200);
      assert.equal(request.tools[0].name, 'record_control_room_analysis');
      assert.match(request.messages[0].content, /LATEST USER ACTION:\nI offer her the key\./);
      assert.doesNotMatch(request.messages[0].content, /LATEST USER ACTION:\n<scripting_process>/);
      return {
        content: '',
        reasoning: 'Private reasoning stays separate from the structured result.',
        finish_reason: 'tool_calls',
        tool_calls: [{ name: 'record_control_room_analysis', args: {
          baselineAffinity: 35,
          delta: 2,
          dynamic: 'Trust breaks through her caution.',
          storySummary: 'At the vault, the user offered her the key.',
          episodeTarget: 'Decide whether to open the vault.',
          seasonArc: 'The rivals learn to cooperate.',
          bPlots: ['The key may be counterfeit.'],
          coreMemories: ['The user offered her the vault key.'],
          futureBranches: ['She tests the key in secret.']
        } }]
      };
    }
  },
  chats: {
    async getActive(userId) {
      assert.equal(userId, 'user-1');
      return { id: 'chat-1' };
    }
  },
  onFrontendMessage(fn) { frontendHandler = fn; },
  sendToFrontend(payload, userId) {
    assert.equal(userId, 'user-1');
    frontendMessages.push(payload);
  },
  registerInterceptor(fn) { interceptor = fn; },
  log: { info() {}, warn() {}, error() {} }
};

const presets = fs.readFileSync(path.join(__dirname, 'dist/preset-versions.js'), 'utf8').replace('export const PRESET_VERSIONS', 'const PRESET_VERSIONS');
const source = fs.readFileSync(path.join(__dirname, 'dist/backend.js'), 'utf8').replace(/^import .*preset-versions.*;\r?\n/m, '');
vm.runInNewContext(`${presets}\n${source}`, { spindle, console, setTimeout, clearTimeout, AbortController, Date, JSON, Math });

assert.equal(typeof interceptor, 'function');

const messages = [
  { role: 'system', content: '<co_star_chemistry>Pacing Cap: Maximum ±2% shift</co_star_chemistry>' },
  { role: 'system', content: '<continuity_reel>active</continuity_reel>' },
  { role: 'assistant', content: 'She studies the locked vault.', __isChatHistory: true, sourceMessageId: 'a1', sourceIndexInChat: 4 },
  { role: 'user', content: 'I offer her the key.', __isChatHistory: true, sourceMessageId: 'u1', sourceIndexInChat: 5 },
  { role: 'user', content: '<scripting_process>NARRATIVE PATHFINDING</scripting_process>' }
];

(async () => {
  const first = await interceptor(messages, { chatId: 'chat-1', connectionId: 'conn-1', generationType: 'normal', userId: 'user-1' });
  assert.equal(quietCalls, 1);
  assert.equal(assembleCalls, 1);
  assert.equal(first.breakdown[0].name, 'I Love TV! Suite 3.5 — Director Pass');
  const injected = first.messages[first.breakdown[0].messageIndex].content;
  assert.match(injected, /Calibrated relationship baseline: 35%/);
  assert.match(injected, /Locked affinity: 37%/);
  assert.match(injected, /Core memories: The user offered her the vault key\./);
  assert.match(injected, /Running story summary: At the vault, the user offered her the key\./);
  const pathRoll = injected.match(/LOCKED PATHFINDER ROLL: (\d)\/4/)[1];

  const second = await interceptor(messages, { chatId: 'chat-1', connectionId: 'conn-1', generationType: 'regenerate', userId: 'user-1' });
  assert.equal(quietCalls, 1, 'regenerate must reuse the prior background result');
  const injectedAgain = second.messages[second.breakdown[0].messageIndex].content;
  assert.match(injectedAgain, new RegExp(`LOCKED PATHFINDER ROLL: ${pathRoll}/4`));
  assert.match(injectedAgain, /Locked affinity: 37%/);

  const saved = JSON.parse(files.get('ledgers/chat-1.json'));
  assert.equal(saved.affinity, 37);
  assert.equal(saved.baselineCalibrated, true);
  assert.equal(saved.continuity.coreMemories.length, 1);
  await frontendHandler({ type: 'control_room:save_ledger', chatId: 'chat-1', ledger: { authorNote: 'Keep the mystery unresolved.' } }, 'user-1');
  const savedAfterConfig = JSON.parse(files.get('ledgers/chat-1.json'));
  assert.equal(savedAfterConfig.authorNote, 'Keep the mystery unresolved.');
  assert.equal(savedAfterConfig.lastActions.some(line => /manual override/i.test(line)), false);
  await frontendHandler({ type: 'control_room:expand_choice', chatId: 'chat-1', requestId: 'choice-1', option: '[1] Walk over and say hi' }, 'user-1');
  assert.equal(quietCalls, 2);
  assert.equal(frontendMessages.at(-1).type, 'control_room:choice_expanded');
  assert.equal(frontendMessages.at(-1).text, 'I cross the room and offer a careful hello.');
  console.log('backend-behavior-ok');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});

