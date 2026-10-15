"use client";

/** Animated sunrise banner shown in the landing page's example quote card. */

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { withBasePath } from "@/lib/site";
// WebP derivative of assets/brand/animated/fluffboost-production-banner.png.
import poster from "@/assets/brand/fluffboost-banner-poster.webp";

/**
 * Static WebP poster with the looping MP4 layered on top. The video autoplays
 * only when the visitor has no reduced-motion preference (and follows changes
 * to it); the toggle button unmounts/remounts the <video> rather than pausing it.
 */
export function BrandBanner() {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPlaying(!preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  // If the browser blocks autoplay, fall back to the poster so the button
  // label ("Play animation") matches what is on screen.
  const startVideo = useCallback((video: HTMLVideoElement | null) => {
    video?.play().catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "NotAllowedError") setPlaying(false);
    });
  }, []);

  // 17:6 is the 680x240 banner composition, so the box is sized before the image loads.
  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl" style={{ aspectRatio: "17 / 6" }}>
      <Image src={poster} alt="A warm sunrise over a woodland mountain lake" priority className="h-auto w-full" />
      {/* The animated poster, hidden from assistive tech (the poster's alt covers it).
          The MP4 lives in /public (apps/motion's render script copies it there), so
          it needs withBasePath(); imported assets get the base path automatically. */}
      {playing && <video
        ref={startVideo}
        aria-hidden="true" autoPlay loop muted playsInline preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        src={withBasePath("/brand/fluffboost-production-banner.mp4")}
      />}
      {/* The label already states the action, so no aria-pressed (it would contradict it). */}
      <button type="button" onClick={() => setPlaying((value) => !value)}
        className="absolute bottom-2 right-2 rounded-full bg-[#2b1e12] px-3 py-2 text-xs font-semibold text-[#fbf4e9]"
      >
        {playing ? "Pause animation" : "Play animation"}
      </button>
    </div>
  );
}
