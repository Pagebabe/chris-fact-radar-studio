export type Verdict = "misleading" | "likely_false" | "unclear" | "mostly_true";

export type StageId = "new" | "high_reach" | "needs_evidence" | "ready" | "accepted" | "rejected";

export type StageDefinition = { id: StageId; label: string; description: string };

export type Evidence = {
  id: string; publisher: string; title: string; url: string; date: string;
  stance: "supports" | "contradicts" | "context"; reliability: number; snippet: string;
};

export type ViewSnapshot = { at: string; views: number };

export type SourceVideo = {
  id: string; platform: "YouTube" | "TikTok" | "Instagram"; sourceMode?: "live" | "curated"; curationReason?: string;
  url: string; creator: string; creatorHandle?: string; creatorAvatarUrl?: string; channelId?: string; title: string; description: string;
  publishedAt: string; views: number; likes: number; comments: number; thumbnail: string; transcriptSnippet: string;
  transcriptSource?: "youtube-captions" | "description" | "curated" | "manual"; viewHistory?: ViewSnapshot[];
};

export type CreatorStatus = "suggested" | "watched" | "ignored";
export type CreatorRecord = {
  id: string; name: string; platform: "YouTube" | "TikTok" | "Instagram"; channelId?: string; channelUrl?: string; handle?: string; avatarUrl?: string;
  subscriberCount?: number; watched: boolean; note?: string; addedAt: string; falschaussagenCount: number; totalViews: number; damageScore: number;
  lastSeen?: string; lastClaimAt?: string; categories: string[]; status?: CreatorStatus; discoveredBy?: string;
};

export type HunterPlatform = "YouTube" | "TikTok" | "Instagram";
export type HunterProfile = { id: string; name: string; enabled: boolean; platforms: HunterPlatform[]; queries: string[]; minViews: number; minScore: number; maxCandidatesPerRun: number; createdAt: string; updatedAt: string };
export type HunterCandidateStatus = "new" | "triaged" | "promoted" | "rejected" | "needs_transcript";
export type CandidateContentKind = "talking_claim" | "claim" | "recipe" | "interview" | "promo" | "slideshow" | "banner" | "generic";
export type HunterCandidate = {
  id: string; profileId: string; platform: HunterPlatform; platformId: string; url: string; creator: string; channelId?: string; channelUrl?: string;
  title: string; description: string; publishedAt: string; views: number; likes: number; comments: number; thumbnail: string; transcriptSnippet?: string;
  transcriptSource?: SourceVideo["transcriptSource"] | "apify" | "missing"; score: number; reason: string; qualityScore?: number; speakingScore?: number;
  language?: "de" | "en" | "es" | "unknown"; claimClarity?: number; contentKind?: CandidateContentKind; qualityFlags?: string[]; qualityReason?: string;
  status: HunterCandidateStatus; createdAt: string; updatedAt: string; claimId?: string; creatorId?: string; rejectedReason?: string;
};
export type HunterRun = {
  id: string; startedAt: string; finishedAt: string; ok: boolean; profilesScanned: number; candidatesFound: number; candidatesSaved: number; promotedClaims: number;
  suggestedCreators: number; budgetUsedEur: number; errors: string[]; platformCounts: Partial<Record<HunterPlatform, number>>; discardedCandidates?: number; qualityPassed?: number; discardReasons?: Record<string, number>;
};

export type TranscriptSource = "youtube-captions" | "whisper" | "manual" | "description";
export type MemoryPlatform = "youtube" | "youtube-shorts" | "tiktok" | "instagram" | "podcast" | "manual";
export type MemorySourceRole = "chris" | "opponent" | "science" | "manual";
export type MemorySourceStatus = "active" | "paused" | "error";
export type MemoryContentStatus = "discovered" | "metadata_saved" | "transcript_needed" | "transcribed" | "chunked" | "extracted" | "reviewed" | "failed";
export type MemoryTranscriptStatus = "missing" | "queued" | "available" | "failed";
export type MemoryExtractionStatus = "suggested" | "approved" | "rejected";

