import { DEBATE_CANONICAL_URLS, DEBATE_VIDEO_ID } from "@/lib/debate-claims";
import type { ClaimItem, Evidence, Verdict } from "@/lib/types";

export type PublicDemoClaimDefinition = {
  claim: ClaimItem;
  provenance: {
    originType: "curated-video" | "curated-web";
    sourcePublisher: string;
    sourceAuthor: string;
    publicationDate: string;
    accessedAt: string;
    originalLocation: string;
    contextBefore: string;
    contextAfter: string;
    editorialReason: string;
    verifiedAt: string;
  };
};

const VERIFIED_AT = "2026-07-11T08:45:00Z";
const VIDEO_PUBLISHED_AT = "2025-07-19T00:00:00Z";

const evidence = (item: Evidence): Evidence => ({
  ...item,
  origin: item.origin ?? "curated",
  checkedAt: item.checkedAt ?? VERIFIED_AT,
});

const naturalisticFallacy = evidence({
  id: "naturalistic-fallacy",
  publisher: "G. E. Moore / Project Gutenberg",
  title: "Principia Ethica — Naturalistic Ethics",
  url: "https://www.gutenberg.org/files/53430/53430-h/53430-h.htm",
  date: "1903-01-01",
  stance: "context",
  reliability: 75,
  snippet: "Eine natürliche Eigenschaft allein begründet keine positive Wertung.",
  assignmentReason: "Ordnet die im Original ausdrücklich bejahte Gleichsetzung von Natürlichkeit und gut als logischen Kontext ein.",
});

const fdaSweeteners = evidence({
  id: "fda-sweeteners",
  publisher: "U.S. Food and Drug Administration",
  title: "High-Intensity Sweeteners",
  url: "https://www.fda.gov/food/food-additives-petitions/high-intensity-sweeteners",
  date: "2014-05-19",
  stance: "context",
  reliability: 88,
  snippet: "Süßstoffe werden stoffbezogen und für konkrete Verwendungsbedingungen sicherheitsbewertet.",
  assignmentReason: "Prüft die Stoffbewertung; natürlich oder synthetisch ist für sich kein Sicherheitsurteil.",
});

const efsaSweeteners = evidence({
  id: "efsa-sweeteners",
  publisher: "European Food Safety Authority",
  title: "Sweeteners",
  url: "https://www.efsa.europa.eu/en/topics/topic/sweeteners",
  date: "2026-02-17",
  stance: "context",
  reliability: 88,
  snippet: "In der EU werden Süßstoffe unabhängig von ihrer Herstellungsart vor der Zulassung sicherheitsbewertet.",
  assignmentReason: "EU-Kontext zur individuellen Bewertung natürlicher und synthetischer Süßstoffe.",
});

const whoNss = evidence({
  id: "who-nss-2023",
  publisher: "World Health Organization",
  title: "Use of non-sugar sweeteners: WHO guideline",
  url: "https://www.who.int/publications/i/item/9789240073616",
  date: "2023-05-15",
  stance: "context",
  reliability: 92,
  snippet: "Die Empfehlung betrifft den langfristigen Nutzen zur Gewichtskontrolle und ist kein pauschaler akuter Schadensnachweis.",
  assignmentReason: "Grenzt Nutzenbewertung und Schadensbehauptung beim Sucralose-Claim voneinander ab.",
});

const efsaSucralose = evidence({
  id: "efsa-sucralose-adi",
  publisher: "European Food Safety Authority",
  title: "Sweeteners — Sucralose (E 955) re-evaluation",
  url: "https://www.efsa.europa.eu/en/topics/topic/sweeteners",
  date: "2026-02-17",
  stance: "context",
  reliability: 90,
  snippet: "EFSA führt Sucralose als 2026 erneut bewerteten zugelassenen Süßstoff.",
  assignmentReason: "Regulatorische Einordnung der pauschalen Problembehauptung zu Sucralose.",
});

