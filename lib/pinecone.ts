import { Pinecone } from '@pinecone-database/pinecone';
import OpenAI from 'openai';
import { PINECONE_TOP_K, PINECONE_INDEX_NAME } from '@/config';
import { Chunk } from '@/types/data';

if (!process.env.PINECONE_API_KEY) {
    throw new Error('PINECONE_API_KEY is not set');
}

if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set');
}

export const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY,
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const pineconeIndex = pinecone.Index(PINECONE_INDEX_NAME);

export async function searchPinecone(query: string): Promise<string> {
    try {
        // 1. Generate embedding for the query
        const embeddingResponse = await openai.embeddings.create({
            model: 'text-embedding-3-large',
            input: query,
        });

        const embedding = embeddingResponse.data[0].embedding;

        // 2. Query both namespaces
        const [productsQuery, reviewsQuery] = await Promise.all([
            pineconeIndex.namespace('products').query({
                vector: embedding,
                topK: Math.floor(PINECONE_TOP_K / 2),
                includeMetadata: true,
            }),
            pineconeIndex.namespace('reviews').query({
                vector: embedding,
                topK: Math.floor(PINECONE_TOP_K / 2),
                includeMetadata: true,
            }),
        ]);

        // 3. Combine and format results
        const chunks: Chunk[] = [];

        // Process products
        if (productsQuery.matches) {
            for (const match of productsQuery.matches) {
                const metadata = match.metadata as any;
                if (metadata && metadata.text) {
                    chunks.push({
                        text: metadata.text,
                        source_name: metadata.product_name || "Unknown Product",
                        source_description: `Product: ${metadata.product_name} (${metadata.brand})`,
                        source_url: metadata.product_asin ? `https://www.amazon.com/dp/${metadata.product_asin}` : undefined,
                        chunk_type: "text",
                        order: 0
                    });
                }
            }
        }

        // Process reviews
        if (reviewsQuery.matches) {
            for (const match of reviewsQuery.matches) {
                const metadata = match.metadata as any;
                if (metadata && metadata.text) {
                    chunks.push({
                        text: metadata.text,
                        source_name: "Amazon Review",
                        source_description: `Review for ${metadata.product_name}`,
                        source_url: metadata.product_asin ? `https://www.amazon.com/dp/${metadata.product_asin}` : undefined,
                        chunk_type: "text",
                        order: 1
                    });
                }
            }
        }

        if (chunks.length === 0) {
            return "< results > No relevant information found. </results>";
        }

        // 4. Format as context string
        const formattedResults = chunks.map((chunk, index) => {
            return `
<result index="${index + 1}">
<source>${chunk.source_description}</source>
<content>${chunk.text}</content>
<url>${chunk.source_url || 'N/A'}</url>
</result>`;
        }).join('\n');

        return `< results > ${formattedResults} </results>`;

    } catch (error) {
        console.error("Error searching Pinecone:", error);
        return "< results > An error occurred while searching the database. </results>";
    }
}