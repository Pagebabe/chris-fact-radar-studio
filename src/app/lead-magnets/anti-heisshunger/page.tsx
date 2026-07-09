import Link from "next/link";

const pdfReady = true;
const pdfHref = "/anti-heisshunger-system.pdf";

const chapters = [
  "Die Disziplin-Lüge: Warum mehr Willenskraft selten reicht",
  "Gehirn & Belohnung: Warum Süßes so stark zieht",
  "Trigger-Foods erkennen und entschärfen",
  "Küchen-Audit: Umgebung so bauen, dass gute Entscheidungen leichter werden",
  "Stressessen verstehen: Gefühl, Gewohnheit, Ersatzhandlung",
  "Fressattacken-Kreislauf: stoppen ohne Kompensation",
  "Protein, Ballaststoffe und Sättigung im Alltag",
  "Snack-Swaps, Notfallkarte und 7-Tage-Plan",
];

const tools = [
  "3-Zonen-Küchenregel",
  "Stressessen-Check",
  "Fressattacken-Reset-Protokoll",
  "Protein-Snack-Liste",
  "Abend-Notfallkarte",
  "7-Tage-Anti-Heißhunger-Plan",
];

const evidence = [
  "Protein und Ballaststoffe unterstützen Sättigung und machen es leichter, Mahlzeiten stabil zu halten.",
  "Sehr schmackhafte Kombinationen aus Zucker, Fett und Salz können Essimpulse verstärken — vor allem bei hoher Verfügbarkeit.",
  "Stress, Schlafmangel und Abendmüdigkeit beeinflussen Hunger, Belohnungssystem und Impulskontrolle.",
  "Nach einer Fressattacke ist extremes Kompensieren meist kontraproduktiv. Der bessere Reset ist: normale Mahlzeiten, Wasser, Schlaf und ein klarer nächster Standard.",
];

