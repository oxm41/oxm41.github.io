import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findNotes, prepareNotes } from '../src/search.mjs';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const { config, notes } = JSON.parse(await readFile(path.join(dist, 'data/notes.json'), 'utf8'));
const prepared = prepareNotes(notes);
assert.ok(notes.length > 0, 'The library has no published notes');
for (const category of config.categories) {
  assert.ok(findNotes(prepared, '', { category: category.id }).length, `Empty category: ${category.id}`);
}

const files = (await readdir(dist, { recursive: true, withFileTypes: true }))
  .filter(entry => entry.isFile() && entry.name.endsWith('.html'));
const pages = new Map();
for (const file of files) {
  const filename = path.join(file.parentPath || file.path, file.name);
  pages.set(path.normalize(filename), await readFile(filename, 'utf8'));
}
assert.equal(pages.size, notes.length + 2, 'Missing generated pages');
const checked = new Set();
for (const [filename, html] of pages) {
  assert.doesNotMatch(html, /AIza[\w-]{30,}|sk-[\w-]{20,}|gh[pousr]_[\w]{20,}/, `Possible credential: ${filename}`);
  for (const [, link] of html.matchAll(/(?:href|src)="(\/[^"]*|#[^"]+)"/g)) {
    if (link.startsWith('//')) continue;
    let target = filename;
    if (!link.startsWith('#')) {
      const pathname = new URL(link, 'https://example.invalid').pathname;
      assert.ok(pathname.startsWith(config.base), `Unexpected link prefix: ${link}`);
      target = path.join(dist, decodeURIComponent(pathname.slice(config.base.length)));
      if (pathname.endsWith('/')) target = path.join(target, 'index.html');
    }
    const hash = link.includes('#') ? decodeURIComponent(link.split('#')[1]) : '';
    const key = target + '#' + hash;
    if (checked.has(key)) continue;
    const exists = await stat(target).then(result => result.isFile(), () => false);
    assert.ok(exists, `Missing link target ${link} from ${filename}`);
    if (hash && pages.has(target)) {
      assert.ok(pages.get(target).includes(`id="${hash}"`), `Missing section ${link} from ${filename}`);
    }
    checked.add(key);
  }
}
console.log(`Checked ${pages.size} HTML pages and ${checked.size} internal links and assets.`);
