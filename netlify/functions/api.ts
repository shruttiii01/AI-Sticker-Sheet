import health from "../../api/health.js";
import showcaseHealth from "../../api/showcase/health.js";
import analyze from "../../api/stickers/analyze.js";
import draw from "../../api/stickers/draw.js";
import paint from "../../api/stickers/paint.js";
import avatar from "../../api/generate-avatar.js";
import { replaceWallImage, deleteWall, archiveDelete, archiveImage, archiveList, archivePost, getInsights, getWall, postWall, recordAnalyze, recordDraw, recordError, resetAll } from "../wall-store.js";

/**
 * Netlify adapter: serves the existing Vercel-style handlers in /api behind /api/*,
 * so the same code deploys on either host.
 */
type Handler = (req: any, res: any) => unknown;
const routes: Record<string, Handler> = {
  "/health": health,
  "/showcase/health": showcaseHealth,
  "/stickers/analyze": analyze,
  "/stickers/draw": draw,
  "/stickers/paint": paint,
  "/generate-avatar": avatar,
};

export default async (request: Request): Promise<Response> => {
  const route = new URL(request.url).pathname.replace(/^\/api/, "").replace(/\/$/, "");
  const url = new URL(request.url);

  // Live wall + insights (Netlify Blobs)
  try {
    if (route === "/wall" && request.method === "POST") {
      const id = await postWall(await request.json().catch(() => ({})));
      return id ? Response.json({ ok: true, id }) : Response.json({ error: "Invalid sticker image." }, { status: 400 });
    }
    if (route === "/wall" && request.method === "PUT") {
      const b = (await request.json().catch(() => ({}))) as { id?: string; img?: string };
      const ok = await replaceWallImage(String(b.id ?? "").replace(/[^a-z0-9]/gi, ""), String(b.img ?? ""));
      return ok ? Response.json({ ok: true }) : Response.json({ error: "Not found or invalid image." }, { status: 400 });
    }
    if (route === "/wall" && request.method === "DELETE") {
      return Response.json({ ok: true, removed: await deleteWall(url.searchParams.get("pack") ?? "", url.searchParams.get("id") ?? undefined) });
    }
    if (route === "/wall") return Response.json({ items: await getWall(Number(url.searchParams.get("since")) || 0) });
    if (route === "/insights") return Response.json(await getInsights());
    if (route === "/insights/reset" && request.method === "POST") { await resetAll(); return Response.json({ ok: true }); }
    // Sticker archive: every sticker at print quality, for printing later
    if (route === "/archive" && request.method === "POST") {
      const id = await archivePost(await request.json().catch(() => ({})));
      return id ? Response.json({ ok: true, id }) : Response.json({ error: "Invalid sticker image." }, { status: 400 });
    }
    if (route === "/archive" && request.method === "DELETE") {
      const removed = await archiveDelete(url.searchParams.get("pack") ?? "", url.searchParams.get("id") ?? undefined);
      return Response.json({ ok: true, removed });
    }
    if (route === "/archive") return Response.json({ items: await archiveList(600, url.searchParams.get("pack") ?? undefined) });
    if (route === "/archive/img") return archiveImage(url.searchParams.get("id") ?? "", url.searchParams.get("v") === "full" ? "full" : "thumb");
  } catch (e) {
    console.error(e);
    return Response.json({ error: "Wall unavailable" }, { status: 500 });
  }

  const handler = routes[route];
  if (!handler) return Response.json({ error: "Not found" }, { status: 404 });

  const body = request.method === "POST" ? await request.json().catch(() => ({})) : undefined;
  let status = 200;
  let result: Response | null = null;
  const res = {
    status(code: number) {
      status = code;
      return res;
    },
    json(data: unknown) {
      result = Response.json(data, { status });
    },
  };
  const t0 = Date.now();
  await handler({ method: request.method, body }, res);
  const ms = Date.now() - t0;
  const ok = status < 400;
  if (request.method === "POST") {
    if (route === "/stickers/analyze") await (ok ? recordAnalyze(ms, String(body?.style ?? ""), String(body?.vibe ?? "")) : recordError());
    else if (route === "/stickers/draw" || route === "/stickers/paint")
      await (ok ? recordDraw(route.endsWith("paint") ? "Gemini" : "Claude", ms, body?.idea, String(body?.style ?? "")) : recordError());
  }
  return result ?? Response.json({ error: "No response" }, { status: 500 });
};

export const config = { path: "/api/*" };
