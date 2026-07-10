import type { ClaimItem, ContentPack, Evidence, ResponseBlocks, SourceVideo, Verdict } from "./types";

export type LlmAnalysis = {
  claim: string;
  category: "Heisshunger" | "Protein" | "Supplements" | "Insulin" | "Fettverlust";
  verdict: Verdict;
  confidence: number;
  relevanceScore: number;
  whyItMatters: string;
  responseDraft: string;
  responseBlocks: ResponseBlocks;
  searchQueryEn: string;
};

type OpenAiCallOptions = {
  forceJson?: boolean;
  timeoutMs?: number;
  maxTokens?: number;
};

const DEFAULT_LLM_TIMEOUT_MS = 25_000;
const PACK_TIMEOUT_MS = 20_000;
const PACK_MAX_TOKENS = 950;

const SYSTEM_PROMPT = `Du bist der Faktencheck-Assistent von Christian Wolf (deutscher Fitness- und Ernährungs-Creator: evidenzbasiert, locker, keine Crash-Diäten).
Du bekommst Metadaten und Transcript-Auszug eines Social-Media-Videos. Deine Aufgabe:
1. Extrahiere genau EINE zentrale überprüfbare Behauptung, vollständig als deutscher Satz. Niemals nur den Videotitel oder Hashtags ausgeben.
2. Wenn keine konkrete überprüfbare Behauptung im Material steht, setze claim auf "Kein konkreter Claim extrahierbar." und verdict auf "unclear".
3. Bewerte konservativ: misleading | likely_false | unclear | mostly_true. Korrekte oder seriöse Aussagen niemals als falsch markieren.
4. Kategorie: Heisshunger | Protein | Supplements | Insulin | Fettverlust.
5. responseBlocks komplett auf Deutsch, mit echten Umlauten.
6. searchQueryEn darf Englisch sein, alle anderen Felder Deutsch.
confidence und relevanceScore sind ganze Zahlen von 0 bis 100.
Antworte NUR mit validem JSON, exakt diesem Schema:
{"claim":string,"category":string,"verdict":string,"confidence":number,"relevanceScore":number,"whyItMatters":string,"responseDraft":string,"responseBlocks":{"hook":string,"opener":string,"argumentation":string[],"sources":string[]},"searchQueryEn":string}`;

const CATEGORIES = ["Heisshunger", "Protein", "Supplements", "Insulin", "Fettverlust"] as const;
const VERDICTS = ["misleading", "likely_false", "unclear", "mostly_true"] as const;

export function opusProxyKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

export function opusProxyBaseUrl(): string {
  return (process.env.OPENAI_BASE_URL || "http://127.0.0.1:3456").replace(/\/$/, "");
}

export function opusProxyModel(): string {
  return process.env.LLM_MODEL || "opus";
}

function configuredTimeout(fallback = DEFAULT_LLM_TIMEOUT_MS) {
  return Number(process.env.LLM_TIMEOUT_MS) || fallback;
}

export function llmConfigured(): boolean {
  return Boolean(opusProxyKey());
}

const TRIAGE_PROMPT = `Ist dieses Social-Media-Video einen Falschaussagen-Check wert?
Kriterien: Es enthält eine konkrete, überprüfbare deutschsprachige Ernährungs- oder Fitnessbehauptung, die potenziell irreführend ist.
Antworte NUR mit JSON: {"checkworthy":boolean,"score":number,"reason":string}`;

