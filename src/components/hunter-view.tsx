"use client";

import { useState } from "react";
import { ArrowUpRight, Check, ClipboardPlus, Database, Loader2, Radar, ShieldAlert, Sparkles, X } from "lucide-react";
import { compactNumber, dateLabel } from "@/lib/format";
import type { HunterCandidate, HunterProfile, HunterRun } from "@/lib/types";

type Props = {
  configured: boolean;
  profiles: HunterProfile[];
  candidates: HunterCandidate[];
  runs: HunterRun[];
  isRunning: boolean;
  onRun: () => void;
  onPromote: (candidate: HunterCandidate) => void;
  onReject: (candidate: HunterCandidate) => void;
};

type ManualImportState = {
  url: string;
  creator: string;
  title: string;
  claim: string;
  note: string;
};

const EMPTY_MANUAL: ManualImportState = { url: "", creator: "", title: "", claim: "", note: "" };

function candidatePreview(candidate: HunterCandidate) {
  return candidate.transcriptSnippet || candidate.description || candidate.reason || "Kein Claim-Preview verfügbar.";
}

function transcriptSourceLabel(candidate: HunterCandidate) {
  if (candidate.transcriptSource === "youtube-captions") return "importierte Untertitel";
  if (candidate.transcriptSource === "description") return "Beschreibung/Caption";
  if (candidate.transcriptSource === "apify") return "Apify-Caption/Subtitles";
  if (candidate.transcriptSource === "curated") return "manuell geprüftes Transkript";
  return "Transkript fehlt";
}

function transcriptQuality(candidate: HunterCandidate) {
  if (candidate.transcriptSource === "youtube-captions" || candidate.transcriptSource === "curated") return "stark";
  if (candidate.transcriptSource === "apify" && (candidate.transcriptSnippet?.length ?? 0) >= 180) return "mittel";
  if (candidate.transcriptSnippet && candidate.transcriptSnippet.length >= 90) return "mittel";
  return "schwach";
}

function reviewStatus(candidate: HunterCandidate) {
  if (candidate.status === "needs_transcript") return "braucht Transkript";
  if (candidate.status === "rejected") return "abgelehnt";
  if (candidate.status === "promoted") return "übernommen";
  if (transcriptQuality(candidate) === "schwach") return "nur Vorprüfung";
  return "prüfbar";
}

function reviewNote(candidate: HunterCandidate) {
  if (transcriptQuality(candidate) === "stark") return "Analyse basiert auf belastbarer Import-/Transkript-Basis. Trotzdem final durch Mensch freigeben.";
  if (transcriptQuality(candidate) === "mittel") return "Prüfkandidat: Caption/Apify-Text vorhanden, aber Originalaussage vor Veröffentlichung kontrollieren.";
  return "Noch kein belastbares Transkript. Nicht als Falschaussage verwenden, erst Originalzitat sichern.";
}

function metadataSignals(candidate: HunterCandidate) {
  const signals = [
    candidate.creator && "Creator",
    candidate.description && "Caption/Beschreibung",
    candidate.publishedAt && "Zeitpunkt",
    candidate.views > 0 && "Views",
    candidate.likes > 0 && "Likes",
    candidate.comments > 0 && "Kommentare",
    candidate.thumbnail && "Thumbnail",
    candidate.language && "Sprache",
    candidate.contentKind && "Format",
  ].filter(Boolean);
  return signals as string[];
}

function marketLaneLabel(candidate: HunterCandidate) {
  const signals = metadataSignals(candidate).length;
  if (candidate.status === "needs_transcript") return `${signals} Metadaten-Signale gespeichert · Claim wartet auf gesprochenes Wort`;
  if (transcriptQuality(candidate) === "stark") return `${signals} Metadaten-Signale + starke Transcript-Basis`;
  return `${signals} Metadaten-Signale · nur Market/Scout, noch kein sicherer Claim`;
}

