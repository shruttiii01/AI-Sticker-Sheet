import type { StickerStyle } from "../types";

const OUTPUT_SIZE = 720;

export function captureVideoFrameAsSquare(
  video: HTMLVideoElement,
  mirror: boolean
): string {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) {
    throw new Error("Camera stream is not ready yet.");
  }

  const side = Math.min(vw, vh);
  const sx = (vw - side) / 2;
  const sy = (vh - side) / 2;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable.");
  }

  if (mirror) {
    ctx.translate(OUTPUT_SIZE, 0);
    ctx.scale(-1, 1);
  }

  ctx.drawImage(video, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  return canvas.toDataURL("image/jpeg", 0.9);
}

export function processUploadedImageAsSquare(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;
        const side = Math.min(iw, ih);
        const sx = (iw - side) / 2;
        const sy = Math.max(0, (ih - side) * 0.25);

        const canvas = document.createElement("canvas");
        canvas.width = OUTPUT_SIZE;
        canvas.height = OUTPUT_SIZE;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context unavailable."));
          return;
        }
        ctx.drawImage(img, sx, sy, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
        resolve(canvas.toDataURL("image/jpeg", 0.9));
      };
      img.onerror = () =>
        reject(new Error("Could not decode the selected image file."));
      img.src = reader.result as string;
    };
    reader.onerror = () =>
      reject(new Error("Could not read the selected image file."));
    reader.readAsDataURL(file);
  });
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load photo for styling."));
    img.src = src;
  });
}

function quantizeChannel(val: number, step: number): number {
  return Math.min(255, Math.max(0, Math.round(val / step) * step));
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h = 0;
  if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
  else if (max === gn) h = (bn - rn) / d + 2;
  else h = (rn - gn) / d + 4;
  return [h / 6, s, l];
}

function hue2rgb(p: number, q: number, t: number): number {
  let tt = t;
  if (tt < 0) tt += 1;
  if (tt > 1) tt -= 1;
  if (tt < 1 / 6) return p + (q - p) * 6 * tt;
  if (tt < 1 / 2) return q;
  if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
  return p;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  if (s === 0) {
    const v = Math.round(l * 255);
    return [v, v, v];
  }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [
    Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    Math.round(hue2rgb(p, q, h) * 255),
    Math.round(hue2rgb(p, q, h - 1 / 3) * 255),
  ];
}

/**
 * Fast separable edge-preserving bilateral filter:
 * Flattens skin pores & photographic grain into clean cartoon paint planes
 * while keeping eyes, eyebrows, glasses, lips, and hair contours razor-sharp.
 */
function bilateralPass(
  src: Float32Array,
  dst: Float32Array,
  w: number,
  h: number,
  radius: number,
  sigmaRange: number,
  horizontal: boolean
) {
  const twoSigmaSq = 2 * sigmaRange * sigmaRange;
  const spatialSigma = radius * 0.85;
  const twoSpatialSq = 2 * spatialSigma * spatialSigma;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cIdx = (y * w + x) * 3;
      const cr = src[cIdx];
      const cg = src[cIdx + 1];
      const cb = src[cIdx + 2];

      let sumR = 0;
      let sumG = 0;
      let sumB = 0;
      let sumW = 0;

      for (let k = -radius; k <= radius; k++) {
        const nx = horizontal ? Math.min(w - 1, Math.max(0, x + k)) : x;
        const ny = horizontal ? y : Math.min(h - 1, Math.max(0, y + k));
        const nIdx = (ny * w + nx) * 3;
        const nr = src[nIdx];
        const ng = src[nIdx + 1];
        const nb = src[nIdx + 2];

        const dr = nr - cr;
        const dg = ng - cg;
        const db = nb - cb;
        const colorDistSq = dr * dr + dg * dg + db * db;
        const weight = Math.exp(-(k * k) / twoSpatialSq - colorDistSq / twoSigmaSq);

        sumR += nr * weight;
        sumG += ng * weight;
        sumB += nb * weight;
        sumW += weight;
      }

      dst[cIdx] = sumR / sumW;
      dst[cIdx + 1] = sumG / sumW;
      dst[cIdx + 2] = sumB / sumW;
    }
  }
}

