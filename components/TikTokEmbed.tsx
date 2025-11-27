"use client";

import { useEffect, useMemo } from "react";

declare global {
  interface Window {
    tiktokEmbedLoad?: () => void;
    tiktokEmbed?: {
      load?: () => void;
    };
  }
}

const TIKTOK_SCRIPT_ID = "tiktok-embed-script";
const TIKTOK_SCRIPT_SRC = "https://www.tiktok.com/embed.js";

function ensureEmbedLoader() {
  if (typeof window === "undefined") return;

  if (!window.tiktokEmbedLoad) {
    window.tiktokEmbedLoad = () => {
      window.tiktokEmbed?.load?.();
    };
  }
}

function extractVideoId(url: string) {
  const match = url.match(/video\/(\d+)/);
  return match?.[1];
}

export function TikTokEmbed({ url }: { url: string }) {
  const videoId = useMemo(() => extractVideoId(url), [url]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof document === "undefined") return;

    ensureEmbedLoader();

    let script = document.getElementById(TIKTOK_SCRIPT_ID) as HTMLScriptElement | null;
    const handleLoad = () => window.tiktokEmbedLoad?.();

    if (!script) {
      script = document.createElement("script");
      script.id = TIKTOK_SCRIPT_ID;
      script.async = true;
      script.src = TIKTOK_SCRIPT_SRC;
      script.addEventListener("load", handleLoad);
      document.body.appendChild(script);
    } else {
      window.tiktokEmbedLoad?.();
      script.addEventListener("load", handleLoad);
    }

    return () => {
      script?.removeEventListener("load", handleLoad);
    };
  }, []);

  useEffect(() => {
    ensureEmbedLoader();
    window.tiktokEmbedLoad?.();
  }, [url]);

  return (
    <div className="my-4 w-full">
      <blockquote className="tiktok-embed" cite={url} data-video-id={videoId}>
        <section>Loading TikTok…</section>
      </blockquote>
    </div>
  );
}