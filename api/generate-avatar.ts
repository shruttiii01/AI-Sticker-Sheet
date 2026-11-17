import {
  StickerError,
  analyzePerson,
  asStyle,
  drawSticker,
  parseImageDataUrl,
} from "../server/claude";

const BOOTH_STYLE_MAP: Record<string, string> = {
  "Flat cartoon": "Flat vector",
  Comic: "Comic pop",
  "Pixel art": "Chibi cartoon",
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
    const { character } = await analyzePerson(image, {
      count: 1,
      vibe: "",
      name: "",
    });
    const svg = await drawSticker(
      image,
      character,
      {
        title: "Portrait",
        caption: "",
        pose_and_scene:
          "Head-and-shoulders portrait facing the viewer with a big friendly smile, filling the canvas, no props.",
      },
      asStyle(BOOTH_STYLE_MAP[String(req.body?.style)] ?? "Flat vector")
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
