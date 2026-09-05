/** GET /api/health — 배포와 D1 연결 상태 확인용 */
export async function onRequestGet({ env }) {
  let db = 'not-bound';
  if (env.DB) {
    try { await env.DB.prepare('SELECT 1').first(); db = 'ok'; } catch (e) { db = 'error: ' + String(e.message || e).slice(0, 80); }
  }
  return new Response(JSON.stringify({ ok: true, db, time: new Date().toISOString() }), { headers: { 'Content-Type': 'application/json' } });
}
