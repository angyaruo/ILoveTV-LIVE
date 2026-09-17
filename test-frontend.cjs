const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, 'dist/frontend.js'), 'utf8');

assert.doesNotMatch(source, /type=["']checkbox["']/i, 'raw checkbox controls must not return');
assert.match(source, /tab:'home'/, 'the suite must open on the lobby dashboard');
assert.match(source, /tv-shell \$\{active\?'active':''\}/, 'selected tabs must activate the collapsing rail layout');
assert.match(source, /prefers-reduced-motion:reduce/, 'motion must respect the operating-system accessibility preference');
assert.match(source, /aria-pressed=/, 'binary selections must expose pressed state');
assert.match(source, /tv-lobby/, 'the landing dashboard must remain available');

console.log('frontend-contract-ok');

