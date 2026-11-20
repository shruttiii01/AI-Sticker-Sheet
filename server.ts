import express from "express";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import {
  StickerError,
  analyzePerson,
  asStyle,
  drawSticker,
  hasCredentials,
  MODEL,
  parseImageDataUrl,
  type CharacterSheet,
  type StickerIdea,
  MAX_STICKERS,
} from "./server/claude";
import { registerShowcaseRoutes } from "./server/showcase";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map the original booth filter styles onto Claude sticker styles.
const BOOTH_STYLE_MAP: Record<string, string> = {
  "Flat cartoon": "Cute caricature",
  Comic: "Comic pop",
  "Pixel art": "Chibi cartoon",
  "3D anime": "3D anime",
  "Retro style": "Retro style",
};

function sendError(res: Response, err: unknown) {
  if (err instanceof StickerError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "12mb" }));

  // Live Sticker Showcase: tracked sticker routes, insights wall, live wall, backup pack.
  // Registered first so its /api/stickers/* handlers (which also record insights) take precedence.
  registerShowcaseRoutes(app);

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true, hasApiKey: hasCredentials(), model: MODEL });
  });

  // Step 1: Claude studies the photo -> character sheet + sticker ideas.
  app.post("/api/stickers/analyze", async (req: Request, res: Response) => {
    const image = parseImageDataUrl(req.body?.imageDataUrl);
    if (!image) {
      res.status(400).json({ error: "Missing or invalid photo (expected a base64 image data URL)." });
      return;
    }
    const count = Math.min(MAX_STICKERS, Math.max(1, Number(req.body?.count) || MAX_STICKERS));
    try {
      const result = await analyzePerson(image, {
        count,
        vibe: String(req.body?.vibe ?? "").slice(0, 200),
        name: String(req.body?.name ?? "").slice(0, 40),
      });
      res.json(result);
    } catch (err) {
      sendError(res, err);
    }
  });

  // Step 2: Claude draws one sticker as SVG (client calls this in parallel).
  app.post("/api/stickers/draw", async (req: Request, res: Response) => {
    const image = parseImageDataUrl(req.body?.imageDataUrl);
    const character = req.body?.character as CharacterSheet | undefined;
    const idea = req.body?.idea as StickerIdea | undefined;
    if (!character || !idea?.title) {
      res.status(400).json({ error: "Missing character sheet or sticker idea." });
      return;
    }
    try {
      const svg = await drawSticker(image, character, idea, asStyle(req.body?.style));
      res.json({ svg });
    } catch (err) {
      sendError(res, err);
    }
  });

  // Booth "AI Avatar" button: one Claude-drawn portrait sticker.
  app.post("/api/generate-avatar", async (req: Request, res: Response) => {
    const image = parseImageDataUrl(req.body?.imageDataUrl);
    if (!image) {
      res.status(400).json({ error: "Missing captured photo data." });
      return;
    }
    try {
      const { character, ideas } = await analyzePerson(image, { count: 1, vibe: "", name: "" });
      const svg = await drawSticker(
        image,
        character,
        ideas[0] ?? {
          title: "Caricature Portrait",
          caption: "#CoolVibes",
          pose_and_scene:
            "Centred half-body cute cartoon caricature facing the viewer with a bright, slightly exaggerated cheerful expression.",
        },
        asStyle(BOOTH_STYLE_MAP[String(req.body?.style)] ?? "Cute caricature"),
      );
      res.json({
        avatarDataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
      });
    } catch (err) {
      sendError(res, err);
    }
  });

  const isProd = process.env.NODE_ENV === "production";
  const distDir = path.resolve(__dirname, "dist");

  if (!isProd || !fs.existsSync(distDir)) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: { port: Number(process.env.HMR_PORT) || 24700 } },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get("/{*splat}", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(port, "0.0.0.0", () => {
    console.log(`AI Sticker Sheet booth server running at http://localhost:${port}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
