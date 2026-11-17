# AI Sticker Sheet – powered by Claude

Snap a photo → Claude studies the person and hand-draws a pack of personalised
stickers as vector art → print die-cut stickers sized for laptops, phones,
water bottles and notebooks.

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

