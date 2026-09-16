// Control Room: I Love TV! — two-pass director engine

const ENGINE_VERSION = '1.2.0';
const BACKGROUND_TIMEOUT_MS = 25000;
const MAX_LOG_ENTRIES = 30;
let lastFrontendUserId;

function defaultLedger() {
  return {
    affinity: 0,
    dynamic: 'Neutral Ground',
    continuity: {
      seasonArc: 'A chaotic live broadcast unfolds on set.',
      episodeTarget: 'Keep the stage live without dead air.',
      bPlots: [],
      coreMemories: [],
      futureBranches: []
    },
    selectedConnection: '',
    authorNote: '',
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

function normalizeLedger(value) {
  const base = defaultLedger();
  const input = value && typeof value === 'object' ? value : {};
  return {
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
}

function safeChatId(chatId) {
  return String(chatId || 'default').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 160) || 'default';
}

async function getChatLedger(chatId) {
  try {
    const raw = await spindle.storage.read(`ledgers/${safeChatId(chatId)}.json`);
    return normalizeLedger(JSON.parse(raw));
  } catch {
    return defaultLedger();
  }
}

async function saveChatLedger(chatId, ledger) {
  const normalized = normalizeLedger(ledger);
  normalized.lastActions = normalized.lastActions.slice(-MAX_LOG_ENTRIES);
  try {
    await spindle.storage.write(`ledgers/${safeChatId(chatId)}.json`, JSON.stringify(normalized, null, 2));
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

function normalizeConnections(raw) {
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.data)) return raw.data;
  if (Array.isArray(raw?.connections)) return raw.connections;
  return [];
}

async function resolveConnectionId(preferredId, currentId) {
  try {
    const profiles = normalizeConnections(await spindle.connections.list());
    if (profiles.length === 0) return preferredId || currentId || undefined;
    if (preferredId && profiles.some(profile => profile.id === preferredId)) return preferredId;
    if (currentId && profiles.some(profile => profile.id === currentId)) return currentId;
    return profiles.find(profile => profile.is_default)?.id || undefined;
  } catch (error) {
    spindle.log.warn('Control Room: could not inspect connection profiles; using active connection', error?.message || error);
    return undefined;
  }
}

async function quietGenerateWithFallback(request, connectionId) {
  if (connectionId) {
    try {
      return await spindle.generate.quiet({ ...request, connection_id: connectionId });
    } catch (error) {
      if (error?.name === 'AbortError') throw error;
      spindle.log.warn(`Control Room: selected connection failed (${error?.message || error}); retrying with the active default connection.`);
    }
  }
  return spindle.generate.quiet(request);
}

async function runBackgroundDirectorPass({ connectionId, userAction, precedingBeat, ledger, modules, updateTrackers }) {
  const prompt = `You are a private pre-generation TV continuity engine. Analyze the latest stored roleplay action, not the preset instructions.

ACTIVE MODULES: affinity=${modules.affinity}; continuity=${modules.continuity}; cyoa=${modules.cyoa}; pathfinding=${modules.pathfinding}
ACTIVE RELATIONSHIP MODIFIERS: fatalAttraction=${modules.fatalAttraction}; vipFavoritism=${modules.vipFavoritism}; realityCheck=${modules.realityCheck}
UPDATE CONTINUITY TRACKERS THIS TURN: ${updateTrackers}
CURRENT LEDGER:
${JSON.stringify({ affinity: ledger.affinity, dynamic: ledger.dynamic, continuity: ledger.continuity })}

PREVIOUS ASSISTANT BEAT:
${precedingBeat.slice(-1800) || '(none)'}

LATEST USER ACTION:
${userAction.slice(-1800) || '(continue/regenerate without a new user action)'}

Return ONLY one valid JSON object with this shape:
{"delta":0,"dynamic":"brief emotional subtext","episodeTarget":"immediate scene goal","seasonArc":"one-sentence trajectory","bPlots":["unresolved thread"],"coreMemories":["durable established fact"],"futureBranches":["plausible future turn"]}

Rules:
- delta is an integer from -${modules.affinityCap} to +${modules.affinityCap}. If affinity=false, delta must be 0.
- Account for active relationship modifiers. If Fatal Attraction or VIP Favoritism makes the character genuinely respond positively to an otherwise routine action, return a positive delta rather than describing attraction while leaving affinity neutral. Reality Check should resist unearned positive movement.
- The visible character response will be locked to this result: delta 0 at total affinity 0 means emotionally neutral behavior, not covertly positive behavior.
- Judge the character-specific effect, not whether the writing is morally good.
- Preserve established facts. Core memories must be durable continuity facts, not prose summaries.
- If UPDATE CONTINUITY TRACKERS THIS TURN is false, preserve the supplied episodeTarget/seasonArc and return empty tracker arrays.
- Keep each array to at most 3 short items.`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), BACKGROUND_TIMEOUT_MS);
  try {
    const request = {
      messages: [{ role: 'user', content: prompt }],
      parameters: { max_tokens: 420, temperature: 0.2 },
      reasoning: { source: 'off' },
      signal: controller.signal
    };
    const result = await quietGenerateWithFallback(request, connectionId);
    const parsed = extractJson(result?.content);
    const rawDelta = Number.isFinite(Number(parsed.delta)) ? Math.trunc(Number(parsed.delta)) : 0;
    return {
      ok: true,
      delta: modules.affinity ? Math.max(-modules.affinityCap, Math.min(modules.affinityCap, rawDelta)) : 0,
      dynamic: String(parsed.dynamic || ledger.dynamic || 'Scene tension holds.').slice(0, 240),
      episodeTarget: String(parsed.episodeTarget || ledger.continuity.episodeTarget || '').slice(0, 320),
      seasonArc: String(parsed.seasonArc || ledger.continuity.seasonArc || '').slice(0, 320),
      bPlots: cleanStringArray(parsed.bPlots, 3, 240),
      coreMemories: cleanStringArray(parsed.coreMemories, 3, 240),
      futureBranches: cleanStringArray(parsed.futureBranches, 3, 240)
    };
  } finally {
    clearTimeout(timer);
  }
}

