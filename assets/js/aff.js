/* 스스로몰 · 구매 링크·제휴 링크·구매 목록 공통 스크립트
   - 구매 버튼은 기본적으로 판매처 검색 결과로 열립니다.
   - 관리자가 등록한 제휴 링크(쿠팡 파트너스 등)가 있으면 그 링크로 바꾸고 '제휴' 표시를 붙입니다.
   - 배너·위젯·자동 이동은 쓰지 않습니다. 사용자가 누른 링크만 판매처로 이동합니다.
   - 클릭 기록에는 개인 식별 정보를 남기지 않습니다(키워드·판매처·페이지 경로·시각만). */
(function () {
  'use strict';
  var S = window.SSR = window.SSR || {};
  if (S._affLoaded) return; S._affLoaded = true;

  var P = S.PLATFORMS = {
    coupang: { label: '쿠팡', u: 'https://www.coupang.com/np/search?q=' },
    naver: { label: '네이버쇼핑', u: 'https://search.shopping.naver.com/search/all?query=' },
    ohou: { label: '오늘의집', u: 'https://ohou.se/productions/feed?query=' },
    danawa: { label: '다나와 최저가', u: 'https://search.danawa.com/dsearch.php?query=' }
  };
  var ORDER = ['coupang', 'naver', 'ohou', 'danawa'];

  function norm(q) { return String(q || '').replace(/\s+/g, ' ').trim(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  S.norm = norm;
  S.searchUrl = function (p, q) { return P[p].u + encodeURIComponent(norm(q)); };
  S.affKey = function (p, q) { return p + ':' + norm(q); };
  S.aff = {};
  var st = window.SSR_AFF_STATIC || {};
  Object.keys(st).forEach(function (k) { if (st[k]) S.aff[k] = st[k]; });

  /* 구매 버튼 묶음 */
  S.buyLinks = function (q, opt) {
    opt = opt || {}; q = norm(q);
    if (!q) return '';
    var h = '<div class="buy">';
    ORDER.forEach(function (p) {
      h += '<a class="buy-btn buy-' + p + '" data-p="' + p + '" data-q="' + esc(q) + '" href="' + esc(S.searchUrl(p, q)) + '" target="_blank" rel="noopener nofollow">' + P[p].label + '</a>';
    });
    if (opt.pro && opt.pro.u) h += '<a class="buy-btn buy-pro" data-p="pro" data-q="' + esc(q) + '" href="' + esc(opt.pro.u) + '" target="_blank" rel="noopener nofollow">' + esc(opt.pro.n) + '</a>';
    return h + '</div>';
  };
  /* 구매 목록 담기 버튼 */
  S.addBtn = function (q, name, note) {
    q = norm(q); if (!q) return '';
    var on = S.buylist.has(q);
    return '<button type="button" class="add-btn' + (on ? ' is-added' : '') + '" data-add-q="' + esc(q) + '" data-add-name="' + esc(name) + '" data-add-note="' + esc(note || '') + '" aria-pressed="' + (on ? 'true' : 'false') + '">' + (on ? '목록에 담김' : '구매 목록에 담기') + '</button>';
  };

  /* 제휴 링크 적용 */
  function upgrade(root) {
    var list = (root || document).querySelectorAll('a[data-p][data-q]');
    for (var i = 0; i < list.length; i++) {
      var a = list[i]; var u = S.aff[S.affKey(a.getAttribute('data-p'), a.getAttribute('data-q'))];
      if (u && a.getAttribute('href') !== u) {
        a.setAttribute('href', u); a.setAttribute('rel', 'sponsored noopener'); a.classList.add('is-aff');
        if (!a.querySelector('.aff-tag')) { var t = document.createElement('span'); t.className = 'aff-tag'; t.textContent = '제휴'; a.appendChild(t); }
      }
    }
    syncAddButtons(root);
  }
  S.affUpgrade = upgrade;

  /* 관리자가 등록한 제휴 링크 불러오기 (D1). 실패하면 정적 파일(mall-links.js)만 사용 */
  var CK = 'ssr_aff_cache_v1';
  try { var c = JSON.parse(sessionStorage.getItem(CK) || 'null'); if (c && Date.now() - c.t < 600000 && c.l) Object.keys(c.l).forEach(function (k) { S.aff[k] = c.l[k]; }); } catch (e) {}
  if (location.protocol.indexOf('http') === 0) {
    fetch('/api/aff-links', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (j) {
        if (!j || !j.ok || !j.links) return;
        Object.keys(j.links).forEach(function (k) { S.aff[k] = j.links[k]; });
        try { sessionStorage.setItem(CK, JSON.stringify({ t: Date.now(), l: j.links })); } catch (e) {}
        upgrade();
      }).catch(function () {});
  }

  /* 클릭 기록 (판매처 이동은 막지 않음) */
  document.addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-p][data-q]') : null;
    if (!a) return;
    var k = S.affKey(a.getAttribute('data-p'), a.getAttribute('data-q'));
    var u = S.aff[k];
    if (u && a.getAttribute('href') !== u) a.setAttribute('href', u);
    try {
      var holder = a.closest('[data-pid]');
      var body = JSON.stringify({ k: k, aff: u ? 1 : 0, pid: holder ? holder.getAttribute('data-pid') : '', page: location.pathname });
      if (navigator.sendBeacon) navigator.sendBeacon('/api/click', new Blob([body], { type: 'application/json' }));
    } catch (err) {}
  }, true);

  /* ---------- 구매 목록 ---------- */
  var BK = 'ssr_buylist_v1';
  S.buylist = {
    all: function () { try { return JSON.parse(localStorage.getItem(BK) || '[]'); } catch (e) { return []; } },
    save: function (l) { try { localStorage.setItem(BK, JSON.stringify(l)); } catch (e) {} renderPanel(); syncAddButtons(); },
    has: function (q) { q = norm(q); return this.all().some(function (x) { return x.q === q; }); },
    add: function (it) { var l = this.all(); it.q = norm(it.q); if (!l.some(function (x) { return x.q === it.q; })) l.push({ q: it.q, name: it.name || it.q, note: it.note || '' }); this.save(l); },
    remove: function (q) { q = norm(q); this.save(this.all().filter(function (x) { return x.q !== q; })); },
    clear: function () { this.save([]); }
  };

  function syncAddButtons(root) {
    var set = {}; S.buylist.all().forEach(function (x) { set[x.q] = 1; });
    var bs = (root && root.querySelectorAll ? root : document).querySelectorAll('.add-btn[data-add-q]');
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i], on = !!set[b.getAttribute('data-add-q')];
      b.classList.toggle('is-added', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); b.textContent = on ? '목록에 담김' : '구매 목록에 담기';
    }
    var ab = document.querySelectorAll('[data-add-all]');
    for (var j = 0; j < ab.length; j++) {
      var sec = document.getElementById(ab[j].getAttribute('data-add-all'));
      if (!sec) continue; var items = sec.querySelectorAll('.add-btn[data-add-q]'); var all = items.length > 0;
      for (var n = 0; n < items.length; n++) if (!set[items[n].getAttribute('data-add-q')]) { all = false; break; }
      ab[j].textContent = all ? '키트 전체가 목록에 있습니다' : '키트 전체를 구매 목록에 담기';
    }
    var cnt = document.querySelectorAll('.bl-count'); var n2 = S.buylist.all().length;
    for (var m = 0; m < cnt.length; m++) cnt[m].textContent = n2;
    var fab = document.querySelector('.bl-fab');
    if (fab) fab.hidden = n2 === 0;
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest ? e.target.closest('.add-btn[data-add-q]') : null;
    if (b) {
      var q = b.getAttribute('data-add-q');
      if (S.buylist.has(q)) S.buylist.remove(q);
      else S.buylist.add({ q: q, name: b.getAttribute('data-add-name'), note: b.getAttribute('data-add-note') });
      return;
    }
    var all = e.target.closest ? e.target.closest('[data-add-all]') : null;
    if (all) {
      var sec = document.getElementById(all.getAttribute('data-add-all')); if (!sec) return;
      var l = S.buylist.all(), have = {}; l.forEach(function (x) { have[x.q] = 1; });
      Array.prototype.forEach.call(sec.querySelectorAll('.add-btn[data-add-q]'), function (x) {
        var q2 = x.getAttribute('data-add-q'); if (!have[q2]) { l.push({ q: q2, name: x.getAttribute('data-add-name'), note: x.getAttribute('data-add-note') || '' }); have[q2] = 1; }
      });
      S.buylist.save(l); openPanel();
    }
  });

  /* 패널 */
  var panel, dim, fab;
  function buildPanel() {
    if (panel) return;
    fab = document.createElement('button'); fab.type = 'button'; fab.className = 'bl-fab'; fab.setAttribute('aria-controls', 'blPanel'); fab.hidden = true;
    fab.innerHTML = '<span>구매 목록</span><b class="bl-count">0</b>';
    dim = document.createElement('div'); dim.className = 'bl-dim'; dim.hidden = true;
    panel = document.createElement('aside'); panel.className = 'bl-panel'; panel.id = 'blPanel'; panel.setAttribute('aria-label', '구매 목록'); panel.hidden = true;
    panel.innerHTML = '<div class="bl-head"><h2>구매 목록 <b class="bl-count">0</b></h2><button type="button" class="bl-close">닫기</button></div>' +
      '<p class="bl-note">스스로몰은 결제를 받지 않습니다. 항목마다 판매처를 골라 각각 구매하세요. 목록은 이 브라우저에만 저장됩니다.</p>' +
      '<ol class="bl-list"></ol>' +
      '<div class="bl-actions"><button type="button" class="btn btn-outline btn-sm" data-bl="copy">목록 복사</button><button type="button" class="btn btn-outline btn-sm" data-bl="share">공유 링크 복사</button><button type="button" class="btn btn-outline btn-sm" data-bl="clear">비우기</button></div>' +
      '<p class="bl-disc">\'제휴\' 표시가 붙은 링크로 구매하면 스스로연구소가 판매처로부터 판매액의 일부를 수수료로 받습니다. 구매 가격은 같습니다.</p>';
    document.body.appendChild(fab); document.body.appendChild(dim); document.body.appendChild(panel);
    fab.addEventListener('click', openPanel);
    dim.addEventListener('click', closePanel);
    panel.querySelector('.bl-close').addEventListener('click', closePanel);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !panel.hidden) closePanel(); });
    panel.addEventListener('click', function (e) {
      var rm = e.target.closest('[data-bl-rm]'); if (rm) { S.buylist.remove(rm.getAttribute('data-bl-rm')); return; }
      var act = e.target.closest('[data-bl]'); if (!act) return;
      var k = act.getAttribute('data-bl'), l = S.buylist.all();
      if (k === 'clear') { if (l.length && confirm('구매 목록을 모두 비울까요?')) S.buylist.clear(); }
      if (k === 'copy') {
        var t = ['[스스로몰 구매 목록]'];
        l.forEach(function (x, i) {
          t.push((i + 1) + '. ' + x.name + (x.note ? ' — ' + x.note : ''));
          ['coupang', 'naver'].forEach(function (p) { t.push('   ' + P[p].label + ': ' + (S.aff[S.affKey(p, x.q)] || S.searchUrl(p, x.q))); });
        });
        S.copy ? S.copy(t.join('\n'), act) : null;
      }
      if (k === 'share') {
        var data = l.map(function (x) { return [x.name, x.q, x.note || '']; });
        var url = location.origin + '/mall.html?list=' + encodeURIComponent(JSON.stringify(data));
        S.copy ? S.copy(url, act) : null;
      }
    });
  }
  function openPanel() { buildPanel(); renderPanel(); panel.hidden = false; dim.hidden = false; document.body.classList.add('bl-open'); var c = panel.querySelector('.bl-close'); if (c) c.focus(); }
  function closePanel() { panel.hidden = true; dim.hidden = true; document.body.classList.remove('bl-open'); if (fab && !fab.hidden) fab.focus(); }
  S.openBuylist = openPanel;
  function renderPanel() {
    if (!panel) return;
    var l = S.buylist.all(), ol = panel.querySelector('.bl-list');
    if (!l.length) { ol.innerHTML = '<li class="bl-empty">아직 담은 항목이 없습니다. 상품이나 키트에서 \'구매 목록에 담기\'를 누르세요.</li>'; }
    else ol.innerHTML = l.map(function (x) {
      return '<li><div class="bl-row"><div><strong>' + esc(x.name) + '</strong>' + (x.note ? '<span>' + esc(x.note) + '</span>' : '') + '</div><button type="button" class="bl-rm" data-bl-rm="' + esc(x.q) + '" aria-label="' + esc(x.name) + ' 빼기">빼기</button></div>' + S.buyLinks(x.q) + '</li>';
    }).join('');
    upgradeOnly(panel);
    syncAddButtons();
  }
  function upgradeOnly(root) {
    var list = root.querySelectorAll('a[data-p][data-q]');
    for (var i = 0; i < list.length; i++) {
      var a = list[i]; var u = S.aff[S.affKey(a.getAttribute('data-p'), a.getAttribute('data-q'))];
      if (u) { a.setAttribute('href', u); a.setAttribute('rel', 'sponsored noopener'); a.classList.add('is-aff'); if (!a.querySelector('.aff-tag')) { var t = document.createElement('span'); t.className = 'aff-tag'; t.textContent = '제휴'; a.appendChild(t); } }
    }
  }

  /* 동적으로 그려지는 목록에도 적용 */
  var timer = null;
  function schedule() { if (timer) return; timer = setTimeout(function () { timer = null; upgrade(); }, 80); }
  function init() {
    buildPanel(); upgrade();
    if (window.MutationObserver) new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) if (ms[i].target !== panel && !(panel && panel.contains(ms[i].target))) { schedule(); return; }
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
