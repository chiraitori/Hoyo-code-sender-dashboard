# HoYo Code Sender Dashboard (SvelteKit 3 // Inter-Knot Edition)

Zenless Zone Zero–styled web dashboard for **HoYo Code Sender**, built with **SvelteKit 3 + Svelte 5 + Tailwind CSS v4** and deployed on **Vercel** with an HMAC-SHA256 signed bridge to the VPS Discord bot.

## Features

- **Inter-Knot / Random Play UI**: Clean-slate ZZZ hardware aesthetic (carbon CRT dot-grid, Acid Volt `#D8FF00` + Bangboo Orange `#FF5D1F`, slanted kinetic pills, Random Play tape selectors).
- **Zero-Bloat Performance**: No Three.js, GSAP, or WebGL runtime; fast SvelteKit SSR + `@sveltejs/adapter-vercel`.
- **Signed Vercel ↔ VPS Bridge**: Every protected API call signs `METHOD + PATH + TIMESTAMP + NONCE + SHA256(BODY)` with `AUTH_BOT_SECRET` (plus optional `VPS_EDGE_SECRET`) and loads/saves server settings in **1 round trip** via `/api/server/:id/snapshot`.
- **Live Discord Embed Preview**: Real-time preview of target channel/thread, role mentions, and localized embed text (`en` / `jp` / `vi`) driven by Svelte 5 `$derived`.

## Environment Variables (Vercel)

Copy `.env.example` to `.env` for local development or configure in Vercel Project Settings:

- `MAIN_BOT_API_URL` *(server-only)*: HTTPS URL to your VPS bot (behind Zoraxy / Cloudflare).
- `AUTH_BOT_SECRET` *(server-only)*: 64-char hex secret matching the VPS bot.
- `VPS_EDGE_SECRET` *(server-only, optional)*: Shared edge header secret (`X-Edge-Secret`) if enabled on VPS.
- `DISCORD_CLIENT_SECRET` *(server-only)*: Discord OAuth2 client secret.
- `PUBLIC_DISCORD_CLIENT_ID` *(or legacy `NEXT_PUBLIC_DISCORD_CLIENT_ID`)*: Discord application ID.
- `PUBLIC_APP_URL` *(or legacy `NEXT_PUBLIC_APP_URL`)*: Deployed dashboard origin (e.g. `https://your-dash.vercel.app`).

## Scripts

```bash
npm run dev          # Local dev server (http://localhost:5173)
npm run check        # svelte-check TypeScript & template verification
npm run build        # Production Vercel build
npm test             # Unit tests (HMAC bridge, secret redaction, code normalization)
npm run test:privacy # Verifies zero secrets or source maps leak into browser assets
```
