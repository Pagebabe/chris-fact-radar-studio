const GERMAN_SIGNALS = [
  " der ", " die ", " das ", " und ", " nicht ", " mit ", " für ", " ist ", "wenn ", "warum ", "weil ", "dass ", "dein ", "deine ", "macht ", "abnehmen", "zucker", "heißhunger", "heisshunger", "eiweiß", "ernaehrung", "ernährung", "stoffwechsel", "kalorien",
];

const FOREIGN_LANGUAGE_SIGNALS = [
  " the ", " and ", " with ", " your ", "you ", "what ", "why ", "how ", "bodybuilding motivation", "science explained", "podcast clips", "interview completo", "con ", " para ", " por ", " una ", " que ", " los ", " las ", "insulina vs", "javier santaolalla",
];

const TOPIC_SIGNALS = [
  "heißhunger", "heisshunger", "süßhunger", "suesshunger", "fressattacke", "zucker", "insulin", "abnehmen", "protein", "eiweiß", "eiweiss", "diät", "diaet", "stoffwechsel", "kalorien", "fettverlust", "bauchfett", "cravings", "supplement", "chrom", "kreatin",
];

const FALSE_CLAIM_MARKERS = [
  "macht", "macht dich", "blockiert", "verhindert", "stoppt", "zerstört", "zerstoert", "schadet", "niemals", "nie ", "immer", "garantiert", "ist schuld", "funktioniert nicht", "lüge", "luege", "mythos", "gift", "ungesund", "automatisch", "darfst nicht", "musst du", "nur wenn", "komplett", "reset", "detox",
];

const TRUSTED_SOURCE_SIGNALS = [
  "eat smarter", "eatsmarter", "dge", "deutsche gesellschaft für ernährung", "verbraucherzentrale", "bzfe", "quarks", "ndr", "swr", "wdr", "ard", "zdf", "universität", "universitaet", "klinik", "aerzteblatt", "ärzteblatt", "prof.", "dr.", "doccheck",
];

const OFF_TOPIC_SIGNALS = [
  "crypto", "gaming", "reaction deutsch", "noel deyzel", "ryse", "code", "gym motivation", "bodybuilding motivation", "full podcast", "interview completo", "spanish", "english podcast",
];

export function germanSignalScore(text: string): number {
  const lowered = ` ${normalize(text)} `;
  return GERMAN_SIGNALS.reduce((sum, signal) => sum + (lowered.includes(signal) ? 1 : 0), 0);
}

export function isLikelyGerman(text: string): boolean {
  const lowered = ` ${normalize(text)} `;
  const germanScore = germanSignalScore(text);
  const foreignScore = FOREIGN_LANGUAGE_SIGNALS.reduce((sum, signal) => sum + (lowered.includes(signal) ? 1 : 0), 0);
  return germanScore >= 2 && foreignScore === 0;
}

export function hasGermanFitnessTopic(text: string): boolean {
  const lowered = normalize(text);
  return TOPIC_SIGNALS.some((signal) => lowered.includes(signal));
}

export function hasConcreteFalseClaimMarker(text: string): boolean {
  const lowered = normalize(text);
  return FALSE_CLAIM_MARKERS.some((signal) => lowered.includes(signal));
}

export function isTrustedOrEditorialSource(text: string): boolean {
  const lowered = normalize(text);
  return TRUSTED_SOURCE_SIGNALS.some((signal) => lowered.includes(signal));
}

export function isOffTopic(text: string): boolean {
  const lowered = normalize(text);
  return OFF_TOPIC_SIGNALS.some((signal) => lowered.includes(signal));
}

export function passesStrictGermanFalseClaimFilter(text: string): boolean {
  return isLikelyGerman(text) && hasGermanFitnessTopic(text) && hasConcreteFalseClaimMarker(text) && !isTrustedOrEditorialSource(text) && !isOffTopic(text);
}

export function germanFalseClaimRejectionReason(text: string): string | null {
  if (!isLikelyGerman(text)) return "nicht deutsch";
  if (!hasGermanFitnessTopic(text)) return "kein Chris-Fitness-/Ernährungsthema";
  if (isTrustedOrEditorialSource(text)) return "seriöse/editoriale Quelle";
  if (isOffTopic(text)) return "themenfremd";
  if (!hasConcreteFalseClaimMarker(text)) return "keine konkrete Falschaussage";
  return null;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/&amp;/g, "&").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
}
