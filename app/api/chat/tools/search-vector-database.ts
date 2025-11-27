import { tool } from "ai";
import { z } from "zod";
import { searchReviewsPinecone, searchProductsPinecone } from "@/lib/pinecone";


// ---------------------------------------------------------
// 1️⃣ VECTOR SEARCH FOR REVIEWS (customer complaints)
// ---------------------------------------------------------
export const vectorSearchReviews = tool({
    description: "Retrieve customer complaints (reviews) from the vector database. Always returns verified purchases and low-rated reviews first.",
    inputSchema: z.object({
        query: z.string().describe("The query for retrieving customer complaints"),
    }),
    execute: async ({ query }) => {
        const raw = await searchReviewsPinecone(query);

        // SAFELY FILTER OUT undefined (fixes Vercel build)
        const results = raw.filter(
            (r): r is Record<string, any> => r !== undefined && r !== null
        );

        return {
            type: "reviews",
            results: results.map(r => ({
                product_name: r.product_name || "",
                rating: r.rating ?? null,
                sentiment: r.sentiment_score ?? null,
                complaint_topics: r.complaint_topics || [],
                // reduce text so GPT stops hitting token limits
                short_text: r.text?.slice(0, 300) || ""
            }))
        };
    }
});


// ---------------------------------------------------------
// 2️⃣ VECTOR SEARCH FOR PRODUCTS (competitor features)
// ---------------------------------------------------------
export const vectorSearchProducts = tool({
    description: "Retrieve competitor product information, claims, and descriptions from the vector database.",
    inputSchema: z.object({
        query: z.string().describe("The query for retrieving product summaries"),
    }),
    execute: async ({ query }) => {
        const raw = await searchProductsPinecone(query);

        // SAFELY FILTER OUT undefined
        const results = raw.filter(
            (r): r is Record<string, any> => r !== undefined && r !== null
        );

        return {
            type: "products",
            results: results.map(r => ({
                product_name: r.product_name || "",
                brand: r.brand || "",
                category: r.category || "",
                key_claims: r.key_claims || [],
                sentiment: r.sentiment_score ?? null,

                // limit size for token budgeting
                short_text: r.text?.slice(0, 400) || ""
            }))
        };
    }
});
