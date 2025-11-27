import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY!);
const REQUEST_TIMEOUT_MS = 12000;

type TikTokSearchResult = {
  title?: string | null;
  url?: string | null;
  text?: string | null;
  publishedDate?: string | null;
};

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`tiktokTrendSearch timed out after ${ms}ms`));
    }, ms);
  });

  return (Promise.race([promise, timeoutPromise]) as Promise<T>).finally(() => {
    clearTimeout(timeoutId);
  });
}

export const tiktokTrendSearch = tool({
  description: "Fetch trending TikTok skincare videos for market and influencer analysis.",
  inputSchema: z.object({
    query: z.string().describe("The skincare topic to search for on TikTok"),
  }),
  execute: async ({ query }: { query: string }) => {
    try {
      const searchQuery = `
        tiktok viral ${query} skincare 
        routine review dermatologist
      `;

      const response = await withTimeout(
        exa.search(searchQuery, {
          includeDomains: ["tiktok.com"],
          numResults: 5,
          contents: { text: true },
        }),
        REQUEST_TIMEOUT_MS
      );

      const results =
        (response as { results?: TikTokSearchResult[] }).results ?? [];

      const videos = results
        .filter((r: TikTokSearchResult) => r.url?.includes("tiktok.com"))
        .map((result: TikTokSearchResult) => ({
          title: result.title?.trim() || "",
          url: result.url?.trim() || "",
          summary: (result.text || "").slice(0, 500),
          publishedDate: result.publishedDate ?? null,
        }));

      return { videos };
    } catch (error) {
      console.error("tiktokTrendSearch error:", error);
      return { videos: [] };
    }
  },
});