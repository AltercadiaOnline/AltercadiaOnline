import fs from 'fs';

const path = new URL('../public/styles.css', import.meta.url);
let css = fs.readFileSync(path, 'utf8');
const before = css.length;

const blocks = [
  /\.battle-portrait\.vfx-impact-flash--white,\s*\n#battle-opponent-portrait\.vfx-impact-flash--white,\s*\n#battle-player-portrait\.vfx-impact-flash--white \{[\s\S]*?\}\n\n/,
  /#scene-combat\.combat-impact--critical[\s\S]*?#scene-combat\.combat-impact--heavy[\s\S]*?\}\n\n/,
  /\.battle-combat-top > \.battle-status-row \{[\s\S]*?\.battle-vs-label \{\n  margin: 0;[\s\S]*?0\.45\);\n\}\n\n/,
  /\.combat-container \{[\s\S]*?\.combat-side-note \{[\s\S]*?0\.7;\n\}\n\n/,
  /#scene-combat\.battle-scene-legacy-note \{[\s\S]*?\.battle-victory-popup__btn:hover \{[\s\S]*?#fff;\n\}\n\n/,
  /#char-select-screen h1 \{[\s\S]*?text-align: center;\n\}\n\n#login-screen \{[\s\S]*?width: min\(360px, 90vw\);\n\}\n\n/,
  /\.battle-stage \{[\s\S]*?\.battle-portrait\[data-class-id='DISSOLUTUS'\][\s\S]*?0\.15\);\n\}\n\n/,
  /\.battle-platform--ally:has\(\.battle-pet-fighter:not\(\.hidden\)\)::before \{[\s\S]*?\.battle-platform--foe \{\n  justify-self: end;\n\}\n\n/,
  /\.battle-portrait\.is-spawning,[\s\S]*?@keyframes battle-platform-boot \{[\s\S]*?0\.95\);\n  \}\n\}\n\n/,
];

for (const re of blocks) {
  css = css.replace(re, '');
}

const shellCss = `
.battle-screen--phaser-shell .battle-combat-top {
  border-bottom: none;
  background: transparent;
}

.battle-arena--shell {
  flex: 1;
  min-height: 0;
  padding: 0;
  border: none;
  background: transparent;
}

.battle-arena--shell::before,
.battle-arena--shell::after {
  display: none;
}

`;

if (!css.includes('battle-screen--phaser-shell')) {
  const anchor = '.battle-combat-top {\n  min-height: 0;';
  const idx = css.indexOf(anchor);
  if (idx === -1) {
    throw new Error('[prune-dead-battle-css] anchor .battle-combat-top not found');
  }
  const end = css.indexOf('}', idx) + 2;
  css = `${css.slice(0, end)}\n${shellCss}${css.slice(end)}`;
}

css = css.replace(
  /#btn-back-to-login,\n#btn-enter-world \{\n  min-width: 180px;\n\}\n\n/,
  '.char-select-actions button {\n  min-width: 180px;\n}\n\n',
);
css = css.replace(
  /\.login-box button:hover,\n#btn-enter-world:not\(:disabled\):hover,\n#btn-back-to-login:hover \{/,
  '.login-box button:hover,\n.char-select-actions button:not(:disabled):hover {',
);
css = css.replace(
  /#btn-enter-world:disabled \{\n  opacity: 0\.45;\n  cursor: not-allowed;\n\}\n\n/,
  '.char-select-actions button:disabled {\n  opacity: 0.45;\n  cursor: not-allowed;\n}\n\n',
);
css = css.replace(
  /\.login-box button,\n#btn-enter-world \{/,
  '.login-box button,\n.char-select-actions button {',
);

fs.writeFileSync(path, css);
console.log(`[prune-dead-battle-css] ${before} -> ${css.length} bytes (${before - css.length} removed)`);
