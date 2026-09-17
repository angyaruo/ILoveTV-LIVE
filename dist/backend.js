// I Love TV! Suite — versioned preset, director, memory, and tools

import { PRESET_VERSIONS } from './preset-versions.js';

const ENGINE_VERSION = '2.0.0';
const DIRECTOR_TIMEOUT_MS = 90000;
const CHOICE_TIMEOUT_MS = 120000;
const MAX_LOG_ENTRIES = 30;

function defaultLedger() {
  return {
    affinity: 0,
    dynamic: '',
    continuity: {
      runningSummary: '',
      seasonArc: '',
      episodeTarget: '',
      bPlots: [],
      coreMemories: [],
      futureBranches: []
    },
    selectedConnection: '',
    authorNote: '',
    baselineCalibrated: false,
    affinityBaseline: 0,
    settings: {
      expandChoices: true,
      trackerInterval: 1
    },
    turnCounter: 0,
    lastTrackerUpdateTurn: 0,
    lastContext: null,
    lastTurn: null,
    lastActions: [`[${new Date().toLocaleTimeString()}] Control Room v${ENGINE_VERSION} initialized.`]
  };
}

function defaultSuiteConfig() {
  return {
    enabled: true,
    selectedVersion: PRESET_VERSIONS[0]?.id || '3.5',
    blockOverrides: {},
    promptVariables: {},
    rpgMode: false
  };
}

function presetVersion(versionId) {
  return PRESET_VERSIONS.find(version => version.id === versionId) || PRESET_VERSIONS[0];
}

function normalizeSuiteConfig(value) {
  const base = defaultSuiteConfig();
  const input = value && typeof value === 'object' ? value : {};
  return {
    ...base,
    ...input,
    selectedVersion: presetVersion(input.selectedVersion)?.id || base.selectedVersion,
    blockOverrides: input.blockOverrides && typeof input.blockOverrides === 'object' ? input.blockOverrides : {},
    promptVariables: input.promptVariables && typeof input.promptVariables === 'object' ? input.promptVariables : {},
    rpgMode: input.rpgMode === true
  };
}

async function getSuiteConfig(userId) {
  try {
    const raw = await spindle.userStorage.read('suite/config.json', userId);
    return normalizeSuiteConfig(JSON.parse(raw));
  } catch {
    return defaultSuiteConfig();
  }
}

async function saveSuiteConfig(config, userId) {
  const normalized = normalizeSuiteConfig(config);
  await spindle.userStorage.write('suite/config.json', JSON.stringify(normalized, null, 2), userId);
  return normalized;
}

function resolvedSuiteBlocks(config) {
  const version = presetVersion(config.selectedVersion);
  const blocks = version.blocks.map(block => {
    const override = config.blockOverrides?.[block.id] || {};
    return { ...block, ...override, id: block.id, variables: block.variables || [] };
  });
  if (config.rpgMode) {
    blocks.push({
      id: 'suite-rpg-mode', name: '🎲 Suite RPG Mode', role: 'system', enabled: true,
      position: 'post_history', depth: 0, marker: null,
      content: '<suite_rpg_mode>Use the locked D20 action check supplied by the Control Room for uncertain actions. Track injuries, inventory, resources, conditions, and unresolved objectives consistently. Never reroll the locked check and never override character agency.</suite_rpg_mode>'
    });
  }
  return blocks;
}

function suiteBlockSummaries(config) {
  return resolvedSuiteBlocks(config).map(block => ({
    id: block.id, name: block.name, enabled: block.enabled !== false, role: block.role,
    position: block.position, marker: block.marker || null,
    edited: Boolean(config.blockOverrides?.[block.id])
  }));
}

function normalizeLedger(value) {
  const base = defaultLedger();
  const input = value && typeof value === 'object' ? value : {};
  const normalized = {
    ...base,
    ...input,
    affinity: Number.isFinite(Number(input.affinity)) ? Math.max(-100, Math.min(100, Number(input.affinity))) : 0,
    continuity: {
      ...base.continuity,
      ...(input.continuity && typeof input.continuity === 'object' ? input.continuity : {})
    },
    settings: {
      ...base.settings,
      ...(input.settings && typeof input.settings === 'object' ? input.settings : {}),
      expandChoices: input.settings?.expandChoices !== false,
      trackerInterval: Math.max(1, Math.min(10, Number(input.settings?.trackerInterval || 1)))
    },
    lastActions: Array.isArray(input.lastActions) ? input.lastActions.slice(-MAX_LOG_ENTRIES) : base.lastActions
  };
  // v1.1/v1.2 shipped decorative defaults that looked like real analysis.
  // Clear them so the UI truthfully waits for the first successful director pass.
  if (normalized.dynamic === 'Neutral Ground') normalized.dynamic = '';
  if (normalized.continuity.episodeTarget === 'Keep the stage live without dead air.') normalized.continuity.episodeTarget = '';
  if (normalized.continuity.seasonArc === 'A chaotic live broadcast unfolds on set.') normalized.continuity.seasonArc = '';
  return normalized;
}

function safeChatId(chatId) {
  return String(chatId || 'default').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160) || 'default';
}

