"use client";

import { useEffect, useState } from "react";
import type { TruthRecord } from "@/lib/types";

type Props = { onTruths: (truths: TruthRecord[]) => void };
type ScanResponse = { ok?: boolean; truths?: TruthRecord[]; chunks?: number; error?: string; hint?: string };

export function ChrisScanner({ onTruths }: Props) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
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

  async function scanManual() {
    if (!canWrite) {
      setStatus("Die öffentliche Prüfansicht ist schreibgeschützt. Wissensimporte benötigen Admin-Zugang.");
      return;
    }
    if (!transcript.trim() || transcript.trim().length < 120) {
      setStatus("Bitte ein geprüftes Transkript mit mindestens 120 Zeichen einfügen.");
      return;
    }
    setLoading(true);
    setStatus("Scanne geprüftes Transkript …");
    try {
      const response = await fetch("/api/chris-scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, title, transcript, source: "manual" }),
      });
      const data = (await response.json().catch(() => ({}))) as ScanResponse;
      if (!response.ok || !data.ok) throw new Error(data.hint || data.error || "Scan fehlgeschlagen");
      onTruths(data.truths ?? []);
      setStatus(`${data.truths?.length ?? 0} Positionen aus ${data.chunks ?? 0} Text-Chunks übernommen.`);
      setTranscript("");
      setTitle("");
      setUrl("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Scan fehlgeschlagen.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="knowledge-importer" aria-label="Christian Memory Pipeline">
      <div className="knowledge-importer-head">
        <span className="truth-topic">Christian-Wissensbasis</span>
        <h3>Geprüftes Christian-Transkript auswerten</h3>
        <p>
          Der automatische Channel-Scan ist bewusst deaktiviert. Hier werden nur bereits geprüfte Quellen und Transkripte in Themen, Chunks und wiederverwendbare Positionen zerlegt.
        </p>
      </div>

      <div className="knowledge-pipeline">
        <div><strong>1</strong><span>Quelle</span><small>geprüfter Link</small></div>
        <div><strong>2</strong><span>Transkript</span><small>gesprochenes Wort</small></div>
        <div><strong>3</strong><span>Chunks</span><small>Themenblöcke</small></div>
        <div><strong>4</strong><span>Positionen</span><small>O-Ton-Vorschläge</small></div>
        <div><strong>5</strong><span>Review</span><small>menschlich freigeben</small></div>
      </div>

      <div className="knowledge-source-card">
        <div>
          <span className="truth-topic">Berechtigung</span>
          <h3>{canWrite ? "Admin-Schreibzugang aktiv" : "Öffentliche Prüfansicht"}</h3>
          <p>{canWrite ? "Geprüfte Transkripte können in die gemeinsame Wissensbasis übernommen werden." : "Vorhandene Positionen sind lesbar. Neue Wissenseinträge und Transkriptimporte bleiben schreibgeschützt."}</p>
        </div>
        <span className={canWrite ? "chip" : "chip warn"}>{canWrite ? "Import erlaubt" : "Schreibschutz"}</span>
      </div>

      <div className="knowledge-form-grid">
        <label><span>Video / Quelle</span><input className="search-field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titel oder Kontext" disabled={!canWrite || loading} /></label>
        <label><span>URL</span><input className="search-field" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="YouTube/TikTok/Instagram-Link" disabled={!canWrite || loading} /></label>
      </div>
      <label className="knowledge-wide-field">
        <span>Geprüftes Transkript / gesprochener Text</span>
        <textarea className="search-field" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Christian sagt hier ..." rows={8} disabled={!canWrite || loading} />
      </label>
      <div className="knowledge-import-actions">
        <button className="button primary" onClick={scanManual} disabled={!canWrite || loading}>{loading ? "Scanne …" : canWrite ? "Transkript auswerten und speichern" : "Admin-Zugang erforderlich"}</button>
        {status && <span className="chip" role="status">{status}</span>}
      </div>
    </section>
  );
}
