import { tool } from "ai";
import { z } from "zod";
import { searchPinecone } from "@/lib/pinecone";
import Exa from "exa-js";
import OpenAI from "openai";

// Initialize Exa and OpenAI clients
const exa = new Exa(process.env.EXA_API_KEY);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const analyzeSkinCareTrends = tool({
    description: 'Analyze skin care trends using internal data (Pinecone) and external market data (Exa AI). Use this when the user asks for trends, market analysis, or white spaces.',
    inputSchema: z.object({
        query: z.string().describe('The trend-related query to analyze, e.g., "latest moisturizer trends" or "white spaces in anti-aging".'),
    }),
    execute: async ({ query }) => {
        try {
            // 1. Search Pinecone for internal data
            console.log(`[analyzeSkinCareTrends] Searching Pinecone for: ${query}`);
            const internalContext = await searchPinecone(query);

            // 2. Analyze internal data with OpenAI to find "white spaces" or insights
            console.log(`[analyzeSkinCareTrends] Analyzing internal data with OpenAI...`);
            const internalAnalysisResponse = await openai.chat.completions.create({
                model: "gpt-4o", // Or use a config constant if available, but gpt-4o is good for analysis
                messages: [
                    {
                        role: "system",
                        content: `You are a market research expert in the skin care industry. 
                        Analyze the following internal product/review data to identify patterns, popular ingredients, and potential "white spaces" (gaps in the market).
                        
                        Internal Data:
                        ${internalContext}
                        
                        Provide a concise summary of your findings.`
                    },
                    { role: "user", content: query }
                ]
            });
            const internalInsights = internalAnalysisResponse.choices[0]?.message?.content || "No internal insights found.";

            // 3. Search Exa AI for the *latest* external trends
            console.log(`[analyzeSkinCareTrends] Searching Exa for latest trends...`);
            const exaResponse = await exa.searchAndContents(`latest skin care market trends ${query}`, {
                type: "neural",
                useAutoprompt: true,
                numResults: 3,
                text: true,
            });

            const externalTrends = exaResponse.results.map(r => `Title: ${r.title}\nURL: ${r.url}\nSummary: ${r.text.slice(0, 300)}...`).join("\n\n");

            // 4. Return the combined analysis
            return `
# Internal Data Analysis (Pinecone)
${internalInsights}

# Latest Market Trends (Exa AI)
${externalTrends}

# Synthesis
Please use the above information to provide a comprehensive answer to the user's request, combining the internal "ground truth" with the latest external market dynamics.
            `.trim();

        } catch (error) {
            console.error("Error in analyzeSkinCareTrends:", error);
            return "An error occurred while analyzing trends. Please try again.";
        }
    },
});
