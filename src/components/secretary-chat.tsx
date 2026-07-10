"use client";

import type { Dispatch, SetStateAction } from "react";
import { useRef, useState } from "react";
import type { ClaimItem } from "@/lib/types";
import { parseYoutubeVideoUrl, youtubeEmbedUrl } from "@/lib/youtube";

export type ChatActionType = "openClaim" | "runIntake" | "createBrief" | "openCases" | "openKartei";
export type ChatAction = { type: ChatActionType; label: string; claimId?: string };
export type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  badge?: string;
  actions?: ChatAction[];
  citedClaimIds?: string[];
};

type SecretaryChatProps = {
  claimCount: number;
  topClaimText: string | null;
  items: ClaimItem[];
  selectedClaimId?: string;
  messages: ChatMsg[];
  setMessages: Dispatch<SetStateAction<ChatMsg[]>>;
  onAction: (action: ChatAction) => void;
};

const SUGGESTIONS = [
  "Welchen Claim soll ich als nächstes beantworten?",
  "Erkläre mir den Top-Treffer und warum er zählt.",
  "Gib mir Hook + 3 Argumente für ein Reaktions-Video.",
];

export function SecretaryChat({
  claimCount,
  topClaimText,
  items,
  selectedClaimId,
  messages,
  setMessages,
  onAction,
}: SecretaryChatProps) {
  const intro = topClaimText
    ? `Guten Tag. Ich habe ${claimCount} Claims im Radar. Der aktuell relevanteste ist „${topClaimText}". Frag mich, was du als Nächstes angehen sollst, oder lass dir daraus ein Reaktions-Skript vorbereiten.`
    : `Guten Tag. Aktuell liegen ${claimCount} Claims im Radar. Starte im Studio einen Lauf oder frag mich, wie der Workflow funktioniert.`;

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setMessages((m) => [...m, { role: "user", content }]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Bewusst KEIN Verlauf mitsenden: der Bot bekommt kein Gedächtnis.
        body: JSON.stringify({ message: content, selectedClaimId }),
      });
      const data = (await res.json()) as {
        reply?: string;
        model?: string;
        source?: string;
        actions?: ChatAction[];
        citedClaimIds?: string[];
        error?: string;
      };
      if (!res.ok || !data.reply) {
        setError(data.error || "Keine Antwort erhalten.");
      } else {
        // Antwortquelle transparent machen: Fallback und Systemfakten dürfen
        // nicht wie eine LLM-Antwort aussehen.
        const badge = data.source === "llm" ? (data.model ?? "LLM") : data.source === "system" ? "Systemfakten" : "Fallback";
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.reply as string,
            badge,
            actions: data.actions ?? [],
            citedClaimIds: data.citedClaimIds ?? [],
          },
        ]);
      }
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
    }
  }

  function videoClaims(citedClaimIds?: string[]) {
    if (!citedClaimIds?.length) return [];
    const seen = new Set<string>();
    const result: ClaimItem[] = [];
    for (const id of citedClaimIds) {
      const item = items.find((entry) => entry.id === id);
      if (!item?.sourceVideo?.thumbnail || !youtubeEmbedUrl(item.sourceVideo.url)) continue;
      // Pro Video nur ein Chip: mehrere Claims teilen sich oft dasselbe Quellvideo
      // (nur an anderen Timestamps). Dedupe über die Video-ID, nicht die URL.
      const videoId = parseYoutubeVideoUrl(item.sourceVideo.url)?.id ?? item.sourceVideo.url;
      if (seen.has(videoId)) continue;
      seen.add(videoId);
      result.push(item);
    }
    return result;
  }

  const rendered: ChatMsg[] = [{ role: "assistant", content: intro }, ...messages];

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {rendered.map((m, i) =>
          m.role === "assistant" ? (
            <div key={i} className="max-w-[90%] rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4 text-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-300">Secretary{m.badge ? ` · ${m.badge}` : ""}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6">{m.content}</p>

              {videoClaims(m.citedClaimIds).map((claim) => {
                const embedUrl = youtubeEmbedUrl(claim.sourceVideo.url);
                const isPlaying = playingVideoId === claim.id;
                return (
                  <div key={claim.id} className="secretary-video">
                    {isPlaying && embedUrl ? (
                      <iframe
                        className="secretary-video-embed"
                        src={embedUrl}
                        title={claim.sourceVideo.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowFullScreen
                      />
                    ) : (
                      <button
                        type="button"
                        className="secretary-video-button"
                        onClick={() => setPlayingVideoId(claim.id)}
                        aria-label={`Video starten: ${claim.sourceVideo.title}`}
                      >
                        <img className="secretary-video-thumb" src={claim.sourceVideo.thumbnail || undefined} alt="" loading="lazy" />
                        <span className="secretary-video-play" aria-hidden="true">▶</span>
                        <span className="secretary-video-meta">
                          {claim.sourceVideo.creator} · {claim.sourceVideo.title}
                        </span>
                      </button>
                    )}
                  </div>
                );
              })}

              {m.actions && m.actions.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.actions.map((action, ai) => (
                    <button
                      key={`${action.type}-${ai}`}
                      type="button"
                      onClick={() => onAction(action)}
                      className="rounded-full border border-cyan-300/40 bg-cyan-300/10 px-3 py-1.5 text-xs font-bold text-cyan-100 hover:border-cyan-200 hover:bg-cyan-300/20"
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div key={i} className="ml-auto max-w-[84%] rounded-xl border border-white/10 bg-white/[0.05] p-4 text-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Chris</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6">{m.content}</p>
            </div>
          ),
        )}
        {loading && (
          <div className="max-w-[90%] rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4 text-slate-300">
            <p className="text-sm">Secretary denkt nach …</p>
          </div>
        )}
        {error && (
          <div className="rounded-[1.5rem] border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">{error}</div>
        )}
      </div>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={loading}
              onClick={() => send(s)}
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-cyan-300 hover:text-cyan-100 disabled:opacity-50"
            >
              {s}
            </button>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Frag den Secretary zu einem Treffer …"
            className="flex-1 rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-cyan-300/60 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-cyan-300 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-cyan-200 disabled:opacity-50"
          >
            Senden
          </button>
        </form>
      </div>
    </div>
  );
}
