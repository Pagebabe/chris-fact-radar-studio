import { expect, test } from "@playwright/test";

const reviewClaim = {
  id: "smoke-real-review-claim",
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
    id: "video-smoke-real-review-claim",
    platform: "YouTube",
    sourceMode: "live",
    url: "https://www.youtube.com/watch?v=testcase123",
    creator: "Test Creator",
    channelId: "test-channel",
    title: "Test Claim Video",
    description: "Testbeschreibung",
    publishedAt: "2026-07-04T00:00:00.000Z",
    views: 100000,
    likes: 1000,
    comments: 200,
    thumbnail: "",
    transcriptSnippet: "Zucker macht sofort süchtig und deshalb kann niemand mit Süßhunger abnehmen.",
    transcriptSource: "curated",
  },
  evidence: [],
};

const debateClaim = {
  ...reviewClaim,
  id: "debate-004",
  category: "Supplements",
  claim: "Jan Leyk stellt Sucralose wegen möglicher Veränderungen des Darmmikrobioms als problematisch dar.",
  sourceVideo: {
    ...reviewClaim.sourceVideo,
    id: "yt-zO3ZPZKRkBM",
    platform: "Debatten-Rebuttal",
    url: "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1203s",
    creator: "{ungeskriptet} by Ben",
    title: "Streit eskaliert komplett: Christian Wolf vs Jan Leyk",
    thumbnail: "https://i.ytimg.com/vi/zO3ZPZKRkBM/hqdefault.jpg",
    transcriptSnippet: "Kuratierte Stelle 00:20:03",
    transcriptSource: "curated",
  },
};

const oldDebateClaim = {
  ...debateClaim,
  sourceVideo: {
    ...debateClaim.sourceVideo,
    url: "https://www.youtube.com/results?search_query=Streit+eskaliert+komplett+Christian+Wolf+Jan+Leyk+ungeskriptet+by+Ben",
  },
};

const webClaim = {
  ...reviewClaim,
  id: "external-web-test",
  sourceVideo: {
    ...reviewClaim.sourceVideo,
    id: "web-source-test",
    platform: "Externer Web-Claim",
    url: "https://example.com/source",
    creator: "Example",
    title: "Normale Webquelle",
    thumbnail: "",
  },
};

const creator = {
  id: "creator-test",
  name: "Test Creator",
  platform: "YouTube",
  channelId: "test-channel",
  channelUrl: "https://www.youtube.com/@test",
  handle: "@test",
  avatarUrl: "",
  watched: false,
  note: "Test-Akte",
  addedAt: "2026-07-04T00:00:00.000Z",
  falschaussagenCount: 1,
  totalViews: 100000,
  damageScore: 80,
  categories: ["Heisshunger"],
  status: "suggested",
};

const candidate = {
  id: "candidate-test",
  profileId: "profile-core-nutrition",
  platform: "YouTube",
  platformId: "candidate-video",
  url: "https://www.youtube.com/watch?v=candidate123",
  creator: "Candidate Creator",
  title: "Kandidat mit klarer Aussage",
  description: "Beschreibung",
  publishedAt: "2026-07-04T00:00:00.000Z",
  views: 120000,
  likes: 1000,
  comments: 100,
  thumbnail: "",
  transcriptSnippet: "Eine ausreichend lange und konkrete gesprochene Aussage für die Vorprüfung.",
  transcriptSource: "curated",
  score: 85,
  reason: "Hohe Reichweite und klare Aussage",
  qualityReason: "Gesprochenes Wort vorhanden",
  status: "new",
  createdAt: "2026-07-04T00:00:00.000Z",
  updatedAt: "2026-07-04T00:00:00.000Z",
};

