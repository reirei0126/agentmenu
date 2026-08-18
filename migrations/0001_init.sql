CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL);

CREATE TABLE services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  protocol TEXT NOT NULL DEFAULT 'x402',
  network TEXT,
  price_amount TEXT,
  price_currency TEXT,
  usd_per_call REAL,
  category TEXT NOT NULL DEFAULT 'other',
  description TEXT,
  source TEXT NOT NULL,
  first_seen TEXT NOT NULL,
  last_seen TEXT NOT NULL
);

CREATE TABLE probes (
  service_id TEXT NOT NULL,
  at TEXT NOT NULL,
  ok INTEGER NOT NULL,
  status INTEGER,
  latency_ms INTEGER
);
CREATE INDEX idx_probes_service_at ON probes(service_id, at);

CREATE TABLE robots (
  host TEXT PRIMARY KEY,
  fetched_at TEXT NOT NULL,
  disallow TEXT NOT NULL DEFAULT '[]'
);

CREATE TABLE agent_hits (
  at TEXT NOT NULL,
  path TEXT NOT NULL,
  is_agent INTEGER NOT NULL,
  ua TEXT
);
