"use client";

import { useEffect, useState } from "react";
import type { TruthRecord } from "@/lib/types";

type Props = {
  onImported: (truth: TruthRecord) => void;
};

type FormState = {
  topic: string;
  statement: string;
  quote: string;
  url: string;
  videoTitle: string;
  keywords: string;
};

export function TruthImporter({ onImported }: Props) {
  const [form, setForm] = useState<FormState>({ topic: "", statement: "", quote: "", url: "", videoTitle: "", keywords: "" });
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [canWrite, setCanWrite] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/claims")
      .then((response) => response.json() as Promise<{ writable?: boolean }>)
      .then((data) => { if (!cancelled) setCanWrite(Boolean(data.writable)); })
      .catch(() => { if (!cancelled) setCanWrite(false); });
    return () => { cancelled = true; };
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    if (!canWrite) {
      setStatus("Die öffentliche Prüfansicht ist schreibgeschützt. Wissensimporte benötigen Admin-Zugang.");
      return;
    }
    if (!form.topic.trim() || !form.statement.trim()) {
      setStatus("Bitte Thema und Position ausfüllen.");
      return;
    }
    setLoading(true);
    setStatus("Importiere Wissen …");
    try {
      const response = await fetch("/api/truths", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; saved?: boolean; truth?: TruthRecord; error?: string; hint?: string };
      if (!response.ok || !data.ok || !data.truth) throw new Error(data.hint || data.error || "Import fehlgeschlagen");
      onImported(data.truth);
      setStatus(data.saved ? "Wissen gespeichert." : "Wissen verarbeitet, aber nicht im gemeinsamen Store gespeichert.");
      setForm({ topic: "", statement: "", quote: "", url: "", videoTitle: "", keywords: "" });
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Import fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="knowledge-importer" aria-label="Wissen importieren">
      <div className="knowledge-importer-head">
        <span className="truth-topic">Importer</span>
        <h3>Chris-Position importieren</h3>
        <p>Lege fachliche Positionen, O-Töne und Quellen so ab, dass sie später in der Vollprüfung wiederverwendet werden.</p>
      </div>
      {!canWrite && <p className="candidate-review-note">Öffentliche Prüfansicht: Die vorhandene Wissensbasis ist lesbar, neue Einträge bleiben schreibgeschützt.</p>}
      <div className="knowledge-form-grid">
        <label><span>Thema</span><input className="search-field" value={form.topic} onChange={(event) => update("topic", event.target.value)} placeholder="z. B. Heißhunger" disabled={!canWrite || loading} /></label>
        <label><span>Quelle / Video</span><input className="search-field" value={form.videoTitle} onChange={(event) => update("videoTitle", event.target.value)} placeholder="Video, Podcast, Notiz" disabled={!canWrite || loading} /></label>
        <label><span>Link</span><input className="search-field" value={form.url} onChange={(event) => update("url", event.target.value)} placeholder="https://… optional" disabled={!canWrite || loading} /></label>
        <label><span>Keywords</span><input className="search-field" value={form.keywords} onChange={(event) => update("keywords", event.target.value)} placeholder="protein, stress, hunger" disabled={!canWrite || loading} /></label>
      </div>
      <label className="knowledge-wide-field"><span>Fachliche Position</span><textarea className="search-field" value={form.statement} onChange={(event) => update("statement", event.target.value)} placeholder="Was ist die saubere Chris-Position zu diesem Thema?" rows={4} disabled={!canWrite || loading} /></label>
      <label className="knowledge-wide-field"><span>O-Ton / Hook-Satz</span><textarea className="search-field" value={form.quote} onChange={(event) => update("quote", event.target.value)} placeholder="Kurz, direkt, zitierfähig. Optional." rows={3} disabled={!canWrite || loading} /></label>
      <div className="knowledge-import-actions">
        <button className="button primary" onClick={submit} disabled={!canWrite || loading}>{loading ? "Importiere …" : canWrite ? "Wissen importieren" : "Admin-Zugang erforderlich"}</button>
        {status && <span className="chip" role="status">{status}</span>}
      </div>
    </section>
  );
}
