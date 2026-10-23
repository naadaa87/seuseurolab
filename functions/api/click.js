/**
 * POST /api/click — 스스로몰 구매 링크 클릭 기록 (navigator.sendBeacon)
 * 저장 항목: 링크 키(판매처:검색어), 제휴 여부, 상품 id, 페이지 경로, 시각. IP·기기 정보 등 개인 식별 정보는 저장하지 않습니다.
 */
let ready = false;
async function ensure(env) {
  if (ready) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS aff_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      k TEXT NOT NULL, aff INTEGER NOT NULL DEFAULT 0, pid TEXT, page TEXT)`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_aff_clicks_created ON aff_clicks(created_at)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_aff_clicks_k ON aff_clicks(k)'),
  ]);
  ready = true;
}
const KEY_RE = /^(coupang|naver|ohou|danawa|pro):.{1,80}$/;

export async function onRequestPost({ request, env }) {
  if (!env.DB) return new Response(null, { status: 204 });
  let d;
  try { d = JSON.parse(await request.text()); } catch { return new Response(null, { status: 400 }); }
  const k = String(d.k || '').replace(/\s+/g, ' ').trim();
  if (!KEY_RE.test(k)) return new Response(null, { status: 400 });
  try {
    await ensure(env);
    await env.DB.prepare('INSERT INTO aff_clicks (k, aff, pid, page) VALUES (?1, ?2, ?3, ?4)')
      .bind(k, d.aff ? 1 : 0, String(d.pid || '').slice(0, 20), String(d.page || '').slice(0, 120)).run();
  } catch (e) { /* 기록 실패는 무시 — 사용자 이동을 막지 않음 */ }
  return new Response(null, { status: 204 });
}
export async function onRequestGet() { return new Response('Method Not Allowed', { status: 405 }); }
