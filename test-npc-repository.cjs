const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const files = new Map();
const frontendMessages = [];
let frontendHandler;
let interceptor;
let assembledMessages = [];

const spindle = {
  storage: {
    async read(name) { if (!files.has(name)) throw new Error('missing'); return files.get(name); },
    async write(name, value) { files.set(name, value); }
  },
  userStorage: {
    async read(name, userId) { assert.equal(userId, 'user-1'); if (!files.has(name)) throw new Error('missing'); return files.get(name); },
    async write(name, value, userId) { assert.equal(userId, 'user-1'); files.set(name, value); }
  },
  connections: { async list() { return { data: [{ id: 'conn-1', name: 'Test', is_default: true }] }; } },
  chats: { async getActive() { return { id: 'chat-1' }; } },
  async assemble(_request, userId) { assert.equal(userId, 'user-1'); return { messages: assembledMessages }; },
  generate: {
    async quiet() {
      return {
        finish_reason: 'tool_calls',
        tool_calls: [{ name: 'record_control_room_analysis', args: {
          baselineAffinity: 0, delta: 0, dynamic: 'Watchful neutrality.',
          storySummary: '', episodeTarget: '', seasonArc: '', bPlots: [], coreMemories: [], futureBranches: []
        } }]
      };
    }
  },
  onFrontendMessage(fn) { frontendHandler = fn; },
  sendToFrontend(payload, userId) { assert.equal(userId, 'user-1'); frontendMessages.push(payload); },
  registerInterceptor(fn) { interceptor = fn; },
  log: { info() {}, warn() {}, error() {} }
};

const presets = fs.readFileSync(path.join(__dirname, 'dist/preset-versions.js'), 'utf8').replace('export const PRESET_VERSIONS', 'const PRESET_VERSIONS');
const backend = fs.readFileSync(path.join(__dirname, 'dist/backend.js'), 'utf8').replace(/^import .*preset-versions.*;\r?\n/m, '');
vm.runInNewContext(`${presets}\n${backend}`, { spindle, console, setTimeout, clearTimeout, AbortController, Date, JSON, Math });

const storyMessages = [
  { role: 'system', content: '<co_star_chemistry>Pacing Cap: Maximum ±2% shift</co_star_chemistry>' },
  { role: 'assistant', content: 'The cast waits in the wings.', __isChatHistory: true, sourceMessageId: 'a1', sourceIndexInChat: 1 },
  { role: 'user', content: 'I call for the stage manager.', __isChatHistory: true, sourceMessageId: 'u1', sourceIndexInChat: 2 }
];

