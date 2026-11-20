import type { Express, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import {
  MODEL,
  StickerError,
  analyzePerson,
  asStyle,
  drawSticker,
  hasCredentials,
  parseImageDataUrl,
  type CharacterSheet,
  type StickerIdea,
  MAX_STICKERS,
} from './claude.js';
import { currentImageModel, getImageModel, hasGemini, paintSticker } from './gemini.js';

/**
 * Live Sticker Showcase routes:
 *  - Claude sticker pipeline (analyze + draw), timed for the insights wall
 *  - Live insights store, persisted to data/
 *  - Opt-in "live wall" of audience stickers
 *  - Backup pack: the last successful drawings, replayable if the venue network drops
 */

const DATA_DIR = path.resolve(process.cwd(), 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

function load<T>(file: string, fallback: T): T {
  try {
    return { ...fallback, ...JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf8')) };
  } catch {
    return fallback;
  }
}
const timers = new Map<string, NodeJS.Timeout>();
function save(file: string, value: unknown) {
  clearTimeout(timers.get(file));
  timers.set(
    file,
    setTimeout(() => {
      fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(value), () => {});
    }, 400),
  );
}

type Tally = Record<string, number>;
interface InsightsState {
  startedAt: number;
  counters: {
    stickerSessions: number;
    stickersDrawn: number;
    stickerErrors: number;
    wallPosts: number;
  };
  styles: Tally;
  vibes: Tally;
  captions: { caption: string; title: string; style: string; at: number }[];
  drawMs: number[];
  analyzeMs: number[];
  activity: number[]; // event timestamps (last 600)
  engines: Tally; // stickers finished per engine ("Claude" / "Gemini")
  engineMs: Record<string, number[]>;
}

const freshInsights = (): InsightsState => ({
  startedAt: Date.now(),
  counters: { stickerSessions: 0, stickersDrawn: 0, stickerErrors: 0, wallPosts: 0 },
  styles: {},
  vibes: {},
  captions: [],
  drawMs: [],
  analyzeMs: [],
  activity: [],
  engines: {},
  engineMs: {},
});

let insights = load<InsightsState>('insights.json', freshInsights());
insights.engines ??= {};
insights.engineMs ??= {};

interface WallItem {
  id: string;
  img: string;
  caption: string;
  name: string;
  style: string;
  at: number;
}
let wall = load<{ items: WallItem[] }>('wall.json', { items: [] });

interface BackupDraw {
  svg?: string; // Claude vector art
  img?: string; // Gemini raster art (data URL)
  engine?: 'claude' | 'gemini';
  idea: StickerIdea;
  style: string;
  character: CharacterSheet;
}
let backup = load<{ draws: BackupDraw[] }>('backup.json', { draws: [] });

const push = <T,>(arr: T[], item: T, max: number) => {
  arr.unshift(item);
  if (arr.length > max) arr.length = max;
};
const bump = (t: Tally, key: string | undefined) => {
  const k = (key || '').trim().slice(0, 60);
  if (k) t[k] = (t[k] || 0) + 1;
};
function touch() {
  insights.activity.push(Date.now());
  if (insights.activity.length > 600) insights.activity.splice(0, insights.activity.length - 600);
  save('insights.json', insights);
}

function recordDraw(engine: 'Claude' | 'Gemini', ms: number, idea: StickerIdea, style: string) {
  push(insights.drawMs, ms, 80);
  insights.counters.stickersDrawn++;
  bump(insights.engines, engine);
  push((insights.engineMs[engine] ??= []), ms, 60);
  push(insights.captions, { caption: idea.caption, title: idea.title, style, at: Date.now() }, 40);
  touch();
}

const median = (xs: number[]) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function sendError(res: Response, err: unknown) {
  if (err instanceof StickerError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
}

export function registerShowcaseRoutes(app: Express) {
  if (hasGemini()) void getImageModel();

  app.get('/api/showcase/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      claude: hasCredentials(),
      model: MODEL,
      gemini: hasGemini(),
      geminiModel: currentImageModel(),
      backupStickers: backup.draws.length,
    });
  });

  /* ---------------- Claude sticker pipeline ---------------- */
  app.post('/api/stickers/analyze', async (req: Request, res: Response) => {
    const image = parseImageDataUrl(req.body?.imageDataUrl);
    if (!image) {
      res.status(400).json({ error: 'Missing or invalid photo.' });
      return;
    }
    const count = Math.min(MAX_STICKERS, Math.max(1, Number(req.body?.count) || MAX_STICKERS));
    const t0 = Date.now();
    try {
      const result = await analyzePerson(image, {
        count,
        vibe: String(req.body?.vibe ?? '').slice(0, 200),
        name: String(req.body?.name ?? '').slice(0, 40),
      });
      push(insights.analyzeMs, Date.now() - t0, 60);
      insights.counters.stickerSessions++;
      bump(insights.styles, String(req.body?.style ?? ''));
      bump(insights.vibes, String(req.body?.vibe ?? ''));
      touch();
      res.json({ ...result, ms: Date.now() - t0 });
    } catch (err) {
      insights.counters.stickerErrors++;
      touch();
      sendError(res, err);
    }
  });

  app.post('/api/stickers/draw', async (req: Request, res: Response) => {
    const image = parseImageDataUrl(req.body?.imageDataUrl);
    const character = req.body?.character as CharacterSheet | undefined;
    const idea = req.body?.idea as StickerIdea | undefined;
    if (!character || !idea?.title) {
      res.status(400).json({ error: 'Missing character sheet or sticker idea.' });
      return;
    }
    const style = asStyle(req.body?.style);
    const t0 = Date.now();
    try {
      const svg = await drawSticker(image, character, idea, style);
      const ms = Date.now() - t0;
      recordDraw('Claude', ms, idea, style);
      push(backup.draws, { svg, engine: 'claude', idea, style, character }, 8);
      save('backup.json', backup);
      res.json({ svg, ms });
    } catch (err) {
      insights.counters.stickerErrors++;
      touch();
      sendError(res, err);
    }
  });

  // Gemini paints the sticker as a raster illustration (Claude still plans the pack).
  app.post('/api/stickers/paint', async (req: Request, res: Response) => {
    const image = parseImageDataUrl(req.body?.imageDataUrl);
    const character = req.body?.character as CharacterSheet | undefined;
    const idea = req.body?.idea as StickerIdea | undefined;
    if (!character || !idea?.title) {
      res.status(400).json({ error: 'Missing character sheet or sticker idea.' });
      return;
    }
    const style = asStyle(req.body?.style);
    const t0 = Date.now();
    try {
      const { dataUrl, model } = await paintSticker(image, character, idea, style);
      const ms = Date.now() - t0;
      recordDraw('Gemini', ms, idea, style);
      push(backup.draws, { img: dataUrl, engine: 'gemini', idea, style, character }, 8);
      save('backup.json', backup);
      res.json({ img: dataUrl, ms, model });
    } catch (err) {
      insights.counters.stickerErrors++;
      touch();
      sendError(res, err);
    }
  });

  // Replay the most recent successful drawings (venue Wi-Fi insurance).
  app.get('/api/stickers/backup', (_req: Request, res: Response) => {
    res.json({ draws: backup.draws });
  });

  /* ---------------- Live insights ---------------- */
  app.get('/api/insights', (_req: Request, res: Response) => {
    const now = Date.now();
    const perMinute = Array.from({ length: 30 }, (_, i) => {
      const end = now - (29 - i) * 60_000;
      return insights.activity.filter((t) => t > end - 60_000 && t <= end).length;
    });
    res.json({
      ...insights,
      drawMedianMs: median(insights.drawMs),
      engineMedianMs: Object.fromEntries(Object.entries(insights.engineMs).map(([k, v]) => [k, median(v)])),
      analyzeMedianMs: median(insights.analyzeMs),
      perMinute,
      wallCount: wall.items.length,
      now,
    });
  });

  app.post('/api/insights/reset', (_req: Request, res: Response) => {
    insights = freshInsights();
    wall = { items: [] };
    save('insights.json', insights);
    save('wall.json', wall);
    res.json({ ok: true });
  });

  /* ---------------- Live sticker wall (opt-in) ---------------- */
  app.post('/api/wall', (req: Request, res: Response) => {
    const img = String(req.body?.img ?? '');
    if (!/^data:image\/(png|jpeg|webp);base64,/.test(img) || img.length > 400_000) {
      res.status(400).json({ error: 'Invalid sticker image.' });
      return;
    }
    const item: WallItem = {
      id: Math.random().toString(36).slice(2, 10),
      img,
      caption: String(req.body?.caption ?? '').slice(0, 40),
      name: String(req.body?.name ?? '').slice(0, 30),
      style: String(req.body?.style ?? '').slice(0, 30),
      at: Date.now(),
    };
    push(wall.items, item, 60);
    insights.counters.wallPosts++;
    touch();
    save('wall.json', wall);
    res.json({ ok: true, id: item.id });
  });

  app.get('/api/wall', (req: Request, res: Response) => {
    const since = Number(req.query.since) || 0;
    res.json({ items: wall.items.filter((i) => i.at > since) });
  });
}
