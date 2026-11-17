/**
 * Turns Claude's SVG artwork into printable die-cut stickers and packs them
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

export interface PlacedSticker {
  src: string;
  xMm: number;
  yMm: number;
  sizeMm: number;
}

/** Shelf-pack stickers (largest first) onto as many A4 pages as needed. */
export function packStickers(
  stickers: string[],
  useCase: StickerUseCase,
  copies: number,
): PlacedSticker[][] {
  const items: { src: string; size: number }[] = [];
  for (const size of useCase.sizesMm) {
    for (let c = 0; c < copies; c++) {
      for (const src of stickers) items.push({ src, size });
    }
  }
  items.sort((a, b) => b.size - a.size);

  const pages: PlacedSticker[][] = [];
  let page: PlacedSticker[] = [];
  let x = PAGE_MARGIN_MM;
  let y = PAGE_MARGIN_MM;
  let rowH = 0;
  const maxX = A4.w - PAGE_MARGIN_MM;
  const maxY = A4.h - PAGE_MARGIN_MM;

  for (const it of items) {
    if (x + it.size > maxX) {
      x = PAGE_MARGIN_MM;
      y += rowH + GAP_MM;
      rowH = 0;
    }
    if (y + it.size > maxY) {
      pages.push(page);
      page = [];
      x = PAGE_MARGIN_MM;
      y = PAGE_MARGIN_MM;
      rowH = 0;
    }
    page.push({ src: it.src, xMm: x, yMm: y, sizeMm: it.size });
    x += it.size + GAP_MM;
    rowH = Math.max(rowH, it.size);
  }
  if (page.length) pages.push(page);
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

/** Solid silhouette of `source`, grown by `radius` px and painted `color`. */
function outline(source: HTMLCanvasElement, radius: number, color: string) {
  const { canvas, ctx } = makeCanvas(source.width);
  const steps = 32;
  for (const r of [radius, radius * 0.66, radius * 0.33]) {
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

/**
 * Rasterise an SVG sticker at print resolution, optionally stamp a hashtag
 * (default "#DYPAICoE"), and wrap it in a thick white die-cut border with a
 * hairline cut guide – the classic vinyl sticker look.
 */
export async function svgToDieCutPng(
  svg: string,
  artPx = 1024,
  stickerTag = "#DYPAICoE",
): Promise<string> {
  const img = await loadImage(svgToDataUrl(svg));
  const border = Math.round(artPx * 0.035);
  const pad = border * 2;
  const size = artPx + pad * 2;
  const tag = stickerTag.trim();

  // Draw once, find the artwork's real bounds, then re-draw it centred and
  // scaled to fill the sticker (Claude doesn't always centre the composition).
  const { canvas: raw, ctx: rawCtx } = makeCanvas(artPx);
  rawCtx.drawImage(img, 0, 0, artPx, artPx);
  const box = alphaBounds(raw) ?? { x: 0, y: 0, w: artPx, h: artPx };

  const maxH = tag ? artPx * 0.85 : artPx;
  const scale = Math.min(artPx / box.w, maxH / box.h);
  const dw = box.w * scale;
  const dh = box.h * scale;

  const { canvas: art, ctx: artCtx } = makeCanvas(size);
  artCtx.drawImage(
    raw,
    box.x,
    box.y,
    box.w,
    box.h,
    pad + (artPx - dw) / 2,
    pad + (maxH - dh) / 2,
    dw,
    dh,
  );

  if (tag) {
    artCtx.save();
    const fontPx = Math.round(artPx * 0.062);
    artCtx.font = `800 ${fontPx}px "Plus Jakarta Sans", Arial, sans-serif`;
    const measuredW = artCtx.measureText(tag).width;
    const badgeW = Math.min(artPx * 0.82, measuredW + artPx * 0.08);
    const badgeH = Math.round(artPx * 0.095);
    const badgeX = pad + (artPx - badgeW) / 2;
    const badgeY = pad + artPx * 0.885;
    const r = badgeH / 2;

    artCtx.beginPath();
    artCtx.moveTo(badgeX + r, badgeY);
    artCtx.arcTo(badgeX + badgeW, badgeY, badgeX + badgeW, badgeY + badgeH, r);
    artCtx.arcTo(badgeX + badgeW, badgeY + badgeH, badgeX, badgeY + badgeH, r);
    artCtx.arcTo(badgeX, badgeY + badgeH, badgeX, badgeY, r);
    artCtx.arcTo(badgeX, badgeY, badgeX + badgeW, badgeY, r);
    artCtx.closePath();
    artCtx.fillStyle = "#15233F";
    artCtx.fill();

    artCtx.fillStyle = "#FFFFFF";
    artCtx.textAlign = "center";
    artCtx.textBaseline = "middle";
    artCtx.fillText(tag, pad + artPx / 2, badgeY + badgeH / 2 + fontPx * 0.04, badgeW - artPx * 0.04);
    artCtx.restore();
  }

  const white = outline(art, border, "#ffffff");
  const cut = outline(art, border + 3, "#c7ccd4");

  const { canvas, ctx } = makeCanvas(size);
  ctx.drawImage(cut, 0, 0);
  ctx.drawImage(white, 0, 0);
  ctx.drawImage(art, 0, 0);
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
  return canvas.toDataURL("image/png");
}

export function downloadDataUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}
