import fs from 'fs';
import path from 'path';

const transcriptDir = path.join(
  process.env.USERPROFILE ?? '',
  '.cursor/projects/c-Users-Usuario-Desktop-MMO-BROWSER/agent-transcripts',
);

const endings = {
  'playerHpBonusBreakdown.ts': '/shared/character/playerHpBonusBreakdown.ts',
  'BattleArenaCanvas.ts': '/client/ui/battle/BattleArenaCanvas.ts',
  'pveEncounterManager.ts': '/server/world/pveEncounterManager.ts',
  'subscribeExternalStore.ts': '/client/app/hooks/subscribeExternalStore.ts',
};

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else if (ent.name.endsWith('.jsonl')) out.push(full);
  }
  return out;
}

const found = {};
for (const file of walk(transcriptDir)) {
  for (const line of fs.readFileSync(file, 'utf8').split(/\n/)) {
    if (!line.includes('"Write"') || !line.includes('"contents"')) continue;
    let obj;
    try { obj = JSON.parse(line); } catch { continue; }
    const content = obj?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part?.type !== 'tool_use' || part?.name !== 'Write') continue;
      const p = String(part.input?.path ?? '').replace(/\\/g, '/');
      const c = part.input?.contents;
      if (typeof c !== 'string') continue;
      for (const [name, ending] of Object.entries(endings)) {
        if (!p.endsWith(ending)) continue;
        if (!found[name] || c.length >= found[name].length) found[name] = c;
      }
    }
  }
}

const mapping = {
  'playerHpBonusBreakdown.ts': 'src/shared/character/playerHpBonusBreakdown.ts',
  'BattleArenaCanvas.ts': 'src/client/ui/battle/BattleArenaCanvas.ts',
  'pveEncounterManager.ts': 'src/server/world/pveEncounterManager.ts',
  'subscribeExternalStore.ts': 'src/client/app/hooks/subscribeExternalStore.ts',
};

const report = {};
for (const [name, dest] of Object.entries(mapping)) {
  report[name] = found[name]?.length ?? 0;
  if (!found[name]) continue;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, found[name]);
}
console.log(JSON.stringify(report, null, 2));
