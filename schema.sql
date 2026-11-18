-- 스스로연구소 D1 스키마
-- 적용: Cloudflare 대시보드 → Workers & Pages → D1 → 데이터베이스 → Console 에 붙여넣기
--   또는: npx wrangler d1 execute seuseuro-db --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS leads (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
  service     TEXT    NOT NULL DEFAULT 'contact',   -- sigongso / wonsang / changup / gonggan / class / partner / estimate / contact
  kind        TEXT,                                 -- diagnosis-report 등 세부 유형
  name        TEXT    NOT NULL,
  phone       TEXT    NOT NULL,
  email       TEXT    NOT NULL,
  region      TEXT,
  message     TEXT,
  page        TEXT,
  ua          TEXT,
  ip          TEXT,
  payload     TEXT,                                 -- JSON: 진단 답변·결과, 리포트 종류, 업종, 면적 등
  status      TEXT    NOT NULL DEFAULT 'new',       -- new / contacted / quoted / closed
  note        TEXT
);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_service ON leads(service);
CREATE INDEX IF NOT EXISTS idx_leads_status  ON leads(status);

-- ── 스스로몰 (함수가 처음 호출될 때 자동으로 만들어지므로 따로 실행하지 않아도 됩니다) ──
CREATE TABLE IF NOT EXISTS aff_links (
  k           TEXT PRIMARY KEY,                     -- '판매처:검색어'  예) coupang:비접착식 데코타일
  url         TEXT NOT NULL,                        -- 제휴 링크  예) https://link.coupang.com/a/xxxx
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS aff_clicks (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  k           TEXT NOT NULL,                        -- 누른 링크 키
  aff         INTEGER NOT NULL DEFAULT 0,           -- 제휴 링크였는지
  pid         TEXT,
  page        TEXT,                                 -- 개인 식별 정보는 저장하지 않음
  sid         TEXT                                  -- 탭 세션 값 (방문 통계와 이어 클릭률 계산). 예전 표에는 함수가 자동으로 추가
);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_created ON aff_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_k ON aff_clicks(k);

-- ── 방문 통계·KPI (함수가 처음 호출될 때 자동으로 만들어집니다. 관리 화면 KPI 탭에서 봅니다) ──
-- 이름·연락처·IP 주소·쿠키는 저장하지 않습니다. 자세한 방식은 functions/_lib/stats.js 첫머리 참고
CREATE TABLE IF NOT EXISTS pv (                     -- 페이지 보기
  id    TEXT PRIMARY KEY,                           -- 페이지 보기 값 (무작위)
  ts    TEXT NOT NULL DEFAULT (datetime('now')),    -- UTC
  day   TEXT NOT NULL,                              -- 한국 날짜 YYYY-MM-DD
  path  TEXT NOT NULL,                              -- /mall, /kit-paint …
  vid   TEXT,                                       -- 일별 익명 방문자 값 (그날의 무작위 값+IP+브라우저 정보의 해시. 무작위 값은 이틀 뒤 삭제)
  sid   TEXT,                                       -- 탭 세션 값
  ns    INTEGER NOT NULL DEFAULT 0,                 -- 방문의 첫 페이지 여부
  ret   INTEGER NOT NULL DEFAULT 0,                 -- 전에 와 본 브라우저 여부
  src   TEXT,                                       -- 유입 경로 (naver, google, direct …) — 첫 페이지만
  ref   TEXT,                                       -- 들어온 사이트 주소(호스트만) — 첫 페이지만
  dev   TEXT,                                       -- m 모바일 · d PC · t 태블릿
  dur   INTEGER NOT NULL DEFAULT 0,                 -- 머문 시간(초, 최대 1800)
  scr   INTEGER NOT NULL DEFAULT 0                  -- 최대 스크롤 %
);
CREATE INDEX IF NOT EXISTS idx_pv_day ON pv(day);
CREATE INDEX IF NOT EXISTS idx_pv_sid ON pv(sid);
CREATE TABLE IF NOT EXISTS ev (                     -- 사이트 안 행동 (검색, 구매 목록 담기, 진단 완료 등)
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  ts    TEXT NOT NULL DEFAULT (datetime('now')),
  day   TEXT NOT NULL,
  sid   TEXT,
  path  TEXT,
  name  TEXT NOT NULL,                              -- search / search_none / add / add_all / kit_all / list_copy / list_share / diag_done / lead
  val   TEXT
);
CREATE INDEX IF NOT EXISTS idx_ev_day ON ev(day, name);
CREATE TABLE IF NOT EXISTS pv_salt (day TEXT PRIMARY KEY, salt TEXT NOT NULL);   -- 그날의 무작위 값 (이틀 뒤 삭제)
CREATE TABLE IF NOT EXISTS cp_reports (             -- 쿠팡 파트너스 일별 실적 (관리 화면에서 입력하거나 API로 받아 옴)
  day         TEXT PRIMARY KEY,
  clicks      INTEGER,
  orders      INTEGER,
  cancels     INTEGER,
  gmv         INTEGER,                              -- 주문 금액(원)
  commission  INTEGER,                              -- 수익(원)
  src         TEXT,                                 -- manual / csv / api
  updated_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
