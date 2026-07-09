export type ScriptStyle = "sachlich" | "offensiv" | "humorvoll";

export type AppSettings = {
  minViews: number;
  minVelocityPerHour: number;
  maxNewPerRun: number;
  maxLlmCallsPerDay: number;
  watchlistAutoSuggestThreshold: number;
  clustersEnabled: boolean;
  scienceTopics: string[];
  scriptStyleDefault: ScriptStyle;
  llmTriageEnabled: boolean;
  platformYouTube: boolean;
  platformTikTok: boolean;
  platformInstagram: boolean;
};

export const DEFAULT_SETTINGS: AppSettings = {
  minViews: 50000,
  minVelocityPerHour: 0,
  maxNewPerRun: 8,
  maxLlmCallsPerDay: 100,
  watchlistAutoSuggestThreshold: 2,
  clustersEnabled: true,
  scienceTopics: ["Heißhunger", "Protein", "Insulin", "Supplements", "Fettverlust", "Zucker"],
  scriptStyleDefault: "sachlich",
  llmTriageEnabled: true,
  platformYouTube: true,
  platformTikTok: false,
  platformInstagram: false,
};

const STORAGE_KEY = "chrisRadar_settings_v1";

export function loadSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}
