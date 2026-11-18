/**
 * POST /api/pv — 방문 통계 수집 (assets/js/track.js 가 navigator.sendBeacon 으로 보냄)
 *  t:'pv' 페이지 보기   { id, sid, p, ns, ret, r, us, tch }
 *  t:'lv' 페이지 떠남   { id, d(체류 초), s(최대 스크롤 %) }
 *  t:'ev' 행동 기록     { sid, p, n(이름), v(값) }
 * 이름·연락처·IP 주소·쿠키는 저장하지 않습니다. 자세한 방식은 functions/_lib/stats.js 첫머리를 보세요.
 */
import { ensureStats, kstDay, addDays, visitorId, isBot, devOf, sourceOf, cleanPath } from '../_lib/stats.js';

const ID_RE = /^[0-9a-f]{16}$/;
const EVENTS = new Set(['search', 'search_none', 'add', 'add_all', 'kit_all', 'list_copy', 'list_share', 'diag_done', 'lead']);
const none = (s = 204) => new Response(null, { status: s });

export async function onRequestPost({ request, env }) {
  if (!env.DB) return none();
  const ua = request.headers.get('User-Agent') || '';
  if (isBot(ua)) return none();
  const origin = request.headers.get('Origin');
  if (origin) { try { if (new URL(origin).host !== new URL(request.url).host) return none(403); } catch { return none(403); } }
  const raw = await request.text();
  if (raw.length > 2000) return none(413);
  let d; try { d = JSON.parse(raw); } catch { return none(400); }
  const day = kstDay();
  try {
    await ensureStats(env);
    if (d.t === 'pv') {
      if (!ID_RE.test(d.id || '') || !ID_RE.test(d.sid || '')) return none(400);
      const ns = d.ns ? 1 : 0;
      const ref = ns && typeof d.r === 'string' && /^[a-z0-9.\-]{1,80}$/i.test(d.r) ? d.r.toLowerCase() : '';
      const utm = ns && typeof d.us === 'string' ? d.us.slice(0, 40) : '';
      const vid = await visitorId(env, request, day);
      await env.DB.prepare('INSERT OR IGNORE INTO pv (id, day, path, vid, sid, ns, ret, src, ref, dev) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)')
        .bind(d.id, day, cleanPath(d.p), vid, d.sid, ns, ns && d.ret ? 1 : 0, ns ? sourceOf(ref, utm, ua) : null, ref || null, devOf(ua, !!d.tch)).run();
    } else if (d.t === 'lv') {
      if (!ID_RE.test(d.id || '')) return none(400);
      const dur = Math.max(0, Math.min(1800, Math.round(+d.d || 0)));
      const scr = Math.max(0, Math.min(100, Math.round(+d.s || 0)));
      await env.DB.prepare('UPDATE pv SET dur = max(dur, ?2), scr = max(scr, ?3) WHERE id = ?1 AND ts >= datetime(\'now\', \'-1 day\')')
        .bind(d.id, dur, scr).run();
    } else if (d.t === 'ev') {
      const name = String(d.n || '');
      if (!EVENTS.has(name)) return none(400);
      const sid = ID_RE.test(d.sid || '') ? d.sid : null;
      const val = String(d.v == null ? '' : d.v).replace(/\s+/g, ' ').trim().slice(0, 60);
      await env.DB.prepare('INSERT INTO ev (day, sid, path, name, val) VALUES (?1, ?2, ?3, ?4, ?5)')
        .bind(day, sid, cleanPath(d.p), name, val || null).run();
    } else return none(400);

    // 가끔 오래된 기록 정리 (약 13개월 보관)
    if (Math.random() < 0.002) {
      const old = addDays(day, -400);
      await env.DB.batch([
        env.DB.prepare('DELETE FROM pv WHERE day < ?1').bind(old),
        env.DB.prepare('DELETE FROM ev WHERE day < ?1').bind(old),
        env.DB.prepare("DELETE FROM aff_clicks WHERE created_at < datetime('now', '-400 days')"),
      ]);
    }
  } catch (e) { /* 기록 실패는 무시 — 방문자 화면에 영향 없음 */ }
  return none();
}
export async function onRequestGet() { return new Response('Method Not Allowed', { status: 405 }); }
