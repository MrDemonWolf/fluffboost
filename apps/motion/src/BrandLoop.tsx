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
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#FFF1CE" }}>
      <Img src={staticFile(asset.file)} style={{ width: "100%", height: "100%", objectFit: "contain", transform: asset.id.includes("paw") ? undefined : "scale(.9)", borderRadius: asset.id.includes("paw") ? undefined : "50%" }} />
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse at 75% 22%, ${asset.accent}, transparent 62%)`,
        mixBlendMode: "screen", opacity: glow, transform: `translateX(${Math.sin(phase) * 3}%)`,
      }} />
        <svg viewBox="0 0 100 100" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
          {[0].map((index) => {
            const angle = phase + index * Math.PI * 2 / 3;
            const x = 50 + Math.cos(angle) * 42;
            const y = 50 + Math.sin(angle) * 42;
            return <g key={index} transform={`translate(${x}, ${y})`} opacity={0.6 + Math.sin(angle) * 0.2}>
              <circle r="2.5" fill={asset.accent} opacity="0.25" />
              <path d="M 0 -1.8 L .5 -.5 L 1.8 0 L .5 .5 L 0 1.8 L -.5 .5 L -1.8 0 L -.5 -.5 Z" fill="#FFFBE9" />
            </g>;
          })}
        </svg>
      {!asset.id.includes("production") && !asset.id.includes("paw") && (
        <div style={{ position: "absolute", left: "50%", bottom: "11%", transform: "translateX(-50%)",
          borderRadius: 16, padding: "10px 28px", color: "#FFF9EB", backgroundColor: asset.id.includes("dev") ? "#17637B" : "#775014",
          fontFamily: "Arial, sans-serif", fontWeight: 800, fontSize: asset.id.includes("dev") ? 64 : 46,
          letterSpacing: 2, lineHeight: 1.15, border: "4px solid #FFF1CE",
        }}>
          {asset.id.includes("dev") ? "DEV" : "STAGING"}
        </div>
      )}
    </AbsoluteFill>
  );
};
