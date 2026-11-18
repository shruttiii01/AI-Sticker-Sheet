import { A4_HEIGHT_MM, A4_WIDTH_MM, STICKER_THEMES } from "../constants";
import type { PaperConfig } from "../types";

const DPI = 200;
const MM_TO_PX = DPI / 25.4;

const BRUSH_HIGHLIGHTS = [
  "rgba(242, 140, 56, 0.36)",
  "rgba(255, 255, 255, 0.48)",
  "rgba(255, 255, 255, 0.56)",
  "rgba(244, 114, 182, 0.25)",
  "rgba(244, 114, 182, 0.22)",
  "rgba(242, 140, 56, 0.24)",
];

function mm(value: number): number {
  return value * MM_TO_PX;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawComicCornerDots(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string
) {
  ctx.save();
  ctx.globalAlpha = 0.14;
  ctx.fillStyle = color;
  const pts = [
    [0.08, 0.08, 0.014],
    [0.15, 0.08, 0.012],
    [0.22, 0.08, 0.009],
    [0.08, 0.15, 0.012],
    [0.15, 0.15, 0.009],
    [0.92, 0.08, 0.014],
    [0.85, 0.08, 0.012],
    [0.78, 0.08, 0.009],
    [0.92, 0.15, 0.012],
    [0.85, 0.15, 0.009],
  ];
  const base = Math.min(w, h);
  for (const [px, py, pr] of pts) {
    ctx.beginPath();
    ctx.arc(x + w * px, y + h * py, base * pr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for A4 export."));
    img.src = src;
  });
}

function drawSparkle(
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
  ctx.lineWidth = Math.max(1.5, r * 0.18);
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawHeart(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  fill: string
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.moveTo(0, r * 0.35);
  ctx.bezierCurveTo(-r * 0.9, -r * 0.45, -r * 0.55, -r * 1.1, 0, -r * 0.45);
  ctx.bezierCurveTo(r * 0.55, -r * 1.1, r * 0.9, -r * 0.45, 0, r * 0.35);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = "#15233F";
  ctx.lineWidth = Math.max(1.5, r * 0.18);
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/**
 * Unified cartoon sticker accents drawn identically on every square portrait frame.
 */
function drawCanvasDoodles(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  fw: number,
  fh: number
) {
  const s = Math.min(fw, fh);

  // Top-left cartoon motion pop ticks
  ctx.save();
  ctx.strokeStyle = "#15233F";
  ctx.lineWidth = Math.max(2, s * 0.022);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(fx - s * 0.02, fy + s * 0.08);
  ctx.lineTo(fx + s * 0.05, fy + s * 0.12);
  ctx.moveTo(fx + s * 0.04, fy);
  ctx.lineTo(fx + s * 0.08, fy + s * 0.07);
  ctx.moveTo(fx - s * 0.04, fy + s * 0.16);
  ctx.lineTo(fx + s * 0.03, fy + s * 0.17);
  ctx.stroke();
  ctx.restore();

  // Top-right gold sparkle + mini white star
  drawSparkle(ctx, fx + fw * 0.91, fy + fh * 0.105, s * 0.075, "#FCD34D");
  drawSparkle(ctx, fx + fw * 0.97, fy + fh * 0.25, s * 0.042, "#FFFFFF");

  // Bottom-left gold sparkle
  drawSparkle(ctx, fx + fw * 0.07, fy + fh * 0.87, s * 0.062, "#FCD34D");

  // Bottom-right white cartoon heart badge
  ctx.save();
  const bx = fx + fw * 0.9;
  const by = fy + fh * 0.88;
  ctx.beginPath();
  ctx.arc(bx, by, s * 0.085, 0, Math.PI * 2);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.strokeStyle = "#15233F";
  ctx.lineWidth = Math.max(1.8, s * 0.015);
  ctx.stroke();
  ctx.restore();
  drawHeart(ctx, fx + fw * 0.9, fy + fh * 0.895, s * 0.052, "#EC4899");
}

export async function renderA4SheetToPng(params: {
  photoSrc: string | null;
  captions: string[];
  paperConfig: PaperConfig;
  firstName?: string;
  stickerTag?: string;
}): Promise<string> {
  const { photoSrc, captions, paperConfig, stickerTag = "#DYPAICoE" } = params;
  const trimmedTag = stickerTag.trim();

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(mm(A4_WIDTH_MM));
  canvas.height = Math.round(mm(A4_HEIGHT_MM));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas 2D context unavailable.");
  }

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  let loadedImg: HTMLImageElement | null = null;
  if (photoSrc && !paperConfig.testGridOnly) {
    loadedImg = await loadImage(photoSrc);
  }

  const totalSlots = Math.min(6, paperConfig.columns * paperConfig.rows);
  const layoutVariant =
    paperConfig.layoutVariant ??
    (paperConfig.dieCutWhiteVinyl ? "white-vinyl" : "colored");
  const isWhiteVinyl = layoutVariant === "white-vinyl";

  for (let i = 0; i < totalSlots; i++) {
    const col = i % paperConfig.columns;
    const row = Math.floor(i / paperConfig.columns);
    const x = mm(
      paperConfig.leftMarginMm + col * (paperConfig.labelWidthMm + paperConfig.gapXMm)
    );
    const y = mm(
      paperConfig.topMarginMm + row * (paperConfig.labelHeightMm + paperConfig.gapYMm)
    );
    const w = mm(paperConfig.labelWidthMm);
    const h = mm(paperConfig.labelHeightMm);
    const r = mm(paperConfig.cornerRadiusMm);

    const theme = STICKER_THEMES[i % STICKER_THEMES.length];

    if (paperConfig.testGridOnly) {
      ctx.save();
      drawRoundedRect(ctx, x, y, w, h, r);
      ctx.strokeStyle = "#0F172A";
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.stroke();
      ctx.setLineDash([]);

      const cx = x + w / 2;
      const cy = y + h / 2;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy);
      ctx.lineTo(cx + 18, cy);
      ctx.moveTo(cx, cy - 18);
      ctx.lineTo(cx, cy + 18);
      ctx.strokeStyle = "#64748B";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "#0F172A";
      ctx.font = `600 ${Math.round(mm(3.4))}px "JetBrains Mono", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(
        `Slot ${i + 1} (${paperConfig.labelWidthMm}x${paperConfig.labelHeightMm}mm)`,
        cx,
        cy + mm(6)
      );
      ctx.restore();
      continue;
    }

    // Outer square sticker comic offset shadow + background + ink border
    const cardShadow = mm(0.85);
    ctx.save();
    drawRoundedRect(ctx, x + cardShadow, y + cardShadow, w, h, r);
    ctx.fillStyle = "#15233F";
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundedRect(ctx, x, y, w, h, r);
    ctx.fillStyle = isWhiteVinyl ? "#FFFFFF" : theme.bgColor;
    ctx.fill();

    if (paperConfig.showCutGuides) {
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 1.8;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      ctx.strokeStyle = "#15233F";
      ctx.lineWidth = Math.max(2.5, mm(0.5));
      ctx.stroke();
    }
    ctx.restore();

    drawComicCornerDots(
      ctx,
      x,
      y,
      w,
      h,
      !isWhiteVinyl && theme.id === "navy" ? "#FFFFFF" : "#15233F"
    );

    // Uniform upright 1:1 square cartoon sticker frame geometry
    const pad = mm(
      Math.min(paperConfig.labelWidthMm, paperConfig.labelHeightMm) * 0.068
    );
    const captionBandHeight = Math.max(mm(13), h * 0.27);
    const availW = w - pad * 2;
    const availH = h - pad * 1.3 - captionBandHeight;
    const frameSide = Math.max(mm(16), Math.min(availW, availH));
    const frameX = x + (w - frameSide) / 2;
    const frameY = y + pad + (availH - frameSide) / 2;
    const whiteBorder = mm(1.1);
    const sqRadius = frameSide * 0.08;
    const shadowOff = mm(0.85);

    // Chunky cartoon offset shadow + white square vinyl mat + ink border (upright, zero tilt)
    ctx.save();
    drawRoundedRect(ctx, frameX + shadowOff, frameY + shadowOff, frameSide, frameSide, sqRadius);
    ctx.fillStyle = "#15233F";
    ctx.fill();
    ctx.restore();

    ctx.save();
    drawRoundedRect(ctx, frameX, frameY, frameSide, frameSide, sqRadius);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "#15233F";
    ctx.lineWidth = Math.max(2.2, mm(0.48));
    ctx.stroke();
    ctx.restore();

    // Clipped photo inside square cartoon border
    const px = frameX + whiteBorder;
    const py = frameY + whiteBorder;
    const pw = frameSide - whiteBorder * 2;
    const ph = frameSide - whiteBorder * 2;

    ctx.save();
    drawRoundedRect(ctx, px, py, pw, ph, frameSide * 0.06);
    ctx.clip();
    ctx.fillStyle = "#EFF6FF";
    ctx.fillRect(px, py, pw, ph);

    if (loadedImg) {
      const imgAspect = loadedImg.naturalWidth / loadedImg.naturalHeight;
      const boxAspect = pw / ph;
      let drawW = pw;
      let drawH = ph;
      let drawX = px;
      let drawY = py;

      if (imgAspect > boxAspect) {
        drawW = ph * imgAspect;
        drawX = px - (drawW - pw) / 2;
      } else {
        drawH = pw / imgAspect;
        drawY = py - (drawH - ph) * 0.25;
      }
      ctx.drawImage(loadedImg, drawX, drawY, drawW, drawH);
    }
    ctx.restore();

    // Identical cartoon doodle accents on every square portrait frame
    drawCanvasDoodles(ctx, frameX, frameY, frameSide, frameSide);

    // Pastel highlighter brush swipe behind caption
    const caption = (captions[i] ?? "").trim();
    const bandTop = y + pad + availH;
    const captionCenterY = bandTop + (y + h - bandTop) * 0.4;
    const brushColor = isWhiteVinyl
      ? "rgba(244, 114, 182, 0.22)"
      : BRUSH_HIGHLIGHTS[i % BRUSH_HIGHLIGHTS.length];

    const leadColor = isWhiteVinyl ? "#0F172A" : theme.textColor;
    const accentColor = isWhiteVinyl
      ? "#EC4899"
      : theme.id === "navy"
        ? "#FCD34D"
        : theme.id === "orange"
          ? "#FFFFFF"
          : "#EC4899";

    ctx.save();
    drawRoundedRect(
      ctx,
      x + w * 0.14,
      captionCenterY - mm(0.9),
      w * 0.72,
      mm(3.0),
      mm(1.5)
    );
    ctx.fillStyle = brushColor;
    ctx.fill();
    ctx.restore();

    // Two-tone expressive bold caption + marker underline swoosh
    const fontSizePx = Math.min(
      mm(4.9),
      Math.max(mm(3.2), captionBandHeight * 0.36)
    );
    const words = caption.split(/\s+/);
    const lead = words.length > 1 ? words.slice(0, -1).join(" ") + " " : caption;
    const accent = words.length > 1 ? words[words.length - 1] : "";

    ctx.save();
    ctx.font = `800 ${Math.round(fontSizePx)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textBaseline = "middle";
    const leadW = ctx.measureText(lead).width;
    const accentW = accent ? ctx.measureText(accent).width : 0;
    const scale = leadW + accentW > w - pad * 2 ? (w - pad * 2) / (leadW + accentW) : 1;

    ctx.translate(x + w / 2, captionCenterY - mm(0.4));
    ctx.scale(scale, scale);
    const startX = -(leadW + accentW) / 2;
    ctx.textAlign = "left";
    ctx.fillStyle = leadColor;
    ctx.fillText(lead, startX, 0);
    if (accent) {
      ctx.fillStyle = accentColor;
      ctx.fillText(accent, startX + leadW, 0);
    }
    ctx.restore();

    // Marker underline swoosh
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.24, captionCenterY + mm(2.8));
    ctx.quadraticCurveTo(
      x + w * 0.5,
      captionCenterY + mm(1.8),
      x + w * 0.76,
      captionCenterY + mm(2.6)
    );
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = Math.max(2, mm(0.5));
    ctx.lineCap = "round";
    ctx.stroke();
    ctx.restore();

    // Lower high-contrast hashtag stamp badge below every sticker caption
    if (trimmedTag) {
      ctx.save();
      const tagFont = Math.round(mm(2.6));
      ctx.font = `800 ${tagFont}px "Plus Jakarta Sans", sans-serif`;
      const tagW = Math.min(w - pad * 2, ctx.measureText(trimmedTag).width + mm(3.6));
      const tagH = mm(4.0);
      const tagCx = x + w / 2;
      const tagCy = y + h - mm(3.4);
      drawRoundedRect(ctx, tagCx - tagW / 2, tagCy - tagH / 2, tagW, tagH, tagH / 2);
      ctx.fillStyle = !isWhiteVinyl && theme.id === "navy" ? "#FFFFFF" : "#15233F";
      ctx.fill();

      ctx.fillStyle = !isWhiteVinyl && theme.id === "navy" ? "#15233F" : "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(trimmedTag, tagCx, tagCy + tagFont * 0.04, tagW - mm(1.5));
      ctx.restore();
    }
  }

  return canvas.toDataURL("image/png");
}
