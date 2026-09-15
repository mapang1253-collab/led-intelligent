# Thai webfonts (self-hosted)

`docs/technology-stack.md` §6 requires Thai text to render from bundled fonts — no runtime CDN call.
These `.woff2` files are served from `/fonts/*` (Vite's `publicDir` points here, see
`apps/web/vite.config.ts`).

The matching `@font-face` declarations live in `apps/web/src/client/styles/fonts.css`, which
`global.css` imports. Adding a face means adding both the file here and the declaration there.

Currently bundled, all OFL-licensed and downloaded from Google Fonts:

| Family | Files | Notes |
|---|---|---|
| Anuphan | `anuphan-*.woff2` | Modern, geometric |
| IBM Plex Sans Thai | `ibm-plex-sans-thai-*.woff2` | Clean, institutional |
| Noto Sans Thai Looped | `noto-sans-thai-looped-*.woff2` | Looped Thai terminals |
| Noto Sans Thai | `noto-sans-thai-*.woff2` | Neutral baseline |

Each family ships one variable file per unicode subset (thai / latin / latin-ext, plus a couple of
extras), so weights 400–700 come from a single file per subset. Once the authors settle on one
family, delete the others and their declarations — they are only here to be compared on
`/design`.
