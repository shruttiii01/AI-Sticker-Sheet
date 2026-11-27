/**
 * Helpers for Gemini's raster stickers: remove the plain background so the
 * character sits on the #DYPBSAICoE sticker card like Gemini's vector art does.
 */

function load(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read the painted sticker.'));
    img.src = src;
  });
}

/**
 * Flood-fill from the image border, clearing pixels close to the background
 * colour. Only background connected to the edge is removed, so white details
 * inside the character (eyes, teeth, shirt) stay. Edges get a 2px soft feather.
 */
export async function removePlainBackground(dataUrl: string, maxSize = 1024): Promise<string> {
  const img = await load(dataUrl);
  const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const im = ctx.getImageData(0, 0, w, h);
  const d = im.data;

  // Background colour = average of the four corners (should be ~white).
  const corner = (x: number, y: number) => {
    const i = (y * w + x) * 4;
    return [d[i], d[i + 1], d[i + 2]];
  };
  const cs = [corner(2, 2), corner(w - 3, 2), corner(2, h - 3), corner(w - 3, h - 3)];
  const bg = [0, 1, 2].map((c) => cs.reduce((s, p) => s + p[c], 0) / 4);
  const dist = (i: number) => Math.hypot(d[i] - bg[0], d[i + 1] - bg[1], d[i + 2] - bg[2]);
  const TOL = 38;

  const cleared = new Uint8Array(w * h);
  const stack: number[] = [];
  const seed = (x: number, y: number) => {
    const p = y * w + x;
    if (!cleared[p] && dist(p * 4) < TOL) {
      cleared[p] = 1;
      stack.push(p);
    }
  };
  for (let x = 0; x < w; x++) {
    seed(x, 0);
    seed(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    seed(0, y);
    seed(w - 1, y);
  }
  while (stack.length) {
    const p = stack.pop()!;
    const x = p % w;
    const y = (p - x) / w;
    if (x > 0) seed(x - 1, y);
    if (x < w - 1) seed(x + 1, y);
    if (y > 0) seed(x, y - 1);
    if (y < h - 1) seed(x, y + 1);
  }

  for (let p = 0; p < w * h; p++) {
    if (cleared[p]) {
      d[p * 4 + 3] = 0;
      continue;
    }
    // Feather pixels that touch the cleared background and are still close to it.
    const x = p % w;
    const y = (p - x) / w;
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++)
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < w && ny < h && cleared[ny * w + nx]) {
          near = true;
          break;
        }
      }
    if (near) {
      const k = Math.min(1, dist(p * 4) / (TOL * 2.2));
      d[p * 4 + 3] = Math.round(d[p * 4 + 3] * k);
    }
  }

  // If almost nothing was removed (the model drew a scene), keep the original.
  const clearedShare = cleared.reduce((a, b) => a + b, 0) / (w * h);
  if (clearedShare < 0.08) return dataUrl;
  ctx.putImageData(im, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Wrap a raster image in an SVG so it can go through the same sticker-card renderer as Claude's art. */
export function rasterToSvg(dataUrl: string, size = 1024): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><image href="${dataUrl}" xlink:href="${dataUrl}" x="0" y="0" width="${size}" height="${size}" preserveAspectRatio="xMidYMid meet"/></svg>`;
}
