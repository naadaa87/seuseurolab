/* 스스로몰 메인 페이지 렌더링 */
(function () {
  'use strict';
  var S = window.SSR, M = S.mall;
  if (!M) return;
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function q(sel) { return document.querySelector(sel); }
  var catLabel = {}; M.cats.forEach(function (c) { catLabel[c[0]] = c[1]; });
  var kitOf = {}; M.kits.forEach(function (k) { k.items.forEach(function (id) { (kitOf[id] = kitOf[id] || []).push(k); }); });

  /* 키트 */
  var kg = q('#kitGrid');
  if (kg) kg.innerHTML = M.kits.map(function (k) {
    return '<a class="kit-card" href="kit-' + k.slug + '.html"><div class="kit-top">' + (k.grade ? '<span class="badge badge-' + (k.grade === '◎' ? 'direct' : 'cond') + '">' + k.grade + ' ' + (k.grade === '◎' ? '셀프 가능' : '조건부') + '</span>' : '<span class="badge badge-part">공구</span>') + '<span class="kit-n">' + k.items.length + '개 구성</span></div><h3>' + esc(k.name) + '</h3><p>' + esc(k.short) + '</p><span class="svc-link">키트 보기</span></a>';
  }).join('');

  /* 상품 */
  var grid = q('#prodGrid'); if (!grid) return;
  var params = new URLSearchParams(location.search);
  var PAGE = 24;
  var st = { cat: params.get('cat') || 'all', text: params.get('q') || '', shown: PAGE };
  if (st.cat !== 'all' && !catLabel[st.cat]) st.cat = 'all';
  var chips = q('#mallCats');
  chips.innerHTML = '<button class="chip" type="button" data-cat="all">전체</button>' + M.cats.map(function (c) {
    var n = M.products.filter(function (p) { return p.cat === c[0]; }).length;
    return '<button class="chip" type="button" data-cat="' + c[0] + '">' + esc(c[1]) + ' <span class="text-muted">' + n + '</span></button>';
  }).join('');
  var search = q('#mallSearch'); search.value = st.text;

  function card(p) {
    var kits = (kitOf[p.id] || []).slice(0, 2).map(function (k) { return '<a href="kit-' + k.slug + '.html">' + esc(k.name) + '</a>'; }).join(' · ');
    return '<article class="prod" data-pid="' + p.id + '">' +
      '<div class="prod-cat">' + esc(catLabel[p.cat]) + (p.sub ? ' · ' + esc(p.sub.replace('공구 · ', '')) : '') + '</div>' +
      '<h3 class="prod-nm">' + esc(p.name) + '</h3>' +
      (p.spec ? '<div class="prod-spec">' + esc(p.spec) + '</div>' : '') +
      '<p class="prod-use">' + esc(p.use) + '</p>' +
      '<dl class="prod-meta"><dt>참고 가격</dt><dd>' + esc(p.price) + '</dd>' + (p.brand ? '<dt>추천</dt><dd>' + esc(p.brand) + '</dd>' : '') + (p.tip ? '<dt>고르는 법</dt><dd>' + esc(p.tip) + '</dd>' : '') + '</dl>' +
      (kits ? '<p class="prod-kit">포함 키트 · ' + kits + '</p>' : '') +
      S.buyLinks(p.q, { pro: p.pro }) + S.addBtn(p.q, p.name, '') + '</article>';
  }
  function render() {
    var t = st.text.trim().toLowerCase();
    Array.prototype.forEach.call(chips.querySelectorAll('[data-cat]'), function (b) { b.classList.toggle('is-on', b.getAttribute('data-cat') === st.cat); });
    var list = M.products.filter(function (p) {
      if (st.cat !== 'all' && p.cat !== st.cat) return false;
      if (t && (p.name + ' ' + p.sub + ' ' + p.use + ' ' + p.brand + ' ' + p.q + ' ' + p.spec).toLowerCase().indexOf(t) < 0) return false;
      return true;
    });
    q('#mallCount').textContent = list.length + '개';
    var more = q('#mallMore');
    if (more) { more.hidden = list.length <= st.shown; more.querySelector('button').textContent = '더 보기 (' + Math.min(PAGE, list.length - st.shown) + '개 / 남은 ' + (list.length - st.shown) + '개)'; }
    grid.innerHTML = list.length ? list.slice(0, st.shown).map(card).join('') : '<div class="box"><p>조건에 맞는 상품이 없습니다. 검색어를 줄이거나 <a href="catalog.html?q=' + encodeURIComponent(st.text) + '">셀프시공 총정리</a>에서 찾아보세요.</p></div>';
    var u = new URL(location.href);
    if (st.cat === 'all') u.searchParams.delete('cat'); else u.searchParams.set('cat', st.cat);
    if (st.text) u.searchParams.set('q', st.text); else u.searchParams.delete('q');
    u.searchParams.delete('list');
    history.replaceState(null, '', u.pathname + u.search + u.hash);
  }
  chips.addEventListener('click', function (e) { var b = e.target.closest('[data-cat]'); if (!b) return; st.cat = b.getAttribute('data-cat'); st.shown = PAGE; render(); });
  var tm; search.addEventListener('input', function () { clearTimeout(tm); tm = setTimeout(function () { st.text = search.value; st.shown = PAGE; render(); }, 120); });
  var mb = q('#mallMore'); if (mb) mb.querySelector('button').addEventListener('click', function () { st.shown += PAGE; render(); });
  render();
  if ((params.get('cat') || params.get('q')) && !location.hash) q('#products').scrollIntoView({ block: 'start' });

  /* 공유받은 구매 목록 */
  var shared = params.get('list');
  if (shared) {
    try {
      var data = JSON.parse(shared);
      if (Array.isArray(data) && data.length) {
        var bar = q('#sharedList');
        bar.hidden = false;
        bar.querySelector('[data-n]').textContent = data.length;
        bar.querySelector('button').addEventListener('click', function () {
          data.forEach(function (x) { if (x && x[1]) S.buylist.add({ name: String(x[0]).slice(0, 80), q: String(x[1]).slice(0, 80), note: String(x[2] || '').slice(0, 120) }); });
          bar.hidden = true; S.openBuylist && S.openBuylist();
        });
      }
    } catch (e) {}
  }
})();
