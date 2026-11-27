import { ApiError, GoogleGenAI, ThinkingLevel, type GenerateContentConfig, type Part } from "@google/genai";
import { TtlCache, hashKey } from "./cache.js";

/**
 * Gemini-powered sticker pipeline (one GEMINI_API_KEY for everything).
 *
 * Text models plan the pack and hand-write vector SVG:
 *   1. analyzePerson – looks at the captured photo and returns a structured
 *      "character sheet" (hair, skin tone, glasses, outfit…) plus sticker ideas.
 *   2. drawSticker   – draws one sticker as clean vector SVG from that sheet.
 * The browser then rasterises the SVG, adds a die-cut white border and lays the
 * stickers out at real print sizes.
 */

/**
 * Model cascade (cheap small model first, escalate only when its output fails validation).
 * Override any tier with an env var; names are plain Gemini API model ids.
 *   SMALL  - analysis / JSON extraction (SLM tier)
 *   MEDIUM - first attempt at SVG drawing, and escalation for analysis
 *   LARGE  - last-resort escalation for SVG drawing
 */
export type Tier = "small" | "medium" | "large";
const TIER_ENV: Record<Tier, string | undefined> = {
  small: process.env.GEMINI_SMALL_MODEL,
  medium: process.env.GEMINI_MEDIUM_MODEL,
  large: process.env.GEMINI_LARGE_MODEL,
};
const TIER_FALLBACK: Record<Tier, string> = {
  small: "gemini-flash-lite-latest",
  medium: "gemini-flash-latest",
  large: "gemini-pro-latest",
};
let tierModels: Record<Tier, string> | null = null;
let tierResolving: Promise<Record<Tier, string>> | null = null;

const modelVersion = (n: string) => Number(n.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);

/**
 * Pick the newest stable text model for each tier from the key's own model list, so retired
 * model ids (e.g. gemini-2.5-flash) never break the app. Env vars always win.
 */
