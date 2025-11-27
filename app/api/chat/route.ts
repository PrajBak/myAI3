import { streamText, UIMessage, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse, CoreMessage } from 'ai';
import { MODEL } from '@/config';
import { SYSTEM_PROMPT } from '@/prompts';
import { isContentFlagged } from '@/lib/moderation';
import { webSearch } from './tools/web-search';
import { vectorDatabaseSearch } from './tools/search-vector-database';
import { searchPinecone } from "@/lib/pinecone";
import Exa from "exa-js";
import OpenAI from "openai";

// Initialize Exa and OpenAI clients
const exa = new Exa(process.env.EXA_API_KEY);
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export const maxDuration = 60; // Increased duration for the pipeline

export async function POST(req: Request) {
    const { messages }: { messages: UIMessage[] } = await req.json();

    const latestUserMessage = messages
        .filter(msg => msg.role === 'user')
        .pop();

    let pipelineContext = "";

    if (latestUserMessage) {
        const textParts = latestUserMessage.parts
            .filter(part => part.type === 'text')
            .map(part => 'text' in part ? part.text : '')
            .join('');

        if (textParts) {
            // Moderation check
            const moderationResult = await isContentFlagged(textParts);
            if (moderationResult.flagged) {
                const stream = createUIMessageStream({
                    execute({ writer }) {
                        const textId = 'moderation-denial-text';
                        writer.write({ type: 'start' });
                        writer.write({ type: 'text-start', id: textId });
                        writer.write({
                            type: 'text-delta',
                            id: textId,
                            delta: moderationResult.denialMessage || "Your message violates our guidelines. I can't answer that.",
                        });
                        writer.write({ type: 'text-end', id: textId });
                        writer.write({ type: 'finish' });
                    },
                });
                return createUIMessageStreamResponse({ stream });
            }

            // --- GLOBAL TREND ANALYSIS PIPELINE ---
            try {
                console.log(`[Global Pipeline] Processing query: "${textParts}"`);

                // 1. Search Pinecone
                console.log(`[Global Pipeline] Step 1: Searching Pinecone...`);
                const internalContext = await searchPinecone(textParts);

                // 2. Analyze Internal Data with OpenAI
                console.log(`[Global Pipeline] Step 2: Analyzing internal data...`);
                const internalAnalysisResponse = await openai.chat.completions.create({
                    model: "gpt-4o",
                    messages: [
                        {
                            role: "system",
                            content: `You are a market research expert. Analyze the following internal product/review data to identify patterns, popular ingredients, and potential "white spaces".
                            
                            Internal Data:
                            ${internalContext}
                            
                            Provide a concise summary.`
                        },
                        { role: "user", content: textParts }
                    ]
                });
                const internalInsights = internalAnalysisResponse.choices[0]?.message?.content || "No internal insights found.";

                // 3. Search Exa AI
                console.log(`[Global Pipeline] Step 3: Searching Exa AI...`);
                const exaResponse = await exa.searchAndContents(`latest skin care market trends ${textParts}`, {
                    type: "neural",
                    useAutoprompt: true,
                    numResults: 3,
                    text: true,
                });
                const externalTrends = exaResponse.results.map(r => `Title: ${r.title}\nURL: ${r.url}\nSummary: ${r.text.slice(0, 300)}...`).join("\n\n");

                // 4. Synthesize Context
                pipelineContext = `
                <pipeline_analysis>
                # Internal Data Analysis (Pinecone)
                ${internalInsights}

                # Latest Market Trends (Exa AI)
                ${externalTrends}
                </pipeline_analysis>
                `;
                console.log(`[Global Pipeline] Pipeline complete.`);

            } catch (error) {
                console.error("[Global Pipeline] Error:", error);
                pipelineContext = "\n[System Note: The trend analysis pipeline encountered an error and could not complete.]\n";
            }
            // --------------------------------------
        }
    }

    // Inject the pipeline context into the messages
    const modelMessages = convertToModelMessages(messages);
    if (pipelineContext) {
        modelMessages.push({
            role: 'system',
            content: `The following is a mandatory analysis report generated for the user's query. You MUST use this information to answer the user's request.\n${pipelineContext}`
        });
    }

    const result = streamText({
        model: MODEL,
        system: SYSTEM_PROMPT,
        messages: modelMessages,
        tools: {
            webSearch,
            vectorDatabaseSearch,
            // analyzeSkinCareTrends removed as it is now global
        },
        stopWhen: stepCountIs(10),
        providerOptions: {
            openai: {
                reasoningSummary: 'auto',
                reasoningEffort: 'low',
                parallelToolCalls: false,
            }
        }
    });

    return result.toUIMessageStreamResponse({
        sendReasoning: true,
    });
}