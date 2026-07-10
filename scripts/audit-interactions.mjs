import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const REPORT_DIR = path.join(ROOT, "artifacts");
const results = [];

function add(status, check, detail, file = "") {
  results.push({ status, check, detail, file });
  const icon = status === "PASS" ? "✓" : status === "WARN" ? "!" : "✗";
  console.log(`${icon} [${status}] ${check}: ${detail}`);
}

async function walk(entry) {
  const info = await stat(entry);
  if (info.isFile()) return [entry];
  const files = [];
  for (const child of await readdir(entry)) {
    if (["node_modules", ".next", ".git", "artifacts"].includes(child)) continue;
    files.push(...await walk(path.join(entry, child)));
  }
  return files;
}

const mutatingMethod = /export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/g;
const persistenceSignals = [
  /\bupsert[A-Z]\w*\s*\(/,
  /\bpromoteHunterCandidate\s*\(/,
  /\brejectHunterCandidate\s*\(/,
  /\bsetCreatorWatchStatus\s*\(/,
  /\bsave[A-Z]\w*\s*\(/,
  /\bdelete[A-Z]\w*\s*\(/,
  /\bupdate[A-Z]\w*\s*\(/,
];
const authSignals = [/requireAdminStrict\s*\(/, /requireAdmin\s*\(/, /isValidAdminToken\s*\(/, /CRON_SECRET/, /cronUnauthorized/];

async function auditRoutes() {
  const apiRoot = path.join(ROOT, "src", "app", "api");
  const routes = (await walk(apiRoot)).filter((file) => file.endsWith("route.ts"));

  for (const file of routes) {
    const content = await readFile(file, "utf8");
    const methods = [...content.matchAll(mutatingMethod)].map((match) => match[1]);
    if (methods.length === 0) continue;

    const persists = persistenceSignals.some((pattern) => pattern.test(content));
    const guarded = authSignals.some((pattern) => pattern.test(content));
    const relative = path.relative(ROOT, file);

    if (persists && !guarded) {
      add("FAIL", "Persistierender Schreibpfad geschützt", `${relative} exportiert ${methods.join(", ")} ohne erkannten Auth-Guard`, relative);
    } else if (persists && guarded) {
      add("PASS", "Persistierender Schreibpfad geschützt", `${relative} · ${methods.join(", ")}`, relative);
    }

    if (relative.endsWith("src/app/api/hunter/run/route.ts") && !/rateLimit\s*\(/.test(content)) {
      add("FAIL", "Öffentlicher Kostenpfad rate-limitiert", `${relative} hat keinen Rate-Limit-Aufruf`, relative);
    }
  }
}

async function auditClientInteractions() {
  const roots = [path.join(ROOT, "src", "components"), path.join(ROOT, "src", "app")];
  const files = [];
  for (const root of roots) files.push(...await walk(root));
  const textFiles = files.filter((file) => /\.(?:ts|tsx|js|jsx)$/.test(file));

  const forbiddenPatterns = [
    { pattern: /mode:\s*["']youtube-channel["']/, label: "Kein UI-Aufruf des deaktivierten Channel-Scans" },
    { pattern: /Max\. neue Claims pro Cron-Lauf/, label: "Keine unverdrahtete Cron-Einstellung" },
    { pattern: /Max\. LLM-Calls pro Tag/, label: "Keine unverdrahtete Provider-Limit-Einstellung" },
    { pattern: /Live-Crawler auslösen/, label: "Keine überzogene Live-Crawler-Aussage" },
  ];

  for (const file of textFiles) {
    const content = await readFile(file, "utf8");
    const relative = path.relative(ROOT, file);
    for (const rule of forbiddenPatterns) {
      if (rule.pattern.test(content)) add("FAIL", rule.label, relative, relative);
    }
  }

  const protectedUiFiles = [
    "src/components/hunter-view.tsx",
    "src/components/kartei.tsx",
    "src/components/chris-scanner.tsx",
    "src/components/truth-importer.tsx",
  ];
  for (const relative of protectedUiFiles) {
    const content = await readFile(path.join(ROOT, relative), "utf8");
    if (!/writable\?/.test(content) || !/canWrite/.test(content)) {
      add("FAIL", "UI kennt Schreibberechtigung", `${relative} prüft writable/canWrite nicht`, relative);
    } else {
      add("PASS", "UI kennt Schreibberechtigung", relative, relative);
    }
  }
}

async function writeReport() {
  const failures = results.filter((item) => item.status === "FAIL");
  const warnings = results.filter((item) => item.status === "WARN");
  const report = {
    audit: "interaction-security",
    generatedAt: new Date().toISOString(),
    status: failures.length ? "FAIL" : "PASS",
    summary: { passed: results.filter((item) => item.status === "PASS").length, warnings: warnings.length, failed: failures.length },
    results,
  };
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(path.join(REPORT_DIR, "interaction-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(path.join(REPORT_DIR, "interaction-audit.md"), [
    "# Interaction Security Audit",
    "",
    `- Status: **${report.status}**`,
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
  await auditRoutes();
  await auditClientInteractions();
  if (!results.some((item) => item.status === "FAIL")) add("PASS", "Interaktions-Audit", "Keine kritische halbtote oder ungeschützte Interaktion gefunden");
  await writeReport();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
