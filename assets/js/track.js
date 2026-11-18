/* 스스로연구소 방문 통계 — 관리 화면 KPI용 익명 기록
   보내는 것: 페이지 경로, 머문 시간(초), 스크롤 깊이(%), 들어온 사이트 주소(첫 페이지만), 탭 세션 값, 몇 가지 행동(검색어·구매 목록 담기 등)
   보내지 않는 것: 이름·연락처·IP 주소·쿠키. 탭 세션 값은 탭을 닫으면 지워지고, '전에 와 본 적 있음' 표시 한 칸만 이 브라우저에 남습니다.
   브라우저의 추적 거부(Do Not Track·GPC)가 켜져 있으면 아무것도 보내지 않습니다. */
(function () {
  'use strict';
  var S = window.SSR = window.SSR || {};
  var EP = '/api/pv';
  var self = false, off = false;
  try { self = localStorage.getItem('ssr_noTrack') === '1'; } catch (e) {}
  try { off = self || navigator.doNotTrack === '1' || window.doNotTrack === '1' || navigator.globalPrivacyControl === true || navigator.webdriver === true; } catch (e) {}
  S.trackSelf = self;        // 관리자 '내 방문 제외'
  S.trackOff = off;
  S.track = function () {};
  S.sid = function () { return ''; };
  if (off) return;

  function rid() {
    var a = new Uint8Array(8);
    try { (window.crypto || window.msCrypto).getRandomValues(a); } catch (e) { for (var i = 0; i < 8; i++) a[i] = Math.floor(Math.random() * 256); }
    return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
  }
  function path() {
    var p = location.pathname.toLowerCase().replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
    return p.length > 1 ? p.replace(/\/+$/, '') : p;
  }
  function send(o) {
    var b = JSON.stringify(o);
    try { if (navigator.sendBeacon && navigator.sendBeacon(EP, new Blob([b], { type: 'text/plain' }))) return; } catch (e) {}
    try { fetch(EP, { method: 'POST', body: b, keepalive: true, headers: { 'Content-Type': 'text/plain' } }); } catch (e) {}
  }

  /* 세션: 같은 탭에서 30분 안에 이어진 방문 */
  var SK = 'ssr_sess', sid = '', fresh = 0, now = Date.now();
  try { var v = (sessionStorage.getItem(SK) || '').split('|'); if (v[0] && /^[0-9a-f]{16}$/.test(v[0]) && now - (+v[1] || 0) < 1800e3) sid = v[0]; } catch (e) {}
  if (!sid) { sid = rid(); fresh = 1; }
  function touch() { try { sessionStorage.setItem(SK, sid + '|' + Date.now()); } catch (e) {} }
  touch();
  S.sid = function () { return sid; };

  /* 재방문 표시 (날짜·식별값 없이 '있음'만) */
  var ret = 0;
  try { ret = localStorage.getItem('ssr_seen') === '1' ? 1 : 0; if (!ret) localStorage.setItem('ssr_seen', '1'); } catch (e) {}

  var pvid, active, last, lastAct, vis, maxScr, sent;
  function startPage(isNewSession) {
    pvid = rid(); active = 0; last = Date.now(); lastAct = last; vis = document.visibilityState !== 'hidden'; maxScr = 0; sent = '';
    var o = { t: 'pv', id: pvid, sid: sid, p: path(), ns: isNewSession ? 1 : 0 };
    if (isNewSession) {
      o.ret = ret;
      try { var r = document.referrer ? new URL(document.referrer).hostname : ''; if (r && r !== location.hostname) o.r = r; } catch (e) {}
      try { var q = new URLSearchParams(location.search); var us = q.get('utm_source'); if (us) o.us = us.slice(0, 40); } catch (e) {}
    }
    if (navigator.maxTouchPoints > 1) o.tch = 1;
    send(o);
    scroll();
  }

  /* 머문 시간: 화면이 보이는 동안, 5분 넘게 아무 조작이 없으면 멈춤 */
  function acc() {
    var t = Date.now();
    if (vis && t - lastAct < 300e3) active += Math.min(t - last, 30e3);
    last = t;
  }
  function leave() {
    acc();
    var d = Math.min(1800, Math.round(active / 1000)), key = d + '/' + maxScr;
    if (key === sent) return;
    sent = key;
    send({ t: 'lv', id: pvid, d: d, s: maxScr });
    touch();
  }
  var ticking = false;
  function scroll() {
    var h = Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0);
    var p = h > 0 ? Math.round(Math.min(1, (window.scrollY + window.innerHeight) / h) * 100) : 0;
    if (p > maxScr) maxScr = p;
    ticking = false;
  }
  function start() {
    startPage(fresh);
    setInterval(acc, 5000);
    ['pointerdown', 'keydown', 'touchstart', 'wheel', 'mousemove'].forEach(function (n) { window.addEventListener(n, function () { lastAct = Date.now(); }, { passive: true }); });
    window.addEventListener('scroll', function () { lastAct = Date.now(); if (!ticking) { ticking = true; requestAnimationFrame(scroll); } }, { passive: true });
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { leave(); vis = false; }
      else { vis = true; last = Date.now(); lastAct = last; }
    });
    window.addEventListener('pagehide', leave);
    // 뒤로 가기 캐시에서 다시 보이면 새 페이지 보기로 셉니다
    window.addEventListener('pageshow', function (e) { if (e.persisted) startPage(0); });
  }

  /* 행동 기록: SSR.track('search', '데코타일') */
  var evCount = 0;
  S.track = function (name, val) {
    if (++evCount > 40) return;
    send({ t: 'ev', sid: sid, p: path(), n: String(name), v: val == null ? '' : String(val).slice(0, 60) });
    touch();
  };

  if (document.prerendering) document.addEventListener('prerenderingchange', start, { once: true });
  else start();
})();
