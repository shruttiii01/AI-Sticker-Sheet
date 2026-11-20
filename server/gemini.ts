import { ApiError, GoogleGenAI } from '@google/genai';
import { STYLE_GUIDE, StickerError, type CharacterSheet, type StickerIdea, type StickerStyle } from './claude';

/**
 * Gemini sticker painter.
 *
 * Claude studies the photo and plans the pack (see claude.ts); Gemini paints each
 * sticker as a full-colour raster illustration in the DYP AI CoE look. The browser
 * removes the plain background and frames it as a die-cut #DYPAICoE sticker.
 */

type ImagePart = { media_type: string; data: string };

let client: GoogleGenAI | null = null;
export function hasGemini(): boolean {
  const k = process.env.GEMINI_API_KEY;
  return Boolean(k && k !== 'MY_GEMINI_API_KEY');
}
function getClient(): GoogleGenAI {
  if (!hasGemini()) throw new StickerError('GEMINI_API_KEY is not set. Run ./scripts/set-api-key.sh GEMINI_API_KEY and restart.', 503);
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

/* ---------------- model selection ---------------- */
let resolvedModel: string | null = process.env.GEMINI_IMAGE_MODEL || null;
let resolving: Promise<string> | null = null;
const FALLBACK_MODEL = 'gemini-3.1-flash-lite-image';

/**
 * Score image-capable Gemini models: newest version first, and the full Flash model
 * over Pro (cheaper per image, still high quality) and over "lite".
 * Set GEMINI_IMAGE_MODEL (e.g. gemini-3-pro-image) to force a specific model.
 */
function scoreModel(name: string): number {
  const version = Number(name.match(/gemini-(\d+(?:\.\d+)?)/)?.[1] ?? 0);
  let s = version * 100;
  if (/flash/.test(name) && !/lite/.test(name)) s += 30;
  else if (/pro/.test(name)) s += 20;
  if (/lite/.test(name)) s -= 10;
  if (/preview|exp/.test(name)) s -= 5;
  return s;
}

export async function getImageModel(): Promise<string> {
  if (resolvedModel) return resolvedModel;
  resolving ??= (async () => {
    try {
      const pager = await getClient().models.list();
      const names: string[] = [];
      for await (const m of pager) {
        const name = (m.name ?? '').replace(/^models\//, '');
        const actions = m.supportedActions ?? [];
        if (/^gemini-.*image/.test(name) && (!actions.length || actions.includes('generateContent'))) names.push(name);
      }
      names.sort((a, b) => scoreModel(b) - scoreModel(a));
      resolvedModel = names[0] ?? FALLBACK_MODEL;
    } catch {
      resolvedModel = FALLBACK_MODEL;
    }
    console.log(`[gemini] sticker painter model: ${resolvedModel}`);
    return resolvedModel;
  })();
  return resolving;
}
export const currentImageModel = () => resolvedModel;

/* ---------------- painting ---------------- */
const BRAND =
  'This sticker is for the launch of the DYP AI Centre of Excellence (#DYPAICoE) at Dr. D. Y. Patil B-School, Pune. ' +
  'Use the brand palette as accents: deep navy #0b1f4b, warm gold #F2B33D and saffron #E8742A (e.g. trims on clothing, props, small sparkles), ' +
  'with optional subtle AI / innovation motifs (glowing circuit sparkles, a tiny robot buddy, a lightbulb, a laptop) when they fit the scene.';

function buildPrompt(character: CharacterSheet, idea: StickerIdea, style: StickerStyle): string {
  return [
    `Create ONE sticker illustration of the person in the reference photo, as a ${style} character.`,
    `Scene: "${idea.title}". ${idea.pose_and_scene}`,
    `Art style: ${STYLE_GUIDE[style]}`,
    BRAND,
    `Likeness (stay faithful, flattering and kind): ${character.summary}. Hair: ${character.hair_style} (${character.hair_color_hex}). ` +
      `Skin tone ${character.skin_tone_hex}. Eyewear: ${character.glasses}. Facial hair: ${character.facial_hair}. Headwear: ${character.headwear}. ` +
      `Outfit: ${character.top_description} (${character.top_color_hex}). Accessories: ${character.accessories}. Expression: ${character.expression}.`,
    'Never exaggerate or change facial features, skin tone or body shape. Do not imitate any film studio, brand or artist.',
    'Composition: one character, centred, filling about 80% of a square canvas, with clear space on every side.',
    'Background: a completely flat, solid pure white (#FFFFFF) background with no shadows, gradients, scenery, frame or border.',
    'No text, letters, numbers, logos or watermarks anywhere in the image (captions are added later).',
  ].join('\n');
}

export async function paintSticker(
  image: ImagePart | null,
  character: CharacterSheet,
  idea: StickerIdea,
  style: StickerStyle,
): Promise<{ dataUrl: string; model: string }> {
  const model = await getImageModel();
  const parts: { text?: string; inlineData?: { data: string; mimeType: string } }[] = [];
  if (image) parts.push({ inlineData: { data: image.data, mimeType: image.media_type } });
  parts.push({ text: buildPrompt(character, idea, style) });

  try {
    const response = await getClient().models.generateContent({
      model,
      contents: [{ role: 'user', parts }],
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: { aspectRatio: '1:1' },
      },
    });
    const block = response.promptFeedback?.blockReason;
    const cand = response.candidates?.[0];
    for (const part of cand?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        return { dataUrl: `data:${part.inlineData.mimeType ?? 'image/png'};base64,${part.inlineData.data}`, model };
      }
    }
    if (block || /SAFETY|PROHIBITED|BLOCK/i.test(String(cand?.finishReason ?? ''))) {
      throw new StickerError('Gemini declined to paint this sticker. Try a different photo or style.', 422);
    }
    throw new StickerError('Gemini returned no image. Please retry.', 502);
  } catch (err) {
    if (err instanceof StickerError) throw err;
    if (err instanceof ApiError) {
      if (err.status === 400 && /API key/i.test(err.message)) throw new StickerError('The Gemini API key was rejected. Check GEMINI_API_KEY.', 401);
      if (err.status === 401 || err.status === 403)
        throw new StickerError('Gemini refused the key or model (403). Image generation may need a billing-enabled key.', err.status);
      if (err.status === 404) {
        resolvedModel = null;
        resolving = null;
        throw new StickerError(`Gemini image model "${model}" isn't available for this key. Please retry.`, 502);
      }
      if (err.status === 429) throw new StickerError('Gemini is rate-limited or out of quota right now. Wait a moment and retry.', 429);
      throw new StickerError(`Gemini API error (${err.status}): ${err.message.slice(0, 200)}`, 502);
    }
    throw err;
  }
}
