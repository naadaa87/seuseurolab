/**
 * POST /api/lead
 * 문의·리포트 신청·견적 검증 신청을 D1(leads 테이블)에 저장합니다.
 * D1 바인딩 이름: DB  (Cloudflare Pages → Settings → Functions → D1 database bindings)
 * DB가 아직 연결되지 않았으면 503을 돌려주고, 프런트는 이메일 안내로 폴백합니다.
 */
let ready = false;
async function ensure(env) {
  // schema.sql을 실행하지 않았더라도 첫 접수 때 테이블을 만듭니다
  if (ready) return;
  await env.DB.prepare(`CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
    service TEXT NOT NULL DEFAULT 'contact', kind TEXT, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL,
    region TEXT, message TEXT, page TEXT, ua TEXT, ip TEXT, payload TEXT,
    status TEXT NOT NULL DEFAULT 'new', note TEXT)`).run();
  ready = true;
}

export async function onRequestPost({ request, env }) {
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });

  let data;
  try { data = await request.json(); } catch { return json({ ok: false, error: 'invalid-json' }, 400); }

  // 봇 차단(허니팟)
  if (data.website) return json({ ok: true, stored: false });

  // 최소 검증
  const name = String(data.name || '').trim().slice(0, 60);
  const phone = String(data.phone || '').replace(/[^0-9-]/g, '').slice(0, 20);
  const email = String(data.email || '').trim().toLowerCase().slice(0, 120);
  if (!name || !phone || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'missing-fields' }, 400);

  const service = String(data.service || 'contact').slice(0, 30);
  const kind = String(data.kind || '').slice(0, 30);
  const region = String(data.region || '').slice(0, 80);
  const message = String(data.message || '').slice(0, 4000);
  const page = String(data.page || '').slice(0, 200);
  const ua = String(data.ua || '').slice(0, 200);
  const ip = request.headers.get('CF-Connecting-IP') || '';

  // 나머지 필드는 payload(JSON)로 보관
  const skip = new Set(['name', 'phone', 'email', 'service', 'kind', 'region', 'message', 'page', 'ua', 'website', 'agree']);
  const payload = {};
  for (const k of Object.keys(data)) if (!skip.has(k)) payload[k] = data[k];

  if (!env.DB) return json({ ok: false, error: 'no-db' }, 503);

  try {
    await ensure(env);
    await env.DB.prepare(
      `INSERT INTO leads (service, kind, name, phone, email, region, message, page, ua, ip, payload)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
    ).bind(service, kind, name, phone, email, region, message, page, ua, ip, JSON.stringify(payload)).run();
    return json({ ok: true, stored: true });
  } catch (e) {
    return json({ ok: false, error: 'db-error', detail: String(e.message || e).slice(0, 200) }, 500);
  }
}

export async function onRequestGet() {
  return new Response('Method Not Allowed', { status: 405 });
}
