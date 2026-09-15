// dist/backend.js
const MR_TV_SIGNATURE = '<mrtv_studio>';

spindle.registerInterceptor(async (messages) => {
  // 1. Handshake check: Verify the active preset is I Love TV!
  const isMrTvPreset = messages.some(
    (msg) => typeof msg.content === 'string' && msg.content.includes(MR_TV_SIGNATURE)
  );

  if (!isMrTvPreset) {
    return messages; // Pass through untouched if using another preset
  }

  // 2. Pre-roll deterministic Director's Path (1d4) and Action Check (1d20)
  const pathRoll = Math.floor(Math.random() * 4) + 1;
  const d20Roll = Math.floor(Math.random() * 20) + 1;

  const directorRollTag = {
    role: 'system',
    content: `<director_dice_feed>
[CONTROL ROOM PRE-ROLL DISPATCH]
* Narrative Path Roll (1d4): Rolled [${pathRoll}] -> LOCKED. Follow Path ${pathRoll} strictly.
* Action Check (1d20): Rolled [${d20Roll}/20].
* Directive: Do not hallucinate alternative roll values. Build the scene around these pre-rolled outcomes.
</director_dice_feed>`
  };

  // Inject right before the final user message for maximum adherence
  const modified = [...messages];
  const lastIndex = modified.length - 1;
  modified.splice(lastIndex, 0, directorRollTag);

  return modified;
}, 10);
