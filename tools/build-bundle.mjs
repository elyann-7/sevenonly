// SEVEN — copies all content/*.json into content/content-bundle.js.
// The bundle lets the pages work when opened straight from a folder (double-click),
// where browsers block reading .json files. On the live website the .json files
// are read directly; GitHub Actions and the admin page rebuild this bundle
// automatically. After editing JSON on your computer, run:  node tools/build-bundle.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
const dir = process.argv[2] || '.';
const names = ['site', 'pages', 'menu', 'socials', 'media', 'settings', 'instagram-feed'];
const files = {};
for (const n of names) {
  const p = join(dir, 'content', `${n}.json`);
  if (existsSync(p)) files[`content/${n}.json`] = JSON.parse(readFileSync(p, 'utf8'));
}
writeFileSync(join(dir, 'content', 'content-bundle.js'),
  `/* Generated from content/*.json — do not edit. Edit the .json files instead. */\nwindow.SEVEN_CONTENT_BUNDLE = ${JSON.stringify(files)};\n`);
console.log(`content-bundle.js written (${Object.keys(files).length} files).`);
