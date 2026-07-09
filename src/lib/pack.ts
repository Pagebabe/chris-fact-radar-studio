import type { ClaimItem, ContentPack } from "./types";

// Kategorie-spezifische Hashtag-Grundstöcke (Chris' Themenwelt)
const CATEGORY_TAGS: Record<ClaimItem["category"], string[]> = {
  Heisshunger: ["#heißhunger", "#abnehmen", "#ernährung", "#cravings"],
  Protein: ["#protein", "#muskelaufbau", "#ernährung", "#fitness"],
  Supplements: ["#supplements", "#nahrungsergänzung", "#evidenzbasiert", "#gesundheit"],
  Insulin: ["#insulin", "#blutzucker", "#stoffwechsel", "#abnehmen"],
  Fettverlust: ["#fettabbau", "#abnehmen", "#stoffwechsel", "#diät"],
};

/**
 * Deterministisches Content-Paket ohne LLM — funktioniert IMMER (auch ohne
 * Token/Tunnel). Baut aus Claim, Antwort-Bausteinen, Evidenz und (falls
 * vorhanden) Chris' eigener Position ein vollständiges, brauchbares Paket.
 */
export function buildFallbackPack(item: ClaimItem): ContentPack {
  const blocks = item.responseBlocks;
  const catLabel = item.category;
  const angle = claimAngle(item);
  const evidence = item.evidence.slice(0, 3).map((ev) => `${ev.publisher}: ${ev.title}`);
  const chris = item.chrisPosition;

  const hooks = [
    blocks?.hook || `${angle}: Genau hier wird es zu einfach erklärt.`,
    `Bevor du diesen ${catLabel}-Tipp glaubst: Schau erst auf die Fakten.`,
    `${catLabel}-Mythos im Faktencheck — was wirklich zählt.`,
  ];

  const argumente = sanitizeArguments(blocks?.argumentation?.length ? blocks.argumentation : [item.responseDraft]);
  const argLines = argumente.map((a) => `• ${a}`).join("\n");

  const shortScript = [
    hooks[0],
    "",
    blocks?.opener || item.whyItMatters,
    "",
    argumente.slice(0, 2).join("\n"),
    "",
    "Merk dir: Nicht ein einzelner Hack entscheidet, sondern Alltag, Kalorienbilanz, Protein, Schlaf und Umsetzbarkeit.",
  ].filter((line) => line !== undefined).join("\n");

  const longScript = [
    hooks[0],
    "",
    blocks?.opener || item.whyItMatters,
    "",
    argLines,
    "",
    chris ? `Chris-Position dazu: „${chris.quote}"` : "",
    evidence.length ? `Quellenbasis: ${evidence.join(" · ")}.` : "",
    "",
    "Praktisch heißt das: Keine Panik vor einzelnen Lebensmitteln und keine Wunder-Hacks. Prüfe Kontext, Menge, Gesamtbilanz und ob die Regel im Alltag hält.",
    "Wenn dir das hilft, schick es jemandem, der gerade von solchen Abnehm-Mythen verunsichert wird.",
  ].filter((line) => line !== "").join("\n");

  const titles = [
    `${catLabel}: Was wirklich stimmt (${verdictWord(item)})`,
    `${angle} — der Faktencheck`,
    `Warum dieser ${catLabel}-Tipp zu kurz greift`,
  ];

  const description = [
    `In diesem Video reagiere ich auf die Behauptung: „${item.claim}"`,
    "",
    "Kurz: Wir trennen Hook, Behauptung und Evidenz — ohne Panikmache und ohne Crash-Diät-Logik.",
    "",
    evidence.length ? `Quellen:\n${item.evidence.slice(0, 3).map((ev) => `– ${ev.publisher}: ${ev.url}`).join("\n")}` : "",
  ].filter(Boolean).join("\n");

  const baseTags = CATEGORY_TAGS[item.category] ?? [];
  const hashtags = [...baseTags, "#christianwolf", "#faktencheck", "#wissenschaft"];

  const communityPost = `${hooks[2]}\n\nKurz erklärt: ${blocks?.opener || item.whyItMatters}\n\nDas ganze Video ist online. 👀`;

  const thumbnailTexts = [
    `${catLabel.toUpperCase()}: FALSCH?`,
    angle.toUpperCase(),
    "WAS STUDIEN SAGEN",
  ];

  return { hooks, shortScript, longScript, titles, description, hashtags, communityPost, thumbnailTexts };
}

function sanitizeArguments(values: string[]): string[] {
  return values
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => value.replace(/\s+/g, " "));
}

function claimAngle(item: ClaimItem): string {
  const text = `${item.claim} ${item.sourceVideo.title}`.toLowerCase();
  if (text.includes("zucker") && text.includes("kokain")) return "Zucker ist wie Kokain?";
  if (text.includes("insulin") && (text.includes("trick") || text.includes("bauchfett"))) return "Insulin-Trick gegen Bauchfett?";
  if (text.includes("kohlenhydrate") || text.includes("carbs")) return "Kohlenhydrate machen dick?";
  if (text.includes("detox") || text.includes("entgift")) return "Detox zum Abnehmen?";
  if (text.includes("süßstoff") || text.includes("sucralose") || text.includes("stevia")) return "Süßstoff macht Heißhunger?";
  if (text.includes("willenskraft") || text.includes("disziplin")) return "Abnehmen ist nur Willenskraft?";
  if (text.includes("protein")) return "Protein-Mythos im Check";
  if (text.includes("heißhunger") || text.includes("süßhunger")) return "Heißhunger einfach weg?";
  return `${item.category}-Claim im Check`;
}

function verdictWord(item: ClaimItem): string {
  if (item.verdict === "likely_false") return "wahrscheinlich falsch";
  if (item.verdict === "misleading") return "irreführend";
  if (item.verdict === "mostly_true") return "größtenteils richtig";
  return "unklar";
}

/** Komplettes Paket als Markdown für „Alles kopieren". */
export function buildPackMarkdown(pack: ContentPack, item: ClaimItem): string {
  return [
    `# Content-Paket: ${item.sourceVideo.creator}`,
    `Aussage: „${item.claim}"`,
    "",
    "## Hooks",
    pack.hooks.map((h) => `- ${h}`).join("\n"),
    "",
    "## Short-Skript (30s)",
    pack.shortScript,
    "",
    "## Langes Skript (60s)",
    pack.longScript,
    "",
    "## Titel-Vorschläge",
    pack.titles.map((t) => `- ${t}`).join("\n"),
    "",
    "## Beschreibung",
    pack.description,
    "",
    "## Hashtags",
    pack.hashtags.join(" "),
    "",
    "## Community-Post",
    pack.communityPost,
    "",
    "## Thumbnail-Text",
    pack.thumbnailTexts.map((t) => `- ${t}`).join("\n"),
  ].join("\n");
}
