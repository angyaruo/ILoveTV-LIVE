// I Love TV! Suite — versioned preset, director, memory, and tools

import { PRESET_VERSIONS } from './preset-versions.js';

const ENGINE_VERSION = '2.1.2';
const DIRECTOR_TIMEOUT_MS = 90000;
const CHOICE_TIMEOUT_MS = 120000;
const MAX_LOG_ENTRIES = 30;
const MAX_IMPORTED_BLOCK_CONTENT = 50000;
const MAX_IMPORTED_VERSIONS = 20;
const missingAntiSlopWarnings = new Set();
const STALE_SCRIPT_DIRECTIONS_RE = /<script_directions[^>]*>[\s\S]*?<\/script_directions>/g;
const BUNDLED_DISPLAY_SCRIPTS = [
  {
    "name": "🪻 | Tab Menu",
    "find_regex": "<\\s*broadcast_deck\\b[^>]*>(?=(?:(?:(?!<\\s*\\/\\s*broadcast_deck\\s*>)[\\s\\S])*?<\\s*cyoa_choices\\s*>[\\s\\r\\n]*(?:🎬\\s*)?([^\\r\\n]+?)[\\s\\r\\n]+(?:\\*\\s*)?\\[?1\\]?[\\s.:)]+(?:\\[\\s*)?([^\\]\\r\\n]+)(?:\\s*\\])?\\s*[\\r\\n]+(?:\\*\\s*)?\\[?2\\]?[\\s.:)]+(?:\\[\\s*)?([^\\]\\r\\n]+)(?:\\s*\\])?\\s*[\\r\\n]+(?:\\*\\s*)?\\[?3\\]?[\\s.:)]+(?:\\[\\s*)?([^\\]\\r\\n]+)(?:\\s*\\])?\\s*[\\r\\n]+(?:\\*\\s*)?\\[?4\\]?[\\s.:)]+(?:\\[\\s*)?([^\\]\\r\\n]+)(?:\\s*\\])?\\s*[\\r\\n]+(?:\\*\\s*)?\\[?5\\]?[\\s.:)]+(?:\\[\\s*)?([^\\]\\r\\n]+)(?:\\s*\\])?\\s*[\\r\\n]*<\\s*\\/\\s*cyoa_choices\\s*>|))(?=(?:(?:(?!<\\s*\\/\\s*broadcast_deck\\s*>)[\\s\\S])*?<\\s*directors_booth\\s*>([\\s\\S]*?)<\\s*\\/\\s*directors_booth\\s*>|))(?=(?:(?:(?!<\\s*\\/\\s*broadcast_deck\\s*>)[\\s\\S])*?<\\s*kazz_commentary\\s*>([\\s\\S]*?)<\\s*\\/\\s*kazz_commentary\\s*>|))(?=(?:(?:(?!<\\s*\\/\\s*broadcast_deck\\s*>)[\\s\\S])*?\\[\\s*Affinity:\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*%?\\s*\\|\\s*Δ\\s*\\(\\s*([+-]?\\d+(?:\\.\\d+)?)\\s*%?\\s*\\)\\s*\\|\\s*Dynamic:\\s*(.*?)\\s*\\]|))(?=(?:(?:(?!<\\s*\\/\\s*broadcast_deck\\s*>)[\\s\\S])*?<\\s*continuity_reel\\s*>([\\s\\S]*?)<\\s*\\/\\s*continuity_reel\\s*>|))[\\s\\S]*?<\\s*\\/\\s*broadcast_deck\\s*>",
    "replace_string": "<style>\n/* =========================================================\n   LUMIVERSE PURPLE MULTI-DECK // ART DECO ICON SWITCHBOARD\n   ========================================================= */\n\ndiv.lumi-native-deck {\n  max-width: 520px;\n  width: 100%;\n  margin: 16px auto 10px auto;\n  background: var(--lumiverse-fill-strong, #16161e);\n  border: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.1));\n  border-radius: var(--lcs-radius-sm, 14px);\n  padding: 12px 14px;\n  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.55), 0 0 16px color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 10%, transparent);\n  box-sizing: border-box;\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n  font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, sans-serif;\n  transition: border-color var(--lumiverse-transition-fast, 150ms ease);\n}\n\ndiv.lumi-native-deck:hover {\n  border-color: var(--lumiverse-primary-040, rgba(140, 130, 255, 0.35));\n}\n\n/* 1. AUTO-CLOAK EMPTY TABS & PANELS */\n.lumi-native-deck:has(.lumi-detect-cyoa:empty) .tab-btn-cyoa,\n.lumi-native-deck:has(.lumi-detect-cyoa:empty) .panel-cyoa { display: none !important; }\n\n.lumi-native-deck:has(.lumi-detect-booth:empty) .tab-btn-booth,\n.lumi-native-deck:has(.lumi-detect-booth:empty) .panel-booth { display: none !important; }\n\n.lumi-native-deck:has(.lumi-detect-kazz:empty) .tab-btn-kazz,\n.lumi-native-deck:has(.lumi-detect-kazz:empty) .panel-kazz { display: none !important; }\n\n.lumi-native-deck:has(.lumi-detect-chem:empty) .tab-btn-chem,\n.lumi-native-deck:has(.lumi-detect-chem:empty) .panel-chem { display: none !important; }\n\n.lumi-native-deck:has(.lumi-detect-reel:empty) .tab-btn-reel,\n.lumi-native-deck:has(.lumi-detect-reel:empty) .panel-reel { display: none !important; }\n\n/* 2. AUTO-CLOAK FULL DECK IF ALL MODULES ARE INACTIVE */\n.lumi-native-deck:has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:empty):has(.lumi-detect-kazz:empty):has(.lumi-detect-chem:empty):has(.lumi-detect-reel:empty) {\n  display: none !important;\n}\n\n/* 3. DYNAMIC LANDING WATERFALL (NO INITIAL RADIO CHECKED) */\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:not(:empty)) .panel-cyoa { display: block !important; }\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:not(:empty)) .tab-btn-cyoa {\n  background: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 24%, rgba(255, 255, 255, 0.04)) !important;\n  border-color: var(--lumiverse-primary, #8c82ff) !important;\n  box-shadow: 0 0 12px color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 35%, transparent);\n}\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:not(:empty)) .tab-btn-cyoa .lumi-tab-art {\n  filter: drop-shadow(0 0 6px rgba(255, 220, 140, 0.8)) brightness(1.25);\n  transform: scale(1.05);\n  opacity: 1;\n}\n\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:not(:empty)) .panel-booth { display: block !important; }\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:not(:empty)) .tab-btn-booth {\n  background: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 24%, rgba(255, 255, 255, 0.04)) !important;\n  border-color: var(--lumiverse-primary, #8c82ff) !important;\n  box-shadow: 0 0 12px color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 35%, transparent);\n}\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:not(:empty)) .tab-btn-booth .lumi-tab-art {\n  filter: drop-shadow(0 0 6px rgba(255, 220, 140, 0.8)) brightness(1.25);\n  transform: scale(1.05);\n  opacity: 1;\n}\n\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:empty):has(.lumi-detect-kazz:not(:empty)) .panel-kazz { display: block !important; }\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:empty):has(.lumi-detect-kazz:not(:empty)) .tab-btn-kazz {\n  background: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 24%, rgba(255, 255, 255, 0.04)) !important;\n  border-color: var(--lumiverse-primary, #8c82ff) !important;\n  box-shadow: 0 0 12px color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 35%, transparent);\n}\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:empty):has(.lumi-detect-kazz:not(:empty)) .tab-btn-kazz .lumi-tab-art {\n  filter: drop-shadow(0 0 6px rgba(255, 220, 140, 0.8)) brightness(1.25);\n  transform: scale(1.05);\n  opacity: 1;\n}\n\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:empty):has(.lumi-detect-kazz:empty):has(.lumi-detect-chem:not(:empty)) .panel-chem { display: block !important; }\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:empty):has(.lumi-detect-kazz:empty):has(.lumi-detect-chem:not(:empty)) .tab-btn-chem {\n  background: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 24%, rgba(255, 255, 255, 0.04)) !important;\n  border-color: var(--lumiverse-primary, #8c82ff) !important;\n  box-shadow: 0 0 12px color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 35%, transparent);\n}\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:empty):has(.lumi-detect-kazz:empty):has(.lumi-detect-chem:not(:empty)) .tab-btn-chem .lumi-tab-art {\n  filter: drop-shadow(0 0 6px rgba(255, 220, 140, 0.8)) brightness(1.25);\n  transform: scale(1.05);\n  opacity: 1;\n}\n\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:empty):has(.lumi-detect-kazz:empty):has(.lumi-detect-chem:empty):has(.lumi-detect-reel:not(:empty)) .panel-reel { display: block !important; }\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:empty):has(.lumi-detect-kazz:empty):has(.lumi-detect-chem:empty):has(.lumi-detect-reel:not(:empty)) .tab-btn-reel {\n  background: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 24%, rgba(255, 255, 255, 0.04)) !important;\n  border-color: var(--lumiverse-primary, #8c82ff) !important;\n  box-shadow: 0 0 12px color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 35%, transparent);\n}\n.lumi-native-deck:not(:has(input:checked)):has(.lumi-detect-cyoa:empty):has(.lumi-detect-booth:empty):has(.lumi-detect-kazz:empty):has(.lumi-detect-chem:empty):has(.lumi-detect-reel:not(:empty)) .tab-btn-reel .lumi-tab-art {\n  filter: drop-shadow(0 0 6px rgba(255, 220, 140, 0.8)) brightness(1.25);\n  transform: scale(1.05);\n  opacity: 1;\n}\n\n/* 4. USER SELECTION INTERACTION */\n.lumi-tab-btn:has(input:checked) {\n  background: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 24%, rgba(255, 255, 255, 0.04)) !important;\n  border-color: var(--lumiverse-primary, #8c82ff) !important;\n  box-shadow: 0 0 12px color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 35%, transparent);\n}\n.lumi-tab-btn:has(input:checked) .lumi-tab-art {\n  filter: drop-shadow(0 0 6px rgba(255, 220, 140, 0.8)) brightness(1.25);\n  transform: scale(1.05);\n  opacity: 1;\n}\n\n.lumi-native-deck:has(input[value=\"cyoa\"]:checked) .panel-cyoa { display: block !important; }\n.lumi-native-deck:has(input[value=\"booth\"]:checked) .panel-booth { display: block !important; }\n.lumi-native-deck:has(input[value=\"kazz\"]:checked) .panel-kazz { display: block !important; }\n.lumi-native-deck:has(input[value=\"chem\"]:checked) .panel-chem { display: block !important; }\n.lumi-native-deck:has(input[value=\"reel\"]:checked) .panel-reel { display: block !important; }\n\n/* Navigation Tab Strip */\n.lumi-nav-strip {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n  gap: 10px;\n  border-bottom: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.08));\n  padding-bottom: 10px;\n  overflow-x: auto;\n  scrollbar-width: none;\n}\n.lumi-nav-strip::-webkit-scrollbar {\n  display: none;\n}\n\n/* Square Icon Macro Pads */\n.lumi-tab-btn {\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  padding: 6px;\n  aspect-ratio: 1 / 1;\n  min-height: calc(62px * var(--lumiverse-font-scale, 1));\n  max-width: calc(68px * var(--lumiverse-font-scale, 1));\n  width: 100%;\n  flex: 1 1 0;\n  background: var(--lumiverse-fill-subtle, rgba(255, 255, 255, 0.03));\n  border: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.08));\n  border-radius: var(--lcs-radius-xs, 10px);\n  cursor: pointer;\n  user-select: none;\n  transition: all 0.2s ease;\n  box-sizing: border-box;\n}\n.lumi-tab-btn input[type=\"radio\"] {\n  display: none !important;\n}\n.lumi-tab-btn:hover {\n  background: rgba(255, 255, 255, 0.07);\n  border-color: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 40%, transparent);\n}\n.lumi-tab-btn:hover .lumi-tab-art {\n  opacity: 1;\n  filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.6)) brightness(1.15);\n  transform: translateY(-1px);\n}\n\n/* Enlarged Responsive Icon Sizing */\n.lumi-tab-art {\n  height: calc(48px * var(--lumiverse-font-scale, 1));\n  width: auto;\n  max-width: 92%;\n  max-height: 92%;\n  object-fit: contain;\n  pointer-events: none;\n  opacity: 0.78;\n  transition: transform 0.2s ease, filter 0.2s ease, opacity 0.2s ease;\n}\n\n/* Panels Base Layout */\n.lumi-deck-panel {\n  display: none;\n  animation: lumi-panel-fade 0.2s ease forwards;\n}\n@keyframes lumi-panel-fade {\n  from { opacity: 0; transform: translateY(2px); }\n  to { opacity: 1; transform: translateY(0); }\n}\n\n.lumi-inset-card {\n  background: var(--lumiverse-fill-subtle, rgba(255, 255, 255, 0.02));\n  border: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.06));\n  border-radius: var(--lcs-radius-xs, 8px);\n  padding: 10px 12px;\n  box-sizing: border-box;\n}\n\n.lumi-head-strip {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  border-bottom: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.08));\n  padding-bottom: 5px;\n  margin-bottom: 8px;\n}\n.lumi-head-title {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n  font-size: calc(11px * var(--lumiverse-font-scale, 1));\n  font-weight: 700;\n  color: var(--lumiverse-primary, #8c82ff) !important;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n}\n.lumi-dot-indicator {\n  width: 6px;\n  height: 6px;\n  border-radius: 50%;\n  background: var(--lumiverse-primary, #8c82ff);\n  box-shadow: 0 0 6px var(--lumiverse-primary, #8c82ff);\n  display: inline-block;\n}\n.lumi-status-badge {\n  font-size: calc(9px * var(--lumiverse-font-scale, 1));\n  font-weight: 700;\n  background: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 14%, transparent);\n  border: 1px solid color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 32%, transparent);\n  color: var(--lumiverse-primary-text, #8c82ff) !important;\n  padding: 1px 6px;\n  border-radius: var(--lcs-radius-xs, 4px);\n  letter-spacing: 0.04em;\n}\n\n/* CYOA Stack Rows */\n.lumi-cyoa-row {\n  display: flex;\n  align-items: center;\n  gap: 9px;\n  background: var(--lumiverse-fill-subtle, rgba(255, 255, 255, 0.02));\n  border: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.06));\n  border-left: 3px solid var(--lumiverse-primary, #8c82ff);\n  border-radius: var(--lcs-radius-xs, 4px);\n  padding: 6px 9px;\n  margin-bottom: 5px;\n  transition: background 0.15s ease, border-color 0.15s ease;\n}\n.lumi-cyoa-row:hover {\n  background: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 8%, transparent);\n  border-color: var(--lumiverse-primary-020, rgba(140, 130, 255, 0.2));\n}\n.lumi-cyoa-row.custom {\n  border-style: dashed;\n  border-left-style: solid;\n}\n.lumi-cyoa-num {\n  font-family: \"SF Mono\", \"Fira Code\", Consolas, monospace;\n  font-size: calc(10px * var(--lumiverse-font-scale, 1));\n  font-weight: 700;\n  background: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 16%, transparent);\n  color: var(--lumiverse-primary, #8c82ff) !important;\n  padding: 1px 5px;\n  border-radius: 3px;\n  flex-shrink: 0;\n}\n.lumi-cyoa-row.custom .lumi-cyoa-num {\n  background: rgba(255, 255, 255, 0.08);\n  color: var(--lumiverse-text, #e2e8f0) !important;\n}\n.lumi-cyoa-text {\n  font-size: calc(11.5px * var(--lumiverse-font-scale, 1)) !important;\n  line-height: 1.4 !important;\n  color: var(--lumiverse-text, #e2e8f0) !important;\n}\n\n/* Monospace Prose Body Handling */\n.lumi-mono-text, .lumi-mono-text *, .lumi-mono-text p, .lumi-mono-text span {\n  font-family: \"SF Mono\", \"Fira Code\", Consolas, monospace !important;\n  font-size: calc(11.5px * var(--lumiverse-font-scale, 1)) !important;\n  line-height: 1.5 !important;\n  color: var(--lumiverse-text, #e2e8f0) !important;\n  text-shadow: none !important;\n}\n\n/* VU Meter Inset */\n.lumi-vu-track {\n  position: relative;\n  width: 100%;\n  height: 10px;\n  background: rgba(255, 255, 255, 0.04);\n  border: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.08));\n  border-radius: 999px;\n  margin: 6px 0 2px 0;\n  box-sizing: border-box;\n}\n.lumi-vu-centerline {\n  position: absolute;\n  top: -2px;\n  bottom: -2px;\n  left: 50%;\n  width: 2px;\n  background: var(--lumiverse-primary, #8c82ff);\n  opacity: 0.6;\n  transform: translateX(-50%);\n  z-index: 2;\n}\n.lumi-vu-needle {\n  position: absolute;\n  top: 50%;\n  width: 12px;\n  height: 12px;\n  border-radius: 50%;\n  background: #ffffff;\n  border: 2px solid var(--lumiverse-primary, #8c82ff);\n  box-shadow: 0 0 8px var(--lumiverse-primary, #8c82ff);\n  transform: translate(-50%, -50%);\n  z-index: 3;\n  left: calc(50% + (var(--curr) * 0.5%));\n}\n</style>\n\n<div class=\"lumi-native-deck\">\n  <!-- Hidden Detection Anchors (Used by CSS :empty) -->\n  <span class=\"lumi-detect-cyoa\" style=\"display:none;\">$2</span>\n  <span class=\"lumi-detect-booth\" style=\"display:none;\">$7</span>\n  <span class=\"lumi-detect-kazz\" style=\"display:none;\">$8</span>\n  <span class=\"lumi-detect-chem\" style=\"display:none;\">$9</span>\n  <span class=\"lumi-detect-reel\" style=\"display:none;\">$12</span>\n\n  <!-- Navigation Icon Switchboard -->\n  <nav class=\"lumi-nav-strip\">\n    <label class=\"lumi-tab-btn tab-btn-cyoa\" title=\"Moves // CYOA Choices\">\n      <input type=\"radio\" name=\"lumi_deck_tab\" value=\"cyoa\">\n      <img src=\"https://files.catbox.moe/cr4ni3.png\" class=\"lumi-tab-art\" alt=\"Moves\" />\n    </label>\n    <label class=\"lumi-tab-btn tab-btn-booth\" title=\"Director's Booth Commentary\">\n      <input type=\"radio\" name=\"lumi_deck_tab\" value=\"booth\">\n      <img src=\"https://files.catbox.moe/fbo4ea.png\" class=\"lumi-tab-art\" alt=\"Booth\" />\n    </label>\n    <label class=\"lumi-tab-btn tab-btn-kazz\" title=\"Kazz Commentary // Wire Feed\">\n      <input type=\"radio\" name=\"lumi_deck_tab\" value=\"kazz\">\n      <img src=\"https://files.catbox.moe/ad7af0.png\" class=\"lumi-tab-art\" alt=\"Commentary\" />\n    </label>\n    <label class=\"lumi-tab-btn tab-btn-chem\" title=\"Co-Star Affinity // VU Meter\">\n      <input type=\"radio\" name=\"lumi_deck_tab\" value=\"chem\">\n      <img src=\"https://files.catbox.moe/y6vryg.png\" class=\"lumi-tab-art\" alt=\"Affinity\" />\n    </label>\n    <label class=\"lumi-tab-btn tab-btn-reel\" title=\"Continuity Archive Reel\">\n      <input type=\"radio\" name=\"lumi_deck_tab\" value=\"reel\">\n      <img src=\"https://files.catbox.moe/maqknh.png\" class=\"lumi-tab-art\" alt=\"Reel\" />\n    </label>\n  </nav>\n\n  <!-- Content Deck Panels -->\n  <div class=\"lumi-panels-container\">\n    <!-- Panel 1: CYOA Decisions -->\n    <div class=\"lumi-deck-panel panel-cyoa\">\n      <div class=\"lumi-inset-card\">\n        <div class=\"lumi-head-strip\">\n          <div class=\"lumi-head-title\">\n            <span class=\"lumi-dot-indicator\"></span>\n            <span>$1</span>\n          </div>\n          <span class=\"lumi-status-badge\">DIRECTOR'S CUT</span>\n        </div>\n        <div class=\"lumi-cyoa-row\"><span class=\"lumi-cyoa-num\">01</span><span class=\"lumi-cyoa-text\">$2</span></div>\n        <div class=\"lumi-cyoa-row\"><span class=\"lumi-cyoa-num\">02</span><span class=\"lumi-cyoa-text\">$3</span></div>\n        <div class=\"lumi-cyoa-row\"><span class=\"lumi-cyoa-num\">03</span><span class=\"lumi-cyoa-text\">$4</span></div>\n        <div class=\"lumi-cyoa-row\"><span class=\"lumi-cyoa-num\">04</span><span class=\"lumi-cyoa-text\">$5</span></div>\n        <div class=\"lumi-cyoa-row custom\"><span class=\"lumi-cyoa-num\">05</span><span class=\"lumi-cyoa-text\">$6</span></div>\n        <div style=\"display: flex; justify-content: space-between; border-top: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.08)); padding-top: 6px; margin-top: 6px; font-size: calc(9.5px * var(--lumiverse-font-scale, 1)); color: var(--lumiverse-text-dim, #888899);\">\n          <span style=\"font-family: monospace; letter-spacing: 0.04em;\">// DIRECTIVE: ENTER [1-5] OR TYPE FREE INPUT</span>\n          <span>READY</span>\n        </div>\n      </div>\n    </div>\n\n    <!-- Panel 2: Director's Booth -->\n    <div class=\"lumi-deck-panel panel-booth\">\n      <div class=\"lumi-inset-card lumi-mono-text\" style=\"position: relative; padding-left: 56px;\">\n        <img src=\"https://files.catbox.moe/pypon9.png\" style=\"position: absolute; bottom: -4px; left: -10px; width: 60px; height: auto; z-index: 5; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.5)); pointer-events: none;\" alt=\"Mr. TV\" />\n        <div class=\"lumi-head-strip\">\n          <span class=\"lumi-head-title\">DIRECTOR'S BOOTH COMMENTARY</span>\n          <span class=\"lumi-status-badge\">APPROVED</span>\n        </div>\n        <div>$7</div>\n      </div>\n    </div>\n\n    <!-- Panel 3: Kazz Commentary -->\n    <div class=\"lumi-deck-panel panel-kazz\">\n      <div class=\"lumi-inset-card\">\n        <div class=\"lumi-head-strip\">\n          <span class=\"lumi-head-title\">@kazz_the_spazz // UNCENSORED WIRE</span>\n          <span class=\"lumi-status-badge\">LIVE FEED</span>\n        </div>\n        <div style=\"background: var(--lumiverse-fill-subtle, rgba(255, 255, 255, 0.02)); border: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.06)); border-left: 3px solid var(--lumiverse-primary, #8c82ff); border-radius: var(--lcs-radius-xs, 4px); padding: 8px 10px; font-family: 'SF Mono', 'Fira Code', monospace; font-size: calc(11.5px * var(--lumiverse-font-scale, 1)); line-height: 1.45; color: var(--lumiverse-text, #e2e8f0);\">\n          $8\n        </div>\n        <div style=\"display: flex; justify-content: space-between; align-items: center; margin-top: 6px; font-size: calc(9.5px * var(--lumiverse-font-scale, 1));\">\n          <span style=\"background: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 14%, transparent); border: 1px solid color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 32%, transparent); color: var(--lumiverse-primary-text, #8c82ff); padding: 1px 6px; border-radius: 4px; font-weight: 700;\">▲ 69 CLAPS</span>\n          <span style=\"font-family: monospace; color: var(--lumiverse-text-dim, #888899);\">frequenza_del_cuore.log</span>\n        </div>\n      </div>\n    </div>\n\n    <!-- Panel 4: Co-Star VU Meter -->\n    <div class=\"lumi-deck-panel panel-chem\">\n      <div class=\"lumi-inset-card\" style=\"display: flex; flex-direction: column; gap: 7px; --curr: $9; --delta: $10;\">\n        <div style=\"display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.08)); padding-bottom: 5px;\">\n          <span style=\"font-size: calc(11px * var(--lumiverse-font-scale, 1)); font-weight: 700; color: var(--lumiverse-primary, #8c82ff); text-transform: uppercase;\">CO-STAR AFFINITY DISPOSITION</span>\n          <span style=\"font-size: calc(11px * var(--lumiverse-font-scale, 1)); font-weight: 700; color: var(--lumiverse-primary-text, #8c82ff); font-family: monospace;\">$9% (Δ $10%)</span>\n        </div>\n        <div class=\"lumi-vu-track\">\n          <div class=\"lumi-vu-centerline\"></div>\n          <div class=\"lumi-vu-needle\"></div>\n        </div>\n        <div style=\"display: flex; justify-content: space-between; font-size: calc(8.5px * var(--lumiverse-font-scale, 1)); color: var(--lumiverse-text-dim, #888899); font-family: monospace;\">\n          <span>-100% DISCORD</span><span>0% NEUTRAL</span><span>+100% RAPPORT</span>\n        </div>\n        <div style=\"background: var(--lumiverse-fill-subtle, rgba(255, 255, 255, 0.03)); border-left: 3px solid var(--lumiverse-primary, #8c82ff); border-radius: 4px; padding: 6px 9px; font-size: calc(11.5px * var(--lumiverse-font-scale, 1)); color: var(--lumiverse-text, #e2e8f0); font-style: italic; margin-top: 3px;\">\n          \"$11\"\n        </div>\n      </div>\n    </div>\n\n    <!-- Panel 5: Continuity Reel -->\n    <div class=\"lumi-deck-panel panel-reel\">\n      <div class=\"lumi-inset-card lumi-mono-text\">\n        <div class=\"lumi-head-strip\">\n          <span class=\"lumi-head-title\">CONTINUITY REEL ARCHIVE</span>\n          <span class=\"lumi-status-badge\">MASTER LOG</span>\n        </div>\n        <div>$12</div>\n      </div>\n    </div>\n  </div>\n</div>",
    "flags": "gis",
    "placement": [
      "ai_output"
    ],
    "target": "display",
    "min_depth": null,
    "max_depth": null,
    "trim_strings": [],
    "run_on_edit": false,
    "substitute_macros": "none",
    "sort_order": 12,
    "description": ""
  },
  {
    "name": "🪻 | Script Directions (Drop-Down CoT)",
    "find_regex": "<\\s*script_directions\\s*>([\\s\\S]*?)<\\s*\\/\\s*script_directions\\s*>",
    "replace_string": "<details style=\"max-width: 520px; width: 100%; margin: 6px auto 12px auto; background: transparent; border: none; border-left: 2px solid var(--lumiverse-primary, #8c82ff); padding: 0 0 0 8px; box-sizing: border-box; display: block;\"><summary style=\"display: inline-flex; align-items: center; gap: 6px; padding: 2px 0; cursor: pointer; user-select: none; list-style: none; outline: none; font-family: 'SF Mono', 'Fira Code', Consolas, monospace; font-size: calc(11px * var(--lumiverse-font-scale, 1)); color: var(--lumiverse-text-dim, #888899);\"><span style=\"font-size: 8px; display: inline-block;\">▶</span><span style=\"letter-spacing: 0.04em;\">// script_directions.log</span></summary><pre style=\"margin: 6px 0 2px 0; padding: 8px 10px; background: var(--lumiverse-fill-subtle, rgba(255, 255, 255, 0.03)); border: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.06)); border-radius: var(--lcs-radius-xs, 4px); font-family: 'SF Mono', 'Fira Code', Consolas, monospace; font-size: calc(11px * var(--lumiverse-font-scale, 1)); line-height: 1.5; color: var(--lumiverse-text-dim, #888899); white-space: pre-wrap; word-break: break-word; box-sizing: border-box;\">$1</pre></details>",
    "flags": "gis",
    "placement": [
      "ai_output"
    ],
    "target": "display",
    "min_depth": null,
    "max_depth": null,
    "trim_strings": [],
    "run_on_edit": false,
    "substitute_macros": "none",
    "sort_order": 13,
    "description": ""
  },
  {
    "name": "🪻 | Scene Header (Lumiverse Theme)",
    "find_regex": "<\\s*tv_header\\s*>\\s*(?:[-*]\\s*)?Location[^:\\n]*:\\s*(.*?)\\r?\\n(?:[-*]\\s*)?Time[^:\\n]*:\\s*(.*?)\\r?\\n(?:[-*]\\s*)?Weather[^:\\n]*:\\s*(.*?)\\r?\\n(?:[-*]\\s*)?Position[^:\\n]*:\\s*(.*?)\\r?\\n(?:[-*]\\s*)?Emotion[^:\\n]*:\\s*(.*?)\\r?\\n(?:[-*]\\s*)?Feelings[^:\\n]*:\\s*(.*?)\\r?\\n(?:[-*]\\s*)?Thoughts[^:\\n]*:\\s*(.*?)\\s*<\\s*\\/tv_header\\s*>",
    "replace_string": "<style>\n/* =========================================================\n   NATIVE LUMIVERSE SCENE TELEMETRY HEADER\n   ========================================================= */\n\n.lumi-header-wrapper {\n  max-width: 520px;\n  width: 100%;\n  margin: 14px auto 10px auto;\n  box-sizing: border-box;\n}\n\n/* Main Native Card Container */\n.lumi-header-card {\n  background: var(--lumiverse-fill-strong, #16161e);\n  border: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.1));\n  border-radius: var(--lcs-radius-sm, 8px);\n  padding: 12px 14px;\n  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.35);\n  display: flex;\n  flex-direction: column;\n  gap: 8px;\n  transition: border-color var(--lumiverse-transition-fast, 150ms ease);\n}\n\n.lumi-header-card:hover {\n  border-color: var(--lumiverse-primary-040, rgba(140, 130, 255, 0.4));\n}\n\n/* Top System Navigation Ribbon */\n.lumi-header-top {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  border-bottom: 1px solid var(--lumiverse-border, rgba(255, 255, 255, 0.08));\n  padding-bottom: 6px;\n}\n\n.lumi-header-badge {\n  display: inline-flex;\n  align-items: center;\n  gap: 6px;\n  font-size: calc(11px * var(--lumiverse-font-scale, 1));\n  font-weight: 600;\n  color: var(--lumiverse-primary-text, #8c82ff) !important;\n  letter-spacing: 0.04em;\n  text-transform: uppercase;\n}\n\n.lumi-header-pill {\n  font-size: calc(10px * var(--lumiverse-font-scale, 1));\n  padding: 1px 6px;\n  border-radius: 999px;\n  background: color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 12%, transparent);\n  border: 1px solid color-mix(in srgb, var(--lumiverse-primary, #8c82ff) 30%, transparent);\n  color: var(--lumiverse-primary, #8c82ff);\n  font-weight: 600;\n}\n\n/* Telemetry Grid */\n.lumi-telemetry-grid {\n  display: grid;\n  grid-template-columns: 1fr 1fr;\n  gap: 4px 10px;\n  font-size: calc(12.5px * var(--lumiverse-font-scale, 1));\n  line-height: 1.4;\n  color: var(--lumiverse-text, #e2e8f0);\n}\n\n.lumi-telemetry-grid,\n.lumi-telemetry-grid * {\n  color: var(--lumiverse-text, #e2e8f0) !important;\n  text-shadow: none !important;\n}\n\n.lumi-grid-label {\n  font-weight: 600;\n  color: var(--lumiverse-primary, #8c82ff) !important;\n  font-size: calc(11.5px * var(--lumiverse-font-scale, 1));\n}\n\n.lumi-grid-full {\n  grid-column: span 2;\n}\n\n/* Inset Character Thoughts Box */\n.lumi-thoughts-inset {\n  background: var(--lumiverse-fill-subtle, rgba(255, 255, 255, 0.04));\n  border: 1px solid var(--lcs-glass-border, rgba(255, 255, 255, 0.06));\n  border-left: 3px solid var(--lumiverse-primary, #8c82ff);\n  border-radius: var(--lcs-radius-xs, 4px);\n  padding: 7px 10px;\n  margin-top: 2px;\n}\n\n.lumi-thoughts-header {\n  font-size: calc(10px * var(--lumiverse-font-scale, 1));\n  font-weight: 600;\n  color: var(--lumiverse-text-dim, #888899);\n  letter-spacing: 0.05em;\n  margin-bottom: 2px;\n  text-transform: uppercase;\n}\n\n.lumi-thoughts-body,\n.lumi-thoughts-body * {\n  font-size: calc(12px * var(--lumiverse-font-scale, 1)) !important;\n  font-style: italic !important;\n  line-height: 1.45 !important;\n  color: var(--lumiverse-text, #e2e8f0) !important;\n  text-shadow: none !important;\n}\n</style>\n\n<div class=\"lumi-header-wrapper\">\n  <div class=\"lumi-header-card\">\n    \n    <!-- Top System Title Bar -->\n    <div class=\"lumi-header-top\">\n      <div class=\"lumi-header-badge\">\n        <span>BROADCAST TELEMETRY // CH-24</span>\n      </div>\n      <span class=\"lumi-header-pill\">$2</span>\n    </div>\n\n    <!-- Metadata Grid -->\n    <div class=\"lumi-telemetry-grid\">\n      <div><span class=\"lumi-grid-label\">LOC:</span> $1</div>\n      <div><span class=\"lumi-grid-label\">WX:</span> $3</div>\n      <div class=\"lumi-grid-full\"><span class=\"lumi-grid-label\">POS:</span> $4</div>\n      <div><span class=\"lumi-grid-label\">EMO:</span> $5</div>\n      <div><span class=\"lumi-grid-label\">DYN:</span> $6</div>\n    </div>\n\n    <!-- Inset Thoughts Terminal -->\n    <div class=\"lumi-thoughts-inset\">\n      <div class=\"lumi-thoughts-header\">// INTERNAL THOUGHTS</div>\n      <div class=\"lumi-thoughts-body\">\"$7\"</div>\n    </div>\n\n  </div>\n</div>",
    "flags": "gis",
    "placement": [
      "ai_output"
    ],
    "target": "display",
    "min_depth": null,
    "max_depth": null,
    "trim_strings": [],
    "run_on_edit": false,
    "substitute_macros": "none",
    "sort_order": 17,
    "description": ""
  },
  {
    "name": "Anti-Truncation Disclaimer Cloak",
    "find_regex": "<\\s*(?:disclaimer)\\b[^>]*>[\\s\\S]*?(?:<\\s*\\/\\s*(?:disclaimer)\\s*>|$)",
    "replace_string": "",
    "flags": "gis",
    "placement": [
      "ai_output"
    ],
    "target": "display",
    "min_depth": null,
    "max_depth": null,
    "trim_strings": [],
    "run_on_edit": false,
    "substitute_macros": "none",
    "sort_order": 53,
    "description": ""
  }
];

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
    npcs: {},
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
    blockOrder: [],
    customBlocks: [],
    archivedBlocks: [],
    customVersions: [],
    devMode: false,
    rpgMode: false,
    npcRepositoryEnabled: false,
    stripStaleScriptDirections: true,
    bundledDisplaySkin: true,
    slopPhrases: [],
    slopPhrasesEnabled: true
  };
}

