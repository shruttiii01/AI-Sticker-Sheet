# AI Sticker Sheet – powered by Claude

Snap a photo → Claude studies the person and hand-draws a pack of personalised
stickers as vector art → print die-cut stickers sized for laptops, phones,
water bottles and notebooks.

## Live stage showcase

The app opens as a full-screen stage experience for live audiences:

- **Hub**: opening title sequence, live counters, two experiences
- **`1` · Sticker Studio**: 3-2-1 camera with flash → Claude scans the photo and invents ideas → stickers flip in as Claude draws them in parallel → confetti → print or send to the wall
- **`2` · Live Wall**: audience stickers fly in (opt-in), with live counts, Claude draw times, favourite styles and themes, and rotating insights
- **Classic booth & paper tools**: the original booth, exact-sticker and paper-setup screens (link on the hub, `#/booth`)

```bash
npm run showcase           # production build, no live reload: use this on stage
```

Presenter keys: `H` home · `1` studio · `2` wall · `F` fullscreen · `O` replay titles · in the studio: `Space` snap, `P` print, `N` next person, `B` backup pack.

**Stage runbook**
1. Rehearse one real sticker run before doors open. Every successful drawing is saved as the **backup pack** (`data/`, git-ignored). If the venue network fails, press `B` on the studio setup screen to replay it with the same animations.
2. Reset the live numbers before the audience arrives: the ⟲ button on the Live Wall (the backup pack is kept).
3. Use Chrome on the presenting laptop (the camera needs a real browser), fullscreen with `F`.

Live insights, the wall and the backup pack are served by `server.ts` (`server/showcase.ts`). On the Vercel deployment only the sticker API exists, so those extras are quietly skipped there.

## Run it

```bash
npm install
./scripts/set-api-key.sh   # paste an sk-ant-api03-… key from platform.claude.com (hidden input)
npm run dev                # http://localhost:3000
```

Optional `.env` settings: `STICKER_MODEL` (default `claude-opus-5-5`),
`STICKER_EFFORT` (`low` = faster/cheaper, `medium` default, `high` = more detail).

## How it works

1. **Analyze** (`POST /api/stickers/analyze`): Claude reads the photo and returns a
   structured character sheet (hair, skin tone, glasses, outfit…) plus sticker ideas.
2. **Draw** (`POST /api/stickers/draw`): one call per sticker, run in parallel; Claude
   returns an SVG that the server sanitises.
3. **Die-cut** (browser): the SVG is rasterised at print resolution, re-centred and
   wrapped in a white border with a grey cut line.
4. **Print**: stickers are shelf-packed onto A4 at real sizes – Laptop 70 mm, Phone
   40 mm, Bottle 55 mm, Notebook 30 mm or a Mixed pack – then printed (100% scale,
   margins None) or exported as 300 dpi PNGs.

The original booth flow (Booth / Exact Sticker / Paper Setup / Saved tabs) still
works; its "AI Avatar" button now uses Claude too.

## Deploy on Vercel

1. Push this project to GitHub (or run `npx vercel --prod` from the project root).
2. In Vercel **Project Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your Anthropic API key (`sk-ant-...`)
   - Optional: `STICKER_MODEL` (default `claude-opus-5-5`) and `STICKER_EFFORT` (`low` / `medium` / `high`)
3. Vercel automatically uses `vercel.json` (`npm run build` → `dist/`) and serves `/api/health`, `/api/stickers/analyze`, `/api/stickers/draw`, and `/api/generate-avatar` as serverless functions with 60s timeouts.

