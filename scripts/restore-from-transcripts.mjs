import fs from 'fs';
import path from 'path';

const transcriptDir = path.join(
  process.env.USERPROFILE ?? '',
  '.cursor/projects/c-Users-Usuario-Desktop-MMO-BROWSER/agent-transcripts',
);

const endings = {
  'polygonHitbox.ts': '/shared/world/polygonHitbox.ts',
  'pveEncounterProtocol.ts': '/shared/world/pveEncounterProtocol.ts',
  'achievementTypes.ts': '/shared/achievements/achievementTypes.ts',
  'circleHitbox.ts': '/shared/world/circleHitbox.ts',
  'creatureWanderConfig.ts': '/shared/world/creatureWanderConfig.ts',
  'achievementCatalog.ts': '/shared/achievements/achievementCatalog.ts',
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
const files = walk(transcriptDir);

for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split(/\n/);
  for (const line of lines) {
    if (!line.includes('"Write"') || !line.includes('"contents"')) continue;
    let obj;
    try {
      obj = JSON.parse(line);
    } catch {
      continue;
    }
    const content = obj?.message?.content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part?.type !== 'tool_use' || part?.name !== 'Write') continue;
      const p = String(part.input?.path ?? '').replace(/\\/g, '/');
      const c = part.input?.contents;
      if (typeof c !== 'string' || c.length < 20) continue;
      for (const [name, ending] of Object.entries(endings)) {
        if (!p.endsWith(ending)) continue;
        if (!found[name] || c.length >= found[name].length) {
          found[name] = c;
        }
      }
    }
  }
}

const mapping = {
  'polygonHitbox.ts': 'src/shared/world/polygonHitbox.ts',
  'pveEncounterProtocol.ts': 'src/shared/world/pveEncounterProtocol.ts',
  'achievementTypes.ts': 'src/shared/achievements/achievementTypes.ts',
  'circleHitbox.ts': 'src/shared/world/circleHitbox.ts',
  'creatureWanderConfig.ts': 'src/shared/world/creatureWanderConfig.ts',
  'achievementCatalog.ts': 'src/shared/achievements/achievementCatalog.ts',
};

const report = {};
for (const [name, dest] of Object.entries(mapping)) {
  const body = found[name];
  report[name] = body ? body.length : 0;
  if (!body) continue;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.writeFileSync(dest, body);
}

console.log(JSON.stringify(report, null, 2));