async function runChoiceWriterPass({ connectionId, option, ledger }) {
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
  const timer = setTimeout(() => controller.abort(), BACKGROUND_TIMEOUT_MS);
  try {
    const result = await quietGenerateWithFallback({
      messages: [{ role: 'user', content: prompt }],
      parameters: { max_tokens: 500, temperature: 0.75 },
      reasoning: { source: 'off' },
      signal: controller.signal
    }, connectionId);
    const text = String(result?.content || '').trim();
    if (!text) throw new Error('choice writer returned empty text');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

function mergeUnique(existing, incoming, limit) {
  const values = [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])];
  return [...new Set(values.map(value => String(value).trim()).filter(Boolean))].slice(-limit);
}

async function resolveActiveChatId(explicitChatId) {
  if (explicitChatId) return explicitChatId;
  try {
    const active = await spindle.chats.getActive();
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
  lastFrontendUserId = userId || lastFrontendUserId;
  const chatId = await resolveActiveChatId(payload.chatId);
  let ledger = await getChatLedger(chatId);

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
    sendFrontend({ type: 'control_room:state_data', chatId, ledger, connections }, userId);
  }

  if (payload.type === 'control_room:save_ledger' && payload.ledger) {
    ledger = normalizeLedger({
      ...ledger,
      ...payload.ledger,
      continuity: { ...ledger.continuity, ...(payload.ledger.continuity || {}) }
    });
    addLog(ledger, `Manual override saved at affinity ${ledger.affinity}%.`);
    ledger = await saveChatLedger(chatId, ledger);
    sendFrontend({ type: 'control_room:save_success', chatId, ledger }, userId);
  }

  if (payload.type === 'control_room:expand_choice' && payload.option) {
    try {
      const connectionId = await resolveConnectionId(ledger.selectedConnection, undefined);
      const text = await runChoiceWriterPass({ connectionId, option: payload.option, ledger });
      sendFrontend({ type: 'control_room:choice_expanded', chatId, requestId: payload.requestId, text }, userId);
    } catch (error) {
      sendFrontend({ type: 'control_room:choice_error', chatId, requestId: payload.requestId, error: error?.message || 'Choice generation failed.' }, userId);
    }
  }
});

