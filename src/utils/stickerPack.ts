/**
 * Turns Gemini's SVG artwork into printable die-cut stickers and packs them
 * onto A4 pages at real-world sizes for different surfaces.
 */

export interface StickerUseCase {
  id: string;
  label: string;
  hint: string;
  /** Printed sticker sizes in mm (square bounding box) generated per copy. */
  sizesMm: number[];
}

export const STICKER_USE_CASES: StickerUseCase[] = [
  { id: "laptop", label: "Laptop lid", hint: "70 mm – bold statement stickers", sizesMm: [70] },
  { id: "phone", label: "Phone case", hint: "40 mm – fits behind a phone or in a clear case", sizesMm: [40] },
  { id: "bottle", label: "Water bottle", hint: "55 mm – wraps nicely on bottles & flasks", sizesMm: [55] },
  { id: "notebook", label: "Notebook & planner", hint: "30 mm – mini stickers for journals", sizesMm: [30] },
  { id: "mixed", label: "Mixed pack", hint: "Each design at 70, 40 and 25 mm", sizesMm: [70, 40, 25] },
];

export const A4 = { w: 210, h: 297 };
const PAGE_MARGIN_MM = 8;
const GAP_MM = 3;
/** Space between two size bands on the same page. */
const BAND_GAP_MM = 5;

export interface PlacedSticker {
  src: string;
  xMm: number;
  yMm: number;
  sizeMm: number;
}

/**
 * Lays stickers out as straight rectangular grids that fill the whole A4 page, so a
 * sheet can be cut apart with a ruler (every row and column lines up).
 *
 * - Each size gets its own band of full rows; the smallest size fills whatever height is left.
 * - `copies` is a minimum: empty cells are filled with more stickers instead of wasting paper.
 * - Designs are spread so no sticker sits next to (or directly under) the same design,
 *   and every design appears as evenly as possible.
 */
export function packStickers(
  stickers: string[],
  useCase: StickerUseCase,
  copies: number,
): PlacedSticker[][] {
  const designs = [...new Set(stickers)].filter(Boolean);
  if (!designs.length) return [];
  const n = designs.length;
  const sizes = [...useCase.sizesMm].sort((a, b) => b - a);
  const usableW = A4.w - 2 * PAGE_MARGIN_MM;
  const maxY = A4.h - PAGE_MARGIN_MM;

  const cols = (size: number) => Math.max(1, Math.floor((usableW + GAP_MM) / (size + GAP_MM)));
  const rowsNeeded = (size: number) => Math.max(1, Math.ceil((n * Math.max(1, copies)) / cols(size)));

  const pages: PlacedSticker[][] = [];
  let page: PlacedSticker[] = [];
  let y = PAGE_MARGIN_MM;
  let pick = 0; // round-robin counter so designs stay balanced across the sheet
  let prevRow: string[] | null = null;
  let prevSize = 0;

  const placeRow = (size: number) => {
    if (size !== prevSize) {
      if (page.length) y += BAND_GAP_MM - GAP_MM; // a little extra air between size bands
      prevRow = null;
    }
    const c = cols(size);
    const rowW = c * size + (c - 1) * GAP_MM;
    const x0 = (A4.w - rowW) / 2; // centre the grid so left/right margins match
    const row: string[] = [];
    for (let i = 0; i < c; i++) {
      // next design in rotation that differs from its left and upper neighbour
      let src = designs[pick % n];
      for (let k = 0; k < n; k++) {
        const cand = designs[(pick + k) % n];
        if (n === 1 || (cand !== row[i - 1] && cand !== prevRow?.[i])) {
          src = cand;
          pick += k;
          break;
        }
      }
      pick++;
      row.push(src);
      page.push({ src, xMm: x0 + i * (size + GAP_MM), yMm: y, sizeMm: size });
    }
    y += size + GAP_MM;
    prevRow = row;
    prevSize = size;
  };
  const fits = (size: number) => y + (size !== prevSize && page.length ? BAND_GAP_MM - GAP_MM : 0) + size <= maxY;

  const smallest = sizes[sizes.length - 1];
  const fillers = [55, 40, 30, 25, 20].filter((f) => f < smallest);
  const needs = sizes.map(rowsNeeded);

  for (let guard = 0; guard < 50 && needs.some((r) => r > 0); guard++) {
    page = [];
    y = PAGE_MARGIN_MM;
    prevRow = null;
    prevSize = 0;
    // 1) the rows each size needs, biggest first; a size that no longer fits falls through to smaller ones
    sizes.forEach((size, i) => {
      while (needs[i] > 0 && fits(size)) {
        placeRow(size);
        needs[i]--;
      }
    });
    // 2) never leave blank paper: keep adding the smallest size, then smaller filler sizes
    for (;;) {
      const size = [smallest, ...fillers].find(fits);
      if (!size) break;
      placeRow(size);
    }
    if (!page.length) break;
    pages.push(page);
  }
  return pages;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not render sticker artwork."));
    img.src = src;
  });
}

