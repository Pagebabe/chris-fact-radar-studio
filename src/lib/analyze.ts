import { retrieveEvidence } from "./evidence";
import { reachScore } from "./format";
import { analyzeWithLlm, llmConfigured } from "./llm";
import { spokenWordBlockReason, hasEvaluationReadySpokenWord } from "./spoken-word";
import { matchClaimToTruths } from "./truth";
import type { ClaimItem, Evidence, SourceVideo, TruthRecord, Verdict } from "./types";

const evidenceBank: Record<string, Evidence[]> = {
  heisshunger: [
    { id: "ev-pubmed-cravings", publisher: "PubMed", title: "Food cravings and appetite regulation literature", url: "https://pubmed.ncbi.nlm.nih.gov/?term=food+cravings+appetite+regulation", date: "2026-01-01", stance: "context", reliability: 90, snippet: "Heißhunger hängt mit Belohnung, Restriktion, Stress, Schlaf und gelernten Auslösern zusammen." },
  ],
  insulin: [
    { id: "ev-openalex-fruit", publisher: "OpenAlex", title: "Fruit intake and body weight evidence", url: "https://openalex.org/works?search=fruit%20intake%20body%20weight", date: "2026-01-01", stance: "context", reliability: 84, snippet: "Die Evidenz trennt ganze Früchte, Säfte und isolierte Zucker-Claims. Pauschale Insulin-Erklärungen sind meist zu grob." },
  ],
  supplements: [
    { id: "ev-vz-supplements", publisher: "Verbraucherzentrale", title: "Nahrungsergänzungsmittel kritisch prüfen", url: "https://www.verbraucherzentrale.de/wissen/lebensmittel/nahrungsergaenzungsmittel", date: "2026-01-01", stance: "context", reliability: 88, snippet: "Starke Supplement-Versprechen brauchen Belege zu Wirkung, Dosis, Sicherheit und Interessenkonflikten." },
  ],
  default: [
    { id: "ev-dge", publisher: "DGE", title: "Evidenzbasierte Ernährungsreferenzwerte", url: "https://www.dge.de/wissenschaft/referenzwerte/", date: "2026-01-01", stance: "context", reliability: 90, snippet: "Ernährungsempfehlungen basieren auf Gesamtmustern statt auf einzelnen Zauberregeln." },
    { id: "ev-efsa", publisher: "EFSA", title: "Nutrition topics and scientific opinions", url: "https://www.efsa.europa.eu/en/topics/topic/nutrition", date: "2026-01-01", stance: "context", reliability: 92, snippet: "Gesundheitsbezogene Aussagen sollten mit belastbarer Evidenz und sauberem Kontext geprüft werden." },
  ],
};

export async function analyzeVideoSmart(video: SourceVideo, truths: TruthRecord[] = []): Promise<ClaimItem> {
  const heuristic = analyzeVideo(video);
  if (!hasEvaluationReadySpokenWord(video)) {
    return enforceTranscriptGate(heuristic, video);
  }

  if (!llmConfigured()) {
    const chrisPosition = matchClaimToTruths(heuristic.claim, truths) ?? undefined;
    return chrisPosition ? { ...heuristic, chrisPosition } : heuristic;
  }

  const llm = await analyzeWithLlm(video, heuristic.evidence);
  if (!llm) {
    const chrisPosition = matchClaimToTruths(heuristic.claim, truths) ?? undefined;
    return chrisPosition ? { ...heuristic, chrisPosition } : heuristic;
  }

  const evidence = await retrieveEvidence(llm.claim, heuristic.evidence, llm.searchQueryEn);
  const chrisPosition = matchClaimToTruths(llm.claim, truths) ?? undefined;
  const relevanceScore = chrisPosition ? Math.min(99, llm.relevanceScore + 12) : llm.relevanceScore;
  const riskScoreValue = Math.min(96, Math.max(55, reachScore(video.views, video.comments) + Math.round(relevanceScore / 6)));

  return { ...heuristic, claim: llm.claim, category: llm.category, verdict: llm.verdict, confidence: llm.confidence, relevanceScore, riskScore: riskScoreValue, checkworthiness: Math.min(96, Math.round((riskScoreValue + relevanceScore) / 2)), whyItMatters: llm.whyItMatters || heuristic.whyItMatters, responseDraft: llm.responseDraft || heuristic.responseDraft, responseBlocks: llm.responseBlocks, analysisSource: "llm", evidence, chrisPosition, stage: riskScoreValue >= 82 ? "ready" : "needs_evidence" };
}

