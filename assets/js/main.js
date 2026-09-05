/* 스스로연구소 공통 스크립트 */
(function () {
  'use strict';

  /* 모바일 내비 */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* 연도 */
  document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* 폼 제출: /api/lead → 실패 시 안내 + 로컬 보관 */
  window.SSR = window.SSR || {};

  SSR.submitLead = function (form, extra) {
    var msg = form.querySelector('.form-msg');
    var btn = form.querySelector('[type=submit]');
    var data = {};
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    if (data.website) { return; } // honeypot
    if (extra) { Object.keys(extra).forEach(function (k) { data[k] = extra[k]; }); }
    data.page = location.pathname;
    data.ua = navigator.userAgent.slice(0, 120);

    function show(type, html) { msg.className = 'form-msg is-' + type; msg.innerHTML = html; msg.scrollIntoView({ block: 'nearest' }); }

    if (!form.checkValidity()) { form.reportValidity(); return; }
    btn.disabled = true; var old = btn.textContent; btn.textContent = '보내는 중';

    fetch('/api/lead', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (res.ok && res.body && res.body.ok) {
          form.reset();
          show('ok', '<strong>접수됐습니다.</strong> 영업일 기준 1일 안에 답변드립니다. 급한 건이면 <a href="mailto:' + SSR.contactEmail + '">' + SSR.contactEmail + '</a>로 알려주세요.');
        } else {
          throw new Error((res.body && res.body.error) || 'server');
        }
      })
      .catch(function () {
        try { localStorage.setItem('ssr_pending_' + Date.now(), JSON.stringify(data)); } catch (e) {}
        var summary = Object.keys(data).filter(function (k) { return ['page', 'ua', 'website'].indexOf(k) < 0 && data[k]; })
          .map(function (k) { return k + ': ' + data[k]; }).join('\n');
        show('err', '<strong>접수 시스템에 연결하지 못했습니다.</strong> 아래 내용을 복사해 <a href="mailto:' + SSR.contactEmail + '?subject=' + encodeURIComponent('[스스로연구소 문의]') + '&body=' + encodeURIComponent(summary) + '">' + SSR.contactEmail + '</a>로 보내주시면 같은 순서로 처리합니다.<br><button type="button" class="btn btn-outline btn-sm mt-16" data-copy>내용 복사</button>');
        var cb = msg.querySelector('[data-copy]');
        if (cb) cb.addEventListener('click', function () { SSR.copy(summary, cb); });
      })
      .finally(function () { btn.disabled = false; btn.textContent = old; });
  };

  SSR.copy = function (text, btn) {
    var done = function () { if (btn) { var o = btn.textContent; btn.textContent = '복사됨'; setTimeout(function () { btn.textContent = o; }, 1500); } };
    if (navigator.clipboard) { navigator.clipboard.writeText(text).then(done); }
    else { var t = document.createElement('textarea'); t.value = text; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); done(); }
  };

  document.querySelectorAll('form[data-lead]').forEach(function (f) {
    f.addEventListener('submit', function (e) { e.preventDefault(); SSR.submitLead(f, { service: f.getAttribute('data-lead') }); });
  });

  /* 전화번호 자동 하이픈 */
  document.querySelectorAll('input[type=tel]').forEach(function (el) {
    el.addEventListener('input', function () {
      var v = el.value.replace(/[^0-9]/g, '').slice(0, 11);
      if (v.length > 7) v = v.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3');
      else if (v.length > 3) v = v.replace(/(\d{3})(\d+)/, '$1-$2');
      el.value = v;
    });
  });
})();