async function resolveTiers(): Promise<Record<Tier, string>> {
  if (tierModels) return tierModels;
  tierResolving ??= (async () => {
    const found: Partial<Record<Tier, string>> = {};
    try {
      const names: string[] = [];
      for await (const m of await getGenAI().models.list()) {
        const n = (m.name ?? "").replace(/^models\//, "");
        const acts = m.supportedActions ?? [];
        if (!/^gemini-/.test(n) || (acts.length && !acts.includes("generateContent"))) continue;
        if (/image|tts|audio|live|embed|robotics|computer-use|thinking|learnlm|-\d{3}$|preview|exp|latest|customtools|vision/.test(n)) continue;
        names.push(n);
      }
      const best = (re: RegExp, not?: RegExp) =>
        names.filter((n) => re.test(n) && !(not && not.test(n))).sort((x, y) => modelVersion(y) - modelVersion(x))[0];
      found.small = best(/flash-lite/);
      found.medium = best(/flash/, /lite/);
      found.large = best(/pro/);
    } catch {
      /* fall back to the "-latest" aliases below */
    }
    tierModels = {
      small: TIER_ENV.small || found.small || TIER_FALLBACK.small,
      medium: TIER_ENV.medium || found.medium || TIER_FALLBACK.medium,
      large: TIER_ENV.large || found.large || TIER_FALLBACK.large,
    };
    console.log(`[ai] model cascade: ${tierModels.small} -> ${tierModels.medium} -> ${tierModels.large}`);
    return tierModels;
  })();
  return tierResolving;
}
export const currentModels = () => tierModels;
export const modelSummary = () => (tierModels ? `${tierModels.small} -> ${tierModels.medium} -> ${tierModels.large}` : "auto");
export const MODEL = "auto";

/** Hard cap on stickers per pack (enforced server-side for every route). */
export const MAX_STICKERS = 6;

export const STICKER_STYLES = [
  "Cute caricature",
  "Chibi cartoon",
  "3D anime",
  "Retro style",
  "Flat vector",
  "Kawaii pastel",
  "Retro badge",
  "Comic pop",
] as const;
export type StickerStyle = (typeof STICKER_STYLES)[number];

export const STYLE_GUIDE: Record<StickerStyle, string> = {
  "Cute caricature":
    "Expressive cute cartoon character / caricature with oversized cartoon head (~40% of figure height), big glossy cartoon eyes with white catchlights, arched eyebrows, rosy cheek blush, bold clean #15233F dark ink outlines (stroke-width 5–8), bright vibrant colours, and 3-tone cel shading. Keep the person's exact hairstyle, skin tone, glasses/facial hair, clothes, and accessories clearly recognizable in a cheerful half-body or full-body pose.",
  "Chibi cartoon":
    "Chibi cartoon character proportions (head ~48% of figure height), huge sparkling anime/cartoon eyes with double white catchlights, rounded bouncy shapes, thick #15233F ink outlines (stroke-width 6–8), bright vibrant colours with 3-tone cel shading and blush marks.",
  "3D anime":
    "3D stylised anime character look (rendered cleanly in vector SVG using smooth radialGradient & linearGradient volumetric shading, glossy specular highlights on hair, cheeks, and nose, large expressive luminous anime eyes with multi-layered catchlights, soft rim lighting, and crisp #15233F cartoon contour outlines stroke-width 4–6).",
  "Retro style":
    "Classic vintage 70s/80s retro cartoon character illustration with warm nostalgic palette (mustard gold, burnt orange, teal, cream, cocoa brown), expressive groovy cartoon eyes & big smile, bold #15233F ink outlines (stroke-width 6–8), and warm halftone-inspired cel shading.",
  "Flat vector":
    "Modern 2D animated cartoon character illustration, crisp stylized cartoon proportions, big expressive eyes with white highlights, thick #15233F outer ink outline (stroke-width 5–7), vibrant 6–8 colour palette, clean cel shadow blocks.",
  "Kawaii pastel":
    "Kawaii cartoon character style, cute oversized head, glossy dark eyes with sparkle highlights, rosy cheek blush ovals, vibrant pastel palette, tiny floating hearts/sparkles, thick rounded #15233F ink outlines (stroke-width 5–7).",
  "Retro badge":
    "Classic Saturday-morning 70s cartoon character illustration with expressive exaggerated smile, glossy cartoon eyes, warm vibrant palette (mustard, teal, coral, cream), bold #15233F ink outlines (stroke-width 6–8), and 3-tone cel shading.",
  "Comic pop":
    "Pop-art comic cartoon character style: heavy clean #15233F ink outlines (stroke-width 6–8), expressive cartoon eyes and exaggerated grin, bright vibrant colours, sharp cel shading shadows, and comic accent highlights.",
};

export interface CharacterSheet {
  summary: string;
  skin_tone_hex: string;
  hair_color_hex: string;
  hair_style: string;
  eye_color: string;
  glasses: string;
  facial_hair: string;
  headwear: string;
  top_description: string;
  top_color_hex: string;
  accessories: string;
  expression: string;
}

export interface StickerIdea {
  title: string;
  caption: string;
  pose_and_scene: string;
}

export interface AnalysisResult {
  person_found: boolean;
  reason_if_not_found: string;
  character: CharacterSheet;
  ideas: StickerIdea[];
}

export class StickerError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

let client: GoogleGenAI | null = null;
export function hasCredentials(): boolean {
  const k = process.env.GEMINI_API_KEY;
  return Boolean(k && k !== "MY_GEMINI_API_KEY");
}
export function getGenAI(): GoogleGenAI {
  if (!hasCredentials()) {
    throw new StickerError(
      "GEMINI_API_KEY is not set. Add it to .env (or Vercel env vars) and restart.",
      503,
    );
  }
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

export function parseImageDataUrl(dataUrl: unknown) {
  if (typeof dataUrl !== "string") return null;
  const match = dataUrl.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
  if (!match) return null;
  return {
    media_type: match[1] as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
    data: match[2],
  };
}

type ParsedImage = NonNullable<ReturnType<typeof parseImageDataUrl>>;

/* ---------------- caching ---------------- */
const HOUR = 3_600_000;
const analysisCache = new TtlCache<AnalysisResult>(200, 6 * HOUR);
const svgCache = new TtlCache<string>(300, 6 * HOUR);
/** Ids of the cheapest-first tiers that actually served each request (handy in logs). */
const log = (msg: string) => console.log(`[ai] ${msg}`);

/* ---------------- Gemini call + error mapping ---------------- */
function mapError(err: unknown): never {
  if (err instanceof StickerError) throw err;
  if (err instanceof Error && /abort|timeout|timed out/i.test(err.name + err.message)) {
    throw new StickerError("Gemini took too long to answer. Please retry.", 504);
  }
  if (err instanceof ApiError) {
    if (err.status === 400 && /API key/i.test(err.message)) {
      throw new StickerError("The Gemini API key was rejected. Check GEMINI_API_KEY.", 401);
    }
    if (err.status === 401 || err.status === 403) {
      throw new StickerError("Gemini refused the API key (check GEMINI_API_KEY and its permissions).", err.status);
    }
    if (err.status === 429) {
      throw new StickerError("Gemini is rate-limited or out of quota right now. Wait a moment and retry.", 429);
    }
    if (err.status === 400) {
      throw new StickerError(`Gemini rejected the request: ${err.message.slice(0, 200)}`, 400);
    }
    throw new StickerError(`Gemini API error (${err.status}): ${err.message.slice(0, 200)}`, 502);
  }
  throw err;
}

/** Transient/capacity errors are worth trying the next model for; auth errors are not. */
const isTransient = (err: unknown) =>
  err instanceof ApiError && (err.status === 429 || err.status >= 500 || err.status === 404);

/** Serverless hosts kill long requests (Netlify ~26-30s, Vercel 60s): give each cascade a total time budget. */
const BUDGET_MS = Number(process.env.AI_TIME_BUDGET_MS) || (process.env.VERCEL ? 55_000 : process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME ? 24_000 : 120_000);

async function callModel(model: string, parts: Part[], config: GenerateContentConfig, deadline: number): Promise<string> {
  const t0 = Date.now();
  config = { ...config, abortSignal: AbortSignal.timeout(Math.max(1000, deadline - t0)) };
  log(`${model}: calling (budget ${Math.round((deadline - t0) / 1000)}s)`);
  // Hard wall-clock cap (the SDK abort signal alone isn't always honoured on serverless hosts).
  const run = (cfg: GenerateContentConfig) =>
    Promise.race([
      getGenAI().models.generateContent({ model, contents: [{ role: "user", parts }], config: cfg }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("timeout waiting for Gemini")), Math.max(1000, deadline - Date.now()))),
    ]);
  let res;
  try {
    res = await run(config);
  } catch (err) {
    // Gemini 3.x uses thinkingLevel instead of thinkingBudget and rejects it with a 400:
    // retry with the lowest thinking level (fast + cheap), then with no thinking config at all.
    if (!(err instanceof ApiError && err.status === 400 && config.thinkingConfig)) throw err;
    log(`${model}: 400 on thinkingBudget, retrying with thinkingLevel`);
    const { thinkingConfig: _drop, ...rest } = config;
    try {
      res = await run({ ...rest, thinkingConfig: { thinkingLevel: ThinkingLevel.LOW } });
    } catch (err2) {
      if (!(err2 instanceof ApiError && err2.status === 400)) throw err2;
      res = await run(rest);
    }
  }
  log(`${model}: ${Date.now() - t0}ms`);
  if (res.promptFeedback?.blockReason || /SAFETY|PROHIBITED|BLOCKLIST|IMAGE_SAFETY/i.test(String(res.candidates?.[0]?.finishReason ?? ""))) {
    throw new StickerError("Gemini declined to make stickers from this photo. Try a different photo.", 422);
  }
  if (res.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    throw new StickerError("Sticker drawing ran out of space. Please retry.", 502);
  }
  return res.text ?? "";
}

