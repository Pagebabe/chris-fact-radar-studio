"use client";

import { useEffect } from "react";
import { DEFAULT_SETTINGS, saveSettings, type AppSettings } from "@/lib/settings";

type Props = {
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
  onClose: () => void;
  llmCallsToday: number;
};

export function SettingsPanel({ settings, onChange, onClose, llmCallsToday }: Props) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const next = { ...settings, [key]: value };
    onChange(next);
    saveSettings(next);
  }

  return (
    <aside className="settings-overlay" role="dialog" aria-label="Einstellungen" aria-modal="true" onClick={onClose}>
      <div className="settings-panel" onClick={(event) => event.stopPropagation()}>
        <div className="settings-header">
          <h2>Einstellungen</h2>
          <button onClick={onClose} aria-label="Einstellungen schließen" className="settings-close">×</button>
        </div>

        <div className="settings-section">
          <h3>Filter & Schwellwerte</h3>

          <label className="setting-row">
            <span>Mindest-Views für Alarm</span>
            <input
              type="number"
              value={settings.minViews}
              min={0}
              step={10000}
              onChange={(e) => update("minViews", Number(e.target.value))}
              className="setting-input"
              aria-label="Mindest-Views"
            />
          </label>
          <p className="setting-hint">Videos mit weniger Views werden ignoriert. Verhindert Alarm bei Mikro-Influencern.</p>

          <label className="setting-row">
            <span>Mindest-Velocity (Views/h)</span>
            <input
              type="number"
              value={settings.minVelocityPerHour}
              min={0}
              step={100}
              onChange={(e) => update("minVelocityPerHour", Number(e.target.value))}
              className="setting-input"
              aria-label="Mindest-Velocity"
            />
          </label>

          <label className="setting-row">
            <span>Max. neue Claims pro Cron-Lauf</span>
            <input
              type="number"
              value={settings.maxNewPerRun}
              min={1}
              max={50}
              onChange={(e) => update("maxNewPerRun", Number(e.target.value))}
              className="setting-input"
              aria-label="Max neue Claims"
            />
          </label>

          <label className="setting-row">
            <span>Creator-Vorschlag ab X Risikoclaims</span>
            <input
              type="number"
              value={settings.watchlistAutoSuggestThreshold}
              min={1}
              max={10}
              onChange={(e) => update("watchlistAutoSuggestThreshold", Number(e.target.value))}
              className="setting-input"
              aria-label="Watchlist-Schwelle"
            />
          </label>
        </div>

        <div className="settings-section">
          <h3>LLM & Token-Budget</h3>

          <div className="token-meter">
            <div className="token-meter-label">
              <span>Calls heute</span>
              <strong>{llmCallsToday} / {settings.maxLlmCallsPerDay}</strong>
            </div>
            <div className="token-bar">
              <div
                className="token-bar-fill"
                style={{ width: `${Math.min(100, (llmCallsToday / settings.maxLlmCallsPerDay) * 100)}%` }}
              />
            </div>
          </div>

          <label className="setting-row">
            <span>Max. LLM-Calls pro Tag</span>
            <input
              type="number"
              value={settings.maxLlmCallsPerDay}
              min={10}
              max={500}
              step={10}
              onChange={(e) => update("maxLlmCallsPerDay", Number(e.target.value))}
              className="setting-input"
              aria-label="Max LLM Calls"
            />
          </label>

          <label className="setting-row">
            <span>LLM-Triage aktivieren</span>
            <input
              type="checkbox"
              checked={settings.llmTriageEnabled}
              onChange={(e) => update("llmTriageEnabled", e.target.checked)}
              aria-label="LLM Triage"
            />
          </label>
          <p className="setting-hint">Triage prüft zuerst mit einem günstigen Modell ob ein Video überhaupt check-würdig ist — spart Token.</p>
        </div>

        <div className="settings-section">
          <h3>Reaktions-Stil (Standard)</h3>
          <div className="style-buttons">
            {(["sachlich", "offensiv", "humorvoll"] as const).map((style) => (
              <button
                key={style}
                className={`style-btn${settings.scriptStyleDefault === style ? " active" : ""}`}
                onClick={() => update("scriptStyleDefault", style)}
                aria-pressed={settings.scriptStyleDefault === style}
              >
                {style === "sachlich" ? "Sachlich-verbessernd" : style === "offensiv" ? "Offensiv" : "Locker-humorvoll"}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-section">
          <h3>Plattformen</h3>
          <div className="platform-toggles">
            <label className="platform-toggle">
              <input type="checkbox" checked={settings.platformYouTube} onChange={(e) => update("platformYouTube", e.target.checked)} />
              YouTube
            </label>
            <label className="platform-toggle">
              <input type="checkbox" checked={settings.platformTikTok} onChange={(e) => update("platformTikTok", e.target.checked)} />
              TikTok (CSV-Import)
            </label>
            <label className="platform-toggle">
              <input type="checkbox" checked={settings.platformInstagram} onChange={(e) => update("platformInstagram", e.target.checked)} />
              Instagram (CSV-Import)
            </label>
          </div>
        </div>

        <button
          className="settings-reset"
          onClick={() => { onChange(DEFAULT_SETTINGS); saveSettings(DEFAULT_SETTINGS); }}
        >
          Auf Standard zurücksetzen
        </button>
      </div>
    </aside>
  );
}
