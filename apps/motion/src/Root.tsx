import { Composition } from "remotion";
import { BrandLoop } from "./BrandLoop.js";
import { assets, bannerDurationInFrames, durationInFrames, fps } from "./assets.js";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {assets.map((asset) => (
        <Composition key={asset.id} id={asset.id} component={BrandLoop}
          defaultProps={{ asset }} width={asset.width} height={asset.height}
          fps={fps} durationInFrames={asset.banner ? bannerDurationInFrames : durationInFrames} />
      ))}
    </>
  );
};
