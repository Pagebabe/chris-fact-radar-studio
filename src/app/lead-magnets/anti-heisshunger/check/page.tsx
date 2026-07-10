"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

const answers = {
  time: ["morgens", "nachmittags", "abends", "nachts"],
  trigger: ["Stress", "Langeweile", "zu wenig gegessen", "Schlafmangel", "Süßes griffbereit"],
  reaction: ["normal weiteressen", "fasten", "Sportdruck", "Schuldgefühl", "Kontrollverlust"],
  protein: ["unter 20 g", "20-35 g", "35 g+", "weiß ich nicht"],
  need: ["Snack-Swaps", "mehr Struktur", "Rezepte", "Stress-Reset", "Coaching"],
};

function riskScore(data: Record<string, string>) {
  let score = 0;
  if (data.time === "abends" || data.time === "nachts") score += 2;
  if (["Stress", "Schlafmangel", "Süßes griffbereit"].includes(data.trigger)) score += 2;
  if (["fasten", "Sportdruck", "Schuldgefühl", "Kontrollverlust"].includes(data.reaction)) score += 2;
  if (data.protein === "unter 20 g" || data.protein === "weiß ich nicht") score += 1;
  if (data.need === "Coaching") score += 1;
  return score;
}

function resultFor(score: number) {
  if (score >= 6) {
    return {
      title: "Hoher Handlungsdruck",
      text: "Dein Muster spricht nicht für fehlende Disziplin, sondern für Stress, Verfügbarkeit und falsche Kompensation. Fokus: Reset-Protokoll, klare Abendroutine und Trigger-Foods aus der direkten Reichweite nehmen.",
      cta: "Beste nächste Aktion: 7 Tage Abend-Notfallplan + Coaching-Check.",
    };
  }
  if (score >= 3) {
    return {
      title: "Mittleres Risiko",
      text: "Dein Süßhunger ist wahrscheinlich an bestimmte Situationen gekoppelt. Fokus: Protein-Frühstück, Snack-Swaps und Küchen-Audit. Ein kleiner Systemumbau kann schon viel verändern.",
      cta: "Beste nächste Aktion: 3-Zonen-Küche + 2 Standardsnacks vorbereiten.",
    };
  }
  return {
    title: "Guter Startpunkt",
    text: "Dein Muster wirkt kontrollierbar. Fokus: Routinen stabilisieren, Protein hochhalten und Süßhunger nicht unnötig triggern.",
    cta: "Beste nächste Aktion: 7-Tage-Plan testen und Fortschritt tracken.",
  };
}

