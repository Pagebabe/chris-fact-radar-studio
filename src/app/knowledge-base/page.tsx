import Link from "next/link";

export const metadata = {
  title: "Chris-Wissensbasis — Transparenz & Fehlerquellen",
  description:
    "Info-/Test-Artefakt für Prüfer und Chris: Wie die Wissensbasis entstand, wozu sie dient — und welche maschinellen Fehler darin sein können.",
};

const categories = [
  { label: "Solo-Ratgeber", value: 70, tone: "ok", note: "überwiegend Chris’ Stimme — als Position nutzbar, Zitate am Video prüfen" },
  { label: "Reaktion / Debunk", value: 33, tone: "warn", note: "fremde Aussagen zitiert/eingebettet — nur für Thema/Gegner/Dedupe" },
  { label: "Debatte / Verhör", value: 14, tone: "bad", note: "zwei Live-Stimmen ungetrennt — NIE als Chris’ Position/Zitat" },
  { label: "Persönlich / Vlog", value: 10, tone: "muted", note: "kein Fachinhalt — für die Wissensbasis ignoriert" },
];

const errorSources = [
  {
    title: "Automatische Untertitel (ASR)",
    body:
      "Der Text stammt aus YouTubes automatischer Spracherkennung, nicht aus einem geprüften Transkript. Eigennamen, Zahlen und Fachbegriffe sind teils falsch erkannt (z. B. „Grieß“ → „Gries“, „Flohsamen“ → „Floh Samen“). Inhaltlich belastbar, aber nicht wörtlich zitierfähig.",
  },
  {
    title: "Keine Sprecher-Trennung",
    body:
      "Auto-Untertitel kennzeichnen nicht, wer spricht. In Reaktions- und Debatten-Videos läuft die Gegenmeinung mit im Text — ohne maschinellen Zusatzschritt ist nicht sicher unterscheidbar, welcher Satz von Chris ist und welcher von seinem Gegenüber.",
  },
  {
    title: "Heuristische Klassifikation",
    body:
      "Die Einordnung (Solo / Reaktion / Debatte / Vlog) und die Themen-Zuordnung basieren auf Titel- und Stichwort-Mustern, nicht auf inhaltlichem Verständnis. Sie ist bewusst konservativ (im Zweifel Quarantäne), kann aber einzelne Videos falsch einsortieren.",
  },
];

function toneClasses(tone: string) {
  if (tone === "ok") return "border-emerald-400/40 bg-emerald-500/10 text-emerald-200";
  if (tone === "warn") return "border-amber-400/40 bg-amber-500/10 text-amber-200";
  if (tone === "bad") return "border-rose-400/40 bg-rose-500/10 text-rose-200";
  return "border-slate-600/50 bg-slate-800/40 text-slate-300";
}

