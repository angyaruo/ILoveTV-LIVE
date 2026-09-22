const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const files = new Map();
const frontendMessages = [];
const regexScripts = [];
let frontendHandler;
let interceptor;
let assembledMessages = [];
let lastAssemblyRequest;

const spindle = {
  storage: {
    async read(name) { if (!files.has(name)) throw new Error('missing'); return files.get(name); },
    async write(name, value) { files.set(name, value); }
  },
  userStorage: {
    async read(name, userId) { assert.equal(userId, 'user-1'); if (!files.has(name)) throw new Error('missing'); return files.get(name); },
    async write(name, value, userId) { assert.equal(userId, 'user-1'); files.set(name, value); }
  },
  regex_scripts: {
    async list() { return { data: regexScripts, total: regexScripts.length }; },
    async create(input, userId) {
      assert.equal(userId, 'user-1');
      const created = { ...input, id: `regex-${regexScripts.length + 1}`, can_mutate: true, folder_version: input.folder_version };
      regexScripts.push(created);
      return created;
    },
    async update(id, input, userId) {
      assert.equal(userId, 'user-1');
      const index = regexScripts.findIndex(script => script.id === id);
      regexScripts[index] = { ...regexScripts[index], ...input };
      return regexScripts[index];
    }
  },
  connections: { async list() { return { data: [] }; } },
  chats: { async getActive() { return { id: 'chat-1' }; } },
  async assemble(request, userId) {
    assert.equal(userId, 'user-1');
    lastAssemblyRequest = request;
    return { messages: assembledMessages };
  },
  generate: { async quiet() { throw new Error('director pass should not run in this test'); } },
  onFrontendMessage(fn) { frontendHandler = fn; },
  sendToFrontend(payload, userId) { assert.equal(userId, 'user-1'); frontendMessages.push(payload); },
  registerInterceptor(fn) { interceptor = fn; },
  log: { info() {}, warn() {}, error() {} }
};

const presets = fs.readFileSync(path.join(__dirname, 'dist/preset-versions.js'), 'utf8').replace('export const PRESET_VERSIONS', 'const PRESET_VERSIONS');
const backend = fs.readFileSync(path.join(__dirname, 'dist/backend.js'), 'utf8').replace(/^import .*preset-versions.*;\r?\n/m, '');
vm.runInNewContext(`${presets}\n${backend}`, { spindle, console, setTimeout, clearTimeout, AbortController, Date, JSON, Math });

function latest(type) {
  return [...frontendMessages].reverse().find(message => message.type === type);
}