export function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeCanvas(size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  return { canvas, ctx };
}

/** Bounding box of non-transparent pixels, or null if the canvas is empty. */
function alphaBounds(canvas: HTMLCanvasElement) {
  const { width, height } = canvas;
  const data = canvas.getContext("2d")!.getImageData(0, 0, width, height).data;
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 8) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

/** Soft glowing white silhouette behind the cartoon character inside the square card. */
function outline(source: HTMLCanvasElement, radius: number, color: string) {
  const { canvas, ctx } = makeCanvas(source.width);
  const steps = 28;
  for (const r of [radius, radius * 0.65, radius * 0.3]) {
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      ctx.drawImage(source, Math.cos(a) * r, Math.sin(a) * r);
    }
  }
  ctx.drawImage(source, 0, 0);
  ctx.globalCompositeOperation = "source-in";
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  return canvas;
}

function drawRoundedSquareRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawFourPointSparkle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, -r);
  ctx.lineTo(r * 0.28, -r * 0.28);
  ctx.lineTo(r, 0);
  ctx.lineTo(r * 0.28, r * 0.28);
  ctx.lineTo(0, r);
  ctx.lineTo(-r * 0.28, r * 0.28);
  ctx.lineTo(-r, 0);
  ctx.lineTo(-r * 0.28, -r * 0.28);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = "#15233F";
  ctx.lineWidth = Math.max(3, r * 0.16);
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Rasterise an SVG cartoon character into a uniform 1:1 square cartoon sticker:
 * - Identical square card formation, border, shadow, and layout on every sticker
 * - Thick white vinyl square border + bold #15233F comic ink frame + offset shadow
 * - Soft cartoon burst backdrop + comic halftone corner dots + corner sparkle stars
 * - Centered cartoon character with crisp white sticker-pop halo
 * - Bold playful cartoon hashtag lettering below the character
 * - Consistent lower #DYPAICoE stamp badge
 */
