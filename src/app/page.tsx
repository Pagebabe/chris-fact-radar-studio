import Link from "next/link";
import { loadClaims } from "@/lib/store";
import { llmConfigured } from "@/lib/llm";
import { isPublicProductionClaim, publicClaimKind } from "@/lib/public-claims";
import type { ClaimItem } from "@/lib/types";

export const dynamic = "force-dynamic";

function compact(value: number) {
  return new Intl.NumberFormat("de-DE", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function badgeFor(claim: ClaimItem) {
  const kind = publicClaimKind(claim);
  if (kind === "youtube") return "YouTube";
  if (kind === "debate") return "Debatte";
  return "Web";
}

function targetReason(claim: ClaimItem) {
  const source = claim.analysisSource === "llm" ? "LLM-Auswertung" : "Heuristik/kuratierter Fall";
  const reach = compact(claim.sourceVideo?.views ?? 0);
  const evidenceCount = claim.evidence?.length ?? 0;
  return `${source} · Chris-Fit ${claim.relevanceScore} · Risk ${claim.riskScore} · ${reach} Views · ${evidenceCount} Evidence-Hinweise`;
}

function actionHint(claim: ClaimItem) {
  if (claim.stage === "ready") return "direkt als Rebuttal-Kandidat prüfen";
  if (claim.stage === "needs_evidence") return "erst Evidence/Originalaussage härten";
  if (claim.stage === "accepted") return "Content-Pack oder Recording daraus bauen";
  return "im Studio priorisieren und entscheiden";
}

const actions = [
  {
    title: "1 · E-Book öffnen (Task 1)",
    text: "Das fertige Anti-Heißhunger-PDF direkt ansehen.",
    href: "/anti-heisshunger-system.pdf",
  },
  {
    title: "2 · Studio: geprüfte Cases",
    text: "Echte Fälle, Scores, Evidence und Review-Status ansehen.",
    href: "/studio",
  },
  {
    title: "3 · Intake / Jäger starten",
    text: "Apify-Intake auslösen und verifizierte Funde in der Queue sehen.",
    href: "/studio",
  },
  {
    title: "4 · Status & Ehrlichkeit",
    text: "Provider, Grenzen und prüfbare Endpunkte ansehen.",
    href: "/status",
  },
];

const promptChips = [
  "Warum ist dieser Treffer relevant?",
  "Welche Evidence fehlt noch?",
  "Was soll Chris dazu sagen?",
  "Welcher Content entsteht daraus?",
  "Was ist die nächste sichere Aktion?",
];

const llmHelp = [
  "Treffer erklären",
  "Originalaussage absichern",
  "Evidence-Lücken markieren",
  "60-Sekunden-Skript bauen",
  "Hook/Thumbnail vorschlagen",
  "Reject-Grund formulieren",
];

export default async function Home() {
  const claims = ((await loadClaims()) ?? []).filter(isPublicProductionClaim);
  const sourceCount = new Set(claims.map((claim) => claim.sourceVideo?.url).filter(Boolean)).size;
  const debateCount = claims.filter((claim) => publicClaimKind(claim) === "debate").length;
  const webCount = claims.filter((claim) => publicClaimKind(claim) === "web").length;
  const reach = claims.reduce((sum, claim) => sum + (claim.sourceVideo?.views ?? 0), 0);
  const topClaims = [...claims].sort((a, b) => (b.riskScore + b.relevanceScore) - (a.riskScore + a.relevanceScore)).slice(0, 4);
  const topClaim = topClaims[0];

  return (
    <main className="min-h-screen bg-[#070a12] text-white">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-5 py-6 md:px-8">
        <header className="flex flex-col gap-4 rounded-[2rem] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-cyan-950/20 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan-300">Chris Fact Radar</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight md:text-5xl">Claim Review Studio für Fitness-Content</h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-300">
              Ein kontrollierter Arbeitsfluss für Fitness- und Ernährungsclaims: Apify oder manueller Import liefern geprüfte Quellen,
              das Studio trennt Scout-Signale von echten Claims. LLM-Unterstützung nutzt konfigurierte Provider, wenn verfügbar, sonst einen ehrlichen Fallback:
              keine Plattform-API-Crawler-Story, keine autonomen Urteile.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs font-black">
            <span className="rounded-full bg-emerald-300 px-3 py-2 text-emerald-950">{claims.length} Cases</span>
            <span className="rounded-full bg-cyan-300 px-3 py-2 text-cyan-950">{sourceCount} Quellen</span>
            <span className="rounded-full bg-violet-300 px-3 py-2 text-violet-950">LLM {llmConfigured() ? "configured" : "fallback"}</span>
            <span className="rounded-full bg-amber-200 px-3 py-2 text-amber-950">Human Review</span>
          </div>
        </header>

        <section className="grid flex-1 gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="flex min-h-[620px] flex-col rounded-[2rem] border border-cyan-300/20 bg-slate-950 shadow-2xl shadow-cyan-950/20">
            <div className="border-b border-white/10 p-5">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">Abgabe-Cockpit</p>
                  <h2 className="mt-1 text-2xl font-black">Was ist echt geprüft, was ist nur Intake?</h2>
                </div>
                <span className="w-fit rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100">
                  Workflow: Intake → Review → Content-Pack
                </span>
              </div>
            </div>

            <div className="flex-1 space-y-4 overflow-hidden p-5">
              <div className="max-w-[88%] rounded-[1.5rem] bg-cyan-300 p-4 text-slate-950">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-900">Systemstatus</p>
                <p className="mt-2 font-bold leading-7">
                  Echte Claims entstehen nur aus geprüfter Aussagebasis. Apify/manual Intake sammelt Material; das Studio zeigt, was reviewfähig ist und was noch Belegarbeit braucht.
                </p>
              </div>

              <div className="ml-auto max-w-[84%] rounded-[1.5rem] border border-white/10 bg-white/[0.06] p-4 text-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Abnahmefrage</p>
                <p className="mt-2 font-semibold leading-7">Was ist live, was ist geprüft, und was ist der nächste Ausbauschritt?</p>
              </div>

              <div className="max-w-[92%] rounded-[1.5rem] bg-slate-900 p-4 text-slate-100">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Claim Radar Briefing</p>
                <div className="mt-3 grid gap-3 text-sm leading-6 text-slate-300 md:grid-cols-2">
                  <p>• {claims.length} sichtbare Review-Cases aus der API.</p>
                  <p>• {sourceCount} Quellen, {debateCount} Debattenfälle, {webCount} Web-Claims.</p>
                  <p>• Geschätzte Gesamtreichweite: {compact(reach)}.</p>
                  <p>• LLM-Workflows: Chat, Monitoring-Fragen, Priorisierung, Rebuttal-Skript, Content-Pack.</p>
                </div>
                {topClaim ? (
                  <div className="mt-4 rounded-2xl border border-cyan-300/20 bg-slate-950 p-4">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Nächster Rebuttal-Kandidat</p>
                    <p className="mt-2 text-lg font-black leading-snug">{topClaim.claim}</p>
                    <p className="mt-2 text-sm text-slate-400">{topClaim.sourceVideo.creator} · {topClaim.verdict} · {actionHint(topClaim)}</p>
                    <div className="mt-3 rounded-2xl border border-cyan-300/10 bg-cyan-300/5 p-3">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-200">Warum Treffer?</p>
                      <p className="mt-2 text-sm leading-6 text-slate-300">{targetReason(topClaim)}</p>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-400">{topClaim.whyItMatters}</p>
                    </div>
                    <Link href="/studio" className="mt-4 inline-flex rounded-full bg-cyan-300 px-4 py-2 text-xs font-black text-slate-950">
                      Im Studio prüfen
                    </Link>
                  </div>
                ) : (
                  <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-amber-100">
                    Keine echten Review-Cases aus der API geladen. Erst Apify/manual Intake oder Supabase prüfen.
                  </div>
                )}
              </div>

              <div className="rounded-[1.5rem] border border-amber-300/20 bg-amber-300/10 p-4 text-amber-50">
                <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-200">Grenze</p>
                <p className="mt-2 leading-7">
                  Der Chat darf nur mit sichtbarem Kontext arbeiten. Wenn LLM-Provider oder Daten fehlen, muss der Fallback das klar markieren:
                  Intake, Priorisierung, Evidence, menschliche Freigabe und Content-Ausgabe bleiben die Wahrheitsschicht.
                </p>
              </div>
            </div>

            <div className="border-t border-white/10 p-5">
              <p className="mb-3 text-xs font-black uppercase tracking-[0.18em] text-cyan-300">Prüffragen für die Abgabe</p>
              <div className="flex flex-wrap gap-2">
                {promptChips.map((chip) => (
                  <span key={chip} className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-xs font-bold text-slate-300">
                    {chip}
                  </span>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-slate-400">
                Jede öffentliche Aussage muss zur App passen: Apify/manual Intake statt Plattform-API-Crawler, LLM-Unterstützung statt autonomer Agent, echte Smokes statt künstlicher Daten.
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">Für den Prüfer — 4 Schritte</p>
              <div className="mt-4 grid gap-3">
                {actions.map((action) => (
                  <Link key={action.title} href={action.href} className="rounded-2xl border border-white/10 bg-slate-950 p-4 hover:border-cyan-300 hover:bg-cyan-300 hover:text-slate-950">
                    <span className="block font-black">{action.title}</span>
                    <span className="mt-1 block text-sm opacity-80">{action.text}</span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">Datenstruktur</p>
              <div className="mt-4 grid gap-2 text-sm text-slate-300">
                <p className="rounded-2xl bg-slate-950 p-3">Claims + Creator + Themen</p>
                <p className="rounded-2xl bg-slate-950 p-3">Treffergrund + Reject-Grund + Priorität</p>
                <p className="rounded-2xl bg-slate-950 p-3">Evidence + Chris-Fit + Review</p>
                <p className="rounded-2xl bg-slate-950 p-3">Rebuttals + Kampagnen + Lead-Magnets</p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.04] p-5">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">Top Kandidaten</p>
              <div className="mt-4 grid gap-3">
                {topClaims.map((claim) => (
                  <article key={claim.id} className="rounded-2xl border border-white/10 bg-slate-950 p-4">
                    <div className="flex flex-wrap gap-2 text-[11px] font-black uppercase tracking-wide">
                      <span className="rounded-full bg-cyan-300 px-2 py-1 text-slate-950">{badgeFor(claim)}</span>
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-200">Risk {claim.riskScore}</span>
                      <span className="rounded-full bg-slate-800 px-2 py-1 text-slate-200">Fit {claim.relevanceScore}</span>
                    </div>
                    <h3 className="mt-3 line-clamp-2 font-black leading-snug">{claim.claim}</h3>
                    <p className="mt-2 text-xs font-semibold text-cyan-200">{claim.sourceVideo.creator}</p>
                    <p className="mt-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Treffergrund</p>
                    <p className="mt-1 text-xs leading-5 text-slate-400">{targetReason(claim)}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-500">{claim.whyItMatters}</p>
                    <Link href="/studio" className="mt-3 inline-flex rounded-full border border-cyan-300/40 px-3 py-2 text-xs font-black text-cyan-100 hover:bg-cyan-300 hover:text-slate-950">
                      Fragen / prüfen
                    </Link>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-violet-300/20 bg-violet-300/10 p-5 text-violet-50">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-violet-200">LLM Review Layer</p>
              <p className="mt-3 text-sm leading-6 text-violet-50/80">
                Die LLM-Schicht ist eine unterstützende Bewertungs- und Textschicht. Die App muss auch ohne Provider sauber bleiben und darf keine nicht geprüften Aussagen als Ergebnis verkaufen.
              </p>
              <ul className="mt-4 space-y-2 text-[12px] font-bold leading-5">
                <li className="rounded-xl bg-violet-200/90 px-3 py-2 text-violet-950">Aktiv: Provider-Konfiguration, Script-/Pack-API und Fallback-Verhalten.</li>
                <li className="rounded-xl border border-violet-200/30 px-3 py-2 text-violet-100/90">Prüfer können die konfigurierte Provider-Schicht und Fallbacks prüfen.</li>
                <li className="rounded-xl border border-violet-200/30 px-3 py-2 text-violet-100/90">Nicht behaupten: autonomer Daueragent oder finale Wahrheitsmaschine.</li>
              </ul>
              <div className="mt-4 flex flex-wrap gap-2">
                {llmHelp.map((item) => (
                  <span key={item} className="rounded-full border border-violet-200/30 px-3 py-1.5 text-[11px] font-black text-violet-100/80">{item}</span>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-rose-300/20 bg-rose-300/10 p-5 text-rose-50">
              <p className="text-sm font-black uppercase tracking-[0.22em] text-rose-200">Lead-Magnet Output</p>
              <h2 className="mt-2 text-xl font-black">Anti-Heißhunger-System</h2>
              <p className="mt-3 text-sm leading-6 text-rose-50/80">
                Erstes sichtbares Asset aus dem System: aus Chris-Content wird ein Freebie mit Check-Funnel.
              </p>
              <Link href="/lead-magnets/anti-heisshunger" className="mt-4 inline-flex rounded-full bg-rose-200 px-4 py-2 text-xs font-black text-rose-950">
                Öffnen
              </Link>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}
