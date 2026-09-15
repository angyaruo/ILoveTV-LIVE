// Control Room: I Love TV! — Master Backend

const MR_TV_SIGNATURE = '<mrtv_studio>';  

// ─── STATE & LEDGER STORAGE ──────────────────────────────────────────────────
async function getChatLedger(chatId = 'default') {
  try {
    const raw = await spindle.storage.read(`ledger_${chatId}.json`); //
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
        `[${new Date().toLocaleTimeString()}] Control Room initialized. Waiting for broadcast...`
      ]
    };
  }
}

async function saveChatLedger(chatId = 'default', data) {
  try {
    // Keep only the last 15 log entries to prevent file bloat
    if (data.lastActions && data.lastActions.length > 15) {
      data.lastActions = data.lastActions.slice(-15);
    }
    await spindle.storage.write(`ledger_${chatId}.json`, JSON.stringify(data, null, 2));  
  } catch (err) {
    spindle.log.error('Control Room: Failed to persist state ledger', err);
  }
}

function addLog(ledger, message) {
  if (!ledger.lastActions) ledger.lastActions = [];
  ledger.lastActions.push(`[${new Date().toLocaleTimeString()}] ${message}`);
}

// ─── FRONTEND IPC EVENT BUS ───────────────────────────────────────────────────
spindle.onFrontendMessage(async (payload, userId) => {  
  if (!payload) return;
  const chatId = payload.chatId || 'default';
  let ledger = await getChatLedger(chatId);

  // 1. Initial State & Connection Fetch[cite: 3]
  if (payload.type === 'control_room:get_state') {
    let connections = [];
    try {
      if (spindle.connections?.list) {
        const rawConns = await spindle.connections.list(userId);  
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

  // 3. Manual Save from Modal Dashboard
  if (payload.type === 'control_room:save_ledger') {
    if (payload.ledger) {
      ledger = { ...ledger, ...payload.ledger };
      addLog(ledger, `Manual Override: Affinity set to ${ledger.affinity}%`);
      await saveChatLedger(chatId, ledger);
      spindle.sendToFrontend({ type: 'control_room:save_success', ledger }, userId);
    }
  }
});

// ─── PROMPT INTERCEPTOR (DICE & LEDGER INJECTION) ─────────────────────────────
spindle.registerInterceptor(async (messages, context) => {  
  const isMrTv = messages.some(
    (msg) => typeof msg.content === 'string' && msg.content.includes(MR_TV_SIGNATURE)
  );  
  if (!isMrTv) return messages;

  const chatId = context?.chatId || 'default';
  let ledger = await getChatLedger(chatId);

  // Deterministic dice rolls[cite: 1]
  const pathRoll = Math.floor(Math.random() * 4) + 1;
  const d20Roll = Math.floor(Math.random() * 20) + 1;

  addLog(ledger, `Interception: 🎲 Rolled Path ${pathRoll}/4 | Check: ${d20Roll}/20`);
  await saveChatLedger(chatId, ledger);

  const ledgerTag = {
    role: 'system',
    content: `<control_room_ledger>
[CANONICAL STATE LEDGER // LOCKED ON DISK]
* Co-Star Affinity: ${ledger.affinity}% | Dynamic: "${ledger.dynamic}"
* Season Arc: ${ledger.continuity.seasonArc}
* Scene Objective: ${ledger.continuity.episodeTarget}
* Pre-Rolled Path (1d4): [${pathRoll}] -> MANDATE: Execute Narrative Path ${pathRoll}.
* Action Check (1d20): Rolled [${d20Roll}/20].
Directive: Build upon these locked values. Do not retcon or hallucinate alternative numbers.
</control_room_ledger>`
  };  

  const modified = [...messages];
  const lastUserIdx = modified.map((m) => m.role).lastIndexOf('user');
  const insertAt = lastUserIdx !== -1 ? lastUserIdx : modified.length;
  modified.splice(insertAt, 0, ledgerTag);  

  return modified;
}, 10);  

spindle.log.info('Control Room: State Ledger & Dice Interceptor initialized!');