export async function triageVideo(title: string, description: string, transcriptSnippet: string): Promise<{checkworthy: boolean; score: number} | null> {
  const triageUrl = process.env.LLM_TRIAGE_URL || opusProxyBaseUrl();
  const triageKey = process.env.LLM_TRIAGE_KEY || opusProxyKey();
  const triageModel = process.env.LLM_TRIAGE_MODEL || opusProxyModel();
  if (!triageUrl || !triageKey) return null;

  const userPrompt = `Titel: ${title}\nBeschreibung: ${description.slice(0, 300)}\nTranscript: ${transcriptSnippet.slice(0, 500)}`;
  try {
    const baseUrl = triageUrl.replace(/\/$/, "");
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${triageKey}` },
      body: JSON.stringify({
        model: triageModel,
        max_tokens: 160,
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: TRIAGE_PROMPT }, { role: "user", content: userPrompt }],
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as { checkworthy?: boolean; score?: number };
    return { checkworthy: Boolean(parsed.checkworthy), score: Number(parsed.score ?? 50) };
  } catch { return null; }
}

export async function analyzeWithLlm(video: SourceVideo, evidence: Evidence[]): Promise<LlmAnalysis | null> {
  const userPrompt = buildUserPrompt(video, evidence);
  try {
    const raw = opusProxyKey() ? await callOpusProxy(userPrompt) : null;
    if (!raw) return null;
    const parsed = parseAnalysis(raw);
    if (!parsed) console.error("[llm] parse failed, raw:", raw.slice(0, 500));
    return parsed;
  } catch { return null; }
}

const SCRIPT_BASE_PROMPT = `Du schreibst Reaktions-Video-Skripte für Christian Wolf (deutscher Fitness-/Ernährungs-Creator).
Sein Ton: fundiert aber locker, direkt, nahbar, kurze Sätze, kein Fachchinesisch ohne Erklärung, keine Crash-Diäten, realistisch statt dogmatisch. Schreibe komplett auf Deutsch mit echten Umlauten.
Schreibe ein 60-Sekunden-Sprechskript als reine Sprechzeilen.`;

export type ScriptStyle = "sachlich" | "offensiv" | "humorvoll";

const SCRIPT_STYLE_ADDONS: Record<ScriptStyle, string> = {
  sachlich: "\n\nSTIL: Sachlich-verbessernd. Konstruktiv und respektvoll.",
  offensiv: "\n\nSTIL: Offensiv. Direkter Ton, harte Kritik an der Aussage, keine Beleidigungen der Person.",
  humorvoll: "\n\nSTIL: Locker-humorvoll. Mit Augenzwinkern, aber fachlich präzise.",
};

export async function generateScriptWithLlm(item: ClaimItem, style: ScriptStyle = "sachlich"): Promise<string | null> {
  if (!llmConfigured()) return null;
  const evidenceLines = item.evidence.slice(0, 4).map((ev) => `- ${ev.publisher}: ${ev.title} — ${ev.snippet}`).join("\n");
  const userPrompt = [`Falschaussage: ${item.claim}`, `Kategorie: ${item.category} | Verdict: ${item.verdict}`, `Warum es wichtig ist: ${item.whyItMatters}`, item.responseBlocks ? `Vorhandene Argumente: ${item.responseBlocks.argumentation.join("; ")}` : "", evidenceLines ? `Evidenz:\n${evidenceLines}` : ""].filter(Boolean).join("\n\n");
  const scriptPrompt = SCRIPT_BASE_PROMPT + SCRIPT_STYLE_ADDONS[style];
  try {
    const raw = await callOpusProxy(userPrompt, scriptPrompt, { timeoutMs: 20_000, maxTokens: 900 });
    return raw?.trim() || null;
  } catch { return null; }
}

const PACK_SYSTEM_PROMPT = `Du bist der Content-Producer von Christian Wolf. Baue ein komplettes, sofort produzierbares Reaktions-Content-Paket auf Deutsch mit echten Umlauten. Liefere GENAU dieses JSON:
{"hooks":[3 Hook-Zeilen],"shortScript":"30-Sekunden-Sprechskript","longScript":"60-Sekunden-Sprechskript","titles":[3 Video-Titel],"description":"Video-Beschreibung inkl. Quellenzeile","hashtags":[6-10 Hashtags],"communityPost":"kurzer Teaser","thumbnailTexts":[3 kurze Thumbnail-Textzeilen]}`;

export async function generateContentPackWithLlm(item: ClaimItem, style: ScriptStyle = "sachlich"): Promise<ContentPack | null> {
  if (!llmConfigured()) return null;
  const evidenceLines = item.evidence.slice(0, 4).map((ev) => `- ${ev.publisher}: ${ev.title} — ${ev.snippet}`).join("\n");
  const userPrompt = [`Falschaussage: ${item.claim}`, `Kategorie: ${item.category} | Verdict: ${item.verdict} | Creator: ${item.sourceVideo.creator}`, `Warum wichtig: ${item.whyItMatters}`, item.responseBlocks ? `Argumente: ${item.responseBlocks.argumentation.join("; ")}` : "", item.chrisPosition ? `Chris' eigene Position: „${item.chrisPosition.quote}" (aus ${item.chrisPosition.videoTitle})` : "", evidenceLines ? `Evidenz:\n${evidenceLines}` : ""].filter(Boolean).join("\n\n");
  const systemPrompt = PACK_SYSTEM_PROMPT + SCRIPT_STYLE_ADDONS[style];
  try {
    const raw = await callOpusProxy(userPrompt, systemPrompt, {
      forceJson: true,
      timeoutMs: PACK_TIMEOUT_MS,
      maxTokens: PACK_MAX_TOKENS,
    });
    if (!raw) return null;
    const parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as Partial<ContentPack>;
    const strArr = (v: unknown): string[] => Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
    const str = (v: unknown): string => typeof v === "string" ? v : "";
    if (!str(parsed.shortScript) && !str(parsed.longScript)) return null;
    return { hooks: strArr(parsed.hooks), shortScript: str(parsed.shortScript), longScript: str(parsed.longScript), titles: strArr(parsed.titles), description: str(parsed.description), hashtags: strArr(parsed.hashtags), communityPost: str(parsed.communityPost), thumbnailTexts: strArr(parsed.thumbnailTexts) };
  } catch { return null; }
}

export function buildFallbackScript(item: ClaimItem): string {
  const blocks = item.responseBlocks;
  const evidence = item.evidence.slice(0, 2).map((ev) => `${ev.publisher}: ${ev.title}`);
  const lines = [blocks?.hook || `"${item.claim}" — das hörst du gerade überall. Und es stimmt so nicht.`, "", blocks?.opener || item.whyItMatters, "", ...(blocks?.argumentation.length ? blocks.argumentation : [item.responseDraft]), "", evidence.length ? `Die Quellen dazu: ${evidence.join(" und ")}.` : "", "", "Merk dir: keine Panik vor einzelnen Lebensmitteln. Gesamtbilanz, Protein, Schlaf — das entscheidet.", "Wenn dir das geholfen hat: teil das Video mit jemandem, der diesen Mythos noch glaubt."];
  return lines.filter((line, index, all) => line !== "" || all[index - 1] !== "").join("\n");
}

function buildUserPrompt(video: SourceVideo, evidence: Evidence[]): string {
  const evidenceLines = evidence.slice(0, 6).map((ev) => `- ${ev.publisher}: ${ev.title} (${ev.stance}) — ${ev.snippet}`).join("\n");
  return [`Plattform: ${video.platform} | Kanal: ${video.creator} | Views: ${video.views} | Kommentare: ${video.comments}`, `Titel: ${video.title}`, `Beschreibung: ${video.description.slice(0, 600)}`, `Transcript-Auszug: ${video.transcriptSnippet.slice(0, 2200)}`, evidenceLines ? `Bereits gefundene Evidenz:\n${evidenceLines}` : ""].filter(Boolean).join("\n\n");
}

export async function callOpusProxy(userPrompt: string, systemPrompt: string = SYSTEM_PROMPT, options: OpenAiCallOptions | boolean = {}): Promise<string | null> {
  const key = opusProxyKey();
  if (!key) return null;
  const callOptions: OpenAiCallOptions = typeof options === "boolean" ? { forceJson: options } : options;
  const shouldForceJson = callOptions.forceJson ?? systemPrompt === SYSTEM_PROMPT;
  const baseUrl = opusProxyBaseUrl();
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: opusProxyModel(),
      max_tokens: callOptions.maxTokens ?? 1200,
      // Niedrige Temperatur: das freie NIM-Modell produziert bei hoher
      // Sampling-Varianz Meta-Fragmente ("Be strategic ->") und Wortmüll.
      temperature: 0.2,
      ...(shouldForceJson ? { response_format: { type: "json_object" } } : {}),
      messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userPrompt }],
    }),
    signal: AbortSignal.timeout(callOptions.timeoutMs ?? configuredTimeout()),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error("[llm] openai-compatible provider error", res.status, errorText.slice(0, 300));
    return null;
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? null;
}

