export const fps = 24;
export const iconSeconds = 8;
export const bannerSeconds = 32;
export const durationInFrames = iconSeconds * fps;
export const bannerDurationInFrames = bannerSeconds * fps;

/** GIFs keep every other frame (12 fps) to stay inside the upload budget. */
export const gifEveryNthFrame = 2;
export const gifFps = fps / gifEveryNthFrame;
export const iconSize = 1024;
/** Full-size icon GIFs are halved (512 × 512); smaller assets keep their size. */
export const gifIconScale = 0.5;
/** Conservative Discord upload budget for each GIF, in bytes. */
export const GIF_BYTE_BUDGET = 10_000_000;

type BrandVariant = "production" | "dev" | "staging" | "premium";
export type BrandAsset = {
  id: string; variant: BrandVariant; file: string; width: number; height: number; accent: string; banner: boolean;
};
export const gifScale = (asset: Pick<BrandAsset, "width">) => (asset.width === iconSize ? gifIconScale : 1);

// `file` values are relative to the public dir in src/bundle-config.ts.
export const assets: BrandAsset[] = [
  ...(["production", "dev", "staging"] as const).flatMap((variant) => {
    const accent = variant === "dev" ? "#25CFFF" : "#FFCE69";
    return [
      { id: `fluffboost-${variant}-banner`, variant, file: "sunrise-landscape.png",
        width: 680, height: 240, accent, banner: true },
      { id: `fluffboost-${variant}-icon`, variant, file: "wolf-icon.png",
        width: iconSize, height: iconSize, accent, banner: false },
    ];
  }),
  { id: "fluffboost-premium-paw", variant: "premium", file: "premium-paw.png",
    width: 250, height: 250, accent: "#FFCE69", banner: false },
];
