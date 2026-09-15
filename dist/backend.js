// Control Room: I Love TV! — Master Backend

// ─── STATE & LEDGER STORAGE ──────────────────────────────────────────────────
async function getChatLedger(chatId = 'default') {
  try {
    const raw = await spindle.storage.read(`ledger_${chatId}.json`); //[cite: 2]
    return JSON.parse(raw);
  } catch {
    return {
      affinity: 0,
      dynamic: 'Neutral Ground',
      continuity: {
        seasonArc: 'A chaotic live broadcast unfolds on set.',
        episodeTarget: 'Keep the stage live without dead air.'
      },
      selectedConnection: '',
      lastActions: [
        `[${new Date().toLocaleTimeString()}] Control Room initialized. Broadcast standby.`
      ]
    };
  }
}

async function saveChatLedger(chatId = 'default', data) {
  try {
    if (data.lastActions && data.lastActions.length > 20) {
      data.lastActions = data.lastActions.slice(-20);
    }
    await spindle.storage.write(`ledger_${chatId}.json`, JSON.stringify(data, null, 2)); //[cite: 2]
  } catch (err) {
    spindle.log.error('Control Room: Failed to persist state ledger', err);
  }
}

function addLog(ledger, message) {
  if (!ledger.lastActions) ledger.lastActions = [];
  ledger.lastActions.push(`[${new Date().toLocaleTimeString()}] ${message}`);
}

// Helper to extract plain text across string or structured message formats
function extractMessageText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map(c => c.text || c.content || '').join(' ');
  }
  return '';
}

// ─── FRONTEND IPC EVENT BUS ───────────────────────────────────────────────────
spindle.onFrontendMessage(async (payload, userId) => { //[cite: 2]
  if (!payload) return;
  const chatId = payload.chatId || 'default';
  let ledger = await getChatLedger(chatId);

  // 1. Initial State & Connection List Fetch[cite: 3]
  if (payload.type === 'control_room:get_state') {
    let connections = [];
    try {
      if (spindle.connections?.list) {
        const rawConns = await spindle.connections.list(userId); //[cite: 3]
        const list = Array.isArray(rawConns) ? rawConns : (rawConns?.data ?? []);
        connections = list.map(c => ({
          id: c.id,
          name: c.name || c.label || c.model || 'Connection Profile'
        }));
      }
    } catch (err) {
      spindle.log.warn('Control Room: Could not list connections', err);
    }

    spindle.sendToFrontend({
      type: 'control_room:state_data',
      ledger,
      connections
    }, userId);
  }

  // 2. Real-Time DOM Telemetry Sync (Frontend -> Backend)
  if (payload.type === 'control_room:sync_telemetry') {
    let changed = false;
    if (typeof payload.affinity === 'number' && ledger.affinity !== payload.affinity) {
      ledger.affinity = payload.affinity;
      changed = true;
    }
    if (payload.dynamic && ledger.dynamic !== payload.dynamic) {
      ledger.dynamic = payload.dynamic;
      changed = true;
    }
    if (changed) {
      addLog(ledger, `Live Sync from Chat: Affinity ${ledger.affinity}% ("${ledger.dynamic}")`);
      await saveChatLedger(chatId, ledger);
      spindle.sendToFrontend({ type: 'control_room:state_data', ledger }, userId);
    }
  }

  // 3. Manual Override Save from Modal Dashboard
  if (payload.type === 'control_room:save_ledger') {
    if (payload.ledger) {
      ledger = { ...ledger, ...payload.ledger };
      addLog(ledger, `Manual Override: Affinity locked at ${ledger.affinity}%`);
      await saveChatLedger(chatId, ledger);
      spindle.sendToFrontend({ type: 'control_room:save_success', ledger }, userId);
    }
  }
});

// ─── PROMPT INTERCEPTOR (DICE ROLLER & LEDGER INJECTOR) ───────────────────────
spindle.registerInterceptor(async (messages, context) => { //[cite: 2]
  const chatId = context?.chatId || 'default';
  let ledger = await getChatLedger(chatId);

  // 1. Roll Deterministic Studio Dice[cite: 1]
  const pathRoll = Math.floor(Math.random() * 4) + 1;
  const d20Roll = Math.floor(Math.random() * 20) + 1;

  addLog(ledger, `⚡ Intercepted Prompt! 🎲 Path: ${pathRoll}/4 | Action D20: ${d20Roll}/20 | Affinity: ${ledger.affinity}%`);
  await saveChatLedger(chatId, ledger);

  // Broadcast the update immediately so the open modal reflects the roll in real time[cite: 2]
  spindle.sendToFrontend({ type: 'control_room:state_data', ledger });

  // 2. Format High-Priority Directive Tag[cite: 1]
  const ledgerTag = {
    role: 'system',
    content: `<control_room_override priority="CRITICAL">
[STUDIO CONTROL ROOM // LIVE TELEMETRY LOCK]
* MANDATORY CO-STAR AFFINITY FOR THIS TURN: ${ledger.affinity}% (Current Dynamic: "${ledger.dynamic}")
* PRE-ROLLED PATHFINDING DICE: Rolled [${pathRoll}/4] -> MANDATE: Execute Narrative Path ${pathRoll} in your thinking/script_directions!
* D20 ACTION CHECK: Rolled [${d20Roll}/20] -> Result: ${d20Roll >= 10 ? 'SUCCESS' : 'CHALLENGE / COMPLICATION'}.
* CONTINUITY DIRECTIVE: Adhere strictly to Season Arc ("${ledger.continuity.seasonArc}").
Directive to Assistant: You MUST output exactly [Affinity: ${ledger.affinity}% | Δ(0%) | Dynamic: "${ledger.dynamic}"] in your broadcast deck telemetry. Do not hallucinate alternative roll values or affinity scores!
</control_room_override>`
  };

  // 3. Inject directly before the final user message for maximum model compliance
  const modified = [...messages];
  let lastUserIdx = -1;
  for (let i = modified.length - 1; i >= 0; i--) {
    if (modified[i].role === 'user') {
      lastUserIdx = i;
      break;
    }
  }

  const insertAt = lastUserIdx !== -1 ? lastUserIdx : modified.length;
  modified.splice(insertAt, 0, ledgerTag); //[cite: 2]

  return modified;
}, 10); //[cite: 2]

spindle.log.info('Control Room: State Ledger & Dice Interceptor initialized!');
