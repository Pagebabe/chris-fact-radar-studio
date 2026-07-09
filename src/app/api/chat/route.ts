import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { callOpusProxy, llmConfigured, opusProxyModel } from "@/lib/llm";
import type { ClaimItem, HunterCandidate, HunterRun } from "@/lib/types";

export const maxDuration = 20;

type ChatActionType = "openClaim" | "runIntake" | "createBrief" | "openCases" | "openKartei";

type ChatAction = {
  type: ChatActionType;
  label: string;
  claimId?: string;
};

type ChatRequest = {
  message?: string;
  selectedClaimId?: string;
  context?: {
    claims?: ClaimItem[];
    hunterCandidates?: HunterCandidate[];
    hunterRuns?: HunterRun[];
    health?: {
      supabaseConfigured?: boolean;
      llmConfigured?: boolean;
      apifyConfigured?: boolean;
    };
    intakeBrief?: {
      goal?: string;
      platforms?: Record<string, boolean>;
      minViews?: number;
      mustInclude?: string;
      avoid?: string;
    };
  };
};

const SYSTEM_PROMPT = `Du bist der Operator-Copilot im Chris Fact Radar — kein generischer Chatbot, sondern der Arbeits-Assistent für dieses Produkt.

PRODUKTIDENTITÄT
- Chris Fact Radar ist ein Human-in-the-loop Claim-Review- und Content-Production-Studio: Social-/Fitness-/Ernährungs-Claims priorisieren, prüfen, erklären und in Content-/Briefing-Ausgaben überführen.
- Es ist ein Proof-of-Work / Beta-MVP für eine Bewerbung, keine fertige Production-SaaS. Behaupte nie Production-Reife. Wenn relevant, benenne offen, was MVP und was Ausbaupfad ist.
- Zweck der Demo: Produktdenken, KI-Workflow, Review-Logik, Content-System und Datenverständnis sichtbar machen.

WAS DU HEUTE ZEIGEN DARFST
- Claim-Priorisierung, Intake-/Kandidatenlogik, Health-/Status-Einordnung, Review-Schritte, Content-Briefing (Hook, Argumente, Skriptlogik), den nächsten sinnvollen Workflow-Schritt, und die Grenze zwischen funktionierendem MVP und späterem Production-Ausbau.

WAHRHEITSREGELN
- Die LLM-Schicht unterstützt nur Bewertung und Textausgabe; niemals autonome Wahrheitserkennung behaupten.
- Nutze ausschließlich den gegebenen App-Kontext. Keine Claims, Quellen oder Chris-Aussagen erfinden.
- Nicht behaupten, dass TikTok/Instagram/OCR/Audio/eine komplette Chris-Datenbank/RAG fertig seien — das ist Ausbaupfad, nicht aktueller Stand.
- Wenn Daten fehlen: klar sagen, was fehlt und wie man es sauber prüft. Fallback/MVP ehrlich markieren.
- Keine Secrets, internen Bypass-Links oder Env-Werte nennen.
- Apify und manueller Import liefern Intake-Kandidaten/Quellenmaterial; Supabase speichert echte Claims/Runs, wenn konfiguriert; YouTube nur als Quellen-URL, nicht als aktives API-Crawler-System.

AUSBAUPFAD (kennen, aber nicht als fertig verkaufen)
- Kontinuierliche Datenfeeds/Crawler, Chris Knowledge Base aus Transkripten/Statements, Review-Logs, False-Positive/-Negative-Tuning, RAG-Kontext, Content-Lane (Hook → Script → Carousel → Lead-Magnet → Funnel). Human Review bleibt die Qualitätsschleife.

STIL
- Deutsch, klar, kurz bis mittellang, handlungsorientiert. Keine Motivationsfloskeln, keine Übertreibung. Immer mit konkretem nächsten Schritt.
- Bei Crawler-/Intake-/Ziel-Feinjustierung: 1-3 konkrete Setup-Fragen stellen und daraus klare Such-/Filterregeln formulieren.
- Bei Monitoring/Fehleranalyse: nur sichtbare Health-/Run-/Claim-Signale nutzen und Prüfroute, Symptom, Verdacht und nächsten Test nennen.`;

function cleanMessage(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 1600) : "";
}

function topClaims(claims: ClaimItem[] = []) {
  return claims
    .filter((claim) => claim.stage !== "rejected")
    .sort((a, b) => b.riskScore + b.relevanceScore - (a.riskScore + a.relevanceScore))
    .slice(0, 5);
}

