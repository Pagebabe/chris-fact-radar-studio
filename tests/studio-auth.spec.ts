import { expect, test } from "@playwright/test";

const testClaim = {
  id: "protected-api-test",
  stage: "ready",
  category: "Heisshunger",
  claim: "Zucker macht sofort süchtig und deshalb kann niemand mit Süßhunger abnehmen.",
  riskScore: 80,
  relevanceScore: 82,
  checkworthiness: 85,
  verdict: "misleading",
  confidence: 80,
  whyItMatters: "Der Claim erzeugt unnötige Angst vor einzelnen Lebensmitteln.",
  responseDraft: "Gesamtkalorien, Protein und Alltag entscheiden mehr als ein einzelnes Lebensmittel.",
  analysisSource: "fallback",
  sourceVideo: {
    id: "video-protected-api-test",
    platform: "YouTube",
    sourceMode: "live",
    url: "https://www.youtube.com/watch?v=testcase123",
    creator: "Test Creator",
    title: "Test Claim Video",
    description: "Testbeschreibung",
    publishedAt: "2026-07-04T00:00:00.000Z",
    views: 100000,
    likes: 1000,
    comments: 200,
    thumbnail: "",
    transcriptSnippet: "Zucker macht sofort süchtig und deshalb kann niemand mit Süßhunger abnehmen.",
    transcriptSource: "description",
  },
  evidence: [],
};

test.skip(!process.env.APP_ADMIN_TOKEN, "APP_ADMIN_TOKEN is required for the protected studio smoke test.");

async function stubStudioApis(page: import("@playwright/test").Page) {
  await page.route("**/api/claims", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { configured: false, claims: [] } });
    return route.fulfill({ json: { ok: true } });
  });

  await page.route("**/api/creators", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { configured: false, creators: [] } });
    return route.fulfill({ json: { ok: true } });
  });

  await page.route("**/api/science", (route) => route.fulfill({ json: { configured: false, items: [] } }));

  await page.route("**/api/pack", (route) => {
    if (route.request().headers().cookie?.includes("chris_fact_radar_admin=")) return route.fallback();
    return route.fulfill({ status: 401, json: { ok: false, error: "Unauthorized" } });
  });

  await page.route("**/api/hunter", (route) => {
    if (!route.request().url().endsWith("/api/hunter")) return route.fallback();
    return route.fulfill({
      json: {
        configured: true,
        profiles: [],
        candidates: [],
        runs: [],
      },
    });
  });

  await page.route("**/api/hunter/creators/**", (route) => route.fulfill({ json: { ok: true } }));
}

test.beforeEach(async ({ page }) => {
  await stubStudioApis(page);
});

test("protected studio requires token, accepts valid token and supports logout", async ({ page }) => {
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Admin-Zugang erforderlich" })).toBeVisible();

  const blockedPack = await page.evaluate(async (item) => {
    const response = await fetch("/api/pack", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-force-fallback": "1" },
      body: JSON.stringify({ item, style: "sachlich" }),
    });
    return response.status;
  }, testClaim);
  expect(blockedPack).toBe(401);

  const blockedLiveLlm = await page.evaluate(async () => {
    const response = await fetch("/api/llm-test?mode=live&dryRun=1");
    return response.status;
  });
  expect(blockedLiveLlm).toBe(401);

  await page.getByLabel("Admin-Token").fill("wrong-token");
  await page.getByRole("button", { name: "Studio entsperren" }).click();
  await expect(page.getByRole("alert")).toContainText("Token ungültig");
  await expect(page.getByRole("heading", { name: "Admin-Zugang erforderlich" })).toBeVisible();

  await page.getByLabel("Admin-Token").fill("test-token");
  await page.getByRole("button", { name: "Studio entsperren" }).click();

  await expect(page.getByRole("heading", { name: "Chris Fact Radar" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Studio sperren" })).toBeVisible();
  // Start-View nach Login ist der Secretary-Chat
  await expect(page.getByRole("region", { name: "Secretary" })).toBeVisible();

  const allowedPack = await page.evaluate(async (item) => {
    const response = await fetch("/api/pack", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-force-fallback": "1" },
      body: JSON.stringify({ item, style: "sachlich" }),
    });
    const body = await response.json();
    return { status: response.status, source: body.source };
  }, testClaim);
  expect(allowedPack).toEqual({ status: 200, source: "fallback" });

  const allowedLiveLlm = await page.evaluate(async () => {
    const response = await fetch("/api/llm-test?mode=live&dryRun=1");
    const body = await response.json();
    return { status: response.status, liveCall: body.liveCall, dryRun: body.dryRun };
  });
  expect(allowedLiveLlm).toEqual({ status: 200, liveCall: true, dryRun: true });

  await page.getByRole("button", { name: "Studio sperren" }).click();
  await expect(page.getByRole("heading", { name: "Admin-Zugang erforderlich" })).toBeVisible();
});
