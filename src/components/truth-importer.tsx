"use client";

import { useState } from "react";
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

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
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
      const data = (await response.json()) as { ok?: boolean; saved?: boolean; truth?: TruthRecord; error?: string };
      if (!response.ok || !data.ok || !data.truth) throw new Error(data.error ?? "Import fehlgeschlagen");
      onImported(data.truth);
      setStatus(data.saved ? "Wissen gespeichert." : "Wissen lokal importiert. Supabase prüfen.");
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
      <div className="knowledge-form-grid">
        <label><span>Thema</span><input className="search-field" value={form.topic} onChange={(event) => update("topic", event.target.value)} placeholder="z. B. Heißhunger" /></label>
        <label><span>Quelle / Video</span><input className="search-field" value={form.videoTitle} onChange={(event) => update("videoTitle", event.target.value)} placeholder="Video, Podcast, Notiz" /></label>
        <label><span>Link</span><input className="search-field" value={form.url} onChange={(event) => update("url", event.target.value)} placeholder="https://… optional" /></label>
        <label><span>Keywords</span><input className="search-field" value={form.keywords} onChange={(event) => update("keywords", event.target.value)} placeholder="protein, stress, hunger" /></label>
      </div>
      <label className="knowledge-wide-field"><span>Fachliche Position</span><textarea className="search-field" value={form.statement} onChange={(event) => update("statement", event.target.value)} placeholder="Was ist die saubere Chris-Position zu diesem Thema?" rows={4} /></label>
      <label className="knowledge-wide-field"><span>O-Ton / Hook-Satz</span><textarea className="search-field" value={form.quote} onChange={(event) => update("quote", event.target.value)} placeholder="Kurz, direkt, zitierfähig. Optional." rows={3} /></label>
      <div className="knowledge-import-actions">
        <button className="button primary" onClick={submit} disabled={loading}>{loading ? "Importiere …" : "Wissen importieren"}</button>
        {status && <span className="chip">{status}</span>}
      </div>
    </section>
  );
}
