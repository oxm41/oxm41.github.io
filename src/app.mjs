import { prepareNotes, findNotes, excerpt, normalize } from './search.mjs';
import { icon } from './icons.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const base = document.body.dataset.base;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pageSize = 15;
let payloadPromise;
const loadNotes = () => payloadPromise ||= fetch(base + 'data/notes.json').then(r => {
  if (!r.ok) throw new Error('could not load the notes.');
  return r.json();
}).then(data => ({ ...data, notes: prepareNotes(data.notes) })).catch(error => { payloadPromise = null; throw error; });
const noteUrl = (note, query = '') => base + 'notes/' + note.slug + '/' + (query ? '?q=' + encodeURIComponent(query) : '');
const queryTerms = query => query.trim().split(/\s+/).filter(Boolean);
function highlighted(text, query) {
  const terms = queryTerms(query).map(normalize).filter(Boolean);
  if (!terms.length) return esc(text);
  // Work in original characters so Vietnamese accents do not shift match offsets.
  const chars = [...text];
  const map = [], flattened = [];
  chars.forEach((char, i) => { for (const c of normalize(char)) { flattened.push(c); map.push(i); } });
  const normalized = flattened.join('');
  const ranges = [];
  for (const term of terms) {
    let pos = 0;
    while ((pos = normalized.indexOf(term, pos)) >= 0) {
      ranges.push([map[pos], map[pos + term.length - 1] + 1]);
      pos += term.length;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged = [];
  for (const r of ranges) {
    const last = merged.at(-1);
    if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
    else merged.push(r);
  }
  let html = '', offset = 0;
  for (const [start, end] of merged) {
    html += esc(chars.slice(offset, start).join('')) + '<mark>' + esc(chars.slice(start, end).join('')) + '</mark>';
    offset = end;
  }
  return html + esc(chars.slice(offset).join(''));
}
let toastTimer;
function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('visible'), 2200);
}
$('#theme-toggle').addEventListener('click', () => {
  const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem('oxm41-theme', next); } catch {}
});

function closeMenu() {
  document.body.classList.remove('menu-open');
  $('#sidebar-scrim').hidden = true;
  $('.workspace').inert = false;
  $('#open-menu').setAttribute('aria-expanded', 'false');
  $('#open-menu').focus();
}
$('#open-menu').addEventListener('click', () => {
  document.body.classList.add('menu-open');
  $('#sidebar-scrim').hidden = false;
  $('.workspace').inert = true;
  $('#open-menu').setAttribute('aria-expanded', 'true');
  $('#close-menu').focus();
});
$('#close-menu').addEventListener('click', closeMenu);
$('#sidebar-scrim').addEventListener('click', closeMenu);
window.matchMedia('(min-width: 761px)').addEventListener('change', event => { if (event.matches && document.body.classList.contains('menu-open')) closeMenu(); });

const searchDialog = $('#search-dialog');
const globalSearch = $('#global-search');
let selectedResult = 0, searchVersion = 0;
let searchOpener;
async function renderGlobalSearch() {
  const version = ++searchVersion;
  const query = globalSearch.value;
  try {
    const { notes } = await loadNotes();
    if (version !== searchVersion) return;
    const results = findNotes(notes, query);
    selectedResult = 0;
    $('#search-description').textContent = query.trim() ? `${results.length} matches in titles, note text, and code` : 'suggested notes · type to search the whole library';
    $('#search-results').innerHTML = results.length ? results.slice(0, 20).map((n, i) => `<a id="search-result-${i}" class="search-result${i === 0 ? ' is-active' : ''}" href="${esc(noteUrl(n, query))}"><div class="search-result-meta">${esc(n.categoryLabel)}${n.platform ? ' · ' + esc(n.platform.toLowerCase()) : ''}</div><div class="search-result-title">${highlighted(n.title, query)}${icon('arrow')}</div><p>${highlighted(excerpt(n, query), query)}</p></a>`).join('') : `<div class="empty-state">${icon('search')}<h3>no matching notes</h3><p>try a technique, a function name, or a shorter query.</p></div>`;
  } catch {
    $('#search-results').innerHTML = '<p class="search-error">could not load notes. check your connection and try again.</p>';
  }
}
function openSearch() {
  if (document.body.classList.contains('menu-open')) closeMenu();
  searchOpener = document.activeElement;
  if (!searchDialog.open) searchDialog.showModal();
  globalSearch.focus();
  globalSearch.select();
  renderGlobalSearch();
}
$('#open-search').setAttribute('aria-label', 'quick search');
$('#open-search').addEventListener('click', openSearch);
$('#close-search').addEventListener('click', () => searchDialog.close());
searchDialog.addEventListener('close', () => searchOpener?.focus());
searchDialog.addEventListener('click', event => { if (event.target === searchDialog) { const rect = searchDialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) searchDialog.close(); } });
globalSearch.addEventListener('input', renderGlobalSearch);
globalSearch.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    event.preventDefault();
    searchDialog.close();
    return;
  }
  const results = $$('.search-result');
  if (!results.length) return;
  if (['ArrowDown', 'ArrowUp'].includes(event.key)) {
    event.preventDefault();
    selectedResult = (selectedResult + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % results.length;
    results.forEach((n, i) => n.classList.toggle('is-active', i === selectedResult));
    results[selectedResult].scrollIntoView({ block: 'nearest' });
  } else if (event.key === 'Enter') { event.preventDefault(); results[selectedResult].click(); }
});
document.addEventListener('keydown', event => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openSearch(); }
  if (event.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && !document.activeElement.isContentEditable && !searchDialog.open && !$('#image-dialog').open) { event.preventDefault(); openSearch(); }
  if (document.body.classList.contains('menu-open')) {
    if (event.key === 'Escape') closeMenu();
    if (event.key === 'Tab') {
      const elements = [...$('#sidebar').querySelectorAll('a,button')].filter(n => n.getClientRects().length);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  }
});

