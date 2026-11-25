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

export async function getWall(since: number) {
  const store = wallStore();
  const { blobs } = await store.list({ prefix: "w-" });
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, MAX_WALL)
    .filter((k) => Number(k.split("-")[1]) > since);
  const items = (await Promise.all(keys.map((k) => store.get(k, { type: "json" }).catch(() => null)))).filter(Boolean) as any[];
  return items.filter((i) => i.at > since);
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
