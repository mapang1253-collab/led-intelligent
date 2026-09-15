# Noto Sans Thai

Per `docs/technology-stack.md` §6, Thai text must render from a **bundled/self-hosted** font — no
Google Fonts CDN call at runtime. Add the Noto Sans Thai static `.woff2` files here (regular +
medium/semibold weights are usually enough) before the first real UI screen ships, then reference
them via `@font-face` in `apps/web/src/client/styles/global.css`.

Source: <https://fonts.google.com/noto/specimen/Noto+Sans+Thai> (OFL-licensed).
