/**
 * GET /api/leads-export?key=관리키
 * 접수된 리드를 CSV로 내려받습니다. (관리자용 — 환경변수 ADMIN_KEY 필요)
 * Cloudflare Pages → Settings → Environment variables 에 ADMIN_KEY 를 설정하세요.
 */
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key') || '';
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response('Forbidden', { status: 403 });
  if (!env.DB) return new Response('DB not bound', { status: 503 });
  const { results } = await env.DB.prepare('SELECT id, created_at, service, kind, name, phone, email, region, message, page, payload FROM leads ORDER BY id DESC LIMIT 2000').all();
  const esc = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
  const head = ['id', 'created_at', 'service', 'kind', 'name', 'phone', 'email', 'region', 'message', 'page', 'payload'];
  const lines = [head.join(',')].concat(results.map(r => head.map(h => esc(r[h])).join(',')));
  return new Response('\uFEFF' + lines.join('\n'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="leads.csv"' } });
}
