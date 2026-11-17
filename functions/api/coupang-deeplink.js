/**
 * POST /api/coupang-deeplink — 쿠팡 검색 URL·상품 URL을 쿠팡 파트너스 링크로 일괄 변환 (관리자: 헤더 X-Admin-Key)
 * body: { "qs": ["검색어1", "검색어2", ...] }  → 검색 결과 링크 (결과 키 = 검색어)
 *       { "items": [{ "k": "@검색어", "url": "https://www.coupang.com/vp/products/123" }, ...] } → 상품 링크 (결과 키 = k)
 * 한 번에 최대 60개
 * 필요 환경변수: COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY (쿠팡 파트너스 최종 승인 후 발급), 선택: COUPANG_SUB_ID
 * 변환 결과는 저장하지 않고 돌려줍니다. 관리자 화면이 확인 후 /api/aff-links 로 저장합니다.
 */
const json = (b, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
const DOMAIN = 'https://api-gateway.coupang.com';
const PATH = '/v2/providers/affiliate_open_api/apis/openapi/v1/deeplink';
const enc = new TextEncoder();

async function hmacHex(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function signedDate() {
  const d = new Date(); const p = (n) => String(n).padStart(2, '0');
  return String(d.getUTCFullYear()).slice(2) + p(d.getUTCMonth() + 1) + p(d.getUTCDate()) + 'T' + p(d.getUTCHours()) + p(d.getUTCMinutes()) + p(d.getUTCSeconds()) + 'Z';
}
const searchUrl = (q) => 'https://www.coupang.com/np/search?q=' + encodeURIComponent(q);

export async function onRequestPost({ request, env }) {
  if (!env.ADMIN_KEY || (request.headers.get('X-Admin-Key') || '') !== env.ADMIN_KEY) return json({ ok: false, error: 'forbidden' }, 403);
  if (!env.COUPANG_ACCESS_KEY || !env.COUPANG_SECRET_KEY) return json({ ok: false, error: 'no-keys', message: '쿠팡 파트너스 API 키(COUPANG_ACCESS_KEY, COUPANG_SECRET_KEY)가 환경변수에 없습니다.' }, 400);
  let body;
  try { body = await request.json(); } catch { return json({ ok: false, error: 'invalid-json' }, 400); }
  const jobs = [];
  for (const q of new Set((body.qs || []).map((q) => String(q).replace(/\s+/g, ' ').trim()).filter(Boolean))) jobs.push({ k: q, url: searchUrl(q) });
  for (const it of (Array.isArray(body.items) ? body.items : [])) {
    const k = String((it && it.k) || '').replace(/\s+/g, ' ').trim(); const u = String((it && it.url) || '');
    if (k && /^https:\/\/(www\.|m\.)?coupang\.com\/vp\/products\/\d+/.test(u)) jobs.push({ k, url: u });
  }
  jobs.splice(60);
  if (!jobs.length) return json({ ok: false, error: 'no-qs' }, 400);

  const results = {}; const failed = []; const messages = [];
  for (let i = 0; i < jobs.length; i += 20) {
    const chunk = jobs.slice(i, i + 20).map((j) => j.k);
    const urls = jobs.slice(i, i + 20).map((j) => j.url);
    const dt = signedDate();
    const signature = await hmacHex(env.COUPANG_SECRET_KEY, dt + 'POST' + PATH);
    const auth = `CEA algorithm=HmacSHA256, access-key=${env.COUPANG_ACCESS_KEY}, signed-date=${dt}, signature=${signature}`;
    const payload = { coupangUrls: urls };
    if (env.COUPANG_SUB_ID) payload.subId = env.COUPANG_SUB_ID;
    try {
      const r = await fetch(DOMAIN + PATH, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json;charset=UTF-8' }, body: JSON.stringify(payload) });
      const j = await r.json().catch(() => ({}));
      const data = Array.isArray(j.data) ? j.data : [];
      if (!r.ok || String(j.rCode) !== '0') messages.push(`응답 ${r.status} ${j.rCode || ''} ${j.rMessage || j.message || ''}`.trim());
      chunk.forEach((q, idx) => {
        let hit = data[idx] && data.length === chunk.length ? data[idx] : null;
        if (!hit) hit = data.find((d) => { try { return decodeURIComponent(d.originalUrl || '') === decodeURIComponent(urls[idx]); } catch { return false; } });
        if (hit && hit.shortenUrl) results[q] = hit.shortenUrl; else failed.push(q);
      });
    } catch (e) {
      messages.push(String(e.message || e).slice(0, 160));
      failed.push(...chunk);
    }
  }
  return json({ ok: Object.keys(results).length > 0, results, failed, messages });
}
