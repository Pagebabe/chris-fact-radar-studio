import { execFileSync } from "node:child_process";
import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const REPORT_DIR = process.env.AUDIT_REPORT_DIR || "artifacts";
const ROOTS = ["src"];
const EXTRA_FILES = ["README.md"];
const results = [];

function add(status, check, detail, meta = {}) {
  results.push({ status, check, detail, ...meta });
  const icon = status === "PASS" ? "✓" : status === "WARN" ? "!" : "✗";
  console.log(`${icon} [${status}] ${check}: ${detail}`);
}

async function walk(entry) {
  const info = await stat(entry);
  if (info.isFile()) return [entry];
  const children = await readdir(entry);
  const files = [];
  for (const child of children) {
    if (["node_modules", ".next", ".git", "artifacts"].includes(child)) continue;
    files.push(...await walk(path.join(entry, child)));
  }
  return files;
}

function lineOf(content, index) {
  return content.slice(0, index).split("\n").length;
}

function currentCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function inspect(file, content) {
  const checks = [
    {
      status: "FAIL",
      name: "Keine YouTube-Suchergebnisquelle",
      pattern: /https?:\/\/(?:www\.)?youtube\.com\/results\?[^\s"'`)]*search_query=/gi,
    },
    {
      status: "FAIL",
      name: "Keine Test-Videoquelle in Produktionscode",
      pattern: /https?:\/\/(?:www\.)?youtube\.com\/watch\?v=test(?:[&"'`]|$)/gi,
    },
    {
      status: "FAIL",
      name: "Keine veraltete Opus-Marke",
      pattern: /Opus Control Layer/gi,
    },
    {
      status: "FAIL",
      name: "Keine feste README-Fallzahl",
      pattern: /\d+ reviewed cases across \d+ sources/gi,
    },
    {
      status: "FAIL",
      name: "Keine Secrets im Repository",
      pattern: /(?:sk-[A-Za-z0-9_-]{20,}|SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s"']{12,}|APP_ADMIN_TOKEN\s*=\s*[^\s"']{12,})/g,
      allow: (match) => /your-|choose-a-|example|process\.env/i.test(match),
    },
    {
      status: "WARN",
      name: "Keine hart codierte Prüfer-Fallzahl",
      pattern: /Studio:\s*\d+\s+geprüfte Cases/gi,
    },
    {
      status: "WARN",
      name: "Keine zu starke Live-Crawler-Aussage",
      pattern: /Live-Crawler auslösen/gi,
    },
    {
      status: "WARN",
      name: "Keine absolute Ausbau-Behauptung",
      pattern: /(?:der einzige Engpass|kein weiterer Umbau nötig)/gi,
    },
  ];

  for (const check of checks) {
    for (const match of content.matchAll(check.pattern)) {
      if (check.allow?.(match[0])) continue;
      add(check.status, check.name, `${file}:${lineOf(content, match.index ?? 0)} · ${match[0]}`, { file });
    }
  }
}

async function main() {
  const files = [];
  for (const root of ROOTS) {
    try {
      files.push(...await walk(root));
    } catch {
      add("FAIL", "Quellordner vorhanden", `${root} fehlt`);
    }
  }
  for (const extra of EXTRA_FILES) {
    try {
      const info = await stat(extra);
      if (info.isFile()) files.push(extra);
    } catch {
      add("WARN", "Zusatzdatei vorhanden", `${extra} fehlt`);
    }
  }

  const textFiles = files.filter((file) => /\.(?:ts|tsx|js|jsx|mjs|json|md|html|css)$/i.test(file));
  for (const file of textFiles) inspect(file, await readFile(file, "utf8"));

  const failures = results.filter((item) => item.status === "FAIL");
  const warnings = results.filter((item) => item.status === "WARN");
  if (failures.length === 0) add("PASS", "Produktionsquellen", `${textFiles.length} Dateien ohne kritische verbotene Muster`);

  const report = {
    audit: "chris-fact-radar-source-tree",
    generatedAt: new Date().toISOString(),
    commit: currentCommit(),
    status: failures.length === 0 ? "PASS" : "FAIL",
    summary: {
      files: textFiles.length,
      passed: results.filter((item) => item.status === "PASS").length,
      warnings: warnings.length,
      failed: failures.length,
    },
    results,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(path.join(REPORT_DIR, "source-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(REPORT_DIR, "source-audit.md"),
    [
      "# Chris Fact Radar Source Audit",
      "",
      `- Status: **${report.status}**`,
      `- Datum: ${report.generatedAt}`,
      `- Commit: \`${report.commit}\``,
      `- Dateien: ${report.summary.files}`,
      `- Warnungen: ${report.summary.warnings}`,
      `- Fehler: ${report.summary.failed}`,
      "",
      "## Ergebnisse",
      "",
      ...(results.length ? results.map((item) => `- **${item.status}** · ${item.check}: ${item.detail}`) : ["- Keine Auffälligkeiten."]),
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`\nErgebnis: ${report.status} · ${failures.length} Fehler · ${warnings.length} Warnungen`);
  if (failures.length > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
