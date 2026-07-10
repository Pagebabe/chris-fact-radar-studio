"use client";

import { useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string; badge?: string };

type SecretaryChatProps = {
  claimCount: number;
  topClaimText: string | null;
};

const SUGGESTIONS = [
  "Welchen Claim soll ich als nächstes beantworten?",
  "Erkläre mir den Top-Treffer und warum er zählt.",
  "Gib mir Hook + 3 Argumente für ein Reaktions-Video.",
];

export function SecretaryChat({ claimCount, topClaimText }: SecretaryChatProps) {
  const intro = topClaimText
    ? `Guten Tag. Ich habe ${claimCount} Claims im Radar. Der aktuell relevanteste ist „${topClaimText}". Frag mich, was du als Nächstes angehen sollst, oder lass dir daraus ein Reaktions-Skript vorbereiten.`
    : `Guten Tag. Aktuell liegen ${claimCount} Claims im Radar. Starte im Studio einen Lauf oder frag mich, wie der Workflow funktioniert.`;

  // Intro nicht in den State legen: claimCount ist beim ersten Render oft noch 0
  // (Daten laden asynchron) und würde dort als "0 Claims" einfrieren.
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user" as const, content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: content }),
      });
      const data = (await res.json()) as { reply?: string; model?: string; source?: string; error?: string };
      if (!res.ok || !data.reply) {
        setError(data.error || "Keine Antwort erhalten.");
      } else {
        // Antwortquelle transparent machen: Fallback und Systemfakten dürfen
        // nicht wie eine LLM-Antwort aussehen.
        const badge = data.source === "llm" ? (data.model ?? "LLM") : data.source === "system" ? "Systemfakten" : "Fallback";
        setMessages((m) => [...m, { role: "assistant", content: data.reply as string, badge }]);
      }
    } catch {
      setError("Netzwerkfehler — bitte erneut versuchen.");
    } finally {
      setLoading(false);
      requestAnimationFrame(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }));
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
        {[{ role: "assistant" as const, content: intro }, ...messages].map((m, i) =>
          m.role === "assistant" ? (
            <div key={i} className="max-w-[90%] rounded-xl border border-cyan-300/20 bg-cyan-300/[0.07] p-4 text-slate-100">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-cyan-300">Secretary{m.badge ? ` · ${m.badge}` : ""}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-sm leading-6">{m.content}</p>
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
