"use client";

import type { ScienceItem } from "@/lib/types";

type Props = {
  items: ScienceItem[];
  lastFetched?: string;
};

function referenceTimestamp(items: ScienceItem[], lastFetched?: string) {
  if (lastFetched) return new Date(lastFetched).getTime();
  return items.reduce((latest, item) => {
    const ts = new Date(item.fetchedAt).getTime();
    return Number.isFinite(ts) && ts > latest ? ts : latest;
  }, 0);
}

export function ScienceView({ items, lastFetched }: Props) {
  const referenceTs = referenceTimestamp(items, lastFetched);
  const recentItems = referenceTs > 0
    ? items.filter((i) => {
        const ageMs = referenceTs - new Date(i.fetchedAt).getTime();
        return Number.isFinite(ageMs) && ageMs >= 0 && ageMs < 1000 * 60 * 60 * 24 * 7;
      })
    : [];

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

      {items.length === 0 ? (
        <div className="science-empty">
          <p>Noch keine Erkenntnisse geladen.</p>
          <p className="science-empty-hint">Der Wissenschafts-Scanner sammelt Quellen zu Chris&apos; Themen. Bis dahin bleibt dieser Bereich bewusst leer statt Fake-Studien zu zeigen.</p>
        </div>
      ) : (
        <div className="science-grid">
          {items.map((item) => (
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
              <div className="science-footer">
                <span className="science-source">{item.source}</span>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="science-link">
                  Quelle öffnen ↗
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      <div className="science-info">
        <p>📅 Quellen-Scanner · Fokus: PubMed, WHO, DGE, EFSA · redaktionelle Prüfung vor Veröffentlichung</p>
      </div>
    </div>
  );
}
