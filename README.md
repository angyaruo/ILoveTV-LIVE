# I Love TV! Suite

A self-contained Lumiverse Spindle roleplay suite. Version 2 bundles the I Love TV! prompt package, assembles it independently of the active Lumiverse preset, and combines it with the Control Room director, affinity, continuity memory, locked checks, CYOA writing, RPG mode, and an AI prompt workshop.

## Suite workspace

Open the television icon in Lumiverse's input bar. The workspace includes:

- **Broadcast** — current affinity, delta, locked D4/D20 checks, relationship analysis, episode target, and season arc.
- **Preset** — one-click bundled preset version selection. v3.5 is included; the registry is ready for additional versions.
- **Blocks** — search all 84 bundled blocks, enable/disable them, edit their source, reset to the bundled copy, or ask the selected background model to produce a rewrite draft.
- **Director** — choose the background connection, set tracker cadence, add an author's note, and inspect telemetry.
- **Memory** — the suite's running story summary, core memories, consequential flags, and predicted branches.
- **Tools** — clickable CYOA choices and optional RPG tracking.

The former floating widget has been removed. CYOA choices now live in the input-bar workspace and can either insert their number or ask the selected model to write an editable `{{user}}` draft into the composer.

## How preset ownership works

The bundled source is stored in `presets/i-love-tv-v3.5.json` and compiled to `dist/preset-versions.js` by `node scripts/build-preset-module.cjs`. Before each visible response, the extension asks Lumiverse to assemble the selected version's blocks. This preserves native macros, block positions, variables, character/persona data, and chat history while removing the external-preset prerequisite.

Edits and toggles are stored per Lumiverse user. Chat narrative state remains isolated per chat. If suite assembly ever fails, generation falls back to the host prompt and records that status in Prompt Breakdown.

## Install / update

Install this repository from Lumiverse's Extensions panel. After updating, disable/re-enable the extension or restart Lumiverse so both bundles reload.

Required permissions: `generation`, `interceptor`, `chats`, and `ui_panels`.

## Verification

```text
node --check dist/backend.js
node --check dist/frontend.js
node test-backend.cjs
node test-retry.cjs
```

