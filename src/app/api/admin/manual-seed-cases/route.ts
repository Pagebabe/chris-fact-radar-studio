import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { upsertClaims } from "@/lib/store";
import type { ClaimItem, SourceVideo } from "@/lib/types";

type ManualSeedInput = {
  url: string;
  creator: string;
  title: string;
  claim: string;
  verdict?: "misleading" | "likely_false";
  category?: ClaimItem["category"];
  views?: number;
  likes?: number;
  comments?: number;
  publishedAt?: string;
  thumbnail?: string;
  description?: string;
};

const SELF_BLOCK = ["christianwolf", "christian-wolf", "christian.wolf", "@christianwolf", "more nutrition", "morenutrition", "esn", "oace", "tqg", "got7", "abnehmenohneverzicht", "proteinfasten", "morewand", "einwandfrei"];
const TRUST_BLOCK = ["eat smarter", "quarks", "ard", "zdf", "ndr", "wdr", "swr", "dge", "verbraucherzentrale", "gesundheitsinformation", "3sat", "nano"];
const GERMAN_SIGNALS = [" der ", " die ", " das ", " und ", " ist ", " nicht ", "macht", "abnehmen", "zucker", "insulin", "süßstoff", "kohlenhydrate", "detox", "frühstück"];
const CATEGORY_RULES: Array<[ClaimItem["category"], string[]]> = [
  ["Insulin", ["insulin", "blutzucker", "zucker", "kohlenhydrate"]],
  ["Heisshunger", ["heißhunger", "heisshunger", "süßhunger", "appetit", "cravings"]],
  ["Protein", ["protein", "eiweiß", "eiweiss", "nieren"]],
  ["Supplements", ["supplement", "vitamin", "magnesium", "kreatin", "süßstoff", "suessstoff"]],
  ["Fettverlust", ["abnehmen", "fett", "kalorien", "stoffwechsel", "detox", "saftkur", "frühstück", "fruehstueck"]],
];

function normalize(value: string) { return value.toLowerCase().replace(/\s+/g, " ").trim(); }
function hasAny(text: string, terms: string[]) { const lower = normalize(text); return terms.some((term) => lower.includes(term)); }
function looksGerman(text: string) { const lower = ` ${normalize(text)} `; return GERMAN_SIGNALS.some((signal) => lower.includes(signal)); }
function complete(value: string) { const clean = value.trim().replace(/[,;:]+$/, ""); return /[.!?]$/.test(clean) ? clean : `${clean}.`; }
function safeId(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `manual-${Date.now()}`; }
function detectCategory(input: ManualSeedInput): ClaimItem["category"] { const text = `${input.claim} ${input.title}`.toLowerCase(); return CATEGORY_RULES.find(([, words]) => words.some((word) => text.includes(word)))?.[0] ?? input.category ?? "Fettverlust"; }

function validate(item: ManualSeedInput) {
  const text = `${item.url} ${item.creator} ${item.title} ${item.claim}`;
  if (!item.url?.startsWith("https://www.youtube.com/watch")) return "keine echte YouTube-Watch-URL";
  if (!item.creator || !item.title || !item.claim) return "creator, title und claim sind Pflicht";
  if (hasAny(text, SELF_BLOCK)) return "Chris-/More-/ESN-Selbstreferenz blockiert";
  if (hasAny(text, TRUST_BLOCK)) return "seriöse/editoriale Quelle blockiert";
  if (!looksGerman(text)) return "nicht klar deutsch";
  if (normalize(item.claim) === normalize(item.title)) return "Claim darf nicht der Titel sein";
  if (item.claim.length < 30) return "Claim zu kurz";
  if (item.verdict && !["misleading", "likely_false"].includes(item.verdict)) return "Verdict nicht erlaubt";
  return null;
}

function toClaim(input: ManualSeedInput): ClaimItem {
  const id = `manual-${safeId(input.url)}-${safeId(input.claim)}`;
  const category = input.category ?? detectCategory(input);
  const sourceVideo: SourceVideo = {
    id: `manual-${safeId(input.url)}`,
    platform: "YouTube",
    sourceMode: "live",
    url: input.url,
    creator: input.creator,
    title: input.title,
    description: input.description ?? "Manuell kuratierter echter Fund, weil die YouTube-Search-API temporär 429 geliefert hat.",
    publishedAt: input.publishedAt ?? new Date().toISOString(),
    views: input.views ?? 0,
    likes: input.likes ?? 0,
    comments: input.comments ?? 0,
    thumbnail: input.thumbnail ?? "",
    transcriptSnippet: input.claim,
    transcriptSource: "curated",
  };
  return {
    id,
    stage: "ready",
    category,
    claim: complete(input.claim),
    riskScore: 82,
    relevanceScore: 78,
    checkworthiness: 86,
    verdict: input.verdict ?? "misleading",
    confidence: 82,
    whyItMatters: "Manuell kuratierter echter Fall. Die Aussage ist deutsch, thematisch passend und wird nicht aus dem Videotitel abgeleitet.",
    responseDraft: "Erst die konkrete Aussage nennen, dann ruhig erklären, warum sie so pauschal nicht stimmt. Keine Person angreifen, nur die Behauptung prüfen.",
    analysisSource: "llm",
    sourceVideo,
    evidence: [],
    responseBlocks: {
      hook: `"${complete(input.claim)}" — genau solche Aussagen sollte man nicht einfach stehen lassen.`,
      opener: "Das Problem ist nicht, dass jemand über Ernährung spricht. Das Problem ist die pauschale Behauptung ohne Kontext.",
      argumentation: ["Einzelne Lebensmittel oder Hormone erklären Fettverlust nicht allein. Entscheidend sind Gesamtkalorien, Protein, Alltag, Schlaf und langfristige Umsetzbarkeit.", "Pauschale Verbote erzeugen oft mehr Stress als Fortschritt. Besser ist eine klare, alltagstaugliche Einordnung."],
      sources: ["Manuell kuratierter echter YouTube-Fund"],
    },
  };
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const url = new URL(request.url);
  if (url.searchParams.get("confirm") !== "manual-seed-cases") return NextResponse.json({ ok: false, error: "Use confirm=manual-seed-cases." }, { status: 401 });
  const body = await request.json().catch(() => null);
  const items = Array.isArray(body) ? body as ManualSeedInput[] : null;
  if (!items?.length) return NextResponse.json({ ok: false, error: "POST an array of manual seed cases." }, { status: 400 });
  const accepted: ClaimItem[] = [];
  const rejected: Array<{ title?: string; reason: string }> = [];
  for (const item of items.slice(0, 20)) {
    const reason = validate(item);
    if (reason) rejected.push({ title: item.title, reason });
    else accepted.push(toClaim(item));
  }
  const saved = accepted.length ? await upsertClaims(accepted) : false;
  return NextResponse.json({ ok: Boolean(saved), accepted: accepted.length, saved, claims: accepted, rejected });
}

export async function GET() {
  return NextResponse.json({ ok: true, endpoint: "manual-seed-cases", method: "POST", confirm: "manual-seed-cases", auth: "Set APP_ADMIN_TOKEN to require Bearer/x-admin-token for POST writes.", required: ["url", "creator", "title", "claim"], optional: ["verdict", "category", "views", "likes", "comments", "publishedAt", "thumbnail", "description"] });
}
