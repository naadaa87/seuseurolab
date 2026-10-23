/* 스스로연구소 · 7분 공사비 절감 진단 (규칙 기반 v1)
   결과는 참고용 판정이며, 유료 리포트 단계에서 사람이 검토합니다. */
(function () {
  'use strict';
  var P = window.SSR.processes, IND = window.SSR.industry, BL = window.SSR.badgeLabel, PL = window.SSR.phaseLabel;
  var byId = {}; P.forEach(function (p) { byId[p.id] = p; });

  var steps = Array.prototype.slice.call(document.querySelectorAll('.wiz-step'));
  var total = steps.length - 1; // 마지막은 결과
  var cur = 0;
  var bar = document.querySelector('.wiz-bar > i');
  var lbl = document.querySelector('.wiz-count');
  var answers = {};

  function go(n) {
    steps[cur].classList.remove('is-active');
    cur = n;
    steps[cur].classList.add('is-active');
    var pct = Math.min(100, Math.round((cur / total) * 100));
    if (bar) bar.style.width = pct + '%';
    if (lbl) lbl.textContent = cur < total ? (cur + 1) + ' / ' + total : '결과';
    window.scrollTo({ top: document.querySelector('.wiz').offsetTop - 90, behavior: 'smooth' });
  }

  function collect(step) {
    var ok = true;
    step.querySelectorAll('[data-q]').forEach(function (group) {
      var key = group.getAttribute('data-q');
      var type = group.getAttribute('data-type') || 'radio';
      if (type === 'radio') {
        var sel = group.querySelector('input:checked');
        if (!sel) { ok = false; } else { answers[key] = sel.value; }
      } else if (type === 'check') {
        answers[key] = Array.prototype.map.call(group.querySelectorAll('input:checked'), function (i) { return i.value; });
      } else if (type === 'number') {
        var inp = group.querySelector('input');
        var v = parseFloat(inp.value);
        if (!v || v <= 0) { ok = false; } else { answers[key] = v; }
      }
    });
    return ok;
  }

  document.querySelectorAll('[data-next]').forEach(function (b) {
    b.addEventListener('click', function () {
      var step = steps[cur];
      var err = step.querySelector('.wiz-err');
      if (!collect(step)) { if (err) err.classList.add('is-show'); return; }
      if (err) err.classList.remove('is-show');
      if (cur + 1 === total) { render(); }
      go(cur + 1);
    });
  });
  document.querySelectorAll('[data-prev]').forEach(function (b) {
    b.addEventListener('click', function () { if (cur > 0) go(cur - 1); });
  });

  /* ---------- 규칙 엔진 ---------- */
  function compute(a) {
    var ind = IND[a.industry] || IND.other;
    var set = ind.set.slice();
    var flags = [];
    var warns = [];

    // 현재 상태
    if (a.state === 'partial') { set.unshift('demo-light', 'waste'); }
    if (a.state === 'full') { set.unshift('demo-light', 'waste'); flags.push('전면 철거 현장은 철거 후(HP1) 숨은 배관·누수·벽체 상태를 반드시 사진으로 남기고 추가 비용을 그 시점에 확정하세요.'); }

    // 희망 범위
    if (a.scope === 'min') { set = set.filter(function (id) { return ['carpentry', 'drywall', 'tile', 'glass', 'plumb-new', 'duct'].indexOf(id) < 0 || (a.industry === 'restaurant' && (id === 'duct' || id === 'plumb-new')); }); }
    if (a.scope === 'full') { if (set.indexOf('tile') < 0) set.push('tile'); if (set.indexOf('glass') < 0) set.push('glass'); if (set.indexOf('hvac') < 0) set.push('hvac'); }

    // 건물 조건
    var b = a.building || [];
    if (b.indexOf('multi') >= 0 && set.indexOf('fire') < 0) set.push('fire');
    if (b.indexOf('usage') >= 0) flags.push('용도변경이 필요한 점포는 공사보다 행정 절차가 먼저입니다. 변경 가능 여부를 계약 전에 확인하세요.');
    if (b.indexOf('mgmt') >= 0) flags.push('관리사무소 승인이 필요한 건물입니다. 공사 신고, 작업 시간, 엘리베이터 사용, 폐기물 반출 규정을 HP0(공사 전)에서 확인하세요.');
    if (b.indexOf('landlord') < 0) warns.push('임대인 동의를 아직 확보하지 않았습니다. 시설 변경은 임대인 동의 없이는 원상복구 분쟁으로 이어집니다. 어떤 공정도 시작하기 전에 서면 동의를 받으세요.');

    // 중복 제거·정렬
    var seen = {}; set = set.filter(function (id) { if (seen[id] || !byId[id]) return false; seen[id] = true; return true; });
    var list = set.map(function (id) { return Object.assign({}, byId[id]); });

    // 개인 조건에 따른 조정
    var exp = a.experience || 'none';
    var high = a.height === 'high';
    list.forEach(function (p) {
      p.finalBadge = p.badge; p.reason = '';
      if (p.badge === 'direct') {
        if (exp === 'none' && p.K >= 3) { p.finalBadge = 'assist'; p.reason = '셀프 경험이 없어 숙련 난이도(K' + p.K + ') 공정은 실습 후 또는 기술자와 나눠서'; }
        if (high && (p.id === 'paint' || p.id === 'wallpaper' || p.id === 'film')) { p.reason = (p.reason ? p.reason + ' · ' : '') + '층고 3m 이상은 사다리 작업 위험이 커져 상부는 기술자 병행 권장'; if (p.finalBadge === 'direct' && p.id === 'wallpaper') p.finalBadge = 'assist'; }
      }
    });
    list.sort(function (x, y) { return x.phase - y.phase; });

    var counts = { direct: 0, assist: 0, verify: 0 };
    var eDirect = 0, eAll = 0;
    list.forEach(function (p) { counts[p.finalBadge]++; eAll += p.E; if (p.finalBadge === 'direct') eDirect += p.E; });
    var ratio = eAll ? eDirect / eAll : 0;
    var potential = ratio >= 0.5 ? 'high' : ratio >= 0.3 ? 'mid' : 'low';

    // 일정 메모
    var sched = [];
    if (a.weekend === 'yes') sched.push('주말만 작업이 가능하면 셀프 공정(도장·필름·바닥)을 주말 단위로 나누고, 양생·건조가 필요한 공정은 주말 사이에 두세요.');
    if (a.period === 'w2') sched.push('2주 이내 오픈이면 셀프 비중을 줄이는 편이 현실적입니다. 도장·집기·연출만 직접 하고 나머지는 분리 발주하세요.');
    if (a.period === 'w4') sched.push('2~4주면 반셀프에 적합한 기간입니다. 전문 공정을 먼저 끝내고 마감·집기를 직접 하는 순서가 안전합니다.');
    if (a.budget === 'b1' || a.budget === 'b2') sched.push('예산 구간상 자재 직접 구매와 분리 발주의 효과가 큽니다. BOM(구매 목록)을 먼저 만들고 누락을 막는 것이 절감의 핵심입니다.');

    // 행정 체크리스트
    var admin = ind.admin.slice();
    admin.unshift('임대인 서면 동의 (공사 범위·기간·원상복구 범위 명시)');
    if (a.state !== 'new') admin.push('건설폐기물 배출자 신고 및 허가업체 위탁');
    admin.push('옥외광고물 허가·신고 및 건물 소유자 승낙');
    if (b.indexOf('mgmt') >= 0) admin.push('관리사무소 공사 신고 · 작업시간 · 반출 규정');
    if (b.indexOf('usage') >= 0) admin.push('건축물 용도변경 가능 여부 확인');
    if (b.indexOf('multi') >= 0 && admin.join(' ').indexOf('완비증명') < 0) admin.push('다중이용업소 소방시설 완비증명');
    // 중복 제거
    var seenA = {}; admin = admin.filter(function (s) { var k = s.slice(0, 12); if (seenA[k]) return false; seenA[k] = true; return true; });

    return { ind: ind, list: list, counts: counts, ratio: ratio, potential: potential, flags: flags, warns: warns, sched: sched, admin: admin };
  }

  /* ---------- 렌더 ---------- */
  var lastResult = null;

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function render() {
    var r = compute(answers); lastResult = r;
    var root = document.getElementById('result');
    var potTxt = { high: '높음', mid: '중간', low: '낮음' }[r.potential];
    var area = answers.area ? answers.area + '평' : '';
    var html = '';

    html += '<p class="text-muted text-small">' + esc(r.ind.label) + ' · ' + esc(area) + ' · ' + ({ new: '빈 상태', partial: '기존 시설 일부 유지', full: '전면 철거 필요' }[answers.state] || '') + ' · ' + ({ min: '최소 범위', std: '표준 범위', full: '전면 공사' }[answers.scope] || '') + '</p>';
    html += '<h2 class="wiz-q">이 현장의 공정은 ' + r.list.length + '개로 나뉩니다.</h2>';
    html += '<p class="wiz-help">아래 판정은 업종·상태·경험을 반영한 규칙 기반 초안입니다. 유료 리포트에서는 현장 사진과 도면을 보고 사람이 다시 검토합니다.</p>';

    html += '<div class="res-head">' +
      '<div class="res-stat direct"><div class="n">' + r.counts.direct + '</div><div class="l">직접 가능</div></div>' +
      '<div class="res-stat assist"><div class="n">' + r.counts.assist + '</div><div class="l">전문가 동행 권장</div></div>' +
      '<div class="res-stat verify"><div class="n">' + r.counts.verify + '</div><div class="l">등록·전문업체 확인 필수</div></div></div>';

    if (r.warns.length) { r.warns.forEach(function (w) { html += '<div class="callout callout-stop mb-24"><strong>먼저 확인할 것</strong><p>' + esc(w) + '</p></div>'; }); }

    html += '<div class="res-block"><h3>셀프 절감 잠재력 <span class="potential ' + r.potential + '">' + potTxt + '</span></h3>' +
      '<p>직접 가능 공정의 경제성 점수가 전체의 <strong>' + Math.round(r.ratio * 100) + '%</strong>입니다. 반셀프 방식의 절감액은 같은 범위를 턴키로 맡길 때의 인건비·관리비 비중에서 나옵니다. 정확한 금액 범위(P25/P50/P75)는 현장 조건을 반영한 리포트에서 제공합니다.</p></div>';

    html += '<div class="res-block"><h3>공정 순서와 판정</h3><ol class="seq">';
    r.list.forEach(function (p, i) {
      html += '<li><span class="ph">' + (i + 1) + '</span><span class="nm">' + esc(p.name) + '<small>' + esc(PL[p.phase]) + ' · ' + esc(p.reason || p.note) + (p.kw ? ' · <a href="catalog.html?q=' + encodeURIComponent(p.kw) + '" style="color:var(--orange);font-weight:600">도구·자재 보기</a>' : '') + '</small></span><span class="badge badge-' + p.finalBadge + '">' + BL[p.finalBadge] + '</span></li>';
    });
    html += '</ol></div>';

    if (r.flags.length || r.sched.length) {
      html += '<div class="res-block"><h3>이 현장에서 특히 볼 것</h3><ul class="chk">';
      r.flags.concat(r.sched).forEach(function (f) { html += '<li>' + esc(f) + '</li>'; });
      html += '</ul></div>';
    }

    html += '<div class="res-block"><h3>행정·동의 체크리스트</h3><ul class="chk">';
    r.admin.forEach(function (s) { html += '<li>' + esc(s) + '</li>'; });
    html += '</ul></div>';

    html += '<div class="res-block"><h3>다음 단계</h3>' +
      '<div class="grid grid-3">' +
      '<div class="box box-accent"><h3>실행 리포트 받기</h3><p>공정 지도, BOM(구매 목록), 비용 3안, 일정 3안, 행정 체크, Hold Point까지 8개 출력. 사람이 검토한 뒤 보내드립니다.</p><p class="mt-16"><a class="btn btn-primary" href="#report">리포트 신청</a></p></div>' +
      '<div class="box"><h3>도구·자재·예산 준비</h3><p>판정된 공정별 도구와 자재를 <a href="catalog.html">자료실</a>에서 확인하고, <a href="calc.html">계산기</a>로 수량을 뽑은 뒤 <a href="budget.html">예산표</a>에 넣어 보세요.</p><p class="mt-16"><a class="btn btn-outline" href="catalog.html">자료실</a> <a class="btn btn-outline" href="budget.html">예산표</a></p></div>' +
      '<div class="box"><h3>결과 저장</h3><p>이 판정을 텍스트로 복사해 두거나, 공정 판정 가이드에서 각 공정의 근거를 확인하세요.</p><p class="mt-16"><button type="button" class="btn btn-outline" id="copyResult">결과 복사</button> <a class="btn btn-outline" href="guide.html">판정 가이드</a></p></div>' +
      '</div></div>';

    root.innerHTML = html;
    document.getElementById('copyResult').addEventListener('click', function () { window.SSR.copy(toText(r), this); });

    // 리포트 폼에 요약 채우기
    var sum = document.getElementById('reportSummary');
    if (sum) sum.value = toText(r);
    try { localStorage.setItem('ssr_last_diagnosis', JSON.stringify({ answers: answers, result: slim(r), at: new Date().toISOString() })); } catch (e) {}
  }

  function slim(r) {
    return { industry: r.ind.label, counts: r.counts, ratio: Math.round(r.ratio * 100), potential: r.potential,
      list: r.list.map(function (p) { return { id: p.id, name: p.name, badge: p.finalBadge, reason: p.reason || '' }; }), admin: r.admin, warns: r.warns };
  }

  function toText(r) {
    var t = ['[스스로연구소 7분 진단 결과]', '업종: ' + r.ind.label, '면적: ' + (answers.area || '') + '평', '직접 가능 ' + r.counts.direct + ' / 전문가 동행 ' + r.counts.assist + ' / 등록업체 확인 ' + r.counts.verify, '셀프 절감 잠재력: ' + ({ high: '높음', mid: '중간', low: '낮음' }[r.potential]) + ' (' + Math.round(r.ratio * 100) + '%)', '', '공정 순서:'];
    r.list.forEach(function (p, i) { t.push((i + 1) + '. ' + p.name + ' — ' + BL[p.finalBadge]); });
    t.push('', '행정·동의 체크:'); r.admin.forEach(function (s) { t.push('- ' + s); });
    return t.join('\n');
  }

  /* 리포트 신청 폼 */
  var rf = document.getElementById('reportForm');
  if (rf) {
    rf.addEventListener('submit', function (e) {
      e.preventDefault();
      var extra = { service: 'sigongso', kind: 'diagnosis-report', answers: JSON.stringify(answers), result: lastResult ? JSON.stringify(slim(lastResult)) : '' };
      window.SSR.submitLead(rf, extra);
    });
  }
})();
