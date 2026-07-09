"use client";

import { useEffect, useMemo, useState } from "react";
import type { ClaimItem, TruthRecord } from "@/lib/types";
import { buildMythClusters } from "@/lib/myths";
import { ChrisScanner } from "./chris-scanner";
import { TruthImporter } from "./truth-importer";

type Props = { claims: ClaimItem[]; truths: TruthRecord[] };
type KnowledgeTab = "scanner" | "importer" | "wahrheit" | "mythen";

export function Lexikon({ claims, truths }: Props) {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<KnowledgeTab>("scanner");
  const [localTruths, setLocalTruths] = useState<TruthRecord[]>([]);
  const [serverTruths, setServerTruths] = useState<TruthRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/truths")
      .then((response) => response.json() as Promise<{ configured?: boolean; truths?: TruthRecord[] }>)
      .then((data) => {
        if (!cancelled && data.configured && data.truths?.length) setServerTruths(data.truths);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const allTruths = useMemo(() => mergeTruths([...localTruths, ...serverTruths, ...truths]), [localTruths, serverTruths, truths]);

  const flaggedClaims = useMemo(() => claims.filter((c) => c.verdict === "misleading" || c.verdict === "likely_false"), [claims]);
  const clusters = useMemo(() => buildMythClusters(flaggedClaims), [flaggedClaims]);
  const topTopics = useMemo(() => Array.from(new Set(allTruths.flatMap((truth) => truth.topics?.length ? truth.topics : [truth.topic]))).slice(0, 8), [allTruths]);
  const publicReferenceCount = allTruths.filter((truth) => truth.url && truth.quote).length;
  const contradictionGuardTopics = new Set(allTruths.map((truth) => truth.topic.toLowerCase()));
  const guardedClaims = flaggedClaims.filter((claim) => contradictionGuardTopics.has(claim.category.toLowerCase()) || allTruths.some((truth) => claim.claim.toLowerCase().includes(truth.topic.toLowerCase()))).length;

  const filteredClusters = useMemo(() => {
    if (!search.trim()) return clusters;
    const q = search.toLowerCase();
    return clusters.filter((cl) => cl.label.toLowerCase().includes(q) || cl.topCategory.toLowerCase().includes(q));
  }, [clusters, search]);

  const filteredTruths = useMemo(() => {
    if (!search.trim()) return allTruths;
    const q = search.toLowerCase();
    return allTruths.filter((t) => t.statement.toLowerCase().includes(q) || t.topic.toLowerCase().includes(q));
  }, [allTruths, search]);

  return (
    <div className="knowledge-shell">
      <section className="knowledge-hero">
        <div>
          <p className="section-label">Chris-Wissen</p>
          <h2>Brand Governance gegen Widerspruchsfehler</h2>
          <p>
            Hier entsteht Christians geprüfte öffentliche Referenzbasis aus O-Tönen, Quellen und wiederverwendbaren Statements. Der Sinn ist nicht nur schneller Content, sondern sauberes Brand Management: Rebuttals und Skripte müssen zur öffentlich belegten Position passen oder vor Veröffentlichung korrigiert werden.
          </p>
        </div>
        <div className="knowledge-score-card">
          <span>Freigegeben</span>
          <strong>{allTruths.length}</strong>
          <small>öffentliche Positionen</small>
        </div>
      </section>

      <section className="knowledge-stats" aria-label="Chris-Wissen Übersicht">
        <div className="knowledge-stat"><strong>{allTruths.length}</strong><span>freigegebene O-Töne</span></div>
        <div className="knowledge-stat"><strong>{publicReferenceCount}</strong><span>öffentliche Referenzen</span></div>
        <div className="knowledge-stat"><strong>{guardedClaims}</strong><span>Claims mit Abgleichschutz</span></div>
        <div className="knowledge-stat"><strong>{topTopics.length}</strong><span>geschützte Themenfelder</span></div>
      </section>

      <section className="knowledge-side-card" aria-label="Brand Governance und Widerspruchsschutz">
        <div className="truth-topic">Brand Safety</div>
        <h3>Keine Reaktion gegen die eigene öffentliche Linie</h3>
        <ol className="knowledge-steps">
          <li><strong>1. Öffentliche O-Töne sichern</strong><span>Nur belegte Aussagen mit Quelle werden als Referenz gespeichert.</span></li>
          <li><strong>2. Neue Claims abgleichen</strong><span>Vor Bewertung und Skript wird geprüft, ob es passende Christian-Positionen gibt.</span></li>
          <li><strong>3. Korrigieren statt riskieren</strong><span>Widersprüche, Übertreibungen oder unklare Formulierungen werden vor Veröffentlichung angepasst.</span></li>
        </ol>
      </section>

      <div className="knowledge-tabs" role="tablist" aria-label="Chris-Wissen Untertabs">
        <button className={`knowledge-tab${activeTab === "scanner" ? " active" : ""}`} onClick={() => setActiveTab("scanner")}>Quellen & Review<span>scannen, prüfen, freigeben</span></button>
        <button className={`knowledge-tab${activeTab === "importer" ? " active" : ""}`} onClick={() => setActiveTab("importer")}>Manuell einpflegen<span>O-Ton direkt speichern</span></button>
        <button className={`knowledge-tab${activeTab === "wahrheit" ? " active" : ""}`} onClick={() => setActiveTab("wahrheit")}>Freigegeben<span>{allTruths.length} Positionen</span></button>
        <button className={`knowledge-tab${activeTab === "mythen" ? " active" : ""}`} onClick={() => setActiveTab("mythen")}>Gegner-Claims<span>{flaggedClaims.length} dokumentiert</span></button>
      </div>

      {(activeTab === "wahrheit" || activeTab === "mythen") && (
        <div className="knowledge-searchbar">
          <input className="search-input" placeholder={activeTab === "mythen" ? "Mythen, Creator oder Thema suchen…" : "Position, Thema oder Keyword suchen…"} value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Chris-Wissen durchsuchen" />
        </div>
      )}

      {activeTab === "scanner" && (
        <div className="knowledge-import-grid">
          <ChrisScanner onTruths={(items) => {
            setLocalTruths((current) => [...items, ...current]);
            if (items.length > 0) setActiveTab("wahrheit");
          }} />
          <aside className="knowledge-side-card">
            <div className="truth-topic">Redaktionslogik</div>
            <h3>Warum Review besser ist als Autopilot</h3>
            <ol className="knowledge-steps">
              <li><strong>1. Quellen scannen</strong><span>Neue Videos liefern erst nur Roh-Vorschläge.</span></li>
              <li><strong>2. Aussage prüfen</strong><span>Nur klare Positionen mit brauchbarer Quelle werden übernommen.</span></li>
              <li><strong>3. Content schützen</strong><span>Vollprüfung und Reactions greifen auf geprüfte Christian-Sprache zurück, um Widerspruchsfehler zu vermeiden oder zu korrigieren.</span></li>
            </ol>
            <div className="knowledge-topic-cloud">
              {(topTopics.length ? topTopics : ["Heißhunger", "Protein", "Kaloriendefizit", "Stressessen"]).map((topic) => <span key={topic} className="chip">{topic}</span>)}
            </div>
          </aside>
        </div>
      )}

      {activeTab === "importer" && (
        <div className="knowledge-import-grid">
          <TruthImporter onImported={(truth) => { setLocalTruths((current) => [truth, ...current]); setActiveTab("wahrheit"); }} />
          <aside className="knowledge-side-card"><div className="truth-topic">Workflow</div><h3>So wird aus Wissen Brand Governance</h3><ol className="knowledge-steps"><li><strong>Position speichern</strong><span>Thema, O-Ton und Quelle sauber ablegen.</span></li><li><strong>Claim vergleichen</strong><span>Vollprüfung findet passende Christian-Wahrheiten.</span></li><li><strong>Reaction absichern</strong><span>Hook, Urteil und Skript bleiben konsistent zur öffentlichen Referenzlage oder werden korrigiert.</span></li></ol></aside>
        </div>
      )}

      {activeTab === "wahrheit" && (
        <div className="knowledge-list">
          {filteredTruths.length === 0 && <p className="lexikon-empty">Noch keine passende Position gefunden. Nutze Quellen & Review oder pflege einen O-Ton manuell ein.</p>}
          {filteredTruths.map((truth) => (
            <article key={truth.id} className="knowledge-truth-card"><div className="knowledge-card-head"><span className="truth-topic">{truth.topic}</span><span className="chip">{Math.round((truth.confidence ?? 0.9) * 100)}% sicher</span></div><h3>{truth.statement}</h3><blockquote>&bdquo;{truth.quote}&ldquo;</blockquote><div className="knowledge-card-foot"><a href={truth.url} target="_blank" rel="noopener noreferrer">{truth.videoTitle} ↗</a><span>{new Date(truth.publishedAt).toLocaleDateString("de-DE")}</span></div></article>
          ))}
        </div>
      )}

      {activeTab === "mythen" && (
        <div className="knowledge-myth-list">
          {filteredClusters.length === 0 && <p className="lexikon-empty">Noch keine Gegner-Claims dokumentiert.</p>}
          {filteredClusters.map((cluster) => {
            const clusterClaims = flaggedClaims.filter((c) => cluster.itemIds.includes(c.id));
            return <article key={cluster.id} className="knowledge-myth-card"><div className="knowledge-card-head"><span className="truth-topic">{cluster.topCategory}</span><span className="chip warn">{cluster.count}× dokumentiert</span><span className="chip">{(cluster.totalViews / 1_000_000).toFixed(1)} Mio. Views</span></div><h3>{cluster.label}</h3><ul className="knowledge-claim-list">{clusterClaims.slice(0, 4).map((claim) => <li key={claim.id}>{claim.sourceVideo.thumbnail && <img src={claim.sourceVideo.thumbnail} alt="" loading="lazy" />}<div><a href={claim.sourceVideo.url} target="_blank" rel="noopener noreferrer">{claim.sourceVideo.creator}</a><p>&bdquo;{claim.claim.slice(0, 120)}{claim.claim.length > 120 ? "…" : ""}&ldquo;</p></div><span>{(claim.sourceVideo.views / 1000).toFixed(0)}k</span></li>)}</ul></article>;
          })}
        </div>
      )}
    </div>
  );
}

function mergeTruths(values: TruthRecord[]) {
  const merged = new Map<string, TruthRecord>();
  for (const truth of values) merged.set(truth.id, truth);
  return Array.from(merged.values());
}
