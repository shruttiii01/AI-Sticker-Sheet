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

export async function applyStickerStyleFilter(
  photoDataUrl: string,
  style: StickerStyle
): Promise<string> {
  const img = await loadImg(photoDataUrl);

  if (style === "Pixel art") {
    const grid = 52;
    const tiny = document.createElement("canvas");
    tiny.width = grid;
    tiny.height = grid;
    const tCtx = tiny.getContext("2d");
    if (!tCtx) return photoDataUrl;

    tCtx.filter = "saturate(1.28) contrast(1.12) brightness(1.04)";
    tCtx.drawImage(img, 0, 0, grid, grid);

    // Light palette snapping for crisp retro pixel look
    const tinyData = tCtx.getImageData(0, 0, grid, grid);
    const d = tinyData.data;
    for (let i = 0; i < d.length; i += 4) {
      d[i] = quantizeChannel(d[i], 24);
      d[i + 1] = quantizeChannel(d[i + 1], 24);
      d[i + 2] = quantizeChannel(d[i + 2], 24);
    }
    tCtx.putImageData(tinyData, 0, 0);

    const out = document.createElement("canvas");
    out.width = OUTPUT_SIZE;
    out.height = OUTPUT_SIZE;
    const oCtx = out.getContext("2d");
    if (!oCtx) return photoDataUrl;
    oCtx.imageSmoothingEnabled = false;
    oCtx.drawImage(tiny, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
    return out.toDataURL("image/jpeg", 0.92);
  }

  // Flat cartoon or Comic: work on 360x360 buffer for fast, flattering ink + cel shading
  const workSize = 360;
  const work = document.createElement("canvas");
  work.width = workSize;
  work.height = workSize;
  const wCtx = work.getContext("2d");
  if (!wCtx) return photoDataUrl;

  const isComic = style === "Comic";

  // Smooth base pass for cel-shaded skin & clothing
  wCtx.filter = isComic
    ? "saturate(1.26) contrast(1.15) brightness(1.04) blur(1.2px)"
    : "saturate(1.18) contrast(1.06) brightness(1.04) blur(1.8px)";
  wCtx.drawImage(img, 0, 0, workSize, workSize);
  wCtx.filter = "none";

  const srcData = wCtx.getImageData(0, 0, workSize, workSize);
  const pixels = srcData.data;

  // Luminance buffer for Sobel edge detection
  const lum = new Float32Array(workSize * workSize);
  for (let i = 0, p = 0; i < pixels.length; i += 4, p++) {
    lum[p] = 0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2];
  }

  // Soft color posterization preserving natural skin warmth
  const step = isComic ? 26 : 30;
  for (let y = 0; y < workSize; y++) {
    for (let x = 0; x < workSize; x++) {
      const idx = (y * workSize + x) * 4;
      let r = pixels[idx] * 0.45 + quantizeChannel(pixels[idx], step) * 0.55;
      let g =
        pixels[idx + 1] * 0.45 + quantizeChannel(pixels[idx + 1], step) * 0.55;
      let b =
        pixels[idx + 2] * 0.45 + quantizeChannel(pixels[idx + 2], step) * 0.55;

      // Subtle Ben-Day comic dot pattern in darker midtones for Comic style
      if (isComic) {
        const l = lum[y * workSize + x];
        if (l < 135) {
          const gx = (x % 6) - 2.5;
          const gy = (y % 6) - 2.5;
          if (gx * gx + gy * gy < 2.2) {
            r *= 0.84;
            g *= 0.84;
            b *= 0.86;
          }
        }
      }

      pixels[idx] = Math.min(255, Math.max(0, r));
      pixels[idx + 1] = Math.min(255, Math.max(0, g));
      pixels[idx + 2] = Math.min(255, Math.max(0, b));
    }
  }

  // Sobel edge ink lines (#15233F deep navy ink)
  const threshold = isComic ? 68 : 88;
  const maxInkAlpha = isComic ? 0.82 : 0.55;
  const inkR = 21;
  const inkG = 35;
  const inkB = 63;

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
        const alpha = Math.min(
          maxInkAlpha,
          ((mag - threshold) / (threshold * 1.4)) * maxInkAlpha
        );
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

  // Clean subtle comic inner border on the square portrait frame for Comic style
  if (isComic) {
    oCtx.strokeStyle = "#15233F";
    oCtx.lineWidth = 8;
    oCtx.strokeRect(4, 4, OUTPUT_SIZE - 8, OUTPUT_SIZE - 8);
  }

  return out.toDataURL("image/jpeg", 0.92);
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}
