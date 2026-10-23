/** GET /api/aff-stats — 최근 30일 스스로몰 클릭 통계 (관리자: 헤더 X-Admin-Key) */
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

export async function onRequestGet({ request, env }) {
  if (!env.ADMIN_KEY || (request.headers.get('X-Admin-Key') || '') !== env.ADMIN_KEY) return json({ ok: false, error: 'forbidden' }, 403);
  if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);
  try {
    await env.DB.prepare(`CREATE TABLE IF NOT EXISTS aff_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      k TEXT NOT NULL, aff INTEGER NOT NULL DEFAULT 0, pid TEXT, page TEXT)`).run();
    const since = "datetime('now', '-30 days')";
    const tot = await env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(aff), 0) AS a FROM aff_clicks WHERE created_at >= ${since}`).first();
    const top = await env.DB.prepare(`SELECT k, COUNT(*) AS n, COALESCE(SUM(aff), 0) AS a FROM aff_clicks WHERE created_at >= ${since} GROUP BY k ORDER BY n DESC LIMIT 500`).all();
    const pages = await env.DB.prepare(`SELECT page, COUNT(*) AS n FROM aff_clicks WHERE created_at >= ${since} GROUP BY page ORDER BY n DESC LIMIT 20`).all();
    return json({ ok: true, total: tot.n, affClicks: tot.a, top: top.results, pages: pages.results });
  } catch (e) {
    return json({ ok: false, error: 'db-error', detail: String(e.message || e).slice(0, 200) }, 500);
  }
}