export async function applyStickerStyleFilter(
  photoDataUrl: string,
  style: StickerStyle
): Promise<string> {
  const img = await loadImg(photoDataUrl);

  if (style === "Pixel art") {
    const grid = 48;
    const tiny = document.createElement("canvas");
    tiny.width = grid;
    tiny.height = grid;
    const tCtx = tiny.getContext("2d");
    if (!tCtx) return photoDataUrl;

    tCtx.filter = "saturate(1.42) contrast(1.18) brightness(1.06)";
    tCtx.drawImage(img, 0, 0, grid, grid);

    const tinyData = tCtx.getImageData(0, 0, grid, grid);
    const d = tinyData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = quantizeChannel(d[i], 32);
      d[i + 1] = quantizeChannel(d[i + 1], 32);
      d[i + 2] = quantizeChannel(d[i + 2], 32);
    }
    tCtx.putImageData(tinyData, 0, 0);

    const out = document.createElement("canvas");
    out.width = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const oCtx = out.getContext("2d");
    if (!oCtx) return photoDataUrl;
    oCtx.imageSmoothingEnabled = false;
    oCtx.drawImage(tiny, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    oCtx.strokeStyle = "#15233F";
    oCtx.lineWidth = 10;
    oCtx.strokeRect(5, 5, OUTPUT_SIZE - 10, OUTPUT_SIZE - 10);
    return out.toDataURL("image/jpeg", 0.92);
  }

  // Flat cartoon or Comic: true edge-preserving cartoon cel-shading + bold ink lines
  const workSize = 340;
  const work = document.createElement("canvas");
  work.width = workSize;
  work.height = workSize;
  const wCtx = work.getContext("2d");
  if (!wCtx) return photoDataUrl;

  const isComic = style === "Comic";
  const is3DAnime = style === "3D anime";
  const isRetro = style === "Retro style";
  wCtx.drawImage(img, 0, 0, workSize, workSize);

  const srcData = wCtx.getImageData(0, 0, workSize, workSize);
  const pixels = srcData.data;
  const totalPixels = workSize * workSize;

  // 1. Separable bilateral smoothing for clean cartoon / 3D anime / retro paint planes
  let bufA = new Float32Array(totalPixels * 3);
  let bufB = new Float32Array(totalPixels * 3);
  for (let i = 0, p = 0; i < pixels.length; i += 4, p += 3) {
    bufA[p] = pixels[i];
    bufA[p + 1] = pixels[i + 1];
    bufA[p + 2] = pixels[i + 2];
  }

  const passes = is3DAnime ? 3 : 2;
  for (let iter = 0; iter < passes; iter++) {
    bilateralPass(bufA, bufB, workSize, workSize, 4, is3DAnime ? 46 : 42, true);
    bilateralPass(bufB, bufA, workSize, workSize, 4, is3DAnime ? 46 : 42, false);
  }

  // 2. Luminance map from smoothed planes (prevents skin-pore speckle edges)
  const lum = new Float32Array(totalPixels);
  for (let p = 0; p < totalPixels; p++) {
    const idx = p * 3;
    lum[p] = 0.299 * bufA[idx] + 0.587 * bufA[idx + 1] + 0.114 * bufA[idx + 2];
  }

  // 3. Vibrant cartoon HSL saturation + cel-shaded luminance quantization
  const celBands = isComic ? 5 : is3DAnime ? 8 : isRetro ? 5 : 6;
  const satBoost = isComic ? 1.48 : is3DAnime ? 1.42 : isRetro ? 1.18 : 1.38;

  for (let y = 0; y < workSize; y++) {
    for (let x = 0; x < workSize; x++) {
      const p = y * workSize + x;
      const cIdx = p * 3;
      const idx = p * 4;

      const [h, s, l] = rgbToHsl(bufA[cIdx], bufA[cIdx + 1], bufA[cIdx + 2]);
      const boostedS = Math.min(0.92, s * satBoost);
      const liftedL = Math.min(0.96, Math.max(0.05, l * (is3DAnime ? 1.07 : 1.04) + 0.02));
      const celL = Math.round(liftedL * celBands) / celBands;
      const celMix = is3DAnime ? 0.45 : 0.78;
      const finalL = liftedL * (1 - celMix) + celL * celMix;

      let [r, g, b] = hslToRgb(h, boostedS, finalL);

      // Warm 70s/80s retro palette shift (golden highlights, warm teal/cocoa shadows)
      if (isRetro) {
        r = r * 1.06 + 12;
        g = g * 1.01 + 4;
        b = b * 0.86;
      }

      // Subtle Ben-Day comic dots in shadow areas for Comic & Retro styles
      if ((isComic || isRetro) && lum[p] < 120) {
        const gx = (x % 6) - 2.5;
        const gy = (y % 6) - 2.5;
        if (gx * gx + gy * gy < 2.2) {
          r *= 0.82;
          g *= 0.82;
          b *= 0.86;
        }
      }

      pixels[idx] = Math.min(255, Math.max(0, r));
      pixels[idx + 1] = Math.min(255, Math.max(0, g));
      pixels[idx + 2] = Math.min(255, Math.max(0, b));
    }
  }

  // 4. Clean Sobel + local dark-crease detection on smoothed luminance for bold cartoon ink lines
  const rawEdge = new Float32Array(totalPixels);
  const threshold = isComic ? 48 : is3DAnime ? 62 : 54;
  for (let y = 1; y < workSize - 1; y++) {
    for (let x = 1; x < workSize - 1; x++) {
      const i = y * workSize + x;
      const gx =
        -lum[i - workSize - 1] +
        lum[i - workSize + 1] -
        2 * lum[i - 1] +
        2 * lum[i + 1] -
        lum[i + workSize - 1] +
        lum[i + workSize + 1];
      const gy =
        -lum[i - workSize - 1] -
        2 * lum[i - workSize] -
        lum[i - workSize + 1] +
        lum[i + workSize - 1] +
        2 * lum[i + workSize] +
        lum[i + workSize + 1];

      const mag = Math.sqrt(gx * gx + gy * gy);
      if (mag > threshold) {
        rawEdge[i] = Math.min(1, (mag - threshold) / (threshold * 0.95));
      }
    }
  }

  // Suppress isolated 1px speckles, then dilate into bold #15233F cartoon ink outlines
  const maxInkAlpha = isComic ? 0.96 : 0.9;
  const inkR = 21;
  const inkG = 35;
  const inkB = 63;

  for (let y = 1; y < workSize - 1; y++) {
    for (let x = 1; x < workSize - 1; x++) {
      const i = y * workSize + x;
      const neighborMax = Math.max(
        rawEdge[i - 1],
        rawEdge[i + 1],
        rawEdge[i - workSize],
        rawEdge[i + workSize]
      );
      const dilated = Math.max(
        neighborMax > 0.15 ? rawEdge[i] : rawEdge[i] * 0.35,
        neighborMax * 0.78
      );
      if (dilated > 0.08) {
        const alpha = Math.min(maxInkAlpha, dilated * maxInkAlpha);
        const idx = i * 4;
        pixels[idx] = pixels[idx] * (1 - alpha) + inkR * alpha;
        pixels[idx + 1] = pixels[idx + 1] * (1 - alpha) + inkG * alpha;
        pixels[idx + 2] = pixels[idx + 2] * (1 - alpha) + inkB * alpha;
      }
    }
  }

  wCtx.putImageData(srcData, 0, 0);

  const out = document.createElement("canvas");
  out.width = OUTPUT_SIZE;
  out.height = OUTPUT_SIZE;
  const oCtx = out.getContext("2d");
  if (!oCtx) return photoDataUrl;
  oCtx.imageSmoothingEnabled = true;
  oCtx.drawImage(work, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  // Subtle cartoon top-left gloss highlight + crisp comic ink border inside the square frame
  const gloss = oCtx.createLinearGradient(0, 0, OUTPUT_SIZE * 0.55, OUTPUT_SIZE * 0.55);
  gloss.addColorStop(0, "rgba(255, 255, 255, 0.14)");
  gloss.addColorStop(1, "rgba(255, 255, 255, 0)");
  oCtx.fillStyle = gloss;
  oCtx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  oCtx.strokeStyle = "#15233F";
  oCtx.lineWidth = isComic ? 12 : 8;
  const half = oCtx.lineWidth / 2;
  oCtx.strokeRect(half, half, OUTPUT_SIZE - oCtx.lineWidth, OUTPUT_SIZE - oCtx.lineWidth);

  return out.toDataURL("image/jpeg", 0.92);
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
