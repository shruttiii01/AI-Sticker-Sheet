import { hasCredentials, MODEL } from "../server/claude.js";

interface ApiReq {
  method?: string;
}
interface ApiRes {
  status: (code: number) => ApiRes;
  json: (data: unknown) => void;
}

export default function handler(_req: ApiReq, res: ApiRes) {
  res.status(200).json({ ok: true, hasApiKey: hasCredentials(), model: MODEL });
}
