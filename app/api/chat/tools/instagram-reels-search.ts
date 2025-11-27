import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";

const exa = new Exa(process.env.EXA_API_KEY!);

export const instagramReelsSearch = tool({
  description: "Fetch Instagram Reels related to skincare trends.",
  inputSchema: z.object({
    query: z.string().describe("The skincare topic to search Instagram Reels for."),
  }),
  execute: async ({ query }) => {
    try {
      const { results } = await exa.search(
        `${query} Instagram Reel skincare dermatologist influencer`,
        {
          includeDomains: ["instagram.com"],
          numResults: 5,
          contents: { text: true },
        }
      );

      const reels = results
        .filter(r => r.url?.includes("instagram.com"))
        .map(r => ({
          title: r.title || "",
          url: r.url || "",
          summary: (r.text || "").slice(0, 400),
          publishedDate: r.publishedDate ?? null
        }));

      return { reels };
    } catch (err) {
      console.error("Instagram Reels Search Error:", err);
      return { reels: [] };
    }
  }
});

