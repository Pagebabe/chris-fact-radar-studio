export type YoutubeVideoRef = {
  id: string;
  startSeconds: number;
};

const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{6,}$/;

export function isYoutubeSearchUrl(value: string | null | undefined) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");
    return host.endsWith("youtube.com") && parsed.pathname === "/results" && parsed.searchParams.has("search_query");
  } catch {
    return /youtube\.com\/results\?[^#]*search_query=/i.test(value);
  }
}

export function parseYoutubeTime(value: string | null | undefined) {
  if (!value) return 0;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return 0;
  if (/^\d+$/.test(normalized)) return Number(normalized);
  const secondsOnly = normalized.match(/^(\d+)s$/);
  if (secondsOnly) return Number(secondsOnly[1]);
  const clock = normalized.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  if (!clock) return 0;
  const hours = Number(clock[1] ?? 0);
  const minutes = Number(clock[2] ?? 0);
  const seconds = Number(clock[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

export function parseYoutubeVideoUrl(value: string | null | undefined): YoutubeVideoRef | null {
  if (!value || isYoutubeSearchUrl(value)) return null;

  try {
    const parsed = new URL(value);
    const host = parsed.hostname.replace(/^www\./, "");
    let id = "";

    if (host === "youtu.be") {
      id = parsed.pathname.split("/").filter(Boolean)[0] ?? "";
    } else if (host.endsWith("youtube.com")) {
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (parsed.pathname === "/watch") id = parsed.searchParams.get("v") ?? "";
      if ((pathParts[0] === "shorts" || pathParts[0] === "live" || pathParts[0] === "embed") && pathParts[1]) id = pathParts[1];
    }

    if (!YOUTUBE_ID_RE.test(id)) return null;
    return {
      id,
      startSeconds: parseYoutubeTime(parsed.searchParams.get("t") ?? parsed.searchParams.get("start")),
    };
  } catch {
    return null;
  }
}

export function youtubeWatchUrl(value: string | null | undefined) {
  const ref = parseYoutubeVideoUrl(value);
  if (!ref) return null;
  const start = ref.startSeconds > 0 ? `&t=${ref.startSeconds}s` : "";
  return `https://www.youtube.com/watch?v=${ref.id}${start}`;
}

export function youtubeEmbedUrl(value: string | null | undefined) {
  const ref = parseYoutubeVideoUrl(value);
  if (!ref) return null;
  const start = ref.startSeconds > 0 ? `&start=${ref.startSeconds}` : "";
  return `https://www.youtube.com/embed/${ref.id}?autoplay=1${start}&rel=0&modestbranding=1`;
}
