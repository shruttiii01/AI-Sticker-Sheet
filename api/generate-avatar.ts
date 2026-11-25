import {
  StickerError,
  analyzePerson,
  asStyle,
  drawSticker,
  parseImageDataUrl,
} from "../server/ai.js";

const BOOTH_STYLE_MAP: Record<string, string> = {
  "Flat cartoon": "Cute caricature",
  Comic: "Comic pop",
  "Pixel art": "Chibi cartoon",
  "3D anime": "3D anime",
  "Retro style": "Retro style",
};

interface ApiReq {
  method?: string;
  body?: {
    imageDataUrl?: unknown;
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
  if (!image) {
    res.status(400).json({ error: "Missing captured photo data." });
    return;
  }

  try {
    const { character, ideas } = await analyzePerson(image, {
      count: 1,
      vibe: "",
      name: "",
    });
    const svg = await drawSticker(
      image,
      character,
      ideas[0] ?? {
        title: "Caricature Portrait",
        caption: "#CoolVibes",
        pose_and_scene:
          "Centred half-body cute cartoon caricature facing the viewer with a bright, slightly exaggerated cheerful expression.",
      },
      asStyle(BOOTH_STYLE_MAP[String(req.body?.style)] ?? "Cute caricature")
    );
    res.status(200).json({
      avatarDataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    });
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
