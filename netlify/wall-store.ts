import { getStore } from "@netlify/blobs";

/**
 * Live wall + insights for the Netlify deploy (the Express dev server keeps them in data/*.json).
 * Wall stickers are one blob each (no write races); insights are a single small JSON doc.
 */
const wallStore = () => getStore({ name: "sticker-wall", consistency: "strong" });
const statStore = () => getStore({ name: "sticker-insights", consistency: "strong" });

const MAX_WALL = 60;
type Tally = Record<string, number>;
interface Stats {
  startedAt: number;
  counters: { stickerSessions: number; stickersDrawn: number; stickerErrors: number; wallPosts: number };
  styles: Tally;
  vibes: Tally;
  captions: { caption: string; title: string; style: string; at: number }[];
  drawMs: number[];
  analyzeMs: number[];
  activity: number[];
  engines: Tally;
  engineMs: Record<string, number[]>;
}
const fresh = (): Stats => ({
  startedAt: Date.now(),
  counters: { stickerSessions: 0, stickersDrawn: 0, stickerErrors: 0, wallPosts: 0 },
  styles: {}, vibes: {}, captions: [], drawMs: [], analyzeMs: [], activity: [], engines: {}, engineMs: {},
});
const push = <T,>(a: T[], x: T, max: number) => { a.unshift(x); if (a.length > max) a.length = max; };
const bump = (t: Tally, k?: string) => { const key = (k || "").trim().slice(0, 60); if (key) t[key] = (t[key] || 0) + 1; };
const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);

async function readStats(): Promise<Stats> {
  try {
    const s = (await statStore().get("stats", { type: "json" })) as Partial<Stats> | null;
    return { ...fresh(), ...(s ?? {}) };
  } catch { return fresh(); }
}
export async function updateStats(fn: (s: Stats) => void) {
  try {
    const s = await readStats();
    fn(s);
    s.activity.push(Date.now());
    if (s.activity.length > 600) s.activity.splice(0, s.activity.length - 600);
    await statStore().setJSON("stats", s);
  } catch (e) { console.error("stats", e); }
}
export const recordAnalyze = (ms: number, style: string, vibe: string) =>
  updateStats((s) => { push(s.analyzeMs, ms, 60); s.counters.stickerSessions++; bump(s.styles, style); bump(s.vibes, vibe); });
export const recordDraw = (engine: string, ms: number, idea: any, style: string) =>
  updateStats((s) => {
    push(s.drawMs, ms, 80); s.counters.stickersDrawn++; bump(s.engines, engine);
    push((s.engineMs[engine] ??= []), ms, 60);
    push(s.captions, { caption: String(idea?.caption ?? ""), title: String(idea?.title ?? ""), style, at: Date.now() }, 40);
  });
export const recordError = () => updateStats((s) => { s.counters.stickerErrors++; });

export async function postWall(body: any) {
  const img = String(body?.img ?? "");
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(img) || img.length > 400_000) return null;
  const at = Date.now();
  const id = Math.random().toString(36).slice(2, 10);
  const item = {
    id, img, at,
    caption: String(body?.caption ?? "").slice(0, 40),
    name: String(body?.name ?? "").slice(0, 30),
    style: String(body?.style ?? "").slice(0, 30),
    packId: String(body?.packId ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 24),
  };
  const store = wallStore();
  await store.setJSON(`w-${String(at).padStart(14, "0")}-${id}`, item);
  await updateStats((s) => { s.counters.wallPosts++; });
  // trim old items
  try {
    const { blobs } = await store.list({ prefix: "w-" });
    const old = blobs.map((b) => b.key).sort().slice(0, Math.max(0, blobs.length - MAX_WALL));
    await Promise.all(old.map((k) => store.delete(k)));
  } catch { /* best effort */ }
  return id;
}

/** Replace one wall sticker's image (used to re-stamp old stickers with the current badge). */
export async function replaceWallImage(id: string, img: string) {
  if (!/^data:image\/(png|jpeg|webp);base64,/.test(img) || img.length > 400_000) return false;
  const store = wallStore();
  const { blobs } = await store.list({ prefix: "w-" });
  const key = blobs.map((b) => b.key).find((k) => k.endsWith(`-${id}`));
  if (!key) return false;
  const item = (await store.get(key, { type: "json" })) as Record<string, unknown> | null;
  if (!item) return false;
  await store.setJSON(key, { ...item, img });
  return true;
}

export async function getWall(since: number) {
  const store = wallStore();
  const { blobs } = await store.list({ prefix: "w-" });
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, MAX_WALL)
    .filter((k) => Number(k.split("-")[1]) > since);
  const items = (await Promise.all(keys.map((k) => store.get(k, { type: "json" }).catch(() => null)))).filter(Boolean) as any[];
  return items.filter((i) => i.at > since);
}

