#!/usr/bin/env node
const startUrl = process.argv[2] ?? 'https://altercadia-online.vercel.app/client/browser/appScreens.js';
const seen = new Set();
const problems = [];

async function check(url) {
  if (seen.has(url)) return;
  seen.add(url);

  const response = await fetch(url);
  const contentType = response.headers.get('content-type') ?? '';
  const text = response.ok ? await response.text() : '';

  if (!response.ok) {
    problems.push({ url, issue: `HTTP ${response.status}` });
    return;
  }

  if (url.endsWith('.js')) {
    if (contentType.includes('text/html') || text.trimStart().startsWith('<!DOCTYPE') || text.trimStart().startsWith('<html')) {
      problems.push({ url, issue: 'returns HTML instead of JS (SPA rewrite?)' });
      return;
    }
  }

  if (!url.endsWith('.js')) return;

  const imports = [...text.matchAll(/from ['"](\.\.?\/[^'"]+)['"]/g)].map((match) => match[1]);
  for (const imp of imports) {
    await check(new URL(imp, url).href);
  }
}

await check(startUrl);
console.log(`Checked ${seen.size} URLs from ${startUrl}`);
for (const problem of problems) {
  console.log(`${problem.issue}: ${problem.url}`);
}
process.exit(problems.length ? 1 : 0);
