import { runScheduled } from "./run";
import { buildCatalog, validateCatalog } from "./catalog";

export interface Env {
  DB: D1Database;
}

const LLMS_TXT = `# agentmenu

A machine-readable catalog of x402 paid endpoints, with normalized prices
and independently measured uptime/latency — so agents can compare before paying.

Catalog (JSON): https://agentmenu.dev/catalog.json
List your service: https://github.com/REPLACE_GH_USER/agentmenu/issues/new/choose
`;

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(req.url);
    if (pathname === "/llms.txt") {
      return new Response(LLMS_TXT, { headers: { "content-type": "text/plain; charset=utf-8" } });
    }
    if (pathname === "/catalog.json") {
      const ua = req.headers.get("user-agent") ?? "";
      if (!ua.startsWith("agentmenu-probe")) {
        const isAgent = !ua.includes("Mozilla") || (req.headers.get("accept") ?? "").includes("application/json");
        await env.DB.prepare("INSERT INTO agent_hits (at, path, is_agent, ua) VALUES (?1, ?2, ?3, ?4)")
          .bind(new Date().toISOString(), "/catalog.json", isAgent ? 1 : 0, ua.slice(0, 200)).run();
      }
      const catalog = await buildCatalog(env.DB, new Date().toISOString());
      const errs = validateCatalog(catalog);
      if (errs.length > 0) {
        return new Response(JSON.stringify({ error: "Our catalog failed its own validation — we would rather tell you than serve bad data.", details: errs }),
          { status: 500, headers: { "content-type": "application/json" } });
      }
      return new Response(JSON.stringify(catalog, null, 2), {
        headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=300" },
      });
    }
    return new Response("Not found. The menu lives at / and /catalog.json.", { status: 404 });
  },

  async scheduled(_ctrl: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(runScheduled(env.DB, fetch, new Date().toISOString()).then(() => undefined));
  },
} satisfies ExportedHandler<Env>;
