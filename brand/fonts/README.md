# Fonts

Place font files here if using self-hosted fonts. If using Google Fonts, this folder can remain empty — the font URL is configured in `theme.json`.

## If self-hosting:

Place `.woff2` files here (the only format needed for modern browsers):

- `heading-regular.woff2`
- `heading-bold.woff2`
- `body-regular.woff2`
- `body-medium.woff2`
- `body-semibold.woff2`
- `body-bold.woff2`

Name files to match their weight and family. Actual filenames will depend on which fonts Restore Britain uses.

## If using Google Fonts:

No files needed here. Update `theme.json` → `typography.googleFontsUrl` with the correct import URL and set `fontSource` to `"google-fonts"`.