async function getChatLedger(chatId, userId) {
  const path = `ledgers/${safeChatId(chatId)}.json`;
  if (userId && spindle.userStorage) {
    try {
      const raw = await spindle.userStorage.read(path, userId);
      return normalizeLedger(JSON.parse(raw));
    } catch {
      // Fall through once so pre-v1.4 ledgers can be migrated from shared storage.
    }
  }
  try {
    const raw = await spindle.storage.read(path);
    const ledger = normalizeLedger(JSON.parse(raw));
    if (userId && spindle.userStorage) {
      try {
        await spindle.userStorage.write(path, JSON.stringify(ledger, null, 2), userId);
      } catch (error) {
        spindle.log.warn('Control Room: could not migrate ledger to user-scoped storage', error?.message || error);
      }
    }
    return ledger;
  } catch {
    return defaultLedger();
  }
}

async function saveChatLedger(chatId, ledger, userId) {
  const normalized = normalizeLedger(ledger);
  normalized.lastActions = normalized.lastActions.slice(-MAX_LOG_ENTRIES);
  const path = `ledgers/${safeChatId(chatId)}.json`;
  try {
    const serialized = JSON.stringify(normalized, null, 2);
    if (userId && spindle.userStorage) await spindle.userStorage.write(path, serialized, userId);
    else await spindle.storage.write(path, serialized);
  } catch (error) {
    spindle.log.error('Control Room: failed to persist chat ledger', error);
  }
  return normalized;
}

function addLog(ledger, message) {
  ledger.lastActions ||= [];
  ledger.lastActions.push(`[${new Date().toLocaleTimeString()}] ${message}`);
  ledger.lastActions = ledger.lastActions.slice(-MAX_LOG_ENTRIES);
}

function textOf(message) {
  if (typeof message?.content === 'string') return message.content;
  if (!Array.isArray(message?.content)) return '';
  return message.content
    .filter(part => part?.type === 'text' && typeof part.text === 'string')
    .map(part => part.text)
    .join('\n');
}

function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function findTurn(messages, context) {
  const history = messages
    .map((message, index) => ({ message, index, text: textOf(message) }))
    .filter(item => item.message?.__isChatHistory);

  let lastUser = [...history].reverse().find(item => item.message.role === 'user');
  let precedingAssistant;
  if (lastUser) {
    precedingAssistant = [...history]
      .reverse()
      .find(item => item.index < lastUser.index && item.message.role === 'assistant');
  }

  // Compatibility fallback for older Lumiverse versions that did not stamp
  // __isChatHistory. Ignore recognizable preset/control blocks.
  if (!lastUser) {
    const candidates = messages.map((message, index) => ({ message, index, text: textOf(message) }));
    lastUser = [...candidates].reverse().find(item => {
      if (item.message?.role !== 'user') return false;
      return !/<(?:scripting_process|script_directions|pre_flight_checklist|control_room_ledger)\b/i.test(item.text);
    });
    if (lastUser) {
      precedingAssistant = [...candidates]
        .reverse()
        .find(item => item.index < lastUser.index && item.message?.role === 'assistant');
    }
  }

  const userText = lastUser?.text?.trim() || '';
  const sourceId = lastUser?.message?.sourceMessageId || `idx-${lastUser?.message?.sourceIndexInChat ?? lastUser?.index ?? 'none'}`;
  const turnKey = `${context?.chatId || 'default'}:${sourceId}:${hashText(userText)}`;
  const lastHistoryIndex = history.length ? Math.max(...history.map(item => item.index)) : (lastUser?.index ?? -1);

  return {
    userText,
    precedingBeat: precedingAssistant?.text?.trim() || '',
    turnKey,
    insertAt: Math.max(0, lastHistoryIndex + 1)
  };
}

function detectModules(messages) {
  const assembled = messages.map(textOf).join('\n');
  const capMatch = assembled.match(/Pacing Cap:\s*Maximum\s*[±+\/-]*\s*(\d+)%/i);
  return {
    affinity: /<co_star_chemistry\b|DYNAMIC CO-STAR AFFINITY/i.test(assembled),
    continuity: /<continuity_reel\b|continuity_reel_summary/i.test(assembled),
    cyoa: /<cyoa_interactive_mode\b|DIRECTOR'S CUT.+PICK YOUR NEXT MOVE/is.test(assembled),
    pathfinding: /NARRATIVE PATHFINDING|Creative Pathfinding/i.test(assembled),
    fatalAttraction: /Heartthrob Mode|FATAL ATTRACTION|fatal attraction/i.test(assembled),
    vipFavoritism: /VIP Favoritism|GLOBAL SOFT-SPOT|global soft.?spot/i.test(assembled),
    realityCheck: /Reality Check|ANTI-DEIFICATION/i.test(assembled),
    povHint: (assembled.match(/Director Lens\s*&\s*Camera:[^|\n]*\|\s*POV:\s*([^\n]+)/i)?.[1] || '').trim().slice(0, 160),
    affinityCap: Math.max(1, Math.min(10, Number(capMatch?.[1] || 3)))
  };
}

