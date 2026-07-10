import { type NextRequest, NextResponse } from "next/server";
import { requireCronStrict } from "@/lib/cron-auth";
import { opusProxyBaseUrl, opusProxyKey, opusProxyModel } from "@/lib/llm";
import { upsertScienceItems } from "@/lib/store";
import type { ScienceItem } from "@/lib/types";

export const maxDuration = 180;

const TOPICS = ["Heißhunger", "Protein", "Insulin", "Supplements", "Fettverlust", "Zucker"];

export async function GET(req: NextRequest) {
  const unauthorized = requireCronStrict(req);
  if (unauthorized) return unauthorized;

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const items: ScienceItem[] = [];

  for (const topic of TOPICS.slice(0, 4)) {
    try {
      const query = `${topic} nutrition health evidence`;
      const url = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
      url.searchParams.set("db", "pubmed");
      url.searchParams.set("retmode", "json");
      url.searchParams.set("retmax", "2");
      url.searchParams.set("sort", "pub date");
      url.searchParams.set("mindate", sevenDaysAgo.replace(/-/g, "/"));
      url.searchParams.set("datetype", "pdat");
      url.searchParams.set("term", query);

      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) continue;

      const data = (await res.json()) as { esearchresult?: { idlist?: string[] } };
      const ids = data.esearchresult?.idlist ?? [];
      if (ids.length === 0) continue;

      const sumUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
      sumUrl.searchParams.set("db", "pubmed");
      sumUrl.searchParams.set("retmode", "json");
      sumUrl.searchParams.set("id", ids.join(","));
      const sumRes = await fetch(sumUrl, { signal: AbortSignal.timeout(8000) });
      if (!sumRes.ok) continue;

      const sumData = (await sumRes.json()) as { result?: Record<string, { title?: string; pubdate?: string; fulljournalname?: string }> };

      for (const id of ids) {
        const paper = sumData.result?.[id];
        if (!paper?.title) continue;

        const summary = await summarizeForChris(paper.title, topic);
        if (!summary) continue;

        items.push({
          id: `science-pubmed-${id}`,
          title: paper.title,
          summary: summary.text,
          contentIdea: summary.idea,
          topic,
          source: paper.fulljournalname ?? "PubMed",
          url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`,
          publishedAt: paper.pubdate ?? new Date().toISOString().slice(0, 10),
          fetchedAt: new Date().toISOString(),
        });
      }
    } catch {
      continue;
    }
  }

  if (items.length > 0) await upsertScienceItems(items);
  return NextResponse.json({ ok: true, count: items.length });
}

async function summarizeForChris(title: string, topic: string): Promise<{ text: string; idea: string } | null> {
  const baseUrl = opusProxyBaseUrl();
  const key = opusProxyKey();
  if (!key) return null;

  const prompt = `Neue Studie zu "${topic}": "${title}"
Fasse in 2 einfachen deutschen Sätzen zusammen, was das bedeutet — verständlich für jemanden ohne medizinisches Studium, kein Fachjargon.
Dann ergänze eine kurze Content-Idee für Chris Wolf (Fitness-Creator) wie er das als Kurzreel nutzen kann.
Antworte NUR mit JSON: {"text":string,"idea":string}`;

  try {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: opusProxyModel(),
        max_tokens: 200,
        response_format: { type: "json_object" },
        messages: [{ role: "user", content: prompt }],
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const raw = data.choices?.[0]?.message?.content ?? "";
    return JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1)) as { text: string; idea: string };
  } catch {
    return null;
  }
}
