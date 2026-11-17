import Anthropic from "@anthropic-ai/sdk";

/**
 * Claude-powered sticker pipeline.
 *
 * Claude cannot output raster images, so it does two things it is very good at:
 *   1. analyzePerson – looks at the captured photo and returns a structured
 *      "character sheet" (hair, skin tone, glasses, outfit…) plus sticker ideas.
 *   2. drawSticker   – draws one sticker as clean vector SVG from that sheet.
 * The browser then rasterises the SVG, adds a die-cut white border and lays the
 * stickers out at real print sizes.
 */

export const MODEL = process.env.STICKER_MODEL || "claude-opus-5-5";
const DRAW_EFFORT = (process.env.STICKER_EFFORT || "medium") as
  | "low"
  | "medium"
  | "high";

export const STICKER_STYLES = [
  "Chibi cartoon",
  "Flat vector",
  "Kawaii pastel",
  "Retro badge",
  "Comic pop",
] as const;
export type StickerStyle = (typeof STICKER_STYLES)[number];

const STYLE_GUIDE: Record<StickerStyle, string> = {
  "Chibi cartoon":
    "Chibi proportions (head ~45% of body height), big friendly eyes, rounded shapes, thick dark outline, flat fills with one soft shade tone.",
  "Flat vector":
    "Modern flat vector illustration, geometric simplification, no outlines on inner shapes but a bold outer outline, limited 6–8 colour palette, subtle long shadow.",
  "Kawaii pastel":
    "Kawaii style, pastel palette, blush marks on cheeks, sparkles and tiny hearts around the character, soft rounded line work.",
  "Retro badge":
    "Vintage 70s badge: character bust inside a circular or shield-shaped badge with a ribbon banner for the caption, warm retro palette (mustard, teal, coral, cream), halftone-like dot accents.",
  "Comic pop":
    "Pop-art comic style: heavy black ink outlines, bold saturated primaries, Ben-Day dot pattern accents, a comic burst shape behind the character.",
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

let client: Anthropic | null = null;
export function hasCredentials(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
function getClient(): Anthropic {
  if (!hasCredentials()) {
    throw new StickerError(
      "ANTHROPIC_API_KEY is not set. Add it to .env and restart the server.",
      503,
    );
  }
  client ??= new Anthropic();
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

/** One streamed request with server-side refusal fallback; returns the final message. */
async function callClaude(
  params: Omit<Anthropic.Beta.Messages.MessageCreateParamsStreaming, "model" | "stream" | "betas" | "fallbacks">,
) {
  try {
    const message = await getClient()
      .beta.messages.stream({
        model: MODEL,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        ...params,
      })
      .finalMessage();
    if (message.stop_reason === "refusal") {
      throw new StickerError(
        "Claude declined to make stickers from this photo. Try a different photo.",
        422,
      );
    }
    if (message.stop_reason === "max_tokens") {
      throw new StickerError("Sticker drawing ran out of space. Please retry.", 502);
    }
    return message;
  } catch (err) {
    if (err instanceof StickerError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new StickerError("The Anthropic API key was rejected. Check ANTHROPIC_API_KEY.", 401);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new StickerError("Claude is rate-limited right now. Wait a moment and retry.", 429);
    }
    if (err instanceof Anthropic.BadRequestError) {
      throw new StickerError(`Claude rejected the request: ${err.message}`, 400);
    }
    if (err instanceof Anthropic.APIError) {
      throw new StickerError(`Claude API error (${err.status ?? "network"}): ${err.message}`, 502);
    }
    throw err;
  }
}

function textOf(message: Anthropic.Beta.Messages.BetaMessage): string {
  return message.content
    .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
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

export async function analyzePerson(
  image: ParsedImage,
  opts: { count: number; vibe: string; name: string },
): Promise<AnalysisResult> {
  const message = await callClaude({
    max_tokens: 8000,
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: ANALYSIS_SCHEMA as unknown as Record<string, unknown> },
    },
    system:
      "You help a photo-booth turn a visitor's photo into a personalised sticker pack. " +
      "Describe only what is visible and needed to draw a recognisable, flattering cartoon of them: " +
      "hair, skin tone, eyewear, facial hair, headwear, clothing, accessories, expression. " +
      "Never guess or mention sensitive traits (ethnicity, religion, health, age, body size). " +
      "Use 'none' for features that are absent. Colours must be the real colours seen in the photo.",
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", ...image } },
          {
            type: "text",
            text:
              `Build the character sheet for the main person in this photo, then propose exactly ${opts.count} sticker ideas.\n` +
              `Theme / vibe for the pack: ${opts.vibe || "fun everyday laptop & phone stickers"}.\n` +
              (opts.name ? `Their first name is ${opts.name}; you may use it in at most one caption.\n` : "") +
              "Each idea: a short title, a punchy caption of at most 3 words (or empty string for no text), and one sentence describing the pose, expression and 1–2 props. " +
              "Make the ideas varied (e.g. waving, coffee, coding on laptop, thumbs-up, celebrating, sleepy, thinking) and positive. " +
              "If no person is clearly visible, set person_found=false and explain briefly.",
          },
        ],
      },
    ],
  });

  let parsed: AnalysisResult;
  try {
    parsed = JSON.parse(textOf(message)) as AnalysisResult;
  } catch {
    throw new StickerError("Could not read Claude's analysis. Please retry.", 502);
  }
  if (!parsed.person_found) {
    throw new StickerError(
      parsed.reason_if_not_found || "No person found in the photo. Retake with your face clearly visible.",
      422,
    );
  }
  parsed.ideas = parsed.ideas.slice(0, opts.count);
  return parsed;
}

