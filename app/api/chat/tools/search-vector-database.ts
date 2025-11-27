import { tool } from "ai";
import { z } from "zod";
import { searchReviewsPinecone, searchProductsPinecone } from "@/lib/pinecone";

// 1️⃣ --- VECTOR SEARCH FOR REVIEWS ---
// (customer complaints, rating ≤ 3, verified purchase)
export const vectorSearchReviews = tool({
    description: "Retrieve customer complaints (reviews) from the vector database. Always returns verified purchases and low-rated reviews first.",
    inputSchema: z.object({
        query: z.string().describe("The query for retrieving customer complaints"),
    }),
    execute: async ({ query }) => {
        const results = await searchReviewsPinecone(query);
        return {
            type: "reviews",
            results,
        };
    }
});

// 2️⃣ --- VECTOR SEARCH FOR PRODUCTS ---
// (competitor claims, brand positioning, product benefits)
export const vectorSearchProducts = tool({
    description: "Retrieve competitor product information, claims, and descriptions from the vector database.",
    inputSchema: z.object({
        query: z.string().describe("The query for retrieving product summaries"),
    }),
    execute: async ({ query }) => {
        const results = await searchProductsPinecone(query);
        return {
            type: "products",
            results,
        };
    }
});