const base = 'https://altercadia-online.vercel.app';
const start = '/client/browser/main.js';
const seen = new Set();
const failed = [];

function resolveImport(fromUrl, imp) {
  return new URL(imp, `https://x${fromUrl}`).pathname;
}

async function check(url, from) {
  if (seen.has(url)) return;
  seen.add(url);

  try {
    const response = await fetch(`${base}${url}`);
    if (!response.ok) {
      failed.push({ url, status: response.status, from });
      return;
    }
    if (!url.endsWith('.js')) return;

    const text = await response.text();
    const importRe = /from\s+['"]([^'"]+\.js)['"]/g;
    let match = importRe.exec(text);
    while (match) {
      const imp = match[1];
      if (!imp.startsWith('http')) {
        await check(resolveImport(url, imp), url);
      }
      match = importRe.exec(text);
    }
  } catch (error) {
    failed.push({ url, error: String(error), from });
  }
}

await check(start, '');
console.log(`checked ${seen.size} modules`);
if (failed.length === 0) {
  console.log('all imports OK');
} else {
  console.log(JSON.stringify(failed, null, 2));
}
