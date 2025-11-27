import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { PINECONE_TOP_K, PINECONE_INDEX_NAME } from '@/config';
import { Chunk } from '@/types/data';

if (!process.env.PINECONE_API_KEY) throw new Error('PINECONE_API_KEY is not set');
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');

export const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
export const pineconeIndex = pinecone.Index(PINECONE_INDEX_NAME);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Helper: Create embedding
export async function embed(text: string) {
    const resp = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text
    });
    return resp.data[0].embedding;
}

// --- SEARCH REVIEWS ---
export async function searchReviewsPinecone(query: string) {
    const vector = await embed(query);

    const results = await pineconeIndex.namespace("reviews").query({
        vector,
        topK: 30,
        includeMetadata: true,
        filter: {
            rating: { $lte: 3 },
            verified_purchase: true
        }
    });

    return results.matches?.map(m => m.metadata) || [];
}

// --- SEARCH PRODUCTS ---
export async function searchProductsPinecone(query: string) {
    const vector = await embed(query);

    const results = await pineconeIndex.namespace("products").query({
        vector,
        topK: 20,
        includeMetadata: true
    });

    return results.matches?.map(m => m.metadata) || [];
}