import { llmConfigured, configuredLlmModel, opusProxyBaseUrl } from "@/lib/llm";
import { storeConfigured } from "@/lib/store";

// Single source of truth for reviewer-facing questions. Keep this limited to
// public configuration facts: never expose keys, tokens or internal bypasses.
export function providerStory(): string {
  if (!llmConfigured()) {
    return "Kein LLM-Key gesetzt: Die App läuft im deterministischen, regelbasierten Fallback.";
  }

  const base = opusProxyBaseUrl();
  const model = configuredLlmModel();
  const isNvidia = /nvidia/i.test(base) || /nemotron|llama/i.test(model);
  const hosting = isNvidia
    ? "über NVIDIAs OpenAI-kompatible NIM-API"
    : "über eine OpenAI-kompatible Schnittstelle";

  return `LLM-Schicht: ${hosting}. Aktives Modell: ${model}. Die Architektur ist provider-agnostisch; ein Modellwechsel erfolgt über die Serverkonfiguration. Das LLM bewertet und formuliert nur, es entscheidet nie autonom über Wahrheit (Human-in-the-Loop).`;
}

export function buildAppFacts(): string {
  return [
    "APP-IDENTITÄT: Chris Fact Radar ist ein live bereitgestelltes Proof-of-Work/Beta-MVP für Human-in-the-Loop Claim Review und Content-Produktion im Fitness-/Ernährungsbereich. Es ist keine fertig gehärtete Production-SaaS.",
    `PROVIDER & MODELL: ${providerStory()}`,
    `DATEN: Öffentliche Claims und Chris-Wissenspositionen werden serverseitig geladen (${storeConfigured() ? "Supabase konfiguriert" : "Store nicht konfiguriert"}), nicht aus ungeprüftem Browser-State. Öffentliche Testfixtures werden herausgefiltert.`,
    "LIVE NUTZBAR: Studio, öffentliche Claim-Queue mit Review-Stufen, Apify- oder manueller Intake, Evidence-/Chris-Fit-Bewertung, Content-Pack-/Skript-Workflows, Secretary, Chris-Wissen mit kuratierten Positionen und Quellen, Lead-Magnet mit Check sowie /status und /api/health.",
    "AUSBAUPFAD: kontinuierlicher Dauer-Crawler, vollständige direkte TikTok/Instagram/YouTube-Discovery, OCR-/Audio-Transkription, vollständig retrieval-grounded RAG über alle Chris-Inhalte, Streaming-Chat und weitergehende Market-Intelligence. Die vorhandene Chris-Wissen-Ansicht ist live; ein vollständiges autonomes RAG ist es nicht.",
    "QUELLENPOLITIK: Neue Fälle kommen aus Apify-Intake oder manuell geprüften Quellen/Transkripten. YouTube-Links sind Quellen-URLs, kein behauptetes autonomes YouTube-Crawler-System.",
    "SICHERHEIT: Schreib-, Import-, Seeder- und Cron-Pfade sind fail-closed geschützt. Der öffentliche Chat ist rate-limitiert. Secrets, Env-Werte und interne Bypass-Links werden niemals ausgegeben.",
    "PRÜFBARE ÖFFENTLICHE ENDPUNKTE: GET /api/health, GET /api/claims, GET /api/truths, GET /api/llm-test und POST /api/chat. Behaupte keine anderen öffentlichen Import-Endpunkte.",
  ].join("\n");
}
