"use client";

import { useState } from "react";
import type { TruthRecord } from "@/lib/types";

type Props = { onTruths: (truths: TruthRecord[]) => void };
type ScanResponse = { ok?: boolean; truths?: TruthRecord[]; chunks?: number; videos?: number; error?: string };

const DEFAULT_SOURCE = "https://www.youtube.com/@ChristianWolf";

export function ChrisScanner({ onTruths }: Props) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const [channelId, setChannelId] = useState(DEFAULT_SOURCE);
  const [maxVideos, setMaxVideos] = useState(10);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<TruthRecord[]>([]);
  const [acceptedIds, setAcceptedIds] = useState<string[]>([]);

  async function saveTruth(truth: TruthRecord) {
    const response = await fetch("/api/truths", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic: truth.topic, statement: truth.statement, quote: truth.quote, url: truth.url, videoTitle: truth.videoTitle, keywords: truth.keywords?.join(", ") }),
    });
    const data = (await response.json()) as { ok?: boolean; truth?: TruthRecord; error?: string };
    if (!response.ok || !data.ok || !data.truth) throw new Error(data.error ?? "Speichern fehlgeschlagen");
    return data.truth;
  }

  async function acceptTruth(truth: TruthRecord) {
    setLoading(true);
    setStatus("Übernehme Vorschlag …");
    try {
      const saved = await saveTruth(truth);
      onTruths([saved]);
      setAcceptedIds((current) => [...current, truth.id]);
      setStatus("1 Position in Chris-Wissen übernommen.");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Speichern fehlgeschlagen."); }
    finally { setLoading(false); }
  }

  async function acceptAll() {
    const open = suggestions.filter((truth) => !acceptedIds.includes(truth.id));
    if (open.length === 0) return;
    setLoading(true);
    setStatus("Übernehme geprüfte Vorschläge …");
    try {
      const saved = [];
      for (const truth of open) saved.push(await saveTruth(truth));
      onTruths(saved);
      setAcceptedIds((current) => [...current, ...open.map((truth) => truth.id)]);
      setStatus(`${saved.length} Positionen in Chris-Wissen übernommen.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "Speichern fehlgeschlagen."); }
    finally { setLoading(false); }
  }

  async function scanManual() {
    if (!transcript.trim() || transcript.trim().length < 120) { setStatus("Bitte Transkript oder längeren Christian-Text einfügen."); return; }
    setLoading(true);
    setStatus("Scanne manuelles Transkript …");
    try {
      const response = await fetch("/api/chris-scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "manual", url, title, transcript, source: "manual" }) });
      const data = (await response.json()) as ScanResponse;
      if (!response.ok || !data.ok) throw new Error(data.error ?? "Scan fehlgeschlagen");
      onTruths(data.truths ?? []);
      setStatus(`${data.truths?.length ?? 0} Positionen direkt übernommen.`);
      setTranscript(""); setTitle(""); setUrl("");
    } catch (error) { setStatus(error instanceof Error ? error.message : "Scan fehlgeschlagen."); }
    finally { setLoading(false); }
  }

  async function scanChannel() {
    if (!channelId.trim()) { setStatus("Bitte YouTube-Link, Handle oder Channel-ID einfügen."); return; }
    setLoading(true);
    setStatus("Starte Christian-Wissen-Scan …");
    setSuggestions([]);
    setAcceptedIds([]);
    try {
      const response = await fetch("/api/chris-scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ mode: "youtube-channel", channelId, maxVideos, reviewOnly: true }) });
      const data = (await response.json()) as ScanResponse;
      if (!response.ok || !data.ok) throw new Error(data.error ?? "YouTube-Scan fehlgeschlagen");
      setSuggestions(data.truths ?? []);
      setStatus(`${data.videos ?? 0}/${maxVideos} Christian-Videos ausgewertet · ${data.chunks ?? 0} Chunks · ${data.truths?.length ?? 0} O-Ton-Vorschläge.`);
    } catch (error) { setStatus(error instanceof Error ? error.message : "YouTube-Scan fehlgeschlagen."); }
    finally { setLoading(false); }
  }

  return (
    <section className="knowledge-importer" aria-label="Christian Memory Pipeline">
      <div className="knowledge-importer-head">
        <span className="truth-topic">Christian-Wissensbasis</span>
        <h3>Christian-Videos als Wissensbasis auswerten</h3>
        <p>Christian-Inhalte werden indexiert, gechunkt und als O-Ton-Vorschläge in die Review-Queue gelegt.</p>
      </div>

      <div className="knowledge-pipeline">
        <div><strong>1</strong><span>Videos</span><small>Christian-Quelle</small></div>
        <div><strong>2</strong><span>Transkript</span><small>Caption/Fallback</small></div>
        <div><strong>3</strong><span>Rohdaten</span><small>Video + Text + Meta</small></div>
        <div><strong>4</strong><span>Chunks</span><small>Themen & O-Töne</small></div>
        <div><strong>5</strong><span>Review</span><small>Chris-Wissen freigeben</small></div>
      </div>

      <div className="knowledge-source-card">
        <div>
          <span className="truth-topic">Quelle</span>
          <h3>Christian Wolf · Videos</h3>
          <p>Ziel: echte Chris-Positionen für Matching, Vollprüfung und Reaction-Skripte statt nur einem wiederholten Beispielzitat.</p>
        </div>
        <span className="chip">Wissens-Scan</span>
      </div>

      <div className="knowledge-form-grid">
        <label><span>YouTube Link / Handle / Channel-ID</span><input className="search-field" value={channelId} onChange={(event) => setChannelId(event.target.value)} placeholder={DEFAULT_SOURCE} /></label>
        <label><span>Anzahl Christian-Videos</span><input className="search-field" type="number" min={1} max={10} value={maxVideos} onChange={(event) => setMaxVideos(Math.min(10, Number(event.target.value) || 10))} /></label>
      </div>
      <div className="knowledge-import-actions">
        <button className="button primary" onClick={scanChannel} disabled={loading}>{loading ? "Werte Videos aus …" : "Wissens-Scan starten"}</button>
        {suggestions.length > 0 && <button className="button" onClick={acceptAll} disabled={loading}>Alle geprüften übernehmen</button>}
        {status && <span className="chip">{status}</span>}
      </div>

      {suggestions.length > 0 && (
        <div className="knowledge-review-list">
          <div className="knowledge-card-head"><span className="truth-topic">Review-Queue</span><span className="chip warn">{suggestions.length - acceptedIds.length} offen</span></div>
          {suggestions.map((truth) => {
            const accepted = acceptedIds.includes(truth.id);
            return (
              <article key={truth.id} className="knowledge-truth-card">
                <div className="knowledge-card-head"><span className="truth-topic">{truth.topic}</span><span className="chip">{Math.round((truth.confidence ?? 0.6) * 100)}% Vorschlag</span>{accepted && <span className="chip">übernommen</span>}</div>
                <h3>{truth.statement}</h3>
                <blockquote>&bdquo;{truth.quote}&ldquo;</blockquote>
                <div className="knowledge-card-foot"><a href={truth.url} target="_blank" rel="noopener noreferrer">{truth.videoTitle} ↗</a><button className="button" onClick={() => acceptTruth(truth)} disabled={loading || accepted}>{accepted ? "Übernommen" : "Freigeben"}</button></div>
              </article>
            );
          })}
        </div>
      )}

      <details className="knowledge-side-card" style={{ marginTop: 18 }}>
        <summary><strong>Manuelles Transkript importieren</strong></summary>
        <div className="knowledge-form-grid" style={{ marginTop: 14 }}>
          <label><span>Video / Quelle</span><input className="search-field" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Titel oder Kontext" /></label>
          <label><span>URL</span><input className="search-field" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="YouTube/TikTok/Instagram-Link" /></label>
        </div>
        <label className="knowledge-wide-field"><span>Transkript / gesprochener Text</span><textarea className="search-field" value={transcript} onChange={(event) => setTranscript(event.target.value)} placeholder="Christian sagt hier ..." rows={7} /></label>
        <div className="knowledge-import-actions"><button className="button" onClick={scanManual} disabled={loading}>{loading ? "Scanne …" : "Transkript direkt übernehmen"}</button></div>
      </details>
    </section>
  );
}
