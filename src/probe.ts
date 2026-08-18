const PROBE_UA = "agentmenu-probe (+https://agentmenu.dev)";

export function parseRobots(txt: string): string[] {
  const out: string[] = [];
  let applies = false;
  for (const raw of txt.split("\n")) {
    const line = raw.replace(/#.*$/, "").trim();
    const [key, ...rest] = line.split(":");
    const value = rest.join(":").trim();
    if (/^user-agent$/i.test(key)) {
      applies = value === "*" || value.toLowerCase().startsWith("agentmenu");
    } else if (/^disallow$/i.test(key) && applies && value) {
      out.push(value);
    }
  }
  return out;
}

export async function refreshRobots(db: D1Database, fetchFn: typeof fetch, nowIso: string, limit: number): Promise<void> {
  const weekAgo = new Date(Date.parse(nowIso) - 7 * 86400_000).toISOString();
  const { results } = await db.prepare(
    `SELECT DISTINCT s.endpoint FROM services s
     LEFT JOIN robots r ON r.host = substr(s.endpoint, instr(s.endpoint, '//') + 2,
       instr(substr(s.endpoint, instr(s.endpoint, '//') + 2) || '/', '/') - 1)
     WHERE r.host IS NULL OR r.fetched_at < ?1 LIMIT ?2`,
  ).bind(weekAgo, limit).all();
  const hosts = [...new Set((results as { endpoint: string }[]).map((r) => new URL(r.endpoint).host))].slice(0, limit);
  for (const host of hosts) {
    let disallow: string[] = [];
    try {
      const res = await fetchFn(`https://${host}/robots.txt`, {
        headers: { "user-agent": PROBE_UA }, signal: AbortSignal.timeout(5000),
      });
      if (res.ok) disallow = parseRobots(await res.text());
    } catch { /* unreachable robots.txt = no restrictions published */ }
    await db.prepare(
      `INSERT INTO robots (host, fetched_at, disallow) VALUES (?1, ?2, ?3)
       ON CONFLICT(host) DO UPDATE SET fetched_at=?2, disallow=?3`,
    ).bind(host, nowIso, JSON.stringify(disallow)).run();
  }
}

export async function probeBatch(db: D1Database, fetchFn: typeof fetch, nowIso: string, limit: number): Promise<void> {
  const { results } = await db.prepare(
    `SELECT s.id, s.endpoint, (SELECT MAX(at) FROM probes p WHERE p.service_id = s.id) AS last_at
     FROM services s ORDER BY last_at IS NOT NULL, last_at LIMIT ?1`,
  ).bind(limit).all();

  for (const row of results as { id: string; endpoint: string }[]) {
    const url = new URL(row.endpoint);
    const robots = await db.prepare("SELECT disallow FROM robots WHERE host = ?1").bind(url.host).first<{ disallow: string }>();
    const disallow: string[] = robots ? JSON.parse(robots.disallow) : [];
    if (disallow.some((p) => url.pathname.startsWith(p))) continue;

    const started = Date.now();
    let status = 0;
    try {
      const res = await fetchFn(row.endpoint, {
        method: "GET", redirect: "manual",
        headers: { "user-agent": PROBE_UA, accept: "application/json" },
        signal: AbortSignal.timeout(10_000),
      });
      status = res.status;
    } catch { status = 0; }
    const ok = status === 402 || (status >= 200 && status < 300) ? 1 : 0;
    await db.prepare("INSERT INTO probes (service_id, at, ok, status, latency_ms) VALUES (?1, ?2, ?3, ?4, ?5)")
      .bind(row.id, nowIso, ok, status || null, Date.now() - started).run();
  }
}

export async function qualityByService(
  db: D1Database, sinceIso: string,
): Promise<Map<string, { uptime7d: number | null; latencyP50Ms: number | null; lastOkAt: string | null }>> {
  const { results } = await db.prepare(
    "SELECT service_id, at, ok, latency_ms FROM probes WHERE at >= ?1 ORDER BY service_id, latency_ms",
  ).bind(sinceIso).all();
  const map = new Map<string, { oks: number; n: number; lats: number[]; lastOkAt: string | null }>();
  for (const r of results as { service_id: string; at: string; ok: number; latency_ms: number }[]) {
    const e = map.get(r.service_id) ?? { oks: 0, n: 0, lats: [], lastOkAt: null };
    e.n++;
    if (r.ok) { e.oks++; e.lats.push(r.latency_ms); if (!e.lastOkAt || r.at > e.lastOkAt) e.lastOkAt = r.at; }
    map.set(r.service_id, e);
  }
  return new Map([...map].map(([id, e]) => [id, {
    uptime7d: e.n ? e.oks / e.n : null,
    latencyP50Ms: e.lats.length ? e.lats[Math.floor(e.lats.length / 2)] : null,
    lastOkAt: e.lastOkAt,
  }]));
}