export function configuredLlmModel(): string {
  if (opusProxyKey()) return opusProxyModel();
  return "regelbasierter Fallback";
}

export type ChatMessage = { role: "user" | "assistant"; content: string };

const CHAT_SYSTEM_PROMPT = `Du bist der Control-Layer-Assistent von "Chris Fact Radar" — dem privaten Agent-Workspace von Christian Wolf (deutscher Fitness-/Ernährungs-Creator).
Deine Rolle: Dem Team helfen, gefundene Falsch-/Schwach-Claims zu verstehen, einzuordnen und in Reaktions-Content zu verwandeln.
Regeln:
- Antworte auf Deutsch, mit echten Umlauten, kurz und konkret (max. ~180 Wörter, keine Roman-Antworten).
- Beziehe dich, wenn möglich, auf die unten gelisteten aktuellen Claims (Aussage, Verdict, Reichweite).
- Ehrlich bleiben: Du bewertest konservativ, erfindest keine Studien und behauptest keine Fakten, die du nicht belegen kannst. Der Mensch entscheidet final (Human-in-the-Loop).
- Wenn nach einem Reaktions-Skript gefragt wird: liefere Hook + 2-3 Kernargumente, keine Crash-Diät-Ratschläge.
- Kein medizinischer Rat; bei Essstörungs-Signalen auf professionelle Hilfe verweisen.`;

