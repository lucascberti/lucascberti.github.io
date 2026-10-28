(async function () {
  let D;
  try { D = await fetch('dados/deputados.json').then(r => { if (!r.ok) throw 0; return r.json(); }); } catch (e) { const er = document.getElementById('erro'); if (er) er.hidden = false; return; }
  // cada página tem só algumas seções; o que não existe vira um elemento solto, sem efeito
  const $ = id => document.getElementById(id) || document.createElement('div');
  const GOVS = D.govs, SHORT = ['L1', 'L2', 'D1', 'D2', 'Te', 'Bo', 'L3'];
  const PNAME = { PMDB: 'MDB', DEM: 'DEM', UNIAO: 'União Brasil', REPUBLICANOS: 'Republicanos', CIDADANIA: 'Cidadania', PODE: 'Podemos',
    SOLIDARIEDADE: 'Solidariedade', AVANTE: 'Avante', PATRIOTA: 'Patriota', NOVO: 'Novo', REDE: 'Rede', PRONA: 'Prona' };
  const pn = p => PNAME[p] || p;
  const MIN = 20;
  const fmt = (x, d = 0) => x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pct = x => fmt(x, 0) + '%';
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  // deputados: {id, nome, uf, govs: [{g, p, gab, ng, ap, np, di}]}
  const DEPS = D.deps.map(([id, nome, uf, rows]) => ({ id, nome, uf, key: norm(nome),
    govs: rows.map(([g, p, gab, ng, ap, np, di]) => ({ g, p, gab, ng, ap, np, di })) }));
  const byId = Object.fromEntries(DEPS.map(d => [d.id, d]));
  const byName = n => DEPS.find(d => d.nome === n);
  const partidos = d => [...new Set(d.govs.map(r => pn(r.p)))].join(', ');
  const periodo = d => { const a = d.govs[0].g, b = d.govs[d.govs.length - 1].g; return a === b ? GOVS[a] : `${GOVS[a]} a ${GOVS[b]}`; };

  // ── dica ──
  const tip = $('tip');
  const showTip = (html, ev) => {
    tip.innerHTML = html; tip.style.opacity = 1;
    const r = tip.getBoundingClientRect(), pad = 14;
    let left = ev.clientX + pad, top = ev.clientY + pad;
    if (left + r.width > innerWidth - 8) left = ev.clientX - r.width - pad;
    if (top + r.height > innerHeight - 8) top = ev.clientY - r.height - pad;
    tip.style.left = Math.max(8, left) + 'px'; tip.style.top = Math.max(8, top) + 'px';
  };
  const hideTip = () => { tip.style.opacity = 0; };

  // ── busca ──
  const q = $('q'), res = $('results'), combo = $('combo');
  let hits = [], act = -1;
  function search() {
    const t = norm(q.value.trim());
    if (t.length < 2) { res.hidden = true; combo.setAttribute('aria-expanded', 'false'); return; }
    const toks = t.split(/\s+/);
    hits = DEPS.filter(d => toks.every(k => d.key.includes(k)))
      .sort((a, b) => (b.key.startsWith(t)) - (a.key.startsWith(t)) || a.key.localeCompare(b.key)).slice(0, 10);
    act = hits.length ? 0 : -1;
    res.innerHTML = hits.length ? hits.map((d, i) => `<li role="option" id="o${i}" aria-selected="${i === act}" data-i="${i}"><span class="nm">${esc(d.nome)}</span><span class="mt">${d.uf} · ${esc(partidos(d))} · ${periodo(d)}</span></li>`).join('')
      : '<li class="none">Nenhum deputado com esse nome nas votações de 2003 a 2025.</li>';
    res.hidden = false; combo.setAttribute('aria-expanded', 'true');
  }
  function mark() { [...res.children].forEach((li, i) => li.setAttribute('aria-selected', i === act)); if (act >= 0) q.setAttribute('aria-activedescendant', 'o' + act); }
  q.addEventListener('input', search);
  q.addEventListener('keydown', e => {
    if (res.hidden || !hits.length) return;
    if (e.key === 'ArrowDown') { act = (act + 1) % hits.length; mark(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { act = (act - 1 + hits.length) % hits.length; mark(); e.preventDefault(); }
    else if (e.key === 'Enter' && act >= 0) { pick(hits[act]); e.preventDefault(); }
    else if (e.key === 'Escape') { res.hidden = true; }
  });
  res.addEventListener('mousedown', e => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); pick(hits[+li.dataset.i]); } });
  q.addEventListener('blur', () => setTimeout(() => { res.hidden = true; combo.setAttribute('aria-expanded', 'false'); }, 120));

  const TRY = ['Erika Kokay', 'Rodrigo Maia', 'Tabata Amaral', 'Arthur Lira', 'Luiza Erundina', 'Tiririca', 'Nikolas Ferreira', 'Jair Bolsonaro'];
  const tryBox = $('try');
  for (const n of TRY) { const d = byName(n); if (!d) continue; const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.addEventListener('click', () => pick(d)); tryBox.appendChild(b); }

  // ── perfil ──
  let sel = null, gov = GOVS.length - 1;
  const R = D.ref;
  function sentence(d, r) {
    const ref = R[r.g], com = r.gab === 1, m = com ? ref.apoio_com : ref.apoio_sem;
    const grupo = com ? 'de partidos com ministério' : 'de partidos sem ministério';
    const cmp = (v, mm) => Math.abs(v - mm) < 3 ? 'perto da média' : v > mm ? 'acima da média' : 'abaixo da média';
    let s = '';
    if (r.ap != null) s += `Votou com o governo em ${pct(r.ap)} das ${fmt(r.ng)} votações em que o governo orientou, ${cmp(r.ap, m)} dos deputados ${grupo} (${pct(m)}).`;
    if (r.di != null) { const md = com ? ref.disc_com : ref.disc_sem; s += ` Seguiu o partido em ${pct(r.di)} das vezes (média do grupo: ${pct(md)}).`; }
    if (Math.min(r.ng, r.np) < MIN) s += ` <span class="warn">Poucas votações neste governo: leia com cautela.</span>`;
    return s;
  }
  const metric = (lab, v, mc, ms) => v == null ? '' : `<div class="metric"><div class="row"><span>${lab}</span><span class="val">${pct(v)}</span></div>
    <div class="bar"><i style="width:${v}%"></i><b class="com" style="left:${mc}%"></b><b class="sem" style="left:${ms}%"></b></div></div>`;
  function pick(d) {
    if (!document.getElementById('profile')) { location.href = 'deputado.html#d' + d.id; return; }
    sel = d; q.value = d.nome; res.hidden = true;
    const prof = $('profile'); prof.hidden = false;
    $('pname').textContent = d.nome;
    const tot = d.govs.reduce((a, r) => a + r.np, 0);
    $('pmeta').textContent = `${partidos(d)} · ${d.uf} · ${d.govs.length === 1 ? 'votou em 1 governo' : `votou em ${d.govs.length} governos`} (${periodo(d)})`;
    const cards = $('cards'); cards.innerHTML = '';
    for (const r of d.govs) {
      const ref = R[r.g], b = document.createElement('button'); b.type = 'button'; b.className = 'gcard'; b.dataset.g = r.g;
      const tag = r.gab === 1 ? '<span class="tag com">partido com ministério</span>' : r.gab === 0 ? '<span class="tag sem">partido sem ministério</span>' : '';
      b.innerHTML = `<div class="gtop"><span class="gname">${GOVS[r.g]}</span><span class="gparty">${esc(pn(r.p))} ${tag}</span></div>
        ${metric('Apoio ao governo', r.ap, ref.apoio_com, ref.apoio_sem)}${metric('Disciplina partidária', r.di, ref.disc_com, ref.disc_sem)}
        <p class="gtext">${sentence(d, r)}</p>`;
      b.addEventListener('click', () => { setGov(r.g); if (vOpen && VOTOS) { fGov.value = r.g; renderVotes(); } });
      cards.appendChild(b);
    }
    setGov(d.govs[d.govs.length - 1].g);
    resetVotes(d);
    if (BYV) drawPlen();
    prof.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  }


  // ── votos, um a um ──
  const ALF = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_', AIX = Object.fromEntries([...ALF].map((c, i) => [c, i]));
  const vbtn = $('vbtn'), vbtnTxt = $('vbtnTxt'), vpanel = $('vpanel');
  const fGov = $('fGov'), fTipo = $('fTipo'), fTxt = $('fTxt');
  const vsum = $('vsum'), vlist = $('vlist'), vmore = $('vmore');
  const PAGE = 40;
  let VOTOS = null, vload = null, items = [], shown = 0, vOpen = false;
  const loadVotes = () => vload || (vload = fetch('dados/votos.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(j => { VOTOS = j; VOTOS.P.forEach(p => p.k = norm(p[1] + ' ' + p[1].replace(' ', '') + ' ' + (p[2] || ''))); return j; })
    .catch(e => { vload = null; throw e; }));
  function decode(id) {
    const s = VOTOS.d[id] || '', out = [];
    for (let i = 0; i < s.length; i += 3) {
      const iv = AIX[s[i]] * 64 + AIX[s[i + 1]], c = s[i + 2], V = VOTOS.V[iv];
      const voto = 'abc'.includes(c) ? 'S' : 'N', og = V[3];
      out.push({ iv, voto, g: V[5], gov: og == null ? 'sem' : og === voto ? 'com' : 'contra', par: 'ad'.includes(c) ? 'ok' : 'be'.includes(c) ? 'div' : 'sem' });
    }
    return out.reverse();
  }
  const fmtD = s => { const [y, m, d] = s.split('-'); return `${d}/${m}/${y}`; };
  function filtered() {
    const g = fGov.value, tp = fTipo.value, tx = norm(fTxt.value.trim()).split(/\s+/).filter(Boolean);
    return items.filter(v => (g === 'all' || v.g === +g)
      && (tp === 'all' || (tp === 'pdiv' ? v.par === 'div' : v.gov === tp))
      && (!tx.length || (() => { const V = VOTOS.V[v.iv], k = VOTOS.P[V[1]].k + ' ' + norm(V[2]); return tx.every(w => k.includes(w)); })()));
  }
  function renderVotes(reset = true) {
    if (!VOTOS || !sel) return;
    const list = filtered();
    if (reset) { shown = 0; vlist.innerHTML = ''; }
    const scope = items.filter(v => fGov.value === 'all' || v.g === +fGov.value);
    const nOr = scope.filter(v => v.gov !== 'sem').length, nCom = scope.filter(v => v.gov === 'com').length, nDiv = scope.filter(v => v.par === 'div').length;
    const quando = fGov.value === 'all' ? 'no total' : `no governo ${GOVS[+fGov.value]}`;
    vsum.innerHTML = `<b>${fmt(scope.length)}</b> votos ${quando}. Em <b>${fmt(nOr)}</b> o governo orientou: <b>${fmt(nCom)}</b> com o governo e <b>${fmt(nOr - nCom)}</b> contra. Votou contra o próprio partido <b>${fmt(nDiv)}</b> vezes.`
      + (list.length !== scope.length ? `<br>${fmt(list.length)} votos atendem ao filtro.` : '');
    const frag = document.createDocumentFragment();
    for (const v of list.slice(shown, shown + PAGE)) {
      const V = VOTOS.V[v.iv], P = VOTOS.P[V[1]], li = document.createElement('li'); li.className = 'vrow';
      const gch = v.gov === 'com' ? '<span class="chip com">✓ com o governo</span>' : v.gov === 'contra' ? '<span class="chip contra">✕ contra o governo</span>' : '<span class="chip neutro">governo não orientou</span>';
      const pch = v.par === 'div' ? '<span class="chip pdiv">contra o próprio partido</span>' : v.par === 'ok' ? '<span class="chip pok">seguiu o partido</span>' : '';
      const ori = V[3] ? ` · governo orientou ${V[3] === 'S' ? '“sim”' : '“não”'}` : '';
      li.innerHTML = `<div class="vdate">${fmtD(V[0])}<span class="vg">${GOVS[V[5]]}</span></div>
        <div><div class="vprop"><a href="https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${encodeURIComponent(P[0])}" target="_blank" rel="noopener">${esc(P[1])}</a></div>
        <div class="vem" title="${esc(P[2] || '')}">${esc(P[2] || '')}</div><div class="vdesc">${esc(V[2])}${ori}</div></div>
        <div class="vbad"><span class="chip voto">votou ${v.voto === 'S' ? 'sim' : 'não'}</span>${gch}${pch}<button type="button" class="chip plink" data-iv="${v.iv}">ver no plenário →</button></div>`;
      frag.appendChild(li);
    }
    vlist.appendChild(frag);
    shown = Math.min(list.length, shown + PAGE);
    vmore.hidden = shown >= list.length;
    vmore.textContent = `Mostrar mais ${fmt(Math.min(PAGE, list.length - shown))} de ${fmt(list.length - shown)} restantes`;
    if (!list.length) vlist.innerHTML = '<li class="vrow"><div></div><div class="vdesc">Nenhum voto com esses filtros.</div><div></div></li>';
  }
  function openVotes() {
    vOpen = true; vpanel.hidden = false; vbtn.setAttribute('aria-expanded', 'true'); vbtnTxt.textContent = 'Esconder os votos';
    if (!VOTOS) { vsum.textContent = 'Carregando os votos…'; vlist.innerHTML = ''; vmore.hidden = true; }
    loadVotes().then(() => { items = decode(sel.id); renderVotes(); })
      .catch(() => { vsum.textContent = 'Não foi possível carregar os votos. O arquivo votos.json precisa estar na mesma pasta desta página.'; });
  }
  function closeVotes() { vOpen = false; vpanel.hidden = true; vbtn.setAttribute('aria-expanded', 'false'); vbtnTxt.textContent = 'Ver os votos, um a um'; }
  vbtn.addEventListener('click', () => vOpen ? closeVotes() : openVotes());
  [fGov, fTipo].forEach(e => e.addEventListener('change', () => renderVotes()));
  let ft; fTxt.addEventListener('input', () => { clearTimeout(ft); ft = setTimeout(() => renderVotes(), 180); });
  vmore.addEventListener('click', () => renderVotes(false));
  vlist.addEventListener('click', e => { const b = e.target.closest('.plink'); if (b) location.href = 'plenario.html#v' + b.dataset.iv + (sel ? '-d' + sel.id : ''); });
  function resetVotes(d) {
    fGov.innerHTML = '<option value="all">Todos os governos</option>' + d.govs.map(r => `<option value="${r.g}">${GOVS[r.g]}</option>`).join('');
    fTipo.value = 'all'; fTxt.value = '';
    if (vOpen && VOTOS) { items = decode(d.id); renderVotes(); }
  }

  // ── gráfico de pontos ──
  const band = $('band');
  const bandBtns = GOVS.map((n, g) => { const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<span class="lg">${n}</span><span class="sh">${SHORT[g]}</span>`; b.setAttribute('aria-label', n); b.addEventListener('click', () => setGov(g)); band.appendChild(b); return b; });
  const NS = 'http://www.w3.org/2000/svg';
  const el = (n, a = {}, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const hash = s => { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return ((h >>> 0) % 10000) / 10000; };
  function draw() {
    const box = $('chart'); box.innerHTML = '';
    const W = Math.max(300, box.clientWidth), narrow = W < 620;
    const LW = narrow ? 0 : 128, PADR = 12, ROW = narrow ? 78 : 74, GAPS = narrow ? 64 : 54;
    const rowsTop = [narrow ? 46 : 30];
    const H = rowsTop[0] + 4 * ROW + GAPS + (narrow ? 40 : 36);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': `Apoio ao governo e disciplina partidária de cada deputado no governo ${GOVS[gov]}` }, box);
    const x = v => LW + (W - LW - PADR) * v / 100;
    const ref = R[gov];
    const blocks = [['Apoio ao governo', 'ap', 'ng', ref.apoio_com, ref.apoio_sem], ['Disciplina partidária', 'di', 'np', ref.disc_com, ref.disc_sem]];
    const pts = DEPS.flatMap(d => d.govs.filter(r => r.g === gov && r.gab != null).map(r => ({ d, r })));
    let selDots = [];
    blocks.forEach(([title, key, nk, mc, ms], bi) => {
      const y0 = rowsTop[0] + bi * (2 * ROW + GAPS);
      el('text', { x: narrow ? 0 : 0, y: y0 - (narrow ? 26 : 10), class: 'ttl' }, svg).textContent = title;
      [[1, 'Com ministério', mc], [0, 'Sem ministério', ms]].forEach(([gab, lab, mean], ri) => {
        const yr = y0 + ri * ROW + ROW / 2, yc = narrow ? yr + 9 : yr, SPREAD = narrow ? ROW - 40 : ROW - 22;
        el('text', { x: 0, y: narrow ? yr - ROW / 2 + 12 : yc + 4 }, svg).textContent = lab;
        for (let v = 0; v <= 100; v += 25) el('line', { x1: x(v), x2: x(v), y1: yc - SPREAD / 2 - 6, y2: yc + SPREAD / 2 + 6, style: 'stroke:var(--hero-line)' }, svg);
        const g = el('g', {}, svg);
        for (const { d, r } of pts) {
          if (r.gab !== gab || r[key] == null || r[nk] < MIN) continue;
          const cy = yc + (hash(d.id + key) - 0.5) * SPREAD, cx = x(r[key]);
          const c = el('circle', { cx, cy, r: gab ? 3.4 : 3, class: 'dot', style: gab ? 'fill:var(--gold);fill-opacity:.8' : 'fill:none;stroke:var(--cream);stroke-opacity:.7;stroke-width:1.1' }, g);
          c.addEventListener('pointermove', ev => showTip(`<div class="t">${esc(d.nome)}</div><div class="r">${esc(pn(r.p))} · ${d.uf}</div><div class="r">${title}: ${pct(r[key])} (${fmt(r[nk])} votos)</div>`, ev));
          c.addEventListener('pointerleave', hideTip);
          c.addEventListener('click', () => { hideTip(); pick(d); });
          if (sel && d.id === sel.id) selDots.push([cx, cy]);
        }
        el('line', { x1: x(mean), x2: x(mean), y1: yc - SPREAD / 2 - 8, y2: yc + SPREAD / 2 + 8, style: 'stroke:var(--hero-ink);stroke-width:2' }, svg);
        const ml = el('text', { x: x(mean), y: yc - SPREAD / 2 - 11, 'text-anchor': mean > 88 ? 'end' : 'middle', style: 'fill:var(--hero-ink);font-weight:600' }, svg);
        ml.textContent = `média ${pct(mean)}`;
      });
      for (let v = 0; v <= 100; v += 25) el('text', { x: x(v), y: y0 + 2 * ROW + 16, 'text-anchor': v === 0 ? 'start' : v === 100 ? 'end' : 'middle' }, svg).textContent = v + '%';
    });
    for (const [cx, cy] of selDots) {
      el('circle', { cx, cy, r: 9, style: 'fill:none;stroke:var(--hero-ink);stroke-width:2.5' }, svg);
      el('circle', { cx, cy, r: 4.5, style: 'fill:var(--hero-ink)' }, svg);
    }
    if (sel && selDots.length) {
      const [cx, cy] = selDots[0], right = cx < W * 0.6;
      const t = el('text', { x: cx + (right ? 12 : -12), y: cy + 24, 'text-anchor': right ? 'start' : 'end', style: 'fill:var(--hero-ink);font-weight:600;font-size:13px;paint-order:stroke;stroke:var(--hero-bg);stroke-width:4px' }, svg);
      t.textContent = sel.nome;
    }
  }
  function setGov(g) {
    gov = g;
    bandBtns.forEach((b, j) => b.setAttribute('aria-pressed', j === g ? 'true' : 'false'));
    document.querySelectorAll('.gcard').forEach(c => c.setAttribute('aria-pressed', +c.dataset.g === g ? 'true' : 'false'));
    draw();
  }


  // ── plenário: uma votação, todas as cadeiras ──
  const ORDEM = ['PSOL', 'PCdoB', 'PT', 'REDE', 'PSB', 'PDT', 'PV', 'CIDADANIA', 'SOLIDARIEDADE', 'AVANTE', 'PROS', 'PMN', 'PHS', 'PTC', 'PRP', 'DC',
    'PODE', 'PMDB', 'PSDB', 'PSD', 'PTB', 'PP', 'REPUBLICANOS', 'DEM', 'UNIAO', 'PRONA', 'PL', 'PRD', 'PSC', 'PATRIOTA', 'PRTB', 'PSL', 'NOVO'];
  const PCOL = { PSOL: '#F4C542', PCdoB: '#C0392B', PT: '#E5483D', REDE: '#53B39A', PSB: '#F0913A', PDT: '#E4728A', PV: '#86C46B', CIDADANIA: '#E8B4D0',
    SOLIDARIEDADE: '#F6A16F', AVANTE: '#5FC2D1', PROS: '#C98BD9', PODE: '#4CB1A0', PMDB: '#3FA463', PSDB: '#4D8FD6', PSD: '#7FB2EC', PTB: '#A6D9C8',
    PP: '#3B6FCC', REPUBLICANOS: '#9CC3E6', DEM: '#9A88E0', UNIAO: '#7563CF', PL: '#5D73DA', PSC: '#B3AED8', PATRIOTA: '#C9A86B', PSL: '#A774DC', NOVO: '#F07F2A' };
  const pcol = p => PCOL[p] || '#BFB8A6';
  const pord = p => { const i = ORDEM.indexOf(p); return i < 0 ? 16.5 : i; };
  const FEAT = [[47, 'Reforma da Previdência', '2003 · Lula I'], [870, 'Seguro-desemprego (ajuste fiscal)', '2015 · Dilma II'], [1018, 'Teto de gastos', '2016 · Temer'],
    [1074, 'Reforma trabalhista', '2017 · Temer'], [1290, 'Reforma da Previdência', '2019 · Bolsonaro'], [1628, 'Privatização da Eletrobras', '2021 · Bolsonaro'],
    [2213, 'Isenção do IR até R$ 5 mil', '2025 · Lula III'], [2214, 'MP 1303 retirada de pauta', '2025 · Lula III']];
  let BYV = null, curV = 1290, mode = 'voto', VKEY = null;
  const seatCache = {};
  function seats(n) {
    if (seatCache[n]) return seatCache[n];
    const rows = n > 420 ? 13 : n > 300 ? 11 : n > 150 ? 9 : 7, r0 = 0.36, rs = Array.from({ length: rows }, (_, i) => r0 + (1 - r0) * i / (rows - 1));
    const sum = rs.reduce((a, b) => a + b, 0); let cnt = rs.map(r => Math.round(n * r / sum));
    let diff = n - cnt.reduce((a, b) => a + b, 0); for (let i = rows - 1; diff !== 0; i = (i - 1 + rows) % rows) { cnt[i] += Math.sign(diff); diff -= Math.sign(diff); }
    const out = [];
    rs.forEach((r, i) => { for (let j = 0; j < cnt[i]; j++) { const th = cnt[i] === 1 ? Math.PI / 2 : Math.PI * (1 - j / (cnt[i] - 1)); out.push({ r, th }); } });
    out.sort((a, b) => b.th - a.th || a.r - b.r);
    return (seatCache[n] = { list: out, dot: (1 - r0) / (rows - 1) * 0.4 });
  }
  function buildByV() {
    BYV = VOTOS.V.map(() => []);
    for (const d of DEPS) {
      const s = VOTOS.d[d.id] || '', runs = VOTOS.pt[d.id] || [[0, '?']]; let k = 0;
      for (let i = 0; i < s.length; i += 3) {
        const iv = AIX[s[i]] * 64 + AIX[s[i + 1]];
        while (k + 1 < runs.length && runs[k + 1][0] <= iv) k++;
        BYV[iv].push({ d, c: s[i + 2], p: runs[k][1] });
      }
    }
    VKEY = VOTOS.V.map(V => norm(`${VOTOS.P[V[1]][1]} ${VOTOS.P[V[1]][1].replace(' ', '')} ${VOTOS.P[V[1]][2] || ''} ${V[2]} ${V[0].slice(0, 4)}`));
  }
  const feat = $('feat');
  const featBtns = FEAT.map(([iv, lab, sub]) => {
    const b = document.createElement('button'); b.type = 'button'; b.dataset.iv = iv; b.innerHTML = `${lab}<small>${sub}</small>`;
    b.addEventListener('click', () => showPlen(iv)); feat.appendChild(b); return b;
  });
  document.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.m; document.querySelectorAll('.seg button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); drawPlen();
  }));
  const onlyDiv = $('onlyDiv'); onlyDiv.addEventListener('change', () => drawPlen());

  function showPlen(iv, scroll) {
    curV = iv;
    featBtns.forEach(b => b.setAttribute('aria-pressed', +b.dataset.iv === iv ? 'true' : 'false'));
    const go = () => { drawPlen(); if (scroll) $('plenario').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); };
    if (BYV) return go();
    loadVotes().then(() => { if (!BYV) buildByV(); go(); })
      .catch(() => { $('hemi').innerHTML = '<p class="vh-desc">Não foi possível carregar os votos. O arquivo votos.json precisa estar na mesma pasta desta página.</p>'; });
  }
  function drawPlen() {
    if (!BYV) return;
    const V = VOTOS.V[curV], P = VOTOS.P[V[1]];
    const rows = BYV[curV].map(o => ({ ...o, voto: 'abc'.includes(o.c) ? 'S' : 'N', div: 'be'.includes(o.c) }));
    // orientação de cada partido, deduzida dos votos de quem a seguiu ou contrariou
    const ori = {};
    for (const o of rows) { if (ori[o.p]) continue; if ('ad'.includes(o.c)) ori[o.p] = o.voto; }
    for (const o of rows) if (!ori[o.p] && o.div) ori[o.p] = o.voto === 'S' ? 'N' : 'S';
    rows.sort((a, b) => pord(a.p) - pord(b.p) || a.p.localeCompare(b.p) || (a.voto === b.voto ? 0 : a.voto === 'S' ? -1 : 1) || a.div - b.div);
    const nS = rows.filter(o => o.voto === 'S').length, nN = rows.length - nS, nDiv = rows.filter(o => o.div).length;
    const semOri = rows.filter(o => 'cf'.includes(o.c)).length / Math.max(1, rows.length);
    const og = V[3] === 'S' ? 'sim' : V[3] === 'N' ? 'não' : null;
    $('vhead').innerHTML = `<div class="vh-meta">${fmtD(V[0])} · ${GOVS[V[5]]}</div>
      <h3 class="vh-prop"><a href="https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${encodeURIComponent(P[0])}" target="_blank" rel="noopener">${esc(P[1])}</a></h3>
      <p class="vh-em">${esc(P[2] || '')}</p><p class="vh-desc">${esc(V[2])}</p>
      <div class="vh-facts"><span>Governo orientou: <b>${og ? '“' + og + '”' : 'não orientou'}</b></span>${V[4] != null ? `<span>Resultado: <b>${V[4] ? 'aprovado' : 'rejeitado'}</b></span>` : ''}<span>Votaram contra o próprio partido: <b>${fmt(nDiv)}</b></span></div>`
      + (semOri > 0.25 ? `<p class="vh-desc" style="color:var(--gold)">Em ${pct(100 * semOri)} dos votos desta votação, a fonte não registra a orientação do partido do deputado. Por isso, a contagem de quem votou contra o próprio partido é um piso.</p>` : '');
    const S = seats(rows.length), cx = 500, cy = 548, R = 470, dot = Math.max(2.2, S.dot * R);
    const box = $('hemi'); box.innerHTML = '';
    const svg = el('svg', { viewBox: '-50 0 1100 572', role: 'img', 'aria-label': `Plenário: ${nS} votos sim e ${nN} votos não em ${P[1]}` }, box);
    const parts = {};
    rows.forEach((o, k) => {
      const st = S.list[k]; o.x = cx + Math.cos(st.th) * st.r * R; o.y = cy - Math.sin(st.th) * st.r * R;
      const g = parts[o.p] || (parts[o.p] = { min: 9, max: -9, n: 0 }); g.min = Math.min(g.min, st.th); g.max = Math.max(g.max, st.th); g.n++;
    });
    // fatias dos partidos: arco externo e rótulo
    const narrowH = box.clientWidth < 640, FS = narrowH ? 26 : 13, RA = R + 16, RL = R + (narrowH ? 44 : 38);
    for (const [p, g] of Object.entries(parts)) {
      const a0 = g.max + 0.004, a1 = g.min - 0.004;
      const P0 = [cx + Math.cos(a0) * RA, cy - Math.sin(a0) * RA], P1 = [cx + Math.cos(a1) * RA, cy - Math.sin(a1) * RA];
      el('path', { d: `M${P0[0].toFixed(1)},${P0[1].toFixed(1)} A${RA},${RA} 0 0 1 ${P1[0].toFixed(1)},${P1[1].toFixed(1)}`, style: `fill:none;stroke:${pcol(p)};stroke-width:6;stroke-linecap:butt` }, svg);
      const mid = (a0 + a1) / 2, lab = pn(p);
      if ((a0 - a1) * RL > lab.length * FS * 0.62 + 10) {
        const t = el('text', { x: cx + Math.cos(mid) * RL, y: cy - Math.sin(mid) * RL + 4, class: 'plab', style: `font-size:${FS}px`, 'text-anchor': mid > 2.2 ? 'end' : mid < 0.94 ? 'start' : 'middle' }, svg);
        t.textContent = lab;
      }
    }
    const gd = el('g', {}, svg);
    rows.forEach((o, k) => {
      const fill = mode === 'voto' ? (o.voto === 'S' ? 'var(--gold)' : 'var(--cream)') : pcol(o.p);
      const dim = onlyDiv.checked && !o.div;
      el('circle', { cx: o.x.toFixed(1), cy: o.y.toFixed(1), r: dot, class: 'seat', 'data-k': k, style: `fill:${fill};opacity:${dim ? 0.18 : 1}` }, gd);
      if (o.div) el('circle', { cx: o.x.toFixed(1), cy: o.y.toFixed(1), r: dot + 3, style: 'fill:none;stroke:var(--alert);stroke-width:2.4;pointer-events:none' }, gd);
      if (sel && o.d.id === sel.id) el('circle', { cx: o.x.toFixed(1), cy: o.y.toFixed(1), r: dot + 7, style: 'fill:none;stroke:var(--hero-ink);stroke-width:2.5;pointer-events:none' }, gd);
    });
    // placar no centro
    const big = (x, txt, col, lab) => { el('text', { x, y: cy - 46, 'text-anchor': 'middle', class: 'big', style: `fill:${col}` }, svg).textContent = txt; el('text', { x, y: cy - 20, 'text-anchor': 'middle', class: 'bigl' }, svg).textContent = lab; };
    big(cx - 72, fmt(nS), 'var(--gold)', 'sim'); big(cx + 72, fmt(nN), 'var(--cream)', 'não');
    el('text', { x: cx, y: cy - 2, 'text-anchor': 'middle', class: 'bigl', style: 'font-size:12px' }, svg).textContent = `${fmt(rows.length)} deputados votaram`;
    svg.addEventListener('pointermove', ev => {
      const c = ev.target.closest('.seat'); if (!c) return hideTip();
      const o = rows[+c.dataset.k], po = ori[o.p];
      showTip(`<div class="t">${esc(o.d.nome)}</div><div class="r">${esc(pn(o.p))} · ${o.d.uf}</div><div class="r">Votou ${o.voto === 'S' ? 'sim' : 'não'}${po ? ` · partido orientou ${po === 'S' ? 'sim' : 'não'}` : ' · partido não orientou'}</div>${o.div ? '<div class="r" style="color:#C0392B;font-weight:600">Contra o próprio partido</div>' : ''}`, ev);
    });
    svg.addEventListener('pointerleave', hideTip);
    svg.addEventListener('click', ev => { const c = ev.target.closest('.seat'); if (c) { hideTip(); pick(rows[+c.dataset.k].d); } });
    $('hleg').innerHTML = (mode === 'voto' ? '<span><i style="background:var(--gold)"></i>sim</span><span><i style="background:var(--cream)"></i>não</span>' : '<span>cor do partido</span>')
      + '<span><i style="background:none;border:2.4px solid var(--alert);width:14px;height:14px"></i>contra a orientação do próprio partido</span><span>Partidos em ordem aproximada da esquerda para a direita.</span>';
    // lista de quem contrariou o partido
    const grp = {};
    rows.filter(o => o.div).forEach(o => (grp[o.p] = grp[o.p] || []).push(o));
    const ds = $('dissent');
    if (!nDiv) { ds.innerHTML = '<h3>Ninguém votou contra o próprio partido</h3><p class="sub">Entre os partidos que orientaram, todos os deputados seguiram a orientação.</p>'; return; }
    const keys = Object.keys(grp).sort((a, b) => grp[b].length - grp[a].length);
    ds.innerHTML = `<h3>Quem votou contra o próprio partido</h3><p class="sub">${fmt(nDiv)} ${nDiv === 1 ? 'deputado' : 'deputados'}, de ${keys.length} ${keys.length === 1 ? 'partido' : 'partidos'}. Clique num nome para abrir o deputado.</p><div class="dgroups">`
      + keys.map(p => { const tot = parts[p].n, po = ori[p];
        return `<div class="dg"><h4><i style="background:${pcol(p)}"></i>${esc(pn(p))}</h4><p>Partido orientou ${po === 'S' ? '“sim”' : '“não”'} · ${grp[p].length} de ${tot} votaram ${po === 'S' ? 'não' : 'sim'}</p><div class="names">${grp[p].map(o => `<button type="button" data-id="${o.d.id}">${esc(o.d.nome)} (${o.d.uf})</button>`).join('')}</div></div>`; }).join('') + '</div>';
    ds.querySelectorAll('button[data-id]').forEach(b => b.addEventListener('click', () => pick(byId[b.dataset.id])));
  }
  // busca de votações
  const vq = $('vq'), vres = $('vres'), vcombo = $('vcombo');
  let vhits = [], vact = -1;
  function vsearch() {
    const t = norm(vq.value.trim());
    if (t.length < 2 || !VKEY) { vres.hidden = true; vcombo.setAttribute('aria-expanded', 'false'); if (!VKEY && t.length >= 2) showPlen(curV); return; }
    const toks = t.split(/\s+/); vhits = [];
    for (let i = VKEY.length - 1; i >= 0 && vhits.length < 12; i--) if (toks.every(k => VKEY[i].includes(k))) vhits.push(i);
    vact = vhits.length ? 0 : -1;
    vres.innerHTML = vhits.length ? vhits.map((iv, i) => { const V = VOTOS.V[iv]; return `<li role="option" id="vo${i}" aria-selected="${i === vact}" data-i="${i}"><span><span class="nm">${esc(VOTOS.P[V[1]][1])}</span> <span class="mt">${fmtD(V[0])}</span><br><span class="mt" style="white-space:normal">${esc(V[2].slice(0, 110))}</span></span></li>`; }).join('')
      : '<li class="none">Nenhuma votação encontrada.</li>';
    vres.hidden = false; vcombo.setAttribute('aria-expanded', 'true');
  }
  vq.addEventListener('input', vsearch);
  vq.addEventListener('focus', () => { if (!BYV) showPlen(curV); });
  vq.addEventListener('keydown', e => {
    if (vres.hidden || !vhits.length) return;
    if (e.key === 'ArrowDown') { vact = (vact + 1) % vhits.length; e.preventDefault(); }
    else if (e.key === 'ArrowUp') { vact = (vact - 1 + vhits.length) % vhits.length; e.preventDefault(); }
    else if (e.key === 'Enter' && vact >= 0) { showPlen(vhits[vact]); vres.hidden = true; e.preventDefault(); return; }
    else if (e.key === 'Escape') { vres.hidden = true; return; }
    [...vres.children].forEach((li, i) => li.setAttribute('aria-selected', i === vact));
  });
  vres.addEventListener('mousedown', e => { const li = e.target.closest('li[data-i]'); if (li) { e.preventDefault(); showPlen(vhits[+li.dataset.i]); vres.hidden = true; } });
  vq.addEventListener('blur', () => setTimeout(() => { vres.hidden = true; vcombo.setAttribute('aria-expanded', 'false'); }, 120));
  // carrega o plenário quando a seção se aproxima da tela
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); showPlen(curV); } }, { rootMargin: '400px' });
    io.observe($('plenario'));
  } else showPlen(curV);

  // ── histórias ──
  const STORIES = [
    ['Erika Kokay', 'PT · DF', 'Do governo à oposição, e de volta', 'Votou com o governo em 93% a 95% das vezes com Dilma. Sob Temer e Bolsonaro, em 16% a 17%. Com Lula III, de novo 95%. Seguiu o PT em 94% a 99% das vezes em todos eles.'],
    ['Rodrigo Maia', 'DEM · RJ', 'A oposição que virou base', 'Nos governos do PT, quando o DEM estava fora do gabinete, apoiou o governo em 19% a 40% das votações. Sob Bolsonaro, com o DEM no ministério, em 79%.'],
    ['Tabata Amaral', 'PDT e PSB · SP', 'Novo partido, novo lugar', 'Pelo PDT, sem ministério, votou com Bolsonaro em 40% das vezes. Pelo PSB, com ministério no governo Lula III, em 91%.']
  ];
  const sBox = $('stories');
  for (const [n, meta, h, p] of STORIES) {
    const d = byName(n); if (!d) continue;
    const b = document.createElement('button'); b.type = 'button'; b.className = 'story';
    b.innerHTML = `<span class="d">${n} · ${meta}</span><h3>${h}</h3><p>${p}</p><span class="go">Abrir o deputado →</span>`;
    b.addEventListener('click', () => pick(d)); sBox.appendChild(b);
  }

  // ── halteres ──
  function dumb(id, kc, ks, kd) {
    const box = $(id);
    box.innerHTML = R.map(r => {
      const c = r[kc], s = r[ks], lo = Math.min(c, s), hi = Math.max(c, s), gap = r[kd];
      return `<div class="drow"><span class="g">${r.g}</span><div class="track"><div class="ax"></div><div class="ln" style="left:${lo}%;width:${hi - lo}%"></div>
        <div class="s" style="left:${s}%" title="sem ministério: ${pct(s)}"></div><div class="c" style="left:${c}%" title="com ministério: ${pct(c)}"></div></div>
        <span class="gap">${gap >= 0 ? '+' : '−'}${fmt(Math.abs(gap), 1)} p.p.</span></div>`;
    }).join('') + '<div class="scale"><span></span><div><span>0%</span><span>50%</span><span>100%</span></div><span></span></div>';
  }
  dumb('d1', 'apoio_com', 'apoio_sem', 'apoio_dif'); dumb('d2', 'disc_com', 'disc_sem', 'disc_dif');

  setGov(gov);
  let rz, lastW = 0; new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { const w = $('chart').clientWidth; if (w !== lastW) { lastW = w; draw(); } }, 120); }).observe($('chart'));
  // links entre as páginas: deputado.html#d<id> e plenario.html#v<votação>-d<id>
  function fromHash() {
    const hd = location.hash.match(/^#d(\w+)$/), hv = location.hash.match(/^#v(\d+)(?:-d(\w+))?$/);
    if (hd && byId[hd[1]] && document.getElementById('profile')) pick(byId[hd[1]]);
    if (hv && document.getElementById('plenario') && +hv[1] < 4096) { if (hv[2] && byId[hv[2]]) sel = byId[hv[2]]; showPlen(+hv[1]); }
  }
  fromHash(); addEventListener('hashchange', fromHash);
})();