if ($('#note-list')) {
  const params = new URLSearchParams(location.search);
  const state = { q: params.get('q') || '', category: params.get('category') || '', tag: params.get('tag') || '', topic: params.get('topic') || '', platform: params.get('platform') || '', sort: params.get('sort') || 'recommended', page: Math.max(1, Math.trunc(Number(params.get('page'))) || 1) };
  let libraryData;
  const updateUrl = () => {
    const p = new URLSearchParams();
    for (const [key, value] of Object.entries(state)) if (value && !(key === 'page' && value === 1) && !(key === 'sort' && value === 'recommended')) p.set(key, value);
    history.replaceState(null, '', base + (p.size ? '?' + p : ''));
  };
  function fillOptions(id, values, label, selected) {
    const select = $('#' + id);
    select.innerHTML = `<option value="">${label}</option>` + [...new Set(values)].filter(Boolean).sort((a, b) => a.localeCompare(b, 'en', { numeric: true })).map(value => `<option value="${esc(value)}">${esc(id === 'filter-platform' ? value.toLowerCase() : value)}</option>`).join('');
    select.value = selected;
    select.classList.toggle('has-value', !!selected);
  }
  function renderLibrary() {
    if (!libraryData) return;
    const { notes, config } = libraryData;
    let results = findNotes(notes, state.q, state);
    if (state.sort === 'title') results.sort((a, b) => a.title.localeCompare(b.title, 'en'));
    else if (state.sort === 'length') results.sort((a, b) => b.text.length - a.text.length);
    const pages = Math.max(1, Math.ceil(results.length / pageSize));
    state.page = Math.min(state.page, pages);
    const start = (state.page - 1) * pageSize;
    const categoryLabel = config.categories.find(c => c.id === state.category)?.label || 'all notes';
    $('#list-title').textContent = state.q ? 'search results' : categoryLabel;
    $('#result-count').textContent = results.length;
    $('#breadcrumb-current').textContent = categoryLabel;
    $$('.nav-item').forEach(n => { const active = n.dataset.category === state.category; n.classList.toggle('active', active); if (active) n.setAttribute('aria-current', 'page'); else n.removeAttribute('aria-current'); });
    $('#reset-filters').hidden = !Object.entries(state).some(([key, value]) => !['page', 'sort'].includes(key) && value);
    $('#note-list').innerHTML = results.length ? results.slice(start, start + pageSize).map(n => `<div class="note-row"><a class="note-main" href="${esc(noteUrl(n, state.q))}"><span class="note-category">${esc(n.categoryLabel)}${n.platform ? ' <span>·</span> ' + esc(n.platform.toLowerCase()) : ''}${n.type === 'pdf' ? ' <span>·</span> pdf' : ''}</span><h2>${highlighted(n.title, state.q)}${icon('arrow')}</h2><p>${highlighted(excerpt(n, state.q), state.q)}</p></a><div class="note-bottom"><div class="row-tags">${n.tags.slice(0, 4).map(tag => `<a class="tag${state.tag === tag ? ' selected' : ''}" href="${base}?tag=${encodeURIComponent(tag)}" data-tag="${esc(tag)}">${esc(tag)}</a>`).join('')}</div><span class="reading-time">${n.type === 'pdf' ? n.pages + ' pages · pdf' : n.short ? 'short note' : n.minutes + ' min read'}</span></div></div>`).join('') : `<div class="empty-state">${icon('search')}<h3>no matching notes</h3><p>try another query or remove a filter.</p><button type="button" data-reset>clear search and filters</button></div>`;
    $('#pagination').innerHTML = results.length ? `<span>${start + 1}–${Math.min(start + pageSize, results.length)} / ${results.length} notes</span><div class="page-controls"><button type="button" data-page="${state.page - 1}" ${state.page <= 1 ? 'disabled' : ''} aria-label="previous page">←</button><span>${state.page} / ${pages}</span><button type="button" data-page="${state.page + 1}" ${state.page >= pages ? 'disabled' : ''} aria-label="next page">→</button></div>` : '';
    for (const key of ['topic', 'tag', 'platform']) $('#filter-' + key).classList.toggle('has-value', !!state[key]);
    updateUrl();
  }
  function reset() {
    for (const key of ['q', 'category', 'tag', 'topic', 'platform']) state[key] = '';
    state.page = 1;
    $('#library-search').value = '';
    for (const key of ['topic', 'tag', 'platform']) $('#filter-' + key).value = '';
    renderLibrary();
  }
  $('#library-search').value = state.q;
  $('#sort-order').value = state.sort;
  $('#library-search').addEventListener('input', event => { state.q = event.target.value; state.page = 1; renderLibrary(); });
  $('#reset-filters').addEventListener('click', reset);
  for (const key of ['topic', 'tag', 'platform']) $('#filter-' + key).addEventListener('change', event => { state[key] = event.target.value; state.page = 1; renderLibrary(); });
  $('#sort-order').addEventListener('change', event => { state.sort = event.target.value; state.page = 1; renderLibrary(); });
  $('#note-list').addEventListener('click', event => {
    const tag = event.target.closest('[data-tag]');
    if (tag && !event.ctrlKey && !event.metaKey && !event.shiftKey) { event.preventDefault(); state.tag = state.tag === tag.dataset.tag ? '' : tag.dataset.tag; state.page = 1; $('#filter-tag').value = state.tag; renderLibrary(); }
    if (event.target.closest('[data-reset]')) reset();
  });
  $('#pagination').addEventListener('click', event => { const button = event.target.closest('[data-page]'); if (button && !button.disabled) { state.page = Number(button.dataset.page); renderLibrary(); $('.list-heading').scrollIntoView({ block: 'start' }); $('#list-title').setAttribute('tabindex', '-1'); $('#list-title').focus({ preventScroll: true }); } });
  try {
    libraryData = await loadNotes();
    const notes = libraryData.notes;
    // Ignore invalid URL filters rather than leaving hidden, impossible selections.
    if (!libraryData.config.categories.some(c => c.id === state.category)) state.category = '';
    for (const key of ['topic', 'tag', 'platform']) {
      const values = notes.flatMap(n => key === 'tag' ? n.tags : n[key]);
      if (state[key] && !values.includes(state[key])) {
        state[key] = values.find(value => value && value.toLowerCase() === state[key].toLowerCase()) || '';
      }
      fillOptions('filter-' + key, values, { topic: 'all topics', tag: 'all tags', platform: 'all platforms' }[key], state[key]);
    }
    renderLibrary();
  } catch {
    const warning = document.createElement('p');
    warning.className = 'search-error';
    warning.textContent = 'could not load search. you can still open the notes below. reload the page to try again.';
    $('#note-list').before(warning);
    $$('.library-toolbar input,.filters select').forEach(n => n.disabled = true);
  }
}