const microbiomeContext = evidence({
  id: "microbiome-context",
  publisher: "Bundesinstitut für Risikobewertung",
  title: "Süßungsmittel: Studienlage zu möglichen Gesundheitsbeeinträchtigungen",
  url: "https://www.bfr.bund.de/cm/343/suessungsmittel-mehrheit-der-studien-bestaetigt-keine-gesundheitsbeeintraechtigung-allerdings-ist-die-studienlage-unzureichend.pdf",
  date: "2023-02-07",
  stance: "context",
  reliability: 86,
  snippet: "Mikrobiom-Befunde müssen nach Stoff, Dosis, Studiendesign und klinischer Bedeutung eingeordnet werden.",
  assignmentReason: "Verhindert, dass eine beobachtete Mikrobiom-Veränderung automatisch als Schaden ausgegeben wird.",
});

const satietyMechanisms = evidence({
  id: "satiety-mechanisms",
  publisher: "National Center for Biotechnology Information",
  title: "Physiology, Appetite and Weight Regulation",
  url: "https://www.ncbi.nlm.nih.gov/books/NBK279077/",
  date: "2023-04-17",
  stance: "context",
  reliability: 82,
  snippet: "Appetit und Sättigung entstehen aus biologischen, neuronalen und umweltbezogenen Signalen.",
  assignmentReason: "Kontextualisiert die Reduktion von Abnehmen auf einen bewussten Schalter.",
});

const obesityGenetics = evidence({
  id: "obesity-genetics",
  publisher: "National Center for Biotechnology Information",
  title: "Genetics of Obesity",
  url: "https://www.ncbi.nlm.nih.gov/books/NBK573068/",
  date: "2021-07-09",
  stance: "contradicts",
  reliability: 88,
  snippet: "Adipositasrisiko wird auch durch genetische und umweltbezogene Faktoren beeinflusst.",
  assignmentReason: "Widerspricht der alleinigen Willenskraft-Erklärung.",
});

const whoObesity = evidence({
  id: "who-obesity",
  publisher: "World Health Organization",
  title: "Obesity and overweight",
  url: "https://www.who.int/news-room/fact-sheets/detail/obesity-and-overweight",
  date: "2024-03-01",
  stance: "contradicts",
  reliability: 90,
  snippet: "WHO beschreibt Adipositas als chronische Erkrankung mit mehreren Einflussfaktoren.",
  assignmentReason: "Widerspricht der Behauptung eines einzigen Willenskraft-Schalters.",
});

type DebateInput = {
  id: keyof typeof DEBATE_CANONICAL_URLS;
  category: ClaimItem["category"];
  claim: string;
  verdict: Verdict;
  speaker: string;
  excerpt: string;
  before: string;
  after: string;
  evidence?: Evidence[];
  editorialReason?: string;
};

