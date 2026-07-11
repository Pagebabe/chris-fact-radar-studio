"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Check,
  ClipboardList,
  Clapperboard,
  Download,
  Filter,
  Flame,
  FlaskConical,
  Gauge,
  Image as ImageIcon,
  Lightbulb,
  Loader2,
  MessageCircle,
  Palette,
  Play,
  Radar,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { buildMarkdownExport } from "@/lib/export";
import { initialCreators, initialScienceItems, initialTruths, stages, verdictLabel, verdictTone } from "@/lib/data";
import { compactNumber, dateLabel, percent, reachScore } from "@/lib/format";
import { buildMythClusters, isHot, preserveViewHistory, videoVelocity } from "@/lib/myths";
import { buildCreatorDossiers, claimPriority } from "@/lib/creators";
import { matchClaimToTruths } from "@/lib/truth";
import { matchScienceToClaim } from "@/lib/science-match";
import { buildFallbackPack, buildPackMarkdown } from "@/lib/pack";
import { loadSettings } from "@/lib/settings";
import { normalizeClaimsSourceUrls } from "@/lib/debate-claims";
import { isYoutubeSearchUrl, youtubeEmbedUrl, youtubeWatchUrl } from "@/lib/youtube";
import { Teleprompter } from "./teleprompter";
import { ContentPackModal } from "./content-pack";
import { Kartei } from "./kartei";
import { Lexikon } from "./lexikon";
import { ScienceView } from "./science-view";
import { SettingsPanel } from "./settings-panel";
import { HunterView } from "./hunter-view";
import { SecretaryChat, type ChatAction, type ChatMsg } from "./secretary-chat";
import { Settings, FolderOpen } from "lucide-react";
import type { AppSettings } from "@/lib/settings";
import type { ClaimItem, ContentPack, CreatorRecord, HunterCandidate, HunterProfile, HunterRun, ScienceItem, StageId, TruthRecord } from "@/lib/types";

type AppView = "secretary" | "today" | "cases" | "kartei" | "lexikon" | "science" | "hunter";

const STORAGE_KEY = "chris-fact-radar.items.v1";

function stageCount(items: ClaimItem[], stageId: StageId) {
  return items.filter((item) => item.stage === stageId).length;
}

