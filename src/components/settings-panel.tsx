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
          <h2>Lokale Studio-Einstellungen</h2>
          <button onClick={onClose} aria-label="Einstellungen schließen" className="settings-close">×</button>
        </div>

        <div className="settings-section">
          <h3>Was hier wirklich geändert wird</h3>
          <p className="setting-hint">
            Diese Einstellungen gelten nur in diesem Browser. Server-Budgets, Cron-Läufe, Plattform-Intake und Provider-Limits werden absichtlich nicht als lokale Schalter vorgetäuscht.
          </p>
        </div>

        <div className="settings-section">
          <h3>Reaktions-Stil</h3>
          <p className="setting-hint">Dieser Wert wird beim Erzeugen von Skripten und Content-Paketen tatsächlich verwendet.</p>
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
          <h3>LLM-Anzeige</h3>
          <div className="token-meter">
            <div className="token-meter-label">
              <span>Lokaler Sitzungszähler</span>
              <strong>{llmCallsToday}</strong>
            </div>
          </div>
          <p className="setting-hint">Kein Provider-Abrechnungswert und kein Tageslimit. Der sichere Laufzeitstatus steht unter <code>/api/health</code>.</p>
        </div>

        <button
          className="settings-reset"
          onClick={() => {
            const next = { ...DEFAULT_SETTINGS, scriptStyleDefault: DEFAULT_SETTINGS.scriptStyleDefault };
            onChange(next);
            saveSettings(next);
          }}
        >
          Lokalen Stil zurücksetzen
        </button>
      </div>
    </aside>
  );
}
