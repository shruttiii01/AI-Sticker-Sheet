import express from "express";
import type { Request, Response } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_STYLES = ["Flat cartoon", "Comic", "Pixel art"] as const;
type StickerStyle = (typeof ALLOWED_STYLES)[number];

interface AvatarRequestBody {
  imageDataUrl?: string;
  style?: string;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function parseDataUrl(dataUrl: string): { mimeType: string; base64Data: string } | null {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1],
    base64Data: match[2],
  };
}

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: "12mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    const hasKey = Boolean(
      process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "MY_GEMINI_API_KEY"
    );
    res.json({ ok: true, hasApiKey: hasKey });
  });

  app.post("/api/generate-avatar", async (req: Request, res: Response) => {
    const body = req.body as AvatarRequestBody;
    const imageDataUrl = body?.imageDataUrl;
    const requestedStyle = body?.style;

    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      res.status(400).json({ error: "Missing captured photo data." });
      return;
    }

    const parsed = parseDataUrl(imageDataUrl);
    if (!parsed) {
      res.status(400).json({ error: "Invalid image format. Expected a base64 data URL." });
      return;
    }

    const style: StickerStyle = ALLOWED_STYLES.includes(requestedStyle as StickerStyle)
      ? (requestedStyle as StickerStyle)
      : "Flat cartoon";

    const ai = getGeminiClient();
    if (!ai) {
      res.status(402).json({
        error:
          "AI avatar generation requires a billing-enabled Gemini API key in Settings > Secrets. Using visitor photo as-is.",
        paidKeyRequired: true,
      });
      return;
    }

    const prompt = `Create a friendly flat cartoon sticker avatar of the person in this photo, head and shoulders, big smile, clean bold outlines, simple shading, plain white background, no text, no logos. Keep their hairstyle, glasses and clothing colours recognisable. Flattering and kind. Do not exaggerate or change facial features, skin tone or body shape. Style: ${style}. Do not imitate any film studio, cartoon brand or artist.`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-image",
        contents: {
          parts: [
            {
              inlineData: {
                data: parsed.base64Data,
                mimeType: parsed.mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
          },
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          const mime = part.inlineData.mimeType ?? "image/png";
          res.json({
            avatarDataUrl: `data:${mime};base64,${part.inlineData.data}`,
          });
          return;
        }
      }

      res.status(502).json({
        error: "No avatar image was returned by the model. Using visitor photo as-is.",
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const isQuotaOrBilling =
        message.includes("429") ||
        message.includes("403") ||
        message.includes("RESOURCE_EXHAUSTED") ||
        message.includes("PERMISSION_DENIED") ||
        message.toLowerCase().includes("billing") ||
        message.toLowerCase().includes("quota");

      res.status(isQuotaOrBilling ? 402 : 500).json({
        error: isQuotaOrBilling
          ? "AI avatar generation requires a paid Gemini API key (free-tier quota cannot run image generation). Using visitor photo as-is."
          : `Avatar generation failed (${message}). Using visitor photo as-is.`,
        paidKeyRequired: isQuotaOrBilling,
      });
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
