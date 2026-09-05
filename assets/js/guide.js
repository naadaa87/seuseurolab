/* 스스로연구소 · 공정 판정 가이드 */
(function () {
  'use strict';
  var P = window.SSR.processes, BL = window.SSR.badgeLabel, AL = window.SSR.axisLabel;
  var root = document.getElementById('guideList');
  var q = document.getElementById('guideSearch');
  var chips = document.querySelectorAll('[data-filter]');
  var state = { badge: 'all', text: '' };

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function axisTxt(k, v) {
    if (k === 'L') return { 'L0': '제한 없음', 'L1': '확인 필요', 'L2': '등록업자', 'L3': '금지·전문기관' }[String(v).split('~')[0]] || '';
    var s = { S: ['낮음', '', '보통', '', '높음'], K: ['쉬움', '', '보통', '', '어려움'], R: ['작음', '', '보통', '', '큼'], E: ['낮음', '', '보통', '', '높음'] }[k];
    return s ? (s[v - 1] || '') : '';
  }

  function render() {
    var t = state.text.trim().toLowerCase();
    var items = P.filter(function (p) {
      if (state.badge !== 'all' && p.badge !== state.badge) return false;
      if (t && (p.name + p.cat + p.note + p.desc).toLowerCase().indexOf(t) < 0) return false;
      return true;
    });
    if (!items.length) { root.innerHTML = '<div class="box"><p>조건에 맞는 공정이 없습니다. 검색어를 줄이거나 필터를 해제해 보세요.</p></div>'; return; }
    root.innerHTML = items.map(function (p) {
      var axes = ['L', 'S', 'K', 'R', 'E'].map(function (k) {
        return '<div class="axis"><div class="k">' + k + '</div><div class="v">' + esc(p[k]) + '</div><div class="t">' + esc(AL[k]) + (k !== 'L' ? ' ' + axisTxt(k, p[k]) : '') + '</div></div>';
      }).join('');
      return '<div class="g-item" id="p-' + p.id + '">' +
        '<button class="g-head" type="button" aria-expanded="false"><span class="nm">' + esc(p.name) + '<span class="cat">' + esc(p.cat) + '</span></span><span class="badge badge-' + p.badge + '">' + BL[p.badge] + '</span><span class="arrow" aria-hidden="true"></span></button>' +
        '<div class="g-body"><div class="axes">' + axes + '</div>' +
        '<p><strong>권장 —</strong> ' + esc(p.note) + '</p>' +
        '<p>' + esc(p.desc) + '</p>' +
        '<p class="law">근거 · ' + esc(p.law) + '</p></div></div>';
    }).join('');
    root.querySelectorAll('.g-head').forEach(function (h) {
      h.addEventListener('click', function () {
        var it = h.parentNode; var open = it.classList.toggle('is-open'); h.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
    // 해시로 진입 시 열기
    if (location.hash) { var el = root.querySelector(location.hash); if (el) { el.classList.add('is-open'); el.scrollIntoView({ block: 'center' }); } }
  }

  chips.forEach(function (c) {
    c.addEventListener('click', function () {
      chips.forEach(function (x) { x.classList.remove('is-on'); }); c.classList.add('is-on');
      state.badge = c.getAttribute('data-filter'); render();
    });
  });
  if (q) q.addEventListener('input', function () { state.text = q.value; render(); });
  render();
})();
