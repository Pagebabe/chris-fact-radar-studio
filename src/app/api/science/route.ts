import { NextResponse } from "next/server";
import { loadScienceItems } from "@/lib/store";

export async function GET() {
  const items = await loadScienceItems();
  return NextResponse.json({ configured: items !== null, items: items ?? [] });
}
