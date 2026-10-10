import { AbsoluteFill, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { BrandAsset } from "./assets.js";
import { LandscapeLoop } from "./LandscapeLoop.js";

/** Visible periodic atmosphere: the approved character and labels stay fixed. */
export const BrandLoop = ({ asset }: { asset: BrandAsset }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const phase = (frame / durationInFrames) * Math.PI * 2;
  const glow = 0.06 + 0.06 * (1 - Math.cos(phase));
  if (asset.banner) {
    return <LandscapeLoop asset={asset} phase={phase} />;
  }
  const isPaw = asset.variant === "premium";
  const isDev = asset.variant === "dev";
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#FFF1CE" }}>
      <Img src={staticFile(asset.file)} style={{ width: "100%", height: "100%", objectFit: "contain",
        transform: isPaw ? undefined : "scale(.9)", borderRadius: isPaw ? undefined : "50%" }} />
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 75% 22%, ${asset.accent}, transparent 62%)`,
        mixBlendMode: "screen", opacity: glow, transform: `translateX(${Math.sin(phase) * 3}%)`,
      }} />
      {/* One glint orbiting the icon once per loop. */}
      <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <g transform={`translate(${50 + Math.cos(phase) * 42}, ${50 + Math.sin(phase) * 42})`}
          opacity={0.6 + Math.sin(phase) * 0.2}>
          <circle r="2.5" fill={asset.accent} opacity="0.25" />
          <path d="M 0 -1.8 L .5 -.5 L 1.8 0 L .5 .5 L 0 1.8 L -.5 .5 L -1.8 0 L -.5 -.5 Z" fill="#FFFBE9" />
        </g>
      </svg>
      {(asset.variant === "dev" || asset.variant === "staging") && (
        <div style={{ position: "absolute", left: "50%", bottom: "11%", transform: "translateX(-50%)",
          borderRadius: 16, padding: "10px 28px", color: "#FFF9EB", backgroundColor: isDev ? "#17637B" : "#775014",
          fontFamily: "Arial, sans-serif", fontWeight: 800, fontSize: isDev ? 64 : 46,
          letterSpacing: 2, lineHeight: 1.15, border: "4px solid #FFF1CE",
        }}>
          {isDev ? "DEV" : "STAGING"}
        </div>
      )}
    </AbsoluteFill>
  );
};
