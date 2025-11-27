import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { PINECONE_TOP_K, PINECONE_INDEX_NAME } from '@/config';
import { Chunk } from '@/types/data';

if (!process.env.PINECONE_API_KEY) throw new Error('PINECONE_API_KEY is not set');
if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY is not set');

export const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
export const pineconeIndex = pinecone.Index(PINECONE_INDEX_NAME);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// =============================================================
//  NEW: Unified Embedding Helper
// =============================================================
async function getEmbedding(text: string) {
    const res = await openai.embeddings.create({
        model: "text-embedding-3-large",
        input: text
    });
    return res.data[0].embedding;
}


// =============================================================
//  NEW: Filter Logic
// =============================================================
function reviewFilter(category?: string, brand?: string, asin?: string) {
    const filter: any = {
        doc_type: "review",
        rating: { $lte: 3 },            // complaints only
        verified_purchase: true         // real reviews only
    };
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (asin) filter.asin = asin;
    return filter;
}

function productFilter(category?: string, brand?: string, asin?: string) {
    const filter: any = { doc_type: "product" };
    if (category) filter.category = category;
    if (brand) filter.brand = brand;
    if (asin) filter.asin = asin;
    return filter;
}


// =============================================================
//  MAIN: Retrieve from Pinecone
// =============================================================
export async function searchPinecone(query: string, opts: {
    category?: string;
    brand?: string;
    asin?: string;
} = {}): Promise<Chunk[]> {

    const { category, brand, asin } = opts;

    // 1. Embed query
    const embedding = await getEmbedding(query);

    // 2. Query Products + Reviews with metadata filtering
    const [productRes, reviewRes] = await Promise.all([
        pineconeIndex.namespace("products").query({
            vector: embedding,
            topK: Math.floor(PINECONE_TOP_K / 2),
            includeMetadata: true,
            filter: productFilter(category, brand, asin)
        }),
        pineconeIndex.namespace("reviews").query({
            vector: embedding,
            topK: Math.floor(PINECONE_TOP_K / 2),
            includeMetadata: true,
            filter: reviewFilter(category, brand, asin)
        }),
    ]);

    const chunks: Chunk[] = [];

    // ---------------------------------------------------------
    // Products
    // ---------------------------------------------------------
    for (const m of productRes.matches ?? []) {
        const md = m.metadata as any;
        const text = md?.text || md?.description || "";
        if (!text) continue;

        chunks.push({
            text,
            source_name: md.product_name ?? "Unknown Product",
            source_description: `Product: ${md.product_name} (${md.brand})`,
            chunk_type: "product",
            order: 0
        });
    }

    // ---------------------------------------------------------
    // Reviews
    // ---------------------------------------------------------
    for (const m of reviewRes.matches ?? []) {
        const md = m.metadata as any;
        const text = md?.text || "";
        if (!text) continue;

        chunks.push({
            text,
            source_name: "Amazon Review",
            source_description: `Review for ${md.product_name} (${md.brand})`,
            chunk_type: "review",
            order: 1
        });
    }

    return chunks;
}