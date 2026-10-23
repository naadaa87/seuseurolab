/**
 * 스스로몰 제휴 링크
 *  GET  /api/aff-links            → 등록된 제휴 링크 전체 (공개, 5분 캐시)
 *  POST /api/aff-links            → 링크 저장·삭제 (관리자: 헤더 X-Admin-Key = 환경변수 ADMIN_KEY)
 *       body: { "links": { "coupang:검색어": "https://link.coupang.com/a/xxxx", "naver:검색어": "" } }  (빈 값 = 삭제)
 * D1 바인딩 이름: DB. 테이블은 처음 호출할 때 자동으로 만듭니다.
 */
const json = (body, status = 200, extra = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...extra } });

let ready = false;
async function ensure(env) {
  if (ready) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS aff_links (
    k TEXT PRIMARY KEY, url TEXT NOT NULL, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`).run();
  ready = true;
}
const isAdmin = (request, env) => !!env.ADMIN_KEY && (request.headers.get('X-Admin-Key') || '') === env.ADMIN_KEY;

// 등록 가능한 판매처 도메인 (관리 키가 새더라도 엉뚱한 링크가 걸리지 않도록 제한)
const ALLOW = ['coupang.com', 'naver.com', 'naver.me', 'ohou.se', 'danawa.com', 'linkprice.com', '11st.co.kr', 'gmarket.co.kr',
  'auction.co.kr', 'ssg.com', 'lotteon.com', 'aliexpress.com', 'kurly.com', 'daisomall.co.kr', 'ikea.com'];
function okUrl(u, env) {
  try {
    const x = new URL(u);
    if (x.protocol !== 'https:') return false;
    if (env.AFF_ALLOW_ANY === '1') return true;
    return ALLOW.some((d) => x.hostname === d || x.hostname.endsWith('.' + d));
  } catch { return false; }
}
const KEY_RE = /^(coupang|naver|ohou|danawa|pro):.{1,80}$/;

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);
  try {
    await ensure(env);
    const { results } = await env.DB.prepare('SELECT k, url FROM aff_links').all();
    const links = {};
    for (const r of results) links[r.k] = r.url;
    return json({ ok: true, count: results.length, links }, 200, { 'Cache-Control': 'public, max-age=300' });
  } catch (e) {
    return json({ ok: false, error: 'db-error' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!isAdmin(request, env)) return json({ ok: false, error: 'forbidden' }, 403);
  if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid-json' }, 400); }
  const links = body && body.links && typeof body.links === 'object' ? body.links : null;
  if (!links) return json({ ok: false, error: 'no-links' }, 400);
  await ensure(env);
  const stmts = []; const rejected = []; let saved = 0, deleted = 0;
  for (const [rawK, rawU] of Object.entries(links)) {
    const k = String(rawK).replace(/\s+/g, ' ').trim();
    if (!KEY_RE.test(k)) { rejected.push({ k, reason: 'key' }); continue; }
    const u = String(rawU || '').trim();
    if (!u) { stmts.push(env.DB.prepare('DELETE FROM aff_links WHERE k = ?1').bind(k)); deleted++; continue; }
    if (!okUrl(u, env) || u.length > 600) { rejected.push({ k, reason: 'url' }); continue; }
    stmts.push(env.DB.prepare(`INSERT INTO aff_links (k, url, updated_at) VALUES (?1, ?2, datetime('now'))
      ON CONFLICT(k) DO UPDATE SET url = excluded.url, updated_at = datetime('now')`).bind(k, u));
    saved++;
  }
  try {
    for (let i = 0; i < stmts.length; i += 50) await env.DB.batch(stmts.slice(i, i + 50));
    return json({ ok: true, saved, deleted, rejected });
  } catch (e) {
    return json({ ok: false, error: 'db-error', detail: String(e.message || e).slice(0, 200) }, 500);
  }
}
