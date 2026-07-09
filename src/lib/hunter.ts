import { ApifyClient } from "apify-client";
import { analyzeVideoSmart } from "./analyze";
import { findDuplicate } from "./dedup";
import { scoreChrisFit } from "./discovery";
import { reachScore } from "./format";
import { appendSnapshot } from "./myths";
import {
  loadClaims,
  loadCreators,
  loadHunterCandidates,
  loadHunterProfiles,
  loadTruths,
  storeConfigured,
  upsertClaims,
  upsertCreators,
  upsertHunterCandidates,
  upsertHunterProfiles,
  upsertHunterRuns,
} from "./store";
import type { CandidateContentKind, ClaimItem, CreatorRecord, HunterCandidate, HunterPlatform, HunterProfile, HunterRun, SourceVideo } from "./types";

const DEFAULT_QUERIES = [
  "deutscher fitness coach abnehmen fehler",
  "wenn du abnehmen willst darfst du nicht",
  "heißhunger kommt von insulin",
  "stoffwechsel kaputt abnehmen",
  "protein zuerst essen insulin",
  "cortisol bauchfett abnehmen",
  "detox stoffwechsel abnehmen",
  "zero getränke insulin hunger",
  "pcos insulinresistenz abnehmen",
  "coach erklärt warum du nicht abnimmst",
];
const DEFAULT_TIKTOK_ACTOR_ID = "clockworks/tiktok-scraper";
const DEFAULT_INSTAGRAM_ACTOR_ID = "apify/instagram-scraper";
const DEFAULT_YOUTUBE_ACTOR_ID = "streamers/youtube-scraper";

type ScoutSample = {
  id: string;
  rejectReason: string;
  platform: HunterPlatform;
  creator: string;
  title: string;
  url: string;
  views: number;
  score: number;
  qualityScore?: number;
  speakingScore?: number;
  claimClarity?: number;
  language?: HunterCandidate["language"];
  contentKind?: CandidateContentKind;
  transcriptPreview?: string;
  qualityReason?: string;
};

export const DEFAULT_HUNTER_PROFILES: HunterProfile[] = [
  {
    id: "profile-core-nutrition",
    name: "Core-Ernährungsmythen",
    enabled: true,
    platforms: ["YouTube", "TikTok", "Instagram"],
    queries: DEFAULT_QUERIES,
    minViews: 10_000,
    minScore: 72,
    maxCandidatesPerRun: 40,
    createdAt: "2026-07-04T00:00:00.000Z",
    updatedAt: "2026-07-05T00:00:00.000Z",
  },
];

type HunterResult = {
  run: HunterRun & { scoutSamples?: ScoutSample[] };
  candidates: HunterCandidate[];
  claims: ClaimItem[];
  creators: CreatorRecord[];
  configured: boolean;
};

type CandidateInput = Omit<HunterCandidate, "id" | "score" | "reason" | "status" | "createdAt" | "updatedAt">;

