export const fps = 24;
export const durationInFrames = 8 * fps;
export const bannerDurationInFrames = 32 * fps;
export type BrandAsset = {
  id: string; file: string; width: number; height: number; accent: string; banner: boolean;
};
export const assets: BrandAsset[] = [
  ...(["production", "dev", "staging"] as const).flatMap((variant) => {
    const accent = variant === "dev" ? "#25CFFF" : "#FFCE69";
    return [
      { id: `fluffboost-${variant}-banner`, file: "motion-sources/sunrise-landscape.png", width: 680, height: 240, accent, banner: true },
      { id: `fluffboost-${variant}-icon`, file: "motion-sources/wolf-icon.png", width: 1024, height: 1024, accent, banner: false },
    ];
  }),
  { id: "fluffboost-premium-paw", file: "motion-sources/premium-paw.png", width: 250, height: 250, accent: "#FFCE69", banner: false },
];
