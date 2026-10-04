"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import poster from "../../../assets/brand/animated/fluffboost-production-banner.png";

export function BrandBanner() {
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setPlaying(!preference.matches);
    sync();
    preference.addEventListener("change", sync);
    return () => preference.removeEventListener("change", sync);
  }, []);

  return (
    <div className="relative mb-5 overflow-hidden rounded-2xl" style={{ aspectRatio: "17 / 6" }}>
      <Image src={poster} alt="A warm sunrise over a woodland mountain lake" priority className="h-auto w-full" />
      {playing && <video
        aria-hidden="true" autoPlay loop muted playsInline preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
        src={`${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/brand/fluffboost-production-banner.mp4`}
      />}
      <button type="button" aria-pressed={playing} onClick={() => setPlaying((value) => !value)}
        className="absolute bottom-2 right-2 rounded-full bg-[#2b1e12] px-3 py-2 text-xs font-semibold text-[#fbf4e9]"
      >
        {playing ? "Pause animation" : "Play animation"}
      </button>
    </div>
  );
}
