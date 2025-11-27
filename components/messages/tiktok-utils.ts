const TIKTOK_URL_REGEX = /(https?:\/\/(www\.)?tiktok\.com\/[^\s]+)/g;

export function extractTikTokUrls(text: string): string[] {
  if (!text) {
    return [];
  }

  const matches = text.match(TIKTOK_URL_REGEX);
  return matches ? matches.map((url) => url.trim()) : [];
}

export function stripTikTokUrls(text: string): string {
  if (!text) {
    return "";
  }

  return text.replace(TIKTOK_URL_REGEX, "").replace(/\s{2, }/g, " ").trim();
}

