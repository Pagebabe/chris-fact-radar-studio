import { NextResponse } from "next/server";
import { buildMarkdownExport } from "@/lib/export";
import type { ClaimItem } from "@/lib/types";

type ExportFormat = "markdown" | "csv";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { item?: ClaimItem; format?: ExportFormat } | null;
  if (!body?.item?.sourceVideo) {
    return NextResponse.json({ error: "Missing item" }, { status: 400 });
  }

  const format = body.format ?? "markdown";
  const content = format === "csv" ? toCsv(body.item) : buildMarkdownExport(body.item);
  return NextResponse.json({ format, content });
}

function toCsv(item: ClaimItem): string {
  const row = [
    item.sourceVideo.platform,
    item.sourceVideo.url,
    item.sourceVideo.creator,
    item.sourceVideo.views,
    item.sourceVideo.transcriptSource ?? "",
    item.category,
    item.verdict,
    item.confidence,
    item.claim,
    item.responseDraft,
  ];
  return ["platform,url,creator,views,transcript_source,category,verdict,confidence,claim,response_draft", row.map(csvCell).join(",")].join("\n");
}

function csvCell(value: string | number): string {
  const escaped = String(value).replace(/"/g, '""');
  return `"${escaped}"`;
}
