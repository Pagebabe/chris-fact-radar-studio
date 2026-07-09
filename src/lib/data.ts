import type { ClaimItem, CreatorRecord, ScienceItem, StageDefinition, TruthRecord, Verdict } from "./types";

export const stages: StageDefinition[] = [
  { id: "new", label: "Neu", description: "Frische Videos aus beobachteten Themen" },
  { id: "high_reach", label: "Hohe Reichweite", description: "Große Zielgruppe und starker Chris-Fit" },
  { id: "needs_evidence", label: "Belege fehlen", description: "Aussage gefunden, Quellen unvollständig" },
  { id: "ready", label: "Bereit", description: "Bewertung und Antwort-Baustein vorbereitet" },
  { id: "accepted", label: "Angenommen", description: "Für die Produktion freigegeben" },
  { id: "rejected", label: "Abgelehnt", description: "Schlechte Passung, schwache Quelle oder Duplikat" },
];

export const verdictLabel: Record<Verdict, string> = {
  misleading: "Irreführend",
  likely_false: "Wahrscheinlich falsch",
  unclear: "Unklar",
  mostly_true: "Größtenteils richtig",
};

export const verdictTone: Record<Verdict, string> = {
  misleading: "amber",
  likely_false: "red",
  unclear: "slate",
  mostly_true: "green",
};

export const claimItems: ClaimItem[] = [];

export const initialCreators: CreatorRecord[] = [];

export const initialScienceItems: ScienceItem[] = [];

export const initialTruths: TruthRecord[] = [];