async function callChat(messages: ChatMessage[], systemPrompt: string): Promise<string | null> {
  const timeoutMs = configuredTimeout(25_000);
  const key = opusProxyKey();
  if (!key) return null;
  const baseUrl = opusProxyBaseUrl();
  const res = await fetch(`${baseUrl}/v1/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify({ model: opusProxyModel(), max_tokens: 700, messages: [{ role: "system", content: systemPrompt }, ...messages] }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    console.error("[llm] chat error", res.status, errorText.slice(0, 300));
    return null;
  }
  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return data.choices?.[0]?.message?.content ?? null;
}

export async function generateChatReply(messages: ChatMessage[], claimContext: string): Promise<string | null> {
  if (!llmConfigured()) return null;
  const systemPrompt = claimContext ? `${CHAT_SYSTEM_PROMPT}\n\nAktuelle Claims im System:\n${claimContext}` : CHAT_SYSTEM_PROMPT;
  try {
    const reply = await callChat(messages.slice(-10), systemPrompt);
    return reply?.trim() || null;
  } catch { return null; }
}

function parseAnalysis(raw: string): LlmAnalysis | null {
  const jsonText = raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  if (!jsonText) return null;
  let parsed: Record<string, unknown>;
  try { parsed = JSON.parse(jsonText) as Record<string, unknown>; } catch { return null; }
  const category = CATEGORIES.find((c) => c === parsed.category) ?? "Heisshunger";
  const verdict = VERDICTS.find((v) => v === parsed.verdict) ?? "unclear";
  const blocks = (parsed.responseBlocks ?? {}) as Partial<ResponseBlocks>;
  if (typeof parsed.claim !== "string" || parsed.claim.length < 10) return null;
  return { claim: completeSentence(parsed.claim), category, verdict, confidence: clampNumber(parsed.confidence, 30, 98, 70), relevanceScore: clampNumber(parsed.relevanceScore, 0, 100, 60), whyItMatters: asString(parsed.whyItMatters), responseDraft: asString(parsed.responseDraft), responseBlocks: { hook: asString(blocks.hook), opener: asString(blocks.opener), argumentation: asStringArray(blocks.argumentation), sources: asStringArray(blocks.sources) }, searchQueryEn: asString(parsed.searchQueryEn) };
}

function completeSentence(value: string): string {
  const trimmed = value.trim().replace(/[,;:]+$/, "");
  if (/[.!?]$/.test(trimmed)) return trimmed;
  return `${trimmed}.`;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  let num = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  if (num > 0 && num <= 1) num *= 100;
  return Math.min(max, Math.max(min, Math.round(num)));
}

function asString(value: unknown): string { return typeof value === "string" ? value : ""; }
function asStringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