function presetVersion(versionId, customVersions = []) {
  return customVersions.find(version => version.id === versionId)
    || PRESET_VERSIONS.find(version => version.id === versionId)
    || PRESET_VERSIONS[0];
}

function versionSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function blockWithToggleDescription(block) {
  const content = String(block.content || '');
  const match = content.match(/^\s*\[\[toggle_description:\s*(.+?)\]\]\s*(?:\r?\n)?/i);
  return {
    ...block,
    content: match ? content.slice(match[0].length) : content,
    toggleDescription: match ? match[1].trim() : String(block.toggleDescription || '')
  };
}

function validateImportedVersion(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = versionSlug(value.id);
  const label = typeof value.label === 'string' ? value.label.trim() : '';
  if (!id || !label || !Array.isArray(value.blocks) || !value.blocks.length) return null;
  const blocks = [];
  for (const rawBlock of value.blocks) {
    if (!rawBlock || typeof rawBlock !== 'object' || !rawBlock.id) return null;
    const block = blockWithToggleDescription({
      id: String(rawBlock.id),
      name: String(rawBlock.name || 'Untitled block'),
      content: String(rawBlock.content || ''),
      role: rawBlock.role || 'system',
      enabled: rawBlock.enabled !== false,
      position: rawBlock.position || 'pre_history',
      depth: Number(rawBlock.depth || 0),
      marker: rawBlock.marker || null,
      isLocked: Boolean(rawBlock.isLocked),
      color: rawBlock.color || null,
      injectionTrigger: Array.isArray(rawBlock.injectionTrigger) ? rawBlock.injectionTrigger : [],
      group: rawBlock.group || null,
      categoryMode: rawBlock.categoryMode || null,
      characterTagTrigger: Array.isArray(rawBlock.characterTagTrigger) ? rawBlock.characterTagTrigger : [],
      variables: Array.isArray(rawBlock.variables) ? rawBlock.variables : [],
      toggleDescription: rawBlock.toggleDescription || ''
    });
    if (block.content.length > MAX_IMPORTED_BLOCK_CONTENT) return null;
    blocks.push(block);
  }
  return {
    id, label,
    description: String(value.description || ''),
    imported: true,
    blocks,
    promptVariables: value.promptVariables && typeof value.promptVariables === 'object' ? value.promptVariables : {},
    promptBehavior: value.promptBehavior && typeof value.promptBehavior === 'object' ? value.promptBehavior : {},
    completionSettings: value.completionSettings && typeof value.completionSettings === 'object' ? value.completionSettings : {},
    advancedSettings: value.advancedSettings && typeof value.advancedSettings === 'object' ? value.advancedSettings : {},
    samplerOverrides: value.samplerOverrides && typeof value.samplerOverrides === 'object' ? value.samplerOverrides : {}
  };
}

