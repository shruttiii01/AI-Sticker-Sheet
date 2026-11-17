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
} from "./server/claude";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Map the original booth filter styles onto Claude sticker styles.
const BOOTH_STYLE_MAP: Record<string, string> = {
  "Flat cartoon": "Flat vector",
  Comic: "Comic pop",
  "Pixel art": "Chibi cartoon",
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
    const count = Math.min(12, Math.max(1, Number(req.body?.count) || 6));
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
      const { character } = await analyzePerson(image, { count: 1, vibe: "", name: "" });
      const svg = await drawSticker(
        image,
        character,
        {
          title: "Portrait",
          caption: "",
          pose_and_scene:
            "Head-and-shoulders portrait facing the viewer with a big friendly smile, filling the canvas, no props.",
        },
        asStyle(BOOTH_STYLE_MAP[String(req.body?.style)] ?? "Flat vector"),
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
      server: { middlewareMode: true },
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
