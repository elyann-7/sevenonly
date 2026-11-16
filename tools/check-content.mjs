// SEVEN — checks the content files before the website is published.
// Run by GitHub Actions on every push (and locally with: node tools/check-content.mjs).
// If anything is wrong the deploy stops, so a typing mistake never breaks the live site.
import { readFileSync, existsSync } from 'node:fs';

const FILES = ['site', 'pages', 'menu', 'socials', 'media', 'settings', 'instagram-feed'].map((n) => `content/${n}.json`);
const errors = []; const warnings = [];
const data = {};
for (const f of FILES) {
  if (!existsSync(f)) { errors.push(`${f} is missing`); continue; }
  try { data[f] = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { errors.push(`${f} is not valid JSON — ${e.message}. (Usually a missing comma, an extra comma before } or ], or a missing quote.)`); }
}

// Every local file the content points at must exist (case-sensitive, like GitHub Pages).
const walk = (node, where, file) => {
  if (Array.isArray(node)) node.forEach((n, i) => walk(n, `${where}[${i}]`, file));
  else if (node && typeof node === 'object') Object.entries(node).forEach(([k, v]) => walk(v, where ? `${where}.${k}` : k, file));
  else if (typeof node === 'string') {
    const v = node.trim().split(/[?#]/)[0];
    if (/^assets\//.test(v) && !existsSync(decodeURI(v))) errors.push(`${file} → ${where}: file "${v}" does not exist (check spelling and capital letters)`);
    if (/(^|\.)link$|url$|Link$/i.test(where) && node.trim() === '#') warnings.push(`${file} → ${where}: link is "#" (goes nowhere)`);
  }
};
Object.entries(data).forEach(([f, d]) => walk(d, '', f));

const menu = data['content/menu.json']?.products;
if (menu) {
  const ids = new Set((menu.categories || []).map((c) => c.id));
  (menu.items || []).forEach((it, i) => {
    if (!ids.has(it.category)) errors.push(`content/menu.json → item ${i + 1} "${it.name}": category "${it.category}" does not exist (use one of: ${[...ids].join(', ')})`);
    if (/^item name$/i.test(it.name || '') && it.visible !== false) warnings.push(`content/menu.json → item ${i + 1}: still the placeholder "Item Name"`);
  });
}

warnings.forEach((w) => console.log(`::warning::${w}`));
if (errors.length) { errors.forEach((e) => console.log(`::error::${e}`)); console.log(`\n${errors.length} problem(s) — the website was NOT published. Fix the file(s) above and commit again.`); process.exit(1); }
console.log(`Content OK (${FILES.length} files, ${warnings.length} warning(s)).`);
