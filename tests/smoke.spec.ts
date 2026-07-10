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

async function stubStudioApis(page: import("@playwright/test").Page, claims = [reviewClaim]) {
  await page.route("**/api/claims", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: { configured: true, claims } });
    }
    return route.fulfill({ json: { ok: true } });
  });

  await page.route("**/api/creators", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: { configured: false, creators: [] } });
    }
    return route.fulfill({ json: { ok: true } });
  });

  await page.route("**/api/science", (route) =>
    route.fulfill({ json: { configured: false, items: [] } })
  );

  await page.route("**/api/pack", (route) =>
    route.fulfill({
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
    })
  );

  await page.route("**/api/hunter", (route) => {
    if (!route.request().url().endsWith("/api/hunter")) return route.fallback();
    return route.fulfill({
      json: {
        configured: true,
        profiles: [
          {
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
          },
        ],
        candidates: [],
        runs: [],
      },
    });
  });

  await page.route("**/api/hunter/creators/**", (route) =>
    route.fulfill({ json: { ok: true } })
  );
}

function trackHydrationErrors(page: import("@playwright/test").Page) {
  const messages: string[] = [];
  page.on("console", (message) => {
    const text = message.text();
    if (
      message.type() === "error" &&
      /hydration|hydrating|server rendered html|text content does not match|did not match/i.test(text)
    ) {
      messages.push(text);
    }
  });
  page.on("pageerror", (error) => {
    const text = error.message;
    if (/hydration|hydrating|server rendered html|text content does not match|did not match/i.test(text)) {
      messages.push(text);
    }
  });
  return messages;
}

test.beforeEach(async ({ page }) => {
  await stubStudioApis(page);
});

test("public showcase page links to the main modules", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: /Claim Review Studio/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Studio: 16 geprüfte Cases/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Intake \/ Jäger starten/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /E-Book öffnen/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /Status & Ehrlichkeit/ })).toBeVisible();
});