export function analyzeVideo(video: SourceVideo): ClaimItem {
  const text = `${video.title}. ${video.description}. ${video.transcriptSnippet}`;
  const lowered = text.toLowerCase();
  const category = lowered.includes("insulin") ? "Insulin" : lowered.includes("protein") || lowered.includes("eiweiß") ? "Protein" : lowered.includes("chrom") || lowered.includes("supplement") ? "Supplements" : lowered.includes("detox") || lowered.includes("stoffwechsel") ? "Fettverlust" : "Heisshunger";
  const keyword = keywordFor(lowered);
  const riskScoreValue = Math.min(82, Math.max(48, reachScore(video.views, video.comments) + keyword.riskBoost));
  const relevanceScore = Math.min(88, 52 + keyword.fitBoost);
  const verdict: Verdict = "unclear";

  return {
    id: `claim-${video.id}`,
    stage: "needs_evidence",
    category,
    claim: extractClaim(video, keyword.label),
    riskScore: riskScoreValue,
    relevanceScore,
    checkworthiness: Math.min(86, Math.round((riskScoreValue + relevanceScore) / 2)),
    verdict,
    confidence: 54,
    whyItMatters: whyItMatters(category, keyword.label),
    responseDraft: responseDraft(category, keyword.label),
    sourceVideo: video,
    evidence: evidenceFor(category, lowered),
    analysisSource: "heuristic",
  };
}

function enforceTranscriptGate(item: ClaimItem, video: SourceVideo): ClaimItem {
  const basis = spokenWordBlockReason(video) ?? "keine freigegebene Transkriptbasis";
  return {
    ...item,
    stage: "needs_evidence",
    verdict: "unclear",
    confidence: Math.min(item.confidence, 58),
    checkworthiness: Math.min(item.checkworthiness, 76),
    analysisSource: "heuristic",
    whyItMatters: `${item.whyItMatters} Analysebasis blockiert: ${basis}. Ohne belastbares Audio-/Caption-Transkript bleibt das ein Scout-Kandidat, kein fertiges Falschurteil.`,
    responseDraft: `${item.responseDraft} Erst Originalaussage per Caption, Audio-Transkript oder manuellem Zitat sichern; danach Quellenlage und Chris-Position final prüfen.`,
  };
}

function keywordFor(text: string): { label: string; riskBoost: number; fitBoost: number } {
  if (text.includes("detox") || text.includes("reset")) return { label: "Detox-/Reset-Behauptung", riskBoost: 12, fitBoost: 26 };
  if (text.includes("insulin") || text.includes("fruchtzucker")) return { label: "Insulin-Abkürzung", riskBoost: 12, fitBoost: 28 };
  if (text.includes("chrom") || text.includes("supplement")) return { label: "Supplement-Versprechen", riskBoost: 10, fitBoost: 20 };
  if (text.includes("zucker") || text.includes("sugar")) return { label: "Zucker-Absolutismus", riskBoost: 10, fitBoost: 28 };
  if (text.includes("protein") || text.includes("eiweiß")) return { label: "Protein-Vereinfachung", riskBoost: 8, fitBoost: 20 };
  return { label: "mögliche Ein-Faktor-Erklärung", riskBoost: 7, fitBoost: 20 };
}

function extractClaim(video: SourceVideo, label: string): string {
  const source = video.transcriptSnippet || video.description || video.title;
  const sentence = source
    .split(/[.!?]/)
    .map((part) => part.trim())
    .find((part) => part.length > 45 && hasClaimMarker(part));
  if (sentence) return sentence.endsWith(",") ? `${sentence.slice(0, -1)} …` : sentence;
  return `Möglicher prüfbarer Claim erkannt (${label}). Bitte mit Transkript/LLM konkretisieren, bevor daraus eine Falschaussage gemacht wird.`;
}

function hasClaimMarker(text: string): boolean {
  const lower = text.toLowerCase();
  return ["macht", "blockiert", "verhindert", "stoppt", "schadet", "niemals", "immer", "garantiert", "ist schuld", "funktioniert", "fett", "abnehmen", "insulin", "protein", "zucker", "kalorien"].some((marker) => lower.includes(marker));
}

function evidenceFor(category: ClaimItem["category"], text: string): Evidence[] {
  if (category === "Insulin") return [...evidenceBank.insulin, ...evidenceBank.default];
  if (category === "Supplements") return [...evidenceBank.supplements, ...evidenceBank.default];
  if (text.includes("craving") || text.includes("heiss") || text.includes("heiß") || text.includes("zucker")) return [...evidenceBank.heisshunger, ...evidenceBank.default];
  return evidenceBank.default;
}

function whyItMatters(category: ClaimItem["category"], label: string): string {
  return `${category} ist für Chris relevant. Der erkannte Winkel (${label}) kann ein guter Hook sein, wird im Heuristik-Modus aber nur als Prüfhinweis eingestuft — nicht als fertiges Urteil.`;
}

function responseDraft(category: ClaimItem["category"], label: string): string {
  return `Prüf-Winkel: ${label} sauber vom echten Claim trennen. Erst genaue Aussage aus Transkript sichern, dann mit Chris-Wissen und Quellenlage abgleichen. Keine pauschale Falsch-Behauptung ohne Beleg.`;
}
