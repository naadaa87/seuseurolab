/* 스스로연구소 관리자 화면 — 스스로몰 제휴 링크·클릭 통계·접수 내역 */
(function () {
  'use strict';
  var S = window.SSR;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  var KK = 'ssr_admin_key';
  function key() { try { return sessionStorage.getItem(KK) || ''; } catch (e) { return ''; } }
  function log(msg) { var el = $('#admLog'); el.hidden = false; el.textContent = '[' + new Date().toLocaleTimeString('ko-KR') + '] ' + msg + '\n' + el.textContent; }
  function api(path, opt) {
    opt = opt || {}; opt.headers = Object.assign({ 'X-Admin-Key': key(), 'Content-Type': 'application/json' }, opt.headers || {});
    return fetch(path, opt).then(function (r) { return r.json().catch(function () { return { ok: false, error: 'HTTP ' + r.status }; }).then(function (j) { j._status = r.status; return j; }); });
  }

  /* ---------- 관리 키 ---------- */
  $('#admKey').value = key();
  function checkKey() {
    if (!key()) { $('#admState').textContent = '관리 키를 입력하세요.'; return; }
    api('/api/aff-stats').then(function (j) {
      if (j.ok) { $('#admState').textContent = '확인됨 · 최근 30일 클릭 ' + j.total + '회 (제휴 ' + j.affClicks + '회)'; stats = j; renderLinks(); renderStats(); }
      else if (j._status === 403) $('#admState').textContent = '관리 키가 맞지 않습니다. Cloudflare 환경변수 ADMIN_KEY 값을 확인하세요.';
      else if (j.error === 'no-db') $('#admState').textContent = '데이터베이스(D1)가 아직 연결되지 않았습니다. README 3장을 참고하세요.';
      else $('#admState').textContent = '서버 응답: ' + (j.error || j._status);
    }).catch(function () { $('#admState').textContent = '서버에 연결하지 못했습니다. 배포된 사이트에서 열었는지 확인하세요.'; });
  }
  $('#admKeySave').addEventListener('click', function () { try { sessionStorage.setItem(KK, $('#admKey').value.trim()); } catch (e) {} checkKey(); });

  /* ---------- 탭 ---------- */
  $$('.adm-tabs button').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.adm-tabs button').forEach(function (x) { x.classList.toggle('is-on', x === b); x.setAttribute('aria-selected', x === b ? 'true' : 'false'); });
      $$('.adm-pane').forEach(function (p) { p.hidden = p.id !== 'pane-' + b.getAttribute('data-tab'); });
    });
  });

  /* ---------- 검색어 목록 (스스로몰 상품 + 자료실 315 항목) ---------- */
  var rows = [], byQ = {};
  function addUse(q, use, inMall, order) {
    q = S.norm(q); if (!q) return;
    if (!byQ[q]) { byQ[q] = { q: q, uses: [], inMall: false, order: order }; rows.push(byQ[q]); }
    if (byQ[q].uses.indexOf(use) < 0) byQ[q].uses.push(use);
    if (inMall) { byQ[q].inMall = true; byQ[q].order = Math.min(byQ[q].order, order); }
  }
  var kitOf = {}; (S.mall.kits || []).forEach(function (k) { k.items.forEach(function (id) { (kitOf[id] = kitOf[id] || []).push(k.name); }); });
  S.mall.products.forEach(function (p, i) { addUse(p.q, '몰 · ' + p.name + (kitOf[p.id] ? ' (키트 ' + kitOf[p.id].length + ')' : ''), true, kitOf[p.id] ? i : 1000 + i); });
  if (S.cat) S.cat.catalog.forEach(function (c) {
    var m = String(c.l3 || '').match(/[?&]q=([^&]*)/); if (!m) return;
    var q; try { q = decodeURIComponent(m[1]); } catch (e) { q = m[1]; }
    addUse(q, '자료실 #' + c.no + ' ' + c.name, false, 5000 + c.no);
  });

  var links = {}, stats = { top: [] }, dirty = {};
  var st0 = window.SSR_AFF_STATIC || {}; Object.keys(st0).forEach(function (k) { if (st0[k]) links[k] = st0[k]; });
  function loadLinks() {
    return fetch('/api/aff-links?t=' + Date.now()).then(function (r) { return r.json(); }).then(function (j) {
      if (j.ok) { Object.keys(j.links).forEach(function (k) { links[k] = j.links[k]; }); }
      renderLinks();
    }).catch(function () { renderLinks(); });
  }
  function clicks(k) { var t = (stats.top || []).filter(function (x) { return x.k === k; })[0]; return t ? t.n : 0; }

  function renderLinks() {
    var p = $('#fPlat').value, scope = $('#fScope').value, state = $('#fState').value, sort = $('#fSort').value, t = $('#fText').value.trim().toLowerCase();
    var list = rows.filter(function (r) {
      if (scope === 'mall' && !r.inMall) return false;
      var has = !!links[p + ':' + r.q];
      if (state === 'none' && has) return false;
      if (state === 'has' && !has) return false;
      if (t && (r.q + ' ' + r.uses.join(' ')).toLowerCase().indexOf(t) < 0) return false;
      return true;
    });
    if (sort === 'clicks') list.sort(function (a, b) { return clicks(p + ':' + b.q) - clicks(p + ':' + a.q) || a.order - b.order; });
    else if (sort === 'name') list.sort(function (a, b) { return a.q.localeCompare(b.q, 'ko'); });
    else list.sort(function (a, b) { return a.order - b.order; });
    var total = rows.filter(function (r) { return scope === 'all' || r.inMall; }).length;
    var reg = rows.filter(function (r) { return (scope === 'all' || r.inMall) && links[p + ':' + r.q]; }).length;
    $('#linkCount').textContent = '표시 ' + list.length + '개 · 등록 ' + reg + ' / ' + total;
    $('#linkBody').innerHTML = list.map(function (r) {
      var k = p + ':' + r.q, cur = dirty[k] != null ? dirty[k] : (links[k] || '');
      return '<tr class="' + (links[k] ? 'has-link' : '') + '" data-k="' + esc(k) + '"><td><div class="k">' + esc(r.q) + '</div><div class="u">' + esc(r.uses.slice(0, 3).join(' / ')) + (r.uses.length > 3 ? ' 외 ' + (r.uses.length - 3) : '') + '</div></td>' +
        '<td class="c">' + (clicks(k) || '') + '</td>' +
        '<td><input type="url" value="' + esc(cur) + '" placeholder="' + (p === 'coupang' ? 'https://link.coupang.com/a/…' : '제휴 링크') + '" aria-label="' + esc(r.q) + ' 제휴 링크"></td>' +
        '<td style="white-space:nowrap"><button type="button" class="btn btn-outline btn-sm" data-copy-url="' + esc(S.searchUrl(p, r.q)) + '">검색 URL 복사</button> <a class="btn btn-outline btn-sm" href="' + esc(S.searchUrl(p, r.q)) + '" target="_blank" rel="noopener">열기</a></td></tr>';
    }).join('');
    $('#saveDirty').textContent = '변경 저장' + (Object.keys(dirty).length ? ' (' + Object.keys(dirty).length + ')' : '');
    $('#apiConvert').hidden = p !== 'coupang';
  }
  ['#fPlat', '#fScope', '#fState', '#fSort'].forEach(function (s) { $(s).addEventListener('change', renderLinks); });
  $('#fText').addEventListener('input', renderLinks);
  $('#linkBody').addEventListener('input', function (e) {
    var tr = e.target.closest('tr[data-k]'); if (!tr) return;
    var k = tr.getAttribute('data-k'), v = e.target.value.trim();
    if (v === (links[k] || '')) delete dirty[k]; else dirty[k] = v;
    $('#saveDirty').textContent = '변경 저장' + (Object.keys(dirty).length ? ' (' + Object.keys(dirty).length + ')' : '');
  });
  $('#linkBody').addEventListener('click', function (e) {
    var b = e.target.closest('[data-copy-url]'); if (b) S.copy(b.getAttribute('data-copy-url'), b);
  });

  function save(map, label) {
    if (!key()) { log('관리 키를 먼저 입력하세요.'); return Promise.resolve(); }
    var n = Object.keys(map).length; if (!n) { log('저장할 변경이 없습니다.'); return Promise.resolve(); }
    return api('/api/aff-links', { method: 'POST', body: JSON.stringify({ links: map }) }).then(function (j) {
      if (!j.ok) { log((label || '저장') + ' 실패: ' + (j.error || j._status) + (j.detail ? ' ' + j.detail : '')); return; }
      Object.keys(map).forEach(function (k) { if (map[k]) links[k] = map[k]; else delete links[k]; delete dirty[k]; });
      (j.rejected || []).forEach(function (x) { delete links[x.k]; });
      log((label || '저장') + ' 완료 · 저장 ' + j.saved + ' / 삭제 ' + j.deleted + (j.rejected && j.rejected.length ? ' / 거절 ' + j.rejected.length + ' (판매처 도메인이 아니거나 형식 오류: ' + j.rejected.map(function (x) { return x.k; }).slice(0, 5).join(', ') + ')' : ''));
      try { sessionStorage.removeItem('ssr_aff_cache_v1'); } catch (e) {}
      renderLinks();
    });
  }
  $('#saveDirty').addEventListener('click', function () { save(Object.assign({}, dirty), '변경 저장'); });

  /* 붙여넣기 일괄 저장: 한 줄에 "검색어, 링크" 또는 "판매처:검색어, 링크" (탭 구분도 가능) */
  $('#bulkSave').addEventListener('click', function () {
    var p = $('#fPlat').value, map = {}, bad = 0;
    $('#bulkText').value.split(/\r?\n/).forEach(function (line) {
      line = line.trim(); if (!line) return;
      var m = line.match(/^(.*?)[\t,]\s*(https?:\/\/\S+)\s*$/); if (!m) { bad++; return; }
      var k = m[1].trim(); if (!/^(coupang|naver|ohou|danawa|pro):/.test(k)) k = p + ':' + k;
      map[k.replace(/\s+/g, ' ')] = m[2];
    });
    if (bad) log('형식이 맞지 않는 줄 ' + bad + '개는 건너뜁니다.');
    save(map, '붙여넣기 저장').then(function () { $('#bulkText').value = ''; });
  });

  /* 쿠팡 API 일괄 변환 */
  $('#apiConvert').addEventListener('click', function () {
    var btn = this;
    if (!key()) { log('관리 키를 먼저 입력하세요.'); return; }
    var targets = $$('#linkBody tr[data-k]').map(function (tr) { return tr.getAttribute('data-k'); }).filter(function (k) { return !links[k]; }).slice(0, 60).map(function (k) { return k.slice('coupang:'.length); });
    if (!targets.length) { log('지금 보이는 목록에 미등록 항목이 없습니다.'); return; }
    if (!confirm('보이는 목록의 미등록 ' + targets.length + '개를 쿠팡 파트너스 API로 변환하고 저장할까요?')) return;
    btn.disabled = true; log('쿠팡 API 변환 요청 ' + targets.length + '개…');
    api('/api/coupang-deeplink', { method: 'POST', body: JSON.stringify({ qs: targets }) }).then(function (j) {
      if (j.error === 'no-keys') { log(j.message); return; }
      if (j.messages && j.messages.length) log('쿠팡 응답: ' + j.messages.join(' / '));
      var map = {}; Object.keys(j.results || {}).forEach(function (q) { map['coupang:' + q] = j.results[q]; });
      if (j.failed && j.failed.length) log('변환 실패 ' + j.failed.length + '개: ' + j.failed.slice(0, 8).join(', '));
      return save(map, 'API 변환 저장');
    }).finally(function () { btn.disabled = false; });
  });

  /* 링크 파일 내보내기 (GitHub 백업용) */
  $('#exportLinks').addEventListener('click', function () {
    var ordered = {}; Object.keys(links).sort().forEach(function (k) { ordered[k] = links[k]; });
    var txt = '/* 스스로몰 제휴 링크 (정적 백업본) · 내보낸 날짜 ' + new Date().toISOString().slice(0, 10) + '\n   이 파일을 GitHub 저장소의 assets/js/mall-links.js 에 덮어쓰면 데이터베이스 없이도 제휴 링크가 적용됩니다. */\nwindow.SSR_AFF_STATIC = ' + JSON.stringify(ordered, null, 1) + ';\n';
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([txt], { type: 'text/javascript' })); a.download = 'mall-links.js'; a.click();
    log('mall-links.js 파일로 ' + Object.keys(ordered).length + '개 링크를 내보냈습니다.');
  });

  /* ---------- 통계 ---------- */
  function renderStats() {
    var nameOf = function (k) { var q = k.slice(k.indexOf(':') + 1); var r = byQ[q]; return r ? r.uses[0] : ''; };
    $('#statSum').textContent = '최근 30일 구매 링크 클릭 ' + (stats.total || 0) + '회 · 그중 제휴 링크 ' + (stats.affClicks || 0) + '회';
    $('#statTop').innerHTML = (stats.top || []).slice(0, 60).map(function (x, i) {
      var plat = x.k.split(':')[0];
      return '<tr><td class="c">' + (i + 1) + '</td><td><div class="k">' + esc(x.k.slice(plat.length + 1)) + '</div><div class="u">' + esc(nameOf(x.k)) + '</div></td><td>' + esc((S.PLATFORMS[plat] || { label: plat }).label) + '</td><td class="c">' + x.n + '</td><td class="c">' + (x.a || 0) + '</td><td>' + (links[x.k] ? '등록됨' : '<strong style="color:var(--stop)">미등록</strong>') + '</td></tr>';
    }).join('') || '<tr><td colspan="6">아직 기록이 없습니다.</td></tr>';
    $('#statPages').innerHTML = (stats.pages || []).map(function (x) { return '<tr><td>' + esc(x.page || '-') + '</td><td class="c">' + x.n + '</td></tr>'; }).join('') || '<tr><td colspan="2">아직 기록이 없습니다.</td></tr>';
  }

  /* ---------- 접수 내역 ---------- */
  $('#dlLeads').addEventListener('click', function () {
    if (!key()) { alert('관리 키를 먼저 입력하세요.'); return; }
    location.href = '/api/leads-export?key=' + encodeURIComponent(key());
  });

  loadLinks(); if (key()) checkKey(); else $('#admState').textContent = '관리 키를 입력하세요.';
})();