function matchesQuery(item: ClaimItem, query: string) {
  const haystack = [
    item.claim,
    item.category,
    item.sourceVideo.creator,
    item.sourceVideo.title,
    item.sourceVideo.platform,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

export function RadarApp() {
  const [items, setItems] = useState<ClaimItem[]>(() => loadStoredItems());
  const [activeStage, setActiveStage] = useState<StageId>("ready");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [selectedId, setSelectedId] = useState("");
  // Welcher Fall spielt gerade inline in der Vollprüfungs-Liste? (nur einer gleichzeitig)
  const [playingListId, setPlayingListId] = useState<string | null>(null);
  const [activeMyth, setActiveMyth] = useState<string | null>(null);
  const [teleprompterScript, setTeleprompterScript] = useState<string | null>(null);
  const [isScripting, setIsScripting] = useState(false);
  const [activePack, setActivePack] = useState<{ item: ClaimItem; pack: ContentPack; source: "llm" | "fallback" } | null>(null);
  const [packingId, setPackingId] = useState<string | null>(null);
  const [status, setStatus] = useState(() =>
    typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY)
      ? "Gespeicherte Prüf-Queue aus diesem Browser wiederhergestellt."
      : "Keine lokale Queue geladen. Echte Fälle kommen aus Supabase, Apify-Intake oder manuellem Import."
  );

  const [serverStore, setServerStore] = useState(false);
  const [serverWritable, setServerWritable] = useState(false);
  const [activeView, setActiveView] = useState<AppView>("secretary");
  // Chat-Verlauf im Parent halten, damit er den View-Wechsel überlebt.
  const [chatMessages, setChatMessages] = useState<ChatMsg[]>([]);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);
  const [creators, setCreators] = useState<CreatorRecord[]>(initialCreators);
  const [truths] = useState<TruthRecord[]>(initialTruths);
  const [scienceItems, setScienceItems] = useState<ScienceItem[]>(initialScienceItems);
  const [llmCallsToday] = useState(0);
  const [hunterConfigured, setHunterConfigured] = useState(false);
  const [hunterProfiles, setHunterProfiles] = useState<HunterProfile[]>([]);
  const [hunterCandidates, setHunterCandidates] = useState<HunterCandidate[]>([]);
  const [hunterRuns, setHunterRuns] = useState<HunterRun[]>([]);
  const [isHunterRunning, setIsHunterRunning] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/claims")
      .then((res) => res.json() as Promise<{ configured: boolean; claims: ClaimItem[]; writable?: boolean }>)
      .then((data) => {
        if (cancelled || !data.configured) return;
        setServerStore(true);
        setServerWritable(Boolean(data.writable));
        if (data.claims.length > 0) {
          setItems((current) => reconcileWithServer(data.claims, current));
          setSelectedId((current) => current || data.claims[0]?.id || "");
          setStatus("Geteilte Queue aus dem Team-Speicher geladen.");
        } else {
          setStatus("Team-Speicher verbunden, aber keine echten Review-Cases geladen.");
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeClaimsSourceUrls(items)));
    } catch {}
    if (serverStore && serverWritable) {
      fetch("/api/claims", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claims: items }),
      }).catch(() => {});
    }
  }, [items, serverStore, serverWritable]);

  // Load creators and science from server when available
  useEffect(() => {
    fetch("/api/creators")
      .then((r) => r.json() as Promise<{ configured: boolean; creators: CreatorRecord[] }>)
      .then((d) => { if (d.configured && d.creators.length > 0) setCreators(d.creators); })
      .catch(() => {});
    fetch("/api/science")
      .then((r) => r.json() as Promise<{ configured: boolean; items: ScienceItem[] }>)
      .then((d) => { if (d.configured && d.items.length > 0) setScienceItems(d.items); })
      .catch(() => {});
    fetch("/api/hunter")
      .then((r) => r.json() as Promise<{
        configured: boolean;
        profiles: HunterProfile[];
        candidates: HunterCandidate[];
        runs: HunterRun[];
      }>)
      .then((data) => {
        setHunterConfigured(data.configured);
        setHunterProfiles(data.profiles);
        setHunterCandidates(data.candidates);
        setHunterRuns(data.runs);
      })
      .catch(() => {});
  }, []);

  // Rebuild creator dossiers derived from claims (no external deps, pure derivation)
  const derivedCreators = useMemo(() => buildCreatorDossiers(items, creators), [items, creators]);

  function handleToggleWatch(creatorId: string) {
    setCreators((prev) => {
      const current = prev.find((c) => c.id === creatorId);
      const watched = !current?.watched;
      fetch(`/api/hunter/creators/${encodeURIComponent(creatorId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ watched }),
      }).catch(() => {});
      return prev.map((c) => c.id === creatorId ? { ...c, watched, status: watched ? "watched" : "suggested" } : c);
    });
  }

  const categories = useMemo(() => ["All", ...Array.from(new Set(items.map((item) => item.category)))], [items]);
  const mythClusters = useMemo(() => buildMythClusters(items), [items]);
  const activeMythCluster = mythClusters.find((cluster) => cluster.id === activeMyth) ?? null;

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => item.stage === activeStage)
      .filter((item) => !activeMythCluster || activeMythCluster.itemIds.includes(item.id))
      .filter((item) => category === "All" || item.category === category)
      .filter((item) => !query.trim() || matchesQuery(item, query))
      .sort(
        (a, b) =>
          (videoVelocity(b.sourceVideo) ?? 0) - (videoVelocity(a.sourceVideo) ?? 0) ||
          b.riskScore + b.relevanceScore - (a.riskScore + a.relevanceScore)
      );
  }, [activeStage, activeMythCluster, category, items, query]);

  const selected = items.find((item) => item.id === selectedId) ?? filteredItems[0] ?? items[0] ?? null;
  const totalReach = items.reduce((sum, item) => sum + item.sourceVideo.views, 0);
  const readyCount = items.filter((item) => item.stage === "ready" || item.stage === "accepted").length;
  const sourceMix = useMemo(() => buildSourceMix(items), [items]);
  const todayItems = useMemo(() => buildTodayItems(items, truths), [items, truths]);

  function handleStage(stageId: StageId) {
    setActiveStage(stageId);
    const first = items.find((item) => item.stage === stageId);
    setSelectedId(first?.id ?? "");
  }

  async function copyExport() {
    if (!selected) {
      setStatus("Kein echter Fall geladen. Erst Apify/manual Intake oder Supabase prüfen.");
      return;
    }
    try {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: selected, format: "markdown" }),
      });
      const data = (await response.json()) as { content?: string };
      await navigator.clipboard?.writeText(data.content ?? buildMarkdownExport(selected));
      setStatus("Brief in die Zwischenablage kopiert.");
    } catch {
      await navigator.clipboard?.writeText(buildMarkdownExport(selected));
      setStatus("Brief lokal kopiert.");
    }
  }

  async function runHunterNow() {
    setIsHunterRunning(true);
    setStatus("Apify-Intake läuft: Social-Kandidaten werden gesucht und triagiert …");
    try {
      const response = await fetch("/api/hunter/run", { method: "POST" });
      const data = (await response.json()) as {
        run?: HunterRun;
        candidates?: HunterCandidate[];
        claims?: ClaimItem[];
        creators?: CreatorRecord[];
      };
      if (!response.ok || !data.run) throw new Error("hunter failed");
      setHunterRuns((current) => [data.run as HunterRun, ...current.filter((run) => run.id !== data.run?.id)]);
      if (data.candidates) setHunterCandidates((current) => mergeCandidates(data.candidates ?? [], current));
      if (data.claims?.length) {
        setItems((current) => mergeClaims(data.claims ?? [], current));
        setActiveStage("new");
        setSelectedId(data.claims[0].id);
        setActiveView("cases");
      }
      if (data.creators?.length) setCreators(data.creators);
      setStatus(`Intake fertig: ${data.run.qualityPassed ?? data.run.candidatesSaved} Qualitäts-Kandidaten, ${data.run.discardedCandidates ?? 0} verworfen, ${data.run.promotedClaims} neue Claims.`);
    } catch {
      setStatus("Apify-Intake fehlgeschlagen. Prüfe Supabase/API-Keys oder starte später erneut.");
    } finally {
      setIsHunterRunning(false);
    }
  }

  async function promoteCandidate(candidate: HunterCandidate) {
    try {
      const response = await fetch(`/api/hunter/candidates/${encodeURIComponent(candidate.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "promote" }),
      });
      const data = (await response.json()) as { ok: boolean; claim?: ClaimItem; candidate?: HunterCandidate; reason?: string };
      if (!response.ok || !data.ok || !data.claim || !data.candidate) throw new Error(data.reason ?? "promote failed");
      setItems((current) => mergeClaims([data.claim as ClaimItem], current));
      setHunterCandidates((current) => current.map((entry) => entry.id === data.candidate?.id ? data.candidate : entry));
      setActiveStage("new");
      setSelectedId(data.claim.id);
      setActiveView("cases");
      setStatus("Intake-Kandidat wurde als Fall angelegt. Nächster Schritt: Belege prüfen oder Content-Paket bauen.");
    } catch {
      setStatus("Kandidat konnte nicht übernommen werden. Eventuell fehlt ein Transcript oder Supabase ist nicht konfiguriert.");
    }
  }

  async function rejectCandidate(candidate: HunterCandidate) {
    try {
      const response = await fetch(`/api/hunter/candidates/${encodeURIComponent(candidate.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason: "Manuell abgelehnt" }),
      });
      const data = (await response.json()) as { ok: boolean; candidate?: HunterCandidate };
      if (!response.ok || !data.ok || !data.candidate) throw new Error("reject failed");
      setHunterCandidates((current) => current.map((entry) => entry.id === data.candidate?.id ? data.candidate : entry));
      setStatus("Intake-Kandidat abgelehnt.");
    } catch {
      setStatus("Kandidat konnte nicht abgelehnt werden.");
    }
  }

  async function openTeleprompter() {
    if (!selected) {
      setStatus("Kein echter Fall geladen. Skript-Erstellung ist erst nach Intake möglich.");
      return;
    }
    const style = settings.scriptStyleDefault;
    if (selected.script?.text && (selected.script.style ?? "sachlich") === style) {
      setTeleprompterScript(selected.script.text);
      return;
    }
    setIsScripting(true);
    setStatus("Erstelle Reaktions-Skript …");
    try {
      const response = await fetch("/api/script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: selected, style }),
      });
      const data = (await response.json()) as { script?: string; source?: "llm" | "fallback" };
      if (!data.script) throw new Error("empty script");
      const script = { text: data.script, source: data.source ?? "fallback", generatedAt: new Date().toISOString(), style } as const;
      setItems((current) => current.map((item) => (item.id === selected.id ? { ...item, script } : item)));
      setTeleprompterScript(data.script);
      setStatus(
        data.source === "llm"
          ? "Skript im Chris-Ton fertig. Leertaste startet/stoppt das Scrollen."
          : "Skript aus den Antwort-Bausteinen zusammengesetzt. Setze einen LLM-Key für Skripte im Chris-Ton."
      );
    } catch {
      setStatus("Skript-Erstellung fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
      setIsScripting(false);
    }
  }

  async function openContentPack(item?: ClaimItem) {
    const target = item ?? selected;
    if (!target) {
      setStatus("Kein echter Fall geladen. Content-Pakete werden nicht aus künstlichen Fällen gebaut.");
      return;
    }
    const style = settings.scriptStyleDefault;
    if (target.pack?.data && (target.pack.style ?? "sachlich") === style) {
      setActivePack({ item: target, pack: target.pack.data, source: target.pack.source });
      return;
    }

    setPackingId(target.id);
    setStatus("Baue Content-Paket mit Hooks, Skripten, Titel, Hashtags und Thumbnail-Texten …");
    try {
      const response = await fetch("/api/pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item: target, style }),
      });
      const data = (await response.json()) as { pack?: ContentPack; source?: "llm" | "fallback" };
      if (!data.pack) throw new Error("empty pack");
      const source = data.source ?? "fallback";
      const cached = { data: data.pack, source, generatedAt: new Date().toISOString(), style } as const;
      setItems((current) => current.map((claim) => (claim.id === target.id ? { ...claim, pack: cached } : claim)));
      const freshItem = { ...target, pack: cached };
      setActivePack({ item: freshItem, pack: data.pack, source });
      setStatus(source === "llm" ? "Content-Paket ist KI-generiert fertig." : "Content-Paket lokal aus Antwort-Bausteinen gebaut.");
    } catch {
      const pack = buildFallbackPack(target);
      const cached = { data: pack, source: "fallback" as const, generatedAt: new Date().toISOString(), style };
      setItems((current) => current.map((claim) => (claim.id === target.id ? { ...claim, pack: cached } : claim)));
      setActivePack({ item: { ...target, pack: cached }, pack, source: "fallback" });
      setStatus("LLM-Paket fehlgeschlagen. Lokales Content-Paket ist trotzdem bereit.");
    } finally {
      setPackingId(null);
    }
  }

  async function copyTodayPack() {
    if (todayItems.length === 0) {
      setStatus("Kein Tages-Paket kopiert: Es sind keine echten Review-Cases geladen.");
      return;
    }
    const content = todayItems
      .map((item, index) => buildPackMarkdown(item.pack?.data ?? buildFallbackPack(item), item).replace("# Content-Paket:", `# ${index + 1}. Content-Paket:`))
      .join("\n\n---\n\n");
    await navigator.clipboard?.writeText(content);
    setStatus("Tages-Paket mit Top-Claims kopiert.");
  }

  function openCase(item: ClaimItem) {
    setSelectedId(item.id);
    setActiveStage(item.stage);
    setActiveView("cases");
  }

  // Quernavigation aus Chris-Wissen, Science und Kartei in die Vollprüfung.
  function openClaimById(id: string) {
    const item = items.find((entry) => entry.id === id);
    if (item) openCase(item);
  }

  // Aktions-Buttons aus dem Secretary-Chat auf bestehende Navigation mappen.
  function handleChatAction(action: ChatAction) {
    switch (action.type) {
      case "openClaim":
      case "openCases":
      case "createBrief": {
        // Bei fehlender ODER unbekannter Claim-ID nicht ins Leere laufen,
        // sondern die Vollprüfung öffnen.
        const found = action.claimId ? items.find((entry) => entry.id === action.claimId) : undefined;
        if (found) openCase(found);
        else setActiveView("cases");
        break;
      }
      case "runIntake":
        setActiveView("hunter");
        break;
      case "openKartei":
        setActiveView("kartei");
        break;
    }
  }

  function decideSelected(decision: "accepted" | "rejected") {
    if (!selected) {
      setStatus("Kein Fall ausgewählt.");
      return;
    }
    const nextStage: StageId = decision === "accepted" ? "accepted" : "rejected";
    const note = decision === "accepted" ? "Für Chris' Reaktion freigegeben" : "Duplikat oder schlechte Passung";

    setItems((current) =>
      current.map((item) =>
        item.id === selected.id
          ? {
              ...item,
              stage: nextStage,
              decision,
              decisionNote: note,
              decidedAt: new Date().toISOString(),
            }
          : item
      )
    );
    setActiveStage(nextStage);
    setSelectedId(selected.id);
    setStatus(`${decision === "accepted" ? "Angenommen" : "Abgelehnt"}: ${selected.sourceVideo.creator} / ${selected.category}.`);
  }

  return (
    <main className="app-shell">
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setShowSettings(false)}
          llmCallsToday={llmCallsToday}
        />
      )}
      {teleprompterScript && (
        <Teleprompter script={teleprompterScript} onClose={() => setTeleprompterScript(null)} />
      )}
      {activePack && (
        <ContentPackModal
          item={activePack.item}
          pack={activePack.pack}
          source={activePack.source}
          onClose={() => setActivePack(null)}
          onTeleprompter={(text) => setTeleprompterScript(text)}
        />
      )}
      <header className="topbar">
        <div className="brand-block">
          <h1>Chris Fact Radar</h1>
          <p>Creator Studio für Christian Wolf: Funde prüfen, Quellen absichern und Content kontrolliert vorbereiten.</p>
        </div>
        <div className="toolbar" aria-label="Radar-Steuerung">
          <div className="relative">
            <Search aria-hidden="true" size={16} style={{ position: "absolute", left: 11, top: 11, color: "#667085" }} />
            <input
              className="search-field"
              style={{ paddingLeft: 34 }}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Aussagen oder Creator suchen"
              aria-label="Aussagen suchen"
            />
          </div>
          <select className="select-field" value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
          <button className="button" onClick={runHunterNow} disabled={isHunterRunning}>
            {isHunterRunning ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Radar size={16} aria-hidden="true" />}
            Intake starten
          </button>
          <button className="button primary" onClick={copyExport}>
            <Download size={16} aria-hidden="true" />
            Brief exportieren
          </button>
        </div>
      </header>

      {status && (
        <div className="global-status" aria-live="polite" role="status">{status}</div>
      )}

      <div className="app-body">
        <nav className="side-nav" aria-label="Hauptnavigation">
          {NAV_VIEWS.map(({ view, label, Icon }) => (
            <button
              key={view}
              className={`side-nav-item${activeView === view ? " active" : ""}`}
              onClick={() => setActiveView(view)}
              aria-pressed={activeView === view}
            >
              <Icon size={16} aria-hidden="true" />
              {label}
              {view === "hunter" && hunterCandidates.filter((candidate) => candidate.status !== "rejected").length > 0 && (
                <span className="side-nav-badge">{hunterCandidates.filter((candidate) => candidate.status !== "rejected").length}</span>
              )}
              {view === "kartei" && creators.filter((c) => c.watched).length > 0 && (
                <span className="side-nav-badge">{creators.filter((c) => c.watched).length}</span>
              )}
              {view === "science" && scienceItems.filter((s) => s.fetchedAt.slice(0, 10) === new Date().toISOString().slice(0, 10)).length > 0 && (
                <span className="side-nav-badge">neu</span>
              )}
            </button>
          ))}
          <span className="side-nav-spacer" aria-hidden="true" />
          <button className="side-nav-item side-nav-settings" onClick={() => setShowSettings(true)} aria-label="Einstellungen">
            <Settings size={16} aria-hidden="true" />
            Einstellungen
          </button>
        </nav>

        <div className="app-main">

      {activeView === "secretary" && (
        <section className="view-container secretary-view" aria-label="Secretary">
          <div className="secretary-panel">
            <SecretaryChat
              claimCount={items.length}
              topClaimText={[...items].sort((a, b) => (b.riskScore + b.relevanceScore) - (a.riskScore + a.relevanceScore))[0]?.claim ?? null}
              items={items}
              selectedClaimId={selectedId || undefined}
              messages={chatMessages}
              setMessages={setChatMessages}
              onAction={handleChatAction}
            />
          </div>
        </section>
      )}

      {activeView === "today" && (
        <StudioHome
          items={todayItems}
          allItems={items}
          creators={derivedCreators}
          hunterCandidates={hunterCandidates}
          activeId={selected?.id ?? ""}
          packingId={packingId}
          onPreviewCase={(item) => setSelectedId(item.id)}
          onOpenCase={openCase}
          onOpenPack={openContentPack}
          onCopyDay={copyTodayPack}
          onOpenHunter={() => setActiveView("hunter")}
          onOpenKartei={() => setActiveView("kartei")}
        />
      )}
      {activeView === "kartei" && (
        <div className="view-container">
          <Kartei creators={derivedCreators} claims={items} onToggleWatch={handleToggleWatch} onOpenClaim={openClaimById} />
        </div>
      )}
      {activeView === "lexikon" && (
        <div className="view-container">
          <Lexikon claims={items} truths={truths} onOpenClaim={openClaimById} />
        </div>
      )}
      {activeView === "science" && (
        <div className="view-container">
          <ScienceView items={scienceItems} claims={items} onOpenClaim={openClaimById} />
        </div>
      )}
      {activeView === "hunter" && (
        <div className="view-container">
          <HunterView
            configured={hunterConfigured}
            profiles={hunterProfiles}
            candidates={hunterCandidates}
            runs={hunterRuns}
            isRunning={isHunterRunning}
            onRun={runHunterNow}
            onPromote={promoteCandidate}
            onReject={rejectCandidate}
          />
        </div>
      )}

      {activeView === "cases" && mythClusters.length > 0 && (
        <section className="myth-strip" aria-label="Mythen-Radar">
          {mythClusters.slice(0, 6).map((cluster) => (
            <button
              key={cluster.id}
              className={`myth-card ${activeMyth === cluster.id ? "active" : ""}`}
              onClick={() => setActiveMyth(activeMyth === cluster.id ? null : cluster.id)}
              aria-pressed={activeMyth === cluster.id}
            >
              <div className="claim-meta">
                <span>{cluster.count} {cluster.count === 1 ? "Video" : "Videos"}</span>
                <span>{compactNumber(cluster.totalViews)} Views</span>
                {cluster.velocityPerHour > 0 && (
                  <span className="myth-velocity">
                    <Flame size={12} aria-hidden="true" /> +{compactNumber(cluster.velocityPerHour)}/h
                  </span>
                )}
              </div>
              <p>{cluster.label}</p>
              <span className="chip">{cluster.topCategory}</span>
            </button>
          ))}
        </section>
      )}

      {activeView === "cases" && (
        <TodayCockpit
          items={todayItems}
          activeId={selected?.id ?? ""}
          packingId={packingId}
          onSelect={(id) => setSelectedId(id)}
          onOpenSource={(id) => {
            const item = items.find((entry) => entry.id === id);
            if (item) {
              setSelectedId(item.id);
              setActiveView("cases");
              setStatus(`Fall geöffnet: ${item.sourceVideo.creator} / ${item.category}. Klick auf das Thumbnail startet das Video.`);
            }
          }}
          onOpenPack={openContentPack}
          onCopyDay={copyTodayPack}
        />
      )}

      {activeView === "cases" && <section className="workspace">
        <aside className="sidebar" aria-label="Claim-Phasen">
          <p className="section-label">Pipeline</p>
          {stages.map((stage) => (
            <button
              key={stage.id}
              className={`stage-button ${activeStage === stage.id ? "active" : ""}`}
              onClick={() => handleStage(stage.id)}
              aria-pressed={activeStage === stage.id}
            >
              <span>{stage.label}</span>
              <span className="count">{stageCount(items, stage.id)}</span>
            </button>
          ))}

          <div className="status-box" aria-live="polite">{status}</div>

          <div className="metrics" aria-label="Radar-Kennzahlen">
            <div className="metric">
              <strong>{compactNumber(totalReach)}</strong>
              <span>erreichbare Views in der Queue</span>
            </div>
            <div className="metric">
              <strong>{readyCount}</strong>
              <span>fertige oder angenommene Briefs</span>
            </div>
            <div className="metric" style={{ height: 150 }}>
              <span>Quellen-Mix</span>
              <ResponsiveContainer width="100%" height={110}>
                <BarChart data={sourceMix} margin={{ top: 10, right: 4, left: -24, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="value" fill="#67e8f9" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </aside>

        <section className="inbox" aria-label="Aussagen-Posteingang">
          <div className="inbox-header">
            <h2>{stages.find((stage) => stage.id === activeStage)?.label}</h2>
            <p>Hier werden gefundene Aussagen als Fälle bearbeitet: erst prüfen, dann freigeben, dann Content bauen.</p>
          </div>
          <div className="claim-list">
            {filteredItems.length === 0 ? (
              <div className="empty-state">Keine Aussagen passen zu diesem Filter.</div>
            ) : (
              filteredItems.map((item) => {
                const sourceUrl = youtubeWatchUrl(item.sourceVideo.url) ?? item.sourceVideo.url;
                const rowEmbedUrl = youtubeEmbedUrl(item.sourceVideo.url);
                const isRowPlaying = playingListId === item.id && Boolean(rowEmbedUrl);
                return (
                <article
                  key={item.id}
                  className={`claim-row verdict-${item.verdict} ${selected?.id === item.id ? "active" : ""}`}
                >
                  {item.sourceVideo.thumbnail && (
                    isRowPlaying && rowEmbedUrl ? (
                      <span className="claim-thumb-frame">
                        <iframe
                          className="claim-thumb-embed"
                          src={rowEmbedUrl}
                          title={item.sourceVideo.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                        />
                      </span>
                    ) : (
                      <button
                        type="button"
                        className="claim-thumb-frame"
                        onClick={() => (rowEmbedUrl ? setPlayingListId(item.id) : window.open(sourceUrl, "_blank", "noreferrer"))}
                        aria-label={rowEmbedUrl ? `Video starten: ${item.sourceVideo.title}` : `Quelle öffnen: ${item.sourceVideo.title}`}
                      >
                        <img className="claim-thumb" src={item.sourceVideo.thumbnail || undefined} alt="" loading="lazy" />
                        <span className="claim-thumb-platform">{item.sourceVideo.platform}</span>
                        <span className="claim-thumb-views">{compactNumber(item.sourceVideo.views)}</span>
                        <span className="claim-thumb-play" aria-hidden="true">
                          <Play size={12} fill="currentColor" />
                          {rowEmbedUrl ? "Starten" : "Quelle"}
                        </span>
                      </button>
                    )
                  )}
                  <button type="button" className="claim-row-body" onClick={() => setSelectedId(item.id)}>
                  <div className="claim-meta">
                    <span>{item.sourceVideo.platform} / {item.sourceVideo.creator}</span>
                    <span>{compactNumber(item.sourceVideo.views)} Views</span>
                  </div>
                  <p className="claim-title">{item.claim}</p>
                  <div className="chips">
                    <span className={`chip ${verdictTone[item.verdict]}`}>{verdictLabel[item.verdict]}</span>
                    <span className="chip">{item.category}</span>
                    <span className="chip">Reichweite {reachScore(item.sourceVideo.views, item.sourceVideo.comments)}</span>
                    {isHot(item.sourceVideo) && (
                      <span className="chip hot">
                        <Flame size={11} aria-hidden="true" /> +{compactNumber(videoVelocity(item.sourceVideo) ?? 0)}/h
                      </span>
                    )}
                  </div>
                  <div className="score-grid">
                    <div className="mini-score">
                      <span>Risiko</span>
                      <strong>{percent(item.riskScore)}</strong>
                    </div>
                    <div className="mini-score">
                      <span>Chris-Fit</span>
                      <strong>{percent(item.relevanceScore)}</strong>
                    </div>
                    <div className="mini-score">
                      <span>Prüfwert</span>
                      <strong>{percent(item.checkworthiness)}</strong>
                    </div>
                  </div>
                  </button>
                </article>
                );
              })
            )}
          </div>
        </section>

        {selected ? (
          <ClaimInspector
            item={selected}
            truths={truths}
            scienceItems={scienceItems}
            onExport={copyExport}
            onDecide={decideSelected}
            onTeleprompter={openTeleprompter}
            onContentPack={openContentPack}
            onOpenLexikon={() => setActiveView("lexikon")}
            isScripting={isScripting}
            isPacking={packingId === selected.id}
          />
        ) : (
          <section className="detail-panel" aria-label="Kein Fall geladen">
            <p className="section-label">Keine künstlichen Fälle</p>
            <h2>Kein echter Review-Case geladen.</h2>
            <p className="empty-state">
              Starte Apify-Intake, importiere eine manuell geprüfte Aussage oder verbinde Supabase. Die App erzeugt keinen Fall aus Titel-, Caption- oder Platzhalterdaten.
            </p>
          </section>
        )}
      </section>}

        </div>
      </div>
    </main>
  );
}

const NAV_VIEWS: ReadonlyArray<{ view: AppView; label: string; Icon: typeof Gauge }> = [
  { view: "secretary", label: "Secretary", Icon: MessageCircle },
  { view: "today", label: "Cockpit", Icon: Gauge },
  { view: "hunter", label: "Jäger", Icon: Radar },
  { view: "cases", label: "Vollprüfung", Icon: ShieldCheck },
  { view: "kartei", label: "Akte", Icon: FolderOpen },
  { view: "lexikon", label: "Chris-Wissen", Icon: Lightbulb },
  { view: "science", label: "Science", Icon: FlaskConical },
];

function mergeClaims(preferred: ClaimItem[], fallback: ClaimItem[]): ClaimItem[] {
  const merged = new Map<string, ClaimItem>();
  for (const item of normalizeClaimsSourceUrls(fallback)) merged.set(item.id, item);
  for (const item of normalizeClaimsSourceUrls(preferred)) merged.set(item.id, item);
  return Array.from(merged.values());
}

// Für den autoritativen Server-Snapshot: Der Server bestimmt, welche Claims
// existieren. Serverseitig entfernte Fälle dürfen nicht aus dem localStorage
// wiederauferstehen; lokale Zusatzfelder bekannter IDs bleiben erhalten.
function reconcileWithServer(server: ClaimItem[], local: ClaimItem[]): ClaimItem[] {
  const localById = new Map(normalizeClaimsSourceUrls(local).map((item) => [item.id, item] as const));
  return normalizeClaimsSourceUrls(server).map((item) => {
    const localVersion = localById.get(item.id);
    return localVersion ? { ...localVersion, ...item } : item;
  });
}

function mergeCandidates(fresh: HunterCandidate[], current: HunterCandidate[]): HunterCandidate[] {
  const merged = new Map<string, HunterCandidate>();
  for (const item of current) merged.set(item.id, item);
  for (const item of fresh) merged.set(item.id, item);
  return Array.from(merged.values()).sort((a, b) => b.score - a.score);
}

function loadStoredItems() {
  if (typeof window === "undefined") return [];
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed = JSON.parse(saved) as ClaimItem[];
    return Array.isArray(parsed) && parsed.length > 0 ? preserveViewHistory(normalizeClaimsSourceUrls(parsed)) : [];
  } catch {
    return [];
  }
}


