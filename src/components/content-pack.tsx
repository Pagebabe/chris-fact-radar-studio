"use client";

import { useState } from "react";
import { Clapperboard, Copy, Check, X } from "lucide-react";
import { buildPackMarkdown } from "@/lib/pack";
import type { ClaimItem, ContentPack } from "@/lib/types";

type Props = {
  item: ClaimItem;
  pack: ContentPack;
  source: "llm" | "fallback";
  onClose: () => void;
  onTeleprompter: (text: string) => void;
};

async function writeClipboard(text: string) {
  if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
  await navigator.clipboard.writeText(text);
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      className="pack-copy"
      onClick={() => {
        writeClipboard(text)
          .then(() => {
            setState("copied");
            setTimeout(() => setState("idle"), 1600);
          })
          .catch(() => {
            setState("failed");
            setTimeout(() => setState("idle"), 2200);
          });
      }}
      aria-label={label ? `${label} kopieren` : "Kopieren"}
    >
      {state === "copied" ? <Check size={13} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      {state === "copied" ? "Kopiert" : state === "failed" ? "Nicht kopiert" : "Kopieren"}
    </button>
  );
}

export function ContentPackModal({ item, pack, source, onClose, onTeleprompter }: Props) {
  const [allCopied, setAllCopied] = useState<"idle" | "copied" | "failed">("idle");

  function copyAll() {
    writeClipboard(buildPackMarkdown(pack, item))
      .then(() => {
        setAllCopied("copied");
        setTimeout(() => setAllCopied("idle"), 1800);
      })
      .catch(() => {
        setAllCopied("failed");
        setTimeout(() => setAllCopied("idle"), 2400);
      });
  }

  return (
    <div className="pack-overlay" role="dialog" aria-label="Content-Paket" aria-modal="true">
      <div className="pack-modal">
        <div className="pack-header">
          <div>
            <h2>🎬 Content-Paket</h2>
            <p className="pack-sub">{item.sourceVideo.creator} · &bdquo;{item.claim.slice(0, 60)}…&ldquo;</p>
          </div>
          <div className="pack-header-actions">
            <span className={`chip ${source === "llm" ? "green" : ""}`}>{source === "llm" ? "KI-generiert" : "Heuristik"}</span>
            <button className="button primary" onClick={copyAll}>
              {allCopied === "copied" ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
              {allCopied === "copied" ? "Kopiert!" : allCopied === "failed" ? "Clipboard blockiert" : "Alles kopieren"}
            </button>
            <button className="pack-close" onClick={onClose} aria-label="Content-Paket schließen"><X size={18} /></button>
          </div>
        </div>

        <div className="pack-body">
          <PackSection title="Hooks (erste 3 Sekunden)">
            <ul className="pack-list">
              {pack.hooks.map((h, i) => (
                <li key={i}><span>{h}</span><CopyButton text={h} label="Hook" /></li>
              ))}
            </ul>
          </PackSection>

          <PackSection title="Short-Skript (~30s)" copyText={pack.shortScript}>
            <pre className="pack-script">{pack.shortScript}</pre>
          </PackSection>

          <PackSection title="Langes Skript (~60s)" copyText={pack.longScript}>
            <pre className="pack-script">{pack.longScript}</pre>
            <button className="button" onClick={() => onTeleprompter(pack.longScript)}>
              <Clapperboard size={15} aria-hidden="true" /> Im Teleprompter öffnen
            </button>
          </PackSection>

          <PackSection title="Titel-Vorschläge">
            <ul className="pack-list">
              {pack.titles.map((t, i) => (
                <li key={i}><span>{t}</span><CopyButton text={t} label="Titel" /></li>
              ))}
            </ul>
          </PackSection>

          <PackSection title="Beschreibung" copyText={pack.description}>
            <pre className="pack-script">{pack.description}</pre>
          </PackSection>

          <PackSection title="Hashtags" copyText={pack.hashtags.join(" ")}>
            <div className="pack-tags">{pack.hashtags.map((t, i) => <span key={i} className="chip">{t}</span>)}</div>
          </PackSection>

          <PackSection title="Community-Post" copyText={pack.communityPost}>
            <pre className="pack-script">{pack.communityPost}</pre>
          </PackSection>

          <PackSection title="Thumbnail-Text">
            <ul className="pack-list">
              {pack.thumbnailTexts.map((t, i) => (
                <li key={i}><span className="pack-thumb-text">{t}</span><CopyButton text={t} label="Thumbnail-Text" /></li>
              ))}
            </ul>
          </PackSection>
        </div>
      </div>
    </div>
  );
}

function PackSection({ title, copyText, children }: { title: string; copyText?: string; children: React.ReactNode }) {
  return (
    <section className="pack-section">
      <div className="pack-section-head">
        <h3>{title}</h3>
        {copyText && <CopyButton text={copyText} label={title} />}
      </div>
      {children}
    </section>
  );
}
