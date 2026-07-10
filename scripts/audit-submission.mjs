import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const REPORT_DIR = process.env.AUDIT_REPORT_DIR || "artifacts";
const steps = [
  ["Interaktions-Audit", "npm", ["run", "audit:interactions"]],
  ["Lint", "npm", ["run", "lint"]],
  ["Typecheck", "npm", ["run", "typecheck"]],
  ["Build", "npm", ["run", "build"]],
  ["E2E", "npm", ["run", "test:e2e"]],
  ["Auth-E2E", "npm", ["run", "test:e2e:auth"]],
];

if (process.env.SKIP_PRODUCTION_AUDIT !== "1") {
  steps.push(["Production-Audit", "npm", ["run", "audit:production"]]);
}

const results = [];
let failed = false;

for (const [name, command, args] of steps) {
  const startedAt = new Date().toISOString();
  try {
    execFileSync(command, args, { stdio: "inherit", env: process.env });
    results.push({ name, status: "PASS", startedAt, finishedAt: new Date().toISOString() });
  } catch (error) {
    const exitCode = typeof error === "object" && error && "status" in error ? error.status : null;
    results.push({ name, status: "FAIL", exitCode, startedAt, finishedAt: new Date().toISOString() });
    failed = true;
    break;
  }
}

if (process.env.SKIP_PRODUCTION_AUDIT === "1") {
  results.push({ name: "Production-Audit", status: "SKIPPED", reason: "SKIP_PRODUCTION_AUDIT=1" });
}

const report = {
  audit: "submission",
  generatedAt: new Date().toISOString(),
  status: failed ? "FAIL" : results.some((item) => item.status === "SKIPPED") ? "PARTIAL" : "PASS",
  results,
};

await mkdir(REPORT_DIR, { recursive: true });
await writeFile(path.join(REPORT_DIR, "submission-audit.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(path.join(REPORT_DIR, "submission-audit.md"), [
  "# Submission Audit",
  "",
  `- Status: **${report.status}**`,
  `- Datum: ${report.generatedAt}`,
  "",
  ...results.map((item) => `- **${item.status}** · ${item.name}${item.reason ? `: ${item.reason}` : ""}`),
  "",
].join("\n"), "utf8");

if (failed) process.exitCode = 1;
