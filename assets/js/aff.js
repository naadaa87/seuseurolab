/* 스스로몰 · 쿠팡 구매 링크·대표 상품 사진·구매 목록 공통 스크립트
   - 구매 버튼은 쿠팡만 씁니다(쿠팡 파트너스 제휴 링크). 다른 판매처 버튼은 두지 않습니다.
   - 스스로몰 품목에는 쿠팡에서 후기가 많은 대표 상품을 하나씩 골라 사진과 상품 링크를 붙입니다(mall-picks.js).
   - 관리자가 등록한 제휴 링크가 있으면 그 링크로 바꾸고 '제휴' 표시를 붙입니다.
   - 배너·위젯·자동 이동은 쓰지 않습니다. 사용자가 누른 링크만 쿠팡으로 이동합니다.
   - 상품 사진은 쿠팡 이미지 서버에서 바로 불러오되 리퍼러를 보내지 않습니다.
   - 클릭 기록에는 개인 식별 정보를 남기지 않습니다(키워드·페이지 경로·시각만). */
(function () {
  'use strict';
  var S = window.SSR = window.SSR || {};
  if (S._affLoaded) return; S._affLoaded = true;

  var P = S.PLATFORMS = {
    coupang: { label: '쿠팡', u: 'https://www.coupang.com/np/search?q=' }
  };

  function norm(q) { return String(q || '').replace(/\s+/g, ' ').trim(); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  S.norm = norm;
  S.esc = S.esc || esc;
  S.searchUrl = function (p, q) { return (P[p] || P.coupang).u + encodeURIComponent(norm(q)); };
  S.affKey = function (p, q) { return p + ':' + norm(q); };
  S.aff = {};
  var st = window.SSR_AFF_STATIC || {};
  Object.keys(st).forEach(function (k) { if (st[k] && k.indexOf('coupang:') === 0) S.aff[k] = st[k]; });

  /* 대표 상품 (검색어 → 쿠팡 상품) */
  var PK = S.picks = {};
  var pk0 = window.SSR_PICKS || {};
  Object.keys(pk0).forEach(function (q) {
    var x = pk0[q]; if (!x || !x.pid) return;
    PK[norm(q)] = x;
    if (x.u) S.aff['coupang:@' + norm(q)] = x.u;
  });
  S.pick = function (q) { return PK[norm(q)] || null; };
  /* 대표 상품 제휴 링크가 있을 때만 상품 페이지로 보냅니다(제휴 링크가 없으면 수수료가 생기지 않으므로 검색 결과 제휴 링크를 씁니다). */
  function pickUrl(q) { return PK[norm(q)] ? (S.aff['coupang:@' + norm(q)] || '') : ''; }
  S.pickUrl = pickUrl;
  S.pickDate = (window.SSR_PICKS_META && window.SSR_PICKS_META.date) || '';

  /* 쿠팡 구매 버튼 */
  S.buyLinks = function (q) {
    q = norm(q);
    if (!q) return '';
    var x = PK[q] && pickUrl(q) ? PK[q] : null, h = '<div class="buy">';
    var btn = function (cls, dq, plain, affUrl, label) {
      return affUrl
        ? '<a class="buy-btn ' + cls + ' is-aff" data-p="coupang" data-q="' + esc(dq) + '" href="' + esc(affUrl) + '" target="_blank" rel="sponsored noopener">' + label + '<span class="aff-tag">제휴</span></a>'
        : '<a class="buy-btn ' + cls + '" data-p="coupang" data-q="' + esc(dq) + '" href="' + esc(plain) + '" target="_blank" rel="noopener nofollow">' + label + '</a>';
    };
    var sAff = S.aff[S.affKey('coupang', q)];
    if (x) h += btn('buy-coupang buy-pick', '@' + q, '', pickUrl(q), '<span class="lb-l">쿠팡에서 이 상품 보기</span><span class="lb-s">쿠팡에서 보기</span>');
    h += btn(x ? 'buy-alt' : 'buy-coupang', q, S.searchUrl('coupang', q), sAff, x ? '<span class="lb-l">쿠팡에서 다른 상품 비교</span><span class="lb-s">다른 상품 비교</span>' : '쿠팡에서 찾기');
    return h + '</div>';
  };
  /* 대표 상품 사진 */
  S.pickImg = function (q, cls) {
    var x = PK[norm(q)]; if (!x || !x.img) return '';
    var pu = pickUrl(q), dq = pu ? '@' + norm(q) : norm(q), sa = S.aff[S.affKey('coupang', q)], href = pu || sa || S.searchUrl('coupang', q);
    return '<figure class="pick-img' + (cls ? ' ' + cls : '') + '"><a data-p="coupang" data-q="' + esc(dq) + '" href="' + esc(href) + '" target="_blank" rel="' + (pu || sa ? 'sponsored noopener' : 'noopener nofollow') + '" tabindex="-1" aria-hidden="true">' +
      '<img src="' + esc(x.img) + '" alt="" width="230" height="230" loading="lazy" decoding="async" referrerpolicy="no-referrer"></a></figure>';
  };
  /* 대표 상품 설명 한 줄 */
  S.pickMeta = function (q) {
    var x = PK[norm(q)]; if (!x) return '';
    return '<p class="pick-meta"><span class="pick-lb">' + (pickUrl(q) ? '쿠팡 대표 상품' : '쿠팡 인기 상품 예시') + '</span>' + esc(x.n) + (x.rc ? ' <span class="pick-rc">후기 ' + Number(x.rc).toLocaleString('ko-KR') + '개' + (S.pickDate ? ' · ' + esc(S.pickDate) + ' 기준' : '') + '</span>' : '') + '</p>';
  };
  /* 사진을 못 불러오면 자리를 비웁니다 */
  document.addEventListener('error', function (e) {
    var t = e.target; if (t && t.tagName === 'IMG' && t.closest) { var f = t.closest('.pick-img'); if (f) f.classList.add('is-broken'); }
  }, true);
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
        if (!a.closest('.pick-img') && !a.querySelector('.aff-tag')) { var t = document.createElement('span'); t.className = 'aff-tag'; t.textContent = '제휴'; a.appendChild(t); }
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
    if (S.trackSelf) return; // 관리자 '내 방문 제외'
    try {
      var holder = a.closest('[data-pid]');
      var body = JSON.stringify({ k: k, aff: u ? 1 : 0, pid: holder ? holder.getAttribute('data-pid') : '', page: location.pathname, sid: S.sid ? S.sid() : '' });
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
      else { S.buylist.add({ q: q, name: b.getAttribute('data-add-name'), note: b.getAttribute('data-add-note') }); if (S.track) S.track('add', q); }
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
      if (S.track) S.track('add_all', location.pathname.replace(/^\/|\.html$/g, '') || 'home');
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
      '<p class="bl-disc">이 포스팅은 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다. \'제휴\' 표시가 붙은 쿠팡 링크로 구매하면 스스로연구소가 쿠팡으로부터 판매액의 일부를 수수료로 받으며, 구매 가격은 같습니다.</p>' +
      '<p class="bl-note">스스로몰은 결제를 받지 않습니다. 항목마다 쿠팡 링크로 이동해 각각 구매하세요. 목록은 이 브라우저에만 저장됩니다.</p>' +
      '<ol class="bl-list"></ol>' +
      '<div class="bl-actions"><button type="button" class="btn btn-outline btn-sm" data-bl="copy">목록 복사</button><button type="button" class="btn btn-outline btn-sm" data-bl="share">공유 링크 복사</button><button type="button" class="btn btn-outline btn-sm" data-bl="clear">비우기</button></div>';
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
          t.push('   쿠팡: ' + (pickUrl(x.q) || S.aff[S.affKey('coupang', x.q)] || S.searchUrl('coupang', x.q)));
        });
        S.copy ? S.copy(t.join('\n'), act) : null;
        if (S.track && l.length) S.track('list_copy', l.length);
      }
      if (k === 'share') {
        var data = l.map(function (x) { return [x.name, x.q, x.note || '']; });
        var url = location.origin + '/mall?list=' + encodeURIComponent(JSON.stringify(data));
        S.copy ? S.copy(url, act) : null;
        if (S.track && l.length) S.track('list_share', l.length);
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
      return '<li><div class="bl-row">' + S.pickImg(x.q, 'is-sm') + '<div><strong>' + esc(x.name) + '</strong>' + (x.note ? '<span>' + esc(x.note) + '</span>' : '') + '</div><button type="button" class="bl-rm" data-bl-rm="' + esc(x.q) + '" aria-label="' + esc(x.name) + ' 빼기">빼기</button></div>' + S.buyLinks(x.q) + '</li>';
    }).join('');
    upgradeOnly(panel);
    syncAddButtons();
  }
  function upgradeOnly(root) {
    var list = root.querySelectorAll('a[data-p][data-q]');
    for (var i = 0; i < list.length; i++) {
      var a = list[i]; var u = S.aff[S.affKey(a.getAttribute('data-p'), a.getAttribute('data-q'))];
      if (u) { a.setAttribute('href', u); a.setAttribute('rel', 'sponsored noopener'); a.classList.add('is-aff'); if (!a.closest('.pick-img') && !a.querySelector('.aff-tag')) { var t = document.createElement('span'); t.className = 'aff-tag'; t.textContent = '제휴'; a.appendChild(t); } }
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
