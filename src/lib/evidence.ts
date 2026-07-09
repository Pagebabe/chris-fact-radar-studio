import type { Evidence } from "./types";

const FETCH_TIMEOUT = 6000;

export async function retrieveEvidence(claim: string, fallback: Evidence[], searchQueryEn?: string): Promise<Evidence[]> {
  const query = claim.slice(0, 180);
  const scholarQuery = (searchQueryEn?.trim() || query).slice(0, 180);
  const [factCheck, pubmed, openAlex] = await Promise.all([
    fetchGoogleFactCheck(query),
    fetchPubMed(scholarQuery),
    fetchOpenAlex(scholarQuery),
  ]);

  const live = dedupeByUrl([...factCheck, ...pubmed, ...openAlex]);
  if (live.length === 0) return fallback;
  return [...live, ...fallback.filter((ev) => ev.stance === "context")].slice(0, 8);
}

async function fetchGoogleFactCheck(query: string): Promise<Evidence[]> {
  const apiKey = process.env.GOOGLE_FACTCHECK_API_KEY;
  if (!apiKey) return [];
  try {
    const url = new URL("https://factchecktools.googleapis.com/v1alpha1/claims:search");
    url.searchParams.set("query", query);
    url.searchParams.set("languageCode", "de");
    url.searchParams.set("pageSize", "4");
    url.searchParams.set("key", apiKey);
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT), next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      claims?: Array<{
        text?: string;
        claimReview?: Array<{
          publisher?: { name?: string };
          url?: string;
          title?: string;
          reviewDate?: string;
          textualRating?: string;
        }>;
      }>;
    };
    return (data.claims ?? []).flatMap((claim, index) => {
      const review = claim.claimReview?.[0];
      if (!review?.url) return [];
      return [
        {
          id: `ev-gfc-${index}-${hashCode(review.url)}`,
          publisher: review.publisher?.name ?? "Fact Check",
          title: review.title ?? claim.text ?? "Faktencheck",
          url: review.url,
          date: (review.reviewDate ?? "").slice(0, 10) || "n/a",
          stance: stanceFromRating(review.textualRating),
          reliability: 90,
          snippet: `Bewertung: ${review.textualRating ?? "geprüft"} — geprüfter Claim: ${claim.text ?? query}`,
        } satisfies Evidence,
      ];
    });
  } catch {
    return [];
  }
}

async function fetchPubMed(query: string): Promise<Evidence[]> {
  try {
    const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
    searchUrl.searchParams.set("db", "pubmed");
    searchUrl.searchParams.set("retmode", "json");
    searchUrl.searchParams.set("retmax", "3");
    searchUrl.searchParams.set("sort", "relevance");
    searchUrl.searchParams.set("term", query);
    const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT), next: { revalidate: 3600 } });
    if (!searchRes.ok) return [];
    const searchData = (await searchRes.json()) as { esearchresult?: { idlist?: string[] } };
    const ids = searchData.esearchresult?.idlist ?? [];
    if (ids.length === 0) return [];

    const summaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
    summaryUrl.searchParams.set("db", "pubmed");
    summaryUrl.searchParams.set("retmode", "json");
    summaryUrl.searchParams.set("id", ids.join(","));
    const summaryRes = await fetch(summaryUrl, { signal: AbortSignal.timeout(FETCH_TIMEOUT), next: { revalidate: 3600 } });
    if (!summaryRes.ok) return [];
    const summaryData = (await summaryRes.json()) as {
      result?: Record<string, { title?: string; pubdate?: string; fulljournalname?: string }>;
    };
    return ids.flatMap((id) => {
      const item = summaryData.result?.[id];
      if (!item?.title) return [];
      return [
        {
          id: `ev-pubmed-${id}`,
          publisher: item.fulljournalname ? `PubMed · ${item.fulljournalname}` : "PubMed",
          title: item.title,
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          date: (item.pubdate ?? "").slice(0, 10) || "n/a",
          stance: "context" as const,
          reliability: 92,
          snippet: "Peer-reviewte Studie aus der PubMed-Datenbank, thematisch passend zum Claim.",
        } satisfies Evidence,
      ];
    });
  } catch {
    return [];
  }
}

async function fetchOpenAlex(query: string): Promise<Evidence[]> {
  try {
    const url = new URL("https://api.openalex.org/works");
    url.searchParams.set("search", query);
    url.searchParams.set("per-page", "3");
    url.searchParams.set("filter", "type:article");
    url.searchParams.set("sort", "cited_by_count:desc");
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT), next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      results?: Array<{
        id?: string;
        display_name?: string;
        publication_date?: string;
        cited_by_count?: number;
        primary_location?: { source?: { display_name?: string } };
        doi?: string;
      }>;
    };
    return (data.results ?? []).flatMap((work) => {
      if (!work.display_name || !work.id) return [];
      return [
        {
          id: `ev-openalex-${hashCode(work.id)}`,
          publisher: work.primary_location?.source?.display_name ?? "OpenAlex",
          title: work.display_name,
          url: work.doi ?? work.id,
          date: work.publication_date ?? "n/a",
          stance: "context" as const,
          reliability: 85,
          snippet: `Wissenschaftliche Arbeit, ${work.cited_by_count ?? 0}× zitiert (OpenAlex).`,
        } satisfies Evidence,
      ];
    });
  } catch {
    return [];
  }
}

function stanceFromRating(rating?: string): Evidence["stance"] {
  const lowered = (rating ?? "").toLowerCase();
  if (/(falsch|false|gefälscht|irreführend|misleading|pants)/.test(lowered)) return "contradicts";
  if (/(richtig|true|correct|belegt)/.test(lowered)) return "supports";
  return "context";
}

function dedupeByUrl(items: Evidence[]): Evidence[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  });
}

function hashCode(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}
