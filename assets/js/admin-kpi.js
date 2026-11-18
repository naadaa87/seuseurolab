/* 스스로연구소 관리자 화면 — KPI 탭 (방문·클릭·구매 전환) */
(function () {
  'use strict';
  var S = window.SSR || {};
  var root = document.getElementById('pane-kpi'); if (!root) return;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function key() { return S.adminKey ? S.adminKey() : ''; }
  function api(path, opt) { return S.adminApi(path, opt); }
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- 숫자·날짜 표기 ---------- */
  function n0(n) { return n == null || isNaN(n) ? '-' : Math.round(n).toLocaleString('ko-KR'); }
  function n1(n) { return n == null || isNaN(n) ? '-' : (Math.round(n * 10) / 10).toLocaleString('ko-KR', { maximumFractionDigits: 1 }); }
  function won(n) { return n == null ? '-' : n0(n) + '원'; }
  function pc(v) { return v == null || isNaN(v) ? '-' : (Math.round(v * 10) / 10).toFixed(1) + '%'; }
  function ratio(a, b) { return b ? a / b * 100 : null; }
  function dur(sec) {
    sec = Math.round(sec || 0); if (sec <= 0) return '0초';
    var m = Math.floor(sec / 60), s = sec % 60;
    return m ? m + '분' + (s ? ' ' + s + '초' : '') : s + '초';
  }
  function axisNum(n) { return n >= 10000 ? (n / 10000).toLocaleString('ko-KR', { maximumFractionDigits: 1 }) + '만' : n.toLocaleString('ko-KR'); }
  function kst(ms) { return new Date((ms == null ? Date.now() : ms) + 9 * 3600e3).toISOString().slice(0, 10); }
  function addDays(d, n) { var x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
  function dot(d) { return d ? d.replace(/-/g, '.') : ''; }
  function md(d) { var p = d.split('-'); return +p[1] + '.' + +p[2]; }
  var WD = ['일', '월', '화', '수', '목', '금', '토'];
  function wd(d) { return WD[new Date(d + 'T00:00:00Z').getUTCDay()]; }

  /* ---------- 이름표 ---------- */
  var PAGE = {
    '/': '홈', '/mall': '스스로몰', '/sigongso': '스스로시공소', '/wonsang': '스스로원상복구', '/changup': '스스로창업', '/gonggan': '스스로공간',
    '/diagnosis': '7분 공사비 절감 진단', '/estimate': '견적서 검증 신청', '/guide': '공정 판정 가이드', '/catalog': '셀프시공 총정리 315',
    '/tools': '도구 총정리', '/materials': '자재·부자재 총정리', '/stores': '구매처 디렉토리', '/resources': '셀프시공 자료실',
    '/calc': '산출 계산기', '/budget': '예산 템플릿', '/checklist': '공정 순서·체크리스트', '/pricing': '상품·가격', '/about': '연구소 소개',
    '/contact': '문의·상담', '/privacy': '개인정보처리방침', '/terms': '이용약관', '/404': '없는 페이지', '/(기타)': '그 밖의 주소'
  };
  var kits = (S.mall && S.mall.kits) || [];
  kits.forEach(function (k) { PAGE['/kit-' + k.slug] = k.name; });
  function pageName(p) { return PAGE[p] || p; }
  var SRC = {
    direct: '직접 방문·북마크', naver: '네이버', naver_app: '네이버 앱', naver_blog: '네이버 블로그', naver_cafe: '네이버 카페', google: '구글', daum: '다음',
    kakao: '카카오', kakaotalk: '카카오톡', tistory: '티스토리', bing: 'Bing', instagram: '인스타그램', facebook: '페이스북', youtube: '유튜브',
    threads: '스레드', x: 'X(트위터)', chatgpt: 'ChatGPT', perplexity: 'Perplexity', coupang: '쿠팡', zum: '줌', duckduckgo: 'DuckDuckGo'
  };
  var DEV = { m: '모바일', d: 'PC', t: '태블릿' };
  var LEAD = { sigongso: '시공소', wonsang: '원상복구', changup: '창업', gonggan: '공간', 'class': '클래스', partner: '제휴', estimate: '견적 검증', contact: '문의' };
  var prodByQ = {};
  ((S.mall && S.mall.products) || []).forEach(function (p) { prodByQ[S.norm ? S.norm(p.q) : p.q] = p; });
  function prodName(q) { var p = prodByQ[q]; return p ? p.name : q; }

  /* ---------- 기간 ---------- */
  var RK = 'ssr_kpi_range';
  var mode = '30';
  try { mode = localStorage.getItem(RK) || '30'; } catch (e) {}
  function rangeOf(m) {
    var t = kst();
    if (m === 'today') return [t, t];
    if (m === 'yday') return [addDays(t, -1), addDays(t, -1)];
    if (m === 'custom') { var f = $('#kFrom').value, to = $('#kTo').value; if (f && to) return f <= to ? [f, to] : [to, f]; m = '30'; }
    var n = +m || 30; return [addDays(t, -(n - 1)), t];
  }
  function setMode(m) {
    mode = m; try { localStorage.setItem(RK, m); } catch (e) {}
    $$('.kpi-seg button').forEach(function (b) { b.setAttribute('aria-pressed', b.getAttribute('data-range') === m ? 'true' : 'false'); });
    $('#kCustom').hidden = m !== 'custom';
  }
  $$('.kpi-seg button').forEach(function (b) {
    b.addEventListener('click', function () {
      var m = b.getAttribute('data-range'); setMode(m);
      if (m === 'custom') { if (!$('#kFrom').value) { var r = rangeOf('30'); $('#kFrom').value = r[0]; $('#kTo').value = r[1]; } $('#kFrom').focus(); return; }
      load();
    });
  });
  $('#kApply').addEventListener('click', load);
  $('#kReload').addEventListener('click', load);
  if (mode === 'custom') mode = '30';
  setMode(mode);

  /* ---------- 불러오기 ---------- */
  var data = null, trendMetric = 'v', pageSort = 'pv', pagesAll = false;
  function load() {
    if (!key()) { $('#kNotes').innerHTML = '<p class="is-warn">관리 키를 입력하면 KPI가 보입니다.</p>'; return; }
    var r = rangeOf(mode);
    $('#kBody').classList.add('is-loading');
    return api('/api/kpi?from=' + r[0] + '&to=' + r[1]).then(function (j) {
      if (!j.ok) {
        $('#kNotes').innerHTML = '<p class="is-warn">' + (j._status === 403 ? '관리 키가 맞지 않습니다.' : j.error === 'no-db' ? '데이터베이스(D1)가 연결되지 않았습니다.' : 'KPI를 불러오지 못했습니다: ' + esc(j.detail || j.error || j._status)) + '</p>';
        return;
      }
      data = j; render(); loadCpRows();
    }).catch(function () {
      $('#kNotes').innerHTML = '<p class="is-warn">서버에 연결하지 못했습니다. 배포된 사이트에서 열었는지 확인하세요.</p>';
    }).finally(function () { $('#kBody').classList.remove('is-loading'); });
  }
  document.addEventListener('ssr:adminkey', load);
  if (!key()) $('#kNotes').innerHTML = '<p class="is-warn">관리 키를 입력하면 KPI가 보입니다.</p>';

  /* ---------- 그리기 ---------- */
  function cpVal(c, k) { return c && c[k] != null ? c[k] : null; }
  function render() {
    var j = data, c = j.cur, p = j.prev, R = j.range;
    $('#kRange').textContent = dot(R.from) + (R.days > 1 ? ' – ' + dot(R.to) : ' (' + wd(R.from) + ')') + ' · ' + R.days + '일 · 바로 앞 ' + R.days + '일(' + dot(R.prevFrom) + (R.days > 1 ? ' – ' + dot(R.prevTo) : '') + ')과 비교';
    var live = $('#kLive');
    if (R.to === R.today) { live.hidden = false; live.textContent = '지금 보는 사람 ' + n0(j.live) + '명'; live.title = '최근 5분 안에 페이지를 연 방문 수'; } else live.hidden = true;

    // 안내
    var notes = [];
    if (!j.since) notes.push(['', '아직 방문 기록이 없습니다. 방문 통계는 이번 업데이트가 배포된 뒤부터 모입니다.']);
    else if (j.since > R.from) notes.push(['', '방문 통계는 ' + dot(j.since) + '부터 모았습니다. 그 전 날짜는 0으로 보이며, 쿠팡 링크 클릭은 그 전부터 기록돼 있습니다.']);
    var needCp = R.to < R.today ? R.days : R.days - 1; // 오늘 실적은 다음 날 확정
    if (!c.cp.days) notes.push(['is-warn', '이 기간의 쿠팡 실적이 입력되지 않아 구매 전환·수익이 비어 있습니다. 맨 아래 \'쿠팡 실적 입력\'에서 넣어 주세요.']);
    else if (needCp > 0 && c.cp.days < needCp) notes.push(['', '쿠팡 실적은 ' + needCp + '일 중 ' + c.cp.days + '일만 입력돼 있습니다. 구매 전환·수익은 입력된 날짜만 합산합니다.']);
    if (!isSelfOff()) notes.push(['', '이 브라우저의 방문도 통계에 들어갑니다. 아래 \'내 방문 제외\'를 켜 두면 운영자 방문이 빠집니다.']);
    $('#kNotes').innerHTML = notes.map(function (x) { return '<p class="' + x[0] + '">' + esc(x[1]) + '</p>'; }).join('');

    // 지표 칸
    var bounce = function (s) { return s.sessions ? 100 - s.engaged / s.sessions * 100 : null; };
    var ctr = function (s) { return ratio(s.clickSessions, s.sessions); };
    var conv = function (s) { var o = cpVal(s.cp, 'orders'); if (o == null) return null; var d = cpVal(s.cp, 'clicks') || s.clicks; return d ? o / d * 100 : null; };
    $('#kTilesVisit').innerHTML = [
      tile('방문자', n0(c.visitors), '', c.visitors, p.visitors, 'up', '', '하루 단위 순방문자 합계'),
      tile('방문', n0(c.sessions), '', c.sessions, p.sessions, 'up', '', '탭 하나에서 30분 안에 이어진 방문'),
      tile('페이지뷰', n0(c.pv), '', c.pv, p.pv, 'up'),
      tile('평균 체류시간', c.sessions ? dur(c.sessDur) : '-', '', c.sessions ? c.sessDur : null, p.sessDur, 'up', '', '방문 한 번 기준'),
      tile('이탈률', pc(bounce(c)), '', bounce(c), bounce(p), 'down', 'pt', '참여하지 않고 나간 방문 비율')
    ].join('');
    var cpLabel = cpVal(c.cp, 'clicks') ? '주문 ÷ 쿠팡 집계 클릭' : '주문 ÷ 사이트 기록 클릭';
    $('#kTilesCp').innerHTML = [
      tile('쿠팡 링크 클릭', n0(c.clicks), '', c.clicks, p.clicks, 'up', '', '사이트에서 쿠팡 버튼을 누른 횟수'),
      tile('쿠팡 클릭률', pc(ctr(c)), '', ctr(c), ctr(p), 'up', 'pt', '쿠팡 링크를 누른 방문 ÷ 방문'),
      cpVal(c.cp, 'orders') == null ? empty('구매 전환', '실적 입력 전') : tile('구매 전환', n0(c.cp.orders), '건', c.cp.orders, cpVal(p.cp, 'orders'), 'up', '', c.cp.cancels ? '취소 ' + n0(c.cp.cancels) + '건 별도' : '쿠팡 파트너스 주문 수'),
      conv(c) == null ? empty('구매 전환율', '실적 입력 전') : tile('구매 전환율', pc(conv(c)), '', conv(c), conv(p), 'up', 'pt', cpLabel),
      cpVal(c.cp, 'commission') == null ? empty('수익', '실적 입력 전') : tile('수익', n0(c.cp.commission), '원', c.cp.commission, cpVal(p.cp, 'commission'), 'up', '', c.cp.gmv ? '주문 금액 ' + won(c.cp.gmv) : '쿠팡 파트너스 수수료')
    ].join('');
    var ev = function (s, n) { return s.ev && s.ev[n] ? s.ev[n].n : 0; };
    var adds = ev(c, 'add') + ev(c, 'add_all') + ev(c, 'kit_all');
    var leadSub = (j.leadTypes || []).slice(0, 3).map(function (x) { return (LEAD[x.service] || x.service) + ' ' + x.n; }).join(' · ');
    var epc = cpVal(c.cp, 'commission') != null && cpVal(c.cp, 'clicks') ? c.cp.commission / c.cp.clicks : null;
    $('#kMini').innerHTML = [
      mini('방문당 페이지', c.sessions ? n1(c.pps) + '쪽' : '-'),
      mini('페이지 평균 체류', c.pageDur ? dur(c.pageDur) : '-'),
      mini('평균 스크롤', c.scroll ? Math.round(c.scroll) + '%' : '-'),
      mini('재방문 비율', pc(ratio(c.returning, c.landings))),
      mini('모바일 비율', pc(ratio(c.mobile, c.landings))),
      mini('상담·신청 접수', n0(c.leads) + '건', leadSub || (c.sessions ? '방문 대비 ' + pc(ratio(c.leads, c.sessions)) : '')),
      mini('구매 목록 담기', n0(adds) + '회', '담은 방문 ' + n0(c.addSessions)),
      mini('스스로몰 검색', n0(ev(c, 'search')) + '회', ev(c, 'search_none') ? '결과 없음 ' + n0(ev(c, 'search_none')) : ''),
      mini('7분 진단 완료', n0(ev(c, 'diag_done')) + '회'),
      mini('클릭당 수익', epc == null ? '-' : n0(epc) + '원', 'EPC · 수익 ÷ 쿠팡 집계 클릭')
    ].join('');

    renderTrend();
    renderFunnel();
    renderMeters('#kSources', (j.sources || []).map(function (x) { return { name: SRC[x.src] || x.src, n: x.s, k: x.ks }; }), 8);
    renderMeters('#kDevices', (j.devices || []).sort(function (a, b) { return b.s - a.s; }).map(function (x) { return { name: DEV[x.dev] || x.dev, n: x.s, k: x.ks }; }), 3);
    barChart($('#kHours'), j.hours || [], function (i) { return i + '시'; }, '페이지뷰');
    renderPages(); renderKits(); renderRanks(); renderDaily();
  }
  function delta(cur, prev, good, unit) {
    if (cur == null || prev == null) return '';
    if (unit === 'pt') {
      var dp = cur - prev; if (Math.abs(dp) < 0.05) return '<span class="dl">이전 기간과 같음</span>';
      var upP = dp > 0;
      return '<span class="dl"><b class="' + (upP ? 'up-' : 'down-') + ((upP ? 'up' : 'down') === good ? 'good' : 'bad') + '">' + (upP ? '▲ ' : '▼ ') + Math.abs(dp).toFixed(1) + '%p</b> 이전 기간 대비</span>';
    }
    if (!prev) return cur ? '<span class="dl">이전 기간 기록 없음</span>' : '';
    var d = (cur - prev) / prev * 100; if (Math.abs(d) < 0.05) return '<span class="dl">이전 기간과 같음</span>';
    var up = d > 0;
    return '<span class="dl"><b class="' + (up ? 'up-' : 'down-') + ((up ? 'up' : 'down') === good ? 'good' : 'bad') + '">' + (up ? '▲ ' : '▼ ') + Math.abs(d).toFixed(1) + '%</b> 이전 기간 대비</span>';
  }
  function tile(label, val, unit, cur, prev, good, dUnit, sub) {
    return '<div class="kpi-tile"><span class="lb">' + esc(label) + '</span><span class="val">' + esc(val) + (unit ? '<small>' + esc(unit) + '</small>' : '') + '</span>' +
      delta(cur, prev, good, dUnit) + (sub ? '<span class="sub">' + esc(sub) + '</span>' : '') + '</div>';
  }
  function empty(label, msg) { return '<div class="kpi-tile"><span class="lb">' + esc(label) + '</span><span class="val is-empty">' + esc(msg) + '</span><span class="sub">쿠팡 실적을 넣으면 계산됩니다</span></div>'; }
  function mini(label, val, sub) { return '<div><dt>' + esc(label) + '</dt><dd>' + esc(val) + (sub ? '<small>' + esc(sub) + '</small>' : '') + '</dd></div>'; }

  /* 흐름 */
  function renderFunnel() {
    var c = data.cur, base = c.sessions || 0, orders = cpVal(c.cp, 'orders'), cpClicks = cpVal(c.cp, 'clicks');
    var rows = [
      { name: '방문', n: base, sub: '' },
      { name: '스스로몰·키트를 본 방문', n: c.mallSessions },
      { name: '쿠팡 링크를 누른 방문', n: c.clickSessions }
    ];
    var h = rows.map(function (r) {
      return '<div class="kpi-meter is-step"><span class="nm">' + esc(r.name) + '</span><span class="fg">' + n0(r.n) + (r === rows[0] ? '' : '<small>' + pc(ratio(r.n, base)) + '</small>') + '</span><span class="tr"><i style="width:' + (base ? Math.max(0.5, r.n / base * 100) : 0) + '%"></i></span></div>';
    }).join('');
    h += '<div class="kpi-meter is-step"><span class="nm">쿠팡 주문</span><span class="fg">' + (orders == null ? '<small>입력 전</small>' : n0(orders) + '<small>건</small>') + '</span><span class="tr">' + (orders ? '<i style="width:' + (base ? Math.max(0.5, orders / base * 100) : 0) + '%"></i>' : '') + '</span>' +
      '<span class="note">' + (orders == null ? '쿠팡 실적을 입력하면 채워집니다.' : (cpClicks ? '쿠팡 집계 클릭 ' + n0(cpClicks) + '회 중 ' + pc(ratio(orders, cpClicks)) : '사이트 기록 클릭 ' + n0(c.clicks) + '회 중 ' + pc(ratio(orders, c.clicks)))) + '</span></div>';
    $('#kFunnel').innerHTML = h;
  }

  /* 유입·기기 막대 목록 */
  function renderMeters(sel, list, max) {
    if (!list.length) { $(sel).innerHTML = '<p class="none">아직 기록이 없습니다.</p>'; return; }
    if (list.length > max + 1) {
      var rest = list.slice(max).reduce(function (a, x) { a.n += x.n; a.k += x.k; return a; }, { name: '그 밖의 경로 ' + (list.length - max) + '곳', n: 0, k: 0 });
      list = list.slice(0, max).concat([rest]);
    }
    var top = Math.max.apply(null, list.map(function (x) { return x.n; })) || 1, tot = list.reduce(function (a, x) { return a + x.n; }, 0);
    $(sel).innerHTML = list.map(function (x) {
      return '<div class="kpi-meter"><span class="nm" title="' + esc(x.name) + '">' + esc(x.name) + '</span><span class="fg">' + n0(x.n) +
        '<small>' + pc(ratio(x.n, tot)) + ' · 클릭 ' + pc(ratio(x.k, x.n)) + '</small></span><span class="tr"><i style="width:' + (x.n / top * 100) + '%"></i></span></div>';
    }).join('');
  }

  /* 페이지별 */
  function renderPages() {
    var list = (data.pages || []).slice();
    var key2 = { pv: 'pv', uv: 'uv', dur: 'dur', clk: 'clk' }[pageSort];
    list.sort(function (a, b) {
      if (pageSort === 'ctr') return (b.pv ? b.clk / b.pv : 0) - (a.pv ? a.clk / a.pv : 0) || b.pv - a.pv;
      return b[key2] - a[key2] || b.pv - a.pv;
    });
    var shown = pagesAll ? list : list.slice(0, 15);
    $('#kPages').innerHTML = shown.map(function (x) {
      return '<tr><td><span class="pn">' + esc(pageName(x.path)) + '</span><span class="pp">' + esc(x.path) + '</span></td><td class="r">' + n0(x.pv) + '</td><td class="r">' + n0(x.uv) + '</td><td class="r">' + (x.dur ? dur(x.dur) : '-') + '</td><td class="r">' + (x.scr ? x.scr + '%' : '-') + '</td><td class="r">' + n0(x.ent) + '</td><td class="r">' + (x.ent ? pc(ratio(x.single, x.ent)) : '-') + '</td><td class="r">' + n0(x.clk) + '</td><td class="r">' + (x.pv ? pc(ratio(x.clk, x.pv)) : '-') + '</td></tr>';
    }).join('') || '<tr><td colspan="9">아직 기록이 없습니다.</td></tr>';
    var more = $('#kPagesMore'); more.hidden = list.length <= 15; more.textContent = pagesAll ? '상위 15개만 보기' : '전체 ' + list.length + '개 보기';
  }
  $('#kPageSort').addEventListener('change', function () { pageSort = this.value; if (data) renderPages(); });
  $('#kPagesMore').addEventListener('click', function () { pagesAll = !pagesAll; renderPages(); });

  /* 키트별 */
  function renderKits() {
    var byPath = {}; (data.pages || []).forEach(function (x) { byPath[x.path] = x; });
    var all = {}; ((data.events || {}).kit_all || []).forEach(function (x) { all[x.val] = (all[x.val] || 0) + x.n; });
    ((data.events || {}).add_all || []).forEach(function (x) { var m = /^kit-(.+)$/.exec(x.val || ''); if (m) all[m[1]] = (all[m[1]] || 0) + x.n; });
    var rows = kits.map(function (k) { var x = byPath['/kit-' + k.slug] || { pv: 0, uv: 0, dur: 0, clk: 0 }; return { k: k, x: x, all: all[k.slug] || 0 }; });
    rows.sort(function (a, b) { return b.x.pv - a.x.pv || b.x.clk - a.x.clk; });
    $('#kKits').innerHTML = rows.map(function (r) {
      return '<tr><td><span class="pn">' + esc(r.k.name) + '</span><span class="pp">/kit-' + esc(r.k.slug) + '</span></td><td class="r">' + n0(r.x.pv) + '</td><td class="r">' + n0(r.x.uv) + '</td><td class="r">' + (r.x.dur ? dur(r.x.dur) : '-') + '</td><td class="r">' + n0(r.x.clk) + '</td><td class="r">' + (r.x.pv ? pc(ratio(r.x.clk, r.x.pv)) : '-') + '</td><td class="r">' + n0(r.all) + '</td></tr>';
    }).join('') || '<tr><td colspan="7">키트 정보가 없습니다.</td></tr>';
  }

  /* 순위 */
  function rank(sel, list, label, sub, emptyMsg) {
    $(sel).innerHTML = list.length ? list.map(function (x) { return '<li><span class="nm" title="' + esc(label(x)) + '">' + esc(label(x)) + (sub && sub(x) ? '<small>' + esc(sub(x)) + '</small>' : '') + '</span><span class="n">' + n0(x.n) + '</span></li>'; }).join('')
      : '<li class="none">' + esc(emptyMsg || '아직 기록이 없습니다.') + '</li>';
  }
  function renderRanks() {
    var e = data.events || {};
    rank('#kProducts', (data.products || []).slice(0, 12), function (x) { return prodName(x.q); }, function (x) { return x.pick && x.search ? '대표 ' + x.pick + ' · 비교 ' + x.search : ''; });
    rank('#kSearch', (e.search || []).slice(0, 10), function (x) { return x.val; });
    rank('#kSearchNone', (e.search_none || []).slice(0, 8), function (x) { return x.val; }, null, '없습니다.');
    rank('#kAdds', (e.add || []).slice(0, 12), function (x) { return prodName(x.val); });
  }

  /* 날짜별 표 */
  function renderDaily() {
    $('#kDaily').innerHTML = data.daily.slice().reverse().map(function (d) {
      return '<tr><td>' + dot(d.day) + ' (' + wd(d.day) + ')</td><td class="r">' + n0(d.v) + '</td><td class="r">' + n0(d.s) + '</td><td class="r">' + n0(d.pv) + '</td><td class="r">' + n0(d.clk) + '</td><td class="r">' + n0(d.leads) + '</td><td class="r">' + (d.cp && d.cp.orders != null ? n0(d.cp.orders) : '-') + '</td><td class="r">' + (d.cp && d.cp.commission != null ? won(d.cp.commission) : '-') + '</td></tr>';
    }).join('');
  }

  /* ---------- 추이 (선 그래프 · 이번 기간 vs 이전 기간) ---------- */
  var METRIC = {
    v: { name: '방문자', get: function (d) { return d.v; } },
    pv: { name: '페이지뷰', get: function (d) { return d.pv; } },
    clk: { name: '쿠팡 클릭', get: function (d) { return d.clk; } },
    orders: { name: '쿠팡 주문', get: function (d) { return d.cp ? d.cp.orders : null; }, unit: '건' },
    commission: { name: '수익', get: function (d) { return d.cp ? d.cp.commission : null; }, unit: '원' }
  };
  $$('#kTrendSeg button').forEach(function (b) {
    b.addEventListener('click', function () {
      trendMetric = b.getAttribute('data-m');
      $$('#kTrendSeg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      if (data) renderTrend();
    });
  });
  function renderTrend() {
    var M = METRIC[trendMetric];
    var cur = data.daily.map(M.get), prev = (data.prevDaily || []).map(M.get);
    var fmt = function (v) { return v == null ? '-' : n0(v) + (M.unit || ''); };
    $('#kTrendLegend').innerHTML = '<span style="--k:var(--mark)">이번 기간</span><span style="--k:var(--mark-prev)">이전 기간</span>';
    lineChart($('#kTrend'), {
      labels: data.daily.map(function (d) { return d.day; }), prevLabels: (data.prevDaily || []).map(function (d) { return d.day; }),
      cur: cur, prev: prev, fmt: fmt, name: M.name,
      emptyMsg: (trendMetric === 'orders' || trendMetric === 'commission') ? '이 기간에 입력된 쿠팡 실적이 없습니다' : '이 기간에 기록이 없습니다'
    });
  }

  function el(tag, attrs, parent) { var e = document.createElementNS(SVGNS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function niceMax(v) { if (v <= 4) return 4; var p = Math.pow(10, Math.floor(Math.log10(v))), m = v / p; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * p; }
  function tipBox(host) {
    var t = host.querySelector('.kpi-tip'); if (!t) { t = document.createElement('div'); t.className = 'kpi-tip'; t.hidden = true; t.setAttribute('aria-hidden', 'true'); host.appendChild(t); }
    return t;
  }
  function tipSet(t, title, rows) {
    t.textContent = '';
    var h = document.createElement('div'); h.className = 't'; h.textContent = title; t.appendChild(h);
    rows.forEach(function (r) {
      var d = document.createElement('div'); d.className = 'r';
      var s = document.createElement('span'); s.textContent = r[0]; if (r[2]) s.style.setProperty('--k', r[2]);
      var b = document.createElement('b'); b.textContent = r[1];
      d.appendChild(s); d.appendChild(b); t.appendChild(d);
    });
    t.hidden = false;
  }
  function tipPlace(t, host, x, y) {
    var w = host.clientWidth, tw = t.offsetWidth;
    var left = x + 14; if (left + tw > w) left = x - tw - 14; if (left < 0) left = 0;
    t.style.left = left + 'px'; t.style.top = Math.max(0, y - 10) + 'px';
  }

  function lineChart(host, o) {
    host.textContent = '';
    var W = Math.max(280, host.clientWidth), H = W < 500 ? 200 : 230, L = 44, Rm = 18, T = 14, B = 26;
    var n = o.cur.length;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', tabindex: '0' }, host);
    var vals = o.cur.concat(o.prev).filter(function (v) { return v != null; });
    var hasCur = o.cur.some(function (v) { return v != null && v > 0; });
    var mx = niceMax(Math.max.apply(null, vals.concat([0])));
    var x = function (i) { return n <= 1 ? L + (W - L - Rm) / 2 : L + i * (W - L - Rm) / (n - 1); };
    var y = function (v) { return T + (H - T - B) * (1 - v / mx); };
    // 눈금
    for (var g = 0; g <= 4; g++) {
      var gv = mx * g / 4, gy = y(gv);
      el('line', { x1: L, x2: W - Rm, y1: gy, y2: gy, stroke: g === 0 ? 'var(--axis)' : 'var(--grid)', 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, svg);
      var tx = el('text', { x: L - 8, y: gy + 4, 'text-anchor': 'end', 'class': 'ax' }, svg); tx.textContent = axisNum(Math.round(gv * 10) / 10);
    }
    var step = Math.max(1, Math.ceil(n / (W < 500 ? 4 : 7)));
    for (var i = 0; i < n; i += step) {
      if (i !== 0 && n - 1 - i < step) continue;
      var lx = el('text', { x: x(i), y: H - 6, 'text-anchor': n === 1 ? 'middle' : i === 0 ? 'start' : 'middle', 'class': 'ax' }, svg); lx.textContent = md(o.labels[i]);
    }
    if (n > 1) { var le = el('text', { x: x(n - 1), y: H - 6, 'text-anchor': 'end', 'class': 'ax' }, svg); le.textContent = md(o.labels[n - 1]); }
    if (!hasCur && !o.prev.some(function (v) { return v; })) {
      var em = el('text', { x: L + (W - L - Rm) / 2, y: T + (H - T - B) / 2, 'text-anchor': 'middle', 'class': 'empty' }, svg); em.textContent = o.emptyMsg;
      svg.setAttribute('aria-label', o.name + ' 추이: ' + o.emptyMsg); return;
    }
    function path(arr) {
      var d = '', on = false;
      arr.forEach(function (v, i) { if (v == null) { on = false; return; } d += (on ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); on = true; });
      return d;
    }
    // 이전 기간 (비교선)
    if (o.prev.some(function (v) { return v != null; })) el('path', { d: path(o.prev), fill: 'none', stroke: 'var(--mark-prev)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    // 이번 기간 면 + 선
    var segs = [], cur = [];
    o.cur.forEach(function (v, i) { if (v == null) { if (cur.length) segs.push(cur); cur = []; } else cur.push(i); }); if (cur.length) segs.push(cur);
    segs.forEach(function (sg) {
      if (sg.length < 2) return;
      var d = 'M' + x(sg[0]) + ' ' + y(0) + sg.map(function (i) { return 'L' + x(i).toFixed(1) + ' ' + y(o.cur[i]).toFixed(1); }).join('') + 'L' + x(sg[sg.length - 1]) + ' ' + y(0) + 'Z';
      el('path', { d: d, fill: 'var(--mark-wash)', stroke: 'none' }, svg);
    });
    el('path', { d: path(o.cur), fill: 'none', stroke: 'var(--mark)', 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, svg);
    // 끝점과 값
    var li = -1; for (var k = n - 1; k >= 0; k--) if (o.cur[k] != null) { li = k; break; }
    if (li >= 0) {
      el('circle', { cx: x(li), cy: y(o.cur[li]), r: 4, fill: 'var(--mark)', stroke: '#fff', 'stroke-width': 2 }, svg);
      var et = el('text', { x: x(li) - 8, y: y(o.cur[li]) - 10, 'text-anchor': 'end', 'class': 'end' }, svg); et.textContent = o.fmt(o.cur[li]);
    }
    var tot = o.cur.reduce(function (a, v) { return a + (v || 0); }, 0);
    svg.setAttribute('aria-label', o.name + ' 일별 추이, ' + md(o.labels[0]) + '부터 ' + md(o.labels[n - 1]) + '까지 합계 ' + o.fmt(tot) + '. 화살표 키로 날짜별 값을 볼 수 있습니다.');
    // 십자선·툴팁
    var cross = el('line', { y1: T, y2: H - B, stroke: '#9AA3AD', 'stroke-width': 1, visibility: 'hidden', 'shape-rendering': 'crispEdges' }, svg);
    var dPrev = el('circle', { r: 4, fill: 'var(--mark-prev)', stroke: '#fff', 'stroke-width': 2, visibility: 'hidden' }, svg);
    var dCur = el('circle', { r: 4, fill: 'var(--mark)', stroke: '#fff', 'stroke-width': 2, visibility: 'hidden' }, svg);
    var hit = el('rect', { x: L - 6, y: 0, width: W - L - Rm + 12, height: H, fill: 'transparent' }, svg);
    var tip = tipBox(host), at = -1;
    function show(i) {
      if (i < 0 || i >= n) return; at = i;
      var cx = x(i); cross.setAttribute('x1', cx); cross.setAttribute('x2', cx); cross.setAttribute('visibility', 'visible');
      if (o.cur[i] != null) { dCur.setAttribute('cx', cx); dCur.setAttribute('cy', y(o.cur[i])); dCur.setAttribute('visibility', 'visible'); } else dCur.setAttribute('visibility', 'hidden');
      if (o.prev[i] != null) { dPrev.setAttribute('cx', cx); dPrev.setAttribute('cy', y(o.prev[i])); dPrev.setAttribute('visibility', 'visible'); } else dPrev.setAttribute('visibility', 'hidden');
      tipSet(tip, dot(o.labels[i]) + ' (' + wd(o.labels[i]) + ')', [
        ['이번 기간', o.fmt(o.cur[i]), 'var(--mark)'],
        ['이전 기간 ' + (o.prevLabels[i] ? md(o.prevLabels[i]) : ''), o.fmt(o.prev[i]), 'var(--mark-prev)']
      ]);
      var sc = host.clientWidth / W; tipPlace(tip, host, cx * sc, y(Math.max(o.cur[i] || 0, o.prev[i] || 0)) * sc);
    }
    function hide() { at = -1; tip.hidden = true; [cross, dPrev, dCur].forEach(function (e) { e.setAttribute('visibility', 'hidden'); }); }
    hit.addEventListener('pointermove', function (e) { var r = svg.getBoundingClientRect(); var px = (e.clientX - r.left) * W / r.width; show(n <= 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((px - L) / ((W - L - Rm) / (n - 1)))))); });
    hit.addEventListener('pointerleave', hide);
    svg.addEventListener('focus', function () { show(li >= 0 ? li : n - 1); });
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(Math.max(0, (at < 0 ? n : at) - 1)); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); show(Math.min(n - 1, at + 1)); }
      else if (e.key === 'Escape') hide();
    });
  }

  /* ---------- 시간대 (세로 막대) ---------- */
  function barChart(host, vals, label, name) {
    host.textContent = '';
    var W = Math.max(240, host.clientWidth), H = 170, L = 34, Rm = 6, T = 10, B = 22, n = vals.length;
    var svg = el('svg', { viewBox: '0 0 ' + W + ' ' + H, width: W, height: H, role: 'img', tabindex: '0' }, host);
    var mx = niceMax(Math.max.apply(null, vals.concat([0])));
    var slot = (W - L - Rm) / n, bw = Math.max(2, Math.min(24, slot - 2));
    var y = function (v) { return T + (H - T - B) * (1 - v / mx); };
    for (var g = 0; g <= 2; g++) {
      var gv = mx * g / 2, gy = y(gv);
      el('line', { x1: L, x2: W - Rm, y1: gy, y2: gy, stroke: g === 0 ? 'var(--axis)' : 'var(--grid)', 'stroke-width': 1, 'shape-rendering': 'crispEdges' }, svg);
      var tx = el('text', { x: L - 6, y: gy + 4, 'text-anchor': 'end', 'class': 'ax' }, svg); tx.textContent = axisNum(gv);
    }
    [0, 6, 12, 18, 23].forEach(function (i) { var t = el('text', { x: L + slot * i + slot / 2, y: H - 5, 'text-anchor': 'middle', 'class': 'ax' }, svg); t.textContent = i + '시'; });
    var total = vals.reduce(function (a, v) { return a + v; }, 0);
    if (!total) { var em = el('text', { x: L + (W - L - Rm) / 2, y: T + (H - T - B) / 2, 'text-anchor': 'middle', 'class': 'empty' }, svg); em.textContent = '이 기간에 기록이 없습니다'; return; }
    var bars = vals.map(function (v, i) {
      var bx = L + slot * i + (slot - bw) / 2, by = y(v), bh = y(0) - by, r = Math.min(4, bh, bw / 2);
      var d = bh <= 0 ? '' : 'M' + bx + ' ' + y(0) + 'V' + (by + r) + 'Q' + bx + ' ' + by + ' ' + (bx + r) + ' ' + by + 'H' + (bx + bw - r) + 'Q' + (bx + bw) + ' ' + by + ' ' + (bx + bw) + ' ' + (by + r) + 'V' + y(0) + 'Z';
      return el('path', { d: d, 'class': 'bar' }, svg);
    });
    var peak = vals.indexOf(Math.max.apply(null, vals));
    svg.setAttribute('aria-label', '시간대별 ' + name + ', 가장 많은 때는 ' + label(peak) + ' ' + n0(vals[peak]) + '회. 화살표 키로 시간대별 값을 볼 수 있습니다.');
    var tip = tipBox(host), at = -1;
    function show(i) {
      if (i < 0 || i >= n) return; at = i;
      bars.forEach(function (b, k) { b.classList.toggle('is-on', k === i); });
      tipSet(tip, label(i) + ' – ' + label(i + 1 > 23 ? 0 : i + 1), [[name, n0(vals[i]) + '회', 'var(--mark)']]);
      var sc = host.clientWidth / W; tipPlace(tip, host, (L + slot * i + slot / 2) * sc, y(vals[i]) * sc);
    }
    function hide() { at = -1; tip.hidden = true; bars.forEach(function (b) { b.classList.remove('is-on'); }); }
    var hit = el('rect', { x: L, y: 0, width: W - L - Rm, height: H, fill: 'transparent' }, svg);
    hit.addEventListener('pointermove', function (e) { var r = svg.getBoundingClientRect(); var px = (e.clientX - r.left) * W / r.width; show(Math.max(0, Math.min(n - 1, Math.floor((px - L) / slot)))); });
    hit.addEventListener('pointerleave', hide);
    svg.addEventListener('focus', function () { show(peak); });
    svg.addEventListener('blur', hide);
    svg.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft') { e.preventDefault(); show(Math.max(0, (at < 0 ? n : at) - 1)); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); show(Math.min(n - 1, at + 1)); }
      else if (e.key === 'Escape') hide();
    });
  }
  var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { if (data && !root.hidden) { renderTrend(); barChart($('#kHours'), data.hours || [], function (i) { return i + '시'; }, '페이지뷰'); } }, 150); });
  // 다른 탭에 있다가 KPI 탭으로 돌아오면 폭에 맞춰 다시 그림
  $$('.adm-tabs button[data-tab="kpi"]').forEach(function (b) { b.addEventListener('click', function () { if (data) setTimeout(function () { renderTrend(); barChart($('#kHours'), data.hours || [], function (i) { return i + '시'; }, '페이지뷰'); }, 0); }); });

  /* ---------- 쿠팡 실적 입력 ---------- */
  function cpLog(m) { var l = $('#kCpLog'); l.hidden = false; l.textContent = '[' + new Date().toLocaleTimeString('ko-KR') + '] ' + m + '\n' + l.textContent; }
  function parseDay(s) {
    s = String(s || '').trim(); var m, y = +kst().slice(0, 4);
    if ((m = /^(\d{4})\s*[-./년]\s*(\d{1,2})\s*[-./월]\s*(\d{1,2})/.exec(s))) return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2);
    if ((m = /^(\d{4})(\d{2})(\d{2})$/.exec(s))) return m[1] + '-' + m[2] + '-' + m[3];
    if ((m = /^(\d{1,2})\s*[-./월]\s*(\d{1,2})\s*일?$/.exec(s))) { var mo = +m[1], yy = mo > +kst().slice(5, 7) ? y - 1 : y; return yy + '-' + ('0' + mo).slice(-2) + '-' + ('0' + m[2]).slice(-2); }
    return '';
  }
  function splitLine(l) {
    if (l.indexOf('\t') >= 0) return l.split('\t');
    if (/"/.test(l)) { var out = [], re = /"([^"]*)"|([^,]+)/g, m; while ((m = re.exec(l))) out.push((m[1] != null ? m[1] : m[2]).trim()); return out; }
    if (/,\s/.test(l) || !/\d,\d{3}/.test(l)) return l.split(/\s*,\s*/);
    return l.split(/\s{2,}|\s*;\s*/);
  }
  function colOf(h) {
    h = String(h).replace(/\s/g, '');
    if (/날짜|일자|date|기간/i.test(h)) return 'day';
    if (/률|율|rate/i.test(h)) return null;
    if (/취소/.test(h)) return /금액|수익|수수료/.test(h) ? null : 'cancels';
    if (/수익|수수료|커미션|commission|정산/i.test(h)) return 'commission';
    if (/금액|매출|gmv|판매액|거래액/i.test(h)) return 'gmv';
    if (/클릭|click/i.test(h)) return 'clicks';
    if (/주문|구매|order/i.test(h)) return 'orders';
    return null;
  }
  function parseCp(text) {
    var lines = String(text || '').split(/\r?\n/).map(function (l) { return l.trim(); }).filter(Boolean);
    var cols = ['day', 'clicks', 'orders', 'cancels', 'gmv', 'commission'], rows = [], bad = 0;
    if (lines.length) {
      var head = splitLine(lines[0]);
      if (!parseDay(head[0]) && head.some(function (c) { return /[가-힣a-z]/i.test(c); })) {
        var mapped = head.map(colOf);
        if (mapped.indexOf('day') >= 0) { cols = mapped; lines.shift(); }
      }
    }
    lines.forEach(function (l) {
      var c = splitLine(l), o = { day: '' };
      cols.forEach(function (k, i) { if (!k || c[i] == null) return; if (k === 'day') o.day = parseDay(c[i]); else { var v = String(c[i]).replace(/[^0-9.\-]/g, ''); if (v !== '' && v !== '-') o[k] = Math.round(+v); } });
      if (o.day && ['clicks', 'orders', 'cancels', 'gmv', 'commission'].some(function (k) { return o[k] != null && !isNaN(o[k]); })) rows.push(o); else bad++;
    });
    return { rows: rows, bad: bad };
  }
  $('#kCpPaste').addEventListener('input', function () {
    var r = parseCp(this.value), pv = $('#kCpPreview');
    if (!this.value.trim()) { pv.textContent = '첫 줄에 \'날짜, 클릭, 주문, 취소, 금액, 수익\' 같은 제목이 있으면 열 순서를 알아서 맞춥니다. 제목이 없으면 위 예시 순서로 읽습니다.'; return; }
    if (!r.rows.length) { pv.textContent = '읽을 수 있는 줄이 없습니다. 날짜와 숫자가 한 줄에 있는지 확인하세요.'; return; }
    var days = r.rows.map(function (x) { return x.day; }).sort();
    var sum = function (k) { return r.rows.reduce(function (a, x) { return a + (x[k] || 0); }, 0); };
    pv.textContent = '읽은 날짜 ' + r.rows.length + '일 (' + dot(days[0]) + (days.length > 1 ? ' – ' + dot(days[days.length - 1]) : '') + ') · 클릭 ' + n0(sum('clicks')) + ' · 주문 ' + n0(sum('orders')) + '건 · 수익 ' + won(sum('commission')) + (r.bad ? ' · 건너뛸 줄 ' + r.bad + '개' : '');
  });
  function saveRows(rows, src, done) {
    if (!key()) { cpLog('관리 키를 먼저 입력하세요.'); return; }
    if (!rows.length) { cpLog('저장할 줄이 없습니다.'); return; }
    api('/api/cp-report', { method: 'POST', body: JSON.stringify({ rows: rows, src: src }) }).then(function (j) {
      if (!j.ok) { cpLog('저장 실패: ' + (j.error || j._status)); return; }
      cpLog(j.saved + '일 저장했습니다.' + (j.bad && j.bad.length ? ' 날짜를 읽지 못한 줄 ' + j.bad.length + '개는 건너뛰었습니다.' : ''));
      if (done) done(); load();
    });
  }
  $('#kCpSave').addEventListener('click', function () { var r = parseCp($('#kCpPaste').value); saveRows(r.rows, 'csv', function () { $('#kCpPaste').value = ''; }); });
  $('#kCpDay').value = addDays(kst(), -1);
  $('#kCpOne').addEventListener('click', function () {
    var o = { day: $('#kCpDay').value };
    [['clicks', '#kCpClicks'], ['orders', '#kCpOrders'], ['cancels', '#kCpCancels'], ['gmv', '#kCpGmv'], ['commission', '#kCpComm']].forEach(function (p) { var v = $(p[1]).value; if (v !== '') o[p[0]] = +v; });
    if (!o.day) { cpLog('날짜를 고르세요.'); return; }
    if (Object.keys(o).length < 2) { cpLog('숫자를 하나 이상 넣으세요.'); return; }
    saveRows([o], 'manual', function () { ['#kCpClicks', '#kCpOrders', '#kCpCancels', '#kCpGmv', '#kCpComm'].forEach(function (s) { $(s).value = ''; }); });
  });
  $('#kCpSync').addEventListener('click', function () {
    var btn = this; if (!key()) { cpLog('관리 키를 먼저 입력하세요.'); return; }
    var r = rangeOf(mode); btn.disabled = true; cpLog('쿠팡 리포트 API에서 ' + dot(r[0]) + ' – ' + dot(r[1]) + ' 실적을 불러오는 중…');
    api('/api/cp-report', { method: 'POST', body: JSON.stringify({ sync: true, from: r[0], to: r[1] }) }).then(function (j) {
      if (j.error === 'no-keys') { cpLog(j.message); return; }
      if (!j.ok) { cpLog('불러오기 실패: ' + (j.messages || []).join(' / ')); return; }
      cpLog(dot(j.from) + ' – ' + dot(j.to) + ' ' + j.saved + '일을 쿠팡 리포트 값으로 채웠습니다.' + (j.messages && j.messages.length ? ' (일부 오류: ' + j.messages.join(' / ') + ')' : ''));
      load();
    }).finally(function () { btn.disabled = false; });
  });
  var SRCN = { api: '쿠팡 API', csv: '붙여넣기', manual: '직접 입력' };
  function loadCpRows() {
    var r = rangeOf(mode);
    api('/api/cp-report?from=' + addDays(r[1], -89) + '&to=' + r[1]).then(function (j) {
      if (!j.ok) return;
      $('#kCpState').textContent = j.hasKeys ? 'API 키 등록됨 · \'쿠팡에서 불러오기\'를 쓸 수 있습니다' : 'API 키 없음 · 최종 승인 전에는 붙여넣기로 입력합니다';
      var rows = j.rows || [];
      $('#kCpMore').hidden = rows.length <= 10; $('#kCpMore').textContent = cpAll ? '최근 10일만 보기' : '최근 90일 ' + rows.length + '일 모두 보기';
      $('#kCpRows').innerHTML = (cpAll ? rows : rows.slice(0, 10)).map(function (x) {
        return '<tr><td>' + dot(x.day) + ' (' + wd(x.day) + ')</td><td class="r">' + n0(x.clicks) + '</td><td class="r">' + n0(x.orders) + '</td><td class="r">' + n0(x.cancels) + '</td><td class="r">' + won(x.gmv) + '</td><td class="r">' + won(x.commission) + '</td><td>' + esc(SRCN[x.src] || x.src || '') + '</td><td><button type="button" class="del" data-del="' + esc(x.day) + '">삭제</button></td></tr>';
      }).join('') || '<tr><td colspan="8">최근 90일 동안 입력된 실적이 없습니다.</td></tr>';
    });
  }
  var cpAll = false;
  $('#kCpMore').addEventListener('click', function () { cpAll = !cpAll; loadCpRows(); });
  $('#kCpRows').addEventListener('click', function (e) {
    var b = e.target.closest('[data-del]'); if (!b) return;
    var d = b.getAttribute('data-del'); if (!confirm(dot(d) + ' 실적을 지울까요?')) return;
    api('/api/cp-report', { method: 'POST', body: JSON.stringify({ del: [d] }) }).then(function (j) { cpLog(j.ok ? dot(d) + ' 실적을 지웠습니다.' : '삭제 실패'); load(); });
  });

  /* ---------- 내 방문 제외 ---------- */
  function isSelfOff() { try { return localStorage.getItem('ssr_noTrack') === '1'; } catch (e) { return false; } }
  function paintSelf() {
    var on = isSelfOff(), b = $('#kSelf');
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    b.textContent = on ? '이 브라우저 방문 제외 중 · 다시 포함하기' : '이 브라우저 방문 제외하기';
    b.className = 'btn btn-sm ' + (on ? 'btn-navy' : 'btn-outline');
  }
  $('#kSelf').addEventListener('click', function () {
    try { if (isSelfOff()) localStorage.removeItem('ssr_noTrack'); else localStorage.setItem('ssr_noTrack', '1'); } catch (e) {}
    paintSelf(); if (data) render();
  });
  paintSelf();
})();