(async () => {
  files.set('ledgers/malformed.json', JSON.stringify({ npcs: 'not-an-object' }));
  await frontendHandler({ type: 'control_room:get_state', chatId: 'malformed' }, 'user-1');
  assert.equal(JSON.stringify(frontendMessages.at(-1).ledger.npcs), '{}', 'malformed NPC storage must normalize to an empty object');

  await frontendHandler({ type: 'control_room:get_state', chatId: 'missing' }, 'user-1');
  assert.equal(JSON.stringify(frontendMessages.at(-1).ledger.npcs), '{}', 'a new ledger must include an empty NPC repository');

  files.set('ledgers/cast.json', JSON.stringify({ turnCounter: 7, npcs: {} }));
  await frontendHandler({
    type: 'npc:upsert', chatId: 'cast', sheets: [{
      name: 'Captain Mira', status: 'new',
      fields: { role: 'Station commander', appearance: 'Silver uniform', personality: 'Guarded', voice: 'Clipped', relationship_to_user: 'Suspicious ally' },
      relationships: { 'Doctor Vale': 'Distrusts his experiments' }, memory: 'm1'
    }]
  }, 'user-1');

  for (let index = 2; index <= 9; index += 1) {
    await frontendHandler({
      type: 'npc:upsert', chatId: 'cast', sheets: [{
        name: index === 9 ? 'CAPTAIN MIRA' : 'Captain Mira', status: 'update',
        fields: index === 9 ? { personality: 'Openly protective', relationship_to_user: 'Trusted ally' } : {},
        relationships: index === 9 ? { 'Chief Rowan': 'Reluctant professional respect' } : {},
        memory: `m${index}`
      }]
    }, 'user-1');
  }
  await frontendHandler({
    type: 'npc:upsert', chatId: 'cast', sheets: [{ name: 'Captain Mira', status: 'update', fields: {}, relationships: {}, memory: 'm9' }]
  }, 'user-1');

  const cast = JSON.parse(files.get('ledgers/cast.json')).npcs['captain-mira'];
  assert.equal(cast.name, 'Captain Mira', 'the most recently supplied display name must win');
  assert.equal(cast.role, 'Station commander');
  assert.equal(cast.personality, 'Openly protective', 'changed fields must overwrite established values');
  assert.equal(cast.relationshipToUser, 'Trusted ally');
  assert.equal(cast.relationships['doctor-vale'], 'Distrusts his experiments', 'existing relationships must survive updates');
  assert.equal(cast.relationships['chief-rowan'], 'Reluctant professional respect', 'new relationships must shallow-merge');
  assert.deepEqual(cast.memories, ['m2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9'], 'memories must deduplicate and retain only the newest eight');
  assert.equal(cast.firstSeenTurn, 7);
  assert.equal(cast.lastUpdatedTurn, 7);
  await frontendHandler({ type: 'npc:archive', chatId: 'cast', id: 'Captain Mira' }, 'user-1');
  assert.equal(JSON.parse(files.get('ledgers/cast.json')).npcs['captain-mira'].archived, true);
  await frontendHandler({ type: 'npc:delete', chatId: 'cast', id: 'captain-mira' }, 'user-1');
  assert.equal(JSON.parse(files.get('ledgers/cast.json')).npcs['captain-mira'], undefined);

  assembledMessages = storyMessages;
  files.set('suite/config.json', JSON.stringify({ enabled: true, npcRepositoryEnabled: false }));
  files.set('ledgers/disabled.json', JSON.stringify({ npcs: { 'captain-mira': cast } }));
  const disabled = await interceptor(storyMessages, { chatId: 'disabled', connectionId: 'conn-1', generationType: 'normal', userId: 'user-1' });
  assert.equal(disabled.messages.some(message => /<npc_dossier\b/.test(message.content || '')), false, 'disabled repository must not inject a dossier');

  files.set('suite/config.json', JSON.stringify({ enabled: true, npcRepositoryEnabled: true }));
  files.set('ledgers/empty.json', JSON.stringify({ npcs: {} }));
  const empty = await interceptor(storyMessages, { chatId: 'empty', connectionId: 'conn-1', generationType: 'normal', userId: 'user-1' });
  assert.equal(empty.messages.some(message => /<npc_dossier\b/.test(message.content || '')), false, 'an empty repository must not inject an empty dossier');

  files.set('ledgers/active.json', JSON.stringify({ npcs: { 'captain-mira': cast } }));
  const active = await interceptor(storyMessages, { chatId: 'active', connectionId: 'conn-1', generationType: 'normal', userId: 'user-1' });
  const dossier = active.messages.find(message => /<npc_dossier\b/.test(message.content || ''))?.content || '';
  assert.match(dossier, /Captain Mira: Station commander\. Trusted ally/);

  const frontend = fs.readFileSync(path.join(__dirname, 'dist/frontend.js'), 'utf8');
  assert.match(frontend, /tagName:'npc_sheet',removeFromMessage:true/, 'NPC sheets must use a stripping tag interceptor');
  assert.match(frontend, /send\('npc:upsert',\{sheets\}\)/, 'NPC sheets from one reply must be sent as one batch');
  console.log('npc-repository-ok');
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
