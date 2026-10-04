# FluffBoost motion

Local Remotion source for production, DEV, STAGING and Premium paw animations.
The banners are logo-free sunrise scenery with moving clouds, stationary mountains
and lake shimmer. Icons retain the approved wolf or paw with orbiting glints.
The banners loop over 32 seconds for slow cloud drift. Icons loop over eight seconds.
The final frame leads into the first without a camera cut. There is no audio.

From the repository root, preview the compositions:

```sh
bun run dev:motion
```

Render all seven compositions to PNG, MP4 and looping GIF:

```sh
bun run brand:render
```

Render only one composition:

```sh
bun run brand:render fluffboost-production-banner
```

Exports and a SHA-256 manifest are saved in `assets/brand/animated` and committed.
Banners are **680 × 240 (17:6)** for the Discord Bot panel. PNG/MP4 icons are 1024 × 1024;
GIF icons are 512 × 512 to keep uploads small.
the Premium SKU paw is 250 × 250. GIFs use 12 fps, videos use 24 fps.
The render fails if a GIF exceeds a conservative 10,000,000-byte upload budget.
The production MP4 is also copied into the docs site's public assets for deployment.

The simplified image-generated wolf, paw and cloudless landscape backplates are
in `assets/brand/motion-sources`. Remotion adds the clouds, sun, icon glint and
exact DEV/STAGING labels as separate layers. The earlier detailed artwork is
preserved in `assets/brand/exports` and `concepts`. The landscape is cropped to
17:6 rather than stretched.
Review the PNG and animated playback before uploading.
Studio and the renderer share those assets; no second copy is maintained.

Verify committed exports with `bun run brand:verify` (requires `ffmpeg` and
`ffprobe` on PATH). This decodes the GIFs, checks moving frames and loop boundaries,
and verifies dimensions, duration, upload size, checksums and the website video.
CI runs this check alongside the bot tests.

MP4 is for marketing and website use. Use PNG or GIF in Discord's upload fields.
These deterministic animations do not require Gemini, an API key or cloud rendering.
Any future Gemini background should be reviewed for character changes and loop quality
before integration. Generated artwork provenance remains recorded in the manifest.

Remotion is a separate dependency with its own [license](https://www.remotion.dev/docs/license/pricing).
Check the company license requirements before commercial use; this repository's GPL
license does not replace the Remotion license.
