const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const inputPath = path.join(root, 'presets', 'i-love-tv-v3.5.json');
const outputPath = path.join(root, 'dist', 'preset-versions.js');
const source = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

function extractToggleDescription(content, fallback = '') {
  const text = String(content || '');
  const match = text.match(/^\s*\[\[toggle_description:\s*(.+?)\]\]\s*(?:\r?\n)?/i);
  return {
    content: match ? text.slice(match[0].length) : text,
    toggleDescription: match ? match[1].trim() : String(fallback || '')
  };
}

const blocks = source.blocks.map(block => {
  const prompt = extractToggleDescription(block.content, block.toggleDescription);
  return {
    id: block.id,
    name: block.name,
    content: prompt.content,
    toggleDescription: prompt.toggleDescription,
    role: block.role || 'system',
    enabled: block.enabled !== false,
    position: block.position || 'pre_history',
    depth: Number(block.depth || 0),
    marker: block.marker || null,
    isLocked: Boolean(block.isLocked),
    color: block.color || null,
    injectionTrigger: Array.isArray(block.injectionTrigger) ? block.injectionTrigger : [],
    group: block.group || null,
    categoryMode: block.categoryMode || null,
    characterTagTrigger: Array.isArray(block.characterTagTrigger) ? block.characterTagTrigger : [],
    variables: block.variables || []
  };
});

const version = {
  id: '3.5',
  label: 'I Love TV! v3.5',
  description: source.description || '',
  blocks,
  promptVariables: source.promptVariables || {},
  promptBehavior: source.promptBehavior || {},
  completionSettings: source.completionSettings || {},
  advancedSettings: source.advancedSettings || {},
  samplerOverrides: source.samplerOverrides || {}
};

fs.writeFileSync(outputPath, `// Generated from presets/i-love-tv-v3.5.json\nexport const PRESET_VERSIONS = ${JSON.stringify([version])};\n`);
console.log(`built ${outputPath} (${blocks.length} blocks)`);

