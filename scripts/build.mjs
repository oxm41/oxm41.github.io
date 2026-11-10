import { readFile, writeFile, readdir, mkdir, cp, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from '../vendor/marked.mjs';
import config from '../site.config.mjs';
import { inferMetadata } from '../src/metadata.mjs';
import { icon } from '../src/icons.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'dist');
const content = path.join(root, 'content');
if (path.dirname(out) !== root || path.basename(out) !== 'dist') throw new Error('Invalid output directory');
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
const base = '/' + config.base.split('/').filter(Boolean).join('/') + (config.base === '/' ? '' : '/');
const url = relative => base + relative;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Lowercase editorial text without changing code, URLs, entities, or technical identifiers.
function proseCase(text) {
  return text.replace(/(?:https?:\/\/|mailto:)[^\s<>]+|&(?:#\w+|\w+);|[\w.+/-]+/g, word => {
    if (/^(?:https?:|mailto:|&)/.test(word) || /[0-9_+\/]/.test(word)) return word;
    return word.replace(/\b(?:[A-Z][a-z]+|ALL|BY|EXACTLY|IMPORTANT|NO|NOTE|OFF|ONE|OR|REMINDER)\b/g, part => part.toLowerCase());
  });
}
function editorialTitle(text) {
  const fixed = new Set(['FILE', 'C', 'C++', 'FSWn3d', 'eBPF']);
  return text.replace(/\b[A-Za-z][A-Za-z0-9_]*(?:\+\+)?/g, word => fixed.has(word) || word.includes('_') ? word : word.toLowerCase());
}
const slugify = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const plain = value => value.replace(/!\[\[[^\]]*\]\]/g, ' ').replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, '$2').replace(/\[\[([^\]]+)\]\]/g, '$1').replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/<[^>]*>/g, ' ').replace(/[`#*]/g, '').replace(/\s+/g, ' ').trim();

function frontmatter(source) {
  if (!source.startsWith('---\n')) return { data: {}, body: source };
  const end = source.indexOf('\n---', 4);
  if (end < 0) throw new Error('Unclosed frontmatter');
  const data = {};
  for (const line of source.slice(4, end).split('\n')) {
    const match = line.match(/^([\w-]+):\s*(.*)$/);
    if (!match) continue;
    const [, key, raw] = match;
    if (raw.startsWith('[')) {
      try { data[key] = JSON.parse(raw); }
      catch { throw new Error(`Frontmatter ${key}: use a JSON array, e.g. ["heap", "glibc"]`); }
    } else data[key] = raw === 'true' ? true : raw === 'false' ? false : raw.replace(/^['"]|['"]$/g, '');
  }
  return { data, body: source.slice(end + 4).trim() };
}
const files = (await readdir(content, { recursive: true, withFileTypes: true })).filter(e => e.isFile() && e.name.endsWith('.md')).map(e => path.join(e.parentPath || e.path, e.name)).sort();
const notes = [], skipped = [];
for (const file of files) {
  const relative = path.relative(content, file).replaceAll('\\', '/');
  const source = (await readFile(file, 'utf8')).replace(/^\uFEFF/, '').replaceAll('\r\n', '\n');
  if (/AIza[\w-]{30,}|sk-[\w-]{20,}|gh[pousr]_[\w]{20,}/.test(source)) throw new Error(`Possible credential found: ${relative}`);
  const { data, body } = frontmatter(source);
  if (!body.trim() || data.draft === true || !plain(body.replace(/^#+.*$/gm, '')).trim()) { skipped.push(relative); continue; }
  const originalTitle = path.basename(file, '.md');
  let category = config.categories.find(c => c.folder === relative.split('/')[0])?.id || 'fundamentals';
  const metadata = { ...inferMetadata(originalTitle, body, category), ...data };
  category = metadata.category || category;
  if (!config.categories.some(c => c.id === category)) throw new Error(`Unknown category ${category}: ${relative}`);
  const slug = relative.split('/').map(p => slugify(p.replace(/\.md$/, ''))).join('--');
  const summary = plain(body);
  const description = metadata.description || (summary.length > 155 ? summary.slice(0, 155).replace(/\s+\S*$/, '') + '…' : summary);
  const tags = [...new Set(metadata.tags || [])];
  notes.push({ id: slug, slug, title: editorialTitle(metadata.title), originalTitle, category, categoryLabel: config.categories.find(c => c.id === category).label, topic: editorialTitle(metadata.topic || 'other'), tags, platform: metadata.platform || '', arch: metadata.arch || '', glibc: metadata.glibc || [], event: metadata.event || '', featured: metadata.featured || 0, description: proseCase(description), source: relative, body, text: plain(body), headings: [], links: [], type: 'note' });
}
const references = JSON.parse(await readFile(path.join(content, 'references.json'), 'utf8'));
for (const ref of references) notes.push({ id: 'reference--' + slugify(ref.title), slug: 'reference--' + slugify(ref.title), title: ref.title, originalTitle: ref.filename, category: 'fundamentals', categoryLabel: 'fundamentals', topic: 'assembly & abi', tags: ['assembly', 'calling-convention', 'reference'], platform: '', arch: '', glibc: [], event: '', featured: 0, description: `reference · ${ref.pages} pages · university of virginia.`, source: '', body: '', text: ref.text, headings: [], links: [], type: 'pdf', pdf: ref.filename, pages: ref.pages });
if (new Set(notes.map(n => n.id)).size !== notes.length) throw new Error('Duplicate note slugs');
const noteIndex = new Map();
for (const n of notes) for (const key of [n.originalTitle, n.title, n.source, n.source.replace(/\.md$/, '')]) if (key) noteIndex.set(key.toLowerCase(), n);
const assets = new Map();
for (const entry of await readdir(path.join(root, 'public'), { recursive: true, withFileTypes: true })) if (entry.isFile()) assets.set(entry.name.toLowerCase(), path.relative(path.join(root, 'public'), path.join(entry.parentPath || entry.path, entry.name)).replaceAll('\\', '/'));
const unresolved = [];
let current;
function safeHref(href) { return /^(?:https?:|mailto:|#|\/|\.\/|\.\.\/)/i.test(href) || !/^[a-z][a-z\d+.-]*:/i.test(href) ? href : '#'; }
function highlight(text, lang) {
  if (!/^(python|py|c|cpp|c\+\+|bash|sh|asm|assembly|javascript|js)$/i.test(lang)) return esc(text);
  const tokens = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|\/\/[^\n]*|#[^\n]*|\b(?:0x[\da-fA-F]+|\d+)\b|\b(?:from|import|def|return|if|else|elif|for|while|in|with|as|try|except|break|continue|class|void|int|char|unsigned|long|struct|static|const|sizeof|NULL|True|False|None|mov|push|pop|xor|call|ret|lea|syscall)\b)/g;
  let result = '', at = 0;
  for (const m of text.matchAll(tokens)) {
    result += esc(text.slice(at, m.index));
    const value = m[0];
    const kind = /^(#|\/\/)/.test(value) ? 'comment' : /^["']/.test(value) ? 'string' : /^\d/.test(value) ? 'number' : 'keyword';
    result += `<span class="hl-${kind}">${esc(value)}</span>`;
    at = m.index + value.length;
  }
  return result + esc(text.slice(at));
}
marked.use({ gfm: true, renderer: {
  text(token) {
    return token.tokens ? this.parser.parseInline(token.tokens) : proseCase(token.text);
  },
  heading({ tokens, depth }) {
    const heading = this.parser.parseInline(tokens).replace(/^([IVXLCDM]+)\.(?=\s)/, (_, number) => number.toLowerCase() + '.');
    const text = plain(heading);
    const stem = slugify(text) || 'section';
    let id = stem;
    for (let suffix = 2; current.headings.some(h => h.id === id); suffix++) id = `${stem}-${suffix}`;
    current.headings.push({ id, text, depth });
    return `<h${depth} id="${id}" tabindex="-1">${heading}<a class="heading-anchor" href="#${id}" aria-label="link to section ${esc(text)}">#</a></h${depth}>\n`;
  },
  code({ text, lang = '' }) {
    const language = lang.trim().split(/\s+/)[0].toLowerCase();
    const labels = { py: 'python', python: 'python', c: 'C', cpp: 'C++', bash: 'shell', sh: 'shell', asm: 'assembly' };
    return `<div class="code-block"><div class="code-toolbar"><span>${esc(labels[language] || language || 'code')}</span><button class="copy-code" type="button" aria-label="copy code">${icon('copy')}<span>copy</span></button></div><pre tabindex="0"><code>${highlight(text, language)}</code></pre></div>\n`;
  },
  html({ text }) { return esc(text); },
  link({ href, title, tokens }) {
    const external = /^https?:\/\//.test(href) && !href.startsWith(config.url);
    return `<a href="${esc(safeHref(href))}"${title ? ` title="${esc(title)}"` : ''}${external ? ' target="_blank" rel="noopener noreferrer"' : ''}>${this.parser.parseInline(tokens)}</a>`;
  },
  image({ href, text, title }) {
    return `<img src="${esc(safeHref(href))}" alt="${esc(proseCase(text || 'illustration'))}"${title ? ` title="${esc(title)}"` : ''} loading="lazy" decoding="async" tabindex="0" data-zoom>`;
  },
  table(token) {
    return `<div class="table-scroll" role="region" aria-label="data table" tabindex="0"><table><thead><tr>${token.header.map(cell => `<th>${this.parser.parseInline(cell.tokens)}</th>`).join('')}</tr></thead><tbody>${token.rows.map(row => `<tr>${row.map(cell => `<td>${this.parser.parseInline(cell.tokens)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  }
} });
function transform(source, note) {
  // Fix an accidental nested fence in the original FILE layout note.
  source = source.replace(/```C\n[ \t]+```C\n([\s\S]*?)\n[ \t]+```\n```/g, '```C\n$1\n```');
  let fenced = false;
  return source.split('\n').map(line => {
    if (/^\s*```/.test(line)) { fenced = !fenced; return line; }
    if (fenced) return line;
    // A comparison at the start of a list item is not a blockquote.
    line = line.replace(/^([ \t]*(?:[-+*]|\d+[.)])[ \t]+)>(?==)/, '$1\\>');
    return line.replace(/(!?)\[\[([^\]]+)\]\]/g, (match, embed, value) => {
      const [targetWithHash, alias] = value.split('|');
      const hashAt = targetWithHash.indexOf('#');
      const target = hashAt < 0 ? targetWithHash : targetWithHash.slice(0, hashAt);
      const section = hashAt < 0 ? '' : slugify(targetWithHash.slice(hashAt + 1));
      const linked = noteIndex.get(target.toLowerCase());
      if (linked && !embed) {
        if (linked.id !== note.id) note.links.push(linked.id);
        return `[${alias || linked.title}](${url('notes/' + linked.slug + '/')}${section ? '#' + section : ''})`;
      }
      const asset = assets.get(path.basename(target).toLowerCase());
      if (asset) return `${embed ? '!' : ''}[${embed ? target.replace(/\.[^.]+$/, '').replaceAll('_', ' ') : alias || target}](${url(asset.split('/').map(encodeURIComponent).join('/'))})`;
      if (!target && section) return `[${alias || targetWithHash.slice(1)}](#${section})`;
      unresolved.push({ source: note.source, target });
      return alias || target;
    });
  }).join('\n');
}
for (const note of notes) {
  current = note;
  note.html = note.type === 'pdf'
    ? `<div class="reference-panel">${icon('file')}<div><strong>reference · ${note.pages} pages</strong><p>university of virginia</p><a class="primary-link" href="${url('references/' + encodeURIComponent(note.pdf))}" target="_blank" rel="noopener">open pdf ${icon('external')}</a></div></div><details class="pdf-transcript"><summary>searchable transcript</summary><div class="pdf-text">${esc(note.text)}</div></details>`
    : marked.parse(transform(note.body, note));
  note.links = [...new Set(note.links)];
  if (note.type === 'note') {
    // Keep original code tokens searchable, including angle brackets and symbols.
    const code = [...note.body.matchAll(/^[ \t]*```[^\n]*\n([\s\S]*?)^[ \t]*```/gm)].map(match => match[1]);
    if (code.length) note.text += '\n' + code.join('\n');
  }
  note.minutes = Math.max(1, Math.round(note.text.split(/\s+/).length / 220));
  note.short = note.text.length < 400;
}
for (const note of notes) note.backlinks = notes.filter(n => n.links.includes(note.id)).map(n => n.id);
await cp(path.join(root, 'public'), out, { recursive: true });
await mkdir(path.join(out, 'assets'), { recursive: true });
await mkdir(path.join(out, 'data'), { recursive: true });
for (const file of ['app.mjs', 'search.mjs', 'icons.mjs', 'styles.css']) await cp(path.join(root, 'src', file), path.join(out, 'assets', file));
const manifest = notes.map(({ body, html, ...note }) => note);
await writeFile(path.join(out, 'data/notes.json'), JSON.stringify({ config: { ...config, base }, notes: manifest }));