function debate(input: DebateInput): PublicDemoClaimDefinition {
  const why = "Kuratierter Debattenfall. Originalfundstelle, Sprecher, kurzer Originalauszug und redaktionell normalisierter Claim bleiben getrennt.";
  return {
    claim: {
      id: input.id,
      stage: "ready",
      category: input.category,
      claim: input.claim,
      riskScore: input.verdict === "likely_false" ? 86 : 82,
      relevanceScore: 92,
      checkworthiness: 88,
      verdict: input.verdict,
      confidence: input.verdict === "unclear" ? 76 : 82,
      whyItMatters: why,
      responseDraft: "Originalaussage und Kontext zuerst prüfen; danach Belege nach Stance einordnen und erst dann redaktionell reagieren.",
      analysisSource: "heuristic",
      sourceVideo: {
        id: `yt-${DEBATE_VIDEO_ID}`,
        platform: "Debatten-Rebuttal",
        sourceMode: "curated",
        url: DEBATE_CANONICAL_URLS[input.id],
        creator: "{ungeskriptet} by Ben",
        creatorHandle: "@ben_ungeskriptet",
        title: "Streit eskaliert komplett: Christian Wolf vs Jan Leyk",
        description: "Kuratierter Debattenfall; überprüft gegen offizielle deutsche YouTube-Captions und Dialogkontext.",
        publishedAt: VIDEO_PUBLISHED_AT,
        views: 1_500_000,
        likes: 26_865,
        comments: 0,
        thumbnail: "https://i.ytimg.com/vi/zO3ZPZKRkBM/hqdefault.jpg",
        transcriptSnippet: `Kurzer Originalauszug: „${input.excerpt}“`,
        transcriptSource: "curated",
        speaker: input.speaker,
        verificationStatus: "verified",
        accessedAt: VERIFIED_AT,
      },
      evidence: input.evidence ?? [],
      responseBlocks: {
        hook: input.claim,
        opener: "Kuratierter Debattenfall — nicht mit einem automatisch gefundenen Claim verwechseln.",
        argumentation: [why, "Kontextbelege bestätigen oder widerlegen den Claim nicht automatisch; ihre Stance wird separat angezeigt."],
        sources: [DEBATE_CANONICAL_URLS[input.id]],
      },
    },
    provenance: {
      originType: "curated-video",
      sourcePublisher: "{ungeskriptet} by Ben",
      sourceAuthor: input.speaker,
      publicationDate: VIDEO_PUBLISHED_AT,
      accessedAt: VERIFIED_AT,
      originalLocation: DEBATE_CANONICAL_URLS[input.id],
      contextBefore: input.before,
      contextAfter: input.after,
      editorialReason: input.editorialReason ?? "Aussage wurde manuell als überprüfbarer Debatten-Claim normalisiert; der kurze Originalauszug bleibt davon getrennt.",
      verifiedAt: VERIFIED_AT,
    },
  };
}

type WebInput = {
  id: string; category: ClaimItem["category"]; claim: string; verdict: Verdict; confidence: number;
  url: string; title: string; publisher: string; author: string; publishedAt: string;
  excerpt: string; evidence: Evidence; why: string;
};

function web(input: WebInput): PublicDemoClaimDefinition {
  return {
    claim: {
      id: input.id,
      stage: "ready",
      category: input.category,
      claim: input.claim,
      riskScore: 82,
      relevanceScore: 86,
      checkworthiness: 86,
      verdict: input.verdict,
      confidence: input.confidence,
      whyItMatters: input.why,
      responseDraft: "Originaltext, normalisierten Claim und Beleg-Stance getrennt prüfen; keine Kontextquelle als automatische Bestätigung behandeln.",
      analysisSource: "heuristic",
      sourceVideo: {
        id: `web-${input.id}`,
        platform: "Externer Web-Claim",
        sourceMode: "curated",
        url: input.url,
        creator: input.publisher,
        title: input.title,
        description: "Versionierter externer Demo-Claim mit geprüfter Repository-Herkunft.",
        publishedAt: input.publishedAt,
        views: 0,
        likes: 0,
        comments: 0,
        thumbnail: "",
        transcriptSnippet: `Kurzer Originalauszug: „${input.excerpt}“`,
        transcriptSource: "curated",
        speaker: input.author,
        verificationStatus: "verified",
        accessedAt: VERIFIED_AT,
      },
      evidence: [input.evidence],
    },
    provenance: {
      originType: "curated-web",
      sourcePublisher: input.publisher,
      sourceAuthor: input.author,
      publicationDate: input.publishedAt,
      accessedAt: VERIFIED_AT,
      originalLocation: input.url,
      contextBefore: "Der Auszug wird als öffentlich dokumentierte Behauptung oder verbreitete These behandelt.",
      contextAfter: "Der umgebende Beitrag ordnet die These ein; der normalisierte Claim darf nicht als wörtliches Zitat ausgegeben werden.",
      editorialReason: input.why,
      verifiedAt: VERIFIED_AT,
    },
  };
}