/**
 * Model cascade: run tiers cheapest-first and accept the first output that passes `accept`.
 * A tier that fails validation, is rate-limited or is unavailable falls through to the next.
 */
async function cascade<T>(
  what: string,
  tiers: { model: Tier; config: GenerateContentConfig; maxMs?: number }[],
  parts: Part[],
  parse: (text: string) => T | null,
): Promise<T> {
  let lastErr: unknown = null;
  const deadline = Date.now() + BUDGET_MS;
  const models = await resolveTiers();
  for (const [i, t] of tiers.entries()) {
    const tier = { model: models[t.model], config: t.config };
    try {
      if (deadline - Date.now() < 3000) throw new StickerError("Gemini ran out of time for this step. Please retry.", 504);
      const out = parse(await callModel(tier.model, parts, tier.config, Math.min(deadline, Date.now() + (t.maxMs ?? Infinity))));
      if (out !== null) {
        log(`${what}: served by ${tier.model}${i ? ` (escalated ${i}x)` : ""}`);
        return out;
      }
      log(`${what}: ${tier.model} output failed validation, escalating`);
    } catch (err) {
      if (err instanceof StickerError && err.status !== 502 && err.status !== 504) throw err; // refusals etc. won't improve on a bigger model
      if (err instanceof StickerError || isTransient(err) || (err instanceof Error && /abort|timeout/i.test(err.name + err.message))) {
        lastErr = err;
        log(`${what}: ${tier.model} failed (${(err as Error).message.slice(0, 80)}), escalating`);
        continue;
      }
      mapError(err);
    }
  }
  if (lastErr) mapError(lastErr);
  throw new StickerError(`Could not complete the ${what} step. Please retry.`, 502);
}

