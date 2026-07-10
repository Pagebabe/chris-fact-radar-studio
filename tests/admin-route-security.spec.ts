import { expect, test } from "@playwright/test";

test("debate seeder is POST-only and fail-closed", async ({ request }) => {
  const getResponse = await request.get("/api/admin/seed-debate-cases?confirm=seed-debate-cases");
  expect([404, 405]).toContain(getResponse.status());

  const postResponse = await request.post("/api/admin/seed-debate-cases?confirm=seed-debate-cases");
  expect(postResponse.status()).toBe(401);
  await expect(postResponse.json()).resolves.toEqual(expect.objectContaining({ ok: false }));
});

test("cron routes are disabled without CRON_SECRET", async ({ request }) => {
  for (const route of ["/api/cron/discover", "/api/cron/science"]) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(401);
    await expect(response.json()).resolves.toEqual(expect.objectContaining({ ok: false }));
  }
});
