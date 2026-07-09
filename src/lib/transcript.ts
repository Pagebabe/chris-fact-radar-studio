export type TranscriptResult = {
  text: string;
  source: "description";
};

export async function fetchYouTubeTranscript(_videoId: string, fallbackDescription: string): Promise<TranscriptResult> {
  return descriptionFallback(fallbackDescription);
}

function descriptionFallback(description: string): TranscriptResult {
  return {
    text: description.trim(),
    source: "description",
  };
}