function buildDirectorContext(messages) {
  const history = messages
    .filter(message => message?.__isChatHistory)
    .slice(-10)
    .map(message => `${message.role.toUpperCase()}: ${textOf(message)}`)
    .join('\n\n')
    .slice(-7000);
  const dossier = messages
    .filter(message => message?.role === 'system')
    .map(textOf)
    .filter(text => /CAST DOSSIER|CHAR DESCRIPTION|PERSONALITY|SCENARIO|RELATIONSHIP|CO-STAR|HEARTTHROB|FATAL ATTRACTION|VIP FAVORITISM|REALITY CHECK/i.test(text))
    .join('\n\n')
    .slice(0, 7000);
  return { history, dossier };
}

function cleanStringArray(value, maxItems, maxLength) {
  if (!Array.isArray(value)) return [];
  return value
    .filter(item => typeof item === 'string' && item.trim())
    .map(item => item.trim().slice(0, maxLength))
    .slice(0, maxItems);
}

function extractJson(text) {
  const cleaned = String(text || '').replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
  const start = cleaned.indexOf('{');
  if (start < 0) throw new Error('background response did not contain a JSON object');
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < cleaned.length; index += 1) {
    const char = cleaned[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) {
        const candidate = cleaned.slice(start, index + 1).replace(/,\s*([}\]])/g, '$1');
        return JSON.parse(candidate);
      }
    }
  }
  throw new Error('background response contained incomplete JSON');
}

function contentToText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return '';
  return content
    .filter(part => typeof part === 'string' || part?.type === 'text')
    .map(part => typeof part === 'string' ? part : String(part.text || ''))
    .join('\n');
}

function generationText(result) {
  if (typeof result === 'string') return result;
  return contentToText(result?.content)
    || contentToText(result?.message?.content)
    || (typeof result?.text === 'string' ? result.text : '');
}

function generationDiagnostic(result) {
  const content = generationText(result);
  const reasoning = typeof result?.reasoning === 'string' ? result.reasoning : '';
  const finish = result?.finish_reason || result?.finishReason || 'unknown';
  const tools = Array.isArray(result?.tool_calls) ? result.tool_calls.length : 0;
  return `finish=${finish}, content=${content.length} chars, reasoning=${reasoning.length} chars, toolCalls=${tools}`;
}

function directorPayload(result) {
  for (const call of Array.isArray(result?.tool_calls) ? result.tool_calls : []) {
    if (call?.name !== 'record_control_room_analysis') continue;
    const args = call.args ?? call.input ?? call.arguments;
    if (args && typeof args === 'object') return args;
    if (typeof args === 'string') return extractJson(args);
  }
  const candidates = [generationText(result), typeof result?.reasoning === 'string' ? result.reasoning : ''];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try { return extractJson(candidate); } catch { /* try the next response channel */ }
  }
  throw new Error(`background response did not contain analysis JSON (${generationDiagnostic(result)})`);
}

const DIRECTOR_TOOL = {
  name: 'record_control_room_analysis',
  description: 'Record the private pre-generation relationship and continuity analysis. Call exactly once.',
  parameters: {
    type: 'object',
    additionalProperties: false,
    properties: {
      baselineAffinity: { type: 'integer', minimum: -100, maximum: 100 },
      delta: { type: 'integer', minimum: -10, maximum: 10 },
      dynamic: { type: 'string' },
      storySummary: { type: 'string' },
      episodeTarget: { type: 'string' },
      seasonArc: { type: 'string' },
      bPlots: { type: 'array', items: { type: 'string' }, maxItems: 3 },
      coreMemories: { type: 'array', items: { type: 'string' }, maxItems: 3 },
      futureBranches: { type: 'array', items: { type: 'string' }, maxItems: 3 }
    },
    required: ['baselineAffinity', 'delta', 'dynamic', 'storySummary', 'episodeTarget', 'seasonArc', 'bPlots', 'coreMemories', 'futureBranches']
  }
};

function normalizeConnections(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.connections)) return raw.connections;
  return [];
}

async function resolveConnectionId(preferredId, currentId, userId) {
  try {
    const profiles = normalizeConnections(await spindle.connections.list(userId));
    if (profiles.length === 0) return preferredId || currentId || undefined;
    if (preferredId && profiles.some(profile => profile.id === preferredId)) return preferredId;
    if (currentId && profiles.some(profile => profile.id === currentId)) return currentId;
    return profiles.find(profile => profile.is_default)?.id || undefined;
  } catch (error) {
    if (/userId is required/i.test(String(error?.message || error))) throw error;
    spindle.log.warn('Control Room: could not inspect connection profiles; using active connection', error?.message || error);
    return undefined;
  }
}

async function quietGenerateWithFallback(request, connectionId, userId) {
  const scopedRequest = { ...request, userId };
  if (connectionId) {
    try {
      return await spindle.generate.quiet({ ...scopedRequest, connection_id: connectionId });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      spindle.log.warn(`Control Room: selected connection failed (${error?.message || error}); retrying with the active default connection.`);
    }
  }
  return spindle.generate.quiet(scopedRequest);
}