const HEX = { type: "string", description: "CSS hex colour like #8d5524" };
const ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["person_found", "reason_if_not_found", "character", "ideas"],
  properties: {
    person_found: { type: "boolean" },
    reason_if_not_found: { type: "string" },
    character: {
      type: "object",
      additionalProperties: false,
      required: [
        "summary",
        "skin_tone_hex",
        "hair_color_hex",
        "hair_style",
        "eye_color",
        "glasses",
        "facial_hair",
        "headwear",
        "top_description",
        "top_color_hex",
        "accessories",
        "expression",
      ],
      properties: {
        summary: { type: "string" },
        skin_tone_hex: HEX,
        hair_color_hex: HEX,
        hair_style: { type: "string" },
        eye_color: { type: "string" },
        glasses: { type: "string" },
        facial_hair: { type: "string" },
        headwear: { type: "string" },
        top_description: { type: "string" },
        top_color_hex: HEX,
        accessories: { type: "string" },
        expression: { type: "string" },
      },
    },
    ideas: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "caption", "pose_and_scene"],
        properties: {
          title: { type: "string" },
          caption: { type: "string" },
          pose_and_scene: { type: "string" },
        },
      },
    },
  },
} as const;

const HEX_RE = /^#[0-9a-fA-F]{3,8}$/;