async function stubStudioApis(page: import("@playwright/test").Page, claims = [reviewClaim]) {
  await page.route("**/api/claims", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: { configured: true, claims, writable: false } });
    }
    return route.fulfill({ status: 401, json: { ok: false, error: "Unauthorized" } });
  });

  await page.route("**/api/creators", (route) => route.fulfill({ json: { configured: true, creators: [creator] } }));
  await page.route("**/api/science", (route) => route.fulfill({ json: { configured: false, items: [] } }));
  await page.route("**/api/truths", (route) => {
    if (route.request().method() === "GET") return route.fulfill({ json: { configured: true, truths: [] } });
    return route.fulfill({ status: 401, json: { ok: false, error: "Unauthorized" } });
  });

  await page.route("**/api/pack", (route) => route.fulfill({
    json: {
      source: "fallback",
      pack: {
        hooks: ["Test-Hook"],
        shortScript: "Test short script",
        longScript: "Test long script",
        titles: ["Test-Titel"],
        description: "Test-Beschreibung",
        hashtags: ["#test"],
        communityPost: "Test-Post",
        thumbnailTexts: ["TEST"],
      },
    },
  }));

  await page.route("**/api/hunter", (route) => {
    if (!route.request().url().endsWith("/api/hunter")) return route.fallback();
    return route.fulfill({
      json: {
        configured: true,
        profiles: [{
          id: "profile-core-nutrition",
          name: "Core-Ernährungsmythen",
          enabled: true,
          platforms: ["YouTube", "TikTok", "Instagram"],
          queries: ["Heißhunger Zucker", "Insulin abnehmen"],
          minViews: 50000,
          minScore: 72,
          maxCandidatesPerRun: 40,
          createdAt: "2026-07-04T00:00:00.000Z",
          updatedAt: "2026-07-04T00:00:00.000Z",
        }],
        candidates: [candidate],
        runs: [{
          id: "run-test",
          startedAt: "2026-07-04T00:00:00.000Z",
          finishedAt: "2026-07-04T00:01:00.000Z",
          ok: true,
          profilesScanned: 1,
          candidatesFound: 0,
          candidatesSaved: 0,
          promotedClaims: 0,
          suggestedCreators: 0,
          budgetUsedEur: 0,
          errors: [],
          platformCounts: {},
          discardedCandidates: 3,
          qualityPassed: 0,
          discardReasons: { Duplikat: 2, "kein Transkript": 1 },
        }],
      },
    });
  });
}

function collectPageErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await stubStudioApis(page);
});

test("public showcase links to the real modules without fixed case counts", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Claim Review Studio/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Studio: geprüfte Cases/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Intake \/ Jäger/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /E-Book öffnen/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Status & Ehrlichkeit/ })).toBeVisible();
});

test("studio core navigation renders without browser errors", async ({ page }) => {
  const errors = collectPageErrors(page);
  await page.goto("/studio");
  await expect(page.getByRole("heading", { name: "Chris Fact Radar" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Secretary" })).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  await nav.getByRole("button", { name: "Cockpit", exact: true }).click();
  await expect(page.getByRole("region", { name: "Heute" })).toBeVisible();
  await nav.getByRole("button", { name: "Vollprüfung", exact: true }).click();
  await expect(page.getByRole("region", { name: "Aussagen-Posteingang" })).toBeVisible();
  await nav.getByRole("button", { name: "Science" }).click();
  await expect(page.getByRole("heading", { name: "Wissenschafts-Brief" })).toBeVisible();
  expect(errors, errors.join("\n")).toEqual([]);
});

test("public reviewer can run intake but cannot mutate shared data", async ({ page }) => {
  await page.goto("/studio");
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });

  // /^Jäger/ statt exact: Sobald Kandidaten in der Queue liegen, hängt die
  // Badge-Zahl im Accessible Name ("Jäger 1") und ein Exact-Match findet den
  // Button nie — das war der Parallel-Suite-Flake dieses Tests.
  await nav.getByRole("button", { name: /^Jäger/ }).click();
  const hunter = page.getByRole("region", { name: "Claim-Radar Command Center" });
  await expect(hunter.getByRole("button", { name: "Live-Radar starten" })).toBeEnabled();
  await expect(hunter.getByText("Prüfansicht · Schreibschutz")).toBeVisible();
  await expect(hunter.getByRole("button", { name: /übernehmen/ })).toBeDisabled();
  await expect(hunter.getByRole("button", { name: /ablehnen/ })).toBeDisabled();
  await expect(hunter.getByText(/Schreiben in die gemeinsame Queue bleibt Admins vorbehalten/)).toBeVisible();
  await expect(hunter.getByPlaceholder("YouTube-/Social-URL")).toHaveCount(0);

  await nav.getByRole("button", { name: "Akte" }).click();
  await expect(page.getByRole("button", { name: "Watchlist gesperrt" }).first()).toBeDisabled();

  await nav.getByRole("button", { name: "Chris-Wissen" }).click();
  await expect(page.getByRole("button", { name: "Admin-Zugang erforderlich" }).first()).toBeDisabled();
  await page.getByRole("button", { name: /Manuell einpflegen/ }).click();
  await expect(page.getByRole("button", { name: "Admin-Zugang erforderlich" }).first()).toBeDisabled();
});

test("settings expose only real local behavior", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Einstellungen", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Einstellungen" });
  await expect(dialog.getByRole("heading", { name: "Lokale Studio-Einstellungen" })).toBeVisible();
  await expect(dialog.getByText(/Server-Budgets, Cron-Läufe, Plattform-Intake/)).toBeVisible();
  await expect(dialog.getByText("Max. neue Claims pro Cron-Lauf")).toHaveCount(0);
  const offensive = dialog.getByRole("button", { name: "Offensiv" });
  await offensive.click();
  await expect(offensive).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Einstellungen schließen" }).click();
  await expect(dialog).not.toBeVisible();
});