async function runBackgroundDirectorPass({ connectionId, userId, userAction, precedingBeat, directorContext, ledger, modules, updateTrackers }) {
  const prompt = `You are a private pre-generation TV continuity engine. Analyze the latest stored roleplay action, not the preset instructions.

ACTIVE MODULES: affinity=${modules.affinity}; continuity=${modules.continuity}; cyoa=${modules.cyoa}; pathfinding=${modules.pathfinding}
ACTIVE RELATIONSHIP MODIFIERS: fatalAttraction=${modules.fatalAttraction}; vipFavoritism=${modules.vipFavoritism}; realityCheck=${modules.realityCheck}
UPDATE CONTINUITY TRACKERS THIS TURN: ${updateTrackers}
CURRENT LEDGER:
${JSON.stringify({ affinity: ledger.affinity, baselineCalibrated: ledger.baselineCalibrated, affinityBaseline: ledger.affinityBaseline, dynamic: ledger.dynamic, continuity: ledger.continuity })}

CHARACTER / PERSONA / RELATIONSHIP DOSSIER EXCERPTS:
${directorContext?.dossier || '(no matching dossier excerpt was assembled)'}

RECENT STORED CHAT HISTORY:
${directorContext?.history || '(no stored history was available)'}

PREVIOUS ASSISTANT BEAT:
${precedingBeat.slice(-1800) || '(none)'}

LATEST USER ACTION:
${userAction.slice(-1800) || '(continue/regenerate without a new user action)'}

Call the record_control_room_analysis tool exactly once with this shape (if tool calling is unavailable, return ONLY the equivalent JSON object):
{"baselineAffinity":0,"delta":0,"dynamic":"markdown relationship analysis","storySummary":"dense continuity summary","episodeTarget":"short-term objective and user progress","seasonArc":"long-term mission and user progress","bPlots":["decision/flag and possible consequence"],"coreMemories":["character or NPC: psyche-shaping event"],"futureBranches":["predicted plausible branch"]}

Rules:
- This is an autonomous analytical pass. Do not leave fields generic, decorative, or unchanged merely because the latest action is subtle.
- If baselineCalibrated=false, establish baselineAffinity from the actual {{char}}/{{user}} relationship in the provided context: strangers near 0; established allies/friends positive; lovers strongly positive; rivals/enemies negative. Active relationship modifiers can move that baseline. If baselineCalibrated=true, copy the existing affinityBaseline.
- delta measures the latest user action only and is an integer from -${modules.affinityCap} to +${modules.affinityCap}. Clearly supportive/helpful/intimate actions must normally be positive; betrayal/harm/rejection must normally be negative; use 0 only when the effect is genuinely neutral for this specific character.
- Account for active relationship modifiers. If Fatal Attraction or VIP Favoritism makes the character genuinely respond positively to an otherwise routine action, return a positive delta rather than describing attraction while leaving affinity neutral. Reality Check should resist unearned positive movement.
- The visible character response will be locked to this result: delta 0 at total affinity 0 means emotionally neutral behavior, not covertly positive behavior.
- Judge the character-specific effect, not whether the writing is morally good.
- dynamic is a concise but comprehensive Markdown relationship analysis. Cover {{char}} and each relevant NPC separately, explaining stance toward {{user}}, emotional pressure, trust/attraction/hostility, and the evidence behind it.
- storySummary is a compact chronological summary of established events, decisions, revelations, state changes, and unresolved consequences. Preserve names and causality; omit decorative prose.
- episodeTarget states the immediate short-term narrative objective and {{user}}'s current progress, preserving continuity while naming the next live possibility.
- seasonArc states the overarching long-term mission/conflict and {{user}}'s progress toward or away from it.
- bPlots stores consequential user decisions, unresolved details, promises, secrets, risks, and Chekhov flags that may resurface.
- coreMemories stores only events that permanently shape {{char}} or an NPC's psyche. Prefix each memory with the affected character/NPC; memories may later be reinterpreted but never forgotten.
- futureBranches predicts plausible narrative branches from all current decisions, dynamics, objectives, flags, and memories; do not command a single railroaded outcome.
- If UPDATE CONTINUITY TRACKERS THIS TURN is false, preserve the supplied episodeTarget/seasonArc and return empty tracker arrays.
- Keep each array to at most 3 short items.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DIRECTOR_TIMEOUT_MS);
  try {
    const request = {
      messages: [{ role: 'user', content: prompt }],
      parameters: { max_tokens: 2200, temperature: 0.2 },
      tools: [DIRECTOR_TOOL],
      reasoning: { source: 'off' },
      signal: controller.signal
    };
    let result;
    try {
      result = await quietGenerateWithFallback(request, connectionId, userId);
    } catch (error) {
      const reason = String(error?.message || error);
      if (!/tool|function|schema|unsupported|not supported|invalid.*request/i.test(reason)) throw error;
      spindle.log.warn(`Control Room: structured director output unavailable (${reason}); retrying in plain JSON mode.`);
      const { tools: _omitTools, ...plainRequest } = request;
      void _omitTools;
      result = await quietGenerateWithFallback(plainRequest, connectionId, userId);
    }
    const parsed = directorPayload(result);
    const rawDelta = Number.isFinite(Number(parsed.delta)) ? Math.trunc(Number(parsed.delta)) : 0;
    const rawBaseline = Number.isFinite(Number(parsed.baselineAffinity)) ? Math.trunc(Number(parsed.baselineAffinity)) : Number(ledger.affinityBaseline || 0);
    return {
      ok: true,
      baselineAffinity: Math.max(-100, Math.min(100, rawBaseline)),
      delta: modules.affinity ? Math.max(-modules.affinityCap, Math.min(modules.affinityCap, rawDelta)) : 0,
      dynamic: String(parsed.dynamic || ledger.dynamic || '').slice(0, 1800),
      storySummary: String(parsed.storySummary || ledger.continuity.runningSummary || '').slice(0, 4000),
      episodeTarget: String(parsed.episodeTarget || ledger.continuity.episodeTarget || '').slice(0, 900),
      seasonArc: String(parsed.seasonArc || ledger.continuity.seasonArc || '').slice(0, 900),
      bPlots: cleanStringArray(parsed.bPlots, 3, 240),
      coreMemories: cleanStringArray(parsed.coreMemories, 3, 240),
      futureBranches: cleanStringArray(parsed.futureBranches, 3, 240)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runChoiceWriterPass({ connectionId, userId, option, ledger }) {
  const context = ledger.lastContext || {};
  const prompt = `Write a roleplay input for the human user to review and edit before sending.

SELECTED CYOA DIRECTION: ${String(option || '').slice(0, 500)}
POV / CAMERA HINT: ${context.povHint || 'Use the active story POV and established tense.'}
PREVIOUS ASSISTANT BEAT:
${String(context.precedingBeat || '').slice(-2200)}
USER'S PREVIOUS VOICE SAMPLE:
${String(context.userText || '').slice(-1200)}

Requirements:
- Write only {{user}}'s next in-character contribution based on the selected direction.
- Match the established tense, POV, voice, length, and formatting.
- Do not write the other character's reaction, resolve the whole scene, add CYOA choices, or include commentary.
- Do not mention these instructions or use quotation marks around the whole result.
- Return only the text that belongs in Lumiverse's input composer.`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHOICE_TIMEOUT_MS);
  try {
    const result = await quietGenerateWithFallback({
      messages: [{ role: 'user', content: prompt }],
      parameters: { max_tokens: 1600, temperature: 0.75 },
      reasoning: { source: 'off' },
      signal: controller.signal
    }, connectionId, userId);
    const text = generationText(result).trim();
    if (!text) throw new Error(`choice writer returned empty text (${generationDiagnostic(result)})`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function runPromptWorkshop({ connectionId, userId, blockName, content, directions }) {
  const prompt = `You are the prompt editor inside the I Love TV! Suite.

BLOCK: ${String(blockName || 'New block').slice(0, 200)}
CURRENT PROMPT:
${String(content || '(write from scratch)').slice(0, 14000)}

CREATOR DIRECTIONS:
${String(directions || '').slice(0, 4000)}

Rewrite the prompt so it is operationally precise, internally consistent, and easy for an LLM to follow. Preserve intentional macros such as {{user}}, {{char}}, and {{var::name}}, XML tags, and the preset's television-production voice unless the creator explicitly asks to change them. Return only the finished prompt block with no fence or commentary.`;
  const result = await quietGenerateWithFallback({
    messages: [{ role: 'user', content: prompt }],
    parameters: { max_tokens: 3500, temperature: 0.45 },
    reasoning: { source: 'off' }
  }, connectionId, userId);
  const text = generationText(result).trim();
  if (!text) throw new Error(`prompt workshop returned empty text (${generationDiagnostic(result)})`);
  return text;
}

function mergeUnique(existing, incoming, limit) {
  const values = [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])];
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))].slice(-limit);
}