function hunterRunSummary(run?: HunterRun) {
  if (!run) return "Noch kein Lauf. Starte den Live-Radar oder lege einen Claim manuell an.";
  const quality = run.qualityPassed ?? run.candidatesSaved;
  if (quality > 0 || run.promotedClaims > 0) {
    return `${quality} Qualitäts-Kandidaten · ${run.discardedCandidates ?? 0} verworfen · ${run.promotedClaims} Claims übernommen.`;
  }
  const reasons = Object.entries(run.discardReasons ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([reason, count]) => `${reason}: ${count}`)
    .join(" · ");
  return reasons
    ? `0 neue Qualitäts-Kandidaten. Filtergründe: ${reasons}. Das ist ein Qualitätsfilter, kein Verbindungsabbruch.`
    : "0 neue Qualitäts-Kandidaten. Häufige Gründe: Duplikate, zu wenig Reichweite, keine klare deutschsprachige Aussage oder fehlendes Transkript.";
}

export function HunterView({ configured, profiles, candidates, runs, isRunning, onRun, onPromote, onReject }: Props) {
  const [manual, setManual] = useState(EMPTY_MANUAL);
  const [manualStatus, setManualStatus] = useState<string>("");

  const pending = candidates.filter((c) => c.status === "new" || c.status === "triaged" || c.status === "needs_transcript");
  const topCandidates = pending.sort((a, b) => b.score - a.score).slice(0, 6);
  const latestRun = runs[0];
  const metadataAssets = candidates.filter((candidate) => metadataSignals(candidate).length >= 4).length;
  const transcriptReady = candidates.filter((candidate) => transcriptQuality(candidate) === "stark").length;
  const transcriptNeeded = candidates.filter((candidate) => candidate.status === "needs_transcript" || transcriptQuality(candidate) !== "stark").length;
  const trackedReach = candidates.reduce((sum, candidate) => sum + (candidate.views || 0), 0);
  const platformsTracked = Array.from(new Set(candidates.map((candidate) => candidate.platform))).filter(Boolean);
  const activeProfiles = profiles.filter((p) => p.enabled).length;

  async function submitManual(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setManualStatus("Manueller Claim wird geprüft …");
    try {
      const response = await fetch("/api/manual-claim", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(manual),
      });
      if (!response.ok) throw new Error("manual claim failed");
      setManualStatus("Manueller Claim wurde als Prüfkandidat angelegt.");
      setManual(EMPTY_MANUAL);
    } catch {
      setManualStatus("Import fehlgeschlagen. Bitte URL und Claim prüfen.");
    }
  }

  return (
    <section className="hunter-hero hunter-command" aria-label="Claim-Radar Command Center">
      <div className="hunter-command-head">
        <div className="hunter-copy">
          <p className="section-label">Claim-Radar Command Center</p>
          <h2>Jäger-Screen für neue Fitness-Claims</h2>
          <p>
            Suchprofile, Live-Läufe, Datenbank-Assets und manuelle Claims laufen hier in einem kontrollierten Intake zusammen.
            Claims werden erst nach belastbarer Aussagebasis und menschlicher Freigabe zu Fällen.
          </p>
        </div>
        <div className="hunter-actions hunter-command-actions">
          <button className="primary-btn" onClick={onRun} disabled={isRunning}>
            {isRunning ? <Loader2 size={18} className="spin" /> : <Radar size={18} />} Live-Radar starten
          </button>
          <span className={configured ? "status-pill ok" : "status-pill warn"}>
            {configured ? "Apify/Supabase verbunden" : "Provider fehlt"}
          </span>
        </div>
      </div>

      <div className="hunter-stats-grid hunter-kpi-row">
        <span><strong>{activeProfiles}</strong> aktive Profile</span>
        <span><strong>{pending.length}</strong> offene Prüfkandidaten</span>
        <span><strong>{latestRun ? dateLabel(latestRun.startedAt) : "noch nie"}</strong> letzter Lauf</span>
        <span><strong>{compactNumber(trackedReach)}</strong> getrackte Reichweite</span>
      </div>

      <div className="hunter-grid hunter-command-grid">
        <section className="hunter-card">
          <div className="hunter-card-head">
            <ShieldAlert size={18} />
            <h3>Suchprofile</h3>
          </div>
          <div className="profile-list">
            {profiles.length ? profiles.slice(0, 4).map((profile) => (
              <article key={profile.id}>
                <strong>{profile.name}</strong>
                <p>{profile.platforms.join(" · ")} · min. {compactNumber(profile.minViews)} Views · Score {profile.minScore}+</p>
                <span>{profile.queries.slice(0, 2).join(" / ")}</span>
              </article>
            )) : <p className="empty-state">Noch kein Suchprofil geladen. Prüfe Supabase oder lege ein Profil an.</p>}
          </div>
        </section>

        <section className="hunter-card">
          <div className="hunter-card-head">
            <Radar size={18} />
            <h3>Letzter Lauf</h3>
          </div>
          <p className="candidate-review-note">{hunterRunSummary(latestRun)}</p>
          {latestRun?.errors?.length ? <p className="candidate-review-note">Hinweis: {latestRun.errors.slice(0, 2).join(" · ")}</p> : null}
        </section>

        <section className="hunter-card">
          <div className="hunter-card-head">
            <Database size={18} />
            <h3>Datenbank-Asset</h3>
          </div>
          <div className="hunter-mini-stats">
            <span><strong>{metadataAssets}</strong> Metadata-Assets</span>
            <span><strong>{transcriptReady}</strong> transcript-ready</span>
            <span><strong>{transcriptNeeded}</strong> warten auf Sprache</span>
          </div>
          <p className="candidate-review-note">
            Plattformen: {platformsTracked.length ? platformsTracked.join(" · ") : "noch keine"}. Claims entstehen erst nach verifiziertem gesprochenem Wort.
          </p>
        </section>

        <section className="hunter-card">
          <div className="hunter-card-head">
            <Sparkles size={18} />
            <h3>Nächster Schritt</h3>
          </div>
          {topCandidates.length ? (
            <div className="candidate-list">
              {topCandidates.map((candidate) => (
                <article key={candidate.id} className="candidate-card">
                  <div>
                    <strong>{candidate.title}</strong>
                    <p>{candidate.creator} · {candidate.platform} · {compactNumber(candidate.views)} Views · Score {candidate.score}</p>
                    <div className="candidate-meta-row" aria-label="Analysebasis">
                      <span className="status-pill">Quelle: {transcriptSourceLabel(candidate)}</span>
                      <span className={transcriptQuality(candidate) === "stark" ? "status-pill ok" : "status-pill warn"}>Transkriptqualität: {transcriptQuality(candidate)}</span>
                      <span className="status-pill">Status: {reviewStatus(candidate)}</span>
                    </div>
                    <div className="candidate-meta-row" aria-label="Market-Intelligence-Basis">
                      <span className="status-pill">Market-Lane: {marketLaneLabel(candidate)}</span>
                    </div>
                    <span>{candidatePreview(candidate)}</span>
                    <p className="candidate-review-note">{reviewNote(candidate)}</p>
                    {candidate.qualityReason && <p className="candidate-review-note">Qualitätsgrund: {candidate.qualityReason}</p>}
                  </div>
                  <div className="candidate-actions">
                    <button onClick={() => onPromote(candidate)} disabled={candidate.status === "needs_transcript"}><Check size={16} /> übernehmen</button>
                    <button onClick={() => onReject(candidate)}><X size={16} /> ablehnen</button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-state">Noch keine offenen Prüfkandidaten. Starte einen Lauf oder importiere einen Claim manuell. Wenn ein Lauf 0 Kandidaten liefert, zeigt die Karte „Letzter Lauf“ die Filtergründe.</p>
          )}
        </section>

        <section className="hunter-card">
          <div className="hunter-card-head">
            <ClipboardPlus size={18} />
            <h3>Claim einwerfen</h3>
          </div>
          <form className="manual-claim-form" onSubmit={submitManual}>
            <input value={manual.url} onChange={(e) => setManual((m) => ({ ...m, url: e.target.value }))} placeholder="YouTube-/Social-URL" />
            <input value={manual.creator} onChange={(e) => setManual((m) => ({ ...m, creator: e.target.value }))} placeholder="Creator" />
            <input value={manual.title} onChange={(e) => setManual((m) => ({ ...m, title: e.target.value }))} placeholder="Video-/Post-Titel" />
            <textarea value={manual.claim} onChange={(e) => setManual((m) => ({ ...m, claim: e.target.value }))} placeholder="Konkrete Aussage" />
            <textarea value={manual.note} onChange={(e) => setManual((m) => ({ ...m, note: e.target.value }))} placeholder="Notiz / Kontext" />
            <button className="primary-btn" type="submit"><ArrowUpRight size={16} /> Als Prüfkandidat speichern</button>
          </form>
          {manualStatus && <p className="manual-status">{manualStatus}</p>}
        </section>
      </div>
    </section>
  );
}
