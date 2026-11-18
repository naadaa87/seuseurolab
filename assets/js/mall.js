/* 스스로몰 메인 — 검색, 카테고리, 자주 찾는 제품·키트, 공정별 키트, 전체 상품 */
(function () {
  'use strict';
  var S = window.SSR, M = S && S.mall;
  if (!M) return;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function goTo(id) { var el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' }); }

  var catLabel = {}; M.cats.forEach(function (c) { catLabel[c[0]] = c[1]; });
  var byId = {}; M.products.forEach(function (p, i) { p._i = i; byId[p.id] = p; });
  var kitOf = {}; M.kits.forEach(function (k) { k.items.forEach(function (id) { (kitOf[id] = kitOf[id] || []).push(k); }); });
  function pick(p) { return S.pick ? S.pick(p.q) : null; }
  function shortName(n) { return String(n).split(/[(·+,]/)[0].trim(); }
  function priceMin(s) {
    var m = String(s || '').replace(/,/g, '').match(/(\d+(?:\.\d+)?)/); if (!m) return Infinity;
    var v = parseFloat(m[1]); if (/만/.test(s) && v < 1000) v *= 10000; return v;
  }

  /* 쿠팡 링크 (대표 상품이 있으면 상품, 없으면 검색 결과) */
  function cpLink(p, cls, label) {
    var pu = S.pickUrl ? S.pickUrl(p.q) : '', sa = S.aff[S.affKey('coupang', p.q)];
    var href = pu || sa || S.searchUrl('coupang', p.q), aff = !!(pu || sa);
    return '<a class="' + cls + (aff ? ' is-aff' : '') + '" data-p="coupang" data-q="' + esc(pu ? '@' + p.q : p.q) + '" href="' + esc(href) + '" target="_blank" rel="' + (aff ? 'sponsored noopener' : 'noopener nofollow') + '">' + label + (aff ? '<span class="aff-tag">제휴</span>' : '') + '</a>';
  }
  function thumb(p) {
    var x = pick(p);
    return x && x.img ? '<img src="' + esc(x.img) + '" alt="" width="230" height="230" loading="lazy" decoding="async" referrerpolicy="no-referrer">' : '<span class="ph">' + esc(catLabel[p.cat] || '') + '</span>';
  }

  /* 카테고리 아이콘 */
  var IC = {
    tools: '<path d="M3 7h11a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H9l-1.2 7H4.6l1.2-7H3z"/><path d="M16 10h5"/>',
    floor: '<path d="M2 19 6 8h12l4 11z"/><path d="M9 8 7.5 19M15 8l1.5 11M4 13.5h16"/>',
    paint: '<rect x="3" y="3" width="14" height="6" rx="1"/><path d="M17 6h3v5h-8v3"/><rect x="10.5" y="14" width="3" height="7" rx="1"/>',
    film: '<path d="M5 4h11a3 3 0 0 1 0 6H5z"/><path d="M5 4v16h11V10"/>',
    panel: '<rect x="3" y="3" width="18" height="18" rx="1"/><path d="M7.5 3v18M12 3v18M16.5 3v18"/>',
    tile: '<path d="M5 21V8a4 4 0 0 1 8 0"/><path d="M10 8h6l-1 3h-4z"/><path d="M12 14.5v1M15 14.5v1M18 14.5v1M12 18.5v1M15 18.5v1M18 18.5v1"/>',
    light: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z"/>',
    window: '<rect x="4" y="3" width="16" height="18" rx="1"/><path d="M12 3v18M4 12h16"/>',
    display: '<path d="M4 3v18M20 3v18M4 8h16M4 14h16M4 20h16"/><path d="M7 5.5h3M14 11h4M8 17h2"/>',
    shop: '<path d="M3 9 5 4h14l2 5"/><path d="M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0"/><path d="M5 12v9h14v-9"/><path d="M10 21v-5h4v5"/>',
    safety: '<path d="M12 3 4 6v6c0 4.4 3.4 8.2 8 9 4.6-.8 8-4.6 8-9V6z"/><path d="m9 12 2 2 4-4"/>',
    supply: '<circle cx="10" cy="11" r="7"/><circle cx="10" cy="11" r="2.5"/><path d="M10 18h11"/>'
  };
  function icon(cat) { return '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">' + (IC[cat] || IC.supply) + '</svg>'; }

  /* ---------- 검색 ---------- */
  var SYN = {
    '페인트칠': ['페인트', '도장'], '칠': ['페인트', '도장'], '도장': ['페인트', '도장'], '도배': ['벽지', '도배'], '벽지': ['벽지', '도배'],
    '장판': ['장판', '데코타일', '바닥'], '바닥': ['바닥', '데코타일', '장판', '마루'], '마루': ['마루', '바닥'],
    '방음': ['흡음', '차음', '방음'], '소음': ['흡음', '차음', '방음'], '간판': ['사인', '간판'], '블라인드': ['롤스크린', '블라인드'],
    '커튼': ['커튼', '암막'], '선반': ['진열', '선반', '앵글'], '진열대': ['진열', '앵글', '콤비락'], 'cctv': ['카메라', 'cctv'], '카메라': ['카메라'],
    '조명': ['조명', 'led', '레일', '전구'], '전등': ['조명', '전구', 'led'], '줄눈': ['줄눈'], '곰팡이': ['실리콘', '곰팡이'],
    '시트지': ['시트', '필름'], '필름': ['필름', '시트'], '타일': ['타일'], '공구': ['공구'], '철거': ['철거', '제거', '마대'],
    '원상복구': ['원상복구', '제거', '보수', '퍼티'], '보수': ['보수', '퍼티', '핸디코트'], '단열': ['단열'], '결로': ['결로', '단열'],
    '교체': [], '셀프': [], '시공': [], '하기': [], '작업': []
  };
  function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim(); }
  function tokens(text) {
    return norm(text).split(' ').filter(Boolean).map(function (t) {
      var alt = SYN[t]; if (alt && !alt.length) return null;
      return alt ? alt : [t];
    }).filter(Boolean);
  }
  M.products.forEach(function (p) {
    var x = pick(p);
    p._name = norm(p.name + ' ' + p.q + ' ' + (x ? x.n : ''));
    p._all = norm([p.name, p.q, p.sub, p.use, p.brand, p.spec, p.tip, catLabel[p.cat], x ? x.n : '', (kitOf[p.id] || []).map(function (k) { return k.name; }).join(' ')].join(' '));
  });
  var GROUPS = [
    ['finish', '바닥·벽 마감', ['paint', 'decotile', 'film', 'tambour', 'silicone']],
    ['light', '조명', ['rail', 'led']],
    ['space', '창·방음', ['window', 'acoustic']],
    ['display', '진열·사인', ['display', 'sign']],
    ['ops', '운영·안전', ['security', 'open']],
    ['base', '공구·원상복구', ['starter', 'restore']]
  ];
  var groupOf = {}; GROUPS.forEach(function (g) { g[2].forEach(function (s) { groupOf[s] = g; }); });
  M.kits.forEach(function (k) {
    k._all = norm([k.name, k.short, (groupOf[k.slug] || ['', ''])[1], k.items.map(function (id) { return byId[id] ? byId[id].name : ''; }).join(' ')].join(' '));
  });
  function matchScore(text, nameText, toks) {
    var sc = 0;
    for (var i = 0; i < toks.length; i++) {
      var alts = toks[i], hit = 0;
      for (var j = 0; j < alts.length; j++) {
        if (nameText && nameText.indexOf(alts[j]) >= 0) { hit = 3; break; }
        if (text.indexOf(alts[j]) >= 0) hit = Math.max(hit, 1);
      }
      if (!hit) return 0;
      sc += hit;
    }
    return sc;
  }
  function search(text) {
    var toks = tokens(text);
    if (!toks.length) return { prods: [], kits: [], cats: [] };
    var prods = M.products.map(function (p) { return [p, matchScore(p._all, p._name, toks)]; }).filter(function (x) { return x[1] > 0; })
      .sort(function (a, b) { return b[1] - a[1] || a[0]._i - b[0]._i; }).map(function (x) { return x[0]; });
    var kits = M.kits.map(function (k) { return [k, matchScore(k._all, norm(k.name), toks)]; }).filter(function (x) { return x[1] > 0; })
      .sort(function (a, b) { return b[1] - a[1]; }).map(function (x) { return x[0]; });
    var cats = M.cats.filter(function (c) { return matchScore(norm(c[1]), norm(c[1]), toks) > 0; });
    return { prods: prods, kits: kits, cats: cats };
  }

  /* 검색창 + 자동 완성 */
  var form = $('#mallSearchForm'), input = $('#mallQ'), pop = $('#msPop');
  var opts = [], active = -1;
  if (window.matchMedia && window.matchMedia('(max-width: 640px)').matches) input.placeholder = '자재·공구 이름이나 공사 종류로 검색';
  function closePop() { pop.hidden = true; input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); active = -1; }
  function renderPop() {
    var v = input.value.trim();
    if (!v) { closePop(); return; }
    var r = search(v), h = '', n = 0; opts = [];
    function opt(kind, val, inner) { var id = 'ms-o' + (n++); opts.push({ id: id, kind: kind, val: val }); return '<div class="ms-opt ms-' + kind + '" role="option" id="' + id + '" data-i="' + (n - 1) + '">' + inner + '</div>'; }
    if (r.kits.length) {
      h += '<div class="ms-grp">키트</div>' + r.kits.slice(0, 3).map(function (k) {
        return opt('kit', k.slug, '<span class="ms-kico" aria-hidden="true">' + k.items.length + '</span><span><strong>' + esc(k.name) + '</strong><small>' + esc(k.short) + '</small></span>');
      }).join('');
    }
    if (r.prods.length) {
      h += '<div class="ms-grp">도구·자재</div>' + r.prods.slice(0, 6).map(function (p) {
        var x = pick(p);
        return opt('prod', p.id, '<span class="ms-th">' + thumb(p) + '</span><span><strong>' + esc(p.name) + '</strong><small>' + esc(catLabel[p.cat]) + (x ? ' · ' + esc(x.n) : '') + '</small></span>');
      }).join('');
    }
    if (r.cats.length) {
      h += '<div class="ms-grp">카테고리</div>' + r.cats.slice(0, 2).map(function (c) { return opt('cat', c[0], '<span class="ms-cico">' + icon(c[0]) + '</span><span><strong>' + esc(c[1]) + '</strong></span>'); }).join('');
    }
    h += opt('all', v, '<span class="ms-allq">' + (r.prods.length ? '‘' + esc(v) + '’ 검색 결과 ' + r.prods.length + '개 모두 보기' : '‘' + esc(v) + '’와 맞는 상품이 없습니다. 셀프시공 총정리에서 찾아보기') + '</span>');
    pop.innerHTML = h; pop.hidden = false; input.setAttribute('aria-expanded', 'true'); active = -1;
  }
  function setActive(i) {
    $$('.ms-opt', pop).forEach(function (el) { el.classList.remove('is-active'); el.removeAttribute('aria-selected'); });
    active = i;
    if (i < 0 || !opts[i]) { input.removeAttribute('aria-activedescendant'); return; }
    var el = document.getElementById(opts[i].id); el.classList.add('is-active'); el.setAttribute('aria-selected', 'true');
    input.setAttribute('aria-activedescendant', opts[i].id); el.scrollIntoView({ block: 'nearest' });
  }
  function choose(o) {
    closePop();
    if (o.kind === 'kit') { location.href = 'kit-' + o.val + '.html'; return; }
    if (o.kind === 'cat') { input.value = ''; applyShop({ cat: o.val, text: '' }); goTo('products'); return; }
    if (o.kind === 'prod') { var p = byId[o.val]; input.value = shortName(p.name); applyShop({ cat: 'all', text: '', only: p.id }); goTo('products'); return; }
    var r = search(o.val);
    if (!r.prods.length) { location.href = 'catalog.html?q=' + encodeURIComponent(o.val); return; }
    applyShop({ cat: 'all', text: o.val }); goTo('products');
  }
  var tmr;
  input.addEventListener('input', function () { clearTimeout(tmr); tmr = setTimeout(renderPop, 80); });
  input.addEventListener('focus', function () { if (input.value.trim()) renderPop(); });
  input.addEventListener('keydown', function (e) {
    if (pop.hidden && (e.key === 'ArrowDown') && input.value.trim()) { renderPop(); }
    if (pop.hidden) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(opts.length - 1, active + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(-1, active - 1)); }
    else if (e.key === 'Escape') { closePop(); }
    else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); choose(opts[active]); }
  });
  pop.addEventListener('mousedown', function (e) { var el = e.target.closest('.ms-opt'); if (!el) return; e.preventDefault(); choose(opts[+el.getAttribute('data-i')]); });
  document.addEventListener('click', function (e) { if (!form.contains(e.target)) closePop(); });
  form.addEventListener('submit', function (e) { e.preventDefault(); var v = input.value.trim(); if (!v) { input.focus(); return; } choose({ kind: 'all', val: v }); input.blur(); });

  /* 추천 검색어 */
  var TAGS = ['데코타일', '템바보드', '페인트', '실리콘', '레일조명', '간접조명', '흡음', '타공판', '인테리어 필름', '도어락', '원상복구'];
  var tagBox = $('#msTags');
  tagBox.insertAdjacentHTML('beforeend', TAGS.filter(function (t) { var r = search(t); return r.prods.length || r.kits.length; }).map(function (t) { return '<button type="button" data-term="' + esc(t) + '">' + esc(t) + '</button>'; }).join(''));
  tagBox.addEventListener('click', function (e) { var b = e.target.closest('[data-term]'); if (!b) return; input.value = b.getAttribute('data-term'); choose({ kind: 'all', val: input.value }); });

  /* 카테고리 타일 */
  var rail = $('#catRail');
  rail.innerHTML = M.cats.map(function (c) {
    var n = M.products.filter(function (p) { return p.cat === c[0]; }).length;
    return '<button type="button" class="cat-tile" data-cat="' + c[0] + '">' + icon(c[0]) + '<span class="ct-nm">' + esc(c[1]) + '</span><span class="ct-n">' + n + '</span></button>';
  }).join('');
  rail.addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; input.value = ''; applyShop({ cat: b.getAttribute('data-cat'), text: '' }); goTo('products'); });

  /* ---------- 키트 ---------- */
  function kitThumbs(k, n) {
    var imgs = [];
    for (var i = 0; i < k.items.length && imgs.length < n; i++) { var p = byId[k.items[i]]; var x = p && pick(p); if (x && x.img) imgs.push('<img src="' + esc(x.img) + '" alt="" width="230" height="230" loading="lazy" decoding="async" referrerpolicy="no-referrer">'); }
    while (imgs.length < n) imgs.push('<span class="ph"></span>');
    return imgs.map(function (h) { return '<span class="kc-cell">' + h + '</span>'; }).join('');
  }
  function gradeBadge(k) {
    return k.grade ? '<span class="badge badge-' + (k.grade === '◎' ? 'direct' : 'cond') + '">' + (k.grade === '◎' ? '셀프 가능' : '조건부 셀프') + '</span>' : '<span class="badge badge-part">공구 세트</span>';
  }
  function kitInKit(k) { var have = {}; S.buylist.all().forEach(function (x) { have[x.q] = 1; }); return k.items.every(function (id) { return byId[id] && have[S.norm(byId[id].q)]; }); }
  function kitCard(k) {
    var names = k.items.map(function (id) { return byId[id] ? shortName(byId[id].name) : ''; }).filter(Boolean);
    var done = kitInKit(k);
    return '<article class="kc" data-group="' + (groupOf[k.slug] || ['base'])[0] + '">' +
      '<a class="kc-media" href="kit-' + k.slug + '.html" tabindex="-1" aria-hidden="true">' + kitThumbs(k, 4) + '<span class="kc-count">' + k.items.length + '개 구성</span></a>' +
      '<div class="kc-body"><div class="kc-top">' + gradeBadge(k) + '<span class="kc-grp">' + esc((groupOf[k.slug] || ['', ''])[1]) + '</span></div>' +
      '<h3><a href="kit-' + k.slug + '.html">' + esc(k.name) + '</a></h3><p class="kc-short">' + esc(k.short) + '</p>' +
      '<p class="kc-items"><span class="sr-only">구성: </span>' + esc(names.slice(0, 4).join(', ')) + (names.length > 4 ? ' 외 ' + (names.length - 4) + '개' : '') + '</p>' +
      '<div class="kc-act"><a class="btn btn-navy btn-sm" href="kit-' + k.slug + '.html">키트 구성 보기</a><button type="button" class="btn btn-outline btn-sm kc-add' + (done ? ' is-done' : '') + '" data-kit-add="' + k.slug + '">' + (done ? '모두 담김' : '구성 전체 담기') + '</button></div></div></article>';
  }
  var kitGrid = $('#kitGrid'), kitTabs = $('#kitTabs'), kitGroup = 'all';
  kitTabs.innerHTML = '<button type="button" class="chip" data-g="all" aria-pressed="true">전체 <span>' + M.kits.length + '</span></button>' +
    GROUPS.map(function (g) { return '<button type="button" class="chip" data-g="' + g[0] + '" aria-pressed="false">' + esc(g[1]) + ' <span>' + g[2].length + '</span></button>'; }).join('');
  function renderKits() {
    var order = []; GROUPS.forEach(function (g) { g[2].forEach(function (s) { order.push(s); }); });
    var list = order.map(function (s) { return M.kits.filter(function (k) { return k.slug === s; })[0]; }).filter(Boolean)
      .concat(M.kits.filter(function (k) { return order.indexOf(k.slug) < 0; }))
      .filter(function (k) { return kitGroup === 'all' || (groupOf[k.slug] || [])[0] === kitGroup; });
    kitGrid.innerHTML = list.map(kitCard).join('');
    $$('[data-g]', kitTabs).forEach(function (b) { var on = b.getAttribute('data-g') === kitGroup; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
  }
  kitTabs.addEventListener('click', function (e) { var b = e.target.closest('[data-g]'); if (!b) return; kitGroup = b.getAttribute('data-g'); renderKits(); });
  renderKits();

  /* 상황별 추천 키트 (검색창 옆) */
  var promo = $('#mallPromo');
  if (promo) {
    var PROMO = [['starter', '처음 공구를 장만한다면'], ['restore', '퇴거 전 원상복구라면'], ['open', '오픈을 앞두고 있다면']];
    promo.innerHTML = PROMO.map(function (x) {
      var k = M.kits.filter(function (y) { return y.slug === x[0]; })[0]; if (!k) return '';
      return '<a class="mp" href="kit-' + k.slug + '.html"><span class="mp-txt"><span class="mp-when">' + esc(x[1]) + '</span><strong>' + esc(k.name) + '</strong><span class="mp-sub">' + esc(k.short) + '</span><span class="mp-go">' + k.items.length + '개 구성 보기</span></span><span class="mp-media" aria-hidden="true">' + kitThumbs(k, 4) + '</span></a>';
    }).join('') + '<a class="mp mp-diag" href="diagnosis.html"><span class="mp-txt"><span class="mp-when">무엇을 직접 할 수 있을지 모르겠다면</span><strong>7분 무료 진단</strong><span class="mp-sub">공정을 나누고 맞는 키트를 바로 연결합니다</span></span></a>';
  }

  /* 키트 구성 전체 담기 */
  var toastEl;
  function toast(msg) {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'mall-toast'; toastEl.setAttribute('role', 'status'); document.body.appendChild(toastEl); }
    toastEl.textContent = msg; toastEl.classList.add('is-on'); clearTimeout(toastEl._t); toastEl._t = setTimeout(function () { toastEl.classList.remove('is-on'); }, 2600);
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('[data-kit-add]') : null; if (!b) return;
    var k = M.kits.filter(function (x) { return x.slug === b.getAttribute('data-kit-add'); })[0]; if (!k) return;
    var l = S.buylist.all(), have = {}, added = 0; l.forEach(function (x) { have[x.q] = 1; });
    k.items.forEach(function (id) { var p = byId[id]; if (p && !have[S.norm(p.q)]) { l.push({ q: S.norm(p.q), name: p.name, note: k.name }); have[S.norm(p.q)] = 1; added++; } });
    S.buylist.save(l);
    $$('[data-kit-add="' + k.slug + '"]').forEach(function (x) { x.textContent = '모두 담김'; x.classList.add('is-done'); });
    toast(added ? k.name + ' 구성 ' + added + '개를 구매 목록에 담았습니다' : '이미 모두 구매 목록에 있습니다');
  });

  /* ---------- 자주 찾는 제품·키트 ---------- */
  var kitCount = {}; M.kits.forEach(function (k) { k.items.forEach(function (id) { kitCount[id] = (kitCount[id] || 0) + 1; }); });
  var clicks = {};
  var track = $('#popTrack'), popMode = 'p';
  function popProducts() {
    return M.products.slice().sort(function (a, b) {
      var sa = (clicks[S.norm(a.q)] || 0) * 5 + (kitCount[a.id] || 0) * 2 + (pick(a) && pick(a).rc ? Math.log10(pick(a).rc) : 0);
      var sb = (clicks[S.norm(b.q)] || 0) * 5 + (kitCount[b.id] || 0) * 2 + (pick(b) && pick(b).rc ? Math.log10(pick(b).rc) : 0);
      return sb - sa || a._i - b._i;
    }).slice(0, 10);
  }
  var KIT_BASE = ['starter', 'paint', 'decotile', 'tambour', 'led', 'restore', 'film', 'rail', 'display', 'open', 'window', 'acoustic', 'silicone', 'sign', 'security'];
  function popKits() {
    return M.kits.slice().sort(function (a, b) {
      var ca = 0, cb = 0;
      a.items.forEach(function (id) { ca += clicks[S.norm((byId[id] || {}).q)] || 0; });
      b.items.forEach(function (id) { cb += clicks[S.norm((byId[id] || {}).q)] || 0; });
      return cb - ca || KIT_BASE.indexOf(a.slug) - KIT_BASE.indexOf(b.slug);
    }).slice(0, 8);
  }
  function renderPopular() {
    if (popMode === 'p') {
      track.innerHTML = popProducts().map(function (p, i) {
        var x = pick(p);
        return '<li class="pc"><span class="pc-rank' + (i < 3 ? ' is-top' : '') + '">' + (i + 1) + '</span>' +
          '<div class="pc-media">' + (x && x.img ? S.pickImg(p.q, 'pc-img') : '<span class="ph">' + esc(catLabel[p.cat]) + '</span>') + '</div>' +
          '<div class="pc-cat">' + esc(catLabel[p.cat]) + '</div><h3 class="pc-nm">' + esc(p.name) + '</h3>' +
          (x ? '<p class="pc-pick">' + esc(x.n) + (x.rc ? ' <span>후기 ' + Number(x.rc).toLocaleString('ko-KR') + '</span>' : '') + '</p>' : '') +
          '<div class="pc-act">' + cpLink(p, 'pc-buy', '쿠팡에서 보기') + S.addBtn(p.q, p.name, '') + '</div></li>';
      }).join('');
    } else {
      track.innerHTML = popKits().map(function (k, i) {
        return '<li class="pc pc-kit"><span class="pc-rank' + (i < 3 ? ' is-top' : '') + '">' + (i + 1) + '</span>' +
          '<a class="pc-media kc-mini" href="kit-' + k.slug + '.html" tabindex="-1" aria-hidden="true">' + kitThumbs(k, 4) + '</a>' +
          '<div class="pc-cat">' + esc((groupOf[k.slug] || ['', '공구'])[1]) + ' · ' + k.items.length + '개 구성</div><h3 class="pc-nm"><a href="kit-' + k.slug + '.html">' + esc(k.name) + '</a></h3>' +
          '<p class="pc-pick">' + esc(k.short) + '</p>' +
          '<div class="pc-act"><a class="pc-buy pc-buy-kit" href="kit-' + k.slug + '.html">키트 구성 보기</a></div></li>';
      }).join('');
    }
    track.scrollLeft = 0; navState();
  }
  $$('[data-pop]').forEach(function (b) {
    b.addEventListener('click', function () {
      popMode = b.getAttribute('data-pop');
      $$('[data-pop]').forEach(function (x) { x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      track.setAttribute('aria-labelledby', b.id); renderPopular();
    });
  });
  var prev = $('.pop-prev'), next = $('.pop-next');
  function navState() { if (!prev) return; prev.disabled = track.scrollLeft < 8; next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8; }
  [prev, next].forEach(function (b) { if (b) b.addEventListener('click', function () { track.scrollBy({ left: (+b.getAttribute('data-dir')) * track.clientWidth * 0.9, behavior: reduceMotion ? 'auto' : 'smooth' }); }); });
  track.addEventListener('scroll', function () { clearTimeout(track._t); track._t = setTimeout(navState, 60); }, { passive: true });
  window.addEventListener('resize', function () { clearTimeout(track._r); track._r = setTimeout(navState, 120); });
  renderPopular();
  if (window.fetch) fetch('/api/popular').then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
    if (!j || !j.items || !j.items.length) return;
    j.items.forEach(function (x) { clicks[S.norm(x.q)] = (clicks[S.norm(x.q)] || 0) + x.n; });
    renderPopular();
  }).catch(function () {});

  /* ---------- 전체 상품 ---------- */
  var grid = $('#prodGrid');
  var params = new URLSearchParams(location.search);
  var PAGE = 24;
  var st = { cat: params.get('cat') || 'all', text: params.get('q') || '', only: '', sort: 'base', shown: PAGE };
  if (st.cat !== 'all' && !catLabel[st.cat]) st.cat = 'all';
  var chips = $('#mallCats'), sortSel = $('#mallSort'), stateBox = $('#searchState');
  chips.innerHTML = '<button class="chip" type="button" data-cat="all">전체 <span>' + M.products.length + '</span></button>' + M.cats.map(function (c) {
    var n = M.products.filter(function (p) { return p.cat === c[0]; }).length;
    return '<button class="chip" type="button" data-cat="' + c[0] + '">' + esc(c[1]) + ' <span>' + n + '</span></button>';
  }).join('');

  function card(p) {
    var x = pick(p), kits = (kitOf[p.id] || []);
    var more = '<dl>' + (p.spec ? '<dt>규격</dt><dd>' + esc(p.spec) + '</dd>' : '') + '<dt>쓰는 곳</dt><dd>' + esc(p.use) + '</dd>' +
      (p.brand ? '<dt>추천</dt><dd>' + esc(p.brand) + '</dd>' : '') + (p.tip ? '<dt>고르는 법</dt><dd>' + esc(p.tip) + '</dd>' : '') +
      (kits.length ? '<dt>들어 있는 키트</dt><dd>' + kits.map(function (k) { return '<a href="kit-' + k.slug + '.html">' + esc(k.name) + '</a>'; }).join(', ') + '</dd>' : '') + '</dl>';
    return '<article class="prod sc" data-pid="' + p.id + '">' +
      (S.pickImg(p.q, 'prod-img') || '<div class="pick-img prod-img is-empty" aria-hidden="true">' + icon(p.cat) + '</div>') +
      '<div class="sc-body"><div class="sc-cat">' + esc(catLabel[p.cat]) + (p.sub ? ' · ' + esc(p.sub.replace('공구 · ', '')) : '') + '</div>' +
      '<h3 class="sc-nm">' + esc(p.name) + '</h3>' +
      '<div class="sc-price"><span>참고가</span> ' + esc(p.price) + '</div>' +
      (x ? '<p class="sc-pick"><span class="sc-pick-lb">대표 상품</span>' + esc(x.n) + (x.rc ? ' <span class="sc-rc">후기 ' + Number(x.rc).toLocaleString('ko-KR') + '</span>' : '') + '</p>' : '') +
      S.buyLinks(p.q) + S.addBtn(p.q, p.name, '') +
      '<details class="sc-more"><summary>쓰는 곳·고르는 법</summary>' + more + '</details></div></article>';
  }
  function list() {
    var arr;
    if (st.only) arr = [byId[st.only]].filter(Boolean);
    else if (st.text) arr = search(st.text).prods;
    else arr = M.products.slice();
    if (st.cat !== 'all') arr = arr.filter(function (p) { return p.cat === st.cat; });
    if (st.sort === 'low') arr.sort(function (a, b) { return priceMin(a.price) - priceMin(b.price); });
    else if (st.sort === 'high') arr.sort(function (a, b) { return priceMin(b.price) - priceMin(a.price); });
    else if (st.sort === 'name') arr.sort(function (a, b) { return a.name.localeCompare(b.name, 'ko'); });
    return arr;
  }
  function render() {
    $$('[data-cat]', chips).forEach(function (b) { var on = b.getAttribute('data-cat') === st.cat; b.classList.toggle('is-on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    var arr = list();
    $('#mallCount').textContent = arr.length + '개';
    $('#shopTitle').textContent = st.only ? '선택한 상품' : st.text ? '‘' + st.text + '’ 검색 결과' : st.cat !== 'all' ? catLabel[st.cat] : '전체 도구·자재';
    // 검색 상태
    if (st.text || st.only) {
      var rk = st.text ? search(st.text).kits.slice(0, 4) : (kitOf[st.only] || []).slice(0, 4);
      stateBox.hidden = false;
      stateBox.innerHTML = '<div class="ss-row"><span>' + (st.only ? '검색창에서 고른 상품만 보고 있습니다.' : '‘' + esc(st.text) + '’와 맞는 상품 ' + arr.length + '개') + '</span><button type="button" class="ss-clear" data-clear>검색 지우고 전체 보기</button></div>' +
        (rk.length ? '<div class="ss-kits"><span>' + (st.only ? '이 상품이 들어 있는 키트' : '함께 보면 좋은 키트') + '</span>' + rk.map(function (k) { return '<a href="kit-' + k.slug + '.html">' + esc(k.name) + ' <small>' + k.items.length + '개 구성</small></a>'; }).join('') + '</div>' : '');
    } else { stateBox.hidden = true; stateBox.innerHTML = ''; }
    var more = $('#mallMore');
    more.hidden = arr.length <= st.shown;
    more.querySelector('button').textContent = '더 보기 (' + Math.min(PAGE, arr.length - st.shown) + '개 / 남은 ' + Math.max(0, arr.length - st.shown) + '개)';
    grid.innerHTML = arr.length ? arr.slice(0, st.shown).map(card).join('') :
      '<div class="shop-empty"><p>‘' + esc(st.text) + '’와 맞는 상품이 스스로몰에 없습니다.</p><p>검색어를 짧게 줄이거나, 315개 공정을 정리한 <a href="catalog.html?q=' + encodeURIComponent(st.text) + '">셀프시공 총정리</a>에서 찾아보세요.</p></div>';
    var u = new URL(location.href);
    if (st.cat === 'all') u.searchParams.delete('cat'); else u.searchParams.set('cat', st.cat);
    if (st.text) u.searchParams.set('q', st.text); else u.searchParams.delete('q');
    u.searchParams.delete('list');
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  }
  function applyShop(o) {
    if ('cat' in o) st.cat = o.cat;
    if ('text' in o) st.text = o.text;
    st.only = o.only || '';
    st.shown = PAGE; render();
  }
  chips.addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; applyShop({ cat: b.getAttribute('data-cat'), only: '' }); });
  sortSel.addEventListener('change', function () { st.sort = sortSel.value; st.shown = PAGE; render(); });
  stateBox.addEventListener('click', function (e) { if (e.target.closest('[data-clear]')) { input.value = ''; applyShop({ cat: 'all', text: '' }); } });
  $('#mallMore button').addEventListener('click', function () { st.shown += PAGE; render(); });
  if (st.text) input.value = st.text;
  render();
  if ((params.get('cat') || params.get('q')) && !location.hash) setTimeout(function () { goTo('products'); }, 0);

  /* 공유받은 구매 목록 */
  var shared = params.get('list');
  if (shared) {
    try {
      var data = JSON.parse(shared);
      if (Array.isArray(data) && data.length) {
        var bar = $('#sharedList');
        bar.hidden = false;
        bar.querySelector('[data-n]').textContent = data.length;
        bar.querySelector('button').addEventListener('click', function () {
          data.forEach(function (x) { if (x && x[1]) S.buylist.add({ name: String(x[0]).slice(0, 80), q: String(x[1]).slice(0, 80), note: String(x[2] || '').slice(0, 120) }); });
          bar.hidden = true; S.openBuylist && S.openBuylist();
        });
        setTimeout(function () { goTo('products'); }, 0);
      }
    } catch (e) {}
  }
})();