function buildContext(body: ChatRequest) {
  const claims = topClaims(body.context?.claims);
  const candidateContext = body.context as typeof body.context & {
    candidates?: Array<Record<string, unknown>>;
    hunterCandidates?: Array<Record<string, unknown>>;
  };
  const candidates = (candidateContext?.hunterCandidates ?? candidateContext?.candidates ?? [])
    .filter((candidate) => candidate.status !== "rejected")
    .sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0))
    .slice(0, 5);
  const latestRun = body.context?.hunterRuns?.[0];
  const health = body.context?.health;

  return [
    `Selected claim id: ${body.selectedClaimId || "none"}`,
    `Runtime: Supabase=${health?.supabaseConfigured ? "configured" : "missing"}; LLM=${health?.llmConfigured ? "configured" : "missing"}; Apify=${health?.apifyConfigured ? "configured" : "missing"}`,
    body.context?.intakeBrief
      ? `Intake setup: goal=${body.context.intakeBrief.goal || "not set"}; platforms=${Object.entries(body.context.intakeBrief.platforms ?? {}).filter(([, enabled]) => enabled).map(([platform]) => platform).join(", ") || "none"}; minViews=${body.context.intakeBrief.minViews ?? "not set"}; mustInclude=${body.context.intakeBrief.mustInclude || "not set"}; avoid=${body.context.intakeBrief.avoid || "not set"}`
      : "Intake setup: not provided",
    claims.length
      ? `Claims:\n${claims.map((claim) => `- ${claim.id}: ${claim.claim} | ${claim.category} | Risiko ${claim.riskScore} | Fit ${claim.relevanceScore} | Stage ${claim.stage}`).join("\n")}`
      : "Claims: none",
    candidates.length
      ? `Intake candidates:\n${candidates.map((candidate) => {
          const id = String(candidate.id ?? "candidate");
          const claim = String(candidate.claim ?? candidate.title ?? "ohne Claim");
          const topic = candidate.topic ? ` | Topic ${String(candidate.topic)}` : "";
          const platform = candidate.platform ? ` | Platform ${String(candidate.platform)}` : "";
          const score = typeof candidate.score === "number" ? ` | Score ${candidate.score}` : "";
          const status = candidate.status ? ` | Status ${String(candidate.status)}` : "";
          const reasonValue = candidate.reason ?? candidate.targetReason;
          const reason = reasonValue ? ` | Reason ${String(reasonValue)}` : "";
          return `- ${id}: Claim ${claim}${topic}${platform}${score}${status}${reason}`;
        }).join("\n")}`
      : "Intake candidates: none",
    latestRun
      ? `Latest Apify/manual run: ok=${latestRun.ok}; found=${latestRun.candidatesFound}; saved=${latestRun.candidatesSaved}; promoted=${latestRun.promotedClaims}; discarded=${latestRun.discardedCandidates ?? 0}`
      : "Latest Apify/manual run: none",
  ].join("\n\n");
}

function actionsFor(message: string, claims: ClaimItem[], selectedClaimId?: string): ChatAction[] {
  const lower = message.toLowerCase();
  const selected = claims.find((claim) => claim.id === selectedClaimId) ?? claims[0];
  const actions: ChatAction[] = [];

  if (/(intake|apify|finden|suchen|run|lauf|kandidat)/.test(lower)) {
    actions.push({ type: "runIntake", label: "Apify-Intake starten" });
  }
  if (/(fehler|error|monitor|diagnose|health|status|kaputt|bug)/.test(lower)) {
    actions.push({ type: "openCases", label: "Status im Studio prüfen", claimId: selected?.id });
  }
  if (/(claim|fall|prüf|pruef|review|beleg|evidence|quelle)/.test(lower)) {
    actions.push({ type: "openCases", label: "Vollprüfung öffnen", claimId: selected?.id });
  }
  if (selected && /(content|paket|skript|hook|thumbnail|brief|loom)/.test(lower)) {
    actions.push({ type: "createBrief", label: "Content-Paket bauen", claimId: selected.id });
  }
  if (/(creator|akte|kanal|historie)/.test(lower)) {
    actions.push({ type: "openKartei", label: "Akte öffnen" });
  }
  if (selected && actions.length === 0) {
    actions.push({ type: "openClaim", label: "Top-Claim öffnen", claimId: selected.id });
  }
  return actions.slice(0, 3);
}

