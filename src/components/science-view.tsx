"use client";

import { useMemo, useState } from "react";
import type { ClaimItem, ScienceItem } from "@/lib/types";
import { matchClaimsToScience } from "@/lib/science-match";

type Props = {
  items: ScienceItem[];
  lastFetched?: string;
  claims?: ClaimItem[];
  onOpenClaim?: (id: string) => void;
};

function referenceTimestamp(items: ScienceItem[], lastFetched?: string) {
  if (lastFetched) return new Date(lastFetched).getTime();
  return items.reduce((latest, item) => {
    const ts = new Date(item.fetchedAt).getTime();
    return Number.isFinite(ts) && ts > latest ? ts : latest;
  }, 0);
}

export function ScienceView({ items, lastFetched, claims = [], onOpenClaim }: Props) {
  const [search, setSearch] = useState("");
  const [topicFilter, setTopicFilter] = useState<string | null>(null);

  const referenceTs = referenceTimestamp(items, lastFetched);
  const recentItems = referenceTs > 0
    ? items.filter((i) => {
        const ageMs = referenceTs - new Date(i.fetchedAt).getTime();
        return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 1000 * 60 * 60 * 24 * 7;
      })
    : [];

  const topics = useMemo(() => Array.from(new Set(items.map((i) => i.topic))).sort(), [items]);

  // Fall-Bezug pro Studie einmal berechnen — verbindet Science mit der Vollprüfung.
  const matchedByItem = useMemo(() => {
    const map = new Map<string, ClaimItem[]>();
    for (const item of items) map.set(item.id, matchClaimsToScience(item, claims));
    return map;
  }, [items, claims]);

  const filtered = useMemo(() => {
    let list = items;
    if (topicFilter) list = list.filter((i) => i.topic === topicFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.title.toLowerCase().includes(q) || i.summary.toLowerCase().includes(q) || i.topic.toLowerCase().includes(q));
    }
    return list;
  }, [items, topicFilter, search]);

  return (
    <div className="science-layout">
      <div className="science-header">
        <div>
          <h2>Wissenschafts-Brief</h2>
          <p className="science-subtitle">Relevante Studien- und Quellenlage — redaktionell für Chris&apos; Content übersetzt.</p>
        </div>
        <div className="science-meta">
          {recentItems.length > 0 && (
            <span className="chip hot">{recentItems.length} aktuelle Quellen</span>
          )}
          {lastFetched && (
            <span className="science-date">Zuletzt: {new Date(lastFetched).toLocaleDateString("de-DE")}</span>
          )}
        </div>
      </div>

      {items.length > 0 && (
        <div className="science-filterbar">
          <input
            className="search-input"
            placeholder="Studie, Thema oder Stichwort suchen…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Wissenschafts-Brief durchsuchen"
          />
          <div className="science-topic-chips">
            <button type="button" className={`chip${topicFilter === null ? " active" : ""}`} onClick={() => setTopicFilter(null)}>Alle</button>
            {topics.map((topic) => (
              <button key={topic} type="button" className={`chip${topicFilter === topic ? " active" : ""}`} onClick={() => setTopicFilter(topicFilter === topic ? null : topic)}>
                {topic}
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="science-empty">
          <p>Noch keine Erkenntnisse geladen.</p>
          <p className="science-empty-hint">Der Wissenschafts-Scanner sammelt Quellen zu Chris&apos; Themen. Bis dahin bleibt dieser Bereich bewusst leer statt Fake-Studien zu zeigen.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="science-empty">
          <p>Keine Quelle passt zu diesem Filter.</p>
        </div>
      ) : (
        <div className="science-grid">
          {filtered.map((item) => {
            const matched = matchedByItem.get(item.id) ?? [];
            return (
              <article key={item.id} className="science-card">
                <div className="science-card-top">
                  <span className="science-topic">{item.topic}</span>
                  <span className="science-pub-date">{new Date(item.publishedAt).toLocaleDateString("de-DE")}</span>
                </div>
                <h3 className="science-title">{item.title}</h3>
                <p className="science-summary">{item.summary}</p>
                <div className="science-idea">
                  <span className="science-idea-label">💡 Content-Idee</span>
                  <p>{item.contentIdea}</p>
                </div>
                {matched.length > 0 && onOpenClaim && (
                  <button type="button" className="science-claim-chip" onClick={() => onOpenClaim(matched[0].id)}>
                    ⚡ Passt zu {matched.length} offenen {matched.length === 1 ? "Fall" : "Fällen"} → Vollprüfung
                  </button>
                )}
                <div className="science-footer">
                  <span className="science-source">{item.source}</span>
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="science-link">
                    Quelle öffnen ↗
                  </a>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <div className="science-info">
        <p>📅 Quellen-Scanner · Fokus: PubMed, WHO, DGE, EFSA · redaktionelle Prüfung vor Veröffentlichung · Fall-Bezüge werden lokal per Text-Ähnlichkeit vorgeschlagen</p>
      </div>
    </div>
  );
}
