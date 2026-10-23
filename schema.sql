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
  page        TEXT                                  -- 개인 식별 정보는 저장하지 않음
);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_created ON aff_clicks(created_at);
CREATE INDEX IF NOT EXISTS idx_aff_clicks_k ON aff_clicks(k);
