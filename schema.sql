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