function buildSourceMix(items: ClaimItem[]) {
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.sourceVideo.platform] = (acc[item.sourceVideo.platform] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function buildTodayItems(items: ClaimItem[], truths: TruthRecord[]) {
  return [...items]
    .filter((item) => item.stage !== "rejected")
    .sort((a, b) => todayPriority(b, truths) - todayPriority(a, truths))
    .slice(0, 3);
}

function todayPriority(item: ClaimItem, truths: TruthRecord[]) {
  const truthMatch = item.chrisPosition ?? matchClaimToTruths(item.claim, truths);
  const chrisBonus = truthMatch ? Math.round(truthMatch.similarity * 24) : 0;
  const evidenceBonus = Math.min(item.evidence.length * 4, 12);
  return claimPriority(item) + reachScore(item.sourceVideo.views, item.sourceVideo.comments) * 0.3 + chrisBonus + evidenceBonus;
}

function transcriptLabel(source: ClaimItem["sourceVideo"]["transcriptSource"]) {
  if (source === "youtube-captions") return "Untertitel";
  if (source === "description") return "Beschreibungs-Fallback";
  if (source === "curated") return "kuratierter Ausschnitt";
  if (source === "manual") return "manuell geprüfter Text";
  return "Transkript unbekannt";
}

function creatorAvatarUrl(name: string) {
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=e0f2fe,ccfbf1,fef3c7,fee2e2&fontWeight=700`;
}

function StudioHome({
  items,
  allItems,
  creators,
  hunterCandidates,
  activeId,
  packingId,
  onOpenCase,
  onPreviewCase,
  onOpenPack,
  onCopyDay,
  onOpenHunter,
  onOpenKartei,
}: {
  items: ClaimItem[];
  allItems: ClaimItem[];
  creators: CreatorRecord[];
  hunterCandidates: HunterCandidate[];
  activeId: string;
  packingId: string | null;
  onOpenCase: (item: ClaimItem) => void;
  onPreviewCase: (item: ClaimItem) => void;
  onOpenPack: (item: ClaimItem) => void;
  onCopyDay: () => void;
  onOpenHunter: () => void;
  onOpenKartei: () => void;
}) {
  const topItem = items[0] ?? allItems[0];
  const activeItem = items.find((item) => item.id === activeId) ?? topItem;
  const openCandidates = hunterCandidates.filter((candidate) => candidate.status !== "rejected");
  const watchedCreators = creators.filter((creator) => creator.watched).length;
  const priorityCreatorNames = new Set(items.map((item) => item.sourceVideo.creator));
  const topCreators = [...creators]
    .filter((creator) => priorityCreatorNames.has(creator.name))
    .sort((a, b) => b.damageScore - a.damageScore)
    .slice(0, 3);
  const passedCandidates = openCandidates.filter((candidate) => (candidate.qualityScore ?? candidate.score) >= 58);

  return (
    <section className="studio-home reviewer-cockpit" aria-label="Heute">
      <div className="reviewer-hero">
        <div>
          <p className="section-label">Review-Cockpit</p>
          <h2>Von geprüfter Aussage zu Chris&apos; nächster Reaktion.</h2>
          <p>
            Ein klarer Arbeitsweg statt Feature-Sammlung: Quelle prüfen, Aussage absichern, Creator-Kontext einordnen
            und erst dann ein Content-Paket öffnen.
          </p>
        </div>
        <div className="studio-hero-actions" aria-label="Studio-Aktionen">
          <button className="button primary" onClick={() => topItem && onOpenPack(topItem)} disabled={!topItem || packingId === topItem.id}>
            {packingId === topItem?.id ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
            Top-Reaktion bauen
          </button>
          <button className="button" onClick={onCopyDay}>
            <ClipboardList size={16} aria-hidden="true" />
            Tages-Paket kopieren
          </button>
        </div>
      </div>

      <div className="reviewer-steps" aria-label="Workflow">
        {["Finden", "Prüfen", "Akte", "Produzieren"].map((step, index) => (
          <span key={step}><strong>{index + 1}</strong>{step}</span>
        ))}
      </div>

      <div className="reviewer-metrics" aria-label="Studio-Status">
        <span><strong>{items.length}</strong> priorisierte Fälle</span>
        <span><strong>{passedCandidates.length}</strong> Qualitäts-Kandidaten</span>
        <span><strong>{watchedCreators}</strong> beobachtete Kanäle</span>
        <span><strong>{allItems.filter((item) => item.stage === "accepted").length}</strong> freigegeben</span>
      </div>

      <div className="reviewer-board">
        <section className="studio-panel reviewer-queue">
          <div className="studio-panel-head">
            <div>
              <p className="section-label">1. Finden</p>
              <h3>Heute aufnehmen</h3>
            </div>
            <span className="chip">{items.length} Funde</span>
          </div>
          <div className="studio-today-list">
            {items.map((item, index) => {
              const velocity = videoVelocity(item.sourceVideo);
              const priority = Math.round(todayPriority(item, []));
              return (
                <article key={item.id} className={`studio-claim${activeId === item.id ? " active" : ""}`}>
                  <button className="studio-claim-main" onClick={() => onPreviewCase(item)}>
                    <span className="today-rank">#{index + 1}</span>
                    <img src={item.sourceVideo.thumbnail || undefined} alt="" loading="lazy" />
                    <span>
                      <strong>{item.claim}</strong>
                      <small>{item.sourceVideo.creator} · {compactNumber(item.sourceVideo.views)} Views</small>
                    </span>
                  </button>
                  <div className="chips">
                    <span className="chip green">Priorität {priority}</span>
                    <span className={`chip ${verdictTone[item.verdict]}`}>{verdictLabel[item.verdict]}</span>
                    {item.chrisPosition && <span className="chip green">Chris-Bezug</span>}
                    {velocity !== null && velocity > 0 && <span className="chip hot">+{compactNumber(velocity)}/h</span>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {activeItem && (
          <section className="studio-panel reviewer-proof">
            <div className="studio-panel-head">
              <div>
                <p className="section-label">2. Prüfen</p>
                <h3>Falschaussage verstehen</h3>
              </div>
              <span className={`chip ${verdictTone[activeItem.verdict]}`}>{verdictLabel[activeItem.verdict]}</span>
            </div>
            <div className="reviewer-video">
              <img src={activeItem.sourceVideo.thumbnail || undefined} alt="" />
              <span>{activeItem.sourceVideo.platform}</span>
              <strong>{compactNumber(activeItem.sourceVideo.views)} Views</strong>
            </div>
            <h3 className="reviewer-claim">{activeItem.claim}</h3>
            <div className="studio-proof-grid">
              <div>
                <strong>Beweis</strong>
                <span>{activeItem.evidence[0]?.snippet ?? activeItem.whyItMatters}</span>
              </div>
              <div>
                <strong>Chris-Fit</strong>
                <span>{activeItem.whyItMatters}</span>
              </div>
              <div>
                <strong>Transkript</strong>
                <span>{activeItem.sourceVideo.transcriptSnippet}</span>
              </div>
            </div>
            <div className="score-grid">
              <div className="mini-score"><span>Risiko</span><strong>{percent(activeItem.riskScore)}</strong></div>
              <div className="mini-score"><span>Chris-Fit</span><strong>{percent(activeItem.relevanceScore)}</strong></div>
              <div className="mini-score"><span>Prüfwert</span><strong>{percent(activeItem.checkworthiness)}</strong></div>
            </div>
            <button className="button" onClick={() => onOpenCase(activeItem)}>Vollprüfung öffnen</button>
          </section>
        )}

        {activeItem && (
          <aside className="studio-side reviewer-production">
            <section className="studio-panel">
              <div className="studio-panel-head">
                <div>
                  <p className="section-label">3. Akte</p>
                  <h3>Creator-Kontext</h3>
                </div>
                <button className="button" onClick={onOpenKartei}>Kartei</button>
              </div>
              <div className="studio-creator-row">
                <img src={activeItem.sourceVideo.creatorAvatarUrl ?? creatorAvatarUrl(activeItem.sourceVideo.creator)} alt="" />
                <span>
                  <strong>{activeItem.sourceVideo.creator}</strong>
                  <small>{activeItem.category} · {compactNumber(activeItem.sourceVideo.views)} Views</small>
                </span>
              </div>
              <p className="studio-help">Dieser Kanal wird nach wiederholten Falschaussagen in der Kartei beobachtet.</p>
            </section>

            <section className="studio-panel">
              <div className="studio-panel-head">
                <div>
                  <p className="section-label">4. Produzieren</p>
                  <h3>Reaktion sofort bauen</h3>
                </div>
              </div>
              <div className="reviewer-output">
                <strong>Hook</strong>
                <p>{activeItem.responseBlocks?.hook ?? activeItem.responseDraft}</p>
                <strong>Thumbnail</strong>
                <p>{buildThumbnailDirection(activeItem).headline}</p>
              </div>
              <button className="button primary" onClick={() => onOpenPack(activeItem)} disabled={packingId === activeItem.id}>
                {packingId === activeItem.id ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                Content-Paket öffnen
              </button>
            </section>

            <section className="studio-panel">
              <div className="studio-panel-head">
                <div>
                  <p className="section-label">Intake</p>
                  <h3>Neue Qualitätsfunde</h3>
                </div>
                <button className="button" onClick={onOpenHunter}>Öffnen</button>
              </div>
              <p className="studio-help">Der Apify/manual Intake filtert schwache Treffer und zeigt nur prüfbare Kandidaten prominent.</p>
              <strong className="studio-big-number">{passedCandidates.length}</strong>
            </section>

            {topCreators.length > 0 && (
              <section className="studio-panel">
                <div className="studio-panel-head">
                  <div>
                    <p className="section-label">Akte</p>
                    <h3>Stärkste Kanäle</h3>
                  </div>
                </div>
                <div className="studio-creator-list">
                  {topCreators.map((creator) => (
                    <div key={creator.id} className="studio-creator-row">
                      <img src={creator.avatarUrl ?? creatorAvatarUrl(creator.name)} alt="" />
                      <span>
                        <strong>{creator.name}</strong>
                        <small>{creator.falschaussagenCount} Aussagen · {compactNumber(creator.totalViews)} Views</small>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </aside>
        )}
      </div>
    </section>
  );
}

function TodayCockpit({
  items,
  activeId,
  packingId,
  onSelect,
  onOpenSource,
  onOpenPack,
  onCopyDay,
}: {
  items: ClaimItem[];
  activeId: string;
  packingId: string | null;
  onSelect: (id: string) => void;
  onOpenSource: (id: string) => void;
  onOpenPack: (item: ClaimItem) => void;
  onCopyDay: () => void;
}) {
  return (
    <section className="today-cockpit" aria-label="Heute-Cockpit">
      <div className="today-head">
        <div>
          <p className="section-label">Heute</p>
          <h2>Top 3 für schnelle Produktion</h2>
        </div>
        <button className="button" onClick={onCopyDay}>
          <ClipboardList size={16} aria-hidden="true" />
          Tages-Paket kopieren
        </button>
      </div>

      <div className="today-grid">
        {items.map((item, index) => {
          const velocity = videoVelocity(item.sourceVideo);
          return (
            <article key={item.id} className={`today-card${activeId === item.id ? " active" : ""}`}>
              <button className="today-main" onClick={() => onSelect(item.id)}>
                <span className="today-rank">#{index + 1}</span>
                <span className="today-thumb" aria-hidden="true">
                  <img src={item.sourceVideo.thumbnail || undefined} alt="" loading="lazy" />
                </span>
                <span className="today-copy">
                  <strong>{item.claim}</strong>
                  <span>{item.sourceVideo.creator} · {compactNumber(item.sourceVideo.views)} Views</span>
                </span>
              </button>
              <div className="today-reasons">
                <span className="chip">{item.category}</span>
                <span className={`chip ${verdictTone[item.verdict]}`}>{verdictLabel[item.verdict]}</span>
                <span className="chip">Priorität {Math.round(todayPriority(item, []))}</span>
                {item.chrisPosition && <span className="chip green">Chris-Bezug</span>}
                {velocity !== null && velocity > 0 && <span className="chip hot">+{compactNumber(velocity)}/h</span>}
              </div>
              <div className="today-actions">
                <button className="button primary" onClick={() => onOpenPack(item)} disabled={packingId === item.id}>
                  {packingId === item.id ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <Sparkles size={15} aria-hidden="true" />}
                  Paket
                </button>
                <button className="button" onClick={() => onOpenSource(item.id)}>
                  <Play size={15} fill="currentColor" aria-hidden="true" />
                  Video
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ClaimInspector({
  item,
  truths,
  scienceItems,
  onExport,
  onDecide,
  onTeleprompter,
  onContentPack,
  onOpenLexikon,
  isScripting,
  isPacking,
}: {
  item: ClaimItem;
  truths: TruthRecord[];
  scienceItems?: ScienceItem[];
  onExport: () => void;
  onDecide: (decision: "accepted" | "rejected") => void;
  onTeleprompter: () => void;
  onContentPack: (item: ClaimItem) => void;
  onOpenLexikon?: () => void;
  isScripting: boolean;
  isPacking: boolean;
}) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const velocity = videoVelocity(item.sourceVideo);
  // Chris' eigene Position: falls die Analyse schon eine gefunden hat, diese
  // nehmen; sonst live gegen die (Store + eingebaute KB) Truth Base matchen.
  const chrisPosition = item.chrisPosition ?? matchClaimToTruths(item.claim, truths);
  // Passende Studien aus dem Wissenschafts-Brief (lokales Matching, kein LLM).
  const scienceMatches = matchScienceToClaim(item.claim, item.category, scienceItems ?? []);
  const sparkline = (item.sourceVideo.viewHistory ?? []).map((snapshot) => ({
    at: snapshot.at.slice(11, 16),
    views: snapshot.views,
  }));
  const sourceUrl = youtubeWatchUrl(item.sourceVideo.url) ?? item.sourceVideo.url;
  const invalidSourceUrl = isYoutubeSearchUrl(item.sourceVideo.url);
  const embedUrl = youtubeEmbedUrl(item.sourceVideo.url);
  const isPlaying = playingId === item.id && Boolean(embedUrl);
  return (
    <aside className="inspector" aria-label="Aussage-Details">
      <div className="inspector-inner">
        <div className="video-card">
          <div className="video-hero">
            {isPlaying && embedUrl ? (
              <iframe
                src={embedUrl}
                title={item.sourceVideo.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            ) : (
              <button
                className="video-hero-button"
                onClick={() => embedUrl ? setPlayingId(item.id) : window.open(sourceUrl, "_blank", "noreferrer")}
                aria-label={embedUrl ? `Video starten: ${item.sourceVideo.title}` : `Quelle öffnen: ${item.sourceVideo.title}`}
              >
                <img src={item.sourceVideo.thumbnail || undefined} alt="" />
                <div className="video-hero-overlay" aria-hidden="true">
                  <span>{item.sourceVideo.creator}</span>
                  <strong>{compactNumber(item.sourceVideo.views)} Views</strong>
                </div>
                <span className="video-play-badge">
                  <Play size={16} fill="currentColor" aria-hidden="true" />
                  {embedUrl ? "Starten" : "Quelle"}
                </span>
              </button>
            )}
          </div>
          <div className="video-card-body">
            <div className="claim-meta">
              <span>{item.sourceVideo.platform}</span>
              <span>{dateLabel(item.sourceVideo.publishedAt)}</span>
            </div>
            <h3>{item.sourceVideo.title}</h3>
            <p>{item.sourceVideo.description}</p>
            {item.sourceVideo.speaker && (
              <p><strong>Sprecher/Autor:</strong> {item.sourceVideo.speaker} · {item.sourceVideo.verificationStatus === "verified" ? "Fundstelle verifiziert" : "teilweise verifiziert"}</p>
            )}
            <div className="chips">
              <span className="chip">{compactNumber(item.sourceVideo.views)} Views</span>
              <span className="chip">{compactNumber(item.sourceVideo.likes)} Likes</span>
              <span className="chip">{compactNumber(item.sourceVideo.comments)} Kommentare</span>
              <span className="chip">{transcriptLabel(item.sourceVideo.transcriptSource)}</span>
              {velocity !== null && velocity > 0 && (
                <span className={`chip ${isHot(item.sourceVideo) ? "hot" : ""}`}>
                  <Flame size={11} aria-hidden="true" /> +{compactNumber(velocity)}/h
                </span>
              )}
            </div>
            {sparkline.length >= 2 && (
              <div className="sparkline" aria-label="Views-Wachstum">
                <ResponsiveContainer width="100%" height={44}>
                  <LineChart data={sparkline} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                    <XAxis dataKey="at" hide />
                    <YAxis hide domain={["dataMin", "dataMax"]} />
                    <Tooltip formatter={(value) => [compactNumber(Number(value)), "Views"]} />
                    <Line type="monotone" dataKey="views" stroke="#f2808f" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="source-actions">
              <button className="button primary" disabled={invalidSourceUrl} onClick={() => embedUrl ? setPlayingId(item.id) : window.open(sourceUrl, "_blank", "noreferrer")}>
                <Play size={16} fill="currentColor" aria-hidden="true" />
                {invalidSourceUrl ? "Quelle ungültig" : embedUrl ? "Video starten" : "Quelle ansehen"}
              </button>
              {!invalidSourceUrl && <a className="button" href={sourceUrl} target="_blank" rel="noreferrer">
                <ArrowUpRight size={16} aria-hidden="true" />
                Quelle öffnen
              </a>}
            </div>
          </div>
        </div>

        <CreatorDesk item={item} />

        <section className="panel">
          <div className="claim-meta">
            <span>Extrahierte Aussage</span>
            <span className={`chip ${verdictTone[item.verdict]}`}>{verdictLabel[item.verdict]}</span>
          </div>
          <h3>{item.claim}</h3>
          <p>{item.sourceVideo.transcriptSnippet}</p>
          <div className="chips">
            <span className="chip">{transcriptLabel(item.sourceVideo.transcriptSource)}</span>
            <span className="chip">{item.analysisSource === "llm" ? "LLM-Analyse" : "Heuristik-Analyse"}</span>
            {item.duplicateOf && (
              <span className="chip warn">ähnlich zu {item.duplicateOf.id} ({Math.round(item.duplicateOf.similarity * 100)}%)</span>
            )}
          </div>
          <div className="score-grid">
            <div className="mini-score">
              <span><Gauge size={13} aria-hidden="true" /> Risiko</span>
              <strong>{percent(item.riskScore)}</strong>
            </div>
            <div className="mini-score">
              <span><Filter size={13} aria-hidden="true" /> Fit</span>
              <strong>{percent(item.relevanceScore)}</strong>
            </div>
            <div className="mini-score">
              <span><ShieldCheck size={13} aria-hidden="true" /> Konfidenz</span>
              <strong>{percent(item.confidence)}</strong>
            </div>
          </div>
        </section>

        {chrisPosition && (
          <section className="panel chris-position" aria-label="Chris' Position">
            <div className="claim-meta">
              <span>🐺 Chris&apos; Position dazu</span>
              <span className="chip">{Math.round(chrisPosition.similarity * 100)}% Bezug</span>
            </div>
            <p className="chris-statement">{chrisPosition.statement}</p>
            <blockquote className="chris-quote">&bdquo;{chrisPosition.quote}&ldquo;</blockquote>
            <a className="chris-source" href={chrisPosition.url} target="_blank" rel="noreferrer">
              Aus: {chrisPosition.videoTitle}{typeof chrisPosition.startSeconds === "number" ? " ↗ (Moment im Video)" : " ↗"}
            </a>
            {chrisPosition.disclaimer && (
              <p className="chris-disclaimer" style={{ marginTop: "0.5rem", fontSize: "0.72rem", lineHeight: 1.4, opacity: 0.7 }}>
                ⚠ {chrisPosition.disclaimer}{" "}
                <a href="/knowledge-base" style={{ textDecoration: "underline" }}>Wie die Wissensbasis entsteht</a>
              </p>
            )}
            {onOpenLexikon && (
              <button type="button" className="panel-crosslink" onClick={onOpenLexikon}>
                Alle Positionen im Chris-Wissen →
              </button>
            )}
          </section>
        )}

        <section className="panel">
          <h3>Warum das für Chris zählt</h3>
          <p>{item.whyItMatters}</p>
          {item.decision && (
            <div className="decision-note">
              {item.decision === "accepted" ? "Angenommen" : "Abgelehnt"} · {item.decisionNote}
              {item.decidedAt ? ` · entschieden am ${dateLabel(item.decidedAt)}` : ""}
            </div>
          )}
        </section>

        <section className="panel">
          <h3>Belege</h3>
          <div className="evidence-list">
            {item.evidence.map((source) => (
              <a key={source.id} className="evidence-item" href={source.url} target="_blank" rel="noreferrer">
                <div className="evidence-head">
                  <strong>{source.publisher}</strong>
                  <span className="chip">{source.reliability}% verlässlich</span>
                </div>
                <p>{source.title}</p>
                <p>{source.snippet}</p>
                <div className="chips">
                  <span className="chip">{source.stance === "supports" ? "stützt" : source.stance === "contradicts" ? "widerspricht" : "Kontext — keine Bestätigung"}</span>
                  <span className="chip">{source.date}</span>
                  {source.origin && <span className="chip">{source.origin === "curated" ? "kuratiert" : "Retrieval"}</span>}
                </div>
                {source.assignmentReason && <p>Zuordnung: {source.assignmentReason}</p>}
              </a>
            ))}
          </div>
        </section>

        {scienceMatches.length > 0 && (
          <section className="panel inspector-science" aria-label="Studienlage aus dem Wissenschafts-Brief">
            <h3>🔬 Studienlage</h3>
            <div className="evidence-list">
              {scienceMatches.map((match) => (
                <a key={match.id} className="evidence-item" href={match.url} target="_blank" rel="noreferrer">
                  <div className="evidence-head">
                    <strong>{match.source}</strong>
                    <span className="chip">{match.topic}</span>
                  </div>
                  <p>{match.title}</p>
                  <p>💡 {match.contentIdea}</p>
                </a>
              ))}
            </div>
            <p className="panel-footnote">Aus dem Wissenschafts-Brief — lokal per Text-Ähnlichkeit zugeordnet, vor Nutzung prüfen.</p>
          </section>
        )}

        {item.responseBlocks && (
          <section className="panel">
            <h3>Antwort-Bausteine</h3>
            <div className="response-blocks">
              <div className="response-box">
                <strong>Hook</strong>
                <p>{item.responseBlocks.hook}</p>
              </div>
              <div className="response-box">
                <strong>Einstieg</strong>
                <p>{item.responseBlocks.opener}</p>
              </div>
              {item.responseBlocks.argumentation.length > 0 && (
                <div className="response-box">
                  <strong>Argumentation</strong>
                  <ul>
                    {item.responseBlocks.argumentation.map((point) => (
                      <li key={point}>{point}</li>
                    ))}
                  </ul>
                </div>
              )}
              {item.responseBlocks.sources.length > 0 && (
                <div className="response-box">
                  <strong>Quellen</strong>
                  <ul>
                    {item.responseBlocks.sources.map((source) => (
                      <li key={source}>{source}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="panel">
          <h3>Antwort-Baustein</h3>
          <div className="footer-actions inspector-actions">
            <button className="button" onClick={onExport}>
              <ClipboardList size={16} aria-hidden="true" />
              Brief kopieren
            </button>
            <button className="button primary" onClick={() => onDecide("accepted")}>
              <Check size={16} aria-hidden="true" />
              Annehmen
            </button>
            <button className="button" onClick={onTeleprompter} disabled={isScripting}>
              {isScripting ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Clapperboard size={16} aria-hidden="true" />}
              Teleprompter
            </button>
            <button className="button primary" onClick={() => onContentPack(item)} disabled={isPacking}>
              {isPacking ? <Loader2 className="spin" size={16} aria-hidden="true" /> : <Sparkles size={16} aria-hidden="true" />}
              Content-Paket
            </button>
            <button className="button reject-action" onClick={() => onDecide("rejected")}>
              <X size={16} aria-hidden="true" />
              Als Duplikat ablehnen
            </button>
          </div>
          <div className="response-box">{item.responseDraft}</div>
        </section>
      </div>
    </aside>
  );
}

function CreatorDesk({ item }: { item: ClaimItem }) {
  const priority = Math.round((item.riskScore * 0.34) + (item.relevanceScore * 0.34) + (item.checkworthiness * 0.18) + Math.min(reachScore(item.sourceVideo.views, item.sourceVideo.comments), 100) * 0.14);
  const thumbnail = buildThumbnailDirection(item);
  const angle = buildCreatorAngle(item);
  const format = item.sourceVideo.platform === "YouTube" ? "Short + Community Post" : `${item.sourceVideo.platform} Duett/Reel`;

  return (
    <section className="creator-desk" aria-label="Creator-Desk">
      <div className="creator-desk-head">
        <div>
          <p className="section-label">Creator-Desk</p>
          <h3>Aus Aussage wird Content</h3>
        </div>
        <span className="production-score" title="Produktions-Priorität">{priority}</span>
      </div>

      <div className="thumbnail-brief">
        <div className="thumbnail-preview">
          <img src={item.sourceVideo.thumbnail || undefined} alt="" />
          <div className="thumbnail-copy">
            <span>{thumbnail.kicker}</span>
            <strong>{thumbnail.headline}</strong>
          </div>
        </div>
        <div className="thumbnail-notes">
          <span><ImageIcon size={14} aria-hidden="true" /> Thumbnail</span>
          <p>{thumbnail.direction}</p>
        </div>
      </div>

      <div className="creator-grid">
        <div className="creator-tile">
          <span><Lightbulb size={14} aria-hidden="true" /> Ansatz</span>
          <strong>{angle}</strong>
        </div>
        <div className="creator-tile">
          <span><Sparkles size={14} aria-hidden="true" /> Format</span>
          <strong>{format}</strong>
        </div>
        <div className="creator-tile">
          <span><Palette size={14} aria-hidden="true" /> Design</span>
          <strong>{item.verdict === "likely_false" ? "Rot/Gruen Kontrast" : item.verdict === "misleading" ? "Warnfarbe + ruhige Loesung" : "Clean Fact-Check"}</strong>
        </div>
      </div>
    </section>
  );
}

function buildCreatorAngle(item: ClaimItem) {
  if (item.category === "Heisshunger") return "Chris erklaert, warum Willenskraft allein nicht reicht.";
  if (item.category === "Insulin") return "Mythos kurz zerlegen, dann Alltagstest mit echten Lebensmitteln.";
  if (item.category === "Supplements") return "Versprechen zeigen, Evidenz einordnen, sichere Alternative geben.";
  if (item.category === "Protein") return "Regel brechen, Kontext liefern, einfache Mahlzeitenstruktur zeigen.";
  return "Viral-Claim aufnehmen, sauber korrigieren, direkt umsetzbar machen.";
}

function buildThumbnailDirection(item: ClaimItem) {
  const categoryLabel = item.category.toUpperCase();
  if (item.verdict === "likely_false") {
    return {
      kicker: "FAKTENCHECK",
      headline: `${categoryLabel}: FALSCH?`,
      direction: "Links den Claim gross zeigen, rechts Chris mit klarer Gegenposition. Ein rotes X nur fuer den Claim, nicht fuer die Person.",
    };
  }
  if (item.verdict === "misleading") {
    return {
      kicker: "ZU EINFACH",
      headline: `${categoryLabel} MYTHOS`,
      direction: "Starkes Claim-Wort markieren und daneben eine kurze Korrektur setzen. Funktioniert gut als YouTube-Short-Cover.",
    };
  }
  return {
    kicker: "CHECK",
    headline: `${categoryLabel} EINORDNEN`,
    direction: "Neutraler Look mit Fragezeichen, Claim-Snippet und einem klaren Nutzenversprechen fuer Chris' Community.",
  };
}
