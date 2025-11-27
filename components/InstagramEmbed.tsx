"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    instgrm?: {
      Embeds?: {
        process?: () => void;
      };
    };
  }
}

export function InstagramEmbed({ url }: { url: string }) {
  useEffect(() => {
    const existingScript = document.getElementById("instagram-embed-script");

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "instagram-embed-script";
      script.src = "https://www.instagram.com/embed.js";
      script.async = true;
      script.onload = () => {
        window.instgrm?.Embeds?.process?.();
      };
      document.body.appendChild(script);
    } else {
      window.instgrm?.Embeds?.process?.();
    }
  }, [url]);

  return (
    <blockquote
      className="instagram-media"
      data-instgrm-permalink={url}
      data-instgrm-version="14"
    >
      <div>Loading Instagram Reel…</div>
    </blockquote>
  );
}

