# FluffBoost brand assets

The exact-size exports are ready to download below. They have not replaced the bot's current artwork or been uploaded to Discord. Discord's live crops and small-size label readability still need review.

Generated in ChatGPT based on the current banner. The set preserves the gray-and-cream wolf, golden eyes, and warm sunrise setting. The development and staging variants add visible environment labels so they can be distinguished from the production bot.

[Source ChatGPT project conversation](https://chatgpt.com/g/g-p-6ac1a1b717b88191b7cbf5b09b9edb2c-fluffboost/c/6ac1a553-2398-83e9-a3b0-d2ed4f2028a9)

## Exact-size exports

[Download all seven exports and their provenance manifest](fluffboost-discord-exports.zip). The portable ZIP is below 10,000,000 bytes. Individual files and SHA-256 checksums are listed in [the export manifest](exports/manifest.json).

| Export | Verified dimensions | Verified bytes |
| --- | --- | --- |
| [Production icon](exports/fluffboost-production-icon.png) | 1024 x 1024 | 1,283,544 |
| [Production banner](exports/fluffboost-production-banner.png) | 2500 x 1000 | 1,900,686 |
| [Development icon](exports/fluffboost-dev-icon.png) | 1024 x 1024 | 1,299,642 |
| [Development banner](exports/fluffboost-dev-banner.png) | 2500 x 1000 | 1,837,472 |
| [Staging icon](exports/fluffboost-staging-icon.png) | 1024 x 1024 | 1,194,602 |
| [Staging banner](exports/fluffboost-staging-banner.png) | 2500 x 1000 | 1,782,136 |
| [Premium paw](exports/fluffboost-premium-paw.png) | 250 x 250 | 101,916 |

The final export ZIP was downloaded from the same ChatGPT project. It contained exactly seven PNGs and two text manifests; no preview JPEG was included. Only those expected files were extracted after rejecting unsafe paths and checking ZIP integrity. The original ZIP and both upstream manifests remain preserved outside the repository.

Each PNG passed chunk CRC checks, decompression, exact dimensions, and source-manifest SHA-256 verification. All seven are static, 8-bit RGB PNGs tagged sRGB, each below 10 MB. Every final export was visually inspected: the wolf, paw, and correctly spelled `DEV` and `STAGING` labels are present. The icon corner treatments from the concepts remain opaque.

The ChatGPT manifest reports resizing the original illustrations, adding sky above the banners, moving the scenes down 65 pixels, trimming lower foreground, and rounding banner color channels by at most 1/255 to fit the complete ZIP. Those are upstream process descriptions; our local checks verify the delivered files. No local pixel edits or resizing were performed.

The metadata cleaner was run on the exports. They already contained no C2PA or AI metadata recognized by the inspector, so the repository copies remain byte-identical to the extracted PNGs. The portable manifest explicitly discloses ChatGPT generation; cleaning does not change that provenance.

## Original concepts

These larger concept files are retained for reference. Use the exact-size exports above for upload preparation.

All files are PNGs. Dimensions below were read from the downloaded files and remain unchanged in these copies.

| Concept | Exact dimensions | Visible details | Review note |
| --- | --- | --- | --- |
| [Production icon](concepts/production-icon-concept.png) | 1254 x 1254 | Wolf portrait, sunrise background, no text | Square artwork fills the image. |
| [Production banner](concepts/production-banner-concept.png) | 1983 x 793 | Wolf at left, sunrise and mountains, no text | Approximately 2.50:1; not an exact final-size export. |
| [Development icon](concepts/development-icon-concept.png) | 1254 x 1254 | Cyan code accents and `DEV` badge | Rounded artwork has opaque black corners. |
| [Development banner](concepts/development-banner-concept.png) | 1983 x 793 | Cyan code accents and `DEV` at right | Approximately 2.50:1; not an exact final-size export. |
| [Staging icon](concepts/staging-icon-concept.png) | 1254 x 1254 | Amber gear and `STAGING` badge | Rounded artwork has opaque white margins and corners. |
| [Staging banner](concepts/staging-banner-concept.png) | 1983 x 793 | Wolf at left, `STAGING` and gold paw at right | Approximately 2.50:1; not an exact final-size export. |
| [Premium paw](concepts/premium-paw-concept.png) | 1254 x 1254 | Fur-textured paw with a gold rim, sunrise background, no text | Not the 250 x 250 subscription image requested by the supplied Discord portal screenshot. |

None of these images has an alpha channel. The development icon's black corners and staging icon's white corners are part of the pixels, rather than transparent areas. Check them in Discord's circular icon crop before creating final exports.

## Original downloads

The original downloads remain untouched outside the repository. A separate byte-identical backup was also preserved outside the repository.

| Concept | Original download filename |
| --- | --- |
| Production icon | `ChatGPT Image Oct 3, 2026, 08_10_07 PM-1.png` |
| Production banner | `ChatGPT Image Oct 3, 2026, 08_10_08 PM-2.png` |
| Development icon | `ChatGPT Image Oct 3, 2026, 08_10_09 PM-3.png` |
| Development banner | `ChatGPT Image Oct 3, 2026, 08_10_10 PM-4.png` |
| Staging icon | `ChatGPT Image Oct 3, 2026, 08_10_10 PM-5.png` |
| Staging banner | `ChatGPT Image Oct 3, 2026, 08_10_11 PM-6.png` |
| Premium paw | `ChatGPT Image Oct 3, 2026, 08_10_12 PM-7.png` |

## Concept metadata verification

The `remove-ai-marks` metadata cleaner removed each PNG's `caBX` C2PA container from the repository copy. Verification found no remaining C2PA or AI metadata recognized by that inspector. This does not change the artwork's AI-generated provenance or establish the absence of a pixel watermark.

For all seven images, PNG dimensions, compressed image data, and every other PNG chunk are byte-identical to the originals. No pixels were edited, cropped, or resized.

SHA-256 checksums of the metadata-cleaned concept files:

```text
82c086930c8317d0d50d3508bab80df327245065c5da46f9aba903a6d7e62143  production-icon-concept.png
a0373f80f417db9d9ce0e5f48d157c982db184dbc125651461d6300cc207bc41  production-banner-concept.png
a600dc9aa744d9a7de86234667f638a58edb81e30b99b1ac2efd78f2675f3c82  development-icon-concept.png
3066c7638631d54fc5f893f6a4049276d19be3a2641a184f020feb8101b89376  development-banner-concept.png
d8f62a973da41730c00dee460a67444e422ae3b71941fba4fe60cb41de76f060  staging-icon-concept.png
fa114b1d4566e6a6238c26010e2fee9a4c1c53f752e9b4bb041b65d9a39c0f17  staging-banner-concept.png
e82d40445d011cee30a2cff953512a85d92c79fc358e1f43d2a3a93b4ae97f32  premium-paw-concept.png
```