document.addEventListener('click', async event => {
  const button = event.target.closest('.copy-code');
  if (button) {
    try {
      await navigator.clipboard.writeText(button.closest('.code-block').querySelector('code').textContent);
      button.innerHTML = icon('check') + '<span>copied</span>';
      setTimeout(() => button.innerHTML = icon('copy') + '<span>copy</span>', 1800);
    } catch { toast('could not copy. select the code and copy it manually.'); }
  }
  const image = event.target.closest('[data-zoom]');
  if (image) {
    const dialog = $('#image-dialog');
    const target = dialog.querySelector('img');
    target.src = image.src;
    target.alt = image.alt;
    dialog.showModal();
  }
});
$$('[data-zoom]').forEach(img => img.addEventListener('keydown', event => { if (event.key === 'Enter') img.click(); }));
$('#close-image').addEventListener('click', () => $('#image-dialog').close());
$('#image-dialog').addEventListener('click', event => { if (event.target === $('#image-dialog')) $('#image-dialog').close(); });

if ($('#article-content')) {
  const headings = $$('#article-content :is(h1,h2,h3)');
  const tocLinks = $$('.toc nav a');
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) tocLinks.forEach(a => a.classList.toggle('active', a.hash === '#' + entry.target.id));
  }, { rootMargin: '-90px 0px -65% 0px', threshold: 0 });
  headings.forEach(h => observer.observe(h));
  const query = new URLSearchParams(location.search).get('q');
  if (query) {
    const content = $('#article-content');
    const transcript = content.querySelector('details');
    if (transcript) transcript.open = true;
    const walker = document.createTreeWalker(content, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (walker.nextNode()) if (walker.currentNode.parentElement && !walker.currentNode.parentElement.closest('button,.heading-anchor')) textNodes.push(walker.currentNode);
    for (const node of textNodes) {
      const html = highlighted(node.textContent, query);
      if (!html.includes('<mark>')) continue;
      const template = document.createElement('template');
      template.innerHTML = html;
      node.replaceWith(template.content);
    }
    if (!location.hash) requestAnimationFrame(() => content.querySelector('mark')?.scrollIntoView({ block: 'center', behavior: 'instant' }));
  }
}
