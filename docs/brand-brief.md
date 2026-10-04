# FluffBoost brand and artwork brief

## Purpose

FluffBoost gives Discord communities a gentle ritual of encouragement. The tone
is warm, friendly, and furry-aware, without baby talk or pressure to be positive.
Primary audience: furry community server owners and members. The bot welcomes
other communities too.

## Existing identity

Use the real `banner.jpg` in the repository as the visual reference. It shows a
gray and cream wolf with golden eyes and a warm sunrise behind it. Preserve the
recognizable face, ears, fur pattern, and calm expression. Do not substitute
MrDemonWolf's separate blue-wolf fursona for this project mascot.

The website uses Fraunces display type, Nunito body type, and a warm woodland
palette: paper `#fbf4e9`, ink `#2b1e12`, honey `#e07c05`, berry `#b4194a`, pine
`#0e6e56`. Use those project colors as guidance. Core MrDemonWolf navy `#091533`
can anchor environment labels if it improves legibility.

## Artwork set

- **Production icon:** a clear portrait based on the existing wolf; face readable
  in a small circular crop, with generous edge clearance.
- **Production banner:** the same wolf and sunrise world in a wide composition;
  keep important anatomy clear of crops. Avoid baked-in feature promises or price.
- **Development icon/banner:** same recognizable mascot with a highly visible
  `DEV` label and a distinct teal treatment. Label must work without color cues.
- **Staging icon/banner:** same mascot with a highly visible `STAGING` label and
  amber treatment, distinct from both production and development.
- **Premium SKU icon:** a warm paw print with a simple sunrise or small time
  accent; readable as a square at 250 by 250 pixels. The screenshot specifies
  PNG/JPG/GIF, 1:1 aspect ratio, and at most 10 MB.

Confirm each destination's current upload dimensions in the Developer Portal
before exporting final files. Prepare high-resolution working masters and clean
PNG exports. Check icons at 32, 64, and 128 pixels and in circular crops.

## Suggested ChatGPT project instructions

```text
You are the creative partner for FluffBoost, an open-source Discord motivation bot operated by MrDemonWolf, Inc.

Use the supplied current FluffBoost banner/icon as the visual source of truth. Preserve its gray-and-cream wolf, golden eyes, fur pattern, and friendly expression. Evolve the existing identity rather than inventing another mascot. Keep this project separate from MrDemonWolf's blue-wolf personal fursona.

Create a coherent set of production, development, and staging icons and banners, plus a Premium SKU paw icon. Production feels warm and welcoming. Development uses a readable DEV label. Staging uses a readable STAGING label. Environment labels must remain understandable without color and at small sizes.

Use a cozy woodland sunrise direction with warm paper, honey, berry, and pine colors. Keep shapes clear, anatomy consistent, and the face recognizable in a circular icon crop. Avoid crowded details, tiny lettering, stock gradients, and unrelated emblems. Do not add pricing or unimplemented feature claims to artwork.

FluffBoost's free features are daily quotes at 8:00 AM America/Chicago, instant /quote requests, and quote suggestions reviewed by the bot team for a shared library. Premium adds custom delivery time, timezone, and daily/weekly/monthly frequency for one server. Do not claim priority delivery, exclusive quotes, or a private per-server library.

When editing artwork, preserve originals and deliver separately named assets. Confirm the current Discord upload dimensions before producing final exports. Provide transparent backgrounds when requested. Present the resulting images for visual review, with a concise explanation of what changed.
```

## Delivery status

The [FluffBoost ChatGPT project conversation](https://chatgpt.com/g/g-p-6ac1a1b717b88191b7cbf5b09b9edb2c-fluffboost/c/6ac1a553-2398-83e9-a3b0-d2ed4f2028a9)
produced all seven concepts and a separate export ZIP. The downloaded exports
were inspected locally: production/development/staging icons are 1024 by 1024,
banners are 2500 by 1000, and the Premium paw is 250 by 250. All PNGs passed
integrity and checksum checks and are individually below 10 MB.

See [the brand asset inventory](../assets/brand/README.md) for the concepts,
exact-size exports, checksums, and portable download. AI provenance is recorded
in its manifest. Original downloads and the source ZIP remain preserved outside
the repository; no local resizing or pixel edits were performed.

The development icon retains opaque black corners and the staging icon retains
opaque white corners. Live Discord crops and small-size label readability still
need checking for the environment bots. The production bot avatar and Premium
paw have been uploaded and saved in Discord. The Remotion workspace in
`apps/motion` supplies reproducible animations, with committed
PNG, MP4 and GIF exports in `assets/brand/animated`. Discord's Bot banner field
was verified as **680 by 240 (17:6)**. Animated banners use a separate background-only
cloudless landscape image. Remotion adds separate moving clouds, a simple sun
and lake shimmer, with stationary mountains and no
wolf, logo or lettering. The earlier portrait banners remain preserved as masters.
The final image-generated wolf and paw use simpler shapes with fewer details.
Icons retain their environment labels, with one orbiting glint. Banners loop
over 32 seconds; icons loop over eight seconds.
MP4 exports are for marketing, and PNG/GIF exports are for Discord. The Alpha
application is the staging target, as confirmed by Nathanial.
