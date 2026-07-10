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

const routeMethod = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE)\b/g;
const persistenceSignals = [
  /\bupsert[A-Z]\w*\s*\(/,
  /\bpromoteHunterCandidate\s*\(/,
  /\brejectHunterCandidate\s*\(/,
  /\bsetCreatorWatchStatus\s*\(/,
  /\brunHunter\s*\(/,
  /\bsave[A-Z]\w*\s*\(/,
  /\bdelete[A-Z]\w*\s*\(/,
  /\bupdate[A-Z]\w*\s*\(/,
];
const strictAdminSignals = [/requireAdminStrict\s*\(/, /isValidAdminToken\s*\(/];

function handlerBody(content, startIndex) {
  const open = content.indexOf("{", startIndex);
  if (open < 0) return "";
  let depth = 0;
  let quote = "";
  let escaped = false;
  let lineComment = false;
  let blockComment = false;

  for (let index = open; index < content.length; index += 1) {
    const char = content[index];
    const next = content[index + 1] ?? "";

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }
    if (blockComment) {
      if (char === "*" && next === "/") {
        blockComment = false;
        index += 1;
      }
      continue;
    }
    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === "/" && next === "/") {
      lineComment = true;
      index += 1;
      continue;
    }
    if (char === "/" && next === "*") {
      blockComment = true;
      index += 1;
      continue;
    }
    if (char === "\"" || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return content.slice(open, index + 1);
    }
  }
  return content.slice(open);
}

async function auditRoutes() {
  const apiRoot = path.join(ROOT, "src", "app", "api");
  const routes = (await walk(apiRoot)).filter((file) => file.endsWith("route.ts"));

  for (const file of routes) {
    const content = await readFile(file, "utf8");
    const relative = path.relative(ROOT, file);
    const cronRoute = relative.includes(`${path.sep}api${path.sep}cron${path.sep}`);
    const publicHunterRun = relative.endsWith(`src${path.sep}app${path.sep}api${path.sep}hunter${path.sep}run${path.sep}route.ts`);
    const matches = [...content.matchAll(routeMethod)];

    for (const match of matches) {
      const method = match[1];
      const body = handlerBody(content, match.index ?? 0);
      const persists = persistenceSignals.some((pattern) => pattern.test(body));
      if (!persists) continue;

      const strictAdmin = strictAdminSignals.some((pattern) => pattern.test(body));
      const strictCron = /requireCronStrict\s*\(/.test(body);
      const failOpenGuard = /requireAdmin\s*\(/.test(body);

      if (cronRoute) {
        if (method !== "GET") add("WARN", "Cron-Methode", `${relative} nutzt ${method} statt GET`, relative);
        if (!strictCron) add("FAIL", "Cron-Route fail-closed", `${relative} ${method} ohne requireCronStrict`, relative);
        else add("PASS", "Cron-Route fail-closed", `${relative} · ${method}`, relative);
        continue;
      }

      if (publicHunterRun && method === "POST") {
        const rateLimited = /rateLimit\s*\(/.test(body);
        const budgetCapped = /HUNTER_DAILY_BUDGET_EUR/.test(content);
        if (rateLimited && budgetCapped) add("PASS", "Öffentlicher Kostenpfad begrenzt", `${relative} · Rate-Limit + Budget-Cap`, relative);
        else add("FAIL", "Öffentlicher Kostenpfad begrenzt", `${relative} benötigt Rate-Limit und Budget-Cap`, relative);
        continue;
      }

      if (method === "GET") {
        add("FAIL", "GET bleibt frei von Seiteneffekten", `${relative} persistiert Daten über GET`, relative);
      }
      if (failOpenGuard) {
        add("FAIL", "Persistierende Route nutzt keinen fail-open Guard", `${relative} ${method} verwendet requireAdmin statt requireAdminStrict`, relative);
      }
      if (!strictAdmin) {
        add("FAIL", "Persistierender Schreibpfad streng geschützt", `${relative} ${method} ohne erkannten strikten Auth-Guard`, relative);
      } else if (method !== "GET" && !failOpenGuard) {
        add("PASS", "Persistierender Schreibpfad streng geschützt", `${relative} · ${method}`, relative);
      }
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
