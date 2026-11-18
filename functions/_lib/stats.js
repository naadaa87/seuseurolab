/**
 * 방문 통계 공통 함수 (pv.js · click.js · kpi.js · cp-report.js 에서 가져다 씁니다. 이 파일은 주소로 열리지 않습니다.)
 *
 * 개인정보를 남기지 않는 방식
 *  - IP 주소는 저장하지 않습니다. 같은 날 같은 사람을 한 번만 세려고 '그날의 무작위 값 + IP + 브라우저 정보'를
 *    한 방향 해시로 바꾼 16자리 값(vid)만 저장합니다.
 *  - 그날의 무작위 값(pv_salt)은 이틀이 지나면 지웁니다. 그 뒤에는 누구도 vid를 원래 IP로 되돌리거나
 *    다른 날의 방문과 이어 붙일 수 없습니다.
 */
export const enc = new TextEncoder();

/* 한국 시간 날짜 (YYYY-MM-DD) */
export function kstDay(ms) { return new Date((ms == null ? Date.now() : ms) + 9 * 3600e3).toISOString().slice(0, 10); }
export function addDays(day, n) { const d = new Date(day + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export function daysBetween(a, b) { return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 864e5); }
/* 한국 날짜 범위 → aff_clicks·leads 의 created_at(UTC) 비교용 경계 */
export function utcBounds(from, to) {
  const f = new Date(Date.parse(from + 'T00:00:00Z') - 9 * 3600e3);
  const t = new Date(Date.parse(addDays(to, 1) + 'T00:00:00Z') - 9 * 3600e3);
  const s = (d) => d.toISOString().slice(0, 19).replace('T', ' ');
  return [s(f), s(t)];
}
export const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

let ready = false;
export async function ensureStats(env) {
  if (ready) return;
  await env.DB.batch([
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS pv (
      id TEXT PRIMARY KEY, ts TEXT NOT NULL DEFAULT (datetime('now')), day TEXT NOT NULL, path TEXT NOT NULL,
      vid TEXT, sid TEXT, ns INTEGER NOT NULL DEFAULT 0, ret INTEGER NOT NULL DEFAULT 0,
      src TEXT, ref TEXT, dev TEXT, dur INTEGER NOT NULL DEFAULT 0, scr INTEGER NOT NULL DEFAULT 0)`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_pv_day ON pv(day)'),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_pv_sid ON pv(sid)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS ev (
      id INTEGER PRIMARY KEY AUTOINCREMENT, ts TEXT NOT NULL DEFAULT (datetime('now')), day TEXT NOT NULL,
      sid TEXT, path TEXT, name TEXT NOT NULL, val TEXT)`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_ev_day ON ev(day, name)'),
    env.DB.prepare('CREATE TABLE IF NOT EXISTS pv_salt (day TEXT PRIMARY KEY, salt TEXT NOT NULL)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS cp_reports (
      day TEXT PRIMARY KEY, clicks INTEGER, orders INTEGER, cancels INTEGER, gmv INTEGER, commission INTEGER,
      src TEXT, updated_at TEXT NOT NULL DEFAULT (datetime('now')))`),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS aff_clicks (
      id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      k TEXT NOT NULL, aff INTEGER NOT NULL DEFAULT 0, pid TEXT, page TEXT)`),
    env.DB.prepare('CREATE INDEX IF NOT EXISTS idx_aff_clicks_created ON aff_clicks(created_at)'),
    env.DB.prepare(`CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT, created_at TEXT NOT NULL DEFAULT (datetime('now')),
      service TEXT NOT NULL DEFAULT 'contact', kind TEXT, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT NOT NULL,
      region TEXT, message TEXT, page TEXT, ua TEXT, ip TEXT, payload TEXT,
      status TEXT NOT NULL DEFAULT 'new', note TEXT)`),
  ]);
  // 예전에 만든 aff_clicks 에는 세션 칸이 없으므로 한 번만 추가합니다
  const cols = await env.DB.prepare('PRAGMA table_info(aff_clicks)').all();
  if (!(cols.results || []).some((c) => c.name === 'sid')) {
    try { await env.DB.prepare('ALTER TABLE aff_clicks ADD COLUMN sid TEXT').run(); } catch (e) { /* 동시에 추가된 경우 */ }
  }
  ready = true;
}