function fallbackReply(message: string, body: ChatRequest) {
  const claims = topClaims(body.context?.claims);
  const fallbackContext = body.context as typeof body.context & { candidates?: Array<Record<string, unknown>> };
  const candidates = fallbackContext?.hunterCandidates ?? fallbackContext?.candidates ?? [];
  const latestRun = body.context?.hunterRuns?.[0];
  const health = body.context?.health;
  const lower = message.toLowerCase();

  if (/(chris fact radar|was ist|mvp|proof|beta|aktuell nur)/.test(lower)) {
    return [
      "Chris Fact Radar ist ein Proof-of-Work/Beta-MVP für Claim Review und Content-Produktion im Fitness-/Ernährungsbereich.",
      "Aktuell echt im MVP: Studio-Oberfläche, Claim-Queue, manuelle oder Apify-basierte Intake-Logik, Review-Status, Evidence-/Chris-Fit-Denken, Content-Pack-/Skript-Workflows und ein Secretary mit LLM- oder Fallback-Antwort.",
      "Noch nicht als fertig verkaufen: autonomer Dauer-Crawler, vollständige TikTok/Instagram/YouTube-Pipeline, finale Wahrheitsmaschine, große Chris-Knowledge-Base/RAG und rechtlich geprüfter Production-Datenbetrieb.",
      "Nächster sauberer Schritt: einen echten Claim auswählen, Originalaussage und Belege prüfen und daraus ein kontrolliertes Reaktions-Briefing bauen.",
    ].join(" ");
  }

  if (!claims.length && !candidates.length) {
    return [
      "Aktuell liegen mir keine echten Review-Cases oder Intake-Kandidaten im API-Kontext vor.",
      health?.apifyConfigured
        ? "Nächster sauberer Schritt: Apify-Intake starten und danach Kandidaten mit Reject-Gründen prüfen."
        : "Nächster sauberer Schritt: Apify-Token oder Supabase konfigurieren, alternativ einen manuell geprüften Claim einwerfen.",
      health?.llmConfigured ? "Ein LLM-Provider ist konfiguriert." : "Kein LLM-Provider ist aktiv; diese Antwort ist der lokale Fallback.",
    ].join(" ");
  }

  if (/(intake|apify|finden|suchen|run|lauf|kandidat)/.test(lower)) {
    return latestRun
      ? `Letzter Intake: ${latestRun.candidatesFound} gefunden, ${latestRun.candidatesSaved} gespeichert, ${latestRun.discardedCandidates ?? 0} verworfen, ${latestRun.promotedClaims} Claims übernommen. Öffne Intake und prüfe zuerst Kandidaten mit klarer Aussagebasis.`
      : "Es gibt noch keinen dokumentierten Intake-Lauf. Starte Apify-Intake oder importiere einen geprüften Claim manuell.";
  }

  if (/(fehler|error|monitor|diagnose|health|status|kaputt|bug)/.test(lower)) {
    return `Diagnose aus sichtbaren Signalen: Supabase ${health?.supabaseConfigured ? "verbunden" : "fehlt"}, Apify ${health?.apifyConfigured ? "verbunden" : "fehlt"}, LLM ${health?.llmConfigured ? "konfiguriert" : "fehlt"}. Nächster Test: /api/health, danach /api/chat mit Fallback erzwingen und /api/hunter prüfen. Wenn Live alte UI zeigt, ist das Deployment/Alias-Problem, nicht der lokale Code.`;
  }

  const top = claims[0];
  if (top && /(content|paket|skript|hook|thumbnail|brief|loom)/.test(lower)) {
    return `Für Content ist der stärkste nächste Fall: "${top.claim}". Erst Belege/Originalaussage prüfen, dann Content-Paket öffnen. Ohne LLM bleibt das Paket deterministisch als Fallback markiert.`;
  }

  if (top) {
    return `Nächster sinnvoller Schritt: "${top.claim}" prüfen. Risiko ${top.riskScore}, Chris-Fit ${top.relevanceScore}, Stage ${top.stage}. Öffne die Vollprüfung und kontrolliere Originalaussage, Belege und Freigabe.`;
  }

  return "Ich kann gerade nur vorhandene Daten einordnen. Öffne Intake oder importiere einen geprüften Claim, dann kann ich priorisieren.";
}

export async function POST(request: Request) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = (await request.json().catch(() => null)) as ChatRequest | null;
  const message = cleanMessage(body?.message);
  if (!body || !message) {
    return NextResponse.json({ error: "Missing message" }, { status: 400 });
  }

  const context = buildContext(body);
  const userPrompt = `User message:\n${message}\n\nAvailable app context:\n${context}`;
  const claims = topClaims(body.context?.claims);
  const actions = actionsFor(message, claims, body.selectedClaimId);
  const forceFallback = request.headers.get("x-force-fallback") === "1";

  if (llmConfigured() && !forceFallback) {
    try {
      const raw = await callOpusProxy(userPrompt, SYSTEM_PROMPT, { timeoutMs: 12_000, maxTokens: 450 });
      if (raw?.trim()) {
        return NextResponse.json({
          ok: true,
          reply: raw.trim(),
          answer: raw.trim(),
          source: "llm",
          model: opusProxyModel(),
          actions,
          citedClaimIds: claims.map((claim) => claim.id).slice(0, 3),
          status: "llm-provider",
        });
      }
    } catch {
      // Fall through to deterministic fallback. The Secretary must never fail just because the LLM provider is unavailable.
    }
  }

  const reply = fallbackReply(message, body);
  return NextResponse.json({
    ok: true,
    reply,
    answer: reply,
    source: "fallback",
    reason: forceFallback ? "forced-by-test-or-diagnostics" : "provider-unavailable-or-missing",
    actions,
    citedClaimIds: claims.map((claim) => claim.id).slice(0, 3),
    status: llmConfigured() ? "llm-unavailable-fallback" : "llm-missing-fallback",
  });
}
