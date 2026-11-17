import {
  StickerError,
  analyzePerson,
  parseImageDataUrl,
} from "../../server/claude";

interface ApiReq {
  method?: string;
  body?: {
    imageDataUrl?: unknown;
    count?: unknown;
    vibe?: unknown;
    name?: unknown;
    includeFestival?: unknown;
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
    res.status(400).json({
      error: "Missing or invalid photo (expected a base64 image data URL).",
    });
    return;
  }

  const count = Math.min(12, Math.max(1, Number(req.body?.count) || 6));
  try {
    const result = await analyzePerson(image, {
      count,
      vibe: String(req.body?.vibe ?? "").slice(0, 200),
      name: String(req.body?.name ?? "").slice(0, 40),
      includeFestival: Boolean(req.body?.includeFestival),
    });
    res.status(200).json(result);
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
