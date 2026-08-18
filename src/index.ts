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
    return new Response("Not found. The menu lives at / and /catalog.json.", { status: 404 });
  },

  async scheduled(_ctrl: ScheduledController, env: Env, _ctx: ExecutionContext): Promise<void> {
    // wired in Task 6
  },
} satisfies ExportedHandler<Env>;