export default function AntiHeisshungerCheckPage() {
  const [data, setData] = useState<Record<string, string>>({});
  const [foods, setFoods] = useState("");
  const [email, setEmail] = useState("");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const score = riskScore(data);
  const result = useMemo(() => resultFor(score), [score]);
  const complete = Boolean(data.time && data.trigger && data.reaction && data.protein && data.need && foods.trim());

  const summary = `Heißhunger-Check\nZeitpunkt: ${data.time ?? "-"}\nHaupttrigger: ${data.trigger ?? "-"}\nTrigger-Foods: ${foods || "-"}\nReaktion danach: ${data.reaction ?? "-"}\nProtein erste Mahlzeit: ${data.protein ?? "-"}\nBedarf: ${data.need ?? "-"}\n${email ? `Kontakt in dieser lokalen Zusammenfassung: ${email}\n` : ""}Score: ${score}/8\nErgebnis: ${result.title}\n${result.text}`;

  async function copySummary() {
    if (!complete) return;
    try {
      await navigator.clipboard.writeText(summary);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-5xl space-y-8">
        <div className="rounded-[2rem] border border-rose-300/30 bg-gradient-to-br from-rose-950 via-slate-950 to-black p-8 shadow-2xl shadow-rose-950/30 md:p-10">
          <p className="mb-3 text-sm font-black uppercase tracking-[0.28em] text-rose-200">Kostenloser Check / Lead Funnel</p>
          <h1 className="text-4xl font-black leading-tight md:text-6xl">Heißhunger-Check</h1>
          <p className="mt-5 max-w-3xl text-lg leading-8 text-slate-300">
            Dieser Mini-Check macht aus dem E-Book einen echten Funnel: Muster erkennen, Trigger benennen,
            erste Handlung festlegen und den nächsten Coaching-Schritt vorbereiten.
          </p>
        </div>

        <section className="grid gap-5 lg:grid-cols-[1fr_0.85fr]">
          <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-2xl font-black">6 Fragen</h2>
            <div className="mt-5 space-y-6">
              <Question title="1. Wann kommt dein stärkster Süßhunger?" name="time" options={answers.time} data={data} setData={setData} />
              <Question title="2. Was ist meistens der Auslöser?" name="trigger" options={answers.trigger} data={data} setData={setData} />
              <div>
                <label className="text-sm font-black uppercase tracking-[0.18em] text-rose-200">3. Deine Top-Trigger-Foods</label>
                <textarea className="mt-3 min-h-24 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-slate-100 outline-none focus:border-rose-300" placeholder="z. B. Schokolade, Kekse, Eis..." value={foods} onChange={(event) => setFoods(event.target.value)} />
              </div>
              <Question title="4. Was passiert nach einer Fressattacke?" name="reaction" options={answers.reaction} data={data} setData={setData} />
              <Question title="5. Wie viel Protein hat deine erste richtige Mahlzeit?" name="protein" options={answers.protein} data={data} setData={setData} />
              <Question title="6. Was brauchst du am meisten?" name="need" options={answers.need} data={data} setData={setData} />
              <div>
                <label className="text-sm font-black uppercase tracking-[0.18em] text-rose-200">Optional: E-Mail nur in die kopierte Zusammenfassung aufnehmen</label>
                <input className="mt-3 w-full rounded-2xl border border-slate-700 bg-slate-950 p-4 text-slate-100 outline-none focus:border-rose-300" placeholder="name@email.de" value={email} onChange={(event) => setEmail(event.target.value)} />
                <p className="mt-2 text-xs leading-5 text-slate-400">Die Adresse wird nicht übertragen, gespeichert oder versendet.</p>
              </div>
            </div>
          </div>

          <aside className="rounded-3xl border border-emerald-300/30 bg-emerald-300/10 p-6 text-emerald-50">
            <p className="text-sm font-black uppercase tracking-[0.22em] text-emerald-200">Sofort-Auswertung</p>
            <h2 className="mt-4 text-3xl font-black">{complete ? result.title : "Beantworte die Fragen"}</h2>
            <p className="mt-4 leading-8 text-emerald-50/90">{complete ? result.text : "Sobald alle Pflichtfelder ausgefüllt sind, erscheint hier eine klare Einschätzung mit nächster Handlung."}</p>
            {complete && (
              <div className="mt-6 rounded-2xl bg-slate-950/70 p-5">
                <p className="text-sm font-black text-emerald-200">Score: {score}/8</p>
                <p className="mt-3 font-bold leading-7">{result.cta}</p>
                {email && <p className="mt-3 text-sm text-slate-300">Kontakt nur in lokaler Zusammenfassung: {email}</p>}
              </div>
            )}
            <div className="mt-6 grid gap-3">
              <button type="button" onClick={copySummary} className="rounded-full bg-emerald-200 px-6 py-3 text-sm font-black text-emerald-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50" disabled={!complete}>
                {copyStatus === "copied" ? "Auswertung kopiert" : copyStatus === "error" ? "Kopieren fehlgeschlagen" : "Auswertung kopieren"}
              </button>
              {copyStatus === "error" && <p className="text-sm text-amber-100" role="status">Der Browser hat den Zwischenablagezugriff blockiert.</p>}
              <Link href="/lead-magnets/anti-heisshunger" className="rounded-full border border-slate-500 px-6 py-3 text-center text-sm font-bold text-slate-200 hover:bg-white hover:text-slate-950">Zurück zum E-Book</Link>
            </div>
          </aside>
        </section>
      </section>
    </main>
  );
}

function Question({ title, name, options, data, setData }: { title: string; name: string; options: string[]; data: Record<string, string>; setData: React.Dispatch<React.SetStateAction<Record<string, string>>> }) {
  return (
    <div>
      <p className="text-sm font-black uppercase tracking-[0.18em] text-rose-200">{title}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = data[name] === option;
          return (
            <button key={option} type="button" onClick={() => setData((current) => ({ ...current, [name]: option }))} className={`rounded-full border px-4 py-2 text-sm font-bold transition ${active ? "border-rose-200 bg-rose-200 text-rose-950" : "border-slate-700 bg-slate-950 text-slate-200 hover:border-rose-300"}`}>
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
