# AI Sticker Sheet – powered by Gemini

Snap a photo → Gemini studies the person and hand-draws a pack of personalised
stickers as vector art → print die-cut stickers sized for laptops, phones,
water bottles and notebooks.

## Live stage showcase

The app opens as a full-screen stage experience for live audiences:

- **Hub**: opening title sequence, live counters, two experiences
- **`1` · Sticker Studio**: 3-2-1 camera with flash → Gemini scans the photo and invents ideas → stickers flip in as Gemini draws them in parallel → confetti → print or send to the wall
- **`2` · Live Wall**: audience stickers fly in (opt-in), with live counts, Gemini draw times, favourite styles and themes, and rotating insights
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
./scripts/set-api-key.sh   # paste your Gemini key from aistudio.google.com/apikey (hidden input)
npm run dev                # http://localhost:3000
```

Optional `.env` settings: `GEMINI_SMALL_MODEL` (auto: newest flash-lite),
`GEMINI_MEDIUM_MODEL` (newest flash), `GEMINI_LARGE_MODEL` (newest pro),
`GEMINI_IMAGE_MODEL`, `STICKER_DRAW_WITH_PHOTO=1`.

**Cost controls:** analysis runs on the small model and only escalates if its JSON fails
validation; SVG drawing starts on the medium model and escalates to the large one only if the
SVG is broken/trivial; identical requests are served from an in-memory cache (with in-flight
de-duplication); static prompts are sent as `systemInstruction` so Gemini's implicit caching
applies; thinking is disabled/capped and output limits are tight; draw calls omit the photo
(the character sheet carries the likeness).

## How it works

1. **Analyze** (`POST /api/stickers/analyze`): Gemini (small model) reads the photo and returns a
   structured character sheet (hair, skin tone, glasses, outfit…) plus sticker ideas.
2. **Draw** (`POST /api/stickers/draw`): one call per sticker, run in parallel; Gemini
   returns an SVG that the server sanitises.
3. **Die-cut** (browser): the SVG is rasterised at print resolution, re-centred and
   wrapped in a white border with a grey cut line.
4. **Print**: stickers are shelf-packed onto A4 at real sizes – Laptop 70 mm, Phone
   40 mm, Bottle 55 mm, Notebook 30 mm or a Mixed pack – then printed (100% scale,
   margins None) or exported as 300 dpi PNGs.

The original booth flow (Booth / Exact Sticker / Paper Setup / Saved tabs) still
works; its "AI Avatar" button now uses Gemini too.

## Deploy on Vercel

1. Push this project to GitHub (or run `npx vercel --prod` from the project root).
2. In Vercel **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your Gemini API key (from https://aistudio.google.com/apikey)
   - Optional: `GEMINI_SMALL_MODEL`, `GEMINI_MEDIUM_MODEL`, `GEMINI_LARGE_MODEL`, `GEMINI_IMAGE_MODEL`
3. Vercel automatically uses `vercel.json` (`npm run build` → `dist/`) and serves `/api/health`, `/api/stickers/analyze`, `/api/stickers/draw`, and `/api/generate-avatar` as serverless functions with 60s timeouts.

