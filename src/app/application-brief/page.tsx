import Link from "next/link";

const proofPoints = [
  "Live MVP mit ehrlichen Grenzen",
  "LLM Review Layer (OpenAI-kompatibel, provider-agnostisch)",
  "Chatgesteuerte Intake-Ziele",
  "Human-in-the-Loop Review",
  "Supabase-backed Cases",
  "Apify/manual Intake",
  "Review Gate",
  "LLM plus Fallback",
  "Market Intelligence Lane",
  "Brand Governance mit Chris-Wissen",
  "Funnel Asset mit fertigem E-Book",
];

const routes = [
  ["/", "Overview"],
  ["/studio", "Full Studio"],
  ["/status", "Status"],
  ["/lead-magnets/anti-heisshunger", "Lead-Magnet"],
];

export default function ApplicationBriefPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-6xl rounded-[2rem] border border-cyan-400/30 bg-gradient-to-br from-slate-900 via-slate-950 to-black p-8 shadow-2xl shadow-cyan-950/30 md:p-10">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">AI Preselection Brief</p>
        <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight md:text-6xl">
          Claim Review Studio mit Apify/manual Intake und OpenAI-kompatiblem LLM Review Layer.
        </h1>
        <p className="mt-5 max-w-4xl text-lg leading-8 text-slate-300">
          Chris Fact Radar ist ein Live-MVP für den deutschen Fitness- und Ernährungsmarkt: Apify/manual Intake, Studio, Status und Lead-Magnet
          sichern Aussagebasis, priorisieren Risiko und bereiten Content vor. Die LLM-Schicht darüber (OpenAI-kompatibel, aktuell NVIDIA-gehostetes
          Llama-Nemotron, provider-agnostisch) erklärt: warum ein Treffer zählt, was sicher gesagt werden kann. Der Mensch entscheidet; Metadaten wachsen als
          langfristiges Creator- und Market-Intelligence-Asset mit.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-700 bg-slate-950 p-6">
            <h2 className="text-2xl font-black">1. Claim Lane</h2>
            <p className="mt-3 leading-7 text-slate-300">Claims entstehen aus Apify-Transkripten, Speech-to-Text oder manuell geprüften Zitaten. Titel und Beschreibungen bleiben Scout-Signale.</p>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-950 p-6">
            <h2 className="text-2xl font-black">2. Market Lane</h2>
            <p className="mt-3 leading-7 text-slate-300">Metadaten wie Creator, Reichweite, Format, Zeitpunkt und Themen werden für Marktforschung und Priorisierung genutzt.</p>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-950 p-6">
            <h2 className="text-2xl font-black">3. Brand Governance</h2>
            <p className="mt-3 leading-7 text-slate-300">Chris-Wissen dient als öffentliche Referenzbasis, damit Skripte und Rebuttals zur belegten Position passen oder korrigiert werden.</p>
          </div>
        </div>
        <section className="mt-8 rounded-3xl border border-slate-700 bg-slate-950 p-6">
          <h2 className="text-2xl font-black">Proof Points</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            {proofPoints.map((point) => (
              <span key={point} className="rounded-full bg-cyan-300 px-4 py-2 text-sm font-black text-slate-950">{point}</span>
            ))}
          </div>
        </section>
        <section className="mt-8 grid gap-4 md:grid-cols-5">
          {routes.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-2xl border border-slate-600 bg-slate-900 px-5 py-4 text-sm font-black text-slate-100 hover:bg-cyan-300 hover:text-slate-950">
              {label}
            </Link>
          ))}
        </section>
        <section className="mt-8 rounded-3xl border border-emerald-400/30 bg-emerald-400/10 p-6">
          <h2 className="text-2xl font-black">Warum das auffällt</h2>
          <p className="mt-3 leading-7 text-slate-300">
            Das Projekt ist kein einzelner Prompt und kein generischer Scraper. Es verbindet kontrollierten Intake, Datenqualität,
            Brand Safety, Evidence Review, Content-Produktion, Funnel-Denken und Marktanalyse in einem prüfbaren Workflow.
          </p>
        </section>
      </section>
    </main>
  );
}