test("content pack and teleprompter are usable", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("button", { name: "Cockpit", exact: true }).click();
  await page.getByRole("region", { name: "Heute" }).getByRole("button", { name: "Content-Paket öffnen" }).click();
  const modal = page.getByRole("dialog", { name: "Content-Paket" });
  await expect(modal).toBeVisible();
  await modal.getByRole("button", { name: /Im Teleprompter öffnen/ }).click();
  await expect(page.getByRole("dialog", { name: "Teleprompter" })).toBeVisible();
});

test("lead magnet check explains local email handling and confirms copy", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: async () => undefined } });
  });
  await page.goto("/lead-magnets/anti-heisshunger/check");
  await page.getByRole("button", { name: "abends" }).click();
  await page.getByRole("button", { name: "Stress", exact: true }).click();
  await page.getByPlaceholder(/Schokolade/).fill("Schokolade, Kekse");
  await page.getByRole("button", { name: "Schuldgefühl" }).click();
  await page.getByRole("button", { name: "unter 20 g" }).click();
  await page.getByRole("button", { name: "Coaching" }).click();
  await page.getByPlaceholder("name@email.de").fill("test@example.com");
  await expect(page.getByText(/wird nicht übertragen, gespeichert oder versendet/)).toBeVisible();
  await page.getByRole("button", { name: "Auswertung kopieren" }).click();
  await expect(page.getByRole("button", { name: "Auswertung kopiert" })).toBeVisible();
});

test("public write APIs fail closed", async ({ request }) => {
  const attempts = [
    request.put("/api/claims", { data: { claims: [] } }),
    request.post("/api/manual-claim", { data: { url: "https://example.com", claim: "Eine ausreichend lange Testaussage für den geschützten Import." } }),
    request.post("/api/truths", { data: { topic: "Test", statement: "Eine ausreichend lange geschützte Position." } }),
    request.post("/api/chris-scan", { data: { transcript: "Dies ist ein ausreichend langes geprüftes Testtranskript. ".repeat(4) } }),
    request.patch("/api/hunter/candidates/candidate-test", { data: { action: "promote" } }),
    request.patch("/api/hunter/creators/creator-test", { data: { watched: true } }),
  ];
  const responses = await Promise.all(attempts);
  for (const response of responses) expect(response.status()).toBe(401);
});

test("health endpoint exposes safe live metadata", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toMatchObject({ ok: true, app: "chris-fact-radar", status: "live" });
  expect(body.checks).toEqual(expect.objectContaining({
    supabaseConfigured: expect.any(Boolean),
    llmConfigured: expect.any(Boolean),
    apifyConfigured: expect.any(Boolean),
    adminAuthConfigured: expect.any(Boolean),
  }));
  expect(JSON.stringify(body)).not.toMatch(/sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._-]{12,}/i);
});

test("chat and content pack return deterministic fallbacks without provider keys", async ({ request }) => {
  const chat = await request.post("/api/chat", {
    headers: { "x-force-fallback": "1" },
    data: { message: "Fehleranalyse starten", context: { claims: [], hunterCandidates: [], hunterRuns: [], health: { supabaseConfigured: false, llmConfigured: false, apifyConfigured: false } } },
  });
  expect(chat.ok()).toBeTruthy();
  expect(await chat.json()).toEqual(expect.objectContaining({ ok: true, source: "fallback", reply: expect.any(String) }));

  const pack = await request.post("/api/pack", { headers: { "x-force-fallback": "1" }, data: { style: "sachlich", item: reviewClaim } });
  expect(pack.ok()).toBeTruthy();
  expect(await pack.json()).toEqual(expect.objectContaining({ source: "fallback", pack: expect.any(Object) }));
});

