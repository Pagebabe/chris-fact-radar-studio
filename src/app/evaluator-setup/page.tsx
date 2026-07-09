import Link from "next/link";

export const dynamic = "force-dynamic";

export default function EvaluatorSetupPage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl rounded-[2rem] border border-cyan-400/30 bg-slate-900 p-8 shadow-2xl shadow-cyan-950/30 md:p-10">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">Evaluator Setup</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">Provider-Keys sauber eintragen, dann kontrolliert testen.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
          Chris Fact Radar nutzt zwei saubere externe Kernpfade: eine vom Prüfer eintragbare Opus-kompatible API für Bewertung und
          Content-Pakete sowie Apify für Social-Intake. Separate Plattform-Crawler und Provider-Mix sind bewusst entfernt.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-slate-700 bg-slate-950 p-6">
            <h2 className="text-2xl font-black">1. Lokale Provider</h2>
            <p className="mt-3 leading-7 text-slate-300">In <code>.env.local</code> werden Supabase, Opus-Proxy und optional Apify gesetzt. Secrets gehören nie ins Git.</p>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-black p-4 text-xs text-cyan-100">{`SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_BASE_URL=http://127.0.0.1:3456
OPENAI_API_KEY=...
LLM_MODEL=opus
APIFY_TOKEN=...`}</pre>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-950 p-6">
            <h2 className="text-2xl font-black">2. Opus-kompatible API</h2>
            <p className="mt-3 leading-7 text-slate-300">Der Prüfer kann seine eigene OpenAI-kompatible Opus-API eintragen. Ohne Key zeigt die App Fallbacks und verkauft keinen Live-Opus-Lauf.</p>
            <pre className="mt-4 overflow-x-auto rounded-2xl bg-black p-4 text-xs text-cyan-100">{`OPENAI_BASE_URL=http://127.0.0.1:3456
OPENAI_API_KEY=...
LLM_MODEL=opus
LLM_TIMEOUT_MS=25000`}</pre>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-950 p-6">
            <h2 className="text-2xl font-black">3. Apify Smoke Test</h2>
            <p className="mt-3 leading-7 text-slate-300">Mit kleinem Guthaben nur begrenzte Apify-Runs testen. Keine separaten Plattform-Crawler, keine breiten Scrapes, keine ungeprüften Claims aus Titeln.</p>
          </div>
          <div className="rounded-3xl border border-slate-700 bg-slate-950 p-6">
            <h2 className="text-2xl font-black">4. Spoken-Word Gate</h2>
            <p className="mt-3 leading-7 text-slate-300">Titel, Beschreibung und Caption sind Scout-Daten. Claims brauchen verifizierte Aussagebasis: Apify-Transcript, Speech-to-Text oder manuell geprüftes Zitat.</p>
          </div>
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/" className="rounded-full bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">Zurück zur Landingpage</Link>
          <Link href="/status" className="rounded-full border border-emerald-300 px-5 py-3 text-sm font-black text-emerald-100">Status prüfen</Link>
          <Link href="/studio" className="rounded-full border border-slate-500 px-5 py-3 text-sm font-black text-slate-100">Studio öffnen</Link>
        </div>
      </section>
    </main>
  );
}
