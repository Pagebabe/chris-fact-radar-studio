"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const MODULES = [
  { href: "/", label: "Start" },
  { href: "/studio", label: "Studio" },
  { href: "/lead-magnets/anti-heisshunger", label: "Lead-Magnet" },
  { href: "/status", label: "Status" },
  { href: "/application-brief", label: "Brief" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(href + "/");
}

export function WorkspaceShell() {
  const pathname = usePathname();
  const [llmModel, setLlmModel] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then((d: { checks?: { llmModel?: string | null } }) => {
        if (active) setLlmModel(d.checks?.llmModel ?? null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const isOpus = Boolean(llmModel && /opus/i.test(llmModel));
  const modelBadge = llmModel
    ? isOpus
      ? `Opus aktiv · ${llmModel}`
      : `KI-Control-Layer · ${llmModel}`
    : "Control Layer · Human-in-the-Loop";

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[var(--bg)]/90 backdrop-blur">
      <div className="mx-auto flex h-[var(--shell-h)] max-w-[1600px] items-center gap-4 px-4 md:px-6">
        <Link href="/" className="flex shrink-0 flex-col leading-tight">
          <span className="text-sm font-black tracking-tight text-white">Chris Fact Radar</span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-cyan-300/80 md:block">
            Opus Control Layer · Agent-Workspace
          </span>
        </Link>
        <nav aria-label="Workspace-Module" className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {MODULES.map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className={
                isActive(pathname, m.href)
                  ? "shrink-0 rounded-full bg-cyan-300 px-3.5 py-1.5 text-xs font-black text-slate-950"
                  : "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-bold text-slate-300 hover:bg-white/10 hover:text-white"
              }
            >
              {m.label}
            </Link>
          ))}
        </nav>
        <span className="hidden shrink-0 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-bold text-slate-300 md:inline-flex">
          <span className={isOpus ? "text-cyan-300" : "text-slate-300"}>{modelBadge}</span>
        </span>
      </div>
    </header>
  );
}
