"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    tiktokEmbedLoad?: () => void;
  }
}

const TIKTOK_SCRIPT_ID = "tiktok-embed-script";
const TIKTOK_SCRIPT_SRC = "https://www.tiktok.com/embed.js";

export function TikTokEmbed({ url }: { url: string }) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    let script = document.getElementById(TIKTOK_SCRIPT_ID) as HTMLScriptElement | null;

    if (!script) {
      script = document.createElement("script");
      script.id = TIKTOK_SCRIPT_ID;
      script.async = true;
      script.src = TIKTOK_SCRIPT_SRC;
      document.body.appendChild(script);

      script.onload = () => {
        if (window.tiktokEmbedLoad) window.tiktokEmbedLoad();
      };
    } else {
      // Script already loaded → refresh embeds
      if (window.tiktokEmbedLoad) window.tiktokEmbedLoad();
    }
  }, []);

  useEffect(() => {
    if (window.tiktokEmbedLoad) window.tiktokEmbedLoad();
  }, [url]);

  return (
    <div className="my-4 w-full">
      <blockquote className="tiktok-embed" cite={url} data-video-id>
        <section>Loading TikTok…</section>
      </blockquote>
    </div>
  );
}