export default function AntiHeisshungerPage() {
  return (
    <main className="min-h-screen bg-[#08080b] text-white">
      <section className="mx-auto max-w-6xl space-y-10 px-6 py-10">
        <div className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 p-5 text-cyan-50">
          <p className="text-sm font-black uppercase tracking-[0.24em] text-cyan-200">Asset aus dem System</p>
          <p className="mt-2 leading-7 text-cyan-50/90">
            Diese Seite zeigt den kreativen Output der Content-Operation: Chris Fact Radar findet und strukturiert Themen,
            das Anti-Heißhunger-System übersetzt Chris&apos; Video-Logik in ein nutzbares Community-Freebie mit Check-Funnel.
          </p>
        </div>

        <div className="grid gap-8 rounded-[2rem] border border-rose-300/30 bg-gradient-to-br from-rose-950 via-slate-950 to-black p-8 shadow-2xl shadow-rose-950/30 md:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-[0.28em] text-rose-200">Lead Magnet / Fitness Coaching</p>
            <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">Das Anti-Heißhunger-System</h1>
            <p className="mt-4 text-xl font-bold text-rose-100">
              Süßhunger, Stressessen und Fressattacken in den Griff bekommen — ohne Verbote, Crash-Diät oder noch mehr Schuldgefühle.
            </p>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">
              Das E-Book ist der erste fertige Lead-Magnet aus dem Chris-Fact-Radar-Gedanken: aus gesprochenem Content wird
              ein praktisches System mit Routinen, Reset-Plan, Snack-Ideen und einem nächsten Schritt in den Check-Funnel.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm font-black">
              <span className="rounded-full bg-rose-200 px-4 py-2 text-rose-950">kein Crash-Diät-Vibe</span>
              <span className="rounded-full bg-amber-200 px-4 py-2 text-amber-950">praktische Routinen</span>
              <span className="rounded-full bg-emerald-200 px-4 py-2 text-emerald-950">Check-Funnel integriert</span>
            </div>
            <div className="mt-7 flex flex-wrap gap-3">
              {pdfReady && (
                <>
                  <a href={pdfHref} className="rounded-full bg-white px-6 py-3 text-sm font-black text-rose-950 hover:bg-rose-100">
                    E-Book (PDF) öffnen
                  </a>
                  <a href={pdfHref} download className="rounded-full border border-white/40 px-6 py-3 text-sm font-black text-white hover:bg-white hover:text-rose-950">
                    PDF herunterladen
                  </a>
                </>
              )}
              <Link href="/lead-magnets/anti-heisshunger/check" className="rounded-full bg-rose-200 px-6 py-3 text-sm font-black text-rose-950 hover:bg-white">
                Heißhunger-Check starten
              </Link>
              <Link href="/" className="rounded-full border border-slate-600 px-6 py-3 text-sm font-bold text-slate-200 hover:bg-white hover:text-slate-950">
                Zur Radar-App
              </Link>
            </div>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-white/5 p-3">
            <p className="mb-2 px-3 pt-2 text-sm font-black uppercase tracking-[0.22em] text-rose-200">E-Book — echte Seiten</p>
            <div className="max-h-[560px] space-y-3 overflow-y-auto rounded-[1.2rem] bg-slate-950/40 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ebook-preview/page-01.png" alt="Anti-Heißhunger-System – Cover" className="w-full rounded-lg shadow-lg" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ebook-preview/page-02.png" alt="Anti-Heißhunger-System – Seite 2" className="w-full rounded-lg shadow-lg" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/ebook-preview/page-03.png" alt="Anti-Heißhunger-System – Vorwort" className="w-full rounded-lg shadow-lg" />
            </div>
            <a href={pdfHref} className="mt-2 block px-3 pb-1 text-sm font-bold text-rose-200 hover:text-white">
              Alle 37 Seiten als PDF öffnen ↗
            </a>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Problem</h2>
            <p className="mt-3 leading-7 text-slate-300">Viele Freebies sagen nur: Iss weniger, sei disziplinierter. Dieses E-Book erklärt Heißhunger als System aus Triggern, Stress, Schlaf, Umgebung und Sättigung.</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Lösung</h2>
            <p className="mt-3 leading-7 text-slate-300">Keine Moralpredigt, sondern Checklisten, Snack-Swaps, Reset-Protokoll, Protein-Strategie und Abend-Notfallplan.</p>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-black">Funnel</h2>
            <p className="mt-3 leading-7 text-slate-300">Der Check führt in ein Coaching-Gespräch: Wer seine Muster erkennt, ist viel näher an einem passenden Angebot.</p>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">Kapitelstruktur</h2>
            <div className="mt-5 grid gap-3">
              {chapters.map((chapter, index) => (
                <div key={chapter} className="rounded-2xl bg-slate-950 p-4 text-slate-200">
                  <span className="mr-3 font-black text-rose-300">{index + 1}</span>{chapter}
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">Konkrete Tools im Freebie</h2>
            <div className="mt-5 grid gap-3">
              {tools.map((tool) => (
                <div key={tool} className="rounded-2xl bg-slate-950 p-4 text-slate-200">✓ {tool}</div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-cyan-300/30 bg-cyan-300/10 p-6 text-cyan-50">
            <h2 className="text-2xl font-black">Warum das in die App gehört</h2>
            <p className="mt-4 leading-8 text-cyan-50/90">
              Chris Fact Radar endet nicht beim Faktencheck. Wiederkehrende Themen können zu Rebuttals, Carousels,
              Newslettern oder Lead-Magnets werden. Dieses E-Book ist der sichtbare Asset-Beweis dafür.
            </p>
            <Link href="/studio" className="mt-5 inline-flex rounded-full bg-cyan-200 px-5 py-3 text-sm font-black text-slate-950">Studio öffnen</Link>
          </div>
          <div className="rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-6 text-emerald-50">
            <h2 className="text-2xl font-black">Was die Forschung dahinter grob stützt</h2>
            <div className="mt-5 grid gap-3">
              {evidence.map((item) => (
                <p key={item} className="rounded-2xl bg-slate-950/70 p-4 leading-7 text-emerald-50/90">{item}</p>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-amber-300/40 bg-amber-300/10 p-6 text-amber-50">
          <h2 className="text-2xl font-black">Hinweis</h2>
          <p className="mt-3 leading-8">
            Dieses E-Book ersetzt keine medizinische, psychotherapeutische oder ernährungsmedizinische Beratung. Wenn regelmäßig Kontrollverlust,
            Erbrechen, extremes Kompensieren, starke Scham oder deutlicher Leidensdruck auftreten, sollte professionelle Unterstützung gesucht werden.
          </p>
        </section>
      </section>
    </main>
  );
}
