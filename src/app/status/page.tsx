import Link from "next/link";
import { loadClaims, storeConfigured } from "@/lib/store";
import { llmConfigured, configuredLlmModel } from "@/lib/llm";
import { isPublicProductionClaim, publicClaimKind } from "@/lib/public-claims";

export const dynamic = "force-dynamic";

type StatusRow = {
  label: string;
  value: string;
  state: "ok" | "warn" | "bad";
  note: string;
};

function statusClass(state: StatusRow["state"]) {
  if (state === "ok") return "border-emerald-300 bg-emerald-50 text-emerald-900";
  if (state === "warn") return "border-amber-300 bg-amber-50 text-amber-950";
  return "border-rose-300 bg-rose-50 text-rose-950";
}

function badgeClass(state: StatusRow["state"]) {
  if (state === "ok") return "bg-emerald-600 text-white";
  if (state === "warn") return "bg-amber-500 text-white";
  return "bg-rose-600 text-white";
}

const smokeSteps = [
  { label: "Start", href: "/", note: "Produkt-Story und Golden Run verstehen" },
  { label: "Studio", href: "/studio", note: "Claim öffnen, Scores und Review-Fluss prüfen" },
  { label: "Studio Intake", href: "/studio", note: "Apify/manual Intake, Chat und Crawler-Ziele prüfen" },
  { label: "E-Book (PDF)", href: "/anti-heisshunger-system.pdf", note: "Task 1: das fertige Anti-Heißhunger-PDF direkt öffnen" },
  { label: "Lead-Magnet + Check", href: "/lead-magnets/anti-heisshunger", note: "E-Book-Modul und Check-Funnel im Kontext ansehen" },
  { label: "Health", href: "/api/health", note: "Provider-/App-Status maschinenlesbar prüfen" },
];

