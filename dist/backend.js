// Control Room: I Love TV! — Master Two-Pass Director Engine

let activeUserId = null;

// ─── STATE & LEDGER STORAGE ──────────────────────────────────────────────────
async function getChatLedger(chatId = 'default') {
  try {
    const raw = await spindle.storage.read(`ledger_${chatId}.json`);
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
        `[${new Date().toLocaleTimeString()}] Control Room initialized. Director on standby.`
      ]
    };
  }
}

async function saveChatLedger(chatId = 'default', data) {
  try {
    if (data.lastActions && data.lastActions.length > 20) {
      data.lastActions = data.lastActions.slice(-20);
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
  activeUserId = userId;
  const chatId = payload.chatId || 'default';
  let ledger = await getChatLedger(chatId);

  // 1. Initial State & Connection Profiles Fetch
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

  // 2. Manual Override Save from Modal Dashboard
  if (payload.type === 'control_room:save_ledger') {
    if (payload.ledger) {
      ledger = { ...ledger, ...payload.ledger };
      addLog(ledger, `Manual Override: Affinity locked at ${ledger.affinity}%`);
      await saveChatLedger(chatId, ledger);
      spindle.sendToFrontend({ type: 'control_room:save_success', ledger }, userId);
    }
  }
});

// ─── PASS 1: BACKGROUND LLM ARBITRATION ──────────────────────────────────────
async function runBackgroundDirectorPass(userId, connectionId, userAction, charContext, currentAffinity) {
  try {
    const connections = await spindle.connections.list(userId);
    let targetConn = null;
    if (connectionId) {
      targetConn = connections?.find(c => c.id === connectionId);
    }
    if (!targetConn) {
      targetConn = connections?.find(c => c.is_default) ?? connections?.[0];
    }

    if (!targetConn) {
      throw new Error('No connection profile available for background pass.');
    }

    const evalPrompt = `You are the behind-the-scenes TV Showrunner and dramatic judge.
Current Co-Star Affinity: ${currentAffinity}% (-100% to +100%)
Recent Context:
${charContext.slice(-600)}

Latest User Action:
"${userAction || '(User maintained scene momentum)'}"

Evaluate the impact of the user's action on the character.
Respond ONLY with a valid JSON object in this exact format, with no markdown code blocks or extra text:
{"delta": 0, "dynamic": "concise description of character reaction", "target": "immediate scene goal"}
Note: "delta" must be an integer between -3 and +3.`;

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Background pass timed out')), 5000)
    );

    const genPromise = spindle.generate.quiet({
      type: 'quiet',
      userId,
      connection_id: targetConn.id,
      messages: [{ role: 'user', content: evalPrompt }],
      parameters: { max_tokens: 180, temperature: 0.3 },
      reasoning: { source: 'off' }
    });

    const result = await Promise.race([genPromise, timeoutPromise]);
    let raw = (result?.content ?? '').trim();
    raw = raw.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
    const match = raw.match(/\{[\s\S]*?\}/);

    if (match) {
      const parsed = JSON.parse(match[0]);
      return {
        delta: typeof parsed.delta === 'number' ? Math.max(-5, Math.min(5, parsed.delta)) : 0,
        dynamic: parsed.dynamic || 'Tension lingers on set.',
        target: parsed.target || 'Resolve the ongoing interaction.'
      };
    }
  } catch (err) {
    spindle.log.warn('Control Room: Background pass failed or timed out, falling back to neutral:', err?.message);
  }

  return { delta: 0, dynamic: 'Scene continues under live lights.', target: 'Maintain stage presence.' };
}

// ─── PASS 2: PROMPT INTERCEPTOR & LEDGER INJECTION ───────────────────────────
spindle.registerInterceptor(async (messages, context) => {
  const chatId = context?.chatId || 'default';
  const userId = context?.userId || activeUserId || 'default';
  let ledger = await getChatLedger(chatId);

  // 1. Extract last user input and preceding assistant beat for background context
  let lastUserText = '';
  let precedingBeat = '';
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user' && !lastUserText) {
      lastUserText = typeof messages[i].content === 'string' 
        ? messages[i].content 
        : JSON.stringify(messages[i].content);
    } else if (messages[i].role === 'assistant' && !precedingBeat) {
      precedingBeat = typeof messages[i].content === 'string'
        ? messages[i].content
        : JSON.stringify(messages[i].content);
    }
    if (lastUserText && precedingBeat) break;
  }

  // 2. Execute Pass 1: Background evaluation call via quiet generation
  const previousAffinity = ledger.affinity;
  const evaluation = await runBackgroundDirectorPass(
    userId,
    ledger.selectedConnection,
    lastUserText,
    precedingBeat,
    previousAffinity
  );

  // 3. Compute canonical arithmetic in JS (clamped between -100% and +100%)
  const newAffinity = Math.max(-100, Math.min(100, previousAffinity + evaluation.delta));
  ledger.affinity = newAffinity;
  ledger.dynamic = evaluation.dynamic;
  if (evaluation.target) {
    ledger.continuity.episodeTarget = evaluation.target;
  }

  // 4. Deterministic Studio Dice Rolls
  const pathRoll = Math.floor(Math.random() * 4) + 1;
  const d20Roll = Math.floor(Math.random() * 20) + 1;
  const deltaStr = evaluation.delta >= 0 ? `+${evaluation.delta}` : `${evaluation.delta}`;

  addLog(
    ledger,
    `⚡ Pass Complete! Δ(${deltaStr}%) -> Affinity: ${newAffinity}% | Path [${pathRoll}/4] | D20 [${d20Roll}/20]`
  );
  await saveChatLedger(chatId, ledger);

  // Push real-time update to the frontend modal
  spindle.sendToFrontend({ type: 'control_room:state_data', ledger }, userId);

  // 5. Inject the calculated ground truth into the main prompt
  const ledgerTag = {
    role: 'system',
    content: `<control_room_ledger priority="CRITICAL">
[STUDIO CONTROL ROOM // LIVE DIRECTOR EVALUATION]
* PREVIOUS AFFINITY: ${previousAffinity}%
* EVALUATED DELTA: ${deltaStr}%
* NEW TOTAL AFFINITY: ${newAffinity}% (Dynamic Tone: "${ledger.dynamic}")
* IMMEDIATE EPISODE TARGET: ${ledger.continuity.episodeTarget}
* PRE-ROLLED PATHFINDER: [${pathRoll}/4] -> MANDATE: Follow Path ${pathRoll} in your thinking block.
* D20 ACTION CHECK: Rolled [${d20Roll}/20] -> Result: ${d20Roll >= 10 ? 'SUCCESS' : 'CHALLENGE'}.

BROADCAST DIRECTIVE TO ASSISTANT:
1. Ground character behavior in the new affinity score (${newAffinity}%).
2. You MUST output this exact tag at the end of your response:
[Affinity: ${newAffinity}% | Δ(${deltaStr}%) | Dynamic: "${ledger.dynamic}"]
Do not alter these values or calculate alternative math.
</control_room_ledger>`
  };

  const modified = [...messages];
  let lastUserIdx = -1;
  for (let i = modified.length - 1; i >= 0; i--) {
    if (modified[i].role === 'user') {
      lastUserIdx = i;
      break;
    }
  }

  const insertAt = lastUserIdx !== -1 ? lastUserIdx : modified.length;
  modified.splice(insertAt, 0, ledgerTag);

  return modified;
}, 10);

spindle.log.info('Control Room: Two-Pass Director Engine Initialized!');
