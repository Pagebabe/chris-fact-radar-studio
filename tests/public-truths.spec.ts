import { expect, test } from "@playwright/test";
import { filterPublicTruths, isPublicTruth } from "../src/lib/public-truths";
import type { TruthRecord } from "../src/lib/types";

const realTruth: TruthRecord = {
  id: "truth-real-001",
  statement: "Kaloriendefizit bleibt für Fettverlust notwendig.",
  topic: "Fettverlust",
  quote: "Abnehmen funktioniert über ein Kaloriendefizit.",
  videoId: "abc123xyz",
  videoTitle: "Wie Fettverlust funktioniert",
  url: "https://www.youtube.com/watch?v=abc123xyz&t=42s",
  publishedAt: "2026-01-01T00:00:00.000Z",
  source: "youtube-captions",
};

const testTruth: TruthRecord = {
  ...realTruth,
  id: "truth-https-youtube-com-watch-v-test-chunk-0-0",
  videoId: "https-youtube-com-watch-v-test",
  videoTitle: "Test",
  url: "https://youtube.com/watch?v=test",
  transcriptId: "https-youtube-com-watch-v-test",
};

test("public truth filter keeps real records", () => {
  expect(isPublicTruth(realTruth)).toBe(true);
});

test("public truth filter removes leaked fixtures", () => {
  expect(isPublicTruth(testTruth)).toBe(false);
  expect(filterPublicTruths([testTruth, realTruth])).toEqual([realTruth]);
});

test("public truth filter removes empty records", () => {
  expect(isPublicTruth({ ...realTruth, statement: "", quote: "" })).toBe(false);
});
