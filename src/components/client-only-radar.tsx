"use client";

import { useSyncExternalStore } from "react";
import { RadarApp } from "./radar-app";

function subscribe() {
  return () => undefined;
}

export function ClientOnlyRadar() {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);

  if (!mounted) {
    return (
      <main className="app-shell radar-loading-shell">
        <div className="radar-loading-card">
          <p className="section-label">Arbeitsstudio</p>
          <h1>Chris Fact Radar lädt …</h1>
          <p>Das Studio wird im Browser initialisiert, damit gespeicherte Queue-Daten nicht mehr gegen das Server-HTML laufen.</p>
        </div>
      </main>
    );
  }

  return <RadarApp />;
}
