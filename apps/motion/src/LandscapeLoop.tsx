import { AbsoluteFill, Img, staticFile } from "remotion";
import type { BrandAsset } from "./assets.js";

/** Cloudless image backplate; moving clouds are independent vector layers. */
export const LandscapeLoop = ({ asset, phase }: { asset: BrandAsset; phase: number }) => {
  const drift = phase / (Math.PI * 2) * 680;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#FFF0D5" }}>
      <Img src={staticFile(asset.file)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      {asset.id.includes("dev") && <AbsoluteFill style={{ backgroundColor: "#8BC9D1", mixBlendMode: "soft-light", opacity: 0.12 }} />}
      {asset.id.includes("staging") && <AbsoluteFill style={{ backgroundColor: "#E6AA64", mixBlendMode: "soft-light", opacity: 0.12 }} />}
      <svg viewBox="0 0 680 240" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        <circle cx="482" cy="105" r="24" fill="#F5C16E" />
        {[-1, 0, 1].flatMap((repeat) => [
          { x: 65, y: 44, scale: 1 }, { x: 392, y: 70, scale: 0.72 },
        ].map((cloud, index) => (
          <g key={`${repeat}-${index}`} transform={`translate(${cloud.x + drift + repeat * 680}, ${cloud.y}) scale(${cloud.scale})`} opacity="0.92">
            <path d="M 0 15 C 0 8 6 3 13 3 C 15 -7 27 -10 34 -3 C 41 -10 54 -5 56 4 C 68 2 77 7 77 15 C 77 22 69 24 60 24 L 15 24 C 5 24 0 21 0 15 Z" fill="#FFF8E8" />
          </g>
        )))}
        {Array.from({ length: 5 }, (_, index) => (
          <path key={index} d={`M ${410 - index * 11} ${213 + index * 4} h ${38 + index * 12}`}
            stroke="#FFEAC2" strokeWidth="1.2" strokeLinecap="round"
            opacity={0.1 + (Math.sin(phase + index) + 1) * 0.2}
            transform={`translate(${Math.sin(phase + index) * 5}, 0)`} />
        ))}
      </svg>
    </AbsoluteFill>
  );
};