export type MemorySource = {
  id: string;
  role: MemorySourceRole;
  platform: MemoryPlatform;
  label: string;
  url: string;
  handle?: string;
  externalId?: string;
  status: MemorySourceStatus;
  priority: number;
  lastScannedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type MemoryContentItem = {
  id: string; sourceId: string; platform: MemoryPlatform; externalId: string; url: string; title: string; description?: string; publishedAt?: string;
  durationSeconds?: number; thumbnail?: string; language?: string; status: MemoryContentStatus; transcriptStatus: MemoryTranscriptStatus; rawPayload?: Record<string, unknown>; createdAt: string; updatedAt: string;
};

export type MemoryRawTranscript = {
  id: string; contentItemId: string; sourceId: string; source: TranscriptSource; language?: string; text: string; segments?: Array<{ startSeconds?: number; endSeconds?: number; text: string }>;
  confidence?: number; createdAt: string; updatedAt: string;
};

export type MemoryExtraction = {
  id: string; contentItemId: string; sourceId: string; chunkId?: string; kind: "position" | "quote" | "claim" | "topic" | "definition";
  statement: string; quote?: string; topic: string; keywords: string[]; confidence: number; status: MemoryExtractionStatus; createdAt: string; updatedAt: string;
};

export type MemoryScanRun = {
  id: string; sourceId?: string; startedAt: string; finishedAt?: string; status: "running" | "finished" | "failed"; contentFound: number; transcriptsCreated: number; chunksCreated: number; extractionsCreated: number; errors: string[]; payload?: Record<string, unknown>;
};

export type TranscriptChunk = {
  id: string; videoId: string; videoTitle: string; url: string; publishedAt: string; source: TranscriptSource; chunkIndex: number; startSeconds?: number; endSeconds?: number; text: string; tokenCount?: number; topics: string[]; createdAt: string; contentItemId?: string; sourceId?: string;
};

export type TruthRecord = {
  id: string; statement: string; topic: string; quote: string; videoId: string; videoTitle: string; url: string; publishedAt: string; source?: TranscriptSource; transcriptId?: string; chunkId?: string; chunkIndex?: number; startSeconds?: number; endSeconds?: number; topics?: string[]; keywords?: string[]; confidence?: number; extractedAt?: string;
};

export type ChrisPosition = { statement: string; quote: string; url: string; videoTitle: string; topic: string; similarity: number };
export type ContentPack = { hooks: string[]; shortScript: string; longScript: string; titles: string[]; description: string; hashtags: string[]; communityPost: string; thumbnailTexts: string[] };
export type ScienceItem = { id: string; title: string; summary: string; contentIdea: string; topic: string; source: string; url: string; publishedAt: string; fetchedAt: string };
export type ResponseBlocks = { hook: string; opener: string; argumentation: string[]; sources: string[] };
export type ClaimItem = {
  id: string; stage: StageId; category: "Heisshunger" | "Protein" | "Supplements" | "Insulin" | "Fettverlust"; claim: string; riskScore: number; relevanceScore: number;
  checkworthiness: number; verdict: Verdict; confidence: number; whyItMatters: string; responseDraft: string; responseBlocks?: ResponseBlocks; analysisSource?: "llm" | "heuristic";
  duplicateOf?: { id: string; similarity: number }; repeatOfMythId?: string; damageScore?: number; chrisPosition?: ChrisPosition; script?: { text: string; source: "llm" | "fallback"; generatedAt: string; style?: string };
  pack?: { data: ContentPack; source: "llm" | "fallback"; generatedAt: string; style?: string }; decision?: "accepted" | "rejected"; decisionNote?: string; decidedAt?: string; sourceVideo: SourceVideo; evidence: Evidence[];
};
