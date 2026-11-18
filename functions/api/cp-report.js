/**
 * /api/cp-report — 쿠팡 파트너스 실적(클릭·주문·취소·주문금액·수익)을 날짜별로 보관 (관리자: 헤더 X-Admin-Key)
 *  GET  ?from=YYYY-MM-DD&to=YYYY-MM-DD           저장된 날짜별 실적
 *  POST { rows: [{ day, clicks, orders, cancels, gmv, commission }], src }   직접 입력·리포트 붙여넣기 저장 (빈 칸은 기존 값 유지)
 *  POST { del: ['YYYY-MM-DD', ...] }               날짜 삭제
 *  POST { sync: true, from, to }                   쿠팡 파트너스 리포트 API에서 받아 오기
 *       → COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY 가 있어야 합니다 (쿠팡 파트너스 최종 승인 후 발급).
 * 구매 전환 KPI(주문 수·전환율·수익)는 이 표의 값으로 계산합니다. 사이트에서는 쿠팡 안의 구매를 볼 수 없기 때문입니다.
 */
import { ensureStats, kstDay, addDays, daysBetween, DAY_RE, enc } from '../_lib/stats.js';

const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const auth = (request, env) => env.ADMIN_KEY && (request.headers.get('X-Admin-Key') || '') === env.ADMIN_KEY;
const FIELDS = ['clicks', 'orders', 'cancels', 'gmv', 'commission'];
const toInt = (v) => { if (v === '' || v == null) return null; const n = Math.round(Number(String(v).replace(/[^0-9.\-]/g, ''))); return isFinite(n) ? n : null; };

export async function onRequestGet({ request, env }) {
  if (!auth(request, env)) return json({ ok: false, error: 'forbidden' }, 403);
  if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);
  const u = new URL(request.url);
  const to = DAY_RE.test(u.searchParams.get('to') || '') ? u.searchParams.get('to') : kstDay();
  const from = DAY_RE.test(u.searchParams.get('from') || '') ? u.searchParams.get('from') : addDays(to, -89);
  await ensureStats(env);
  const r = await env.DB.prepare('SELECT * FROM cp_reports WHERE day BETWEEN ?1 AND ?2 ORDER BY day DESC').bind(from, to).all();
  return json({ ok: true, rows: r.results || [], hasKeys: !!(env.COUPANG_ACCESS_KEY && env.COUPANG_SECRET_KEY) });
}

async function upsert(env, rows, src) {
  const st = rows.map((x) => env.DB.prepare(`INSERT INTO cp_reports (day, clicks, orders, cancels, gmv, commission, src, updated_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, datetime('now'))
      ON CONFLICT(day) DO UPDATE SET clicks = COALESCE(excluded.clicks, clicks), orders = COALESCE(excluded.orders, orders),
        cancels = COALESCE(excluded.cancels, cancels), gmv = COALESCE(excluded.gmv, gmv), commission = COALESCE(excluded.commission, commission),
        src = excluded.src, updated_at = excluded.updated_at`).bind(x.day, x.clicks, x.orders, x.cancels, x.gmv, x.commission, src));
  for (let i = 0; i < st.length; i += 50) await env.DB.batch(st.slice(i, i + 50));
  return st.length;
}

export async function onRequestPost({ request, env }) {
  if (!auth(request, env)) return json({ ok: false, error: 'forbidden' }, 403);
  if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);
  let b; try { b = await request.json(); } catch { return json({ ok: false, error: 'invalid-json' }, 400); }
  await ensureStats(env);

  if (Array.isArray(b.del)) {
    const days = b.del.filter((d) => DAY_RE.test(d)).slice(0, 400);
    if (days.length) await env.DB.batch(days.map((d) => env.DB.prepare('DELETE FROM cp_reports WHERE day = ?1').bind(d)));
    return json({ ok: true, deleted: days.length });
  }

  if (Array.isArray(b.rows)) {
    const rows = []; const bad = [];
    b.rows.slice(0, 400).forEach((x) => {
      const day = String((x && x.day) || '');
      if (!DAY_RE.test(day)) { bad.push(day); return; }
      const o = { day }; let any = false;
      FIELDS.forEach((f) => { o[f] = toInt(x[f]); if (o[f] != null) any = true; });
      if (any) rows.push(o); else bad.push(day);
    });
    const saved = rows.length ? await upsert(env, rows, b.src === 'csv' ? 'csv' : 'manual') : 0;
    return json({ ok: true, saved, bad });
  }

  if (b.sync) return sync(env, b);
  return json({ ok: false, error: 'bad-request' }, 400);
}

