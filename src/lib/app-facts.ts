import { llmConfigured, configuredLlmModel, opusProxyBaseUrl } from "@/lib/llm";
import { storeConfigured } from "@/lib/store";

// Single source of truth the assistant can always cite when a reviewer asks
// "what is this / which model / what is live vs. concept". Kept honest on
// purpose: the whole product stance is transparency, so the bot must never
// oversell. No secrets are exposed here — only configuration presence and the
// public model/provider story.

export function providerStory(): string {
  if (!llmConfigured()) {
    return "Kein LLM-Key gesetzt → die App laeuft im deterministischen, regelbasierten Fallback.";
  }
  const base = opusProxyBaseUrl();
  const model = configuredLlmModel();
  const isNvidia = /nvidia/i.test(base) || /nemotron|llama/i.test(model);
  const hosting = isNvidia
    ? "aktuell ueber NVIDIAs OpenAI-kompatible NIM-API gehostet (bewusste Wahl: freie Kapazitaet unter Ressourcen-Grenzen)"
    : "ueber eine OpenAI-kompatible Schnittstelle";
  return `LLM-Schicht: OpenAI-kompatibel, ${hosting}. Aktives Modell: ${model}. Die Architektur ist provider-agnostisch – ein Wechsel (z. B. auf Opus/GPT/lokales Modell) ist ein Ein-Zeilen-Env-Change. Das LLM bewertet und formuliert nur; es entscheidet nie autonom ueber Wahrheit (Human-in-the-Loop).`;
}

export function buildAppFacts(): string {
  return [
    "APP-IDENTITAET: Chris Fact Radar ist ein Human-in-the-Loop Claim-Review- und Content-Production-Studio fuer Fitness-/Ernaehrungs-Claims. Es ist ein Proof-of-Work / Beta-MVP fuer eine Bewerbung, keine fertige Production-SaaS.",
    `PROVIDER & MODELL: ${providerStory()}`,
    `DATEN: Claims werden serverseitig aus Supabase geladen (${storeConfigured() ? "konfiguriert" : "aktuell nicht konfiguriert"}), nicht aus Browser-State. Seed-Arrays sind bewusst leer statt mit Fake-Faellen gefuellt. Legacy-Auto-Discovery-Routen antworten bewusst 410 Gone.`,
    "LIVE (echt nutzbar): Studio-Oberflaeche, Claim-Queue mit Review-Stufen, Apify- oder manuelle Intake-Logik, Evidence-/Chris-Fit-Bewertung, Content-Pack-/Skript-Workflows, dieser Assistent, Lead-Magnet + interaktiver Check, /status- und /api/health-Transparenz.",
    "AUSBAUPFAD (Konzept, NICHT als fertig verkaufen): kontinuierlicher Dauer-Crawler, vollstaendige TikTok/Instagram/YouTube-Pipeline, OCR/Audio-Transkription, grosse Chris-Knowledge-Base/RAG, Streaming-Antworten im Chat, sowie die Market-Intelligence-/Radar-Ansichten. Automatische Plattform-Discovery ist bewusst deaktiviert; neue Faelle kommen aus Apify-Intake oder manuell geprueften Transkripten.",
    "API-FIRST-HALTUNG: Bewusst nur offizielle/erlaubte Wege; keine verdeckte Plattform-Ausbeutung als aktives Feature. Grauzone-Methoden der Branche sind bekannt, werden aber nicht gebaut – die saubere Linie ist die, die eine Rechtsabteilung uebersteht.",
    "PRUEFBARE ENDPUNKTE: GET /api/health, GET /api/claims, GET /api/llm-test, POST /api/chat. Schreib-/Kostenrouten (Apify-Intake, Importe) sind fail-closed geschuetzt.",
  ].join("\n");
}
