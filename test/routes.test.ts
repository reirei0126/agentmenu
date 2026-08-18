import { SELF } from "cloudflare:test";
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
});
