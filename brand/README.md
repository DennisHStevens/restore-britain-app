# /brand — Restore Britain Brand Assets

This folder is the single source of truth for all visual identity assets used across the platform. Every colour, font, and logo in the app derives from what's stored here.

## Status: SKELETON — awaiting official assets

All values in `theme.json` are placeholders (set to `#000000` or `PLACEHOLDER`). Once official Restore Britain brand assets are sourced, this folder will be populated and `theme.json` will be updated with real values.

## Structure

```
/brand
├── README.md           ← You are here
├── theme.json          ← All colours, typography, spacing, and PWA config
├── /logos
│   ├── README.md       ← Required logo files and formats
│   └── (logo files go here)
└── /fonts
    ├── README.md       ← Font hosting instructions
    └── (font files go here, if self-hosted)
```

## How it connects to the codebase

`theme.json` is imported into the frontend and used to generate:

1. **CSS custom properties** — `--color-primary`, `--color-secondary`, etc., available globally in all stylesheets.
2. **Tailwind config** (if using Tailwind) — the `extend.colors` and `extend.fontFamily` sections pull directly from this file.
3. **PWA manifest** — `themeColour` and `backgroundColour` feed into `manifest.json`.
4. **Map styling** — the `colours.map` section defines all map-specific colours for MapLibre GL.

This means changing a brand colour in `theme.json` propagates everywhere automatically. No hunting through CSS files.

## What we need from Restore Britain

To complete this folder, we need the following from the party:

- [ ] Logo files — highest resolution available, ideally SVG. At minimum: full logo and icon-only version.
- [ ] Official colour palette — exact hex codes for primary, secondary, and accent colours.
- [ ] Font names — which fonts they use for headings and body text, or font files if they're custom/licensed.
- [ ] Any existing brand guidelines document they may have.

## Rules

- **Never hardcode brand values in component files.** Always reference CSS custom properties or the theme config.
- **All logo files must be in this folder**, not scattered across the project.
- **When updating brand values**, update `theme.json` first, then verify the changes propagate correctly across the app.
