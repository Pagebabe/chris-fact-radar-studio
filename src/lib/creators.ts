import type { ClaimItem, CreatorRecord } from "./types";

export function buildCreatorDossiers(items: ClaimItem[], existing: CreatorRecord[] = []): CreatorRecord[] {
  const map = new Map<string, CreatorRecord>(existing.map((c) => [c.id, { ...c }]));

  for (const item of items) {
    if (item.decision === "rejected") continue;
    const isFalse = item.verdict === "misleading" || item.verdict === "likely_false";
    if (!isFalse) continue;

    const v = item.sourceVideo;
    const id = v.channelId ?? `name:${v.creator}`;
    const existing = map.get(id);

    const engagement = v.views > 0 ? (v.likes + v.comments) / v.views : 0;
    const repeatBonus = item.repeatOfMythId ? 1.5 : 1;
    const itemDamage = Math.round(v.views * Math.min(engagement * 10, 3) * repeatBonus);

    if (existing) {
      existing.falschaussagenCount += 1;
      existing.totalViews += v.views;
      existing.damageScore += itemDamage;
      existing.lastSeen = v.publishedAt > (existing.lastSeen ?? "") ? v.publishedAt : existing.lastSeen;
      if (!existing.categories.includes(item.category)) existing.categories.push(item.category);
    } else {
      map.set(id, {
        id,
        name: v.creator,
        platform: v.platform,
        channelId: v.channelId,
        channelUrl: v.platform === "YouTube" && v.channelId ? `https://www.youtube.com/channel/${v.channelId}` : v.url,
        handle: v.creator.startsWith("@") ? v.creator : undefined,
        avatarUrl: creatorAvatar(v.creator),
        watched: false,
        addedAt: new Date().toISOString(),
        falschaussagenCount: 1,
        totalViews: v.views,
        damageScore: itemDamage,
        lastSeen: v.publishedAt,
        lastClaimAt: v.publishedAt,
        categories: [item.category],
      });
    }
  }

  return [...map.values()].sort((a, b) => creatorSeverity(b) - creatorSeverity(a));
}

export function creatorAvatar(name: string): string {
  const encoded = encodeURIComponent(name);
  return `https://api.dicebear.com/9.x/initials/svg?seed=${encoded}&backgroundColor=e0f2fe,ccfbf1,fef3c7,fee2e2&fontWeight=700`;
}

export function creatorSeverity(c: CreatorRecord): number {
  const logViews = c.totalViews > 0 ? Math.log10(c.totalViews) : 0;
  return c.falschaussagenCount * logViews * (c.watched ? 1.2 : 1);
}

export function creatorSeverityLabel(c: CreatorRecord): "extrem" | "hoch" | "mittel" | "niedrig" {
  const s = creatorSeverity(c);
  if (s >= 25) return "extrem";
  if (s >= 15) return "hoch";
  if (s >= 8) return "mittel";
  return "niedrig";
}

export function claimPriority(item: ClaimItem): number {
  const velocityBonus = (item.sourceVideo.viewHistory?.length ?? 0) >= 2 ? 10 : 0;
  const repeatBonus = item.repeatOfMythId ? 20 : 0;
  return item.riskScore + item.relevanceScore / 2 + velocityBonus + repeatBonus;
}

export function buildCreatorDossierMarkdown(creator: CreatorRecord, claims: ClaimItem[]): string {
  const creatorClaims = claims.filter(
    (c) =>
      (c.sourceVideo.channelId === creator.channelId || c.sourceVideo.creator === creator.name) &&
      (c.verdict === "misleading" || c.verdict === "likely_false") &&
      c.decision !== "rejected",
  );
  const lines = [
    `# Falschaussagen-Kartei: ${creator.name}`,
    `**Plattform:** ${creator.platform}${creator.channelUrl ? ` · [Kanal öffnen](${creator.channelUrl})` : ""}`,
    `**Dokumentierte Falschaussagen:** ${creator.falschaussagenCount}`,
    `**Gesamtreichweite:** ${(creator.totalViews / 1_000_000).toFixed(1)} Mio. Views`,
    `**Schaden-Score:** ${creator.damageScore.toLocaleString("de")}`,
    `**Themen:** ${creator.categories.join(", ")}`,
    `**Erstellt:** ${new Date().toLocaleDateString("de")}`,
    "",
    "---",
    "",
    "## Dokumentierte Falschaussagen (chronologisch)",
    "",
  ];
  for (const claim of creatorClaims.sort((a, b) => b.sourceVideo.publishedAt.localeCompare(a.sourceVideo.publishedAt))) {
    lines.push(
      `### ${new Date(claim.sourceVideo.publishedAt).toLocaleDateString("de")} — ${claim.category}`,
      `**Falschaussage:** ${claim.claim}`,
      `**Bewertung:** ${verdictLabel(claim.verdict)} (${claim.confidence}% Sicherheit)`,
      `**Video:** [${claim.sourceVideo.title}](${claim.sourceVideo.url})`,
      `**Reichweite:** ${claim.sourceVideo.views.toLocaleString("de")} Views`,
      claim.whyItMatters ? `**Warum es wichtig ist:** ${claim.whyItMatters}` : "",
      "",
    );
  }
  return lines.filter((l) => l !== undefined).join("\n");
}

function verdictLabel(v: string): string {
  return v === "misleading" ? "Irreführend" : v === "likely_false" ? "Wahrscheinlich falsch" : v === "unclear" ? "Unklar" : "Überwiegend richtig";
}