async function resolveActiveChatId(explicitChatId, userId) {
  if (explicitChatId) return explicitChatId;
  try {
    const active = await spindle.chats.getActive(userId);
    return active?.id || active?.chatId || 'default';
  } catch {
    return 'default';
  }
}

function sendFrontend(payload, userId) {
  try {
    if (userId) spindle.sendToFrontend(payload, userId);
    else spindle.sendToFrontend(payload);
  } catch (error) {
    spindle.log.warn('Control Room: frontend update failed', error?.message || error);
  }
}

spindle.onFrontendMessage(async (payload, userId) => {
  if (!payload) return;
  const chatId = await resolveActiveChatId(payload.chatId, userId);
  let ledger = await getChatLedger(chatId, userId);
  let suiteConfig = await getSuiteConfig(userId);

  if (payload.type === 'control_room:get_state') {
    let connections = [];
    try {
      const profiles = normalizeConnections(await spindle.connections.list(userId));
      connections = profiles.map(profile => ({
        id: profile.id,
        name: profile.name || profile.label || profile.model || 'Connection Profile'
      }));
    } catch (error) {
      spindle.log.warn('Control Room: could not list connections', error?.message || error);
    }
    sendFrontend({
      type: 'control_room:state_data', chatId, ledger, connections,
      suite: {
        enabled: suiteConfig.enabled,
        selectedVersion: suiteConfig.selectedVersion,
        rpgMode: suiteConfig.rpgMode,
        versions: PRESET_VERSIONS.map(version => ({ id: version.id, label: version.label, description: version.description, blockCount: version.blocks.length })),
        blocks: suiteBlockSummaries(suiteConfig)
      }
    }, userId);
  }

  if (payload.type === 'suite:select_version' && payload.versionId) {
    suiteConfig.selectedVersion = presetVersion(payload.versionId).id;
    suiteConfig = await saveSuiteConfig(suiteConfig, userId);
    sendFrontend({ type: 'suite:config_saved', suite: { ...suiteConfig, blocks: suiteBlockSummaries(suiteConfig) } }, userId);
  }

  if (payload.type === 'suite:save_settings') {
    suiteConfig.enabled = payload.enabled !== false;
    suiteConfig.rpgMode = payload.rpgMode === true;
    suiteConfig = await saveSuiteConfig(suiteConfig, userId);
    sendFrontend({ type: 'suite:config_saved', suite: { ...suiteConfig, blocks: suiteBlockSummaries(suiteConfig) } }, userId);
  }

  if (payload.type === 'suite:get_block' && payload.blockId) {
    const block = resolvedSuiteBlocks(suiteConfig).find(item => item.id === payload.blockId);
    if (block) sendFrontend({ type: 'suite:block_data', block }, userId);
  }

  if (payload.type === 'suite:save_block' && payload.blockId) {
    const base = presetVersion(suiteConfig.selectedVersion).blocks.find(item => item.id === payload.blockId);
    if (base) {
      suiteConfig.blockOverrides[payload.blockId] = {
        ...(suiteConfig.blockOverrides[payload.blockId] || {}),
        ...(typeof payload.content === 'string' ? { content: payload.content } : {}),
        ...(typeof payload.enabled === 'boolean' ? { enabled: payload.enabled } : {})
      };
      suiteConfig = await saveSuiteConfig(suiteConfig, userId);
      sendFrontend({ type: 'suite:block_saved', block: resolvedSuiteBlocks(suiteConfig).find(item => item.id === payload.blockId), blocks: suiteBlockSummaries(suiteConfig) }, userId);
    }
  }

  if (payload.type === 'suite:reset_block' && payload.blockId) {
    delete suiteConfig.blockOverrides[payload.blockId];
    suiteConfig = await saveSuiteConfig(suiteConfig, userId);
    sendFrontend({ type: 'suite:block_saved', block: resolvedSuiteBlocks(suiteConfig).find(item => item.id === payload.blockId), blocks: suiteBlockSummaries(suiteConfig) }, userId);
  }

  if (payload.type === 'suite:rewrite_block' && payload.blockId) {
    try {
      const block = resolvedSuiteBlocks(suiteConfig).find(item => item.id === payload.blockId);
      if (!block) throw new Error('Prompt block not found.');
      const connectionId = await resolveConnectionId(ledger.selectedConnection, undefined, userId);
      const content = await runPromptWorkshop({ connectionId, userId, blockName: block.name, content: payload.content ?? block.content, directions: payload.directions });
      sendFrontend({ type: 'suite:rewrite_ready', requestId: payload.requestId, blockId: block.id, content }, userId);
    } catch (error) {
      sendFrontend({ type: 'suite:rewrite_error', requestId: payload.requestId, error: error?.message || 'Prompt rewrite failed.' }, userId);
    }
  }

  if (payload.type === 'control_room:save_ledger' && payload.ledger) {
    ledger = normalizeLedger({
      ...ledger,
      ...payload.ledger,
      continuity: { ...ledger.continuity, ...(payload.ledger.continuity || {}) }
    });
    ledger = await saveChatLedger(chatId, ledger, userId);
    sendFrontend({ type: 'control_room:save_success', chatId, ledger }, userId);
  }

  if (payload.type === 'control_room:expand_choice' && payload.option) {
    try {
      const connectionId = await resolveConnectionId(ledger.selectedConnection, undefined, userId);
      const text = await runChoiceWriterPass({ connectionId, userId, option: payload.option, ledger });
      addLog(ledger, 'CYOA writer completed and sent an editable draft to the composer.');
      ledger = await saveChatLedger(chatId, ledger, userId);
      sendFrontend({ type: 'control_room:choice_expanded', chatId, requestId: payload.requestId, text }, userId);
    } catch (error) {
      const reason = error?.name === 'AbortError' ? 'timed out' : (error?.message || 'Choice generation failed.');
      addLog(ledger, `CYOA writer failed: ${reason}`);
      ledger = await saveChatLedger(chatId, ledger, userId);
      spindle.log.warn(`Control Room: CYOA writer failed (${reason}).`);
      sendFrontend({ type: 'control_room:choice_error', chatId, requestId: payload.requestId, error: error?.message || 'Choice generation failed.' }, userId);
    }
  }
});

