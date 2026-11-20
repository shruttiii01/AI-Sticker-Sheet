import { hasCredentials, MODEL } from "../../server/claude.js";
import { getImageModel, hasGemini } from "../../server/gemini.js";

// Vercel function: which AI engines this deployment can use.
// (Live insights, the sticker wall and the backup pack need the local server and are skipped on Vercel.)
interface ApiRes {
  status: (code: number) => ApiRes;
  json: (data: unknown) => void;
}

export default async function handler(_req: unknown, res: ApiRes) {
  const gemini = hasGemini();
  res.status(200).json({
    ok: true,
    claude: hasCredentials(),
    model: MODEL,
    gemini,
    geminiModel: gemini ? await getImageModel() : null,
    backupStickers: 0,
  });
}
