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

/** Hard cap on stickers per pack (enforced server-side for every route). */
export const MAX_STICKERS = 3;
const DRAW_EFFORT = (process.env.STICKER_EFFORT || "medium") as
  | "low"
  | "medium"
  | "high";

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
              `Build the character sheet for the main person in this photo, then propose exactly ${opts.count} cute cartoon caricature sticker ideas.\n` +
              `Theme / vibe for the pack: ${opts.vibe || "fun everyday laptop & phone stickers"}.\n` +
              (opts.name ? `Their first name is ${opts.name}; keep hashtags focused on their look, mood, activity, or personality.\n` : "") +
              "For each idea:\n" +
              "- title: short 2–3 word title.\n" +
              "- caption: ONE short, catchy, accurately spelled hashtag starting with '#' that directly relates to the person's look, mood, activity, or personality in the photo (for example: #ChaiLover, #GymBro, #SelfieQueen, #TravelMode, #CoolVibes, #chillin, #guidingstar).\n" +
              "- pose_and_scene: one sentence describing a centred half-body or full-body cute cartoon caricature pose with a slightly exaggerated expressive face, recognizable outfit/accessories, and 1–2 fun props.\n" +
              "Make the ideas varied and positive. If no person is clearly visible, set person_found=false and explain briefly.",
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
      `Turn this person into ONE unmistakable cute cartoon character / caricature illustration in ${style} style.\n\n` +
      `Character sheet (keep face likeness, hairstyle, skin tone, clothes, eyewear, and accessories clearly recognizable):\n` +
      `${JSON.stringify(character, null, 2)}\n\n` +
      `Pose & scene: "${idea.title}" — ${idea.pose_and_scene}\n` +
      "Draw ONLY the centred half-body or full-body cartoon character + 1–2 fun props on a transparent background (do NOT draw a square card background, hashtag text, or white sticker border — the uniform square cartoon sticker frame, hashtag lettering, and die-cut border are added automatically).\n" +
      `Style: ${STYLE_GUIDE[style]}`,
  });

  const message = await callClaude({
    max_tokens: 32000,
    output_config: { effort: DRAW_EFFORT },
    system:
      "You are a lead 2D animation & cartoon character illustrator who draws expressive, charming cartoon characters in hand-written SVG.\n" +
      "Output requirements:\n" +
      '- Reply with ONLY one <svg> element: xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512". No markdown fences, no commentary.\n' +
      "- Transparent background: do NOT draw a full-canvas background rect or outer sticker card. Draw one compact, centred half-body or full-body cartoon character filling ~82% of the canvas with >=24px clear margin on every side.\n" +
      "- Allowed elements: g, path, circle, ellipse, rect, polygon, polyline, line, defs, linearGradient, radialGradient, stop, clipPath. No <text>, <image>, <script>, <style>, <foreignObject>, filters, external links or web fonts.\n" +
      "- Must look unmistakably like a CARTOON CHARACTER (not a geometric icon or realistic portrait): draw an oversized expressive cartoon head (~38–44% of figure height), big bright cartoon eyes with dark pupils and 2 crisp white glossy catchlight circles, expressive curved eyebrows, cute stylized nose, lively exaggerated smile/grin, soft rosy cheek blush ovals, sculpted swooping hair clumps with glossy highlight arcs, and expressive cartoon hands/pose.\n" +
      "- Bold cartoon ink & 3-tone cel shading: wrap every silhouette, hair lock, facial feature, clothing fold, and prop in clean thick dark ink strokes (stroke=\"#15233F\" stroke-width=\"5\" to \"8\" stroke-linecap=\"round\" stroke-linejoin=\"round\") with rich vibrant colours plus a clean cel shadow crescent and highlight rim.\n" +
      "- Keep it warm, charming, and flattering without mocking distortion. Keep SVG under ~14 KB.",
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
    : "Cute caricature";
}