test("studio cockpit renders without hydration crash", async ({ page }) => {
  const hydrationErrors = trackHydrationErrors(page);
  await page.goto("/studio");

  await expect(page.getByRole("heading", { name: "Chris Fact Radar" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Brief exportieren/ })).toBeVisible();
  await expect(page.getByLabel("Radar-Steuerung").getByRole("button", { name: "Intake starten" })).toBeVisible();
  // Start-View ist der Secretary-Chat; das Cockpit liegt hinter dem Sidebar-Eintrag
  await expect(page.getByRole("region", { name: "Secretary" })).toBeVisible();
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("button", { name: "Cockpit", exact: true }).click();
  await expect(page.getByRole("region", { name: "Heute" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("button", { name: "Vollprüfung", exact: true })).toBeVisible();
  expect(hydrationErrors, hydrationErrors.join("\n")).toEqual([]);
});

test("studio navigation opens the core tabs", async ({ page }) => {
  await page.goto("/studio");
  const nav = page.getByRole("navigation", { name: "Hauptnavigation" });

  await nav.getByRole("button", { name: "Vollprüfung", exact: true }).click();
  await expect(page.getByRole("region", { name: "Aussagen-Posteingang" })).toBeVisible();

  await nav.getByRole("button", { name: "Akte" }).click();
  await expect(page.getByRole("region", { name: "Creator-Akten" })).toBeVisible();

  await nav.getByRole("button", { name: /Science/ }).click();
  await expect(page.getByRole("heading", { name: "Wissenschafts-Brief" })).toBeVisible();

  await nav.getByRole("button", { name: "Jäger", exact: true }).click();
  await expect(page.getByRole("region", { name: "Claim-Radar Command Center" })).toBeVisible();
});

test("settings panel opens and closes from the integrated settings button", async ({ page }) => {
  await page.goto("/studio");

  await page.getByRole("button", { name: "Einstellungen", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Einstellungen" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("heading", { name: "Einstellungen" })).toBeVisible();
  await expect(dialog.getByLabel("Mindest-Views")).toBeVisible();
  await dialog.getByRole("button", { name: "Einstellungen schließen" }).click();
  await expect(dialog).not.toBeVisible();
});

test("content pack modal opens from the cockpit", async ({ page }) => {
  await page.goto("/studio");

  await page.getByRole("button", { name: "Cockpit", exact: true }).click();
  const cockpit = page.getByRole("region", { name: "Heute" });
  await expect(cockpit).toBeVisible();
  await cockpit.getByRole("button", { name: "Content-Paket öffnen" }).click();
  const modal = page.getByRole("dialog", { name: "Content-Paket" });
  await expect(modal).toBeVisible({ timeout: 8000 });
  await expect(modal.getByRole("heading", { name: /Content-Paket/ })).toBeVisible();
  await modal.getByRole("button", { name: "Content-Paket schließen" }).click();
  await expect(modal).not.toBeVisible();
});

test("lead magnet check produces a result", async ({ page }) => {
  await page.goto("/lead-magnets/anti-heisshunger/check");

  await page.getByRole("button", { name: "abends" }).click();
  await page.getByRole("button", { name: "Stress", exact: true }).click();
  await page.getByPlaceholder(/Schokolade/).fill("Schokolade, Kekse");
  await page.getByRole("button", { name: "Schuldgefühl" }).click();
  await page.getByRole("button", { name: "unter 20 g" }).click();
  await page.getByRole("button", { name: "Coaching" }).click();

  await expect(page.getByRole("heading", { name: "Hoher Handlungsdruck" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Auswertung kopieren" })).toBeEnabled();
});

test("health endpoint exposes safe MVP readiness metadata", async ({ request }) => {
  const response = await request.get("/api/health");
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body).toMatchObject({
    ok: true,
    app: "chris-fact-radar",
    status: "mvp-ready",
  });
  expect(body.checks).toEqual(expect.objectContaining({
    supabaseConfigured: expect.any(Boolean),
    llmConfigured: expect.any(Boolean),
    apifyConfigured: expect.any(Boolean),
    adminAuthConfigured: expect.any(Boolean),
  }));
  expect(body.providers).toEqual(expect.objectContaining({
    llm: expect.any(String),
    socialIntake: expect.any(String),
    videoSourcePolicy: "apify-manual-source-urls",
  }));
});

test("admin diagnostics endpoint exposes safe runtime checks", async ({ request }) => {
  const response = await request.get("/api/admin/diagnostics");
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body).toMatchObject({
    ok: true,
    app: "chris-fact-radar",
    status: "diagnostics-ready",
  });
  expect(body.checks).toEqual(expect.objectContaining({
    supabaseConfigured: expect.any(Boolean),
    llmConfigured: expect.any(Boolean),
    apifyConfigured: expect.any(Boolean),
    adminAuthConfigured: expect.any(Boolean),
  }));
  expect(body.providers).toEqual(expect.objectContaining({
    llm: expect.any(String),
    socialIntake: expect.any(String),
    videoSourcePolicy: "apify-manual-source-urls",
  }));
  const serialized = JSON.stringify(body);
  expect(serialized).not.toMatch(/sk-[A-Za-z0-9_-]{12,}/);
  expect(serialized).not.toMatch(/Bearer\s+[A-Za-z0-9._-]{12,}/i);
});

test("chat API returns an honest fallback without provider keys", async ({ request }) => {
  const response = await request.post("/api/chat", {
    headers: { "x-force-fallback": "1" },
    data: {
      message: "Fehleranalyse starten",
      context: {
        claims: [],
        hunterCandidates: [],
        hunterRuns: [],
        health: { supabaseConfigured: false, llmConfigured: false, apifyConfigured: false },
        intakeBrief: {
          goal: "TikTok, Instagram und YouTube über Apify prüfen",
          platforms: { YouTube: true, TikTok: true, Instagram: true },
          minViews: 10000,
          mustInclude: "sprechender Creator",
          avoid: "Promo",
        },
      },
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body).toEqual(expect.objectContaining({
    ok: true,
    source: "fallback",
    status: expect.any(String),
  }));
  expect(body.reply).toContain("Supabase");
});

test("content pack API returns deterministic fallback without provider keys", async ({ request }) => {
  const response = await request.post("/api/pack", {
    headers: { "x-force-fallback": "1" },
    data: {
      style: "sachlich",
      item: {
        id: "api-pack-test",
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
          id: "video-api-pack-test",
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
      },
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.source).toBe("fallback");
  expect(body.pack).toEqual(expect.objectContaining({
    hooks: expect.any(Array),
    shortScript: expect.any(String),
    longScript: expect.any(String),
    titles: expect.any(Array),
    description: expect.any(String),
    hashtags: expect.any(Array),
    communityPost: expect.any(String),
    thumbnailTexts: expect.any(Array),
  }));
});

test("content pack API rejects invalid payloads", async ({ request }) => {
  const response = await request.post("/api/pack", { data: { item: null } });
  expect(response.status()).toBe(400);
  await expect(response.json()).resolves.toEqual(expect.objectContaining({ error: "Missing or invalid item" }));
});

test("debate seed API exposes canonical direct YouTube timestamps", async ({ request }) => {
  const expected: Record<string, string> = {
    "debate-001": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=139s",
    "debate-002": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=253s",
    "debate-003": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=785s",
    "debate-004": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1203s",
    "debate-005": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1307s",
    "debate-006": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1800s",
    "debate-007": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=7336s",
    "debate-008": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=6092s",
  };

  const response = await request.get("/api/admin/seed-debate-cases?confirm=seed-debate-cases");
  expect(response.ok()).toBeTruthy();
  const body = await response.json();

  for (const claim of body.claims) {
    const url = claim.sourceVideo.url as string;
    expect(url).toBe(expected[claim.id as string]);
    expect(url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=zO3ZPZKRkBM/);
    expect(url).not.toContain("/results");
    expect(url).not.toContain("search_query");
  }
});

test("debate rebuttal YouTube URL embeds independent of platform label", async ({ page }) => {
  await stubStudioApis(page, [debateClaim]);
  await page.goto("/studio");
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("button", { name: "Vollprüfung", exact: true }).click();
  await expect(page.getByRole("region", { name: "Aussagen-Posteingang" })).toBeVisible();

  await page.getByRole("button", { name: /Video starten: Streit eskaliert komplett/ }).first().click();
  const iframe = page.locator("iframe").first();
  await expect(iframe).toBeVisible();
  await expect(iframe).toHaveAttribute("src", /\/embed\/zO3ZPZKRkBM/);
  await expect(iframe).toHaveAttribute("src", /start=1203/);
  await expect(iframe).toHaveAttribute("src", /autoplay=1/);

  await expect(page.getByRole("link", { name: /Quelle öffnen/ })).toHaveAttribute("href", "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1203s");
  await expect(page.locator("body")).not.toContainText("youtube.com/results");
});

test("non-embeddable web source opens as a real source link", async ({ page }) => {
  await stubStudioApis(page, [webClaim]);
  await page.goto("/studio");
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("button", { name: "Vollprüfung", exact: true }).click();

  await expect(page.getByRole("button", { name: /Quelle ansehen/ })).toBeEnabled();
  await expect(page.getByRole("link", { name: /Quelle öffnen/ })).toHaveAttribute("href", "https://example.com/source");
});

test("old localStorage YouTube search URL cannot override server debate URL", async ({ page }) => {
  await stubStudioApis(page, [debateClaim]);
  await page.addInitScript((claim) => {
    window.localStorage.setItem("chris-fact-radar.items.v1", JSON.stringify([claim]));
  }, oldDebateClaim);

  await page.goto("/studio");
  await page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("button", { name: "Vollprüfung", exact: true }).click();
  await expect(page.locator("body")).not.toContainText("youtube.com/results");

  await page.getByRole("button", { name: /Video starten: Streit eskaliert komplett/ }).first().click();
  const iframe = page.locator("iframe").first();
  await expect(iframe).toBeVisible();
  await expect(iframe).toHaveAttribute("src", /\/embed\/zO3ZPZKRkBM/);
  await expect(iframe).toHaveAttribute("src", /start=1203/);
});
