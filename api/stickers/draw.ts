import {
  StickerError,
  asStyle,
  drawSticker,
  parseImageDataUrl,
  type CharacterSheet,
  type StickerIdea,
} from "../../server/claude.js";

interface ApiReq {
  method?: string;
  body?: {
    imageDataUrl?: unknown;
    character?: CharacterSheet;
    idea?: StickerIdea;
    style?: unknown;
  };
}
interface ApiRes {
  status: (code: number) => ApiRes;
  json: (data: unknown) => void;
}

export default async function handler(req: ApiReq, res: ApiRes) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const image = parseImageDataUrl(req.body?.imageDataUrl);
  const character = req.body?.character;
  const idea = req.body?.idea;
  if (!character || !idea?.title) {
    res.status(400).json({ error: "Missing character sheet or sticker idea." });
    return;
  }

  try {
    const svg = await drawSticker(
      image,
      character,
      idea,
      asStyle(req.body?.style)
    );
    res.status(200).json({ svg });
  } catch (err) {
    if (err instanceof StickerError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    console.error(err);
    res
      .status(500)
      .json({ error: err instanceof Error ? err.message : String(err) });
  }
}
