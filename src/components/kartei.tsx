"use client";

import { useEffect, useState } from "react";
import type { ClaimItem, CreatorRecord } from "@/lib/types";
import { buildCreatorDossierMarkdown, creatorSeverityLabel } from "@/lib/creators";

type Props = {
  creators: CreatorRecord[];
  claims: ClaimItem[];
  onToggleWatch: (id: string) => void;
  onOpenClaim?: (id: string) => void;
};

export function Kartei({ creators, claims, onToggleWatch, onOpenClaim }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(() => creators[0]?.id ?? null);
  const [copied, setCopied] = useState(false);
  const [watchOverrides, setWatchOverrides] = useState<Record<string, boolean>>({});
  const [canWrite, setCanWrite] = useState(false);
  const [watchingId, setWatchingId] = useState<string | null>(null);
  const [watchStatus, setWatchStatus] = useState("");
  const selected = creators.find((creator) => creator.id === selectedId) ?? creators[0] ?? null;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/claims")
      .then((response) => response.json() as Promise<{ writable?: boolean }>)
      .then((data) => { if (!cancelled) setCanWrite(Boolean(data.writable)); })
      .catch(() => { if (!cancelled) setCanWrite(false); });
    return () => { cancelled = true; };
  }, []);

  function isWatched(creator: CreatorRecord) {
    return watchOverrides[creator.id] ?? creator.watched;
  }

  async function toggleWatch(creator: CreatorRecord) {
    if (!canWrite) {
      setWatchStatus("Die öffentliche Prüfansicht ist schreibgeschützt. Watchlist-Änderungen benötigen Admin-Zugang.");
      return;
    }
    const next = !isWatched(creator);
    setWatchingId(creator.id);
    setWatchStatus("Watchlist wird aktualisiert …");
    try {
      const response = await fetch(`/api/hunter/creators/${encodeURIComponent(creator.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched: next }),
      });
      const data = (await response.json().catch(() => ({}))) as { ok?: boolean; reason?: string; error?: string; hint?: string };
      if (!response.ok || !data.ok) throw new Error(data.hint || data.reason || data.error || "Watchlist konnte nicht gespeichert werden");
      setWatchOverrides((current) => ({ ...current, [creator.id]: next }));
      onToggleWatch(creator.id);
      setWatchStatus(next ? "Creator wurde zur Watchlist hinzugefügt." : "Creator wurde von der Watchlist entfernt.");
    } catch (error) {
      setWatchStatus(error instanceof Error ? error.message : "Watchlist konnte nicht gespeichert werden.");
    } finally {
      setWatchingId(null);
    }
  }

  function exportDossier(creator: CreatorRecord) {
    const md = buildCreatorDossierMarkdown(creator, claims);
    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const creatorClaims = selected
    ? claims.filter(
        (c) =>
          (c.sourceVideo.channelId === selected.channelId || c.sourceVideo.creator === selected.name) &&
          (c.verdict === "misleading" || c.verdict === "likely_false") &&
          c.decision !== "rejected",
      ).sort((a, b) => b.sourceVideo.publishedAt.localeCompare(a.sourceVideo.publishedAt))
    : [];

  return (
    <div className="kartei-layout">
      <section className="kartei-main" aria-label="Creator-Akten">
        <div className="kartei-header">
          <div>
            <p className="section-label">Creator-Akten</p>
            <h2>Kanäle mit dokumentierten Risikoclaims</h2>
            <p className="kartei-hint">
              Jede Akte bündelt Profil, Plattform, dokumentierte Aussagen, Reichweite und Watchlist-Status. So sieht das Content-Team sofort, welche Kanäle für Reaktionen relevant sind.
            </p>
          </div>
          <div className="kartei-header-chips">
            <span className="chip">{creators.length} Profile</span>
            <span className={canWrite ? "chip" : "chip amber"}>{canWrite ? "Admin-Schreibzugang" : "Prüfansicht · Schreibschutz"}</span>
            {creators.filter((creator) => creator.status === "suggested").length > 0 && (
              <span className="chip amber">{creators.filter((creator) => creator.status === "suggested").length} Vorschläge</span>
            )}
          </div>
        </div>
        {watchStatus && <p className="candidate-review-note" role="status">{watchStatus}</p>}
        <div className="creator-card-grid">
          {creators.map((c) => {
            const sev = creatorSeverityLabel(c);
            const watched = isWatched(c);
            return (
              <article key={c.id} className={`creator-card${selected?.id === c.id ? " selected" : ""}`}>
                <button className="creator-card-main" onClick={() => setSelectedId(c.id)} aria-pressed={selected?.id === c.id}>
                  <img className="creator-avatar" src={c.avatarUrl || avatarFallback(c.name)} alt="" loading="lazy" />
                  <span className="creator-card-copy"><strong>{c.name}</strong><span>{creatorMeta(c)}</span></span>
                  <span className={`severity-badge severity-${sev}`}>{sev}</span>
                </button>
                <div className="creator-card-stats"><span><strong>{c.falschaussagenCount}</strong> Claims</span><span><strong>{(c.totalViews / 1_000_000).toFixed(1)} Mio.</strong> Views</span></div>
                <button
                  className={`watch-btn${watched ? " active" : ""}`}
                  onClick={() => toggleWatch(c)}
                  disabled={!canWrite || watchingId === c.id}
                  title={canWrite ? "Watchlist aktualisieren" : "Admin-Schreibzugang erforderlich"}
                >
                  {watchingId === c.id ? "Speichert …" : watched ? "Auf Watchlist" : canWrite ? "Beobachten" : "Watchlist gesperrt"}
                </button>
              </article>
            );
          })}
        </div>
      </section>

      <aside className="kartei-detail" aria-label="Akte Detail">
        {selected ? (
          <>
            <div className="kartei-detail-head"><p className="section-label">Akte</p><h3>{selected.name}</h3><p>{creatorMeta(selected)}</p></div>
            <div className="detail-stat-grid"><span><strong>{selected.falschaussagenCount}</strong> problematische Claims</span><span><strong>{(selected.totalViews / 1_000_000).toFixed(1)} Mio.</strong> Views</span><span><strong>{selected.damageScore}</strong> Risiko</span></div>
            <div className="creator-summary"><h4>Warum relevant?</h4><p>{selected.note ?? "Keine Notiz vorhanden."}</p></div>
            <div className="creator-claims-list">
              <h4>Aktuelle Claims</h4>
              {creatorClaims.slice(0, 4).map((claim) => (
                onOpenClaim ? (
                  <button key={claim.id} type="button" className="creator-claim-link" onClick={() => onOpenClaim(claim.id)}><strong>{claim.claim}</strong><span>{claim.sourceVideo.title} · → Vollprüfung</span></button>
                ) : (
                  <article key={claim.id}><strong>{claim.claim}</strong><span>{claim.sourceVideo.title}</span></article>
                )
              ))}
            </div>
            <button className="primary-btn" onClick={() => exportDossier(selected)}>{copied ? "Akte kopiert" : "Akte als Markdown kopieren"}</button>
          </>
        ) : <p>Keine Creator-Akte verfügbar.</p>}
      </aside>
    </div>
  );
}

function creatorMeta(creator: CreatorRecord) {
  return creator.handle && creator.handle !== creator.platform ? `${creator.handle} · ${creator.platform}` : creator.platform;
}

function avatarFallback(name: string) {
  return `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(name)}`;
}