/** Remove a pack's stickers (or one sticker by id) from the public wall. The print archive is untouched. */
export async function deleteWall(packId: string, id?: string) {
  const store = wallStore();
  const { blobs } = await store.list({ prefix: "w-" });
  const p = packId.replace(/[^a-z0-9]/gi, "");
  let removed = 0;
  await Promise.all(
    blobs.map(async (b) => {
      if (id && b.key.endsWith(`-${id}`)) { await store.delete(b.key); removed++; return; }
      if (!p) return;
      const item = (await store.get(b.key, { type: "json" }).catch(() => null)) as { packId?: string } | null;
      if (item?.packId === p) { await store.delete(b.key); removed++; }
    }),
  );
  return removed;
}

export async function getInsights() {
  const s = await readStats();
  const now = Date.now();
  const perMinute = Array.from({ length: 30 }, (_, i) => {
    const end = now - (29 - i) * 60_000;
    return s.activity.filter((t) => t > end - 60_000 && t <= end).length;
  });
  let wallCount = 0;
  try { wallCount = (await wallStore().list({ prefix: "w-" })).blobs.length; } catch { /* ignore */ }
  return {
    ...s,
    drawMedianMs: median(s.drawMs),
    engineMedianMs: Object.fromEntries(Object.entries(s.engineMs).map(([k, v]) => [k, median(v)])),
    analyzeMedianMs: median(s.analyzeMs),
    perMinute, wallCount, now,
  };
}

export async function resetAll() {
  await statStore().setJSON("stats", fresh());
  const store = wallStore();
  const { blobs } = await store.list({ prefix: "w-" });
  await Promise.all(blobs.map((b) => store.delete(b.key)));
}

/* ---------------- Sticker archive (every sticker, print quality, kept for printing later) ---------------- */
const archiveStore = () => getStore({ name: "sticker-archive", consistency: "strong" });
const IMG_RE = /^data:image\/(png|jpeg|webp);base64,/;

export interface ArchiveMeta {
  id: string;
  packId: string;
  packAt: number;
  at: number;
  name: string;
  caption: string;
  style: string;
}

const clean = (v: unknown, n: number) => String(v ?? "").slice(0, n);
const safeId = (v: unknown) => String(v ?? "").replace(/[^a-z0-9]/gi, "").slice(0, 24);

/** Store one sticker: print-quality image + thumbnail + metadata. */
export async function archivePost(body: any): Promise<string | null> {
  const full = String(body?.full ?? "");
  const thumb = String(body?.thumb ?? "");
  if (!IMG_RE.test(full) || full.length > 4_500_000 || !IMG_RE.test(thumb) || thumb.length > 400_000) return null;
  const packId = safeId(body?.packId) || Math.random().toString(36).slice(2, 10);
  const packAt = Number(body?.packAt) || Date.now();
  const id = Math.random().toString(36).slice(2, 10);
  const meta: ArchiveMeta = {
    id, packId, packAt, at: Date.now(),
    name: clean(body?.name, 30), caption: clean(body?.caption, 40), style: clean(body?.style, 30),
  };
  const store = archiveStore();
  await Promise.all([
    store.set(`i-${id}-full`, full),
    store.set(`i-${id}-thumb`, thumb),
  ]);
  await store.setJSON(`m-${String(packAt).padStart(14, "0")}-${packId}-${id}`, meta);
  return id;
}

/** Newest first, up to `limit` stickers. */
export async function archiveList(limit = 600, pack?: string): Promise<ArchiveMeta[]> {
  const store = archiveStore();
  const { blobs } = await store.list({ prefix: "m-" });
  const p = pack ? safeId(pack) : "";
  const keys = blobs.map((b) => b.key).filter((k) => !p || k.includes(`-${p}-`)).sort().reverse().slice(0, limit);
  const metas = await Promise.all(keys.map((k) => store.get(k, { type: "json" }).catch(() => null)));
  return (metas.filter(Boolean) as ArchiveMeta[]).sort((a, b) => b.packAt - a.packAt || a.at - b.at);
}

export async function archiveImage(id: string, variant: "full" | "thumb"): Promise<Response> {
  const data = (await archiveStore().get(`i-${safeId(id)}-${variant}`, { type: "text" })) as string | null;
  const m = data?.match(/^data:(image\/(?:png|jpeg|webp));base64,(.*)$/s);
  if (!m) return new Response("Not found", { status: 404 });
  const bytes = Uint8Array.from(atob(m[2]), (c) => c.charCodeAt(0));
  return new Response(bytes, {
    headers: { "Content-Type": m[1], "Cache-Control": "public, max-age=31536000, immutable" },
  });
}

/** Delete a whole pack (or one sticker when `id` is given). */
export async function archiveDelete(packId: string, id?: string) {
  const store = archiveStore();
  const { blobs } = await store.list({ prefix: "m-" });
  const p = safeId(packId);
  const sid = id ? safeId(id) : "";
  const hits = blobs.map((b) => b.key).filter((k) => k.includes(`-${p}-`) && (!sid || k.endsWith(`-${sid}`)));
  await Promise.all(
    hits.flatMap((k) => {
      const itemId = k.slice(k.lastIndexOf("-") + 1);
      return [store.delete(k), store.delete(`i-${itemId}-full`), store.delete(`i-${itemId}-thumb`)];
    }),
  );
  return hits.length;
}