/* ---------- 쿠팡 파트너스 리포트 API ---------- */
const DOMAIN = 'https://api-gateway.coupang.com';
const BASE = '/v2/providers/affiliate_open_api/apis/openapi/v1/reports/';
async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, '0')).join('');
}
function signedDate() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return String(d.getUTCFullYear()).slice(2) + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
}
async function call(env, kind, from, to, page) {
  const path = BASE + kind;
  const query = 'startDate=' + from.replace(/-/g, '') + '&endDate=' + to.replace(/-/g, '') + (env.COUPANG_SUB_ID ? '&subId=' + encodeURIComponent(env.COUPANG_SUB_ID) : '') + '&page=' + page;
  const dt = signedDate();
  const sig = await hmacHex(env.COUPANG_SECRET_KEY, dt + 'GET' + path + query);
  const r = await fetch(DOMAIN + path + '?' + query, { headers: { Authorization: `CEA algorithm=HmacSHA256, access-key=${env.COUPANG_ACCESS_KEY}, signed-date=${dt}, signature=${sig}`, 'Content-Type': 'application/json;charset=UTF-8' } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || (j.rCode != null && String(j.rCode) !== '0')) throw new Error(kind + ' ' + r.status + ' ' + (j.rCode || '') + ' ' + (j.rMessage || j.message || ''));
  return Array.isArray(j.data) ? j.data : (j.data && Array.isArray(j.data.data) ? j.data.data : []);
}
async function callAll(env, kind, from, to) {
  const out = [];
  for (let page = 0; page < 20; page++) {
    const d = await call(env, kind, from, to, page);
    out.push(...d);
    if (d.length < 500) break; // 한 쪽보다 적으면 마지막 쪽
  }
  return out;
}
const dayOf = (x) => { const s = String(x.date || x.orderDate || x.statDate || '').replace(/[^0-9]/g, ''); return s.length === 8 ? s.slice(0, 4) + '-' + s.slice(4, 6) + '-' + s.slice(6) : ''; };
const pick = (x, names) => { for (const n of names) if (x[n] != null && x[n] !== '') return Number(x[n]) || 0; return 0; };

async function sync(env, b) {
  if (!env.COUPANG_ACCESS_KEY || !env.COUPANG_SECRET_KEY) {
    return json({ ok: false, error: 'no-keys', message: '쿠팡 파트너스 API 키(COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY)가 환경변수에 없습니다. 최종 승인 전에는 리포트 화면의 숫자를 붙여넣어 입력하세요.' }, 400);
  }
  const yday = addDays(kstDay(), -1);
  let to = DAY_RE.test(b.to || '') ? b.to : yday; if (to > yday) to = yday;
  let from = DAY_RE.test(b.from || '') ? b.from : addDays(to, -29);
  if (from > to) from = to;
  if (daysBetween(from, to) > 89) from = addDays(to, -89);

  const agg = {}; const got = { clicks: false, orders: false, cancels: false, commission: false }; const messages = [];
  const row = (d) => agg[d] || (agg[d] = { clicks: 0, orderIds: new Set(), orderRows: 0, cancelIds: new Set(), cancelRows: 0, gmv: 0, commission: 0, orderCommission: 0 });
  // 리포트 API는 한 번에 30일까지 조회됩니다
  for (let f = from; f <= to; f = addDays(f, 30)) {
    const t = addDays(f, 29) < to ? addDays(f, 29) : to;
    for (const kind of ['clicks', 'orders', 'cancels', 'commission']) {
      try {
        const data = await callAll(env, kind, f, t);
        got[kind] = true;
        data.forEach((x) => {
          const d = dayOf(x); if (!d) return; const o = row(d);
          if (kind === 'clicks') o.clicks += pick(x, ['click', 'clicks', 'clickCount']);
          else if (kind === 'orders') { if (x.orderId != null) o.orderIds.add(String(x.orderId)); else o.orderRows++; o.gmv += pick(x, ['gmv', 'gmvAmount', 'orderAmount']); o.orderCommission += pick(x, ['commission', 'commissionAmount']); }
          else if (kind === 'cancels') { if (x.orderId != null) o.cancelIds.add(String(x.orderId)); else o.cancelRows++; }
          else o.commission += pick(x, ['commission', 'commissionAmount', 'amount']);
        });
      } catch (e) { messages.push(String(e.message || e).slice(0, 160)); }
    }
  }
  if (!Object.values(got).some(Boolean)) return json({ ok: false, error: 'api-failed', messages });

  const rows = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const o = agg[d] || row(d);
    rows.push({
      day: d,
      clicks: got.clicks ? o.clicks : null,
      orders: got.orders ? o.orderIds.size + o.orderRows : null,
      cancels: got.cancels ? o.cancelIds.size + o.cancelRows : null,
      gmv: got.orders ? Math.round(o.gmv) : null,
      commission: got.commission ? Math.round(o.commission) : (got.orders ? Math.round(o.orderCommission) : null),
    });
  }
  const saved = await upsert(env, rows, 'api');
  return json({ ok: true, saved, from, to, messages });
}
