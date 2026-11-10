import { access, cp, readdir, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.argv[2] || path.join(root, '..'));
const englishEditions = new Set([
  'cheatsheet/script template.md',
  'techniques/unsorted bin - largebin attack.md',
  'writeup/relay - HTB globlal 2026.md',
  'writeup/time lord I - BKSEC TTV 2026.md'
]);
if (source === root || source.startsWith(root + path.sep)) throw new Error('Source must be the original Obsidian vault.');
for (const folder of ['notes', 'techniques', 'kernel', 'writeup', 'cheatsheet']) {
  const entries = await readdir(path.join(source, folder), { recursive: true, withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const original = path.join(entry.parentPath || entry.path, entry.name);
    const relative = path.relative(source, original);
    const target = path.join(root, 'content', relative);
    if (englishEditions.has(relative.split(path.sep).join('/')) && await access(target).then(() => true, () => false)) {
      console.log(`kept the English edition of ${relative}`);
      continue;
    }
    const text = await readFile(original, 'utf8');
    if (/AIza[\w-]{30,}|sk-[\w-]{20,}|gh[pousr]_[\w]{20,}/.test(text)) throw new Error(`Possible credential in ${path.relative(source, original)}. Remove it before importing.`);
    await mkdir(path.dirname(target), { recursive: true });
    await cp(original, target);
  }
}
for (const folder of ['image', 'kernel/attachments']) await cp(path.join(source, folder), path.join(root, 'public', folder), { recursive: true });
await mkdir(path.join(root, 'public/references'), { recursive: true });
for (const file of await readdir(path.join(source, 'notes'))) if (file.endsWith('.pdf')) await cp(path.join(source, 'notes', file), path.join(root, 'public/references', file));
console.log('Notes and attachments synced. Run node scripts/build.mjs to rebuild.');
