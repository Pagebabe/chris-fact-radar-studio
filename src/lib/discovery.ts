export function scoreChrisFit(text: string): number {
  const lowered = text.toLowerCase();
  const weights: Array<[string, number]> = [
    ["heißhunger", 26], ["heisshunger", 26], ["zucker", 18], ["insulin", 16], ["abnehmen", 14], ["protein", 12], ["eiweiß", 12], ["eiweiss", 12], ["diät", 10], ["diaet", 10], ["stoffwechsel", 10], ["kalorien", 10], ["cravings", 8],
  ];
  const score = weights.reduce((sum, [term, weight]) => sum + (lowered.includes(term) ? weight : 0), 34);
  return Math.min(98, score);
}