function validAnalysis(a: AnalysisResult | null, count: number): AnalysisResult | null {
  if (!a || typeof a.person_found !== "boolean") return null;
  if (!a.person_found) return a; // "no person" is a legitimate answer; re-checked below
  const c = a.character;
  if (!c?.summary || ![c.skin_tone_hex, c.hair_color_hex, c.top_color_hex].every((h) => HEX_RE.test(String(h)))) return null;
  if (!Array.isArray(a.ideas) || a.ideas.length < count || a.ideas.some((i) => !i?.title || !/^#\w+/.test(String(i.caption)) || !i.pose_and_scene)) return null;
  return a;
}

// Static instructions go in systemInstruction and stay identical across requests, so Gemini's
// implicit prefix caching can discount them; everything request-specific comes after.
const ANALYZE_SYSTEM =
  "You help a photo-booth turn a visitor's photo into a personalised sticker pack. " +
  "Describe only what is visible and needed to draw a recognisable, flattering cartoon of them: " +
  "hair, skin tone, eyewear, facial hair, headwear, clothing, accessories, expression. " +
  "Never guess or mention sensitive traits (ethnicity, religion, health, age, body size). " +
  "Use 'none' for features that are absent. Colours must be the real colours seen in the photo. " +
  "For each sticker idea: title = short 2-3 words; caption = ONE short, catchy, accurately spelled hashtag starting with '#' " +
  "relating to the person's look, mood, activity or personality (e.g. #ChaiLover, #GymBro, #SelfieQueen, #TravelMode, #CoolVibes); " +
  "pose_and_scene = one sentence describing a centred half-body or full-body cute cartoon caricature pose with a slightly exaggerated expressive face, " +
  "recognisable outfit/accessories and 1-2 fun props. Make the ideas varied and positive. " +
  "If no person is clearly visible, set person_found=false and explain briefly.";

export async function analyzePerson(
  image: ParsedImage,
  opts: { count: number; vibe: string; name: string },
): Promise<AnalysisResult> {
  const key = hashKey("analyze", image.data, opts.count, opts.vibe, opts.name);
  const parsed = await analysisCache.wrap(key, async () => {
    const parts: Part[] = [
      { inlineData: { data: image.data, mimeType: image.media_type } },
      {
        text:
          `Build the character sheet for the main person, then propose exactly ${opts.count} sticker ideas.\n` +
          `Pack vibe: ${opts.vibe || "fun everyday laptop & phone stickers"}.` +
          (opts.name ? `\nFirst name: ${opts.name} (keep hashtags about their look/mood/activity).` : ""),
      },
    ];
    const base: GenerateContentConfig = {
      systemInstruction: ANALYZE_SYSTEM,
      responseMimeType: "application/json",
      responseJsonSchema: ANALYSIS_SCHEMA as unknown as Record<string, unknown>,
      maxOutputTokens: 3000, // up to 6 ideas (~1k tokens); no 8k headroom needed
      temperature: 0.7,
    };
    // SLM first with thinking off; the medium model only runs if the small one's JSON fails validation
    // (or it claims nobody is in the photo, which is worth one double-check).
    const result = await cascade<AnalysisResult>(
      "analyze",
      [
        { model: "small", config: { ...base, thinkingConfig: { thinkingBudget: 0 } } },
        { model: "medium", config: { ...base, thinkingConfig: { thinkingBudget: 0 } } },
      ],
      parts,
      (text) => {
        try {
          const a = validAnalysis(JSON.parse(text) as AnalysisResult, opts.count);
          return a && a.person_found ? a : null;
        } catch {
          return null;
        }
      },
    ).catch((err) => {
      // Both tiers saying "no usable person" is a user-facing 422, not a server error.
      if (err instanceof StickerError && err.status === 502 && err.message.startsWith("Could not complete")) {
        throw new StickerError("No person found in the photo. Retake with your face clearly visible.", 422);
      }
      throw err;
    });
    return result;
  });
  return { ...parsed, ideas: parsed.ideas.slice(0, opts.count) };
}

/** Draw the character from the text sheet alone (cheap). Set STICKER_DRAW_WITH_PHOTO=1 to also send the photo. */
const DRAW_WITH_PHOTO = process.env.STICKER_DRAW_WITH_PHOTO === "1";

const DRAW_SYSTEM =
  "You are a lead 2D animation & cartoon character illustrator who draws expressive, charming cartoon characters in hand-written SVG.\n" +
  "Output requirements:\n" +
  '- Reply with ONLY one <svg> element: xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512". No markdown fences, no commentary.\n' +
  "- Transparent background: do NOT draw a full-canvas background rect or outer sticker card. Draw one compact, centred half-body or full-body cartoon character filling ~82% of the canvas with >=24px clear margin on every side.\n" +
  "- Allowed elements: g, path, circle, ellipse, rect, polygon, polyline, line, defs, linearGradient, radialGradient, stop, clipPath. No <text>, <image>, <script>, <style>, <foreignObject>, filters, external links or web fonts.\n" +
  "- Must look unmistakably like a CARTOON CHARACTER (not a geometric icon or realistic portrait): draw an oversized expressive cartoon head (~38–44% of figure height), big bright cartoon eyes with dark pupils and 2 crisp white glossy catchlight circles, expressive curved eyebrows, cute stylized nose, lively exaggerated smile/grin, soft rosy cheek blush ovals, sculpted swooping hair clumps with glossy highlight arcs, and expressive cartoon hands/pose.\n" +
  "- Bold cartoon ink & 3-tone cel shading: wrap every silhouette, hair lock, facial feature, clothing fold, and prop in clean thick dark ink strokes (stroke=\"#15233F\" stroke-width=\"5\" to \"8\" stroke-linecap=\"round\" stroke-linejoin=\"round\") with rich vibrant colours plus a clean cel shadow crescent and highlight rim.\n" +
  "- Keep it warm, charming, and flattering without mocking distortion. Keep SVG compact, under ~9 KB: use few, well-shaped paths.";

/** Cheap structural check so a weak/truncated drawing escalates instead of shipping. */
function plausibleSvg(raw: string): string | null {
  let svg: string;
  try {
    svg = sanitizeSvg(raw);
  } catch {
    return null;
  }
  const shapes = (svg.match(/<(path|circle|ellipse|rect|polygon|polyline)\b/gi) ?? []).length;
  const opens = (svg.match(/<g\b/gi) ?? []).length;
  const closes = (svg.match(/<\/g>/gi) ?? []).length;
  return svg.length > 1500 && shapes >= 20 && opens === closes ? svg : null;
}

export async function drawSticker(
  image: ParsedImage | null,
  character: CharacterSheet,
  idea: StickerIdea,
  style: StickerStyle,
): Promise<string> {
  const usePhoto = DRAW_WITH_PHOTO && image;
  const key = hashKey("draw", usePhoto ? image.data : "", character, idea, style);
  return svgCache.wrap(key, async () => {
    const parts: Part[] = [];
    if (usePhoto) parts.push({ inlineData: { data: image.data, mimeType: image.media_type } });
    parts.push({
      text:
        `Style: ${STYLE_GUIDE[style]}\n` +
        `Character sheet (keep hairstyle, skin tone, clothes, eyewear and accessories clearly recognizable): ${JSON.stringify(character)}\n` +
        `Pose & scene: "${idea.title}" — ${idea.pose_and_scene}\n` +
        "Draw ONLY the character + 1–2 fun props on a transparent background (no card background, hashtag text or white border; those are added automatically).",
    });
    const base: GenerateContentConfig = {
      systemInstruction: DRAW_SYSTEM,
      maxOutputTokens: 9000,
      temperature: 0.8,
    };
    return cascade<string>(
      "draw",
      [
        // Small model first with a short leash (SLM-first), then the medium/large models get the rest of the budget.
        { model: "small", maxMs: 11_000, config: { ...base, thinkingConfig: { thinkingBudget: 0 } } },
        { model: "medium", config: { ...base, thinkingConfig: { thinkingBudget: 0 } } },
        { model: "large", config: { ...base, thinkingConfig: { thinkingBudget: 512 } } },
      ],
      parts,
      plausibleSvg,
    );
  });
}

/** Allow-list the SVG the model produced so it is safe and printable. */
export function sanitizeSvg(raw: string): string {
  const start = raw.indexOf("<svg");
  const end = raw.lastIndexOf("</svg>");
  if (start === -1 || end === -1) {
    throw new StickerError("Gemini did not return a valid SVG sticker. Please retry.", 502);
  }
  let svg = raw.slice(start, end + "</svg>".length);
  svg = svg
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<foreignObject[\s\S]*?<\/foreignObject>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<image\b[^>]*>/gi, "")
    .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*')/gi, "")
    .replace(/(?:xlink:)?href\s*=\s*("(?!#)[^"]*"|'(?!#)[^']*')/gi, "");
  // Normalise the root tag so it always renders at a known size.
  svg = svg.replace(/<svg\b[^>]*>/i, (tag) => {
    const viewBox = tag.match(/viewBox\s*=\s*"([^"]+)"/i)?.[1] ?? "0 0 512 512";
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="${viewBox}" width="1024" height="1024">`;
  });
  return svg;
}

export function asStyle(value: unknown): StickerStyle {
  return STICKER_STYLES.includes(value as StickerStyle)
    ? (value as StickerStyle)
    : "Cute caricature";
}