spindle.registerInterceptor(async (messages, context) => {
  const chatId = context?.chatId || 'default';
  const modules = detectModules(messages);
  const turn = findTurn(messages, context);
  let ledger = await getChatLedger(chatId);
  let turnState = ledger.lastTurn;

  const hasActiveWork = modules.affinity || modules.continuity || modules.pathfinding || modules.cyoa || Boolean(ledger.authorNote);
  if (!hasActiveWork) return messages;

  // A regenerate, continue, or new swipe for the same source user message reuses
  // the first evaluation and dice. It must not compound affinity or reroll fate.
  const isNewTurn = !turnState || turnState.key !== turn.turnKey;
  const shouldRetryFailedPass = !isNewTurn && turnState.backgroundSucceeded === false;
  if (isNewTurn || shouldRetryFailedPass) {
    const previousAffinity = shouldRetryFailedPass ? turnState.previousAffinity : ledger.affinity;
    if (isNewTurn) ledger.turnCounter = Number(ledger.turnCounter || 0) + 1;
    const trackerInterval = Math.max(1, Math.min(10, Number(ledger.settings?.trackerInterval || 1)));
    const updateTrackers = modules.continuity && (Number(ledger.turnCounter || 0) - Number(ledger.lastTrackerUpdateTurn || 0) >= trackerInterval);
    const connectionId = await resolveConnectionId(ledger.selectedConnection, context?.connectionId);
    let evaluation;
    try {
      evaluation = await runBackgroundDirectorPass({
        connectionId,
        userAction: turn.userText,
        precedingBeat: turn.precedingBeat,
        ledger,
        modules,
        updateTrackers
      });
    } catch (error) {
      const reason = error?.name === 'AbortError' ? 'timed out' : (error?.message || 'unknown error');
      spindle.log.warn(`Control Room: background director pass failed (${reason}); injecting locked neutral state.`);
      evaluation = {
        ok: false,
        delta: 0,
        dynamic: ledger.dynamic,
        episodeTarget: ledger.continuity.episodeTarget,
        seasonArc: ledger.continuity.seasonArc,
        bPlots: ledger.continuity.bPlots,
        coreMemories: [],
        futureBranches: ledger.continuity.futureBranches
      };
    }

    const newAffinity = modules.affinity
      ? Math.max(-100, Math.min(100, previousAffinity + evaluation.delta))
      : previousAffinity;

    ledger.affinity = newAffinity;
    ledger.dynamic = evaluation.dynamic || ledger.dynamic;
    ledger.continuity = {
      ...ledger.continuity,
      episodeTarget: updateTrackers && evaluation.episodeTarget ? evaluation.episodeTarget : ledger.continuity.episodeTarget,
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
      delta: evaluation.delta,
      newAffinity,
      pathRoll: shouldRetryFailedPass ? turnState.pathRoll : Math.floor(Math.random() * 4) + 1,
      d20Roll: shouldRetryFailedPass ? turnState.d20Roll : Math.floor(Math.random() * 20) + 1,
      evaluatedAt: new Date().toISOString(),
      backgroundSucceeded: evaluation.ok,
      trackerUpdated: Boolean(updateTrackers && evaluation.ok)
    };
    ledger.lastTurn = turnState;
    const signedDelta = turnState.delta >= 0 ? `+${turnState.delta}` : String(turnState.delta);
    addLog(ledger, `${evaluation.ok ? (shouldRetryFailedPass ? 'Background retry recovered' : 'Background pass complete') : 'Neutral fallback (will retry)'}: Δ${signedDelta}, affinity ${newAffinity}%, path ${turnState.pathRoll}/4, d20 ${turnState.d20Roll}/20${turnState.trackerUpdated ? ', trackers updated' : ''}.`);
    ledger = await saveChatLedger(chatId, ledger);
  } else {
    addLog(ledger, `Reused locked turn state for ${context?.generationType || 'generation'}; affinity and dice unchanged.`);
    ledger = await saveChatLedger(chatId, ledger);
  }

  const signedDelta = turnState.delta >= 0 ? `+${turnState.delta}` : String(turnState.delta);
  const lines = [
    '<control_room_ledger priority="CRITICAL">',
    '[STUDIO CONTROL ROOM // LOCKED PRE-GENERATION RESULT]',
    `Generation type: ${context?.generationType || 'normal'}`,
    `Active preset modules: affinity=${modules.affinity}; continuity=${modules.continuity}; cyoa=${modules.cyoa}; pathfinding=${modules.pathfinding}`,
    `Background pass status: ${turnState.backgroundSucceeded ? 'SUCCESS' : 'FALLBACK — the next regeneration/swipe will retry'}`,
    `Previous affinity: ${turnState.previousAffinity}%`,
    `Evaluated delta: ${signedDelta}%`,
    `Locked affinity: ${turnState.newAffinity}%`,
    `Dynamic subtext: ${ledger.dynamic}`,
    `Immediate episode target: ${ledger.continuity.episodeTarget}`,
    `LOCKED PATHFINDER ROLL: ${turnState.pathRoll}/4. In script_directions, Path ${turnState.pathRoll} is mandatory; ignore and do not perform any other 1d4 path roll.`,
    `LOCKED D20 ACTION CHECK: ${turnState.d20Roll}/20 (${turnState.d20Roll >= 10 ? 'SUCCESS' : 'CHALLENGE'}). Do not reroll it.`
  ];

  if (modules.continuity) {
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
  const modified = [...messages];
  const insertAt = Math.min(Math.max(turn.insertAt, 0), modified.length);
  modified.splice(insertAt, 0, injected);

  sendFrontend({ type: 'control_room:state_data', chatId, ledger }, lastFrontendUserId);
  return {
    messages: modified,
    breakdown: [{ messageIndex: insertAt, name: 'Control Room — Locked Director Pass' }]
  };
}, 10);

spindle.log.info(`Control Room: Two-Pass Director Engine v${ENGINE_VERSION} initialized.`);