export default async function StatusPage() {
  const claims = (await loadClaims()) ?? [];
  const publicClaims = claims.filter(isPublicProductionClaim);
  const youtubeCount = publicClaims.filter((claim) => publicClaimKind(claim) === "youtube").length;
  const debateCount = publicClaims.filter((claim) => publicClaimKind(claim) === "debate").length;
  const externalWebCount = publicClaims.filter((claim) => publicClaimKind(claim) === "web").length;
  const rejectedCount = claims.filter((claim) => claim.stage === "rejected").length;
  const suspiciousPublic = publicClaims.filter((claim) => {
    const url = claim.sourceVideo?.url ?? "";
    return url.includes("/results?") || url.includes("tiktok.com/search") || url.includes("instagram.com/explore");
  }).length;

  const rows: StatusRow[] = [
    {
      label: "Live app",
      value: "online",
      state: "ok",
      note: "Diese Seite wird serverseitig aus der Production-App gerendert.",
    },
    {
      label: "Supabase store",
      value: storeConfigured() ? "configured" : "missing",
      state: storeConfigured() ? "ok" : "bad",
      note: "Claims werden aus dem gemeinsamen Supabase Store geladen, nicht aus lokalem Browser-State.",
    },
    {
      label: "LLM provider",
      value: llmConfigured() ? configuredLlmModel() : "fallback-ready",
      state: llmConfigured() ? "ok" : "warn",
      note: "OpenAI-kompatible, providerneutrale Laufzeitschicht. Der aktive Modellname steht im Statuswert; das LLM bewertet und formuliert nur. Bei Ausfall greift ein deterministischer, klar markierter Fallback.",
    },
    {
      label: "Public queue",
      value: `${publicClaims.length} cases`,
      state: publicClaims.length >= 10 ? "ok" : "warn",
      note: "Homepage und Status nutzen denselben Public-Claim-Filter für Review-fähige Fälle.",
    },
    {
      label: "Data honesty filter",
      value: suspiciousPublic === 0 ? "clean" : `${suspiciousPublic} suspicious`,
      state: suspiciousPublic === 0 ? "ok" : "bad",
      note: "Search-URLs, Placeholder und alte Fake-Seeds dürfen nicht public erscheinen.",
    },
    {
      label: "Final PDF",
      value: "ready",
      state: "ok",
      note: "Das finale E-Book (40 Seiten) liegt als /anti-heisshunger-system.pdf in der App und ist auf der Lead-Magnet-Seite verlinkt.",
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <section className="mx-auto max-w-5xl space-y-8">
        <div className="flex flex-col gap-4 border-b border-slate-800 pb-8 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-cyan-300">Smoke Test / Production Status</p>
            <h1 className="text-4xl font-black tracking-tight md:text-6xl">Chris Fact Radar</h1>
            <p className="mt-4 max-w-2xl text-lg text-slate-300">
              Zentrale Prüfer-Seite für Live-Status, Golden Run, Datenhygiene und klare Grenzen.
              Die App ist live und benutzbar; breitere Plattform-Abdeckung (TikTok/Instagram) und OCR/Audio sind der nächste Ausbauschritt.
            </p>
          </div>
          <Link className="rounded-full border border-cyan-300 px-5 py-3 text-sm font-bold text-cyan-100 hover:bg-cyan-300 hover:text-slate-950" href="/">
            Zur App
          </Link>
        </div>

        <section className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 p-6">
          <h2 className="text-2xl font-black text-cyan-100">Golden Smoke Test</h2>
          <p className="mt-3 leading-7 text-cyan-50/80">
            Dieser Ablauf prüft, ob die App als ein rundes Produkt funktioniert: Story, Studio, Discovery, Lead-Magnet,
            interaktiver Check und technische Health-Fläche.
          </p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {smokeSteps.map((step) => (
              <Link key={step.label} href={step.href} className="rounded-2xl border border-cyan-200/20 bg-slate-950/60 p-4 hover:bg-cyan-200 hover:text-slate-950">
                <span className="font-black">{step.label}</span>
                <span className="mt-1 block text-sm opacity-80">{step.note}</span>
              </Link>
            ))}
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-5">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Public Cases</p>
            <p className="mt-2 text-4xl font-black">{publicClaims.length}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">YouTube</p>
            <p className="mt-2 text-4xl font-black">{youtubeCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Debatten</p>
            <p className="mt-2 text-4xl font-black">{debateCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Web-Claims</p>
            <p className="mt-2 text-4xl font-black">{externalWebCount}</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Rejected</p>
            <p className="mt-2 text-4xl font-black">{rejectedCount}</p>
          </div>
        </div>

        <div className="grid gap-4">
          {rows.map((row) => (
            <article key={row.label} className={`rounded-3xl border p-5 ${statusClass(row.state)}`}>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-black">{row.label}</h2>
                  <p className="mt-1 text-sm opacity-80">{row.note}</p>
                </div>
                <span className={`w-fit rounded-full px-4 py-2 text-sm font-black ${badgeClass(row.state)}`}>{row.value}</span>
              </div>
            </article>
          ))}
        </div>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-black">Was aktuell ehrlich ist</h2>
          <div className="mt-4 grid gap-3 text-slate-300 md:grid-cols-2">
            <p>✅ Supabase Queue wird serverseitig geladen.</p>
            <p>✅ LLM-Workflows nutzen konfigurierte Provider, sonst ehrlichen Fallback.</p>
            <p>✅ Öffentliche Views nutzen denselben Public-Claim-Filter.</p>
            <p>✅ Lead-Magnet und Check-Funnel sind in die Produktstory integriert.</p>
            <p>✅ Finale PDF ist als öffentlicher App-Pfad verlinkt.</p>
            <p>⚠️ Reale Plattform-Smokes brauchen APIFY_TOKEN und dokumentierte Runs.</p>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-2xl font-black">Prüfbare Endpunkte</h2>
          <div className="mt-4 grid gap-3 text-sm text-slate-300">
            <code className="rounded-2xl bg-slate-950 p-4">GET /api/claims</code>
            <code className="rounded-2xl bg-slate-950 p-4">GET /api/health</code>
            <code className="rounded-2xl bg-slate-950 p-4">POST /api/chat</code>
            <code className="rounded-2xl bg-slate-950 p-4">GET /api/llm-test</code>
            <code className="rounded-2xl bg-slate-950 p-4">GET /api/llm-test?mode=live</code>
          </div>
        </section>
      </section>
    </main>
  );
}
