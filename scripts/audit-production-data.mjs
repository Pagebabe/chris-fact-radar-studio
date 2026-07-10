import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = (process.env.AUDIT_BASE_URL || "https://chris-fact-radar.vercel.app").replace(/\/$/, "");
const TIMEOUT_MS = Number(process.env.AUDIT_TIMEOUT_MS || 15000);
const REPORT_DIR = process.env.AUDIT_REPORT_DIR || "artifacts";

const FORBIDDEN_URL_PATTERNS = [
  /youtube\.com\/results/i,
  /[?&]search_query=/i,
  /google\.[^/]+\/search/i,
  /bing\.com\/search/i,
  /(?:^|\/)localhost(?::|\/|$)/i,
  /127\.0\.0\.1/i,
  /example\.com/i,
  /via\.placeholder\.com/i,
];

const SUSPICIOUS_URL_PATTERNS = [
  /youtube\.com\/watch\?v=test(?:&|$)/i,
  /\bplaceholder\b/i,
  /\bexample\b/i,
];

const EXPECTED_DEBATE_URLS = {
  "debate-001": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=139s",
  "debate-002": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=253s",
  "debate-003": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=785s",
  "debate-004": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1203s",
  "debate-005": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1307s",
  "debate-006": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1800s",
  "debate-007": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=7336s",
  "debate-008": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=6092s",
};

const results = [];

function add(status, check, detail, meta = {}) {
  results.push({ status, check, detail, ...meta });
  const icon = status === "PASS" ? "✓" : status === "WARN" ? "!" : "✗";
  console.log(`${icon} [${status}] ${check}: ${detail}`);
}

const fail = (check, detail, meta) => add("FAIL", check, detail, meta);
const warn = (check, detail, meta) => add("WARN", check, detail, meta);
const pass = (check, detail, meta) => add("PASS", check, detail, meta);

function currentCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function validHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (BASE_URL.startsWith("http://localhost") && url.protocol === "http:");
  } catch {
    return false;
  }
}

function isDirectYoutubeVideo(value) {
  if (!validHttpUrl(value)) return false;
  const url = new URL(value);
  const host = url.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return Boolean(url.pathname.split("/").filter(Boolean)[0]);
  if (!host.endsWith("youtube.com")) return false;
  if (url.pathname === "/watch") return Boolean(url.searchParams.get("v"));
  const [kind, id] = url.pathname.split("/").filter(Boolean);
  return ["shorts", "live", "embed"].includes(kind) && Boolean(id);
}

function checkUrl(value, context) {
  if (!value || typeof value !== "string") {
    fail("URL vorhanden", `${context}: leer oder kein String`);
    return;
  }
  if (!validHttpUrl(value)) {
    fail("URL syntaktisch gültig", `${context}: ${value}`);
    return;
  }
  for (const pattern of FORBIDDEN_URL_PATTERNS) {
    if (pattern.test(value)) fail("Keine Such-/Placeholder-URL", `${context}: ${value}`);
  }
  for (const pattern of SUSPICIOUS_URL_PATTERNS) {
    if (pattern.test(value)) warn("Verdächtige URL", `${context}: ${value}`);
  }
}