export async function drawSticker(
  image: ParsedImage | null,
  character: CharacterSheet,
  idea: StickerIdea,
  style: StickerStyle,
): Promise<string> {
  const content: Anthropic.Beta.Messages.BetaContentBlockParam[] = [];
  if (image) content.push({ type: "image", source: { type: "base64", ...image } });
  content.push({
    type: "text",
    text:
      `Draw ONE die-cut sticker of this person as a ${style} character.\n\n` +
      `Character sheet (stay faithful to it so every sticker in the pack looks like the same person):\n` +
      `${JSON.stringify(character, null, 2)}\n\n` +
      `Sticker: "${idea.title}" — ${idea.pose_and_scene}\n` +
      (idea.caption
        ? `Caption text to letter into the art: "${idea.caption}" (bold, rounded, high-contrast, inside a banner or speech bubble, fully inside the canvas).\n`
        : "No caption text.\n") +
      `Style: ${STYLE_GUIDE[style]}`,
  });

  const message = await callClaude({
    max_tokens: 32000,
    output_config: { effort: DRAW_EFFORT },
    system:
      "You are an expert sticker illustrator who draws directly in hand-written SVG.\n" +
      "Output requirements:\n" +
      '- Reply with ONLY one <svg> element: xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512". No markdown fences, no commentary.\n' +
      "- Transparent background: do NOT draw a full-canvas background rect. The artwork is one connected, compact shape centred in the canvas, filling ~80% of it with ≥24px clear margin on every side (a white die-cut border is added later).\n" +
      "- Allowed elements: g, path, circle, ellipse, rect, polygon, polyline, line, text, tspan, defs, linearGradient, radialGradient, stop, clipPath. No <image>, <script>, <style>, <foreignObject>, filters, external links or web fonts. Text uses font-family=\"Arial Rounded MT Bold, Arial, Helvetica, sans-serif\".\n" +
      "- Caption text must fit inside its banner/bubble with padding: estimate width ≈ 0.62 × font-size × characters and size the banner (or reduce the font) so nothing is clipped. Give <text> its own fill and stroke=\"none\" (never inherit a group stroke) so letters stay crisp.\n" +
      "- Quality bar: polished, professional sticker art with smooth bezier paths, a consistent bold outer outline, 1–2 shading tones, clean highlights, and a likeness that is clearly the person (hair shape and colour, skin tone, glasses, facial hair, outfit colours).\n" +
      "- Be kind and flattering: never exaggerate or alter facial features, skin tone or body shape; no mocking caricature. Do not imitate any studio, brand or artist.\n" +
      "- Keep it under ~14 KB.",
    messages: [{ role: "user", content }],
  });

  return sanitizeSvg(textOf(message));
}

/** Allow-list the SVG Claude produced so it is safe and printable. */
export function sanitizeSvg(raw: string): string {
  const start = raw.indexOf("<svg");
  const end = raw.lastIndexOf("</svg>");
  if (start === -1 || end === -1) {
    throw new StickerError("Claude did not return a valid SVG sticker. Please retry.", 502);
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
    : "Chibi cartoon";
}
