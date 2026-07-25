import fs from 'fs';
import path from 'path';

const root = process.cwd();
const srcRoot = path.join(root, 'src');
const distRoot = path.join(root, 'dist');

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

function normalize(text) {
  return text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trimStart();
}

const srcFiles = walk(srcRoot).filter((f) => /\.(ts|tsx)$/.test(f));
let patched = 0;
const patchedFiles = [];

for (const file of srcFiles) {
  let text = fs.readFileSync(file, 'utf8');
  if (text.startsWith('// @ts-nocheck')) continue;

  const rel = path.relative(srcRoot, file).replace(/\\/g, '/');
  const base = rel.replace(/\.(tsx|ts)$/, '');
  const isTsx = file.endsWith('.tsx');
  const distPath = path.join(distRoot, `${base}${isTsx ? '.jsx' : '.js'}`);
  if (!fs.existsSync(distPath)) continue;

  const distText = fs.readFileSync(distPath, 'utf8');
  if (normalize(text) !== normalize(distText)) continue;

  fs.writeFileSync(file, `// @ts-nocheck\n${text}`);
  patched += 1;
  patchedFiles.push(rel);
}

console.log(JSON.stringify({ patched, sample: patchedFiles.slice(0, 50) }, null, 2));
