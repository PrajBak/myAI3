import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY!);

export const tiktokTrendSearch = tool({
  description: "Fetch trending TikTok skincare videos for market and influencer analysis.",
  inputSchema: z.object({
    query: z.string().describe("The skincare topic to search for on TikTok"),
  }),
  execute: async ({ query }) => {
    try {
      const searchQuery = `
        tiktok viral ${query} skincare 
        routine review dermatologist
      `;

      const { results } = await exa.search(searchQuery, {
        includeDomains: ["tiktok.com"],
        numResults: 5,
        contents: { text: true },
      });

      const videos = results
        .filter((r) => r.url?.includes("tiktok.com"))
        .map((result) => ({
          title: result.title || "",
          url: result.url || "",
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