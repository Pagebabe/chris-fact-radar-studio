"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";

export function Teleprompter({ script, onClose }: { script: string; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(40);

  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let last = performance.now();
    const step = (now: number) => {
      const node = scrollRef.current;
      if (node) {
        node.scrollTop += ((now - last) / 1000) * speed;
        if (node.scrollTop + node.clientHeight >= node.scrollHeight - 2) setPlaying(false);
      }
      last = now;
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, speed]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === " ") {
        event.preventDefault();
        setPlaying((current) => !current);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="teleprompter-overlay" role="dialog" aria-label="Teleprompter">
      <div className="teleprompter-controls">
        <button className="button" onClick={() => setPlaying((current) => !current)} aria-label={playing ? "Pause" : "Start"}>
          {playing ? <Pause size={16} aria-hidden="true" /> : <Play size={16} aria-hidden="true" />}
          {playing ? "Pause" : "Start"}
        </button>
        <label className="teleprompter-speed">
          Tempo
          <input
            type="range"
            min={15}
            max={110}
            value={speed}
            onChange={(event) => setSpeed(Number(event.target.value))}
            aria-label="Scroll-Tempo"
          />
        </label>
        <button
          className="button"
          onClick={() => {
            if (scrollRef.current) scrollRef.current.scrollTop = 0;
            setPlaying(false);
          }}
          aria-label="Neustart"
        >
          <RotateCcw size={16} aria-hidden="true" />
        </button>
        <button className="button" onClick={onClose} aria-label="Teleprompter schließen">
          <X size={16} aria-hidden="true" />
        </button>
      </div>
      <div className="teleprompter-scroll" ref={scrollRef}>
        <div className="teleprompter-text">
          {script.split("\n").map((line, index) => (
            <p key={`${index}-${line.slice(0, 12)}`}>{line || " "}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
