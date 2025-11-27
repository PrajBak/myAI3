"use client";

import { UIMessage } from "ai";
import { Response } from "@/components/ai-elements/response";
import { InstagramEmbed } from "@/components/InstagramEmbed";
import { extractInstagramUrls, stripInstagramUrls } from "@/components/instagram-utils";

export function UserMessage({ message }: { message: UIMessage }) {
    return (
        <div className="flex w-full justify-end">
            <div className="max-w-lg w-full rounded-[28px] bg-gradient-to-r from-[#FFE6A7] via-[#FFC67A] to-[#FF9B73] px-5 py-4 text-[#392210] shadow-[0_20px_60px_rgba(255,198,122,0.35)]">
                <div className="text-base leading-relaxed">
                    {message.parts.map((part, i) => {
                        switch (part.type) {
                            case "text":
                                const urls = extractInstagramUrls(part.text);
                                const cleanedText = stripInstagramUrls(part.text);

                                return (
                                    <div key={`${message.id}-${i}`} className="flex flex-col gap-3">
                                        {cleanedText && (
                                            <Response className="text-[#3a1f0f]">
                                                {cleanedText}
                                            </Response>
                                        )}
                                        {urls.map((url, idx) => (
                                            <div
                                                key={`${message.id}-${i}-${idx}`}
                                                className="overflow-hidden rounded-2xl border border-white/40 bg-white/30 p-3"
                                            >
                                                <InstagramEmbed url={url} />
                                            </div>
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