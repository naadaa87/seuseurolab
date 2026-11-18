/**
 * GET /api/popular — 스스로몰 '자주 찾는 제품'용 집계 (공개)
 * 최근 30일 구매 버튼 클릭을 검색어 단위로 합산해 상위 30개만 돌려줍니다.
 * 개인 식별 정보는 없고(검색어·횟수만), 10분 동안 캐시합니다. 클릭이 2회 미만인 검색어는 빼서 한두 번 누른 것으로 순위가 바뀌지 않게 합니다.
 */
const json = (b, s = 200, cache = 'public, max-age=600, s-maxage=600') =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache } });

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ ok: true, items: [] });
  try {
    const r = await env.DB.prepare(
      `SELECT CASE WHEN substr(k, 9, 1) = '@' THEN substr(k, 10) ELSE substr(k, 9) END AS q, COUNT(*) AS n
         FROM aff_clicks
        WHERE created_at >= datetime('now', '-30 days') AND k LIKE 'coupang:%'
        GROUP BY q HAVING n >= 2 ORDER BY n DESC LIMIT 30`
    ).all();
    return json({ ok: true, items: (r.results || []).map((x) => ({ q: x.q, n: x.n })) });
  } catch (e) {
    // 테이블이 아직 없거나 오류면 빈 목록 — 화면은 기본 순서로 보여 줍니다
    return json({ ok: true, items: [] }, 200, 'public, max-age=60');
  }
}