test("debate YouTube source embeds with timestamp independent of platform label", async ({ page }) => {
  await stubStudioApis(page, [debateClaim]);
  await page.goto("/studio");
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("button", { name: "Vollprüfung", exact: true }).click();
  await page.getByRole("button", { name: /Video starten: Streit eskaliert komplett/ }).first().click();
  const iframe = page.locator("iframe").first();
  await expect(iframe).toBeVisible();
  await expect(iframe).toHaveAttribute("src", /\/embed\/zO3ZPZKRkBM/);
  await expect(iframe).toHaveAttribute("src", /start=1203/);
  await expect(iframe).toHaveAttribute("src", /autoplay=1/);
  await expect(page.getByRole("link", { name: /Quelle öffnen/ })).toHaveAttribute("href", "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1203s");
});

test("normal web source remains a direct source link", async ({ page }) => {
  await stubStudioApis(page, [webClaim]);
  await page.goto("/studio");
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("button", { name: "Vollprüfung", exact: true }).click();
  await expect(page.getByRole("button", { name: /Quelle ansehen/ })).toBeEnabled();
  await expect(page.getByRole("link", { name: /Quelle öffnen/ })).toHaveAttribute("href", "https://example.com/source");
});

test("old localStorage search URL cannot override server debate URL", async ({ page }) => {
  await stubStudioApis(page, [debateClaim]);
  await page.addInitScript((claim) => window.localStorage.setItem("chris-fact-radar.items.v1", JSON.stringify([claim])), oldDebateClaim);
  await page.goto("/studio");
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("button", { name: "Vollprüfung", exact: true }).click();
  await expect(page.locator("body")).not.toContainText("youtube.com/results");
  await page.getByRole("button", { name: /Video starten: Streit eskaliert komplett/ }).first().click();
  await expect(page.locator("iframe").first()).toHaveAttribute("src", /start=1203/);
});

test("secretary chat renders action buttons and a playable cited video", async ({ page }) => {
  await stubStudioApis(page, [debateClaim]);
  await page.route("**/api/chat", (route) =>
    route.fulfill({
      json: {
        ok: true,
        reply: "Der stärkste Fall zum Prüfen ist der Sucralose-Claim.",
        source: "system",
        actions: [{ type: "openCases", label: "Vollprüfung öffnen", claimId: debateClaim.id }],
        citedClaimIds: [debateClaim.id],
      },
    }),
  );
  await page.goto("/studio");

  // Secretary ist die Standardansicht. Frage senden.
  await page.getByPlaceholder("Frag den Secretary zu einem Treffer …").fill("Welchen Claim zuerst?");
  await page.getByRole("button", { name: "Senden" }).click();

  // Video-Thumbnail zum zitierten Claim erscheint und startet das Embed am Timestamp.
  const play = page.getByRole("button", { name: /Video starten: Streit eskaliert komplett/ });
  await expect(play).toBeVisible();
  await play.click();
  await expect(page.locator("iframe").first()).toHaveAttribute("src", /start=1203/);

  // Aktions-Button springt in die Vollprüfung.
  await page.getByRole("button", { name: "Vollprüfung öffnen" }).click();
  await expect(page.getByRole("region", { name: "Aussagen-Posteingang" })).toBeVisible();
});

test("secretary conversation survives a view switch (visual history)", async ({ page }) => {
  await stubStudioApis(page, [debateClaim]);
  await page.route("**/api/chat", (route) =>
    route.fulfill({ json: { ok: true, reply: "Merksatz-Antwort für den Verlaufstest.", source: "system", actions: [], citedClaimIds: [] } }),
  );
  await page.goto("/studio");
  await page.getByPlaceholder("Frag den Secretary zu einem Treffer …").fill("Test");
  await page.getByRole("button", { name: "Senden" }).click();
  await expect(page.getByText("Merksatz-Antwort für den Verlaufstest.")).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });
  await nav.getByRole("button", { name: "Vollprüfung", exact: true }).click();
  await nav.getByRole("button", { name: "Secretary", exact: true }).click();
  // Verlauf ist nach dem Rückwechsel noch da.
  await expect(page.getByText("Merksatz-Antwort für den Verlaufstest.")).toBeVisible();
});
