/**
 * GET /api/kpi?from=YYYY-MM-DD&to=YYYY-MM-DD — 관리 화면 KPI 집계 (관리자: 헤더 X-Admin-Key)
 * 날짜는 한국 시간 기준. 같은 길이의 바로 앞 기간과 비교값을 함께 돌려줍니다.
 *
 * 용어
 *  방문자   하루 단위 순방문자를 기간 동안 더한 값 (같은 사람이 이틀 오면 2)
 *  방문     세션 수. 브라우저 탭 하나에서 30분 안에 이어진 페이지 보기 묶음
 *  참여 방문 2쪽 이상 봤거나, 10초 이상 머물렀거나, 쿠팡 링크를 누른 방문. 이탈률 = 1 - 참여 방문 비율
 *  쿠팡 클릭률 쿠팡 링크를 한 번이라도 누른 방문 ÷ 전체 방문
 *  구매 전환 쿠팡 파트너스 리포트의 주문 수 (관리 화면에서 입력하거나 API로 받아 온 값)
 */
import { ensureStats, kstDay, addDays, daysBetween, utcBounds, DAY_RE, cleanPath } from '../_lib/stats.js';

const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const num = (x) => (x == null || isNaN(x) ? 0 : +x);

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_KEY || (request.headers.get('X-Admin-Key') || '') !== env.ADMIN_KEY) return json({ ok: false, error: 'forbidden' }, 403);
  if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);
  const u = new URL(request.url);
  const today = kstDay();
  let to = u.searchParams.get('to') || today, from = u.searchParams.get('from') || addDays(to, -29);
  if (!DAY_RE.test(from) || !DAY_RE.test(to)) return json({ ok: false, error: 'bad-date' }, 400);
  if (from > to) [from, to] = [to, from];
  if (daysBetween(from, to) > 365) from = addDays(to, -365);
  const span = daysBetween(from, to) + 1;
  const pTo = addDays(from, -1), pFrom = addDays(pTo, -(span - 1));
  const DB = env.DB;

  try {
    await ensureStats(env);

    async function summary(f, t) {
      const [s, e] = utcBounds(f, t);
      const r = await DB.batch([
        DB.prepare(`SELECT COUNT(*) pv, COUNT(DISTINCT day || vid) v, AVG(CASE WHEN dur > 0 THEN dur END) pdur, AVG(CASE WHEN scr > 0 THEN scr END) scr,
            SUM(ns) ns, SUM(CASE WHEN ns = 1 AND ret = 1 THEN 1 ELSE 0 END) ret, SUM(CASE WHEN ns = 1 AND dev = 'm' THEN 1 ELSE 0 END) mob
            FROM pv WHERE day BETWEEN ?1 AND ?2`).bind(f, t),
        DB.prepare(`WITH k AS (SELECT DISTINCT sid FROM aff_clicks WHERE created_at >= ?3 AND created_at < ?4 AND sid IS NOT NULL),
                         a AS (SELECT DISTINCT sid FROM ev WHERE day BETWEEN ?1 AND ?2 AND sid IS NOT NULL AND name IN ('add', 'add_all', 'kit_all')),
                         s AS (SELECT sid, COUNT(*) c, SUM(dur) d, MAX(CASE WHEN path = '/mall' OR path LIKE '/kit-%' THEN 1 ELSE 0 END) m
                                 FROM pv WHERE day BETWEEN ?1 AND ?2 AND sid IS NOT NULL GROUP BY sid)
            SELECT COUNT(*) n, AVG(d) sdur, AVG(c) pps,
              SUM(CASE WHEN c >= 2 OR d >= 10 OR sid IN (SELECT sid FROM k) THEN 1 ELSE 0 END) eng,
              SUM(m) mall,
              SUM(CASE WHEN sid IN (SELECT sid FROM a) THEN 1 ELSE 0 END) adds,
              SUM(CASE WHEN sid IN (SELECT sid FROM k) THEN 1 ELSE 0 END) ks
            FROM s`).bind(f, t, s, e),
        DB.prepare('SELECT COUNT(*) n, COALESCE(SUM(aff), 0) a FROM aff_clicks WHERE created_at >= ?1 AND created_at < ?2').bind(s, e),
        DB.prepare('SELECT COUNT(*) n FROM leads WHERE created_at >= ?1 AND created_at < ?2').bind(s, e),
        DB.prepare('SELECT name, COUNT(*) n, COUNT(DISTINCT sid) s FROM ev WHERE day BETWEEN ?1 AND ?2 GROUP BY name').bind(f, t),
        DB.prepare(`SELECT COUNT(*) days, SUM(clicks) clicks, SUM(orders) orders, SUM(cancels) cancels, SUM(gmv) gmv, SUM(commission) commission
            FROM cp_reports WHERE day BETWEEN ?1 AND ?2`).bind(f, t),
      ]);
      const a = r[0].results[0] || {}, b = r[1].results[0] || {}, c = r[2].results[0] || {}, cp = r[5].results[0] || {};
      const ev = {}; (r[4].results || []).forEach((x) => { ev[x.name] = { n: x.n, s: x.s }; });
      return {
        pv: num(a.pv), visitors: num(a.v), pageDur: num(a.pdur), scroll: num(a.scr), landings: num(a.ns), returning: num(a.ret), mobile: num(a.mob),
        sessions: num(b.n), sessDur: num(b.sdur), pps: num(b.pps), engaged: num(b.eng), mallSessions: num(b.mall), addSessions: num(b.adds), clickSessions: num(b.ks),
        clicks: num(c.n), affClicks: num(c.a), leads: num((r[3].results[0] || {}).n), ev,
        cp: { days: num(cp.days), clicks: cp.clicks == null ? null : num(cp.clicks), orders: cp.orders == null ? null : num(cp.orders),
          cancels: cp.cancels == null ? null : num(cp.cancels), gmv: cp.gmv == null ? null : num(cp.gmv), commission: cp.commission == null ? null : num(cp.commission) },
      };
    }

    const [cs, ce] = utcBounds(from, to);
    const [cur, prev, det] = await Promise.all([
      summary(from, to),
      summary(pFrom, pTo),
      DB.batch([
        /* 0 일별 */ DB.prepare('SELECT day, COUNT(*) pv, COUNT(DISTINCT vid) v, COUNT(DISTINCT sid) s FROM pv WHERE day BETWEEN ?1 AND ?2 GROUP BY day').bind(from, to),
        /* 1 */ DB.prepare(`SELECT date(created_at, '+9 hours') day, COUNT(*) n, COUNT(DISTINCT sid) s FROM aff_clicks WHERE created_at >= ?1 AND created_at < ?2 GROUP BY day`).bind(cs, ce),
        /* 2 */ DB.prepare(`SELECT date(created_at, '+9 hours') day, COUNT(*) n FROM leads WHERE created_at >= ?1 AND created_at < ?2 GROUP BY day`).bind(cs, ce),
        /* 3 쿠팡 실적 */ DB.prepare('SELECT day, clicks, orders, cancels, gmv, commission, src, updated_at FROM cp_reports WHERE day BETWEEN ?1 AND ?2 ORDER BY day').bind(from, to),
        /* 4 페이지 */ DB.prepare(`SELECT path, COUNT(*) pv, COUNT(DISTINCT day || vid) uv, AVG(CASE WHEN dur > 0 THEN dur END) dur, AVG(CASE WHEN scr > 0 THEN scr END) scr, SUM(ns) ent
            FROM pv WHERE day BETWEEN ?1 AND ?2 GROUP BY path ORDER BY pv DESC LIMIT 80`).bind(from, to),
        /* 5 진입 페이지의 한 쪽 방문 */ DB.prepare(`WITH s AS (SELECT sid, COUNT(*) c FROM pv WHERE day BETWEEN ?1 AND ?2 AND sid IS NOT NULL GROUP BY sid)
            SELECT p.path, SUM(CASE WHEN s.c = 1 THEN 1 ELSE 0 END) single FROM pv p JOIN s ON s.sid = p.sid WHERE p.ns = 1 AND p.day BETWEEN ?1 AND ?2 GROUP BY p.path`).bind(from, to),
        /* 6 페이지별 클릭 */ DB.prepare('SELECT page, COUNT(*) n, COUNT(DISTINCT sid) s FROM aff_clicks WHERE created_at >= ?1 AND created_at < ?2 GROUP BY page').bind(cs, ce),
        /* 7 유입 */ DB.prepare(`WITH k AS (SELECT DISTINCT sid FROM aff_clicks WHERE created_at >= ?3 AND created_at < ?4 AND sid IS NOT NULL)
            SELECT COALESCE(src, 'direct') src, COUNT(*) s, SUM(CASE WHEN sid IN (SELECT sid FROM k) THEN 1 ELSE 0 END) ks
            FROM pv WHERE ns = 1 AND day BETWEEN ?1 AND ?2 GROUP BY 1 ORDER BY s DESC LIMIT 40`).bind(from, to, cs, ce),
        /* 8 기기 */ DB.prepare(`WITH k AS (SELECT DISTINCT sid FROM aff_clicks WHERE created_at >= ?3 AND created_at < ?4 AND sid IS NOT NULL)
            SELECT COALESCE(dev, 'd') dev, COUNT(*) s, SUM(CASE WHEN sid IN (SELECT sid FROM k) THEN 1 ELSE 0 END) ks
            FROM pv WHERE ns = 1 AND day BETWEEN ?1 AND ?2 GROUP BY 1`).bind(from, to, cs, ce),
        /* 9 시간대 */ DB.prepare(`SELECT CAST(strftime('%H', ts, '+9 hours') AS INTEGER) h, COUNT(*) n FROM pv WHERE day BETWEEN ?1 AND ?2 GROUP BY h`).bind(from, to),
        /* 10 상품 클릭 */ DB.prepare('SELECT k, COUNT(*) n, COUNT(DISTINCT sid) s FROM aff_clicks WHERE created_at >= ?1 AND created_at < ?2 GROUP BY k ORDER BY n DESC LIMIT 150').bind(cs, ce),
        /* 11 행동 상세 */ DB.prepare(`SELECT name, val, COUNT(*) n FROM ev WHERE day BETWEEN ?1 AND ?2 AND val IS NOT NULL GROUP BY name, val ORDER BY n DESC LIMIT 400`).bind(from, to),
        /* 12 지금 */ DB.prepare(`SELECT COUNT(DISTINCT sid) n FROM pv WHERE day = ?1 AND ts >= datetime('now', '-5 minutes')`).bind(today),
        /* 13 */ DB.prepare('SELECT MIN(day) d FROM pv'),
        /* 14 */ DB.prepare('SELECT MAX(updated_at) u, MAX(day) d FROM cp_reports'),
        /* 15 접수 종류 */ DB.prepare('SELECT service, COUNT(*) n FROM leads WHERE created_at >= ?1 AND created_at < ?2 GROUP BY service ORDER BY n DESC').bind(cs, ce),
        /* 16 이전 기간 일별 (비교선) */ DB.prepare('SELECT day, COUNT(*) pv, COUNT(DISTINCT vid) v, COUNT(DISTINCT sid) s FROM pv WHERE day BETWEEN ?1 AND ?2 GROUP BY day').bind(pFrom, pTo),
        /* 17 */ DB.prepare(`SELECT date(created_at, '+9 hours') day, COUNT(*) n, COUNT(DISTINCT sid) s FROM aff_clicks WHERE created_at >= ?1 AND created_at < ?2 GROUP BY day`).bind(...utcBounds(pFrom, pTo)),
        /* 18 */ DB.prepare('SELECT day, clicks, orders, cancels, gmv, commission FROM cp_reports WHERE day BETWEEN ?1 AND ?2').bind(pFrom, pTo),
      ]),
    ]);
    const R = (i) => det[i].results || [];

    // 일별 표 (이번 기간 · 이전 기간)
    function days(f, t, rPv, rClk, rLead, rCp) {
      const out = []; const idx = {};
      for (let d = f; d <= t; d = addDays(d, 1)) { idx[d] = out.length; out.push({ day: d, pv: 0, v: 0, s: 0, clk: 0, clkS: 0, leads: 0, cp: null }); }
      rPv.forEach((x) => { const o = out[idx[x.day]]; if (o) { o.pv = x.pv; o.v = x.v; o.s = x.s; } });
      rClk.forEach((x) => { const o = out[idx[x.day]]; if (o) { o.clk = x.n; o.clkS = x.s; } });
      rLead.forEach((x) => { const o = out[idx[x.day]]; if (o) o.leads = x.n; });
      rCp.forEach((x) => { const o = out[idx[x.day]]; if (o) o.cp = { clicks: x.clicks, orders: x.orders, cancels: x.cancels, gmv: x.gmv, commission: x.commission }; });
      return out;
    }
    const daily = days(from, to, R(0), R(1), R(2), R(3));
    const prevDaily = days(pFrom, pTo, R(16), R(17), [], R(18));

    // 페이지별 (클릭 기록의 경로도 같은 모양으로 맞춤)
    const single = {}; R(5).forEach((x) => { single[x.path] = x.single; });
    const pclk = {}; R(6).forEach((x) => { const p = cleanPath(x.page); const o = pclk[p] || (pclk[p] = { n: 0, s: 0 }); o.n += x.n; o.s += x.s; });
    const pages = R(4).map((x) => ({ path: x.path, pv: x.pv, uv: x.uv, dur: Math.round(num(x.dur)), scr: Math.round(num(x.scr)), ent: num(x.ent), single: num(single[x.path]), clk: pclk[x.path] ? pclk[x.path].n : 0, clkS: pclk[x.path] ? pclk[x.path].s : 0 }));

    // 상품별 클릭 (대표 상품 @ 와 검색 결과 링크를 한 줄로)
    const prod = {};
    R(10).forEach((x) => {
      let q = x.k.slice(x.k.indexOf(':') + 1); const pick = q.charAt(0) === '@'; if (pick) q = q.slice(1);
      const o = prod[q] || (prod[q] = { q, n: 0, pick: 0, search: 0, s: 0 });
      o.n += x.n; o.s += x.s; if (pick) o.pick += x.n; else o.search += x.n;
    });
    const products = Object.values(prod).sort((a, b) => b.n - a.n).slice(0, 60);

    const events = {};
    R(11).forEach((x) => { (events[x.name] = events[x.name] || []).length < 30 && events[x.name].push({ val: x.val, n: x.n }); });
    const hours = Array(24).fill(0); R(9).forEach((x) => { if (x.h >= 0 && x.h < 24) hours[x.h] = x.n; });

    return json({
      ok: true,
      range: { from, to, days: span, prevFrom: pFrom, prevTo: pTo, today },
      since: (R(13)[0] || {}).d || null,
      live: num((R(12)[0] || {}).n),
      hasKeys: !!(env.COUPANG_ACCESS_KEY && env.COUPANG_SECRET_KEY),
      cpLast: R(14)[0] || null,
      cur, prev, daily, prevDaily, hours, pages,
      sources: R(7), devices: R(8), products, events, leadTypes: R(15),
    });
  } catch (e) {
    return json({ ok: false, error: 'db-error', detail: String(e.message || e).slice(0, 300) }, 500);
  }
}
