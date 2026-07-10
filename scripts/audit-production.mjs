import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE_URL = (process.env.AUDIT_BASE_URL || "https://chris-fact-radar.vercel.app").replace(/\/$/, "");
const EXPECTED_COMMIT = (process.env.AUDIT_EXPECTED_COMMIT || "").trim();
const REPORT_DIR = process.env.AUDIT_REPORT_DIR || "artifacts";
const TIMEOUT_MS = Number(process.env.AUDIT_TIMEOUT_MS || 20_000);
const results = [];

const debateUrls = {
  "debate-001": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=139s",
  "debate-002": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=253s",
  "debate-003": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=785s",
  "debate-004": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1203s",
  "debate-005": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1307s",
  "debate-006": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=1800s",
  "debate-007": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=7336s",
  "debate-008": "https://www.youtube.com/watch?v=zO3ZPZKRkBM&t=6092s",
};

function add(status, check, detail) {
  results.push({ status, check, detail });
  const icon = status === "PASS" ? "✓" : status === "WARN" ? "!" : "✗";
  console.log(`${icon} [${status}] ${check}: ${detail}`);
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { redirect: "follow", ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function readJson(route) {
  const response = await fetchWithTimeout(`${BASE_URL}${route}`, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`${route} -> HTTP ${response.status}`);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) throw new Error(`${route} -> kein JSON (${contentType || "ohne Content-Type"})`);
  return response.json();
}

function invalidUrl(url) {
  return /youtube\.com\/results|[?&]search_query=|google\.[^/]+\/search|bing\.com\/search|localhost|127\.0\.0\.1|example\.com|via\.placeholder\.com/i.test(url);
}

function truthLooksLikeFixture(truth) {
  const haystack = [truth?.id, truth?.statement, truth?.quote, truth?.videoTitle, truth?.url].filter(Boolean).join(" ").toLowerCase();
  return /(?:^|\b)test(?:\b|$)|watch\?v=test|placeholder/.test(haystack);
}

async function auditHealth() {
  const health = await readJson("/api/health");
  if (health.ok === true && health.status === "live") add("PASS", "Health", `live · ${health.build?.commit || "Commit unbekannt"}`);
  else add("FAIL", "Health", `unerwarteter Status: ${JSON.stringify({ ok: health.ok, status: health.status })}`);

  const serialized = JSON.stringify(health);
  if (/sk-[A-Za-z0-9_-]{12,}|Bearer\s+[A-Za-z0-9._-]{12,}|service_role/i.test(serialized)) add("FAIL", "Health enthält keine Secrets", "verdächtiges Secret-Muster gefunden");
  else add("PASS", "Health enthält keine Secrets", "keine bekannten Secret-Muster");

  if (EXPECTED_COMMIT) {
    const liveCommit = String(health.build?.commit || "");
    if (liveCommit && EXPECTED_COMMIT.startsWith(liveCommit)) add("PASS", "Deploy entspricht erwartetem Commit", liveCommit);
    else add("FAIL", "Deploy entspricht erwartetem Commit", `erwartet ${EXPECTED_COMMIT.slice(0, 12)}, live ${liveCommit || "nicht gemeldet"}`);
  } else if (!health.build?.commit) {
    add("WARN", "Deploy-Identität", "Health meldet noch keine Commit-SHA; vermutlich älterer Deploy");
  }
}

async function auditClaims() {
  const payload = await readJson("/api/claims");
  const claims = Array.isArray(payload.claims) ? payload.claims : [];
  const ids = new Set();
  let failed = 0;

  for (const claim of claims) {
    if (!claim?.id || ids.has(claim.id)) {
      add("FAIL", "Claim-IDs eindeutig", `${claim?.id || "fehlende ID"}`);
      failed += 1;
    }
    ids.add(claim?.id);
    const sourceUrl = String(claim?.sourceVideo?.url || "");
    if (!sourceUrl || invalidUrl(sourceUrl)) {
      add("FAIL", "Claim-Quelle direkt und produktiv", `${claim?.id}: ${sourceUrl || "fehlend"}`);
      failed += 1;
    }
  }

  for (const [id, expected] of Object.entries(debateUrls)) {
    const claim = claims.find((item) => item.id === id);
    if (!claim) {
      add("FAIL", "Debattenfall vorhanden", `${id} fehlt`);
      failed += 1;
    } else if (claim.sourceVideo?.url !== expected) {
      add("FAIL", "Debatten-Zeitstempel kanonisch", `${id}: ${claim.sourceVideo?.url}`);
      failed += 1;
    }
  }

  if (failed === 0) add("PASS", "Claims-Daten", `${claims.length} öffentliche Claims ohne kritische URL-/ID-Fehler`);
  if (payload.writable === true) add("FAIL", "Öffentliche Claims-API schreibgeschützt", "writable=true ohne Admin-Kontext");
  else add("PASS", "Öffentliche Claims-API schreibgeschützt", "writable=false");
}

async function auditTruths() {
  const payload = await readJson("/api/truths");
  const truths = Array.isArray(payload.truths) ? payload.truths : [];
  const fixtures = truths.filter(truthLooksLikeFixture);
  const badUrls = truths.filter((truth) => truth?.url && invalidUrl(String(truth.url)));

  if (fixtures.length) add("FAIL", "Chris-Wissen ohne Testfixtures", fixtures.map((truth) => truth.id || truth.videoTitle || "unbekannt").join(", "));
  else add("PASS", "Chris-Wissen ohne Testfixtures", `${truths.length} öffentliche Positionen geprüft`);

  if (badUrls.length) add("FAIL", "Chris-Wissen mit direkten Quellen", badUrls.map((truth) => `${truth.id}: ${truth.url}`).join(" · "));
  else add("PASS", "Chris-Wissen mit direkten Quellen", "keine Such-/Placeholder-URLs");
}

async function auditPagesAndPdf() {
  for (const route of ["/", "/studio", "/status", "/lead-magnets/anti-heisshunger", "/lead-magnets/anti-heisshunger/check", "/application-brief"]) {
    const response = await fetchWithTimeout(`${BASE_URL}${route}`);
    if (!response.ok) add("FAIL", "Öffentliche Seite erreichbar", `${route} -> ${response.status}`);
    else add("PASS", "Öffentliche Seite erreichbar", route);
  }

  const pdf = await fetchWithTimeout(`${BASE_URL}/anti-heisshunger-system.pdf`);
  const type = pdf.headers.get("content-type") || "";
  if (pdf.ok && type.includes("application/pdf")) add("PASS", "E-Book PDF", `${pdf.status} · ${type}`);
  else add("FAIL", "E-Book PDF", `${pdf.status} · ${type || "kein Content-Type"}`);
}

async function auditFailClosedWrites() {
  const probes = [
    ["PUT", "/api/claims", { claims: null }],
    ["POST", "/api/manual-claim", {}],
    ["POST", "/api/truths", {}],
    ["POST", "/api/chris-scan", {}],
    ["POST", "/api/admin/seed-debate-cases", {}],
    ["POST", "/api/admin/fix-debate-urls", {}],
  ];

  for (const [method, route, body] of probes) {
    const response = await fetchWithTimeout(`${BASE_URL}${route}`, {
      method,
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (response.status === 401) add("PASS", "Öffentlicher Schreibpfad fail-closed", `${method} ${route}`);
    else add("FAIL", "Öffentlicher Schreibpfad fail-closed", `${method} ${route} -> ${response.status}`);
  }
}

async function writeReport() {
  const failures = results.filter((item) => item.status === "FAIL");
  const warnings = results.filter((item) => item.status === "WARN");
  const report = {
    audit: "production",
    baseUrl: BASE_URL,
    expectedCommit: EXPECTED_COMMIT || null,
    generatedAt: new Date().toISOString(),
    status: failures.length ? "FAIL" : "PASS",
    summary: { passed: results.filter((item) => item.status === "PASS").length, warnings: warnings.length, failed: failures.length },
    results,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(path.join(REPORT_DIR, "production-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(path.join(REPORT_DIR, "production-audit.md"), [
    "# Production Audit",
    "",
    `- URL: ${BASE_URL}`,
    `- Status: **${report.status}**`,
    `- Erwarteter Commit: ${EXPECTED_COMMIT || "nicht gesetzt"}`,
    `- Datum: ${report.generatedAt}`,
    `- Fehler: ${failures.length}`,
    `- Warnungen: ${warnings.length}`,
    "",
    ...results.map((item) => `- **${item.status}** · ${item.check}: ${item.detail}`),
    "",
  ].join("\n"), "utf8");

  if (failures.length) process.exitCode = 1;
}

async function main() {
  try { await auditHealth(); } catch (error) { add("FAIL", "Health", error instanceof Error ? error.message : String(error)); }
  try { await auditClaims(); } catch (error) { add("FAIL", "Claims", error instanceof Error ? error.message : String(error)); }
  try { await auditTruths(); } catch (error) { add("FAIL", "Truths", error instanceof Error ? error.message : String(error)); }
  try { await auditPagesAndPdf(); } catch (error) { add("FAIL", "Seiten/PDF", error instanceof Error ? error.message : String(error)); }
  try { await auditFailClosedWrites(); } catch (error) { add("FAIL", "Schreibschutz", error instanceof Error ? error.message : String(error)); }
  await writeReport();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
