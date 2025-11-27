import { tool } from 'ai';
import { z } from 'zod';
import Exa from 'exa-js';

const exa = new Exa(process.env.EXA_API_KEY);

export const webSearch = tool({
  description: "Fetch external skincare trends, industry insights, and expert commentary using Exa.",
  inputSchema: z.object({
    query: z.string().describe("The trend or market insight to search for"),
  }),
  execute: async ({ query }) => {
    const { results } = await exa.search(query, {
      contents: { text: true },
      numResults: 4
    });

    return results.map(r => ({
      title: r.title,
      url: r.url,
      content: r.text?.slice(0, 1000) || "",
      publishedDate: r.publishedDate
    }));
  }
});