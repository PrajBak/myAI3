"use client";

import { UIMessage, ToolCallPart, ToolResultPart } from "ai";
import { Response } from "@/components/ai-elements/response";
import { ReasoningPart } from "./reasoning-part";
import { ToolCall, ToolResult } from "./tool-call";
import { InstagramEmbed } from "@/components/InstagramEmbed";
import { extractInstagramUrls, stripInstagramUrls } from "@/components/instagram-utils";

export function AssistantMessage({ message, status, isLastMessage, durations, onDurationChange }: { message: UIMessage; status?: string; isLastMessage?: boolean; durations?: Record<string, number>; onDurationChange?: (key: string, duration: number) => void }) {
    return (
        <div className="w-full">
            <div className="text-sm flex flex-col gap-4">
                {message.parts.map((part, i) => {
                    const isStreaming = status === "streaming" && isLastMessage && i === message.parts.length - 1;
                    const durationKey = `${message.id}-${i}`;
                    const duration = durations?.[durationKey];

                    if (part.type === "text") {
                        const urls = extractInstagramUrls(part.text);
                        const cleanedText = stripInstagramUrls(part.text);

                        return (
                            <div
                                key={`${message.id}-${i}`}
                                className="relative flex flex-col gap-4 rounded-[28px] border border-white/10 bg-white/5 px-5 py-4 text-[#FDF6DE] shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
                            >
                                {cleanedText && (
                                    <Response className="text-base leading-relaxed text-[#FDF6DE]/90">
                                        {cleanedText}
                                    </Response>
                                )}
                                {urls.map((url, idx) => (
                                    <div
                                        key={`${message.id}-${i}-${idx}`}
                                        className="overflow-hidden rounded-2xl border border-white/15 bg-[#120A24]/60 p-3"
                                    >
                                        <InstagramEmbed url={url} />
                                    </div>
                                ))}
                            </div>
                        );
                    } else if (part.type === "reasoning") {
                        return (
                            <div
                                key={`${message.id}-${i}`}
                                className="rounded-2xl border border-dashed border-amber-200/40 bg-amber-50/5 px-4 py-3 text-sm text-amber-50/80"
                            >
                                <ReasoningPart
                                    part={part}
                                    isStreaming={isStreaming}
                                    duration={duration}
                                    onDurationChange={onDurationChange ? (d) => onDurationChange(durationKey, d) : undefined}
                                />
                            </div>
                        );
                    } else if (
                        part.type.startsWith("tool-") || part.type === "dynamic-tool"
                    ) {
                        if ('state' in part && part.state === "output-available") {
                            return (
                                <div
                                    key={`${message.id}-${i}`}
                                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80"
                                >
                                    <ToolResult part={part as unknown as ToolResultPart} />
                                </div>
                            );
                        } else {
                            return (
                                <div
                                    key={`${message.id}-${i}`}
                                    className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white/80"
                                >
                                    <ToolCall part={part as unknown as ToolCallPart} />
                                </div>
                            );
                        }
                    }
                    return null;
                })}
            </div>
        </div>
    )
}