export async function svgToDieCutPng(
  svg: string,
  artPx = 1200,
  stickerTag = "#DYPAICoE",
  captionHashtag = "",
): Promise<string> {
  const img = await loadImage(svgToDataUrl(svg));
  const size = artPx;
  const tag = stickerTag.trim();
  const rawHashtag = captionHashtag.trim();
  const hashtag = rawHashtag
    ? rawHashtag.startsWith("#")
      ? rawHashtag
      : `#${rawHashtag.replace(/\s+/g, "")}`
    : "";

  // Uniform 1:1 square outer sticker card geometry inside canvas
  const outerMargin = Math.round(size * 0.032);
  const shadowOff = Math.round(size * 0.016);
  const cardX = outerMargin;
  const cardY = outerMargin;
  const cardSize = size - outerMargin * 2 - shadowOff;
  const cardRadius = Math.round(cardSize * 0.085);

  const innerInset = Math.round(cardSize * 0.045);
  const innerX = cardX + innerInset;
  const innerY = cardY + innerInset;
  const innerSize = cardSize - innerInset * 2;
  const innerRadius = Math.round(innerSize * 0.065);

  const { canvas, ctx } = makeCanvas(size);

  // 1. Soft ambient drop shadow + crisp hard comic offset shadow behind the square sticker
  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.2)";
  ctx.shadowBlur = Math.round(size * 0.02);
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = Math.round(size * 0.01);
  drawRoundedSquareRect(ctx, cardX + shadowOff, cardY + shadowOff, cardSize, cardSize, cardRadius);
  ctx.fillStyle = "#15233F";
  ctx.fill();
  ctx.restore();

  // 2. Thick white vinyl square sticker border + hairline cut guide + #15233F ink edge
  ctx.save();
  drawRoundedSquareRect(ctx, cardX, cardY, cardSize, cardSize, cardRadius);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "#CBD5E1";
  ctx.lineWidth = Math.max(2, Math.round(size * 0.0025));
  ctx.stroke();

  ctx.strokeStyle = "#15233F";
  ctx.lineWidth = Math.max(5, Math.round(size * 0.009));
  ctx.stroke();
  ctx.restore();

  // 3. Inner square cartoon comic panel (same format & layout for all stickers)
  ctx.save();
  drawRoundedSquareRect(ctx, innerX, innerY, innerSize, innerSize, innerRadius);
  const bgGrad = ctx.createRadialGradient(
    innerX + innerSize * 0.5,
    innerY + innerSize * 0.42,
    innerSize * 0.05,
    innerX + innerSize * 0.5,
    innerY + innerSize * 0.45,
    innerSize * 0.72
  );
  bgGrad.addColorStop(0, "#FFFBEB");
  bgGrad.addColorStop(0.55, "#EFF6FF");
  bgGrad.addColorStop(1, "#DBEAFE");
  ctx.fillStyle = bgGrad;
  ctx.fill();

  ctx.clip();

  // Subtle cartoon sunburst rays behind the character
  ctx.save();
  ctx.translate(innerX + innerSize * 0.5, innerY + innerSize * 0.42);
  ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
  const rayCount = 12;
  for (let r = 0; r < rayCount; r++) {
    const a0 = (r / rayCount) * Math.PI * 2;
    const a1 = a0 + (Math.PI / rayCount) * 0.7;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(a0) * innerSize, Math.sin(a0) * innerSize);
    ctx.lineTo(Math.cos(a1) * innerSize, Math.sin(a1) * innerSize);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Subtle comic halftone corner dots (identical across every square sticker)
  ctx.save();
  ctx.fillStyle = "rgba(21, 35, 63, 0.14)";
  const dotOffsets = [
    [0.06, 0.06, 0.012],
    [0.11, 0.06, 0.01],
    [0.16, 0.06, 0.008],
    [0.06, 0.11, 0.01],
    [0.11, 0.11, 0.008],
    [0.94, 0.06, 0.012],
    [0.89, 0.06, 0.01],
    [0.84, 0.06, 0.008],
    [0.94, 0.11, 0.01],
    [0.89, 0.11, 0.008],
  ];
  for (const [dx, dy, dr] of dotOffsets) {
    ctx.beginPath();
    ctx.arc(innerX + innerSize * dx, innerY + innerSize * dy, innerSize * dr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // 4. Measure actual non-transparent character artwork bounds and center cleanly
  const { canvas: raw, ctx: rawCtx } = makeCanvas(artPx);
  rawCtx.drawImage(img, 0, 0, artPx, artPx);
  const box = alphaBounds(raw) ?? { x: 0, y: 0, w: artPx, h: artPx };

  const bottomBand = (hashtag ? 0.165 : 0.04) + (tag ? 0.11 : 0);
  const charMaxW = innerSize * 0.84;
  const charMaxH = innerSize * (0.91 - bottomBand);
  const scale = Math.min(charMaxW / box.w, charMaxH / box.h);
  const dw = box.w * scale;
  const dh = box.h * scale;

  const { canvas: charLayer, ctx: charCtx } = makeCanvas(size);
  const charX = innerX + (innerSize - dw) / 2;
  const charY = innerY + innerSize * 0.035 + (charMaxH - dh) / 2;
  charCtx.drawImage(raw, box.x, box.y, box.w, box.h, charX, charY, dw, dh);

  // Subtle white sticker-pop aura behind the cartoon character so it reads like a layered cartoon cutout
  const charHalo = outline(charLayer, Math.round(size * 0.016), "#FFFFFF");
  ctx.drawImage(charHalo, 0, 0);
  ctx.drawImage(charLayer, 0, 0);

  // Symmetrical cartoon corner sparkle accents
  drawFourPointSparkle(
    ctx,
    innerX + innerSize * 0.12,
    innerY + innerSize * 0.15,
    innerSize * 0.042,
    "#FCD34D"
  );
  drawFourPointSparkle(
    ctx,
    innerX + innerSize * 0.88,
    innerY + innerSize * 0.16,
    innerSize * 0.036,
    "#F472B6"
  );

  // 5. Bold playful cartoon hashtag lettering below the character
  if (hashtag) {
    ctx.save();
    let fontPx = Math.round(innerSize * 0.095);
    ctx.font = `900 ${fontPx}px "Plus Jakarta Sans", "Arial Rounded MT Bold", Arial, sans-serif`;
    const measured = ctx.measureText(hashtag).width;
    if (measured > innerSize * 0.88) {
      fontPx = Math.max(24, Math.floor((fontPx * (innerSize * 0.88)) / measured));
      ctx.font = `900 ${fontPx}px "Plus Jakarta Sans", "Arial Rounded MT Bold", Arial, sans-serif`;
    }
    const textX = innerX + innerSize / 2;
    const textY = tag
      ? innerY + innerSize * 0.785
      : innerY + innerSize * 0.875;

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineJoin = "round";

    // White sticker rim + bold navy comic outline + bright orange cartoon fill
    ctx.strokeStyle = "#FFFFFF";
    ctx.lineWidth = Math.max(12, Math.round(fontPx * 0.34));
    ctx.strokeText(hashtag, textX, textY);

    ctx.strokeStyle = "#15233F";
    ctx.lineWidth = Math.max(7, Math.round(fontPx * 0.2));
    ctx.strokeText(hashtag, textX, textY);

    ctx.fillStyle = "#F28C38";
    ctx.fillText(hashtag, textX, textY);
    ctx.restore();
  }

  // 6. Consistent lower campus / booth stamp badge
  if (tag) {
    ctx.save();
    const fontPx = Math.round(innerSize * 0.05);
    ctx.font = `800 ${fontPx}px "Plus Jakarta Sans", Arial, sans-serif`;
    const measuredW = ctx.measureText(tag).width;
    const badgeW = Math.min(innerSize * 0.72, measuredW + innerSize * 0.09);
    const badgeH = Math.round(innerSize * 0.082);
    const badgeX = innerX + (innerSize - badgeW) / 2;
    const badgeY = innerY + innerSize - badgeH - Math.round(innerSize * 0.032);

    drawRoundedSquareRect(ctx, badgeX, badgeY, badgeW, badgeH, badgeH / 2);
    ctx.fillStyle = "#15233F";
    ctx.fill();

    ctx.fillStyle = "#FFFFFF";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(tag, innerX + innerSize / 2, badgeY + badgeH / 2 + fontPx * 0.04, badgeW - innerSize * 0.04);
    ctx.restore();
  }

  ctx.restore();

  // 7. Crisp inner comic frame outline
  ctx.save();
  drawRoundedSquareRect(ctx, innerX, innerY, innerSize, innerSize, innerRadius);
  ctx.strokeStyle = "#15233F";
  ctx.lineWidth = Math.max(4, Math.round(size * 0.0055));
  ctx.stroke();
  ctx.restore();

  return canvas.toDataURL("image/png");
}

/** Render one packed A4 page to a 300 dpi PNG. */
export async function renderPackPageToPng(page: PlacedSticker[], dpi = 300): Promise<string> {
  const pxPerMm = dpi / 25.4;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(A4.w * pxPerMm);
  canvas.height = Math.round(A4.h * pxPerMm);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const cache = new Map<string, HTMLImageElement>();
  for (const p of page) {
    let img = cache.get(p.src);
    if (!img) {
      img = await loadImage(p.src);
      cache.set(p.src, img);
    }
    ctx.drawImage(img, p.xMm * pxPerMm, p.yMm * pxPerMm, p.sizeMm * pxPerMm, p.sizeMm * pxPerMm);
  }
  drawCutGuides(ctx, page, pxPerMm);
  return canvas.toDataURL("image/png");
}

/** Light dashed cut box around every grid cell, so the sheet cuts apart with a ruler. */
function drawCutGuides(ctx: CanvasRenderingContext2D, page: PlacedSticker[], pxPerMm: number) {
  ctx.save();
  ctx.strokeStyle = "#c7ccd6";
  ctx.lineWidth = Math.max(1, 0.15 * pxPerMm);
  ctx.setLineDash([1.2 * pxPerMm, 1.2 * pxPerMm]);
  for (const p of page) {
    const g = GAP_MM / 2;
    ctx.strokeRect((p.xMm - g) * pxPerMm, (p.yMm - g) * pxPerMm, (p.sizeMm + 2 * g) * pxPerMm, (p.sizeMm + 2 * g) * pxPerMm);
  }
  ctx.restore();
}

export function downloadDataUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
