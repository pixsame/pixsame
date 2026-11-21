/**
 * The review page: one self-contained document, no external requests. Texts
 * from the manifests reach the page through `textContent` only.
 */
export const reviewPage = (base: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>pixsame review</title>
<style>
  :root { --bg:#f8f8f6; --panel:#fff; --ink:#1c1c1a; --mute:#6b6b66; --line:#e3e3dd; --accent:#2f6fed; --good:#1f8a4c; --warn:#8a5a00; --warnbg:#fff4d6; }
  @media (prefers-color-scheme: dark) { :root { --bg:#161615; --panel:#1f1f1d; --ink:#ececE8; --mute:#9a9a93; --line:#2f2f2c; --accent:#6f9bff; --good:#4cc47e; --warn:#f0c869; --warnbg:#3a2f12; } }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--ink); font:14px/1.45 system-ui, sans-serif; }
  header { display:flex; align-items:baseline; gap:12px; padding:12px 16px; border-bottom:1px solid var(--line); background:var(--panel); }
  header h1 { font-size:15px; margin:0; } header span { color:var(--mute); }
  .layout { display:grid; grid-template-columns:300px 1fr; min-height:calc(100vh - 47px); }
  nav { border-right:1px solid var(--line); background:var(--panel); overflow:auto; }
  nav button { display:block; width:100%; text-align:left; border:0; border-bottom:1px solid var(--line); background:none; color:inherit; padding:10px 14px; cursor:pointer; font:inherit; }
  nav button[aria-current="true"] { background:var(--bg); box-shadow:inset 3px 0 var(--accent); }
  nav .name { font-weight:600; word-break:break-word; } nav .sub { color:var(--mute); font-size:12px; }
  nav .done { color:var(--good); }
  main { padding:16px 20px; min-width:0; }
  .empty { color:var(--mute); padding:40px 0; text-align:center; }
  h2 { margin:0 0 4px; font-size:17px; word-break:break-word; } .test { color:var(--mute); margin-bottom:12px; word-break:break-word; }
  .says { margin:0 0 12px; padding:10px 12px; background:var(--panel); border:1px solid var(--line); border-radius:6px; }
  .notice { margin:0 0 12px; padding:8px 12px; background:var(--warnbg); color:var(--warn); border-radius:6px; font-size:13px; }
  .bar { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin:0 0 14px; }
  .tabs { display:flex; gap:4px; flex:1; flex-wrap:wrap; }
  .tabs button, .replace { font:inherit; border:1px solid var(--line); background:var(--panel); color:inherit; padding:5px 12px; border-radius:5px; cursor:pointer; }
  .tabs button[aria-selected="true"] { border-color:var(--accent); color:var(--accent); font-weight:600; }
  .replace { background:var(--good); border-color:var(--good); color:#fff; font-weight:600; }
  .replace:disabled { opacity:.6; cursor:default; }
  .error { color:#c0392b; margin:0 0 10px; }
  .view { display:flex; gap:16px; flex-wrap:wrap; } .view figure { margin:0; flex:1 1 320px; min-width:0; }
  figcaption { color:var(--mute); font-size:12px; margin-bottom:4px; }
  img { max-width:100%; height:auto; display:block; border:1px solid var(--line); background:repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0 0 / 16px 16px; }
  .slider { position:relative; max-width:100%; display:inline-block; } .slider img.top { position:absolute; inset:0; }
  .slider input { width:100%; margin-top:8px; }
</style></head>
<body>
<header><h1>pixsame review</h1><span id="count"></span></header>
<div class="layout"><nav id="list" aria-label="Comparisons"></nav><main id="detail"></main></div>
<script>
(() => {
  const BASE = ${JSON.stringify(base)};
  const $ = (sel) => document.querySelector(sel);
  const el = (tag, props = {}, ...kids) => {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...kids.filter((k) => k !== undefined && k !== null));
    return node;
  };
  let items = [], current = 0, view = 'side', error = '';
  const img = (item, kind) => BASE + '/img/' + item.id + '/' + kind + '?t=' + item.status;
  const fig = (item, kind, caption) => el('figure', {}, el('figcaption', { textContent: caption }), el('img', { src: img(item, kind), alt: caption }));

  const renderList = () => {
    const open = items.filter((i) => !i.approved).length;
    $('#count').textContent = items.length === 0 ? '' : open + ' to review, ' + (items.length - open) + ' replaced';
    $('#list').replaceChildren(...items.map((item, index) => {
      const button = el('button', { type: 'button' },
        el('div', { className: 'name', textContent: item.name }),
        el('div', { className: 'sub' + (item.approved ? ' done' : ''), textContent: item.approved ? 'Baseline replaced' : (item.label || item.status) }));
      if (index === current) button.setAttribute('aria-current', 'true');
      button.onclick = () => { current = index; error = ''; render(); };
      return button;
    }));
  };

  const body = (item) => {
    const has = (kind) => item.images.includes(kind);
    if (view === 'side' && has('baseline') && has('actual'))
      return el('div', { className: 'view' }, fig(item, 'baseline', 'Baseline'), fig(item, 'actual', 'Actual'));
    if (view === 'slider' && has('baseline') && has('actual')) {
      const top = el('img', { src: img(item, 'actual'), alt: 'Actual', className: 'top' });
      const range = el('input', { type: 'range', min: 0, max: 100, value: 50, ariaLabel: 'Slider' });
      const sync = () => { top.style.clipPath = 'inset(0 0 0 ' + range.value + '%)'; };
      range.oninput = sync; sync();
      return el('div', { className: 'slider' }, el('img', { src: img(item, 'baseline'), alt: 'Baseline' }), top, range);
    }
    const kind = { diff: 'diff', actual: 'actual', baseline: 'baseline' }[view] || 'actual';
    return has(kind) ? el('div', { className: 'view' }, fig(item, kind, kind[0].toUpperCase() + kind.slice(1))) : el('p', { className: 'empty', textContent: 'No ' + kind + ' image for this comparison.' });
  };

  const render = () => {
    renderList();
    const main = $('#detail');
    const item = items[current];
    if (!item) { main.replaceChildren(el('p', { className: 'empty', textContent: 'No failed comparisons found in the manifests.' })); return; }
    const tabs = el('div', { className: 'tabs', role: 'tablist' }, ...[['side', 'Side by side'], ['diff', 'Diff'], ['actual', 'Actual'], ['baseline', 'Baseline'], ['slider', 'Slider']].map(([id, label]) => {
      const tab = el('button', { type: 'button', textContent: label, role: 'tab' });
      tab.setAttribute('aria-selected', String(view === id));
      tab.onclick = () => { view = id; render(); };
      return tab;
    }));
    const replace = el('button', { type: 'button', className: 'replace', textContent: item.approved ? 'Baseline replaced' : 'Replace baseline', disabled: item.approved || !item.images.includes('actual') });
    replace.onclick = async () => {
      replace.disabled = true; error = '';
      const res = await fetch(BASE + '/api/replace/' + item.id, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) error = data.error || 'Could not replace the baseline.';
      else items[current] = data;
      render();
    };
    main.replaceChildren(
      el('h2', { textContent: item.name }),
      el('div', { className: 'test', textContent: item.test }),
      el('p', { className: 'says', textContent: item.description || item.message || item.status }),
      ...(item.oldBaseline ? [el('p', { className: 'notice', textContent: 'This baseline was saved before page layouts were recorded, so the sentence above comes from the pixels only. Run npx pixsame baselines --update to add the layouts.' })] : []),
      ...(error ? [el('p', { className: 'error', textContent: error })] : []),
      el('div', { className: 'bar' }, tabs, replace),
      body(item));
  };

  fetch(BASE + '/api/items').then((r) => r.json()).then((list) => { items = list; current = Math.max(0, items.findIndex((i) => !i.approved)); render(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' && current < items.length - 1) { current++; render(); }
    if (e.key === 'ArrowUp' && current > 0) { current--; render(); }
  });
})();
</script>
</body></html>`;