(async () => {
  await frontendHandler({ type: 'control_room:get_state', chatId: 'chat-1' }, 'user-1');
  const initial = latest('control_room:state_data');
  assert.equal(initial.suite.stripStaleScriptDirections, true);
  assert.equal(initial.suite.bundledDisplaySkin, true);
  assert.equal(regexScripts.length, 4, 'only the four enabled native-theme display scripts should be installed');
  assert.equal(regexScripts.every(script => script.target === 'display' && script.disabled === false), true);
  assert.equal(regexScripts.some(script => script.name.startsWith('📺')), false, 'disabled legacy display scripts must not be bundled');

  assembledMessages = [
    { role: 'assistant', content: 'Old prose<script_directions>stale plan</script_directions>tail', __isChatHistory: true },
    { role: 'system', content: '<script_directions>current injected plan</script_directions>' }
  ];
  const stripped = await interceptor(assembledMessages, { chatId: 'chat-1', userId: 'user-1' });
  assert.equal(stripped[0].content, 'Old prosetail');
  assert.match(stripped[1].content, /current injected plan/, 'current injected content must not be stripped');

  await frontendHandler({
    type: 'suite:save_settings', chatId: 'chat-1', enabled: true, rpgMode: false,
    stripStaleScriptDirections: false, bundledDisplaySkin: false
  }, 'user-1');
  assert.equal(regexScripts.every(script => script.disabled === true), true, 'the display toggle must disable all four owned scripts');
  const untouched = await interceptor(assembledMessages, { chatId: 'chat-1', userId: 'user-1' });
  assert.match(untouched[0].content, /<script_directions>stale plan<\/script_directions>/);

  const validExport = {
    schemaVersion: 1,
    name: 'Imported Broadcast v4.2',
    description: 'Imported test preset',
    blocks: [{
      id: 'import-block-1', name: 'Imported Block',
      content: '[[toggle_description: A readable description.]]\n<imported>active</imported>',
      role: 'system', enabled: true, position: 'pre_history', isLocked: false, variables: []
    }],
    promptVariables: { 'import-block-1': { mode: 'live' } },
    promptBehavior: { sendIfEmpty: 'Continue.' },
    completionSettings: { useSystemPrompt: true },
    advancedSettings: { seed: -1 },
    samplerOverrides: { enabled: true, maxTokens: 1234 }
  };
  await frontendHandler({ type: 'suite:import_version', chatId: 'chat-1', rawJson: JSON.stringify(validExport), versionName: '' }, 'user-1');
  const imported = latest('suite:import_success');
  assert.equal(imported.version.label, 'Imported Broadcast v4.2');
  assert.equal(imported.suite.selectedVersion, 'imported-imported-broadcast-v4-2');
  assert.equal(imported.suite.versions[0].imported, true);
  assert.equal(imported.suite.versions.some(version => version.id === '3.5' && version.imported === false), true, 'bundled versions must remain available');
  assert.equal(imported.suite.blocks[0].toggleDescription, 'A readable description.');

  assembledMessages = [{ role: 'system', content: 'No tracker modules.' }];
  await interceptor(assembledMessages, { chatId: 'chat-1', userId: 'user-1' });
  assert.equal(lastAssemblyRequest.blocks[0].content, '<imported>active</imported>', 'toggle descriptions must be stripped before model assembly');
  assert.equal(lastAssemblyRequest.promptVariables['import-block-1'].mode, 'live');

  const versionCount = imported.suite.versions.length;
  await frontendHandler({ type: 'suite:import_version', chatId: 'chat-1', rawJson: '{not json', versionName: 'Broken' }, 'user-1');
  assert.match(latest('suite:import_error').error, /valid JSON/i);
  await frontendHandler({ type: 'suite:import_version', chatId: 'chat-1', rawJson: JSON.stringify({ schemaVersion: 1, name: 'Empty', blocks: [] }) }, 'user-1');
  assert.match(latest('suite:import_error').error, /at least one prompt block/i);
  await frontendHandler({ type: 'suite:import_version', chatId: 'chat-1', rawJson: JSON.stringify({ schemaVersion: 1, name: 'Oversized', blocks: [{ id: 'huge', name: 'Huge', content: 'x'.repeat(50001) }] }) }, 'user-1');
  assert.match(latest('suite:import_error').error, /50,000 character import limit/i);
  await frontendHandler({ type: 'control_room:get_state', chatId: 'chat-1' }, 'user-1');
  assert.equal(latest('control_room:state_data').suite.versions.length, versionCount, 'failed imports must not alter bundled or custom versions');

  const frontend = fs.readFileSync(path.join(__dirname, 'dist/frontend.js'), 'utf8');
  assert.match(frontend, /id="tv-import-version"/, 'the Preset tab must expose the pasted-import action');
  assert.match(frontend, /id="tv-strip-directions"/, 'the Tools tab must expose stale-direction stripping');
  assert.match(frontend, /id="tv-display-skin"/, 'the Tools tab must expose the bundled display skin');
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'spindle.json'), 'utf8'));
  assert.equal(manifest.permissions.includes('regex_scripts'), true, 'display script synchronization requires the regex_scripts permission');

  console.log('preset-import-regex-ok');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
