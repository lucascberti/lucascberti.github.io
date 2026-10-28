// Da Emenda ao Ministério? · página "A disciplina partidária"
// dados/disciplina.json (script 54) e dados/deputados.json (script 48, o mesmo da página do deputado)
(async function () {
  let D, P;
  const get = f => fetch(f).then(r => { if (!r.ok) throw 0; return r.json(); });
  try { [D, P] = await Promise.all([get('dados/disciplina.json'), get('dados/deputados.json')]); } catch (e) { document.getElementById('erro').hidden = false; return; }
  const $ = id => document.getElementById(id);
  const GOVS = D.govs, SHORT = ['L1', 'L2', 'D1', 'D2', 'Te', 'Bo', 'L3'];
  const PNAME = { PMDB: 'MDB', DEM: 'DEM', UNIAO: 'União Brasil', REPUBLICANOS: 'Republicanos', CIDADANIA: 'Cidadania', PODE: 'Podemos',
    SOLIDARIEDADE: 'Solidariedade', AVANTE: 'Avante', PATRIOTA: 'Patriota', NOVO: 'Novo', REDE: 'Rede', PRONA: 'Prona' };
  const pn = p => PNAME[p] || p;
  const fmt = (x, d = 0) => x.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const pc = x => fmt(x, 1) + '%';
  const pp = x => (Math.abs(x) < 0.05 ? '' : x > 0 ? '+' : '−') + fmt(Math.abs(x), 1);
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const norm = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const NS = 'http://www.w3.org/2000/svg';
  const el = (n, a = {}, p) => { const e = document.createElementNS(NS, n); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const txt = (p, s, a) => { const t = el('text', a, p); t.textContent = s; return t; };
  // cores dos partidos: as mesmas do plenário
  const PCOL = { PSOL: '#F4C542', PCdoB: '#C0392B', PT: '#E5483D', REDE: '#53B39A', PSB: '#F0913A', PDT: '#E4728A', PV: '#86C46B', CIDADANIA: '#E8B4D0',
    SOLIDARIEDADE: '#F6A16F', AVANTE: '#5FC2D1', PROS: '#C98BD9', PODE: '#4CB1A0', PMDB: '#3FA463', PSDB: '#4D8FD6', PSD: '#7FB2EC', PTB: '#A6D9C8',
    PP: '#3B6FCC', REPUBLICANOS: '#9CC3E6', DEM: '#9A88E0', UNIAO: '#7563CF', PL: '#5D73DA', PSC: '#B3AED8', PATRIOTA: '#C9A86B', PSL: '#A774DC', NOVO: '#F07F2A' };
  const pcol = p => PCOL[p] || '#BFB8A6';

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
  const sw = c => `<i style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${c};margin-right:6px"></i>`;

  function bandIn(box, labels, onPick) {
    return labels.map(([lg, sh], i) => {
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<span class="lg">${lg}</span><span class="sh">${sh}</span>`;
      b.setAttribute('aria-label', lg); b.addEventListener('click', () => onPick(i)); box.appendChild(b); return b;
    });
  }
  const press = (btns, i) => btns.forEach((b, j) => b.setAttribute('aria-pressed', j === i ? 'true' : 'false'));

  // ── 1. partido a partido, dentro e fora do gabinete ──
  let pg = 0;   // 0 = todos os governos; 1..7 = governo
  const pBtns = bandIn($('band'), [['Todos os governos', 'Todos'], ...GOVS.map((g, i) => [g, SHORT[i]])], i => { pg = i; press(pBtns, i); drawP(); });
  function partyRows() {
    if (pg === 0) return D.partidos.filter(r => r.n >= 300).map(r => ({ p: r.p, c: r.dc, nc: r.nc, f: r.df, nf: r.nf, o: r.d }));
    const m = {};
    for (const r of D.partido_gov) if (r.g === pg - 1) { const o = m[r.p] || (m[r.p] = { p: r.p }); if (r.gab) { o.c = r.d; o.nc = r.n; } else { o.f = r.d; o.nf = r.n; } }
    return Object.values(m).map(o => ({ ...o, o: ((o.c ?? 0) * (o.nc ?? 0) + (o.f ?? 0) * (o.nf ?? 0)) / ((o.nc ?? 0) + (o.nf ?? 0)) }));
  }
  function drawP() {
    const box = $('pchart'); box.innerHTML = '';
    const rows = partyRows().sort((a, b) => b.o - a.o);
    const both = rows.filter(r => r.c != null && r.f != null), maior = both.filter(r => r.c > r.f).length;
    $('pnote').innerHTML = `${rows.length} partidos com pelo menos ${pg === 0 ? 300 : 10} votações${pg === 0 ? ', de 2003 a 2025' : ' no governo ' + GOVS[pg - 1]}. ` +
      (both.length ? `Entre os ${both.length} que estiveram dentro e fora do gabinete, ${maior} foram mais disciplinados dentro e ${both.length - maior} fora.` : 'Neste governo, nenhum partido esteve dentro e fora do gabinete.');
    const W = Math.max(300, box.clientWidth), narrow = W < 620;
    const LW = narrow ? 96 : 132, RW = narrow ? 50 : 76, ROW = 24, TOP = 26, X0 = 30, X1 = 100;
    const H = TOP + rows.length * ROW + 6;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': `Disciplina de cada partido dentro e fora do gabinete, ${pg === 0 ? 'todos os governos' : GOVS[pg - 1]}` }, box);
    const x = v => LW + (W - LW - RW) * (Math.max(X0, v) - X0) / (X1 - X0);
    for (let v = X0; v <= X1; v += 10) {
      el('line', { x1: x(v), x2: x(v), y1: TOP - 6, y2: H, style: 'stroke:var(--hero-line)' }, svg);
      if (!narrow || (v % 20 === 0 && v < 100)) txt(svg, v + '%', { x: x(v), y: 12, 'text-anchor': v === 100 ? 'end' : 'middle' });
    }
    txt(svg, 'dif. (p.p.)', { x: W, y: 12, 'text-anchor': 'end', style: 'font-size:11.5px' });
    rows.forEach((r, i) => {
      const y = TOP + i * ROW + ROW / 2, g = el('g', { class: 'row' }, svg);
      txt(g, pn(r.p), { x: 0, y: y + 4, class: 'pl' });
      if (r.c != null && r.f != null) el('line', { x1: x(r.c), x2: x(r.f), y1: y, y2: y, style: 'stroke:var(--cream);stroke-opacity:.45;stroke-width:2' }, g);
      if (r.f != null) el('circle', { cx: x(r.f), cy: y, r: 4.6, style: 'fill:var(--hero-bg);stroke:var(--cream);stroke-width:1.8' }, g);
      if (r.c != null) el('circle', { cx: x(r.c), cy: y, r: 5.6, style: 'fill:var(--gold);stroke:var(--hero-bg);stroke-width:1.5' }, g);
      if (r.c != null && r.f != null) txt(g, pp(r.c - r.f), { x: W, y: y + 4, 'text-anchor': 'end', class: 'gp' });
      else txt(g, r.c != null ? 'só dentro' : 'só fora', { x: W, y: y + 4, 'text-anchor': 'end', style: 'font-size:11.5px' });
      const hit = el('rect', { x: 0, y: y - ROW / 2, width: W, height: ROW, style: 'fill:transparent' }, g);
      const linha = (lab, v, n) => v == null ? `<div class="r">${lab}: não esteve</div>` : `<div class="r">${lab}: ${pc(v)} (${fmt(n)} votações)</div>`;
      hit.addEventListener('pointermove', ev => showTip(`<div class="t">${esc(pn(r.p))}</div>${linha('Com ministério', r.c, r.nc)}${linha('Sem ministério', r.f, r.nf)}`, ev));
      hit.addEventListener('pointerleave', hideTip);
    });
  }

  // ── gráfico de linhas comum (anos) ──
  function lines(box, { series, x0, x1, y0, y1, step, xt, dark, marks, label, tipTitle }) {
    box.innerHTML = '';
    const W = Math.max(280, box.clientWidth), narrow = W < 520;
    const ML = 40, MR = narrow ? 66 : 92, MT = marks ? 24 : 10, MB = 26, H = narrow ? 250 : 300;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': label }, box);
    const X = v => ML + (W - ML - MR) * (v - x0) / (x1 - x0), Y = v => MT + (H - MT - MB) * (1 - (v - y0) / (y1 - y0));
    const gridc = dark ? 'var(--hero-line)' : 'var(--grid)', ink = dark ? 'var(--hero-ink)' : 'var(--text)', bg = dark ? 'var(--hero-bg)' : 'var(--surface)';
    for (let v = y0; v <= y1; v += step) { el('line', { x1: ML, x2: W - MR, y1: Y(v), y2: Y(v), style: `stroke:${gridc}` }, svg); txt(svg, v + '%', { x: ML - 8, y: Y(v) + 4, 'text-anchor': 'end' }); }
    for (const t of xt) if (!narrow || t % 4 === 3 || xt.length < 8) txt(svg, t, { x: X(t), y: H - 6, 'text-anchor': 'middle' });
    for (const [t, lab] of marks || []) {
      el('line', { x1: X(t), x2: X(t), y1: MT - 6, y2: H - MB, style: `stroke:${gridc};stroke-dasharray:3 3` }, svg);
      txt(svg, lab, { x: X(t) + 3, y: MT - 10, style: 'font-size:11px' });
    }
    const ends = [];
    for (const s of series) {
      let d = '', pen = false;
      for (const q of s.pts) { if (q.y == null) { pen = false; continue; } d += (pen ? 'L' : 'M') + X(q.x).toFixed(1) + ',' + Y(q.y).toFixed(1); pen = true; }
      el('path', { d, style: `fill:none;stroke:${s.color};stroke-width:2;stroke-linejoin:round` }, svg);
      for (const q of s.pts) if (q.y != null)
        el('circle', { cx: X(q.x), cy: Y(q.y), r: q.hollow ? 3.6 : 3, style: q.hollow ? `fill:${bg};stroke:${s.color};stroke-width:1.6` : `fill:${s.color};stroke:${bg};stroke-width:1.2` }, svg);
      const last = [...s.pts].reverse().find(q => q.y != null);
      if (last) ends.push({ s, x: X(last.x), y: Y(last.y), ly: Y(last.y) });
    }
    ends.sort((a, b) => a.ly - b.ly);
    for (let i = 1; i < ends.length; i++) if (ends[i].ly - ends[i - 1].ly < 15) ends[i].ly = ends[i - 1].ly + 15;
    for (const e of ends) {
      el('circle', { cx: W - MR + 12, cy: e.ly, r: 4, style: `fill:${e.s.color}` }, svg);
      txt(svg, e.s.short || e.s.name, { x: W - MR + 20, y: e.ly + 4, class: 'lab', style: `fill:${ink}` });
    }
    const cross = el('line', { y1: MT, y2: H - MB, style: `stroke:${ink};stroke-opacity:.35;visibility:hidden` }, svg);
    const hit = el('rect', { x: ML, y: 0, width: W - ML - MR, height: H, style: 'fill:transparent' }, svg);
    hit.addEventListener('pointermove', ev => {
      const r = svg.getBoundingClientRect(), xv = Math.round(x0 + (ev.clientX - r.left - ML) / (W - ML - MR) * (x1 - x0));
      const t = Math.min(x1, Math.max(x0, xv));
      cross.setAttribute('x1', X(t)); cross.setAttribute('x2', X(t)); cross.style.visibility = 'visible';
      const vals = series.map(s => [s, s.pts.find(q => q.x === t)]).filter(([, q]) => q && q.y != null).sort((a, b) => b[1].y - a[1].y);
      showTip(`<div class="t">${tipTitle(t)}</div>` + (vals.length ? vals.map(([s, q]) => `<div class="r">${sw(s.color)}${esc(s.name)}: ${pc(q.y)}${q.note ? ' · ' + q.note : ''}</div>`).join('') : '<div class="r">sem dados neste ano</div>'), ev);
    });
    hit.addEventListener('pointerleave', () => { cross.style.visibility = 'hidden'; hideTip(); });
  }
  const ANOS = Array.from({ length: 23 }, (_, i) => 2003 + i);
  const GMARK = [[2003, 'Lula I'], [2007, 'Lula II'], [2011, 'Dilma I'], [2015, 'Dilma II'], [2016.4, 'Temer'], [2019, 'Bolsonaro'], [2023, 'Lula III']];
  const govDoAno = a => a < 2007 ? 'Lula I' : a < 2011 ? 'Lula II' : a < 2015 ? 'Dilma I' : a === 2015 ? 'Dilma II' : a === 2016 ? 'Dilma II e Temer' : a < 2019 ? 'Temer' : a < 2023 ? 'Bolsonaro' : 'Lula III';

  // ── 2. disciplina e apoio, ano a ano ──
  function drawAnos() {
    const ser = (key, gab, name, short, color) => ({ name, short, color,
      pts: ANOS.map(a => { const r = D.anos.find(q => q.a === a && q.g === gab); return { x: a, y: r ? r[key] : null, hollow: key === 'd' && a === 2025, note: key === 'd' && a === 2025 ? 'orientação registrada em 40% dos votos' : '' }; }) });
    const opts = (key, label) => ({ series: [ser(key, 1, 'Com ministério', 'com', 'var(--accent)'), ser(key, 0, 'Sem ministério', 'sem', 'var(--primary)')],
      x0: 2003, x1: 2025, y0: 30, y1: 100, step: 10, xt: [2003, 2007, 2011, 2015, 2019, 2023], label, tipTitle: a => `${a} · ${govDoAno(a)}` });
    lines($('yd'), opts('d', 'Disciplina partidária por ano, partidos com e sem ministério'));
    lines($('ya'), opts('ap', 'Apoio ao governo por ano, partidos com e sem ministério'));
  }

  // ── 3. partidos ao longo do tempo ──
  const PLIST = [...new Set(D.partido_ano.map(r => r.p))].sort((a, b) => pn(a).localeCompare(pn(b), 'pt-BR'));
  // até seis partidos; escolher um sétimo tira o mais antigo da seleção
  let sel = ['PT', 'PMDB', 'PSDB', 'PP', 'PL', 'PSB'].filter(p => PLIST.includes(p));
  const MAXP = 6, chips = $('chips');
  const chipBtns = PLIST.map(p => {
    const b = document.createElement('button'); b.type = 'button'; b.innerHTML = `<i></i>${esc(pn(p))}`;
    b.addEventListener('click', () => { sel = sel.includes(p) ? sel.filter(q => q !== p) : [...sel, p].slice(-MAXP); syncChips(); drawPano(); });
    chips.appendChild(b); return [p, b];
  });
  function syncChips() {
    for (const [p, b] of chipBtns) {
      const on = sel.includes(p); b.setAttribute('aria-pressed', on);
      b.querySelector('i').style.background = on ? pcol(p) : 'transparent';
    }
  }
  function drawPano() {
    const series = PLIST.filter(p => sel.includes(p)).map(p => ({ name: pn(p), color: pcol(p),
      pts: ANOS.map(a => { const r = D.partido_ano.find(q => q.p === p && q.a === a); return { x: a, y: r ? r.d : null, hollow: a === 2025, note: r ? fmt(r.n) + ' votações' : '' }; }) }));
    // eixo a partir da dezena abaixo do menor valor escolhido (no máximo 80%), para separar as linhas
    const lo = Math.min(...series.flatMap(s => s.pts.filter(q => q.y != null).map(q => q.y)), 100);
    lines($('pano'), { series, x0: 2003, x1: 2025, y0: Math.min(80, Math.floor((lo - 2) / 10) * 10), y1: 100, step: 10, xt: [2003, 2007, 2011, 2015, 2019, 2023], dark: true,
      marks: innerWidth < 560 ? null : GMARK.slice(1).map(([a, l]) => [a, l]), label: 'Disciplina partidária por ano dos partidos escolhidos', tipTitle: a => `${a} · ${govDoAno(a)}` });
  }

  // ── 4. disciplina da coalizão e derrotas, mês a mês ──
  const mi = s => (+s.slice(0, 4) - 2003) * 12 + (+s.slice(5, 7) - 1);
  const GSPAN = [[0, 48], [48, 96], [96, 144], [144, 160 + 11 / 31], [160 + 11 / 31, 192], [192, 240], [240, 276]];
  const mesNome = s => new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, 15).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }).replace(' de ', ' ');
  function drawMes() {
    const box = $('mes'); box.innerHTML = '';
    const W = Math.max(300, box.clientWidth), narrow = W < 620;
    const ML = 40, MR = 10, T1 = 30, H1 = narrow ? 210 : 260, GAP = 34, H2 = 70, H = T1 + H1 + GAP + H2 + 24, Y0 = 40, Y1 = 100;
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, width: W, height: H, role: 'img', 'aria-label': 'Disciplina da coalizão por mês e derrotas do governo por mês, 2003 a 2025' }, box);
    const X = m => ML + (W - ML - MR) * m / 276, Y = v => T1 + H1 * (1 - (v - Y0) / (Y1 - Y0));
    const maxD = Math.max(...D.mensal.map(r => r.dr)), B0 = T1 + H1 + GAP, YB = v => B0 + H2 * (1 - v / maxD);
    for (let v = Y0; v <= Y1; v += 10) { el('line', { x1: ML, x2: W - MR, y1: Y(v), y2: Y(v), style: 'stroke:var(--grid)' }, svg); txt(svg, v + '%', { x: ML - 8, y: Y(v) + 4, 'text-anchor': 'end' }); }
    GSPAN.forEach(([a, b], g) => {
      if (g) el('line', { x1: X(a), x2: X(a), y1: T1 - 22, y2: B0 + H2, style: 'stroke:var(--line-2);stroke-dasharray:3 3' }, svg);
      if (!narrow || b - a > 30) txt(svg, narrow ? SHORT[g] : GOVS[g], { x: X(a) + 4, y: T1 - 12, style: 'font-size:11.5px;fill:var(--muted)' });
    });
    for (const r of D.mensal) if (r.d != null) el('circle', { cx: X(mi(r.m) + 0.5), cy: Y(Math.max(Y0, r.d)), r: 2.6, style: 'fill:var(--primary);fill-opacity:.55' }, svg);
    D.gov_media.forEach(r => {
      const [a, b] = GSPAN[r.g];
      el('line', { x1: X(a) + 2, x2: X(b) - 2, y1: Y(r.d), y2: Y(r.d), style: 'stroke:var(--accent);stroke-width:3;stroke-linecap:round' }, svg);
      if (!narrow) txt(svg, fmt(r.d, 1) + '%', { x: (X(a) + X(b)) / 2, y: Y(r.d) + (r.d > 92 ? 18 : -8), 'text-anchor': 'middle', class: 'lab', style: 'fill:var(--accent-text);paint-order:stroke;stroke:var(--surface);stroke-width:3px' });
    });
    txt(svg, 'Derrotas do governo no mês', { x: ML, y: B0 - 10, style: 'font-weight:600;fill:var(--text)' });
    for (const v of [0, maxD]) { el('line', { x1: ML, x2: W - MR, y1: YB(v), y2: YB(v), style: 'stroke:var(--grid)' }, svg); txt(svg, v, { x: ML - 8, y: YB(v) + 4, 'text-anchor': 'end' }); }
    const bw = Math.max(1.5, (W - ML - MR) / 276 - 1);
    for (const r of D.mensal) if (r.dr > 0) el('rect', { x: X(mi(r.m) + 0.5) - bw / 2, y: YB(r.dr), width: bw, height: YB(0) - YB(r.dr), rx: Math.min(2, bw / 2), style: 'fill:var(--alert)' }, svg);
    for (let a = 2003; a <= 2025; a += narrow ? 4 : 2) txt(svg, a, { x: X((a - 2003) * 12 + 6), y: H - 4, 'text-anchor': 'middle' });
    const byM = Object.fromEntries(D.mensal.map(r => [mi(r.m), r]));
    const cross = el('line', { y1: T1, y2: B0 + H2, style: 'stroke:var(--text);stroke-opacity:.3;visibility:hidden' }, svg);
    const hit = el('rect', { x: ML, y: 0, width: W - ML - MR, height: H, style: 'fill:transparent' }, svg);
    hit.addEventListener('pointermove', ev => {
      const rc = svg.getBoundingClientRect(), m = Math.min(275, Math.max(0, Math.floor((ev.clientX - rc.left - ML) / (W - ML - MR) * 276)));
      cross.setAttribute('x1', X(m + 0.5)); cross.setAttribute('x2', X(m + 0.5)); cross.style.visibility = 'visible';
      const r = byM[m], s = `${2003 + Math.floor(m / 12)}-${String(m % 12 + 1).padStart(2, '0')}`, gi = GSPAN.findIndex(([a, b]) => m + 0.5 >= a && m + 0.5 < b), gm = D.gov_media.find(q => q.g === gi);
      showTip(`<div class="t">${mesNome(s)}${r ? ' · ' + esc(r.gov) : ''}</div>` + (r ? `<div class="r">Disciplina da coalizão: ${r.d != null ? pc(r.d) : 'sem dado'}</div><div class="r">Votações: ${r.vt} · derrotas do governo: ${r.dr}</div>` : '<div class="r">Nenhuma votação neste mês</div>') +
        (gm ? `<div class="r">Média de ${GOVS[gi]}: ${pc(gm.d)} · ${gm.dr} derrotas em ${gm.vt} votações</div>` : ''), ev);
    });
    hit.addEventListener('pointerleave', () => { cross.style.visibility = 'hidden'; hideTip(); });
  }

  // ── 5. deputado a deputado ──
  const DEPS = P.deps.flatMap(([id, nome, uf, rows]) => rows.filter(r => r[5] >= 20 && r[6] != null).map(([g, p, gab, ng, ap, np, di]) => ({ id, nome, uf, key: norm(nome), g, p, gab, np, di })));
  let rg = 6, rord = 1, rshow = 20;
  const rBtns = bandIn($('band2'), GOVS.map((g, i) => [g, SHORT[i]]), i => { rg = i; press(rBtns, i); fillParties(); rshow = 20; drawRank(); });
  const rp = $('rp'), rq = $('rq');
  function fillParties() {
    const ps = [...new Set(DEPS.filter(d => d.g === rg).map(d => d.p))].sort((a, b) => pn(a).localeCompare(pn(b), 'pt-BR'));
    const cur = rp.value;
    rp.innerHTML = '<option value="">Todos</option>' + ps.map(p => `<option value="${p}">${esc(pn(p))}</option>`).join('');
    rp.value = ps.includes(cur) ? cur : '';
  }
  rp.addEventListener('change', () => { rshow = 20; drawRank(); });
  rq.addEventListener('input', () => { rshow = 20; drawRank(); });
  document.querySelectorAll('.lseg button').forEach(b => b.addEventListener('click', () => {
    rord = +b.dataset.o; document.querySelectorAll('.lseg button').forEach(x => x.setAttribute('aria-pressed', x === b)); rshow = 20; drawRank();
  }));
  $('rmore').addEventListener('click', () => { rshow += 40; drawRank(); });
  function drawRank() {
    const all = DEPS.filter(d => d.g === rg && (!rp.value || d.p === rp.value)).sort((a, b) => rord * (a.di - b.di) || a.nome.localeCompare(b.nome, 'pt-BR'));
    all.forEach((d, i) => { d.rk = i + 1; });
    const t = norm(rq.value.trim()), list = t.length >= 2 ? all.filter(d => t.split(/\s+/).every(k => d.key.includes(k))) : all;
    const ord = [...all].sort((a, b) => a.di - b.di), med = ord.length ? (ord[(ord.length - 1) >> 1].di + ord[ord.length >> 1].di) / 2 : 0;
    const quarto = all.filter(d => d.di < 75).length, onde = rp.value ? ` do ${esc(pn(rp.value))}` : '';
    $('rsum').innerHTML = all.length ? `<b>${fmt(all.length)}</b> deputados${onde} no governo ${GOVS[rg]}. Metade seguiu o partido em mais de <b>${pc(med)}</b> dos votos; ${quarto === 0 ? 'nenhum votou' : `<b>${fmt(quarto)}</b> ${quarto === 1 ? 'votou' : 'votaram'}`} contra ele em mais de um quarto das vezes.` : 'Nenhum deputado com pelo menos 20 votos neste recorte.';
    $('rank').innerHTML = list.slice(0, rshow).map(d => `<li><span class="n">${d.rk}º</span><span class="who"><a href="deputado.html#d${d.id}">${esc(d.nome)}</a><small>${esc(pn(d.p))} · ${d.uf} · ${d.gab ? 'com ministério' : 'sem ministério'}</small></span>
      <span class="tr" aria-hidden="true"><i style="width:${d.di}%"></i></span><span class="v">${pc(d.di)}<small>${fmt(d.np)} votos</small></span></li>`).join('')
      || (t.length >= 2 ? '<li class="none">Nenhum deputado com esse nome neste recorte.</li>' : '');
    $('rmore').hidden = list.length <= rshow;
  }

  press(pBtns, pg); drawP();
  drawAnos();
  syncChips(); drawPano();
  drawMes();
  press(rBtns, rg); fillParties(); drawRank();
  let rz, lastW = 0;
  new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { const w = document.body.clientWidth; if (w !== lastW) { lastW = w; drawP(); drawAnos(); drawPano(); drawMes(); } }, 120); }).observe(document.body);
})();
