import { SELF, env } from "cloudflare:test";
import { describe, it, expect } from "vitest";

describe("routes", () => {
  it("serves /llms.txt as plain text", async () => {
    const res = await SELF.fetch("https://agentmenu.dev/llms.txt");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/plain");
    expect(await res.text()).toContain("agentmenu");
  });

  it("404s unknown paths politely", async () => {
    const res = await SELF.fetch("https://agentmenu.dev/nope");
    expect(res.status).toBe(404);
  });

  it("serves catalog.json and counts an agent hit", async () => {
    const res = await SELF.fetch("https://agentmenu.dev/catalog.json", {
      headers: { "user-agent": "my-agent/1.0", accept: "application/json" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { schema_version: string };
    expect(body.schema_version).toBe("1");
    const hits = await env.DB.prepare("SELECT COUNT(*) AS n FROM agent_hits WHERE is_agent = 1").first<{ n: number }>();
    expect(hits!.n).toBeGreaterThanOrEqual(1);
  });

  it("does not count our own probe UA", async () => {
    const before = (await env.DB.prepare("SELECT COUNT(*) AS n FROM agent_hits").first<{ n: number }>())!.n;
    await SELF.fetch("https://agentmenu.dev/catalog.json", {
      headers: { "user-agent": "agentmenu-probe (+https://agentmenu.rei-uesugi.workers.dev)" },
    });
    const after = (await env.DB.prepare("SELECT COUNT(*) AS n FROM agent_hits").first<{ n: number }>())!.n;
    expect(after).toBe(before);
  });

  it("serves the human page", async () => {
    const res = await SELF.fetch("https://agentmenu.dev/");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    expect(await res.text()).toContain("agentmenu");
  });
});