spindle.registerInterceptor(async (messages, context) => {
  const chatId = context?.chatId || 'default';
  const userId = context?.userId;
  const suiteConfig = await getSuiteConfig(userId);
  let workingMessages = messages;
  let suiteAssemblySucceeded = false;
  if (suiteConfig.enabled && chatId !== 'default') {
    try {
      const version = presetVersion(suiteConfig.selectedVersion);
      const assembled = await spindle.generate.assemble({
        blocks: resolvedSuiteBlocks(suiteConfig),
        chatId,
        connectionId: context?.connectionId,
        generationType: context?.generationType,
        promptVariables: { ...version.promptVariables, ...suiteConfig.promptVariables }
      }, userId);
      if (Array.isArray(assembled?.messages) && assembled.messages.length) {
        workingMessages = assembled.messages;
        suiteAssemblySucceeded = true;
      }
    } catch (error) {
      spindle.log.warn(`I Love TV! Suite: bundled preset assembly failed (${error?.message || error}); retaining the host prompt.`);
    }
  }
  const modules = detectModules(workingMessages);
  const directorContext = buildDirectorContext(workingMessages);
  const turn = findTurn(workingMessages, context);
  let ledger = await getChatLedger(chatId, userId);
  let turnState = ledger.lastTurn;

  const hasActiveWork = modules.affinity || modules.continuity || modules.pathfinding || modules.cyoa || Boolean(ledger.authorNote);
  if (!hasActiveWork) return workingMessages;

  // A regenerate, continue, or new swipe for the same source user message reuses
  // the first evaluation and dice. It must not compound affinity or reroll fate.
  const isNewTurn = !turnState || turnState.key !== turn.turnKey;
  const shouldRetryFailedPass = !isNewTurn && turnState.backgroundSucceeded === false;
  if (isNewTurn || shouldRetryFailedPass) {
    const previousAffinity = shouldRetryFailedPass ? turnState.previousAffinity : ledger.affinity;
    if (isNewTurn) ledger.turnCounter = Number(ledger.turnCounter || 0) + 1;
    const trackerInterval = Math.max(1, Math.min(10, Number(ledger.settings?.trackerInterval || 1)));
    const updateTrackers = modules.continuity && (Number(ledger.turnCounter || 0) - Number(ledger.lastTrackerUpdateTurn || 0) >= trackerInterval);
    const connectionId = await resolveConnectionId(ledger.selectedConnection, context?.connectionId, userId);
    let evaluation;
    try {
      evaluation = await runBackgroundDirectorPass({
        connectionId,
        userId,
        userAction: turn.userText,
        precedingBeat: turn.precedingBeat,
        directorContext,
        ledger,
        modules,
        updateTrackers
      });
    } catch (error) {
      const reason = error?.name === 'AbortError' ? 'timed out' : (error?.message || 'unknown error');
      spindle.log.warn(`Control Room: background director pass failed (${reason}); injecting locked neutral state.`);
      evaluation = {
        ok: false,
        failureReason: reason,
        baselineAffinity: Number(ledger.affinityBaseline || 0),
        delta: 0,
        dynamic: ledger.dynamic,
        storySummary: ledger.continuity.runningSummary,
        episodeTarget: ledger.continuity.episodeTarget,
        seasonArc: ledger.continuity.seasonArc,
        bPlots: ledger.continuity.bPlots,
        coreMemories: [],
        futureBranches: ledger.continuity.futureBranches
      };
    }

    const calibratedBaseline = ledger.baselineCalibrated
      ? Number(ledger.affinityBaseline || 0)
      : Number(evaluation.baselineAffinity || 0);
    const newAffinity = modules.affinity
      ? Math.max(-100, Math.min(100, (ledger.baselineCalibrated ? previousAffinity : calibratedBaseline) + evaluation.delta))
      : previousAffinity;

    ledger.affinity = newAffinity;
    if (evaluation.ok) {
      ledger.dynamic = evaluation.dynamic || ledger.dynamic;
      ledger.affinityBaseline = calibratedBaseline;
      ledger.baselineCalibrated = true;
    }
    ledger.continuity = {
      ...ledger.continuity,
      episodeTarget: updateTrackers && evaluation.episodeTarget ? evaluation.episodeTarget : ledger.continuity.episodeTarget,
      runningSummary: updateTrackers && evaluation.storySummary ? evaluation.storySummary : ledger.continuity.runningSummary,
      seasonArc: updateTrackers && evaluation.seasonArc ? evaluation.seasonArc : ledger.continuity.seasonArc,
      bPlots: updateTrackers && evaluation.bPlots?.length ? evaluation.bPlots : ledger.continuity.bPlots,
      coreMemories: updateTrackers ? mergeUnique(ledger.continuity.coreMemories, evaluation.coreMemories, 12) : ledger.continuity.coreMemories,
      futureBranches: updateTrackers && evaluation.futureBranches?.length ? evaluation.futureBranches : ledger.continuity.futureBranches
    };
    if (updateTrackers && evaluation.ok) ledger.lastTrackerUpdateTurn = ledger.turnCounter;
    ledger.lastContext = {
      userText: turn.userText.slice(-1600),
      precedingBeat: turn.precedingBeat.slice(-2600),
      povHint: modules.povHint,
      generationType: context?.generationType || 'normal'
    };

    turnState = {
      key: turn.turnKey,
      sourceTextHash: hashText(turn.userText),
      previousAffinity,
      baselineAffinity: calibratedBaseline,
      delta: evaluation.delta,
      newAffinity,
      pathRoll: shouldRetryFailedPass ? turnState.pathRoll : Math.floor(Math.random() * 4) + 1,
      d20Roll: shouldRetryFailedPass ? turnState.d20Roll : Math.floor(Math.random() * 20) + 1,
      evaluatedAt: new Date().toISOString(),
      backgroundSucceeded: evaluation.ok,
      failureReason: evaluation.failureReason || '',
      trackerUpdated: Boolean(updateTrackers && evaluation.ok)
    };
    ledger.lastTurn = turnState;
    const signedDelta = turnState.delta >= 0 ? `+${turnState.delta}` : String(turnState.delta);
    addLog(ledger, `${evaluation.ok ? (shouldRetryFailedPass ? 'Background retry recovered' : 'Background pass complete') : 'Neutral fallback (will retry)'}: Δ${signedDelta}, affinity ${newAffinity}%, path ${turnState.pathRoll}/4, d20 ${turnState.d20Roll}/20${turnState.trackerUpdated ? ', trackers updated' : ''}.`);
    ledger = await saveChatLedger(chatId, ledger, userId);
  } else {
    addLog(ledger, `Reused locked turn state for ${context?.generationType || 'generation'}; affinity and dice unchanged.`);
    ledger = await saveChatLedger(chatId, ledger, userId);
  }

  const signedDelta = turnState.delta >= 0 ? `+${turnState.delta}` : String(turnState.delta);
  const lines = [
    '<control_room_ledger priority="CRITICAL">',
    '[STUDIO CONTROL ROOM // LOCKED PRE-GENERATION RESULT]',
    `Suite preset: ${presetVersion(suiteConfig.selectedVersion).label} (${suiteAssemblySucceeded ? 'assembled by extension' : 'host prompt fallback'})`,
    `Generation type: ${context?.generationType || 'normal'}`,
    `Active preset modules: affinity=${modules.affinity}; continuity=${modules.continuity}; cyoa=${modules.cyoa}; pathfinding=${modules.pathfinding}`,
    `Background pass status: ${turnState.backgroundSucceeded ? 'SUCCESS' : `FALLBACK (${turnState.failureReason || 'unknown error'}) — the next regeneration/swipe will retry`}`,
    `Previous affinity: ${turnState.previousAffinity}%`,
    `Calibrated relationship baseline: ${turnState.baselineAffinity}%`,
    `Evaluated delta: ${signedDelta}%`,
    `Locked affinity: ${turnState.newAffinity}%`,
    `Dynamic subtext: ${ledger.dynamic}`,
    `Immediate episode target: ${ledger.continuity.episodeTarget}`,
    `LOCKED PATHFINDER ROLL: ${turnState.pathRoll}/4. In script_directions, Path ${turnState.pathRoll} is mandatory; ignore and do not perform any other 1d4 path roll.`,
    `LOCKED D20 ACTION CHECK: ${turnState.d20Roll}/20 (${turnState.d20Roll >= 10 ? 'SUCCESS' : 'CHALLENGE'}). Do not reroll it.`
  ];

  if (modules.continuity) {
    lines.push(`Running story summary: ${ledger.continuity.runningSummary || '(awaiting first tracker pass)'}`);
    lines.push(`Season arc: ${ledger.continuity.seasonArc}`);
    lines.push(`B-plots / flags: ${(ledger.continuity.bPlots || []).join(' | ') || '(none yet)'}`);
    lines.push(`Core memories: ${(ledger.continuity.coreMemories || []).join(' | ') || '(none yet)'}`);
    lines.push(`Possible future branches: ${(ledger.continuity.futureBranches || []).join(' | ') || '(none yet)'}`);
  }
  if (ledger.authorNote?.trim()) lines.push(`AUTHOR NOTE FOR THIS AND FUTURE TURNS: ${ledger.authorNote.trim()}`);
  if (modules.affinity) {
    lines.push(`Output this exact telemetry tag at the end: [Affinity: ${turnState.newAffinity}% | Δ(${signedDelta}%) | Dynamic: "${ledger.dynamic}"]`);
    lines.push(`BEHAVIOR LOCK: The visible character response must match the locked affinity and delta. At total ${turnState.newAffinity}% with delta ${signedDelta}%, do not portray a more positive or negative reaction than the ledger supports. Relationship modifiers were already considered by the evaluator.`);
    lines.push('Do not recalculate or replace the locked values.');
  }
  lines.push('</control_room_ledger>');

  const injected = { role: 'system', content: lines.join('\n') };
  const modified = [...workingMessages];
  const insertAt = Math.min(Math.max(turn.insertAt, 0), modified.length);
  modified.splice(insertAt, 0, injected);

  sendFrontend({ type: 'control_room:state_data', chatId, ledger }, userId);
  return {
    messages: modified,
    breakdown: [{ messageIndex: insertAt, name: `I Love TV! Suite ${presetVersion(suiteConfig.selectedVersion).id} — Director Pass` }]
  };
}, 10);

spindle.log.info(`I Love TV! Suite v${ENGINE_VERSION} initialized with ${PRESET_VERSIONS.length} bundled preset version(s).`);