export default function KnowledgeBasePage() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl">
        <p className="text-sm font-black uppercase tracking-[0.28em] text-cyan-300">
          Info &amp; Test · für Prüfer und Chris
        </p>
        <h1 className="mt-3 text-4xl font-black leading-tight tracking-tight md:text-5xl">
          Chris-Wissensbasis: Transparenz &amp; Fehlerquellen
        </h1>

        {/* Zentrale, ehrliche Warnung — ganz oben, unübersehbar */}
        <div className="mt-8 rounded-3xl border-2 border-rose-400/60 bg-rose-500/10 p-7">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-rose-300">
            ⚠ Nicht von einem Menschen abgenommen
          </p>
          <p className="mt-3 text-lg font-semibold leading-8 text-rose-50">
            Diese Wissensbasis wurde maschinell erzeugt und ist <span className="underline decoration-rose-400">nicht redaktionell geprüft</span>.
            Sie kann Fehler enthalten, die nicht von einem Menschen entstanden sind — durch automatische Spracherkennung,
            fehlende Sprecher-Trennung und heuristische Einordnung.
          </p>
          <p className="mt-3 leading-8 text-rose-100/90">
            Sie ist bewusst ein <strong>Info- und Test-Artefakt</strong>, keine Faktenquelle. Für den eigentlichen Faktencheck
            zieht die App weiterhin externe, zitierbare Belege — nie diese Transkripte.
          </p>
        </div>

        {/* Wozu / wozu nicht */}
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-3xl border border-emerald-400/30 bg-emerald-500/5 p-6">
            <h2 className="text-xl font-black text-emerald-200">Wofür sie dient</h2>
            <ul className="mt-3 space-y-2 leading-7 text-slate-200">
              <li>· <strong>Themen</strong> — worüber Chris tatsächlich spricht</li>
              <li>· <strong>Gegner-Typen</strong> — auf welche Kanäle/Personen er reagiert (Relevanzsignal)</li>
              <li>· <strong>Dedupe</strong> — hat er ein Thema schon behandelt?</li>
            </ul>
          </div>
          <div className="rounded-3xl border border-rose-400/30 bg-rose-500/5 p-6">
            <h2 className="text-xl font-black text-rose-200">Wofür sie NICHT dient</h2>
            <ul className="mt-3 space-y-2 leading-7 text-slate-200">
              <li>· Nicht als <strong>Faktenwahrheit</strong></li>
              <li>· Nicht als wörtliche <strong>Zitatquelle</strong></li>
              <li>· Nicht als Chris’ Position aus Reaktions-/Debatten-Videos</li>
            </ul>
          </div>
        </div>

        {/* Herkunft */}
        <div className="mt-8 rounded-3xl border border-slate-700 bg-slate-900/60 p-7">
          <h2 className="text-2xl font-black">Woher die Daten kommen</h2>
          <p className="mt-3 leading-8 text-slate-300">
            127 Transkripte (≈ 676.000 Wörter) vom offiziellen YouTube-Kanal <span className="font-mono text-slate-100">@ChristianWolf</span> — die
            deutschen Auto-Untertitel, ohne Video-Download gezogen. Die Kanal-Identität ist gesichert: die zwei Videos, die die
            Bewerbungsaufgabe selbst als Chris’ Videos verlinkt, liegen auf genau diesem Kanal. Zwei weitere Videos fehlen
            bewusst (eines altersbeschränkt, eines ohne deutsche Untertitel).
          </p>
        </div>

        {/* Fehlerquellen */}
        <h2 className="mt-10 text-2xl font-black">Welche Fehler drin sein können (maschinell, nicht menschlich)</h2>
        <div className="mt-4 space-y-4">
          {errorSources.map((e) => (
            <div key={e.title} className="rounded-3xl border border-amber-400/30 bg-amber-500/5 p-6">
              <h3 className="text-lg font-black text-amber-200">{e.title}</h3>
              <p className="mt-2 leading-7 text-slate-200">{e.body}</p>
            </div>
          ))}
        </div>

        {/* Guardrails / Klassifikation */}
        <h2 className="mt-10 text-2xl font-black">Die Schutzmechanismen (Quarantäne)</h2>
        <p className="mt-3 leading-8 text-slate-300">
          Jedes Video ist risikoabgestuft klassifiziert. Nur <strong>Solo-Ratgeber</strong> dürfen überhaupt als „Chris’ Position“ gelesen werden
          (<span className="font-mono">safe_for_positions</span>). Reaktions- und Debatten-Videos sind für Positionen/Zitate gesperrt und
          liefern nur Themen-/Dedupe-Signale.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] border-collapse text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-400">
                <th className="pb-2">Kategorie</th>
                <th className="pb-2">Videos</th>
                <th className="pb-2">Nutzung</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((c) => (
                <tr key={c.label} className="border-t border-slate-800">
                  <td className="py-3 pr-3">
                    <span className={`inline-block rounded-full border px-3 py-1 text-sm font-bold ${toneClasses(c.tone)}`}>
                      {c.label}
                    </span>
                  </td>
                  <td className="py-3 pr-3 text-2xl font-black tabular-nums">{c.value}</td>
                  <td className="py-3 leading-6 text-slate-300">{c.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 text-sm leading-7 text-slate-400">
          70 nutzbar als Position · 47 in Quarantäne (Reaktion + Debatte) · 10 Vlog ignoriert. Diese Trennung schützt davor,
          dass eine zitierte Gegenmeinung versehentlich als Chris’ Wissen behandelt wird.
        </p>

        {/* Was ein Mensch noch tun muss */}
        <div className="mt-10 rounded-3xl border border-cyan-400/30 bg-cyan-500/5 p-7">
          <h2 className="text-2xl font-black text-cyan-100">Was noch ein Mensch prüfen muss</h2>
          <ul className="mt-3 space-y-2 leading-8 text-slate-200">
            <li>· Wörtliche Zitate vor Veröffentlichung am Originalvideo abgleichen.</li>
            <li>· Zahlen/Studienangaben nicht aus den Transkripten übernehmen, sondern extern belegen.</li>
            <li>· Stichprobe der automatischen Kategorisierung durch Chris/Team bestätigen lassen.</li>
          </ul>
          <p className="mt-4 text-sm text-slate-400">
            Kurz: Die Wissensbasis beschleunigt die Vorarbeit — die Freigabe bleibt beim Menschen.
          </p>
        </div>

        <div className="mt-10 flex flex-wrap gap-3 text-sm">
          <Link href="/" className="rounded-full border border-slate-700 px-4 py-2 font-bold text-slate-200 hover:bg-slate-800">
            ← Start
          </Link>
          <Link href="/status" className="rounded-full border border-slate-700 px-4 py-2 font-bold text-slate-200 hover:bg-slate-800">
            Status
          </Link>
          <Link href="/application-brief" className="rounded-full border border-slate-700 px-4 py-2 font-bold text-slate-200 hover:bg-slate-800">
            Brief
          </Link>
        </div>
      </section>
    </main>
  );
}
