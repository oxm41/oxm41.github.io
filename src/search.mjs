export function normalize(value = '') {
  return value.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase();
}
export const aliases = {
  uaf: 'use-after-free', dbf: 'double-free', fmtstr: 'format-string', fsb: 'format-string',
  bof: 'buffer-overflow', 'ret2shellcode': 'shellcode', x64: 'amd64', x86_64: 'amd64', pwntool: 'pwntools'
};
const simplify = text => normalize(text).replace(/[-_]/g, ' ');
export function prepareNotes(notes) {
  return notes.map(note => ({
    ...note,
    _title: simplify(note.title),
    _original: simplify(note.originalTitle || ''),
    _meta: simplify(`${note.tags.join(' ')} ${note.categoryLabel} ${note.topic} ${note.platform} ${note.arch} ${(note.glibc || []).join(' ')} ${(note.headings || []).map(h => h.text).join(' ')}`),
    _text: simplify(note.text)
  }));
}
export function findNotes(notes, query = '', filters = {}) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean)
    .map(term => [...new Set([simplify(term), simplify(aliases[term] || term)])].filter(value => value.trim()))
    .filter(variants => variants.length);
  const phrase = simplify(query).trim();
  return notes.filter(n => (!filters.category || n.category === filters.category)
    && (!filters.tag || n.tags.includes(filters.tag))
    && (!filters.topic || n.topic === filters.topic)
    && (!filters.platform || n.platform === filters.platform))
    .map(n => {
      let score = phrase && n._title === phrase ? 120 : 0;
      for (const variants of terms) {
        const [term] = variants;
        if (n._title.includes(term)) score += 45;
        else if (n._original.includes(term) || variants.some(value => n._title.includes(value))) score += 35;
        else if (variants.some(value => n._meta.includes(value))) score += 22;
        else if (variants.some(value => n._text.includes(value))) score += 5;
        else return null;
      }
      return { note: n, score };
    }).filter(Boolean)
    .sort((a, b) => b.score - a.score || (a.note.featured || 999) - (b.note.featured || 999) || a.note.title.localeCompare(b.note.title, 'vi'))
    .map(r => r.note);
}
export function excerpt(note, query = '') {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean)
    .flatMap(term => [term, aliases[term]].filter(Boolean));
  const text = note.text.replace(/\s+/g, ' ');
  const simple = normalize(text);
  let pos = -1;
  for (const term of terms) { pos = simple.indexOf(term); if (pos >= 0) break; }
  if (pos < 0) return note.description;
  const start = Math.max(0, pos - 65);
  return `${start ? '…' : ''}${text.slice(start, start + 185)}${start + 185 < text.length ? '…' : ''}`;
}
