/* 스스로연구소 · 자료실 렌더링 */
(function () {
  'use strict';
  var S = window.SSR;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var GRADE = { '◎': ['direct', '셀프 가능'], '○': ['cond', '조건부 가능'], '△': ['part', '부분 가능'], '×': ['verify', '전문업체 필수'] };
  function gbadge(g) { var x = GRADE[g] || ['part', g]; return '<span class="badge badge-' + x[0] + '">' + g + ' ' + x[1] + '</span>'; }
  function qOf(u) {
    if (!u) return '';
    var m = String(u).match(/[?&](?:q|query)=([^&]*)/); if (!m) return '';
    try { return decodeURIComponent(m[1].replace(/\+/g, ' ')).replace(/\s+/g, ' ').trim(); } catch (e) { return m[1]; }
  }
  function linkBtns(o, pro, name, note) {
    var q = qOf(o.l3) || (pro === 'tools' ? qOf(o.l2) : '') || qOf(o.l1);
    var proLink = (o.l4 && o.l4n && o.l4n !== '-' && ['다나와', '오늘의집', '쿠팡'].indexOf(o.l4n) < 0) ? { n: o.l4n, u: o.l4 } : null;
    if (q && S.buyLinks) return S.buyLinks(q, { pro: proLink }) + (name && S.addBtn ? S.addBtn(q, name, note || '') : '');
    var a = [];
    if (o.l1) a.push('<a href="' + esc(o.l1) + '" target="_blank" rel="noopener nofollow">다나와</a>');
    if (o.l2) a.push('<a href="' + esc(o.l2) + '" target="_blank" rel="noopener nofollow">' + (pro === 'tools' ? '쿠팡' : '오늘의집') + '</a>');
    if (o.l3) a.push('<a href="' + esc(o.l3) + '" target="_blank" rel="noopener nofollow">쿠팡</a>');
    if (o.l4 && o.l4n && o.l4n !== '-' && ['다나와','오늘의집','쿠팡'].indexOf(o.l4n) < 0) a.push('<a class="pro" href="' + esc(o.l4) + '" target="_blank" rel="noopener nofollow">' + esc(o.l4n) + '</a>');
    return a.length ? '<div class="links">' + a.join('') + '</div>' : '';
  }
  function accordion(root, sel) {
    qa(sel + ' > button', root).forEach(function (h) {
      h.addEventListener('click', function () { var it = h.parentNode; var o = it.classList.toggle('is-open'); h.setAttribute('aria-expanded', o ? 'true' : 'false'); });
    });
  }
  function param(k) { return new URLSearchParams(location.search).get(k) || ''; }

  /* ---------- 총정리 카탈로그 ---------- */
  var catRoot = q('#catList');
  if (catRoot && S.cat) {
    var rows = S.cat.catalog;
    var cats = []; rows.forEach(function (r) { if (cats.indexOf(r.cat) < 0) cats.push(r.cat); });
    var sel = q('#catSel'); cats.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; sel.appendChild(o); });
    var st = { cat: param('cat'), grade: 'all', apply: 'shop', text: param('q') };
    if (st.cat && cats.indexOf(st.cat) < 0) st.cat = '';
    sel.value = st.cat; q('#catSearch').value = st.text;
    var srcMap = {}; (S.cat.sources || []).forEach(function (s) { srcMap[s.id] = s; });

    function render() {
      var t = st.text.trim().toLowerCase();
      var list = rows.filter(function (r) {
        if (st.cat && r.cat !== st.cat) return false;
        if (st.grade !== 'all' && r.grade !== st.grade) return false;
        if (st.apply === 'shop' && r.apply === '주거 위주') return false;
        if (st.apply === 'home' && r.apply !== '주거 위주') return false;
        if (t && (r.name + r.sub + r.cat + r.desc + r.tools + r.mats + r.brand).toLowerCase().indexOf(t) < 0) return false;
        return true;
      });
      q('#catCount').textContent = list.length + '개 항목';
      if (!list.length) { catRoot.innerHTML = '<div class="box"><p>조건에 맞는 항목이 없습니다. 검색어를 줄이거나 필터를 바꿔 보세요.</p></div>'; return; }
      var html = '', lastCat = '';
      list.forEach(function (r) {
        if (!st.cat && r.cat !== lastCat) { html += '<h3 class="grp-title">' + esc(r.cat) + '</h3>'; lastCat = r.cat; }
        var tags = '';
        if (r.star) tags += '<span class="tag tag-star">★ 후기 우수</span>';
        if (r.value) tags += '<span class="tag tag-value">◆ 가성비</span>';
        if (r.apply !== '공용') tags += '<span class="tag">' + esc(r.apply) + '</span>';
        var srcs = (r.src || '').split(/[,·]\s*/).filter(function (x) { return srcMap[x]; }).map(function (x) { return '<a href="' + esc(srcMap[x].url) + '" target="_blank" rel="noopener nofollow">' + esc(srcMap[x].name) + '</a>'; }).join(' · ');
        html += '<div class="c-item" id="c-' + r.no + '"><button class="c-head" type="button" aria-expanded="false">' +
          '<span class="nm">' + esc(r.name) + tags + '<span class="path">' + esc(r.cat) + ' › ' + esc(r.sub) + ' · 난이도 ' + esc(r.lv) + '/5 · 원상복구 ' + esc(r.restore || '-') + '</span></span>' +
          gbadge(r.grade) + '<span class="arrow" aria-hidden="true"></span></button>' +
          '<div class="c-body"><p style="margin:12px 0 0">' + esc(r.desc) + '</p><dl>' +
          (r.steps && r.steps !== '-' ? '<dt>시공 단계</dt><dd>' + esc(r.steps) + '</dd>' : '') +
          (r.tools && r.tools !== '-' ? '<dt>필요 도구</dt><dd>' + esc(r.tools) + '</dd>' : '') +
          (r.mats && r.mats !== '-' ? '<dt>자재·부자재</dt><dd>' + esc(r.mats) + '</dd>' : '') +
          (r.brand && r.brand !== '-' ? '<dt>추천 제품</dt><dd>' + esc(r.brand) + '</dd>' : '') +
          (r.price ? '<dt>참고 가격</dt><dd>' + esc(r.price) + ' <span class="text-muted text-small">(2026.09 조사 시점)</span></dd>' : '') +
          (r.time && r.time !== '-' ? '<dt>소요 시간</dt><dd>' + esc(r.time) + '</dd>' : '') +
          (r.review && r.review !== '-' ? '<dt>후기 근거</dt><dd>' + esc(r.review) + '</dd>' : '') +
          (r.caution && r.caution !== '-' ? '<dt>주의·법규</dt><dd><strong style="color:var(--stop)">' + esc(r.caution) + '</strong></dd>' : '') +
          '</dl>' + linkBtns(r, null, r.name, r.cat) + (srcs ? '<p class="text-small text-muted mt-16" style="margin-bottom:0">출처 · ' + srcs + '</p>' : '') + '</div></div>';
      });
      catRoot.innerHTML = html; accordion(catRoot, '.c-item');
      if (location.hash) { var el = q(location.hash, catRoot); if (el) { el.classList.add('is-open'); el.scrollIntoView({ block: 'center' }); } }
    }
    sel.addEventListener('change', function () { st.cat = sel.value; render(); });
    q('#catSearch').addEventListener('input', function () { st.text = this.value; render(); });
    qa('[data-grade]').forEach(function (c) { c.addEventListener('click', function () { qa('[data-grade]').forEach(function (x) { x.classList.remove('is-on'); }); c.classList.add('is-on'); st.grade = c.getAttribute('data-grade'); render(); }); });
    qa('[data-apply]').forEach(function (c) { c.addEventListener('click', function () { qa('[data-apply]').forEach(function (x) { x.classList.remove('is-on'); }); c.classList.add('is-on'); st.apply = c.getAttribute('data-apply'); render(); }); });
    render();
  }

  /* ---------- 도구 ---------- */
  var toolRoot = q('#toolList');
  if (toolRoot && S.lib) {
    var grps = ['필수', '권장', '선택', '안전', '대여'];
    var gdesc = { '필수': '처음 한 번 갖추면 대부분의 셀프 공정에 쓰입니다. 세트로 25~45만 원 선.', '권장': '특정 공정을 할 때 필요합니다. 그 공정을 할 계획이 있을 때만.', '선택': '있으면 편하지만 대체 수단이 있습니다. 재단 주문·대여로 대신할 수 있는지 먼저 확인.', '안전': '철거·절단·타공이 있으면 필수입니다.', '대여': '드물게 쓰는 공구는 사지 마세요. 주민센터 공구도서관이 무료~2,000원입니다.' };
    var html = '';
    grps.forEach(function (g) {
      var items = S.lib.tools.filter(function (t) { return t.grp === g; });
      if (!items.length) return;
      html += '<h3 class="grp-title">' + g + ' <span class="text-muted text-small" style="font-weight:400">' + items.length + '</span></h3><p class="text-muted text-small">' + esc(gdesc[g] || '') + '</p>';
      html += '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>공구</th><th>용도·공정</th><th>참고 가격</th><th>추천 브랜드</th><th>선택 포인트</th><th>구매</th></tr></thead><tbody>';
      items.forEach(function (t) {
        html += '<tr><td><strong>' + esc(t.name) + '</strong></td><td>' + esc(t.use) + '</td><td>' + esc(t.price) + '</td><td>' + esc(t.brand) + '</td><td class="text-small">' + esc(t.tip) + '</td><td>' + linkBtns({ l1: t.l1, l2: t.l2 }, 'tools', t.name, '공구 · ' + t.grp) + '</td></tr>';
      });
      html += '</tbody></table></div>';
    });
    toolRoot.innerHTML = html;
  }

  /* ---------- 자재 ---------- */
  var matRoot = q('#matList');
  if (matRoot && S.lib) {
    var mcats = []; S.lib.materials.forEach(function (m) { if (mcats.indexOf(m.cat) < 0) mcats.push(m.cat); });
    var msel = q('#matSel'); mcats.forEach(function (c) { var o = document.createElement('option'); o.value = c; o.textContent = c; msel.appendChild(o); });
    var mst = { cat: '', text: '' };
    function renderM() {
      var t = mst.text.trim().toLowerCase();
      var list = S.lib.materials.filter(function (m) { return (!mst.cat || m.cat === mst.cat) && (!t || (m.name + m.cat + m.use + m.brand).toLowerCase().indexOf(t) >= 0); });
      q('#matCount').textContent = list.length + '개';
      var html = '', last = '';
      list.forEach(function (m) {
        if (m.cat !== last) { if (last) html += '</tbody></table></div>'; html += '<h3 class="grp-title">' + esc(m.cat) + '</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>자재·부자재</th><th>규격·단위</th><th>용도</th><th>참고 가격</th><th>추천</th><th>포인트</th><th>구매</th></tr></thead><tbody>'; last = m.cat; }
        html += '<tr><td><strong>' + esc(m.name) + '</strong></td><td>' + esc(m.spec) + '</td><td>' + esc(m.use) + '</td><td>' + esc(m.price) + '</td><td>' + esc(m.brand) + '</td><td class="text-small">' + esc(m.tip) + '</td><td>' + linkBtns(m, null, m.name, m.cat) + '</td></tr>';
      });
      if (last) html += '</tbody></table></div>';
      matRoot.innerHTML = html || '<div class="box"><p>조건에 맞는 자재가 없습니다.</p></div>';
    }
    msel.addEventListener('change', function () { mst.cat = msel.value; renderM(); });
    q('#matSearch').addEventListener('input', function () { mst.text = this.value; renderM(); });
    renderM();
  }

  /* ---------- 구매처 ---------- */
  var stRoot = q('#storeList');
  if (stRoot && S.lib) {
    var types = []; S.lib.stores.forEach(function (s) { if (types.indexOf(s.type) < 0) types.push(s.type); });
    var html = '';
    types.forEach(function (tp) {
      var items = S.lib.stores.filter(function (s) { return s.type === tp; });
      html += '<h3 class="grp-title">' + esc(tp) + '</h3><div class="store-grid">';
      items.forEach(function (s) {
        html += '<a class="store" href="' + esc(s.url) + '" target="_blank" rel="noopener nofollow"><div class="nm">' + esc(s.name) + '</div><div class="st">' + esc(s.strength) + '</div><div class="it">' + esc(s.items) + '</div></a>';
      });
      html += '</div>';
    });
    stRoot.innerHTML = html;
  }

  /* ---------- 계산기 ---------- */
  if (q('#calcRoot') && S.lib) {
    function num(id) { var v = parseFloat(q('#' + id).value); return isNaN(v) ? 0 : v; }
    function fmt(n, d) { return Number(n.toFixed(d == null ? 1 : d)).toLocaleString('ko-KR'); }
    var C = {
      paint: function () { var a = num('p-peri') * num('p-h') - num('p-open'); var L = a * num('p-coats') / (num('p-cov') * 0.75); var b18 = Math.floor(L / 18), rem = L - b18 * 18, b4 = Math.ceil(rem / 4); return '도장 면적 <strong>' + fmt(a) + '㎡</strong> · 필요량 <strong>약 ' + fmt(L) + 'L</strong> → 18L ' + b18 + '통 + 4L ' + b4 + '통 (실효율 75% 적용, 터치업용 1통 여유)'; },
      paper: function () { var n = num('w-peri') / 0.5 * (num('w-pattern') ? 1.2 : 1.1); return '소폭 53cm 기준 <strong>약 ' + Math.ceil(n) + '장</strong> (높이는 벽 높이 + 10cm로 주문)'; },
      deco: function () { var b = num('d-area') / 3.24 * 1.1; return '600각 9장 박스 기준 <strong>' + Math.ceil(b) + '박스</strong> (여유분 10% 포함)'; },
      tile: function () { var s = num('t-size') / 1000; var one = s * s; var m = num('t-pattern') ? 1.2 : 1.15; return '<strong>약 ' + Math.ceil(num('t-area') / one * m) + '장</strong> (여유분 ' + Math.round((m - 1) * 100) + '%)'; },
      carpet: function () { return '<strong>약 ' + Math.ceil(num('c-area') / 0.25 * 1.05) + '장</strong> (50×50, 여유분 5%)'; },
      base: function () { var m = (num('b-peri') - num('b-door')) * 1.1; return '<strong>약 ' + fmt(m) + 'm</strong> → 2.4m 기준 ' + Math.ceil(m / 2.4) + '본'; },
      led: function () { var w = num('l-w') * num('l-len') * 1.2; var amp = w / num('l-v'); var rec = Math.ceil(amp); if (rec - amp < 0.5) rec += 1; return '필요 출력 <strong>' + fmt(w, 0) + 'W</strong> (' + fmt(amp, 1) + 'A) → ' + num('l-v') + 'V <strong>' + rec + 'A</strong> 어댑터 권장'; },
      sil: function () { return '<strong>약 ' + Math.ceil(num('s-len') / 7) + '개</strong> (300ml 1개 ≈ 6~8m, 5mm 비드)'; },
      power: function () { var w = num('e-w') * num('e-rate'); var kw = w / 1000; var c = num('e-contract'); return '동시 부하 <strong>약 ' + fmt(kw, 2) + 'kW</strong>' + (c ? (kw > c ? ' — 계약전력 ' + c + 'kW <strong style="color:var(--stop)">초과</strong>. 한전 증설 신청과 내선 공사 검토' : ' — 계약전력 ' + c + 'kW 안에 있음') : ''); },
      vent: function () { return '필요 풍량 <strong>약 ' + fmt(num('v-vol') * num('v-rate'), 0) + 'CMH</strong>'; },
      waste: function () { var p = num('m-py'); return '벽지 약 <strong>' + Math.ceil(p / 30 * 12) + '포</strong> · 장판 약 <strong>' + Math.ceil(p / 10 * 6) + '포</strong> (50L 마대, 지자체 규격·요금 확인)'; },
    };
    qa('.calc').forEach(function (c) {
      var k = c.getAttribute('data-calc'); var out = q('.out', c);
      function run() { try { out.innerHTML = C[k](); } catch (e) { out.textContent = '입력값을 확인하세요.'; } }
      qa('input, select', c).forEach(function (i) { i.addEventListener('input', run); i.addEventListener('change', run); });
      run();
    });
    // 기준값 표
    var sroot = q('#stdList'); var sgrps = []; S.lib.standards.forEach(function (s) { if (sgrps.indexOf(s.grp) < 0) sgrps.push(s.grp); });
    var sh = '';
    sgrps.forEach(function (g) {
      sh += '<h3 class="grp-title">' + esc(g) + '</h3><div class="tbl-wrap"><table class="tbl"><thead><tr><th>항목</th><th>기준값</th><th>비고</th></tr></thead><tbody>';
      S.lib.standards.filter(function (s) { return s.grp === g; }).forEach(function (s) { sh += '<tr><td><strong>' + esc(s.name) + '</strong></td><td>' + esc(s.value) + '</td><td class="text-small text-muted">' + esc(s.note) + '</td></tr>'; });
      sh += '</tbody></table></div>';
    });
    sroot.innerHTML = sh;
    var froot = q('#formulaList'); var fh = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th class="c">#</th><th>항목</th><th>공식</th><th>예시</th></tr></thead><tbody>';
    S.lib.formulas.forEach(function (f) { fh += '<tr><td class="c"><span class="score">' + f.no + '</span></td><td><strong>' + esc(f.name) + '</strong></td><td>' + esc(f.formula) + '</td><td class="text-small text-muted">' + esc(f.ex) + '</td></tr>'; });
    froot.innerHTML = fh + '</tbody></table></div>';
  }

  /* ---------- 예산 템플릿 ---------- */
  var bud = q('#budgetTable');
  if (bud && S.lib) {
    var cols = ['mat', 'tool', 'pro', 'etc'];
    var KEY = 'ssr_budget_v1';
    var saved = {}; try { saved = JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) {}
    var html = '';
    S.lib.budget_cats.forEach(function (c, i) {
      html += '<tr><td>' + (i + 1) + '</td><td>' + esc(c) + '</td>';
      cols.forEach(function (k) { var v = (saved[i] || {})[k] || ''; html += '<td><input type="number" min="0" step="10000" inputmode="numeric" data-r="' + i + '" data-c="' + k + '" value="' + esc(v) + '" placeholder="0"></td>'; });
      html += '<td class="sum" data-rowsum="' + i + '">0</td></tr>';
    });
    q('tbody', bud).innerHTML = html;
    var rate = q('#budRate'); if (saved.rate != null) rate.value = saved.rate;
    function fmtW(n) { return n ? Math.round(n).toLocaleString('ko-KR') : '0'; }
    function recalc() {
      var col = { mat: 0, tool: 0, pro: 0, etc: 0 }; var total = 0; var data = { rate: rate.value };
      S.lib.budget_cats.forEach(function (c, i) {
        var rs = 0; data[i] = {};
        cols.forEach(function (k) { var el = q('input[data-r="' + i + '"][data-c="' + k + '"]', bud); var v = parseFloat(el.value) || 0; data[i][k] = el.value; rs += v; col[k] += v; });
        q('[data-rowsum="' + i + '"]', bud).textContent = fmtW(rs); total += rs;
      });
      cols.forEach(function (k) { q('[data-colsum="' + k + '"]', bud).textContent = fmtW(col[k]); });
      q('#budSub').textContent = fmtW(total);
      var res = total * (parseFloat(rate.value) || 0) / 100;
      q('#budRes').textContent = fmtW(res); q('#budTotal').textContent = fmtW(total + res);
      try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) {}
    }
    qa('input', bud).forEach(function (i) { i.addEventListener('input', recalc); });
    rate.addEventListener('input', recalc);
    q('#budReset').addEventListener('click', function () { if (!confirm('입력한 금액을 모두 지울까요?')) return; qa('input[type=number]', bud).forEach(function (i) { i.value = ''; }); recalc(); });
    q('#budCopy').addEventListener('click', function () {
      var lines = ['[스스로연구소 예산 템플릿]', '대분류\t자재비\t도구·소모품\t업체 시공비\t폐기물·기타\t합계'];
      S.lib.budget_cats.forEach(function (c, i) { var vals = cols.map(function (k) { return q('input[data-r="' + i + '"][data-c="' + k + '"]', bud).value || 0; }); var s = vals.reduce(function (a, b) { return a + (parseFloat(b) || 0); }, 0); if (s) lines.push([c].concat(vals, [s]).join('\t')); });
      lines.push('소계\t\t\t\t\t' + q('#budSub').textContent, '예비비(' + rate.value + '%)\t\t\t\t\t' + q('#budRes').textContent, '총계\t\t\t\t\t' + q('#budTotal').textContent);
      S.copy(lines.join('\n'), this);
    });
    recalc();
  }

  /* ---------- 체크리스트 ---------- */
  var ckRoot = q('#ckShop');
  if (ckRoot && S.lib) {
    var K2 = 'ssr_ck_shop';
    var done = {}; try { done = JSON.parse(localStorage.getItem(K2) || '{}'); } catch (e) {}
    ckRoot.innerHTML = S.lib.chk_shop.map(function (t, i) { return '<li><label><input type="checkbox" data-i="' + i + '"' + (done[i] ? ' checked' : '') + '><span>' + esc(t) + '</span></label></li>'; }).join('');
    function prog() { var n = qa('input', ckRoot).length, d = qa('input:checked', ckRoot).length; q('#ckBar i').style.width = Math.round(d / n * 100) + '%'; q('#ckText').textContent = d + ' / ' + n; }
    qa('input', ckRoot).forEach(function (i) { i.addEventListener('change', function () { done[i.getAttribute('data-i')] = i.checked; try { localStorage.setItem(K2, JSON.stringify(done)); } catch (e) {} prog(); }); });
    q('#ckReset').addEventListener('click', function () { qa('input', ckRoot).forEach(function (i) { i.checked = false; }); done = {}; localStorage.removeItem(K2); prog(); });
    prog();
    var ph = '';
    S.lib.process.forEach(function (p) { ph += '<li><span class="ph">' + p.no + '</span><span class="nm">' + esc(p.name) + '<small>' + esc(p.tip) + '</small></span><span class="badge ' + (p.self.indexOf('◎') >= 0 ? 'badge-direct' : p.self.indexOf('×') >= 0 ? 'badge-verify' : p.self.indexOf('△') >= 0 ? 'badge-part' : 'badge-cond') + '">' + esc(p.self) + '</span></li>'; });
    q('#procList').innerHTML = ph;
    var ah = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>절차</th><th>내용</th><th>담당·창구</th></tr></thead><tbody>';
    S.lib.admin.filter(function (a) { return a.apply !== '주거'; }).forEach(function (a) { ah += '<tr><td><strong>' + esc(a.name) + '</strong></td><td>' + esc(a.content) + '</td><td class="text-small">' + esc(a.office) + '</td></tr>'; });
    q('#adminList').innerHTML = ah + '</tbody></table></div>';
    var dh = '';
    S.lib.design.forEach(function (d) { dh += '<li><span class="ph">' + d.no + '</span><span class="nm">' + esc(d.step) + ' — ' + esc(d.tool) + '<small>' + esc(d.content) + '</small></span><span></span></li>'; });
    q('#designList').innerHTML = dh;
    var ih = '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>공정</th><th>확인 항목</th></tr></thead><tbody>';
    S.lib.inspect.forEach(function (x) { ih += '<tr><td><strong>' + esc(x.name) + '</strong></td><td>' + esc(x.items) + '</td></tr>'; });
    q('#inspectList').innerHTML = ih + '</tbody></table></div>';
  }

  /* ---------- 법규·안전 (가이드 페이지) ---------- */
  var lawRoot = q('#lawList');
  if (lawRoot && S.lib) {
    lawRoot.innerHTML = S.lib.laws.filter(function (l) { return l.apply !== '주거'; }).map(function (l, i) {
      return '<div class="c-item"><button class="c-head" type="button" aria-expanded="false"><span class="nm">' + esc(l.area) + '<span class="path">' + esc(l.basis) + '</span></span><span class="tag">' + esc(l.apply) + '</span><span class="arrow" aria-hidden="true"></span></button><div class="c-body"><p style="margin:12px 0 8px">' + esc(l.content) + '</p><p style="margin:0"><strong>대응 —</strong> ' + esc(l.action) + '</p></div></div>';
    }).join('');
    accordion(lawRoot, '.c-item');
  }

  /* ---------- 우선 추천 (시공소·허브) ---------- */
  var featRoot = q('#featList');
  if (featRoot && S.lib) {
    var n = parseInt(featRoot.getAttribute('data-n') || '8', 10);
    var items = S.lib.featured.filter(function (f) { return f.apply !== '주거 위주'; }).slice(0, n);
    featRoot.innerHTML = items.map(function (f) {
      return '<a class="feat" href="catalog.html?q=' + encodeURIComponent(f.name.split('(')[0].trim()) + '"><div class="cat">' + esc(f.cat) + ' · ' + gbadge(f.grade) + '</div><div class="nm">' + esc(f.name) + '</div><div class="pr">' + esc(f.price) + '</div></a>';
    }).join('');
  }
})();
