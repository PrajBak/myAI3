const IG_REEL_REGEX = /(https?:\/\/(www\.)?instagram\.com\/reel\/[^\s]+)/g;

export function extractInstagramUrls(text: string): string[] {
  if (!text) return [];
  return text.match(IG_REEL_REGEX) || [];
}

export function stripInstagramUrls(text: string): string {
  if (!text) return "";
  return text.replace(IG_REEL_REGEX, "").trim();
}

