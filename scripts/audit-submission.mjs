import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const REPORT_DIR = process.env.AUDIT_REPORT_DIR || "artifacts";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

function currentCommit() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

const steps = [
  { name: "Source audit", args: ["run", "audit:source"] },
  { name: "Lint", args: ["run", "lint"] },
  { name: "Typecheck", args: ["run", "typecheck"] },
  { name: "Build", args: ["run", "build"], env: { NEXT_TELEMETRY_DISABLED: "1" } },
  { name: "E2E", args: ["run", "test:e2e"], env: { CI: "true", NEXT_TELEMETRY_DISABLED: "1" } },
  { name: "Auth E2E", args: ["run", "test:e2e:auth"], env: { CI: "true", NEXT_TELEMETRY_DISABLED: "1" } },
  ...(process.env.SKIP_PRODUCTION_AUDIT === "1" ? [] : [{ name: "Production audit", args: ["run", "audit:production"] }]),
];

async function main() {
  console.log("\nChris Fact Radar Submission Audit\n");
  const results = [];

  for (const step of steps) {
    const started = Date.now();
    console.log(`\n=== ${step.name} ===`);
    const result = spawnSync(npm, step.args, {
      stdio: "inherit",
      shell: false,
      env: { ...process.env, ...step.env },
    });
    const durationMs = Date.now() - started;
    const status = result.status === 0 ? "PASS" : "FAIL";
    results.push({ name: step.name, status, exitCode: result.status ?? 1, durationMs });
    if (status === "FAIL") {
      console.error(`\nAbbruch: ${step.name} fehlgeschlagen.`);
      break;
    }
  }

  const failed = results.find((item) => item.status === "FAIL");
  const report = {
    audit: "chris-fact-radar-submission",
    generatedAt: new Date().toISOString(),
    commit: currentCommit(),
    branch: process.env.GITHUB_REF_NAME || "local",
    baseUrl: process.env.AUDIT_BASE_URL || "https://chris-fact-radar.vercel.app",
    status: failed ? "FAIL" : results.length === steps.length ? "PASS" : "FAIL",
    productionAuditSkipped: process.env.SKIP_PRODUCTION_AUDIT === "1",
    results,
  };

  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(path.join(REPORT_DIR, "submission-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(
    path.join(REPORT_DIR, "submission-audit.md"),
    [
      "# Chris Fact Radar Submission Audit",
      "",
      `- Status: **${report.status}**`,
      `- Datum: ${report.generatedAt}`,
      `- Commit: \`${report.commit}\``,
      `- Branch: ${report.branch}`,
      `- URL: ${report.baseUrl}`,
      `- Production-Audit: ${report.productionAuditSkipped ? "SKIPPED" : "ausgeführt"}`,
      "",
      "## Gates",
      "",
      ...results.map((item) => `- **${item.status}** · ${item.name} · ${(item.durationMs / 1000).toFixed(1)} s`),
      "",
    ].join("\n"),
    "utf8",
  );

  console.log(`\nGesamtergebnis: ${report.status}`);
  if (report.status !== "PASS") process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
