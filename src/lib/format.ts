export function compactNumber(value: number): string {
  return Intl.NumberFormat("de-DE", {
    notation: "compact",
    compactDisplay: "short",
    maximumFractionDigits: value >= 1_000_000 ? 1 : 0,
  }).format(value);
}

export function percent(value: number): string {
  return `${Math.round(value)}%`;
}

export function dateLabel(value: string): string {
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function reachScore(views: number, comments: number): number {
  const viewScore = Math.min(100, Math.log10(Math.max(views, 1)) * 16);
  const commentScore = Math.min(100, Math.log10(Math.max(comments, 1)) * 20);
  return Math.round(viewScore * 0.7 + commentScore * 0.3);
}
