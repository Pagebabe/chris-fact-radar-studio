import { expect, test } from "@playwright/test";
import {
  PUBLIC_DEMO_CLAIM_DEFINITIONS,
  PUBLIC_DEMO_CLAIM_IDS,
  PUBLIC_DEMO_CLAIMS,
  mergePublicDemoDefinitions,
} from "../src/data/public-demo-claims";

const expectedIds = [
  "debate-001", "debate-002", "debate-003", "debate-004", "debate-005", "debate-006", "debate-007", "debate-008",
  "external-web-001", "external-web-002", "external-web-003", "external-web-004", "external-web-005",
];

test("public demo definitions are complete and deterministic", () => {
  expect(PUBLIC_DEMO_CLAIM_IDS).toEqual(expectedIds);
  expect(PUBLIC_DEMO_CLAIMS).toHaveLength(13);
  expect(JSON.stringify(PUBLIC_DEMO_CLAIMS)).toBe(JSON.stringify(PUBLIC_DEMO_CLAIM_DEFINITIONS.map((item) => item.claim)));
});

test("every debate case has verified original wording and a timestamp URL", () => {
  const debates = PUBLIC_DEMO_CLAIM_DEFINITIONS.filter((item) => item.claim.id.startsWith("debate-"));
  expect(debates).toHaveLength(8);
  for (const { claim, provenance } of debates) {
    expect(claim.sourceVideo.url).toMatch(/^https:\/\/www\.youtube\.com\/watch\?v=zO3ZPZKRkBM&t=\d+s$/);
    expect(claim.sourceVideo.transcriptSnippet).toMatch(/^Kurzer Originalauszug: „.+“$/);
    expect(claim.sourceVideo.transcriptSnippet).not.toMatch(/Kuratierte Stelle|Kuratierte Aussage|Platzhalter/i);
    expect(claim.sourceVideo.speaker).toBeTruthy();
    expect(claim.sourceVideo.verificationStatus).toBe("verified");
    expect(provenance.contextBefore).toBeTruthy();
    expect(provenance.contextAfter).toBeTruthy();
    expect(provenance.originalLocation).toBe(claim.sourceVideo.url);
  }
});

test("all public evidence is traceable and context is not confirmation", () => {
  for (const claim of PUBLIC_DEMO_CLAIMS) {
    for (const source of claim.evidence) {
      expect(source.id).toBeTruthy();
      expect(source.publisher).toBeTruthy();
      expect(source.title).toBeTruthy();
      expect(source.url).toMatch(/^https:\/\//);
      expect(source.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["supports", "contradicts", "context"]).toContain(source.stance);
      expect(source.origin).toBe("curated");
      expect(source.assignmentReason).toBeTruthy();
      // Negationssicher: „bestätigt keine/nicht …" ist eine zulässige Verneinung.
      // Auffallen sollen nur echte Bestätigungs-Behauptungen bei Kontext-Quellen.
      if (source.stance === "context") expect(source.assignmentReason).not.toMatch(/(?:bestätigt|beweist)(?!\s+(?:kein\w*|nicht|weder)\b)/i);
    }
  }
});

test("debate-006 keeps a specific editorial reason and pure context evidence", () => {
  const showcase = PUBLIC_DEMO_CLAIM_DEFINITIONS.find((item) => item.claim.id === "debate-006");
  expect(showcase).toBeTruthy();
  expect(showcase!.provenance.editorialReason).toContain("natürlich = gut");
  expect(showcase!.provenance.editorialReason).not.toBe("Aussage wurde manuell als überprüfbarer Debatten-Claim normalisiert; der kurze Originalauszug bleibt davon getrennt.");
  expect(showcase!.claim.evidence.length).toBeGreaterThan(0);
  for (const source of showcase!.claim.evidence) expect(source.stance).toBe("context");
  // Kontext ≠ widerlegt: der öffentliche Hinweistext muss beide Richtungen verneinen.
  expect(showcase!.claim.responseBlocks?.argumentation?.join(" ")).toContain("bestätigen oder widerlegen den Claim nicht automatisch");
});

test("five external claims have versioned repository provenance", () => {
  const external = PUBLIC_DEMO_CLAIM_DEFINITIONS.filter((item) => item.claim.id.startsWith("external-web-"));
  expect(external).toHaveLength(5);
  for (const { claim, provenance } of external) {
    expect(provenance.originType).toBe("curated-web");
    expect(provenance.sourcePublisher).toBeTruthy();
    expect(provenance.sourceAuthor).toBeTruthy();
    expect(provenance.publicationDate).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(provenance.accessedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(claim.sourceVideo.transcriptSnippet).toMatch(/^Kurzer Originalauszug: „.+“$/);
    expect(claim.claim).not.toBe(claim.sourceVideo.transcriptSnippet);
  }
});

test("materialization and repeated seed input stay idempotent", () => {
  const once = mergePublicDemoDefinitions([]);
  const twice = mergePublicDemoDefinitions(once);
  expect(twice.map((claim) => claim.id)).toEqual(expectedIds);
  expect(twice).toEqual(once);

  const preservedDecision = mergePublicDemoDefinitions([{
    ...PUBLIC_DEMO_CLAIMS[1],
    stage: "accepted",
    decision: "accepted",
    decisionNote: "Für Chris' Reaktion freigegeben",
    decidedAt: "2026-07-05T19:12:33.769Z",
  }]);
  expect(preservedDecision.find((claim) => claim.id === "debate-002")).toEqual(expect.objectContaining({
    stage: "accepted",
    decision: "accepted",
    decidedAt: "2026-07-05T19:12:33.769Z",
  }));
});

test("combined public demo seeder is POST-only and fail-closed", async ({ request }) => {
  const getResponse = await request.get("/api/admin/seed-public-demo-cases?confirm=seed-public-demo-cases");
  expect([404, 405]).toContain(getResponse.status());
  const postResponse = await request.post("/api/admin/seed-public-demo-cases?confirm=seed-public-demo-cases");
  expect(postResponse.status()).toBe(401);
});
