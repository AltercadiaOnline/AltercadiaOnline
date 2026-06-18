const base = process.argv[2] ?? 'https://altercadia-online.vercel.app';
const seen = new Set();
const failed = [];

async function resolveUrl(fromUrl, spec) {
  if (spec.startsWith('http') || spec.startsWith('//')) return null;
  if (!spec.startsWith('.')) return null;
  return new URL(spec, new URL(fromUrl)).href;
}

async function walk(url, depth = 0) {
  if (seen.has(url) || depth > 14) return;
  seen.add(url);

  let text;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      failed.push({ url, status: response.status });
      return;
    }
    text = await response.text();
  } catch (error) {
    failed.push({ url, status: `fetch err: ${error}` });
    return;
  }

  const importRe = /from\s+['"]([^'"]+)['"]/g;
  for (const match of text.matchAll(importRe)) {
    const next = await resolveUrl(url, match[1]);
    if (next) await walk(next, depth + 1);
  }
}

await walk(`${base}/client/browser/main.js`);
console.log(`checked ${seen.size} modules`);
if (!failed.length) {
  console.log('ALL OK');
} else {
  for (const item of failed) {
    console.log(item.status, item.url);
  }
  process.exit(1);
}