function transformLumiversePreset(source, requestedName = '') {
  if (!source || typeof source !== 'object' || Array.isArray(source)) throw new Error('Preset export must be a JSON object.');
  if (!Array.isArray(source.blocks) || !source.blocks.length) throw new Error('Preset export must contain at least one prompt block.');
  const label = String(requestedName || source.presetVersion || source.name || '').trim();
  if (!label) throw new Error('Give this imported preset version a name.');
  const transformed = validateImportedVersion({
    id: `imported-${versionSlug(label)}`,
    label,
    description: source.description || '',
    blocks: source.blocks,
    promptVariables: source.promptVariables || {},
    promptBehavior: source.promptBehavior || {},
    completionSettings: source.completionSettings || {},
    advancedSettings: source.advancedSettings || {},
    samplerOverrides: source.samplerOverrides || {}
  });
  if (!transformed) {
    const oversized = source.blocks.some(block => String(block?.content || '').length > MAX_IMPORTED_BLOCK_CONTENT);
    if (oversized) throw new Error('A prompt block exceeds the 50,000 character import limit.');
    throw new Error('Preset export contains malformed prompt blocks.');
  }
  return transformed;
}

function normalizeSuiteConfig(value) {
  const base = defaultSuiteConfig();
  const input = value && typeof value === 'object' ? value : {};
  const customVersions = Array.isArray(input.customVersions)
    ? input.customVersions.map(validateImportedVersion).filter(Boolean).slice(-MAX_IMPORTED_VERSIONS)
    : [];
  return {
    ...base,
    ...input,
    selectedVersion: presetVersion(input.selectedVersion, customVersions)?.id || base.selectedVersion,
    blockOverrides: input.blockOverrides && typeof input.blockOverrides === 'object' ? input.blockOverrides : {},
    promptVariables: input.promptVariables && typeof input.promptVariables === 'object' ? input.promptVariables : {},
    blockOrder: Array.isArray(input.blockOrder) ? input.blockOrder.map(String) : [],
    customBlocks: Array.isArray(input.customBlocks) ? input.customBlocks.filter(block => block && typeof block === 'object' && block.id) : [],
    archivedBlocks: Array.isArray(input.archivedBlocks) ? input.archivedBlocks.filter(item => item && typeof item === 'object' && item.block).slice(-100) : [],
    customVersions,
    devMode: input.devMode === true,
    rpgMode: input.rpgMode === true,
    npcRepositoryEnabled: input.npcRepositoryEnabled === true,
    stripStaleScriptDirections: input.stripStaleScriptDirections !== false,
    bundledDisplaySkin: input.bundledDisplaySkin !== false,
    slopPhrases: Array.isArray(input.slopPhrases)
      ? [...new Set(input.slopPhrases.map(item => String(item || '').replace(/\s+/g, ' ').trim()).filter(Boolean))]
      : [],
    slopPhrasesEnabled: input.slopPhrasesEnabled !== false
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

function stripStaleScriptDirections(messages) {
  return messages.map(message => {
    if (!message?.__isChatHistory || typeof message.content !== 'string') return message;
    return { ...message, content: message.content.replace(STALE_SCRIPT_DIRECTIONS_RE, '') };
  });
}

async function syncBundledDisplaySkin(config, userId) {
  if (!spindle.regex_scripts?.list || !spindle.regex_scripts?.create || !spindle.regex_scripts?.update) {
    spindle.log.warn('I Love TV! Suite: Regex Scripts API is unavailable; bundled display skin was not synchronized.');
    return;
  }
  try {
    const result = await spindle.regex_scripts.list({ limit: 100, userId });
    const existingScripts = Array.isArray(result?.data) ? result.data : [];
    for (const source of BUNDLED_DISPLAY_SCRIPTS) {
      const key = versionSlug(source.name);
      const desired = {
        ...source,
        scope: 'global',
        scope_id: null,
        disabled: config.bundledDisplaySkin !== true,
        folder: 'I Love TV! Suite',
        folder_version: ENGINE_VERSION,
        metadata: { suiteFeature: 'bundled-display-skin', key }
      };
      const existing = existingScripts.find(script => script?.metadata?.suiteFeature === 'bundled-display-skin' && script?.metadata?.key === key);
      if (!existing) {
        await spindle.regex_scripts.create(desired, userId);
        continue;
      }
      if (existing.can_mutate === false) continue;
      const fields = ['name', 'find_regex', 'replace_string', 'flags', 'placement', 'target', 'min_depth', 'max_depth', 'trim_strings', 'run_on_edit', 'substitute_macros', 'sort_order', 'description', 'scope', 'scope_id', 'disabled', 'folder'];
      const changed = fields.some(field => JSON.stringify(existing[field] ?? null) !== JSON.stringify(desired[field] ?? null));
      if (changed || existing.folder_version !== ENGINE_VERSION) await spindle.regex_scripts.update(existing.id, desired, userId);
    }
  } catch (error) {
    spindle.log.warn(`I Love TV! Suite: could not synchronize bundled display skin (${error?.message || error}).`);
  }
}

function resolvedSuiteBlocks(config) {
  const version = presetVersion(config.selectedVersion, config.customVersions);
  let blocks = version.blocks.map(block => {
    const override = config.blockOverrides?.[block.id] || {};
    return blockWithToggleDescription({ ...block, ...override, id: block.id, variables: block.variables || [] });
  });
  blocks.push(...config.customBlocks.map(block => ({ ...block, variables: block.variables || [] })));
  if (config.blockOrder.length) {
    const rank = new Map(config.blockOrder.map((id, index) => [id, index]));
    blocks = blocks
      .map((block, sourceIndex) => ({ block, sourceIndex }))
      .sort((a, b) => (rank.get(a.block.id) ?? (config.blockOrder.length + a.sourceIndex)) - (rank.get(b.block.id) ?? (config.blockOrder.length + b.sourceIndex)))
      .map(item => item.block);
  }
  if (config.rpgMode) {
    blocks.push({
      id: 'suite-rpg-mode', name: '🎲 Suite RPG Mode', role: 'system', enabled: true,
      position: 'post_history', depth: 0, marker: null,
      content: '<suite_rpg_mode>Use the locked D20 action check supplied by the Control Room for uncertain actions. Track injuries, inventory, resources, conditions, and unresolved objectives consistently. Never reroll the locked check and never override character agency.</suite_rpg_mode>'
    });
  }
  if (config.npcRepositoryEnabled) {
    blocks.push({
      id: 'suite-npc-repository', name: '🎭 Suite NPC Repository', role: 'system', enabled: true,
      position: 'post_history', depth: 0, marker: null,
      content: `<suite_npc_repository>
CAST CONTINUITY // NPC DOSSIER CUE
When a named NPC (not {{user}} or {{char}}) appears with meaningful presence for the first time, end your reply with one <npc_sheet name="Exact Display Name" status="new"> block. When an existing NPC's established facts meaningfully change (relationship, appearance, status), emit status="update" instead, including only the fields that changed. Use plain "key: value" lines inside the tag, one per line. Never emit a sheet for a character already listed as known in the dossier unless something changed. Never emit more than one sheet per NPC per reply.

Format:
<npc_sheet name="..." status="new|update">
role: ...
appearance: ...
personality: ...
voice: ...
relationship_to_user: ...
relationship:OtherNpcName: ...
memory: one short new impression or event from this turn, or omit this line
</npc_sheet>
</suite_npc_repository>`
    });
  }
  const antiSlopIndex = blocks.findIndex(block => String(block.content || '').includes('<anti_slop_reference>'));
  if (antiSlopIndex < 0) {
    if (!missingAntiSlopWarnings.has(config.selectedVersion)) {
      missingAntiSlopWarnings.add(config.selectedVersion);
      spindle.log.warn(`I Love TV! Suite: preset ${config.selectedVersion} has no <anti_slop_reference> anchor; Cinema Sins were skipped.`);
    }
  } else if (config.slopPhrasesEnabled && config.slopPhrases.length) {
    const block = blocks[antiSlopIndex];
    const phrases = config.slopPhrases.map(phrase => `- ${phrase}`).join('\n');
    block.content = String(block.content).replace(
      /<anti_slop_reference>([\s\S]*?)<\/anti_slop_reference>/i,
      (_match, body) => `<anti_slop_reference>${body}${String(body).trim() ? '\n\n' : '\n'}## CINEMA SINS // OPERATOR BLACKLIST\n${phrases}\n</anti_slop_reference>`
    );
  }
  return blocks;
}

const BEGINNER_CATEGORY_RULES = [
  { key: 'character_toggles', name: '━━ 🎭 Character Toggles', label: 'Character craft', mode: 'children' },
  { key: 'audience_bonus', name: '━━ ♟️ USER TOGGLES', label: 'Audience bonuses', mode: 'children' },
  { key: 'interactive_tv', name: '━━ 📊 Interactive TV', label: 'Interactive TV & audience warm-up', mode: 'children' },
  { key: 'studio_skills', name: '━━ 🎨 Studio Skills & Frontend Rendering', label: 'Studio skills', mode: 'children' },
  { key: 'late_night_tv', name: '━━ ❤️‍🔥 LATE NIGHT T.V.', label: 'Late Night TV', mode: 'children', prefix: '🔞' },
  { key: 'scripting_process', name: '━━ 🧠 Chain of Thought (CoT)', label: 'Scripting process', mode: 'category' }
];

function beginnerToggleState(config) {
  const blocks = resolvedSuiteBlocks(config);
  const toggles = [];
  for (const rule of BEGINNER_CATEGORY_RULES) {
    const category = blocks.find(block => block.marker === 'category' && block.name === rule.name);
    if (!category) continue;
    if (rule.mode === 'category') {
      if (!category.isLocked) toggles.push({
        id: category.id, categoryKey: rule.key, categoryLabel: rule.label, label: rule.label,
        description: category.toggleDescription || 'Enable the preset\'s private planning and script-directions pipeline as one unit.',
        enabled: category.enabled !== false, kind: 'category'
      });
      continue;
    }
    blocks
      .filter(block => block.group === category.id && !block.isLocked && (!rule.prefix || String(block.name || '').trim().startsWith(rule.prefix)))
      .forEach(block => toggles.push({
        id: block.id, categoryKey: rule.key, categoryLabel: rule.label, label: block.name,
        description: block.toggleDescription || `Include ${String(block.name || 'this production feature').replace(/^[\s⋆⟢✮★ᗯ·]+/u, '').trim()} in the active broadcast preset.`,
        enabled: block.enabled !== false, kind: 'block'
      }));
  }
  return toggles;
}

function suiteBlockSummaries(config) {
  return resolvedSuiteBlocks(config).map(block => ({
    id: block.id, name: block.name, enabled: block.enabled !== false, role: block.role,
    position: block.position, depth: Number(block.depth || 0), marker: block.marker || null,
    categoryMode: block.categoryMode || null, group: block.group || null,
    isLocked: block.isLocked === true, toggleDescription: block.toggleDescription || '',
    kind: block.marker === 'category' ? 'category' : (block.marker ? 'marker' : 'block'),
    custom: config.customBlocks.some(item => item.id === block.id),
    edited: Boolean(config.blockOverrides?.[block.id])
  }));
}

function suiteVariables(config) {
  const version = presetVersion(config.selectedVersion, config.customVersions);
  return resolvedSuiteBlocks(config)
    .filter(block => Array.isArray(block.variables) && block.variables.length)
    .map(block => ({
      blockId: block.id,
      blockName: block.name,
      variables: block.variables.map(variable => ({
        ...variable,
        value: config.promptVariables?.[block.id]?.[variable.name]
          ?? version.promptVariables?.[block.id]?.[variable.name]
          ?? variable.defaultValue
      }))
    }));
}

function effectivePromptVariables(config) {
  const defaults = presetVersion(config.selectedVersion, config.customVersions).promptVariables || {};
  const merged = { ...defaults };
  for (const [blockId, values] of Object.entries(config.promptVariables || {})) {
    merged[blockId] = { ...(defaults[blockId] || {}), ...(values && typeof values === 'object' ? values : {}) };
  }
  return merged;
}

function suiteState(config) {
  return {
    enabled: config.enabled,
    selectedVersion: config.selectedVersion,
    devMode: config.devMode,
    rpgMode: config.rpgMode,
    npcRepositoryEnabled: config.npcRepositoryEnabled,
    stripStaleScriptDirections: config.stripStaleScriptDirections,
    bundledDisplaySkin: config.bundledDisplaySkin,
    slopPhrases: config.slopPhrases,
    slopPhrasesEnabled: config.slopPhrasesEnabled,
    versions: [...config.customVersions, ...PRESET_VERSIONS].map(version => ({ id: version.id, label: version.label, description: version.description, blockCount: version.blocks.length, imported: version.imported === true })),
    blocks: suiteBlockSummaries(config),
    beginnerToggles: beginnerToggleState(config),
    variables: suiteVariables(config),
    archives: config.archivedBlocks.map(item => ({ archiveId: item.archiveId, sourceBlockId: item.sourceBlockId, archivedAt: item.archivedAt, name: item.block?.name || 'Archived block' }))
  };
}

function uniqueBlockId(prefix = 'block') {
  return `suite-${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function insertAfter(order, newId, afterId) {
  const result = order.filter(id => id !== newId);
  const index = afterId ? result.indexOf(afterId) : -1;
  result.splice(index >= 0 ? index + 1 : result.length, 0, newId);
  return result;
}

function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeNpcEntry(value, fallbackId = '') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const id = slugify(name || value.id || fallbackId);
  if (!name || !id) return null;
  const text = key => typeof value[key] === 'string' ? value[key].trim() : '';
  const relationships = {};
  if (value.relationships && typeof value.relationships === 'object' && !Array.isArray(value.relationships)) {
    for (const [target, description] of Object.entries(value.relationships)) {
      const targetId = slugify(target);
      const detail = typeof description === 'string' ? description.trim() : '';
      if (targetId && detail) relationships[targetId] = detail;
    }
  }
  const turn = key => Number.isFinite(Number(value[key])) ? Math.max(0, Math.trunc(Number(value[key]))) : 0;
  return {
    id,
    name,
    role: text('role'),
    appearance: text('appearance'),
    personality: text('personality'),
    voice: text('voice'),
    relationshipToUser: text('relationshipToUser'),
    relationships,
    memories: mergeUnique([], value.memories, 8),
    firstSeenTurn: turn('firstSeenTurn'),
    lastUpdatedTurn: turn('lastUpdatedTurn'),
    archived: value.archived === true
  };
}

function normalizeLedger(value) {
  const base = defaultLedger();
  const input = value && typeof value === 'object' ? value : {};
  const npcs = {};
  if (input.npcs && typeof input.npcs === 'object' && !Array.isArray(input.npcs)) {
    for (const [key, value] of Object.entries(input.npcs)) {
      const npc = normalizeNpcEntry(value, key);
      if (npc) npcs[npc.id] = npc;
    }
  }
  const normalized = {
    ...base,
    ...input,
    affinity: Number.isFinite(Number(input.affinity)) ? Math.max(-100, Math.min(100, Number(input.affinity))) : 0,
    continuity: {
      ...base.continuity,
      ...(input.continuity && typeof input.continuity === 'object' ? input.continuity : {})
    },
    npcs,
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
    await syncBundledDisplaySkin(suiteConfig, userId);
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
      suite: suiteState(suiteConfig)
    }, userId);
  }

  if (payload.type === 'suite:select_version' && payload.versionId) {
    suiteConfig.selectedVersion = presetVersion(payload.versionId, suiteConfig.customVersions).id;
    suiteConfig = await saveSuiteConfig(suiteConfig, userId);
    sendFrontend({ type: 'suite:config_saved', suite: suiteState(suiteConfig) }, userId);
  }

  if (payload.type === 'suite:import_version') {
    try {
      if (typeof payload.rawJson !== 'string' || !payload.rawJson.trim()) throw new Error('Paste a Lumiverse preset export before importing.');
      if (payload.rawJson.length > 5_000_000) throw new Error('Preset export exceeds the 5 MB import limit.');
      let source;
      try {
        source = JSON.parse(payload.rawJson);
      } catch {
        throw new Error('Preset export is not valid JSON.');
      }
      const imported = transformLumiversePreset(source, payload.versionName);
      const baseId = imported.id;
      let suffix = 2;
      while ([...suiteConfig.customVersions, ...PRESET_VERSIONS].some(version => version.id === imported.id)) {
        imported.id = `${baseId}-${suffix}`;
        suffix += 1;
      }
      suiteConfig.customVersions = [...suiteConfig.customVersions, imported].slice(-MAX_IMPORTED_VERSIONS);
      suiteConfig.selectedVersion = imported.id;
      suiteConfig = await saveSuiteConfig(suiteConfig, userId);
      sendFrontend({ type: 'suite:import_success', suite: suiteState(suiteConfig), version: { id: imported.id, label: imported.label } }, userId);
    } catch (error) {
      sendFrontend({ type: 'suite:import_error', error: error?.message || 'Preset import failed.' }, userId);
    }
  }

  if (payload.type === 'suite:save_settings') {
    suiteConfig.enabled = payload.enabled !== false;
    suiteConfig.devMode = payload.devMode === true;
    suiteConfig.rpgMode = payload.rpgMode === true;
    suiteConfig.npcRepositoryEnabled = payload.npcRepositoryEnabled === true;
    suiteConfig.stripStaleScriptDirections = payload.stripStaleScriptDirections !== false;
    suiteConfig.bundledDisplaySkin = payload.bundledDisplaySkin !== false;
    suiteConfig.slopPhrasesEnabled = payload.slopPhrasesEnabled !== false;
    suiteConfig = await saveSuiteConfig(suiteConfig, userId);
    await syncBundledDisplaySkin(suiteConfig, userId);
    sendFrontend({ type: 'suite:config_saved', suite: suiteState(suiteConfig) }, userId);
  }

  if (payload.type === 'suite:save_slop_phrases' && Array.isArray(payload.phrases)) {
    suiteConfig.slopPhrases = payload.phrases;
    suiteConfig = await saveSuiteConfig(suiteConfig, userId);
    sendFrontend({ type: 'suite:config_saved', suite: suiteState(suiteConfig) }, userId);
  }

  if (payload.type === 'npc:upsert' && Array.isArray(payload.sheets)) {
    for (const sheet of payload.sheets) {
      if (!sheet || typeof sheet !== 'object' || typeof sheet.name !== 'string') continue;
      const name = sheet.name.trim();
      const id = slugify(name);
      if (!id) continue;
      const existing = ledger.npcs[id] || {
        id, name, role: '', appearance: '', personality: '', voice: '', relationshipToUser: '',
        relationships: {}, memories: [], firstSeenTurn: Number(ledger.turnCounter || 0), archived: false
      };
      const incomingFields = sheet.fields && typeof sheet.fields === 'object' && !Array.isArray(sheet.fields)
        ? sheet.fields
        : {};
      const fields = {};
      for (const key of ['role', 'appearance', 'personality', 'voice']) {
        if (typeof incomingFields[key] === 'string') fields[key] = incomingFields[key].trim();
      }
      if (typeof incomingFields.relationship_to_user === 'string') {
        fields.relationshipToUser = incomingFields.relationship_to_user.trim();
      } else if (typeof incomingFields.relationshipToUser === 'string') {
        fields.relationshipToUser = incomingFields.relationshipToUser.trim();
      }
      const relationships = {};
      if (sheet.relationships && typeof sheet.relationships === 'object' && !Array.isArray(sheet.relationships)) {
        for (const [target, description] of Object.entries(sheet.relationships)) {
          const targetId = slugify(target);
          const detail = typeof description === 'string' ? description.trim() : '';
          if (targetId && detail) relationships[targetId] = detail;
        }
      }
      ledger.npcs[id] = normalizeNpcEntry({
        ...existing,
        name,
        ...fields,
        relationships: { ...existing.relationships, ...relationships },
        memories: typeof sheet.memory === 'string' && sheet.memory.trim()
          ? mergeUnique(existing.memories, [sheet.memory], 8)
          : existing.memories,
        lastUpdatedTurn: Number(ledger.turnCounter || 0)
      }, id);
    }
    ledger = await saveChatLedger(chatId, ledger, userId);
    sendFrontend({ type: 'control_room:state_data', chatId, ledger }, userId);
  }

  if (payload.type === 'npc:archive' && payload.id) {
    const id = slugify(payload.id);
    if (ledger.npcs[id]) {
      ledger.npcs[id] = { ...ledger.npcs[id], archived: true, lastUpdatedTurn: Number(ledger.turnCounter || 0) };
      ledger = await saveChatLedger(chatId, ledger, userId);
      sendFrontend({ type: 'control_room:state_data', chatId, ledger }, userId);
    }
  }

  if (payload.type === 'npc:delete' && payload.id) {
    const id = slugify(payload.id);
    if (ledger.npcs[id]) {
      delete ledger.npcs[id];
      ledger = await saveChatLedger(chatId, ledger, userId);
      sendFrontend({ type: 'control_room:state_data', chatId, ledger }, userId);
    }
  }

  if (payload.type === 'suite:save_variable' && payload.blockId && payload.name) {
    suiteConfig.promptVariables[payload.blockId] = {
      ...(suiteConfig.promptVariables[payload.blockId] || {}),
      [payload.name]: payload.value
    };
    suiteConfig = await saveSuiteConfig(suiteConfig, userId);
    sendFrontend({ type: 'suite:config_saved', suite: suiteState(suiteConfig) }, userId);
  }

  if (payload.type === 'suite:get_block' && payload.blockId) {
    const block = resolvedSuiteBlocks(suiteConfig).find(item => item.id === payload.blockId);
    if (block && (!block.isLocked || suiteConfig.devMode)) sendFrontend({ type: 'suite:block_data', block }, userId);
  }

  if (payload.type === 'suite:save_block' && payload.blockId) {
    const base = presetVersion(suiteConfig.selectedVersion, suiteConfig.customVersions).blocks.find(item => item.id === payload.blockId);
    if (base?.isLocked) {
      sendFrontend({ type: 'suite:locked_block_error', error: 'Locked host blocks are read-only.' }, userId);
      return;
    }
    const editable = ['name', 'content', 'enabled', 'role', 'position', 'depth', 'marker', 'categoryMode', 'group'];
    const changes = Object.fromEntries(editable.filter(key => payload[key] !== undefined).map(key => [key, payload[key]]));
    if (base) {
      suiteConfig.blockOverrides[payload.blockId] = {
        ...(suiteConfig.blockOverrides[payload.blockId] || {}),
        ...changes
      };
    } else {
      const index = suiteConfig.customBlocks.findIndex(item => item.id === payload.blockId);
      if (index >= 0) suiteConfig.customBlocks[index] = { ...suiteConfig.customBlocks[index], ...changes, id: payload.blockId };
    }
    suiteConfig = await saveSuiteConfig(suiteConfig, userId);
    sendFrontend({ type: 'suite:block_saved', block: resolvedSuiteBlocks(suiteConfig).find(item => item.id === payload.blockId), suite: suiteState(suiteConfig) }, userId);
  }

  if (payload.type === 'suite:reset_block' && payload.blockId) {
    const base = presetVersion(suiteConfig.selectedVersion, suiteConfig.customVersions).blocks.find(item => item.id === payload.blockId);
    if (base?.isLocked) {
      sendFrontend({ type: 'suite:locked_block_error', error: 'Locked host blocks are read-only.' }, userId);
      return;
    }
    delete suiteConfig.blockOverrides[payload.blockId];
    suiteConfig = await saveSuiteConfig(suiteConfig, userId);
    const block = resolvedSuiteBlocks(suiteConfig).find(item => item.id === payload.blockId);
    if (block) sendFrontend({ type: 'suite:block_saved', block, suite: suiteState(suiteConfig) }, userId);
  }

  if (payload.type === 'suite:create_block') {
    const kind = ['category', 'marker'].includes(payload.kind) ? payload.kind : 'block';
    const id = uniqueBlockId(kind);
    const block = {
      id,
      name: String(payload.name || (kind === 'category' ? 'New Category' : kind === 'marker' ? 'New Marker' : 'New Prompt Block')).slice(0, 120),
      content: typeof payload.content === 'string' ? payload.content : '',
      role: payload.role || 'system', enabled: payload.enabled !== false,
      position: payload.position || 'pre_history', depth: Number(payload.depth || 0),
      marker: kind === 'category' ? 'category' : (kind === 'marker' ? (payload.marker || 'main_prompt') : null),
      categoryMode: payload.categoryMode || null, group: payload.group || null,
      variables: Array.isArray(payload.variables) ? payload.variables : []
    };
    suiteConfig.customBlocks.push(block);
    const currentOrder = suiteBlockSummaries(suiteConfig).map(item => item.id).filter(item => item !== id);
    suiteConfig.blockOrder = insertAfter(currentOrder, id, payload.afterId);
    suiteConfig = await saveSuiteConfig(suiteConfig, userId);
    sendFrontend({ type: 'suite:block_saved', block, suite: suiteState(suiteConfig) }, userId);
  }

  if (payload.type === 'suite:duplicate_block' && payload.blockId) {
    const source = resolvedSuiteBlocks(suiteConfig).find(item => item.id === payload.blockId);
    if (source && !source.isLocked) {
      const copy = { ...source, id: uniqueBlockId('copy'), name: `${source.name} — Copy`, variables: Array.isArray(source.variables) ? source.variables.map(item => ({ ...item })) : [] };
      suiteConfig.customBlocks.push(copy);
      suiteConfig.blockOrder = insertAfter(suiteBlockSummaries(suiteConfig).map(item => item.id).filter(id => id !== copy.id), copy.id, source.id);
      suiteConfig = await saveSuiteConfig(suiteConfig, userId);
      sendFrontend({ type: 'suite:block_saved', block: copy, suite: suiteState(suiteConfig) }, userId);
    }
  }

  if (payload.type === 'suite:reorder_blocks' && Array.isArray(payload.order)) {
    const known = suiteBlockSummaries(suiteConfig).map(item => item.id);
    const requested = payload.order.map(String).filter((id, index, all) => known.includes(id) && all.indexOf(id) === index);
    suiteConfig.blockOrder = [...requested, ...known.filter(id => !requested.includes(id))];
    suiteConfig = await saveSuiteConfig(suiteConfig, userId);
    sendFrontend({ type: 'suite:config_saved', suite: suiteState(suiteConfig) }, userId);
  }

  if (payload.type === 'suite:archive_block' && payload.blockId) {
    const block = resolvedSuiteBlocks(suiteConfig).find(item => item.id === payload.blockId);
    if (block && !block.isLocked) {
      suiteConfig.archivedBlocks.push({ archiveId: uniqueBlockId('archive'), sourceBlockId: block.id, archivedAt: new Date().toISOString(), block: { ...block } });
      suiteConfig = await saveSuiteConfig(suiteConfig, userId);
      sendFrontend({ type: 'suite:config_saved', suite: suiteState(suiteConfig) }, userId);
    }
  }

  if (payload.type === 'suite:restore_archive' && payload.archiveId) {
    const archived = suiteConfig.archivedBlocks.find(item => item.archiveId === payload.archiveId);
    if (archived) {
      const block = { ...archived.block, id: uniqueBlockId('restored'), name: `${archived.block.name} — Restored` };
      suiteConfig.customBlocks.push(block);
      suiteConfig.blockOrder = [...suiteBlockSummaries(suiteConfig).map(item => item.id).filter(id => id !== block.id), block.id];
      suiteConfig = await saveSuiteConfig(suiteConfig, userId);
      sendFrontend({ type: 'suite:block_saved', block, suite: suiteState(suiteConfig) }, userId);
    }
  }

  if (payload.type === 'suite:rewrite_block' && payload.blockId) {
    try {
      const block = resolvedSuiteBlocks(suiteConfig).find(item => item.id === payload.blockId);
      if (!block) throw new Error('Prompt block not found.');
      if (block.isLocked) throw new Error('Locked host blocks are read-only.');
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
  let workingMessages = suiteConfig.stripStaleScriptDirections ? stripStaleScriptDirections(messages) : messages;
  let suiteAssemblySucceeded = false;
  let suiteAssemblyError = '';
  if (suiteConfig.enabled && chatId !== 'default') {
    try {
      const version = presetVersion(suiteConfig.selectedVersion, suiteConfig.customVersions);
      if (typeof spindle.assemble !== 'function') {
        throw new Error('Lumiverse prompt assembly API is unavailable. Update Lumiverse before using the bundled suite preset.');
      }
      const assembled = await spindle.assemble({
        blocks: resolvedSuiteBlocks(suiteConfig),
        chatId,
        connectionId: context?.connectionId,
        promptVariables: effectivePromptVariables(suiteConfig)
      }, userId);
      if (Array.isArray(assembled?.messages) && assembled.messages.length) {
        workingMessages = suiteConfig.stripStaleScriptDirections ? stripStaleScriptDirections(assembled.messages) : assembled.messages;
        suiteAssemblySucceeded = true;
      } else {
        throw new Error('Lumiverse returned an empty assembled prompt.');
      }
    } catch (error) {
      suiteAssemblyError = error?.message || String(error);
      spindle.log.warn(`I Love TV! Suite: bundled preset assembly failed (${suiteAssemblyError}); retaining the host prompt.`);
    }
  }
  if (suiteConfig.enabled && !suiteAssemblySucceeded) {
    const failure = {
      role: 'system',
      content: `<control_room_error priority="CRITICAL">The I Love TV! bundled preset could not be assembled: ${suiteAssemblyError || 'unknown assembly error'}. The host prompt is being used for this response. Do not claim that the suite preset was applied.</control_room_error>`
    };
    sendFrontend({ type: 'suite:assembly_error', chatId, error: suiteAssemblyError || 'Unknown prompt assembly error.' }, userId);
    return {
      messages: [failure, ...workingMessages],
      breakdown: [{ messageIndex: 0, name: `I Love TV! Suite ${presetVersion(suiteConfig.selectedVersion, suiteConfig.customVersions).id} — Assembly Error` }]
    };
  }
  const modules = detectModules(workingMessages);
  const directorContext = buildDirectorContext(workingMessages);
  const turn = findTurn(workingMessages, context);
  let ledger = await getChatLedger(chatId, userId);
  let turnState = ledger.lastTurn;

  const hasActiveWork = modules.affinity || modules.continuity || modules.pathfinding || modules.cyoa || Boolean(ledger.authorNote)
    || Boolean(suiteConfig.npcRepositoryEnabled && Object.keys(ledger.npcs || {}).length);
  if (!hasActiveWork) return workingMessages;

  // Regenerations keep the locked result for the same source turn. A swipe is a
  // deliberate alternate take, so every swipe receives a completely fresh
  // director analysis and fresh dice even when the source user message is unchanged.
  const isSwipe = context?.generationType === 'swipe';
  const isNewTurn = isSwipe || !turnState || turnState.key !== turn.turnKey;
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
      key: isSwipe ? `${turn.turnKey}:swipe:${Date.now()}:${Math.random().toString(36).slice(2, 8)}` : turn.turnKey,
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
    `Suite preset: ${presetVersion(suiteConfig.selectedVersion, suiteConfig.customVersions).label} (${suiteAssemblySucceeded ? 'assembled by extension' : 'host prompt fallback'})`,
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
  const additions = [];
  const breakdown = [];
  if (suiteConfig.npcRepositoryEnabled) {
    const activeNpcs = Object.values(ledger.npcs || {})
      .filter(npc => !npc.archived)
      .sort((a, b) => Number(b.lastUpdatedTurn || 0) - Number(a.lastUpdatedTurn || 0))
      .slice(0, 12);
    if (activeNpcs.length) {
      const dossierLines = [
        '<npc_dossier priority="HIGH">',
        'Known NPCs — do not re-introduce these as new characters:'
      ];
      activeNpcs.forEach(npc => {
        dossierLines.push(`- ${npc.name}: ${npc.role || '(no role noted)'}. ${npc.relationshipToUser || ''}`);
      });
      dossierLines.push('</npc_dossier>');
      additions.push({ role: 'system', content: dossierLines.join('\n') });
      breakdown.push({ messageIndex: insertAt, name: 'I Love TV! Suite — NPC Dossier' });
    }
  }
  additions.push(injected);
  breakdown.push({ messageIndex: insertAt + additions.length - 1, name: `I Love TV! Suite ${presetVersion(suiteConfig.selectedVersion).id} — Director Pass` });
  modified.splice(insertAt, 0, ...additions);

  sendFrontend({ type: 'control_room:state_data', chatId, ledger }, userId);
  const sampler = presetVersion(suiteConfig.selectedVersion, suiteConfig.customVersions).samplerOverrides || {};
  const parameters = sampler.enabled === false ? undefined : Object.fromEntries([
    ['max_tokens', sampler.maxTokens],
    ['temperature', sampler.temperature],
    ['top_p', sampler.topP],
    ['min_p', sampler.minP],
    ['top_k', sampler.topK],
    ['frequency_penalty', sampler.frequencyPenalty],
    ['presence_penalty', sampler.presencePenalty],
    ['repetition_penalty', sampler.repetitionPenalty]
  ].filter(([, value]) => value !== null && value !== undefined && value !== ''));
  return {
    messages: modified,
    ...(parameters && Object.keys(parameters).length ? { parameters } : {}),
    breakdown
  };
}, 10);

spindle.log.info(`I Love TV! Suite v${ENGINE_VERSION} initialized with ${PRESET_VERSIONS.length} bundled preset version(s).`);