function tagMarkup(note) { return note.tags.slice(0, 4).map(t => `<a class="tag" href="${url('')}?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join(''); }
function related(note) {
  const connected = [...new Set([...note.links, ...note.backlinks])].map(id => notes.find(n => n.id === id)).filter(Boolean);
  const sameTags = notes.filter(n => n.id !== note.id && n.tags.some(t => note.tags.includes(t))).sort((a, b) => b.tags.filter(t => note.tags.includes(t)).length - a.tags.filter(t => note.tags.includes(t)).length);
  return [...new Map([...connected, ...sameTags].map(n => [n.id, n])).values()].slice(0, 5);
}
function article(note) {
  const list = related(note);
  const tocItems = note.headings.filter(h => h.depth <= 3);
  const mobileToc = tocItems.length ? `<details class="mobile-toc"><summary>table of contents</summary><nav aria-label="table of contents">${tocItems.map(h => `<a href="#${h.id}">${esc(h.text)}</a>`).join('')}</nav></details>` : '';
  const jhtSeries = notes.filter(n => n.platform === 'JHT' && /^bof[1-9]$/.test(n.title)).sort((a, b) => a.title.localeCompare(b.title));
  const position = jhtSeries.findIndex(n => n.id === note.id);
  const previous = position > 0 ? jhtSeries[position - 1] : null;
  const next = position >= 0 ? jhtSeries[position + 1] : null;
  const seriesNav = position < 0 ? '' : `<nav class="series-nav" aria-label="jht series">
    ${previous ? `<a href="${url('notes/' + previous.slug + '/')}">← ${esc(previous.title)}</a>` : ''}
    <a href="${url('')}?category=writeups&amp;platform=JHT&amp;sort=title">jht series · ${position + 1}/${jhtSeries.length}</a>
    ${next ? `<a href="${url('notes/' + next.slug + '/')}">${esc(next.title)} →</a>` : ''}
  </nav>`;
  return `<div class="article-layout"><article class="article"><a class="back-link" href="${url('')}?category=${note.category}">${icon('arrow')} back to ${note.categoryLabel}</a><div class="article-eyebrow">${esc(note.categoryLabel)}<span>/</span>${esc(note.topic)}</div><h1>${esc(note.title)}</h1><div class="article-meta"><span>${note.type === 'pdf' ? 'pdf reference' : note.short ? 'short note' : `${note.minutes} min read`}</span>${note.platform ? `<span>${esc(note.platform.toLowerCase())}</span>` : ''}${note.arch ? `<span>${esc(note.arch)}</span>` : ''}${note.event ? `<span>${esc(note.event.toLowerCase())}</span>` : ''}${note.glibc.length ? `<span>glibc ${note.glibc.map(esc).join(' / ')}</span>` : ''}</div><div class="article-tags">${tagMarkup(note)}</div>${mobileToc}<div class="prose" id="article-content">${note.html}</div>${seriesNav}${list.length ? `<section class="related-section"><div class="section-label">related notes</div>${list.map(n => `<a class="related-link" href="${url('notes/' + n.slug + '/')}"><span>${esc(n.title)}<small>${esc(n.categoryLabel)}</small></span>${icon('arrow')}</a>`).join('')}</section>` : ''}</article><aside class="toc" aria-label="table of contents"><div class="section-label">on this page</div>${tocItems.length ? `<nav>${tocItems.map(h => `<a href="#${h.id}" class="toc-depth-${h.depth}">${esc(h.text)}</a>`).join('')}</nav>` : '<p>short note.</p>'}</aside></div>`;
}
function card(note) { return `<div class="note-row"><a class="note-main" href="${url('notes/' + note.slug + '/')}"><span class="note-category">${esc(note.categoryLabel)}${note.platform ? ' <span>·</span> ' + esc(note.platform.toLowerCase()) : ''}</span><h2>${esc(note.title)} ${icon('arrow')}</h2><p>${esc(note.description)}</p></a><div class="note-bottom"><div class="row-tags">${tagMarkup(note)}</div><span class="reading-time">${note.type === 'pdf' ? 'pdf' : note.short ? 'short note' : note.minutes + ' min read'}</span></div></div>`; }
function library() {
  return `<section class="library"><div class="library-heading"><h1>pwn notes</h1></div><div class="library-shortcuts"><a href="${url('')}?category=fundamentals">${icon('book')} browse fundamentals ${icon('arrow')}</a><a href="${url('')}?category=cheatsheets">${icon('command')} browse cheatsheets ${icon('arrow')}</a></div><div class="library-toolbar"><div class="local-search">${icon('search')}<input id="library-search" type="search" placeholder="search titles, note text, and code…" aria-label="search the library" autocomplete="off"></div><button id="reset-filters" class="text-button" hidden>clear filters</button></div><div class="filters"><label><span class="sr-only">topic</span><select id="filter-topic"><option value="">all topics</option></select></label><label><span class="sr-only">tag</span><select id="filter-tag"><option value="">all tags</option></select></label><label><span class="sr-only">platform</span><select id="filter-platform"><option value="">all platforms</option></select></label></div><div class="list-heading"><div><h2 id="list-title">all notes</h2><span id="result-count">${notes.length}</span></div><label><span class="sr-only">sort</span><select id="sort-order"><option value="recommended">featured</option><option value="title">title a–z</option><option value="length">longest first</option></select></label></div><div id="note-list" aria-live="polite" aria-busy="false">${[...notes].sort((a, b) => (a.featured || 999) - (b.featured || 999) || a.title.localeCompare(b.title)).slice(0, 15).map(card).join('')}</div><div id="pagination" class="pagination"></div><noscript><p>all notes (enable JavaScript to search and filter)</p>${notes.map(n => `<p><a href="${url('notes/' + n.slug + '/')}">${esc(n.title)}</a> · ${esc(n.categoryLabel)}</p>`).join('')}</noscript></section>`;
}
function shell(main, note = null, missing = false) {
  const title = note ? `${note.title} — ${config.name}` : missing ? `page not found — ${config.name}` : `${config.title} — ${config.name}`;
  const canonical = config.url + url(note ? 'notes/' + note.slug + '/' : '');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><meta name="description" content="${esc(note?.description || config.description)}"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(note?.description || config.description)}"><meta property="og:type" content="${note ? 'article' : 'website'}"><meta property="og:url" content="${esc(canonical)}"><meta name="theme-color" content="#f5f6f2"><title>${esc(title)}</title>${missing ? '<meta name="robots" content="noindex">' : `<link rel="canonical" href="${canonical}">`}<link rel="icon" type="image/svg+xml" href="${url('favicon.svg')}"><link rel="stylesheet" href="${url('assets/styles.css')}"><script>try{var t=localStorage.getItem('oxm41-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch(e){}</script><script type="module" src="${url('assets/app.mjs')}"></script></head><body data-note="${note?.id || ''}" data-base="${base}"${missing ? ' data-missing="true"' : ''}><a class="skip-link" href="#main">skip to content</a><div class="sidebar-scrim" id="sidebar-scrim" hidden></div><aside class="sidebar" id="sidebar"><a class="brand" href="${url('')}">oxm41</a><button id="close-menu" class="icon-button mobile-close" aria-label="close menu">${icon('close')}</button><div class="sidebar-section-label">library</div><nav class="main-nav" aria-label="categories"><a href="${url('')}" data-category="" class="nav-item${!note ? ' active' : ''}">${icon('grid')}<span>all notes</span><span class="nav-count">${notes.length}</span></a>${config.categories.map(c => `<a href="${url('')}?category=${c.id}" data-category="${c.id}" class="nav-item${note?.category === c.id ? ' active' : ''}">${icon(c.icon)}<span>${c.label}</span><span class="nav-count">${notes.filter(n => n.category === c.id).length}</span></a>`).join('')}</nav><div class="sidebar-section-label topic-label">featured topics</div><nav class="topic-nav" aria-label="featured topics">${['stack & rop', 'heap', 'format string', 'fsop & glibc'].map(topic => `<a href="${url('')}?topic=${encodeURIComponent(topic)}"><span class="topic-dot"></span>${esc(topic)}<span>${notes.filter(n => n.topic === topic).length}</span></a>`).join('')}</nav><div class="sidebar-bottom"><a href="${config.github}" target="_blank" rel="noopener">github ${icon('external')}</a><span>© oxm41</span></div></aside><div class="workspace"><header class="topbar"><div class="topbar-left"><button id="open-menu" class="icon-button" aria-label="open menu" aria-expanded="false" aria-controls="sidebar">${icon('menu')}</button><span class="breadcrumb"><span>library</span>${icon('chevron')}<span id="breadcrumb-current">${esc(note?.categoryLabel || 'all notes')}</span></span></div><div class="topbar-actions"><button class="search-trigger" id="open-search">${icon('search')}<span>quick search…</span><kbd>ctrl k</kbd></button><span class="topbar-divider"></span><button id="theme-toggle" class="icon-button" aria-label="toggle light or dark theme" title="toggle light or dark theme">${icon('sun', 'sun-icon')}${icon('moon', 'moon-icon')}</button></div></header><main id="main" tabindex="-1">${main}</main></div><dialog id="search-dialog" class="search-dialog" aria-label="search all notes"><div class="dialog-search">${icon('search')}<input id="global-search" type="search" placeholder="search notes, techniques, or function names…" aria-label="search query" autocomplete="off"><button class="escape-key" id="close-search" aria-label="close search">esc</button></div><div class="search-description" id="search-description">search titles, note text, and code.</div><div id="search-results" class="search-results" aria-live="polite"></div><div class="search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> select <kbd>↵</kbd> open</span><span>all notes</span></div></dialog><dialog id="image-dialog" class="image-dialog" aria-label="enlarged image"><button id="close-image" class="icon-button" aria-label="close image">${icon('close')}</button><img alt=""></dialog><div id="toast" class="toast" role="status"></div></body></html>`;
}
await writeFile(path.join(out, 'index.html'), shell(library()));
await writeFile(path.join(out, '404.html'), shell(`<section class="not-found"><div class="eyebrow">404 / page not found</div><h1>page not found</h1><p>this page may have moved.</p><a class="primary-link" href="${url('')}">back to the library ${icon('arrow')}</a></section>`, null, true));
for (const note of notes) {
  const dir = path.join(out, 'notes', note.slug);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'index.html'), shell(article(note), note));
}
await writeFile(path.join(out, '.nojekyll'), '');
await writeFile(path.join(out, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${config.url}${url('sitemap.xml')}\n`);
await writeFile(path.join(out, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${['', ...notes.map(n => 'notes/' + n.slug + '/')].map(p => `<url><loc>${esc(config.url + url(p))}</loc></url>`).join('')}</urlset>`);
await writeFile(path.join(out, 'build-report.json'), JSON.stringify({ published: notes.length, markdown: notes.filter(n => n.type === 'note').length, references: references.length, skipped, unresolved }, null, 2));
console.log(`Built ${notes.length} pages (${notes.filter(n => n.type === 'note').length} notes + ${references.length} PDFs). Skipped ${skipped.length} empty/draft notes. Unresolved links: ${unresolved.length}.`);