async function fetchChecked(endpoint, expectedKind) {
  const url = `${BASE_URL}${endpoint}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": "Chris-Fact-Radar-Submission-Audit/1.0" },
    });
    if (response.status < 200 || response.status >= 400) {
      fail("Endpunkt erreichbar", `${endpoint}: HTTP ${response.status}`, { endpoint, url });
      return null;
    }
    pass("Endpunkt erreichbar", `${endpoint}: HTTP ${response.status}`, { endpoint, url });
    const contentType = response.headers.get("content-type") || "";
    if (expectedKind === "json" && !contentType.includes("application/json")) {
      fail("Content-Type", `${endpoint}: erwartet JSON, erhalten ${contentType || "unbekannt"}`);
    }
    if (expectedKind === "pdf" && !contentType.includes("application/pdf")) {
      fail("Content-Type", `${endpoint}: erwartet PDF, erhalten ${contentType || "unbekannt"}`);
    }
    if (expectedKind === "html" && !contentType.includes("text/html")) {
      fail("Content-Type", `${endpoint}: erwartet HTML, erhalten ${contentType || "unbekannt"}`);
    }
    return response;
  } catch (error) {
    fail("Endpunkt erreichbar", `${endpoint}: ${error instanceof Error ? error.message : String(error)}`, { endpoint, url });
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(response, endpoint) {
  if (!response) return null;
  try {
    return await response.json();
  } catch (error) {
    fail("Gültiges JSON", `${endpoint}: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function auditClaims(payload) {
  const claims = Array.isArray(payload?.claims) ? payload.claims : null;
  if (!claims) {
    fail("Claims-Format", "`claims` ist kein Array");
    return;
  }
  if (claims.length === 0) fail("Öffentliche Claims", "keine Claims geliefert");
  else pass("Öffentliche Claims", `${claims.length} Claims geliefert`);

  const ids = new Set();
  for (const claim of claims) {
    const id = String(claim?.id || "");
    if (!id) fail("Claim-ID", "Claim ohne ID");
    else if (ids.has(id)) fail("Eindeutige Claim-ID", `doppelte ID: ${id}`);
    else ids.add(id);

    for (const [field, value] of Object.entries({
      claim: claim?.claim,
      stage: claim?.stage,
      verdict: claim?.verdict,
      category: claim?.category,
    })) {
      if (typeof value !== "string" || !value.trim()) fail("Claim-Pflichtfeld", `${id || "<ohne-id>"}.${field} fehlt`);
    }

    const sourceUrl = claim?.sourceVideo?.url;
    checkUrl(sourceUrl, `${id}.sourceVideo.url`);
    if (typeof sourceUrl === "string" && /(?:youtube\.com|youtu\.be)/i.test(sourceUrl) && !isDirectYoutubeVideo(sourceUrl)) {
      fail("Direkte YouTube-Quelle", `${id}: ${sourceUrl}`);
    }

    if (Object.hasOwn(EXPECTED_DEBATE_URLS, id)) {
      if (sourceUrl !== EXPECTED_DEBATE_URLS[id]) {
        fail("Kanonischer Debatten-Link", `${id}: erwartet ${EXPECTED_DEBATE_URLS[id]}, erhalten ${sourceUrl}`);
      } else {
        pass("Kanonischer Debatten-Link", `${id}: korrekt`);
      }
    }

    const evidence = Array.isArray(claim?.evidence) ? claim.evidence : [];
    const evidenceIds = new Set();
    for (const item of evidence) {
      const evidenceId = String(item?.id || "");
      if (!evidenceId) fail("Evidence-ID", `${id}: Evidence ohne ID`);
      else if (evidenceIds.has(evidenceId)) fail("Eindeutige Evidence-ID", `${id}: ${evidenceId}`);
      else evidenceIds.add(evidenceId);
      checkUrl(item?.url, `${id}.evidence.${evidenceId || "<ohne-id>"}.url`);
      if (typeof item?.url === "string" && /^https:\/\/(?:www\.)?(?:efsa\.europa\.eu|pubmed\.ncbi\.nlm\.nih\.gov)\/?$/i.test(item.url)) {
        warn("Unpräzise Evidence-Quelle", `${id}.${evidenceId}: nur Startseite statt konkreter Quelle`);
      }
    }
  }

  const missingDebates = Object.keys(EXPECTED_DEBATE_URLS).filter((id) => !ids.has(id));
  if (missingDebates.length > 0) fail("Debattenfälle vollständig", `fehlen: ${missingDebates.join(", ")}`);
  else pass("Debattenfälle vollständig", "debate-001 bis debate-008 vorhanden");
}

function auditTruths(payload) {
  const truths = Array.isArray(payload?.truths) ? payload.truths : null;
  if (!truths) {
    fail("Truths-Format", "`truths` ist kein Array");
    return;
  }
  pass("Chris-Wissen geladen", `${truths.length} Einträge`);
  const ids = new Set();
  for (const truth of truths) {
    const id = String(truth?.id || "");
    if (!id) fail("Truth-ID", "Eintrag ohne ID");
    else if (ids.has(id)) fail("Eindeutige Truth-ID", `doppelte ID: ${id}`);
    else ids.add(id);

    if (!String(truth?.statement || truth?.quote || "").trim()) fail("Truth-Inhalt", `${id}: Statement und Quote fehlen`);
    checkUrl(truth?.url, `${id}.url`);
    const serialized = JSON.stringify(truth);
    if (/watch\?v=test(?:["&]|$)|truth-https-youtube-com-watch-v-test/i.test(serialized)) {
      fail("Keine Testdaten im Chris-Wissen", `${id}: Testdatensatz in Produktion`);
    }
  }
}

function auditHealth(payload) {
  if (!payload || typeof payload !== "object") {
    fail("Health-Format", "kein Objekt");
    return;
  }
  if (payload.ok !== true) fail("Health OK", `ok=${String(payload.ok)}`);
  else pass("Health OK", "ok=true");
  if (!payload.checks || typeof payload.checks !== "object") fail("Health Checks", "checks fehlen");
  if (!payload.providers || typeof payload.providers !== "object") fail("Health Provider", "providers fehlen");

  const serialized = JSON.stringify(payload);
  const secretPatterns = [
    /sk-[A-Za-z0-9_-]{12,}/,
    /Bearer\s+[A-Za-z0-9._-]{12,}/i,
    /service_role/i,
    /SUPABASE_SERVICE_ROLE_KEY/i,
    /APP_ADMIN_TOKEN/i,
  ];
  for (const pattern of secretPatterns) {
    if (pattern.test(serialized)) fail("Keine Secrets im Health-Response", `Muster gefunden: ${pattern}`);
  }
}

function auditHtml(htmlByEndpoint) {
  const combined = [...htmlByEndpoint.values()].join("\n");
  const forbiddenCopy = [
    ["Opus Control Layer", /Opus Control Layer/i],
    ["feste alte Fallzahl", /20 reviewed cases across 13 sources/i],
    ["feste Studio-Fallzahl", /Studio:\s*\d+\s+geprüfte Cases/i],
    ["zu starke Crawler-Aussage", /Live-Crawler auslösen/i],
    ["feste NVIDIA-Laufzeitbehauptung", /NVIDIA-gehostet(?:es|er|e)?\s+Llama-Nemotron/i],
    ["Video-Walkthrough erscheint in Kürze", /erscheint (?:hier )?in Kürze/i],
    ["absolute Ausbau-Behauptung", /der einzige Engpass|kein weiterer Umbau nötig/i],
  ];
  for (const [label, pattern] of forbiddenCopy) {
    if (pattern.test(combined)) fail("Keine veraltete Produktbehauptung", label);
    else pass("Keine veraltete Produktbehauptung", label);
  }
}

async function main() {
  console.log(`\nChris Fact Radar Production Audit\nURL: ${BASE_URL}\n`);

  const claimsResponse = await fetchChecked("/api/claims", "json");
  const truthsResponse = await fetchChecked("/api/truths", "json");
  const healthResponse = await fetchChecked("/api/health", "json");
  const pdfResponse = await fetchChecked("/anti-heisshunger-system.pdf", "pdf");

  const htmlEndpoints = ["/", "/studio", "/status", "/lead-magnets/anti-heisshunger", "/application-brief"];
  const htmlByEndpoint = new Map();
  for (const endpoint of htmlEndpoints) {
    const response = await fetchChecked(endpoint, "html");
    if (response) htmlByEndpoint.set(endpoint, await response.text());
  }

  auditClaims(await readJson(claimsResponse, "/api/claims"));
  auditTruths(await readJson(truthsResponse, "/api/truths"));
  auditHealth(await readJson(healthResponse, "/api/health"));
  if (pdfResponse) {
    const length = Number(pdfResponse.headers.get("content-length") || 0);
    if (length > 0 && length < 100_000) fail("PDF-Dateigröße", `verdächtig klein: ${length} Bytes`);
    else pass("PDF-Dateigröße", length > 0 ? `${length} Bytes` : "Streaming-Antwort ohne Content-Length");
  }
  auditHtml(htmlByEndpoint);

  const failed = results.filter((item) => item.status === "FAIL");
  const warnings = results.filter((item) => item.status === "WARN");
  const report = {
    audit: "chris-fact-radar-production",
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    commit: currentCommit(),
    status: failed.length === 0 ? "PASS" : "FAIL",
    summary: {
      passed: results.filter((item) => item.status === "PASS").length,
      warnings: warnings.length,
      failed: failed.length,
    },
    results,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(path.join(REPORT_DIR, "production-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(REPORT_DIR, "production-audit.md"),
    [
      "# Chris Fact Radar Production Audit",
      "",
      `- Status: **${report.status}**`,
      `- Datum: ${report.generatedAt}`,
      `- Commit: \`${report.commit}\``,
      `- URL: ${report.baseUrl}`,
      `- PASS: ${report.summary.passed}`,
      `- WARN: ${report.summary.warnings}`,
      `- FAIL: ${report.summary.failed}`,
      "",
      "## Ergebnisse",
      "",
      ...results.map((item) => `- **${item.status}** · ${item.check}: ${item.detail}`),
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`\nErgebnis: ${report.status} · ${failed.length} Fehler · ${warnings.length} Warnungen`);
  if (failed.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
