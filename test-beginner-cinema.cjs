const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const files = new Map();
const frontendMessages = [];
const warnings = [];
let frontendHandler;
let interceptor;
let assemblyRequest;

const spindle = {
  storage: {
    async read(name) { if (!files.has(name)) throw new Error('missing'); return files.get(name); },
    async write(name, value) { files.set(name, value); }
  },
  userStorage: {
    async read(name) { if (!files.has(name)) throw new Error('missing'); return files.get(name); },
    async write(name, value) { files.set(name, value); }
  },
  regex_scripts: {
    async list() { return { data: [] }; },
    async create() {},
    async update() {}
  },
  connections: { async list() { return { data: [] }; } },
  chats: { async getActive() { return { id: 'chat-1' }; } },
  async assemble(request) {
    assemblyRequest = request;
    return { messages: [{ role: 'user', content: 'A quiet test turn.' }] };
  },
  generate: { async quiet() { throw new Error('background generation should not run'); } },
  onFrontendMessage(fn) { frontendHandler = fn; },
  sendToFrontend(payload) { frontendMessages.push(payload); },
  registerInterceptor(fn) { interceptor = fn; },
  log: { info() {}, warn(message) { warnings.push(message); }, error() {} }
};

const presets = fs.readFileSync(path.join(__dirname, 'dist/preset-versions.js'), 'utf8').replace('export const PRESET_VERSIONS', 'const PRESET_VERSIONS');
const backend = fs.readFileSync(path.join(__dirname, 'dist/backend.js'), 'utf8').replace(/^import .*preset-versions.*;\r?\n/m, '');
vm.runInNewContext(`${presets}\n${backend}`, { spindle, console, setTimeout, clearTimeout, AbortController, Date, JSON, Math });

function latest(type) {
  return [...frontendMessages].reverse().find(message => message.type === type);
}

(async () => {
  await frontendHandler({ type: 'control_room:get_state', chatId: 'chat-1' }, 'user-1');
  let suite = latest('control_room:state_data').suite;
  assert.equal(suite.devMode, false);
  assert.deepEqual(Array.from(suite.slopPhrases), []);
  assert.equal(suite.slopPhrasesEnabled, true);
  assert.equal(suite.beginnerToggles.filter(item => item.categoryKey === 'scripting_process').length, 1, 'CoT must be one category-wide toggle');
  assert.equal(suite.beginnerToggles.some(item => /Anti-deification/.test(item.label)), true, 'User Toggles must be included');
  assert.equal(suite.beginnerToggles.some(item => /Director's Booth Commentary/.test(item.label)), true, 'Audience Warm-Up prompts must be included');
  assert.equal(suite.beginnerToggles.some(item => item.isLocked), false, 'locked blocks must never enter beginner controls');

  const cot = suite.beginnerToggles.find(item => item.categoryKey === 'scripting_process');
  await frontendHandler({ type: 'suite:save_block', chatId: 'chat-1', blockId: cot.id, enabled: false }, 'user-1');
  assert.equal(latest('suite:block_saved').suite.beginnerToggles.find(item => item.id === cot.id).enabled, false);

  const phrases = Array.from({ length: 14 }, (_unused, index) => `sin ${index + 1}`);
  await frontendHandler({ type: 'suite:save_slop_phrases', chatId: 'chat-1', phrases }, 'user-1');
  suite = latest('suite:config_saved').suite;
  assert.equal(suite.slopPhrases.length, 14, 'Cinema Sins must not impose an item cap');
  await interceptor([{ role: 'user', content: 'test' }], { chatId: 'chat-1', userId: 'user-1' });
  const antiSlop = assemblyRequest.blocks.find(block => String(block.content).includes('<anti_slop_reference>'));
  assert.match(antiSlop.content, /## CINEMA SINS \/\/ OPERATOR BLACKLIST\n- sin 1/);
  assert.match(antiSlop.content, /- sin 14/);

  await frontendHandler({
    type: 'suite:save_settings', chatId: 'chat-1', enabled: true, devMode: false,
    rpgMode: false, npcRepositoryEnabled: false, stripStaleScriptDirections: true,
    bundledDisplaySkin: true, slopPhrasesEnabled: false
  }, 'user-1');
  await interceptor([{ role: 'user', content: 'test' }], { chatId: 'chat-1', userId: 'user-1' });
  assert.doesNotMatch(assemblyRequest.blocks.find(block => String(block.content).includes('<anti_slop_reference>')).content, /OPERATOR BLACKLIST/);

  const frontend = fs.readFileSync(path.join(__dirname, 'dist/frontend.js'), 'utf8');
  assert.match(frontend, /data-beginner-block/, 'beginner mode needs direct toggle cards');
  assert.match(frontend, /id="tv-dev-mode"/, 'Tools must expose developer mode');
  assert.match(frontend, /id="tv-slop-input"/, 'Tools must expose Cinema Sins phrase input');
  assert.match(frontend, /mount\('chat_toolbar'\)/, 'suite launcher must mount directly in the composer toolbar');
  assert.doesNotMatch(frontend, /registerInputBarAction\(/, 'suite launcher must not remain in the Extras input action menu');

  const buildScript = fs.readFileSync(path.join(__dirname, 'scripts/build-preset-module.cjs'), 'utf8');
  assert.match(buildScript, /extractToggleDescription/, 'bundled builds must strip inline toggle descriptions');
  console.log('beginner-cinema-ok');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
