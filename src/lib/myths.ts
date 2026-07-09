import { claimSimilarity } from "./dedup";
import type { ClaimItem, SourceVideo, ViewSnapshot } from "./types";

export type MythCluster = {
  id: string;
  label: string;
  itemIds: string[];
  count: number;
  totalViews: number;
  velocityPerHour: number;
  topCategory: string;
};

const CLUSTER_THRESHOLD = 0.55;
const HOT_VELOCITY = 400;

export function buildMythClusters(items: ClaimItem[]): MythCluster[] {
  const active = items.filter((item) => item.stage !== "rejected");
  const groups: Array<{ rep: ClaimItem; members: ClaimItem[] }> = [];

  for (const item of active) {
    const group = groups.find((entry) => claimSimilarity(item.claim, entry.rep.claim) >= CLUSTER_THRESHOLD);
    if (group) {
      group.members.push(item);
      if (item.claim.length < group.rep.claim.length) group.rep = item;
    } else {
      groups.push({ rep: item, members: [item] });
    }
  }

  return groups
    .map((group) => ({
      id: `myth-${group.rep.id}`,
      label: group.rep.claim,
      itemIds: group.members.map((member) => member.id),
      count: group.members.length,
      totalViews: group.members.reduce((sum, member) => sum + member.sourceVideo.views, 0),
      velocityPerHour: group.members.reduce((sum, member) => sum + (videoVelocity(member.sourceVideo) ?? 0), 0),
      topCategory: group.rep.category,
    }))
    .sort((a, b) => b.count - a.count || b.totalViews - a.totalViews);
}

export function videoVelocity(video: SourceVideo): number | null {
  const history = video.viewHistory;
  if (!history || history.length < 2) return null;
  const first = history[0];
  const last = history[history.length - 1];
  const hours = (Date.parse(last.at) - Date.parse(first.at)) / 3_600_000;
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return Math.max(0, Math.round((last.views - first.views) / hours));
}

export function isHot(video: SourceVideo): boolean {
  return (videoVelocity(video) ?? 0) >= HOT_VELOCITY;
}

export function appendSnapshot(video: SourceVideo, views: number, at = new Date().toISOString()): SourceVideo {
  const history: ViewSnapshot[] = [...(video.viewHistory ?? []), { at, views }].slice(-30);
  return { ...video, views, viewHistory: history };
}

/** Preserve real view history only. The app must not invent growth curves for evaluation. */
export function preserveViewHistory(items: ClaimItem[]): ClaimItem[] {
  return items;
}
