/**
 * POST /api/click — 스스로몰 구매 링크 클릭 기록 (navigator.sendBeacon)
 * 저장 항목: 링크 키(coupang:검색어, 대표 상품은 coupang:@검색어), 제휴 여부, 상품 id, 페이지 경로, 시각,
 * 탭 세션 값(sid — 방문 통계와 이어 '쿠팡 링크 클릭률'을 계산할 때만 씀). IP·기기 정보 등 개인 식별 정보는 저장하지 않습니다.
 */
import { ensureStats, isBot } from '../_lib/stats.js';

const KEY_RE = /^coupang:.{1,82}$/;
const ID_RE = /^[0-9a-f]{16}$/;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return new Response(null, { status: 204 });
  if (isBot(request.headers.get('User-Agent') || '')) return new Response(null, { status: 204 });
  let d;
  try { d = JSON.parse(await request.text()); } catch { return new Response(null, { status: 400 }); }
  const k = String(d.k || '').replace(/\s+/g, ' ').trim();
  if (!KEY_RE.test(k)) return new Response(null, { status: 400 });
  try {
    await ensureStats(env);
    await env.DB.prepare('INSERT INTO aff_clicks (k, aff, pid, page, sid) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(k, d.aff ? 1 : 0, String(d.pid || '').slice(0, 20), String(d.page || '').slice(0, 120), ID_RE.test(d.sid || '') ? d.sid : null).run();
  } catch (e) { /* 기록 실패는 무시 — 사용자 이동을 막지 않음 */ }
  return new Response(null, { status: 204 });
}
export async function onRequestGet() { return new Response('Method Not Allowed', { status: 405 }); }
