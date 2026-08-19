import { scanToServices } from "./scan";
import { upsertServices } from "./store";
import { refreshRobots, probeBatch } from "./probe";

export const ROBOTS_PER_RUN = 8;
export const PROBES_PER_RUN = 36;

async function setMeta(db: D1Database, key: string, value: string): Promise<void> {
  await db.prepare("INSERT INTO meta (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value=?2")
    .bind(key, value).run();
}

export async function runScheduled(db: D1Database, fetchFn: typeof fetch, nowIso: string) {
  let scanned = 0;
  let scanOk = true;
  try {
    const services = await scanToServices(fetchFn);
    scanned = await upsertServices(db, services, nowIso);
    await setMeta(db, "last_scan_success_at", nowIso);
  } catch (err) {
    scanOk = false;
    await setMeta(db, "last_scan_error", `${nowIso} ${err instanceof Error ? err.message : String(err)}`);
  }
  // Probes still run on last-good data even when the scan fails.
  await refreshRobots(db, fetchFn, nowIso, ROBOTS_PER_RUN);
  await probeBatch(db, fetchFn, nowIso, PROBES_PER_RUN);
  return { scanned, scanOk };
}
