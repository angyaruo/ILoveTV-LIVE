// Control Room: I Love TV! — Master Backend

const MR_TV_SIGNATURE = '<mrtv_studio>'; // Identifies the I Love TV! preset[cite: 1]

// ─── LEDGER STORAGE HELPERS ──────────────────────────────────────────────────
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
      }
    };
  }
}

async function saveChatLedger(chatId = 'default', data) {
  try {
    await spindle.storage.write(`ledger_${chatId}.json`, JSON.stringify(data, null, 2)); //[cite: 2]
  } catch (err) {
    spindle.log.error('Control Room: Failed to persist state ledger', err);
  }
}

// ─── SCRAPE AI TELEMETRY FROM ASSISTANT OUTPUT ───────────────────────────────
function scrapeAssistantTelemetry(text, ledger) {
  // Scrape affinity meter: [Affinity: X% | Δ(±Y%) | Dynamic: Subtext][cite: 1]
  const affinityMatch = text.match(/\[\s*Affinity:\s*([+-]?\d+)\s*%\s*\|\s*Δ\s*\(\s*([+-]?\d+)\s*%\s*\)\s*\|\s*Dynamic:\s*([^\]]+)\]/i); //[cite: 1]
  if (affinityMatch) {
    ledger.affinity = parseInt(affinityMatch[1], 10);
    ledger.dynamic = affinityMatch[3].trim();
  }

  // Scrape continuity reel[cite: 1]
  const reelMatch = text.match(/<continuity_reel>([\s\S]*?)<\/continuity_reel>/i); //[cite: 1]
  if (reelMatch) {
    const reelContent = reelMatch[1];
    const arc = reelContent.match(/Season Arc:\s*([^\n]+)/i);
    const target = reelContent.match(/Episode Target:\s*([^\n]+)/i);
    if (arc) ledger.continuity.seasonArc = arc[1].trim();
    if (target) ledger.continuity.episodeTarget = target[1].trim();
  }

  return ledger;
}

// ─── FRONTEND IPC EVENT BUS ───────────────────────────────────────────────────
spindle.onFrontendMessage(async (payload, userId) => { //[cite: 2]
  if (!payload) return;

  const chatId = payload.chatId || 'default';

  // Frontend requests active ledger
  if (payload.type === 'control_room:get_ledger') {
    const ledger = await getChatLedger(chatId);
    spindle.sendToFrontend({ type: 'control_room:ledger_data', ledger }, userId);
  }

  // Frontend manually saves modified ledger values from the dashboard modal
  if (payload.type === 'control_room:save_ledger') {
    if (payload.ledger) {
      await saveChatLedger(chatId, payload.ledger);
      spindle.log.info('Control Room: Manual dashboard edit saved to disk.');
      spindle.sendToFrontend({ type: 'control_room:save_success' }, userId);
    }
  }
});

// ─── PROMPT INTERCEPTOR (DICE ROLLER & LEDGER INJECTOR) ───────────────────────
spindle.registerInterceptor(async (messages, context) => { //[cite: 2]
  // 1. Preset handshake: only trigger if the preset is running
  const isMrTv = messages.some(
    (msg) => typeof msg.content === 'string' && msg.content.includes(MR_TV_SIGNATURE)
  );
  if (!isMrTv) return messages;

  const chatId = context?.chatId || 'default';
  let ledger = await getChatLedger(chatId);

  // 2. Keep ledger in sync by scraping the last assistant message if available[cite: 1, 2]
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant') {
      ledger = scrapeAssistantTelemetry(messages[i].content, ledger);
      await saveChatLedger(chatId, ledger);
      break;
    }
  }

  // 3. Deterministic Dice Rolls[cite: 1]
  const pathRoll = Math.floor(Math.random() * 4) + 1;
  const d20Roll = Math.floor(Math.random() * 20) + 1;

  // 4. Inject canonical state directly into context[cite: 1, 2]
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
  modified.splice(insertAt, 0, ledgerTag); //[cite: 2]

  return modified;
}, 10); //[cite: 2]

spindle.log.info('Control Room: State Ledger & Dice Interceptor initialized!');
