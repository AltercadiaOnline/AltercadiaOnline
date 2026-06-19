#!/usr/bin/env node
const base = (process.env.AUDIT_BASE_URL ?? 'https://altercadia-online.vercel.app').replace(/\/$/, '');
const seen = new Set();
const missing = [];

async function check(url) {
  if (seen.has(url)) return;
  seen.add(url);

  const response = await fetch(url);
  const contentType = response.headers.get('content-type') ?? '';

  if (!response.ok) {
    missing.push([url, String(response.status)]);
    return;
  }

  if (url.endsWith('.js') && !contentType.includes('javascript')) {
    missing.push([url, `wrong-type:${contentType.slice(0, 60)}`]);
    return;
  }

  if (!url.endsWith('.js')) return;

  const text = await response.text();
  const imports = [...text.matchAll(/from ['"](\.\.?\/[^'"]+)['"]/g)].map((match) => match[1]);
  for (const imp of imports) {
    await check(new URL(imp, url).href);
  }
}

await check(`${base}/client/browser/main.js`);
console.log(`checked ${seen.size} urls from ${base}`);
for (const [url, reason] of missing) {
  console.log('MISSING', reason, url);
}
if (missing.length === 0) {
  console.log('all imports OK from main.js chain');
  process.exit(0);
}
process.exit(1);