export const PUBLIC_DEMO_CLAIM_DEFINITIONS: PublicDemoClaimDefinition[] = [
  debate({ id: "debate-001", category: "Supplements", verdict: "unclear", speaker: "Ben (Host, zitiert Jan Leyks Ausgangsformulierung)", excerpt: "Produkt Müll", before: "Ben rekonstruiert den Anlass des Gesprächs.", after: "Jan Leyk bestätigt anschließend den Ursprung seines Kommentars.", claim: "Jan Leyk wertet Produkte, Marketing und Person pauschal ab, ohne die Kritik zuerst in konkrete überprüfbare Punkte zu trennen." }),
  debate({ id: "debate-002", category: "Supplements", verdict: "unclear", speaker: "Jan Leyk", excerpt: "Durchschnittsprodukt", before: "Jan grenzt seine Kritik von einem gezielten Hass auf More ab.", after: "Christian Wolf widerspricht und Jan erkennt die Marketingstärke an.", claim: "Jan Leyk behauptet, More sei nur ein Durchschnittsprodukt mit besserem Marketing als die Konkurrenz." }),
  debate({ id: "debate-003", category: "Supplements", verdict: "misleading", speaker: "Jan Leyk", excerpt: "Gehirn austrixen", before: "Nach dem Sponsorhinweis fragt Ben nach Jans Problem mit Flavor-Produkten.", after: "Jan stellt Wasser als Vergleich gegenüber; Christian Wolf fragt nach der konkreten Gesundheitsbewertung.", claim: "Jan Leyk sagt, Flavor-Produkte und Sirups würden das Gehirn industriell austricksen." }),
  debate({ id: "debate-004", category: "Supplements", verdict: "misleading", speaker: "Jan Leyk", excerpt: "Darmmikrobiom angegriffen", before: "Jan erklärt, Informationen aus seiner Timeline aufzunehmen, ohne konkrete Quellen nennen zu können.", after: "Christian Wolf fordert prüfbare Quellen und trennt Veränderung von klinischem Schaden.", claim: "Jan Leyk stellt Sucralose wegen möglicher Veränderungen des Darmmikrobioms als problematisch dar.", evidence: [whoNss, efsaSucralose, microbiomeContext] }),
  debate({ id: "debate-005", category: "Supplements", verdict: "misleading", speaker: "Jan Leyk", excerpt: "schadet mir mehr", before: "Christian Wolf zitiert Jans frühere Schadensbehauptung.", after: "Jan relativiert auf eine Veränderung gegenüber Wasser; Christian trennt Veränderung und negativen Effekt.", claim: "Jan Leyk sagt, More-Produkte würden dem Körper im Vergleich zu Wasser eher schaden oder ihn negativ verändern." }),
  debate({ id: "debate-006", category: "Supplements", verdict: "likely_false", speaker: "Jan Leyk", excerpt: "finde ich Stevia deutlich spannender, weil es ein natürliches Süßungsmittel ist", before: "Jan begründet seine Produktkritik unter anderem damit, dass mit Sucralose statt Stevia gesüßt wird.", after: "Auf Christian Wolfs Frage, ob Natürlichkeit automatisch gut sei, antwortet Jan mit Ja; Christian benennt die Naturalistic Fallacy als typischen logischen Denkfehler.", claim: "Jan Leyk stellt Stevia als besser dar, weil es natürlich ist, und verbindet Natürlichkeit grundsätzlich mit gut.", evidence: [naturalisticFallacy, fdaSweeteners, efsaSweeteners], editorialReason: "Prüfenswert, weil die verbreitete Abkürzung „natürlich = gut“ sichtbar wird und sich Originalaussage, begrifflicher Kontext und sachlich-regulatorische Einordnung sauber voneinander trennen lassen." }),
  debate({ id: "debate-007", category: "Fettverlust", verdict: "misleading", speaker: "Jan Leyk", excerpt: "Schalter im Kopf", before: "Christian Wolf trennt persönliche Nicht-Nutzung von einer pauschalen Produktabwertung.", after: "Christian führt Genetik und Lebensumstände als Gründe an, warum Hilfen den Alltag erleichtern können.", claim: "Jan Leyk behauptet, Menschen bräuchten zum Abnehmen keine Produkte, sondern müssten nur den Schalter im Kopf umlegen.", evidence: [satietyMechanisms, obesityGenetics, whoObesity] }),
  debate({ id: "debate-008", category: "Fettverlust", verdict: "misleading", speaker: "Jan Leyk", excerpt: "hör auf zu rauchen", before: "Ben vergleicht vereinfachte Ernährungstipps mit einem Hinweis an Kettenraucher.", after: "Jan nennt seine Haltung selbst hart und möglicherweise zu unempathisch.", claim: "Jan Leyk reduziert Rauchen und Abnehmen stark auf einfache Willenskraft nach dem Motto: einfach aufhören beziehungsweise weniger essen." }),
  web({ id: "external-web-001", category: "Fettverlust", verdict: "misleading", confidence: 82, url: "https://www.bzfe.de/presse/pressemeldungen-archiv/was-ist-dran-an-detox-kuren", title: "Was ist dran an Detox-Kuren?", publisher: "Bundeszentrum für Ernährung", author: "Heike Kreutz", publishedAt: "2024-03-13T00:00:00Z", excerpt: "Schadstoffe nicht mehr vollständig ausscheiden", claim: "Ein Detox- oder Entgiftungsprogramm sei notwendig, weil der Körper moderne Belastungen nicht ausreichend selbst ausscheiden könne.", why: "Die Seite dokumentiert die verbreitete Detox-Behauptung und widerspricht ihr fachlich.", evidence: evidence({ id: "bzfe-detox", publisher: "Bundeszentrum für Ernährung", title: "Was ist dran an Detox-Kuren?", url: "https://www.bzfe.de/presse/pressemeldungen-archiv/was-ist-dran-an-detox-kuren", date: "2024-03-13", stance: "contradicts", reliability: 88, snippet: "Ein gesunder Körper scheidet Stoffwechselendprodukte über eigene Organsysteme aus; ein Nutzen von Detox-Kuren ist nicht belegt.", assignmentReason: "Direkte fachliche Einordnung derselben dokumentierten Behauptung." }) }),
  web({ id: "external-web-002", category: "Fettverlust", verdict: "misleading", confidence: 82, url: "https://www.hs-fulda.de/fileadmin/user_upload/Unsere_Hochschule/Hochschulverwaltung/Wissenschaftskommunikation/Podcast/Podcasttranskript_Gespraechsstoff_Episode_50_2.pdf#page=3", title: "Gesprächsstoff 50: Erfolgreich die Ernährung umstellen", publisher: "Hochschule Fulda", author: "Ronia Schiftan", publishedAt: "2025-02-05T00:00:00Z", excerpt: "du musst nur weniger essen", claim: "Abnehmen werde oft auf weniger Essen und mehr Bewegung als reine Verhaltens- und Disziplinfrage reduziert.", why: "Das Hochschultranskript dokumentiert die vereinfachende These und ordnet sie als zu kurz gegriffen ein.", evidence: whoObesity }),
  web({ id: "external-web-003", category: "Supplements", verdict: "likely_false", confidence: 84, url: "https://www.verbraucherzentrale.de/wissen/lebensmittel/schlankheitsmittel-und-diaeten/kokosblueten-birkenzucker-stevia-co-alternative-suessmacher-im-trend-13370", title: "Alternative Süßmacher im Trend", publisher: "Verbraucherzentrale", author: "Verbraucherzentrale-Redaktion", publishedAt: "2025-06-25T00:00:00Z", excerpt: "die gesündere Alternative", claim: "Als natürlich beworbene Süßungsmittel seien grundsätzlich die gesündere Alternative zu Haushaltszucker oder synthetischen Süßstoffen.", why: "Die Verbraucherzentrale dokumentiert das Natürlichkeits-Marketing und prüft es stoffbezogen.", evidence: fdaSweeteners }),
  web({ id: "external-web-004", category: "Heisshunger", verdict: "unclear", confidence: 78, url: "https://www.apotheken-umschau.de/krankheiten-symptome/diabetes/lexikon/suessstoffe-zuckerersatzstoffe-809777.html", title: "Süßstoff erklärt: Vorteile, Nachteile und Risiken", publisher: "Apotheken Umschau", author: "E. Lohner und R. Winter", publishedAt: "2026-06-05T00:00:00Z", excerpt: "Lust auf Süßes", claim: "Süßstoffe könnten Appetit oder Heißhunger auf Süßes steigern; die Studienlage dazu ist uneinheitlich.", why: "Die Quelle dokumentiert Mechanismusbehauptung und Unsicherheit, daher bleibt das Verdict unclear.", evidence: evidence({ ...whoNss, id: "who-nss-external", assignmentReason: "Kontext zur langfristigen Gewichtskontrolle; bestätigt keine automatische Heißhunger-Wirkung." }) }),
  web({ id: "external-web-005", category: "Fettverlust", verdict: "misleading", confidence: 81, url: "https://www.unibas.ch/de/Aktuell/Uni-Nova/Uni-Nova-146/Uni-Nova-146-Faktencheck-Machen-Kohlenhydrate-dick-Stoffwechsel-abnehmen-Gewicht-verlieren--bergewicht-Kalorienbilanz.html", title: "Faktencheck: Machen Kohlenhydrate dick?", publisher: "Universität Basel", author: "Eleonora Seelig", publishedAt: "2025-11-01T00:00:00Z", excerpt: "Keine Kohlenhydrate nach 18 Uhr", claim: "Wer abnehmen will, dürfe nach 18 Uhr keine Kohlenhydrate mehr essen.", why: "Der Faktencheck dokumentiert die verbreitete Regel und ordnet sie über Energie- und Lebensmittelqualität ein.", evidence: evidence({ id: "unibas-energy-balance", publisher: "Universität Basel", title: "Faktencheck: Machen Kohlenhydrate dick?", url: "https://www.unibas.ch/de/Aktuell/Uni-Nova/Uni-Nova-146/Uni-Nova-146-Faktencheck-Machen-Kohlenhydrate-dick-Stoffwechsel-abnehmen-Gewicht-verlieren--bergewicht-Kalorienbilanz.html", date: "2025-11-01", stance: "contradicts", reliability: 88, snippet: "Für Gewichtsverlust sind langfristige Energiebilanz und Lebensmittelqualität entscheidender als eine pauschale Uhrzeitregel.", assignmentReason: "Widerspricht direkt der dokumentierten Nach-18-Uhr-Regel." }) }),
];

export const PUBLIC_DEMO_CLAIMS = PUBLIC_DEMO_CLAIM_DEFINITIONS.map((definition) => definition.claim);
export const PUBLIC_DEMO_CLAIM_IDS = PUBLIC_DEMO_CLAIMS.map((claim) => claim.id);

export function mergePublicDemoDefinitions(storedClaims: ClaimItem[]): ClaimItem[] {
  const storedById = new Map(storedClaims.map((claim) => [claim.id, claim]));
  const demoIds = new Set(PUBLIC_DEMO_CLAIM_IDS);
  const materialized = PUBLIC_DEMO_CLAIMS.map((canonical) => {
    const stored = storedById.get(canonical.id);
    if (!stored) return canonical;
    return {
      ...canonical,
      stage: stored.stage,
      ...(stored.decision ? { decision: stored.decision, decisionNote: stored.decisionNote, decidedAt: stored.decidedAt } : {}),
    };
  });
  return [...materialized, ...storedClaims.filter((claim) => !demoIds.has(claim.id))];
}