export async function runHunter(): Promise<HunterResult> {
  const startedAt = new Date().toISOString();
  const errors: string[] = [];
  const platformCounts: Partial<Record<HunterPlatform, number>> = {};
  const budgetLimit = Number(process.env.HUNTER_DAILY_BUDGET_EUR ?? 1.6);
  const maxAnalyses = Number(process.env.HUNTER_MAX_ANALYSES_PER_RUN ?? 6);
  const maxCandidatesPerRun = Number(process.env.HUNTER_MAX_CANDIDATES_PER_RUN ?? 40);
  const configured = storeConfigured();

  const existingClaims = configured ? (await loadClaims()) ?? [] : [];
  const existingCreators = configured ? (await loadCreators()) ?? [] : [];
  const existingCandidates = configured ? (await loadHunterCandidates()) ?? [] : [];
  const truths = configured ? (await loadTruths()) ?? [] : [];
  const storedProfiles = configured ? (await loadHunterProfiles()) ?? null : null;
  const profiles = (storedProfiles && storedProfiles.length > 0 ? storedProfiles : DEFAULT_HUNTER_PROFILES).filter((p) => p.enabled);
  if (configured && (!storedProfiles || storedProfiles.length === 0)) {
    await upsertHunterProfiles(DEFAULT_HUNTER_PROFILES);
  }

  let budgetUsedEur = 0;
  const inputs: CandidateInput[] = [];
  for (const profile of profiles) {
    const profileLimit = Math.min(profile.maxCandidatesPerRun, maxCandidatesPerRun);
    for (const platform of profile.platforms) {
      if (budgetUsedEur >= budgetLimit) {
        errors.push(`Budgetlimit erreicht vor ${platform}/${profile.name}.`);
        continue;
      }
      try {
        const found = await searchPlatform(profile, platform, profileLimit);
        platformCounts[platform] = (platformCounts[platform] ?? 0) + found.length;
        inputs.push(...found);
        if (found.length > 0) {
          budgetUsedEur += Number(process.env.HUNTER_APIFY_RUN_COST_EUR ?? 0.25);
        }
      } catch (error) {
        errors.push(`${platform}/${profile.name}: ${error instanceof Error ? error.message : "unbekannter Fehler"}`);
      }
    }
  }

  const knownIds = new Set([
    ...existingCandidates.map((candidate) => candidate.id),
    ...existingClaims.map((claim) => claim.sourceVideo.url),
    ...existingClaims.map((claim) => claim.sourceVideo.id),
  ]);

  const now = new Date().toISOString();
  const assessed = dedupeInputs(inputs).map((input) => enrichCandidate(input, now));
  const discardReasons: Record<string, number> = {};
  const rejected: { candidate: HunterCandidate; reason: string }[] = [];
  const candidates = assessed
    .filter((candidate) => {
      const profile = profiles.find((p) => p.id === candidate.profileId);
      if (!profile) return false;
      const reason = candidateDiscardReason(candidate, profile, knownIds);
      if (reason) {
        discardReasons[reason] = (discardReasons[reason] ?? 0) + 1;
        rejected.push({ candidate, reason });
        return false;
      }
      return true;
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxCandidatesPerRun);

  const scoutSamples = buildScoutSamples(rejected);

  const promoted: ClaimItem[] = [];
  const suggestedCreators = new Map<string, CreatorRecord>();
  for (const candidate of candidates.slice(0, maxAnalyses)) {
    if (!candidate.transcriptSnippet || candidate.transcriptSnippet.length < 90) {
      candidate.status = "needs_transcript";
      candidate.updatedAt = now;
      continue;
    }

    const video = candidateToVideo(candidate);
    const claim = await analyzeVideoSmart(video, truths);
    const duplicate = findDuplicate(claim.claim, [...existingClaims, ...promoted]);
    const finalClaim: ClaimItem = {
      ...claim,
      stage: claim.stage === "ready" ? "new" : claim.stage,
      sourceVideo: appendSnapshot(claim.sourceVideo, claim.sourceVideo.views),
      duplicateOf: duplicate ? { id: duplicate.id, similarity: duplicate.similarity } : claim.duplicateOf,
    };
    candidate.status = "promoted";
    candidate.claimId = finalClaim.id;
    candidate.updatedAt = now;
    promoted.push(finalClaim);

    const creator = candidateToCreator(candidate);
    candidate.creatorId = creator.id;
    suggestedCreators.set(creator.id, creator);
  }

  const creatorList = mergeSuggestedCreators(existingCreators, [...suggestedCreators.values()]);
  if (configured) {
    if (candidates.length > 0) await upsertHunterCandidates(candidates);
    if (promoted.length > 0) await upsertClaims(promoted);
    if (creatorList.length > 0) await upsertCreators(creatorList);
  }

  const run: HunterRun & { scoutSamples: ScoutSample[] } = {
    id: `hunter-${Date.now()}`,
    startedAt,
    finishedAt: new Date().toISOString(),
    ok: errors.length === 0,
    profilesScanned: profiles.length,
    candidatesFound: inputs.length,
    candidatesSaved: candidates.length,
    promotedClaims: promoted.length,
    suggestedCreators: suggestedCreators.size,
    budgetUsedEur: Number(budgetUsedEur.toFixed(2)),
    errors,
    platformCounts,
    discardedCandidates: Object.values(discardReasons).reduce((sum, count) => sum + count, 0),
    qualityPassed: candidates.length,
    discardReasons,
    scoutSamples,
  };
  if (configured) await upsertHunterRuns([run]);
  return { run, candidates, claims: promoted, creators: creatorList, configured };
}

export async function promoteHunterCandidate(candidateId: string): Promise<{ ok: boolean; claim?: ClaimItem; candidate?: HunterCandidate; reason?: string }> {
  if (!storeConfigured()) return { ok: false, reason: "Supabase not configured" };
  const candidates = (await loadHunterCandidates()) ?? [];
  const candidate = candidates.find((entry) => entry.id === candidateId);
  if (!candidate) return { ok: false, reason: "Candidate not found" };
  if (!candidate.transcriptSnippet || candidate.transcriptSnippet.length < 90) {
    return { ok: false, reason: "Candidate needs spoken transcript before promotion", candidate };
  }
  const truths = (await loadTruths()) ?? [];
  const claim = await analyzeVideoSmart(candidateToVideo(candidate), truths);
  const updated = { ...candidate, status: "promoted" as const, claimId: claim.id, updatedAt: new Date().toISOString() };
  await upsertClaims([{ ...claim, stage: "new" }]);
  await upsertHunterCandidates([updated]);
  await upsertCreators(mergeSuggestedCreators((await loadCreators()) ?? [], [candidateToCreator(updated)]));
  return { ok: true, claim: { ...claim, stage: "new" }, candidate: updated };
}

export async function rejectHunterCandidate(candidateId: string, reason = "Nicht relevant"): Promise<{ ok: boolean; candidate?: HunterCandidate; reason?: string }> {
  if (!storeConfigured()) return { ok: false, reason: "Supabase not configured" };
  const candidates = (await loadHunterCandidates()) ?? [];
  const candidate = candidates.find((entry) => entry.id === candidateId);
  if (!candidate) return { ok: false, reason: "Candidate not found" };
  const updated = { ...candidate, status: "rejected" as const, rejectedReason: reason, updatedAt: new Date().toISOString() };
  await upsertHunterCandidates([updated]);
  return { ok: true, candidate: updated };
}

export async function setCreatorWatchStatus(creatorId: string, watched: boolean): Promise<{ ok: boolean; creator?: CreatorRecord; reason?: string }> {
  if (!storeConfigured()) return { ok: false, reason: "Supabase not configured" };
  const creators = (await loadCreators()) ?? [];
  const creator = creators.find((entry) => entry.id === creatorId);
  if (!creator) return { ok: false, reason: "Creator not found" };
  const updated = { ...creator, watched, status: watched ? "watched" as const : "suggested" as const };
  await upsertCreators([updated]);
  return { ok: true, creator: updated };
}

async function searchPlatform(profile: HunterProfile, platform: HunterPlatform, limit: number): Promise<CandidateInput[]> {
  return searchApifyProfile(profile, platform, limit);
}

async function searchApifyProfile(profile: HunterProfile, platform: HunterPlatform, limit: number): Promise<CandidateInput[]> {
  const token = process.env.APIFY_TOKEN;
  const actorId = actorForPlatform(platform);
  if (!token) return [];

  const client = new ApifyClient({ token });
  const input = platform === "TikTok" ? tiktokActorInput(profile, limit) : platform === "Instagram" ? instagramActorInput(profile, limit) : youtubeActorInput(profile, limit);
  const run = await client.actor(actorId).call(input);
  const datasetId = run.defaultDatasetId;
  if (!datasetId) return [];
  const dataset = await client.dataset(datasetId).listItems({ limit });
  return dataset.items.flatMap((item) => mapApifyItem(item as Record<string, unknown>, profile, platform));
}

function actorForPlatform(platform: HunterPlatform) {
  if (platform === "TikTok") return process.env.APIFY_TIKTOK_SEARCH_ACTOR_ID || DEFAULT_TIKTOK_ACTOR_ID;
  if (platform === "Instagram") return process.env.APIFY_INSTAGRAM_REELS_ACTOR_ID || DEFAULT_INSTAGRAM_ACTOR_ID;
  return process.env.APIFY_YOUTUBE_SEARCH_ACTOR_ID || DEFAULT_YOUTUBE_ACTOR_ID;
}

function youtubeActorInput(profile: HunterProfile, limit: number) {
  return {
    searchQueries: profile.queries,
    maxResults: limit,
    maxItems: limit,
    subtitlesLanguage: "de",
    downloadSubtitles: true,
    shouldDownloadSubtitles: true,
  };
}

function tiktokActorInput(profile: HunterProfile, limit: number) {
  return {
    searchQueries: profile.queries,
    resultsPerPage: limit,
    maxItems: limit,
    shouldDownloadVideos: false,
    shouldDownloadCovers: false,
    shouldDownloadSubtitles: true,
    shouldDownloadSlideshowImages: false,
  };
}

function instagramActorInput(profile: HunterProfile, limit: number) {
  const search = profile.queries
    .map((query) => query.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join(" ");
  return {
    search,
    searchLimit: limit,
    resultsLimit: limit,
    resultsType: "posts",
    addParentData: false,
    enhanceUserSearchWithFacebookPage: false,
    isUserReelFeedURL: false,
    isUserTaggedFeedURL: false,
  };
}

function mapApifyItem(item: Record<string, unknown>, profile: HunterProfile, platform: HunterPlatform): CandidateInput[] {
  const url = stringValue(item.url) || stringValue(item.webVideoUrl) || stringValue(item.videoUrl) || stringValue(item.shortCodeUrl) || stringValue(item.inputUrl);
  const platformId = stringValue(item.id) || stringValue(item.videoId) || stringValue(item.shortCode) || stringValue(item.code) || url;
  if (!url || !platformId) return [];
  if (looksLikeVisualOnlyApifyItem(item)) return [];

  const creator = stringValue(item.authorMeta, "name") || stringValue(item.authorMeta, "nickName")
    || stringValue(item.channelName) || stringValue(item.channelTitle) || stringValue(item.ownerUsername) || stringValue(item.ownerFullName) || stringValue(item.username) || stringValue(item.author) || "Unknown creator";
  const title = stringValue(item.text) || stringValue(item.caption) || stringValue(item.title) || stringValue(item.alt) || "Social-Media-Video";
  const transcript = transcriptValue(item) || stringValue(item.description) || stringValue(item.text) || stringValue(item.caption) || title;
  return [{
    profileId: profile.id,
    platform,
    platformId: `${platform.toLowerCase()}-${platformId}`,
    url,
    creator,
    channelId: stringValue(item.authorMeta, "id") || stringValue(item.channelId) || stringValue(item.ownerId) || stringValue(item.ownerUsername) || undefined,
    channelUrl: stringValue(item.authorMeta, "profileUrl") || stringValue(item.channelUrl) || stringValue(item.ownerProfileUrl) || undefined,
    title: title.slice(0, 180),
    description: transcript.slice(0, 500),
    publishedAt: normalizeDate(item.createTimeISO ?? item.timestamp ?? item.takenAtTimestamp),
    views: numberValue(item.playCount) || numberValue(item.viewCount) || numberValue(item.videoViewCount) || numberValue(item.videoPlayCount),
    likes: numberValue(item.diggCount) || numberValue(item.likesCount) || numberValue(item.likeCount) || numberValue(item.likes),
    comments: numberValue(item.commentCount) || numberValue(item.commentsCount),
    thumbnail: stringValue(item.videoMeta, "coverUrl") || stringValue(item.videoMeta, "cover") || stringValue(item.displayUrl) || stringValue(item.thumbnailUrl) || stringValue(item.thumbnail) || "",
    transcriptSnippet: transcript,
    transcriptSource: transcript.length > 80 ? "apify" : "missing",
  }];
}

function enrichCandidate(input: CandidateInput, now: string): HunterCandidate {
  const text = `${input.title} ${input.description} ${input.transcriptSnippet ?? ""}`;
  const quality = assessCandidateQuality(text);
  const fit = scoreChrisFit(text);
  const reach = reachScore(input.views, input.comments);
  const transcriptBonus = input.transcriptSnippet && input.transcriptSnippet.length > 120 ? 10 : -12;
  const talkingBonus = quality.contentKind === "talking_claim" ? 16 : -20;
  const score = Math.min(100, Math.max(0, Math.round(
    fit * 0.28 + reach * 0.24 + quality.qualityScore * 0.24 + quality.speakingScore * 0.16 + transcriptBonus + talkingBonus + Math.min(input.likes / 10_000, 6)
  )));
  const reason = [
    `Chris-Fit ${fit}`,
    `Reichweite ${reach}`,
    `Qualität ${quality.qualityScore}`,
    `Sprech-Score ${quality.speakingScore}`,
    input.transcriptSnippet ? "Sprachtext vorhanden" : "Transcript fehlt",
  ].join(" · ");
  return {
    ...input,
    id: candidateId(input.platform, input.platformId || input.url),
    score,
    reason,
    ...quality,
    status: input.transcriptSnippet && input.transcriptSnippet.length >= 90 ? "triaged" : "needs_transcript",
    createdAt: now,
    updatedAt: now,
  };
}

function candidateDiscardReason(candidate: HunterCandidate, profile: HunterProfile, knownIds: Set<string>): string | null {
  if (knownIds.has(candidate.id) || knownIds.has(candidate.url) || knownIds.has(candidate.platformId)) return "Duplikat";
  if (candidate.views < profile.minViews) return "zu wenig Reichweite";
  if (candidate.language !== "de") return "nicht deutsch";
  if (!candidate.transcriptSnippet || candidate.transcriptSnippet.length < 90) return "kein gesprochener Kontext";
  if ((candidate.speakingScore ?? 0) < 45) return "kein sprechender Creator";
  if ((candidate.claimClarity ?? 0) < 55) return "keine klare Falschaussage";
  if (candidate.contentKind === "recipe") return "Rezept ohne Influencer-Claim";
  if (candidate.contentKind === "slideshow") return "Slideshow/Banner-Post";
  if (candidate.contentKind === "banner") return "Banner/Texttafel statt Mensch";
  if (candidate.contentKind === "interview") return "Interview ohne Creator-Claim";
  if (candidate.contentKind === "promo") return "Werbung statt Falschaussage";
  if (candidate.contentKind !== "talking_claim") return "kein Talking-Claim";
  if ((candidate.qualityScore ?? 0) < 72) return "Qualität zu niedrig";
  if (candidate.score < profile.minScore) return "Score zu niedrig";
  return null;
}

function buildScoutSamples(rejected: { candidate: HunterCandidate; reason: string }[]): ScoutSample[] {
  return rejected
    .sort((a, b) => scoutSortScore(b.candidate) - scoutSortScore(a.candidate))
    .slice(0, 12)
    .map(({ candidate, reason }) => ({
      id: candidate.id,
      rejectReason: reason,
      platform: candidate.platform,
      creator: candidate.creator,
      title: candidate.title,
      url: candidate.url,
      views: candidate.views,
      score: candidate.score,
      qualityScore: candidate.qualityScore,
      speakingScore: candidate.speakingScore,
      claimClarity: candidate.claimClarity,
      language: candidate.language,
      contentKind: candidate.contentKind,
      qualityReason: candidate.qualityReason,
      transcriptPreview: (candidate.transcriptSnippet ?? candidate.description ?? "").slice(0, 260),
    }));
}

function scoutSortScore(candidate: HunterCandidate) {
  const languageBoost = candidate.language === "de" ? 20 : 0;
  const contentBoost = candidate.contentKind === "talking_claim" ? 20 : candidate.contentKind === "claim" ? 8 : 0;
  return candidate.score + (candidate.speakingScore ?? 0) * 0.5 + (candidate.claimClarity ?? 0) * 0.5 + languageBoost + contentBoost;
}

function assessCandidateQuality(text: string): {
  qualityScore: number;
  speakingScore: number;
  language: HunterCandidate["language"];
  claimClarity: number;
  contentKind: CandidateContentKind;
  qualityFlags: string[];
  qualityReason: string;
} {
  const lowered = text.toLowerCase();
  const flags: string[] = [];
  const language = detectLanguage(lowered);
  const claimClarity = scoreClaimClarity(lowered);
  const speakingScore = scoreSpeakingHuman(lowered);
  const contentKind = detectContentKind(lowered, claimClarity, speakingScore);
  let score = 32 + claimClarity * 0.3 + speakingScore * 0.32;

  if (language === "de") score += 18;
  else flags.push("nicht deutsch");

  if (contentKind === "talking_claim") score += 22;
  if (contentKind === "claim") score += 4;
  if (contentKind === "recipe") {
    score -= 36;
    flags.push("Rezept statt Falschaussage");
  }
  if (contentKind === "slideshow") {
    score -= 34;
    flags.push("Slideshow/Hack-Liste statt sprechender Mensch");
  }
  if (contentKind === "banner") {
    score -= 34;
    flags.push("Banner/Texttafel statt sprechender Mensch");
  }
  if (contentKind === "interview") {
    score -= 28;
    flags.push("Interview/Clip ohne eigenen Creator-Claim");
  }
  if (contentKind === "promo") {
    score -= 24;
    flags.push("Werbung/Promo statt Falschaussage");
  }
  if (lowered.length < 120) {
    score -= 18;
    flags.push("zu wenig Sprachtext");
  }
  if (speakingScore < 45) flags.push("kein klarer Talking-Head-Kontext");
  if (claimClarity < 55) flags.push("Claim zu schwach");
  if (/\b(chris|more nutrition|abnehmen|heisshunger|heißhunger|insulin|protein|stoffwechsel|zucker)\b/.test(lowered)) {
    score += 8;
  }

  const cleanScore = Math.min(100, Math.max(0, Math.round(score)));
  return {
    qualityScore: cleanScore,
    speakingScore,
    language,
    claimClarity,
    contentKind,
    qualityFlags: flags,
    qualityReason: flags.length > 0
      ? flags.join(" · ")
      : "Deutsch, sprechender Creator, prüfbare Ernährungsbehauptung und genug Kontext für Chris.",
  };
}

function detectLanguage(text: string): HunterCandidate["language"] {
  const deHits = countHits(text, [" und ", " der ", " die ", " das ", " nicht ", " wenn du", " warum ", " abnehmen", " ernährung", " stoffwechsel", " heisshunger", " heißhunger", " körper", " fettverbrennung", " ich ", " du ", " dein ", "deutscher"]);
  const esHits = countHits(text, [" entrevista", " completa", " ciencia", " para ", " que ", " con ", " grasa", " azucar", " azúcar"]);
  const enHits = countHits(text, [" the ", " and ", " your ", " weight loss", " cravings", " metabolism"]);
  if (deHits >= Math.max(2, esHits + 1, enHits + 1)) return "de";
  if (esHits >= Math.max(2, deHits + 1, enHits + 1)) return "es";
  if (enHits >= Math.max(2, deHits + 1, esHits + 1)) return "en";
  return "unknown";
}

function detectContentKind(text: string, claimClarity = scoreClaimClarity(text), speakingScore = scoreSpeakingHuman(text)): CandidateContentKind {
  if (/\b(interview|entrevista|podcast|gespräch|talk|entrevista completa)\b/.test(text)) return "interview";
  if (/\b(du brauchst|zutaten|rezept|packung|ml|gramm|g\b|limetten|sellerie|spinat|kokoswasser|äpfel|gurken)\b/.test(text)) return "recipe";
  if (/\b(code\s*["']?[a-z0-9]+|link in bio|kommentiere mit|kostenloser plan|trainingsplan|ernährungsplan|stoffwechselanalyse|supplements|pre-workout|save\s*\d+%|support me)\b/.test(text)) return "promo";
  if (/\b(\d+\s*(abnehm|fitness|hacks|regeln|tipps)|hack\s*\d+|teil\s*\d+|part\s*\d+)\b/.test(text)) return "slideshow";
  if (/^[\W\d\s#✅✨🔥🍏🥒🥬💡\w]{0,90}$/.test(text) && claimClarity < 60) return "banner";
  if (speakingScore >= 45 && claimClarity >= 55) return "talking_claim";
  if (claimClarity >= 55) return "claim";
  return "generic";
}

function scoreSpeakingHuman(text: string): number {
  const firstPerson = countHits(text, [" ich ", " mir ", " meine ", " meiner ", " mich ", " bei mir", " ich habe", " ich zeige", " ich erkläre", "bevor ich"]);
  const directAddress = countHits(text, [" du ", " dein ", " deine ", " dir ", " dich ", " wenn du", " warum du", " solltest du", " darfst du", " musst du"]);
  const spokenPhrases = countHits(text, ["pass auf", "hör auf", "ich sag", "glaub mir", "der fehler", "das problem", "die wahrheit", "was viele nicht verstehen", "keiner sagt dir", "kein wunder"]);
  const sentenceFlow = (text.match(/[.!?]/g) ?? []).length;
  const hashtagCount = (text.match(/#/g) ?? []).length;
  const emojiCount = (text.match(/[✅✨🔥🍏🥒🥬💡👇👉]/g) ?? []).length;
  const ingredientHits = countHits(text, ["zutaten", "du brauchst", "packung", "ml", "rezept"]);
  const score = firstPerson * 14 + directAddress * 12 + spokenPhrases * 16 + Math.min(sentenceFlow, 6) * 5 - hashtagCount * 4 - emojiCount * 2 - ingredientHits * 18;
  return Math.min(100, Math.max(0, Math.round(score)));
}

function scoreClaimClarity(text: string): number {
  const claimMarkers = [
    "macht", "stoppt", "blockiert", "verhindert", "senkt", "stabilisiert", "aktiviert",
    "führt zu", "sorgt für", "darfst", "musst", "nie", "immer", "kein", "keinen",
    "fettverbrennung", "insulin", "heisshunger", "heißhunger", "stoffwechsel", "protein",
    "abnehmen", "zunehmen", "verbrennst", "speicherst", "hormon", "cortisol", "ghrelin",
  ];
  const hits = countHits(text, claimMarkers);
  const absoluteWords = countHits(text, ["immer", "nie", "komplett", "sofort", "garantiert", "sicher", "automatisch", "pflicht", "unmöglich"]);
  return Math.min(100, Math.round(hits * 8 + absoluteWords * 10 + (text.length > 180 ? 10 : 0)));
}

function looksLikeVisualOnlyApifyItem(item: Record<string, unknown>): boolean {
  const type = `${stringValue(item.type)} ${stringValue(item.productType)} ${stringValue(item.mediaType)} ${stringValue(item.__typename)}`.toLowerCase();
  if (/carousel|sidecar|image|photo|slideshow/.test(type)) return true;
  if (booleanValue(item.isSlideshow) || booleanValue(item.isCarousel) || booleanValue(item.isPhoto)) return true;
  return false;
}

function countHits(text: string, terms: string[]): number {
  return terms.reduce((sum, term) => sum + (text.includes(term) ? 1 : 0), 0);
}

function dedupeInputs(inputs: CandidateInput[]): CandidateInput[] {
  const seen = new Set<string>();
  return inputs.filter((input) => {
    const id = candidateId(input.platform, input.platformId || input.url);
    if (seen.has(id) || seen.has(input.url)) return false;
    seen.add(id);
    seen.add(input.url);
    return true;
  });
}

function candidateToVideo(candidate: HunterCandidate): SourceVideo {
  return {
    id: candidate.platformId,
    platform: candidate.platform,
    url: candidate.url,
    creator: candidate.creator,
    channelId: candidate.channelId,
    title: candidate.title,
    description: candidate.description,
    publishedAt: candidate.publishedAt,
    views: candidate.views,
    likes: candidate.likes,
    comments: candidate.comments,
    thumbnail: candidate.thumbnail,
    transcriptSnippet: candidate.transcriptSnippet ?? candidate.description,
    transcriptSource:
      candidate.transcriptSource === "apify"
        ? "description"
        : candidate.transcriptSource === "missing"
          ? undefined
          : candidate.transcriptSource,
  };
}

function candidateToCreator(candidate: HunterCandidate): CreatorRecord {
  const id = candidate.channelId ? `${candidate.platform}:${candidate.channelId}` : `${candidate.platform}:name:${candidate.creator}`;
  return {
    id,
    name: candidate.creator,
    platform: candidate.platform,
    channelId: candidate.channelId,
    channelUrl: candidate.channelUrl ?? candidate.url,
    handle: candidate.creator.startsWith("@") ? candidate.creator : undefined,
    avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(candidate.creator)}&backgroundColor=e0f2fe,ccfbf1,fef3c7,fee2e2&fontWeight=700`,
    watched: false,
    status: "suggested",
    discoveredBy: "hunter",
    note: `Vom Apify/manual Intake vorgeschlagen: ${candidate.reason}`,
    addedAt: new Date().toISOString(),
    falschaussagenCount: 0,
    totalViews: candidate.views,
    damageScore: Math.round(candidate.views * Math.min((candidate.likes + candidate.comments) / Math.max(candidate.views, 1), 0.2)),
    lastSeen: candidate.publishedAt,
    lastClaimAt: candidate.publishedAt,
    categories: [],
  };
}

function mergeSuggestedCreators(existing: CreatorRecord[], suggested: CreatorRecord[]): CreatorRecord[] {
  const map = new Map(existing.map((creator) => [creator.id, creator]));
  for (const creator of suggested) {
    const current = map.get(creator.id);
    if (!current) map.set(creator.id, creator);
    else {
      map.set(creator.id, {
        ...current,
        totalViews: Math.max(current.totalViews, creator.totalViews),
        damageScore: Math.max(current.damageScore, creator.damageScore),
        lastSeen: creator.lastSeen && creator.lastSeen > (current.lastSeen ?? "") ? creator.lastSeen : current.lastSeen,
        status: current.status ?? (current.watched ? "watched" : "suggested"),
        discoveredBy: current.discoveredBy ?? creator.discoveredBy,
      });
    }
  }
  return [...map.values()];
}

function candidateId(platform: HunterPlatform, value: string): string {
  return `hunter-${platform.toLowerCase()}-${value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 120)}`;
}

function stringValue(item: unknown, nested?: string): string {
  const value = nested && item && typeof item === "object" ? (item as Record<string, unknown>)[nested] : item;
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function transcriptValue(item: Record<string, unknown>): string {
  const direct = stringValue(item.transcript) || stringValue(item.subtitleText) || stringValue(item.subtitlesText) || stringValue(item.captionsText);
  if (direct) return direct;
  const candidates = [item.subtitles, item.captions, item.transcripts, item.transcriptSegments];
  for (const candidate of candidates) {
    const text = textFromUnknown(candidate);
    if (text) return text;
  }
  return "";
}

function textFromUnknown(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (Array.isArray(value)) {
    return value
      .map((entry) => {
        if (typeof entry === "string") return entry;
        if (!entry || typeof entry !== "object") return "";
        const row = entry as Record<string, unknown>;
        return stringValue(row.text) || stringValue(row.caption) || stringValue(row.subtitle) || stringValue(row.value);
      })
      .filter(Boolean)
      .join(" ")
      .trim();
  }
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    return stringValue(row.text) || stringValue(row.caption) || stringValue(row.subtitle) || stringValue(row.value);
  }
  return "";
}

function numberValue(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replace(/[^0-9.]/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function booleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "1", "yes"].includes(value.toLowerCase());
  return false;
}

function normalizeDate(value: unknown): string {
  if (typeof value === "number") return new Date(value > 1_000_000_000_000 ? value : value * 1000).toISOString();
  if (typeof value === "string" && value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return new Date().toISOString();
}
