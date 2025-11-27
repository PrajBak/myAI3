"use client";

import { UIMessage } from "ai";
import { Response } from "@/components/ai-elements/response";
import { TikTokEmbed } from "@/components/TikTokEmbed";
import { extractTikTokUrls, stripTikTokUrls } from "./tiktok-utils";

export function UserMessage({ message }: { message: UIMessage }) {
    return (
        <div className="whitespace-pre-wrap w-full flex justify-end">
            <div className="max-w-lg w-fit px-4 py-3 rounded-[20px] bg-neutral-100">
                <div className="text-sm">
                    {message.parts.map((part, i) => {
                        switch (part.type) {
                            case "text":
                                const urls = extractTikTokUrls(part.text);
                                const cleanedText = stripTikTokUrls(part.text);

                                return (
                                    <div key={`${message.id}-${i}`} className="flex flex-col gap-3">
                                        {cleanedText && <Response>{cleanedText}</Response>}
                                        {urls.map((url, idx) => (
                                            <TikTokEmbed key={`${message.id}-${i}-${idx}`} url={url} />
                                        ))}
                                    </div>
                                );
                        }
                    })}
                </div>
            </div>
        </div>
    )
}