/* 그날의 무작위 값 — 없으면 만들고, 이틀 지난 값은 지웁니다 */
let saltCache = { day: '', salt: '' };
async function daySalt(env, day) {
  if (saltCache.day === day) return saltCache.salt;
  let row = await env.DB.prepare('SELECT salt FROM pv_salt WHERE day = ?1').bind(day).first();
  if (!row) {
    const a = new Uint8Array(24); crypto.getRandomValues(a);
    const salt = [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO pv_salt (day, salt) VALUES (?1, ?2)').bind(day, salt),
      env.DB.prepare('DELETE FROM pv_salt WHERE day < ?1').bind(addDays(day, -1)),
    ]);
    row = await env.DB.prepare('SELECT salt FROM pv_salt WHERE day = ?1').bind(day).first();
  }
  saltCache = { day, salt: row.salt };
  return row.salt;
}
export async function visitorId(env, request, day) {
  const salt = await daySalt(env, day);
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
  const ua = request.headers.get('User-Agent') || '';
  const h = await crypto.subtle.digest('SHA-256', enc.encode(salt + '|' + ip + '|' + ua));
  return [...new Uint8Array(h)].slice(0, 8).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* 검색 로봇·미리보기 수집기 (방문으로 세지 않음) */
const BOT_RE = /bot\b|bot\/|crawl|spider|slurp|scrap|headless|phantom|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor|preview|facebookexternalhit|embedly|yeti|daumoa|bingpreview|petalbot|bytespider|python|curl|wget|go-http|java\/|okhttp|axios|node-fetch|postman/i;
export function isBot(ua) { return !ua || ua.length < 20 || BOT_RE.test(ua); }

/* 기기: m 모바일 · t 태블릿 · d PC */
export function devOf(ua, touchMac) {
  if (/iPad|Tablet|SM-T\d|SM-X\d|Nexus (7|9|10)|KFAPWI|Silk\//i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua))) return 't';
  if (/Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua)) return 'm';
  if (touchMac && /Macintosh/i.test(ua)) return 't'; // iPadOS 사파리는 Mac으로 보고합니다
  return 'd';
}

/* 유입 경로 키 — 관리 화면에서 한글 이름으로 바꿔 보여 줍니다. 모르는 곳은 사이트 주소(호스트)를 그대로 씁니다. */
const SRC_RULES = [
  [/(^|\.)blog\.naver\.com$/, 'naver_blog'], [/(^|\.)cafe\.naver\.com$/, 'naver_cafe'],
  [/(^|\.)(naver\.com|naver\.me)$/, 'naver'],
  [/(^|\.)google\.[a-z.]+$/, 'google'], [/(^|\.)(daum\.net|daum\.co\.kr)$/, 'daum'],
  [/(^|\.)(kakao\.com|kakaocdn\.net)$/, 'kakao'], [/(^|\.)tistory\.com$/, 'tistory'],
  [/(^|\.)(bing\.com)$/, 'bing'], [/(^|\.)(instagram\.com)$/, 'instagram'], [/(^|\.)(facebook\.com|fb\.me)$/, 'facebook'],
  [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'], [/(^|\.)threads\.(net|com)$/, 'threads'], [/(^|\.)(t\.co|x\.com|twitter\.com)$/, 'x'],
  [/(^|\.)(chatgpt\.com|openai\.com)$/, 'chatgpt'], [/(^|\.)perplexity\.ai$/, 'perplexity'], [/(^|\.)coupang\.com$/, 'coupang'],
  [/(^|\.)(zum\.com)$/, 'zum'], [/(^|\.)(duckduckgo\.com)$/, 'duckduckgo'],
];
export function sourceOf(ref, utm, ua) {
  if (utm) return utm.toLowerCase().replace(/[^a-z0-9_.\-가-힣]/g, '').slice(0, 30) || 'utm';
  const h = String(ref || '').toLowerCase();
  if (h) { for (const [re, k] of SRC_RULES) if (re.test(h)) return k; return h.slice(0, 60); }
  if (/KAKAOTALK/i.test(ua)) return 'kakaotalk';
  if (/NAVER\(inapp|NAVER\//i.test(ua)) return 'naver_app';
  if (/Instagram/i.test(ua)) return 'instagram';
  if (/FBAN|FBAV/i.test(ua)) return 'facebook';
  if (/Barcelona|Threads/i.test(ua)) return 'threads';
  return 'direct';
}

/* 페이지 경로를 한 가지 모양으로: /mall.html · /mall/ · /MALL → /mall, /index.html → / */
export function cleanPath(p) {
  p = String(p || '/').split(/[?#]/)[0].toLowerCase();
  p = p.replace(/\/index(\.html)?$/, '/').replace(/\.html$/, '');
  if (p.length > 1) p = p.replace(/\/+$/, '');
  if (!/^\/[a-z0-9\-_/]{0,60}$/.test(p)) return '/(기타)';
  return p;
}
