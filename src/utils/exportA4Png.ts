import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  FESTIVAL_STICKER_THEME,
  STICKER_THEMES,
} from "../constants";
import type { PaperConfig } from "../types";
import { computeA4Slots } from "./sheetLayout";

const DPI = 200;
const MM_TO_PX = DPI / 25.4;

const SLOT_TILTS_RAD = [-0.028, 0.024, -0.021, 0.026, -0.024, 0.021];

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

function drawArchFrame(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
) {
  const topR = Math.min(w * 0.42, h * 0.42);
  const botR = Math.min(w * 0.16, h * 0.16);
  ctx.beginPath();
  ctx.moveTo(x + topR, y);
  ctx.lineTo(x + w - topR, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + topR);
  ctx.lineTo(x + w, y + h - botR);
  ctx.quadraticCurveTo(x + w, y + h, x + w - botR, y + h);
  ctx.lineTo(x + botR, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - botR);
  ctx.lineTo(x, y + topR);
  ctx.quadraticCurveTo(x, y, x + topR, y);
  ctx.closePath();
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image for A4 export."));
    img.src = src;
  });
}

function drawCrown(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string,
  angleRad: number
) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(angleRad);
  ctx.beginPath();
  ctx.moveTo(-size * 0.48, size * 0.32);
  ctx.lineTo(-size * 0.54, -size * 0.26);
  ctx.lineTo(-size * 0.2, size * 0.04);
  ctx.lineTo(0, -size * 0.42);
  ctx.lineTo(size * 0.2, size * 0.04);
  ctx.lineTo(size * 0.54, -size * 0.26);
  ctx.lineTo(size * 0.48, size * 0.32);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.strokeStyle = "#15233F";
  ctx.lineWidth = Math.max(2, size * 0.1);
  ctx.lineJoin = "round";
  ctx.fill();
  ctx.stroke();
  ctx.restore();
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
  ctx.lineWidth = Math.max(1.5, r * 0.16);
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
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawCanvasDoodles(
  ctx: CanvasRenderingContext2D,
  slotIndex: number,
  fx: number,
  fy: number,
  fw: number,
  fh: number
) {
  const s = Math.min(fw, fh);

  if (slotIndex === 6) {
    // Festive marigold garland dots across top arch
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(fx + fw * 0.08, fy + fh * 0.1);
    ctx.quadraticCurveTo(fx + fw * 0.5, fy + fh * 0.22, fx + fw * 0.92, fy + fh * 0.1);
    ctx.strokeStyle = "#D97706";
    ctx.lineWidth = Math.max(1.8, s * 0.018);
    ctx.stroke();
    const beads = [
      { x: 0.18, y: 0.13, c: "#F97316" },
      { x: 0.34, y: 0.155, c: "#FACC15" },
      { x: 0.5, y: 0.165, c: "#EC4899" },
      { x: 0.66, y: 0.155, c: "#FACC15" },
      { x: 0.82, y: 0.13, c: "#F97316" },
    ];
    for (const b of beads) {
      ctx.beginPath();
      ctx.arc(fx + fw * b.x, fy + fh * b.y, s * 0.042, 0, Math.PI * 2);
      ctx.fillStyle = b.c;
      ctx.fill();
      ctx.strokeStyle = "#15233F";
      ctx.lineWidth = Math.max(1.2, s * 0.012);
      ctx.stroke();
    }
    ctx.restore();

    // Glowing diya badge bottom-right
    ctx.save();
    ctx.translate(fx + fw * 0.82, fy + fh * 0.82);
    drawRoundedRect(ctx, -s * 0.13, -s * 0.13, s * 0.26, s * 0.26, s * 0.07);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.095);
    ctx.bezierCurveTo(-s * 0.04, -s * 0.02, -s * 0.035, s * 0.01, 0, s * 0.01);
    ctx.bezierCurveTo(s * 0.035, s * 0.01, s * 0.04, -s * 0.02, 0, -s * 0.095);
    ctx.fillStyle = "#FDE047";
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-s * 0.09, s * 0.02);
    ctx.quadraticCurveTo(0, s * 0.13, s * 0.09, s * 0.02);
    ctx.quadraticCurveTo(0, s * 0.05, -s * 0.09, s * 0.02);
    ctx.fillStyle = "#D97706";
    ctx.fill();
    ctx.strokeStyle = "#15233F";
    ctx.lineWidth = Math.max(1.4, s * 0.014);
    ctx.stroke();
    ctx.restore();

    drawSparkle(ctx, fx + fw * 0.11, fy + fh * 0.81, s * 0.075, "#FACC15");
    return;
  }

  const variant = slotIndex % 6;

  if (variant === 0) {
    drawCrown(ctx, fx + fw * 0.38, fy - fh * 0.02, s * 0.25, "#FCD34D", -0.14);
    drawSparkle(ctx, fx + fw * 0.88, fy + fh * 0.16, s * 0.08, "#FCD34D");
    drawHeart(ctx, fx + fw * 0.1, fy + fh * 0.85, s * 0.08, "#EC4899");
  } else if (variant === 1) {
    // Cool shades badge bottom-right
    ctx.save();
    ctx.translate(fx + fw * 0.78, fy + fh * 0.82);
    ctx.rotate(-0.1);
    drawRoundedRect(ctx, -s * 0.16, -s * 0.07, s * 0.32, s * 0.14, s * 0.05);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.fillStyle = "#0F172A";
    drawRoundedRect(ctx, -s * 0.13, -s * 0.045, s * 0.11, s * 0.09, s * 0.025);
    ctx.fill();
    drawRoundedRect(ctx, s * 0.02, -s * 0.045, s * 0.11, s * 0.09, s * 0.025);
    ctx.fill();
    ctx.restore();
    drawHeart(ctx, fx + fw * 0.88, fy + fh * 0.14, s * 0.08, "#EC4899");
  } else if (variant === 2) {
    // Iced coffee cup top-left
    ctx.save();
    ctx.translate(fx + fw * 0.12, fy + fh * 0.14);
    ctx.rotate(-0.16);
    drawRoundedRect(ctx, -s * 0.09, -s * 0.11, s * 0.18, s * 0.23, s * 0.05);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.fillStyle = "#FDE68A";
    ctx.strokeStyle = "#15233F";
    ctx.lineWidth = Math.max(1.8, s * 0.015);
    ctx.fillRect(-s * 0.055, -s * 0.03, s * 0.11, s * 0.12);
    ctx.strokeRect(-s * 0.055, -s * 0.03, s * 0.11, s * 0.12);
    ctx.restore();
    // Pizza slice bottom-right
    ctx.save();
    ctx.translate(fx + fw * 0.84, fy + fh * 0.82);
    ctx.rotate(0.2);
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.11);
    ctx.lineTo(s * 0.1, s * 0.08);
    ctx.lineTo(-s * 0.1, s * 0.08);
    ctx.closePath();
    ctx.fillStyle = "#FCD34D";
    ctx.strokeStyle = "#15233F";
    ctx.lineWidth = Math.max(1.8, s * 0.015);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    drawSparkle(ctx, fx + fw * 0.88, fy + fh * 0.18, s * 0.075, "#FCD34D");
  } else if (variant === 3) {
    // Cloud Dream Big badge top-right
    ctx.save();
    ctx.translate(fx + fw * 0.78, fy + fh * 0.1);
    drawRoundedRect(ctx, -s * 0.18, -s * 0.1, s * 0.36, s * 0.2, s * 0.08);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "#15233F";
    ctx.lineWidth = Math.max(1.8, s * 0.016);
    ctx.stroke();
    ctx.fillStyle = "#15233F";
    ctx.font = `800 ${Math.round(s * 0.075)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Dream Big!", 0, 0);
    ctx.restore();
    drawHeart(ctx, fx + fw * 0.1, fy + fh * 0.18, s * 0.08, "#F472B6");
  } else if (variant === 4) {
    // Mini checklist badge top-left
    ctx.save();
    ctx.translate(fx + fw * 0.14, fy + fh * 0.16);
    ctx.rotate(-0.1);
    drawRoundedRect(ctx, -s * 0.13, -s * 0.13, s * 0.26, s * 0.26, s * 0.04);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.strokeStyle = "#15233F";
    ctx.lineWidth = Math.max(1.8, s * 0.014);
    ctx.stroke();
    ctx.fillStyle = "#15233F";
    ctx.font = `800 ${Math.round(s * 0.055)}px "Plus Jakarta Sans", sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("Chai", 0, -s * 0.05);
    ctx.fillText("Code", 0, s * 0.015);
    ctx.fillStyle = "#EC4899";
    ctx.fillText("Win!", 0, s * 0.08);
    ctx.restore();

    // Smiley bottom-right
    ctx.save();
    ctx.translate(fx + fw * 0.85, fy + fh * 0.83);
    ctx.beginPath();
    ctx.arc(0, 0, s * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = "#FCD34D";
    ctx.fill();
    ctx.strokeStyle = "#15233F";
    ctx.lineWidth = Math.max(1.8, s * 0.015);
    ctx.stroke();
    ctx.restore();
  } else {
    // Pink ribbon bow top-right
    ctx.save();
    ctx.translate(fx + fw * 0.84, fy + fh * 0.12);
    ctx.rotate(0.18);
    ctx.fillStyle = "#F472B6";
    ctx.strokeStyle = "#15233F";
    ctx.lineWidth = Math.max(1.8, s * 0.014);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-s * 0.1, -s * 0.055);
    ctx.lineTo(-s * 0.08, s * 0.055);
    ctx.closePath();
    ctx.moveTo(0, 0);
    ctx.lineTo(s * 0.1, -s * 0.055);
    ctx.lineTo(s * 0.08, s * 0.055);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Book stack badge bottom-left
    ctx.save();
    ctx.translate(fx + fw * 0.16, fy + fh * 0.84);
    ctx.rotate(-0.08);
    drawRoundedRect(ctx, -s * 0.14, -s * 0.1, s * 0.28, s * 0.2, s * 0.04);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.fillStyle = "#A78BFA";
    ctx.fillRect(-s * 0.11, -s * 0.08, s * 0.22, s * 0.045);
    ctx.fillStyle = "#F472B6";
    ctx.fillRect(-s * 0.1, -s * 0.03, s * 0.2, s * 0.045);
    ctx.fillStyle = "#FCD34D";
    ctx.fillRect(-s * 0.12, s * 0.02, s * 0.24, s * 0.05);
    ctx.restore();
    drawSparkle(ctx, fx + fw * 0.12, fy + fh * 0.14, s * 0.08, "#FCD34D");
  }
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

  const slots = computeA4Slots(paperConfig);
  const layoutVariant =
    paperConfig.layoutVariant ??
    (paperConfig.dieCutWhiteVinyl ? "white-vinyl" : "colored");
  const isWhiteVinyl = layoutVariant === "white-vinyl";
  const isSideBySide = layoutVariant === "side-by-side";

  for (const slot of slots) {
    const i = slot.index;
    const isFestival = slot.isFestival;
    const x = mm(slot.leftMm);
    const y = mm(slot.topMm);
    const w = mm(slot.widthMm);
    const h = mm(slot.heightMm);
    const r = mm(paperConfig.cornerRadiusMm);
    const isWideHorizontal = isSideBySide || (isFestival && slot.widthMm > slot.heightMm * 1.35);

    const theme = isFestival
      ? FESTIVAL_STICKER_THEME
      : STICKER_THEMES[i % STICKER_THEMES.length];

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
        `Slot ${i + 1} (${slot.widthMm}x${slot.heightMm}mm)`,
        cx,
        cy + mm(6)
      );
      ctx.restore();
      continue;
    }

    // Sticker background
    ctx.save();
    drawRoundedRect(ctx, x, y, w, h, r);
    ctx.fillStyle = isWhiteVinyl || isSideBySide ? "#FFFFFF" : theme.bgColor;
    ctx.fill();

    if (isWhiteVinyl || isSideBySide) {
      ctx.strokeStyle = "#CBD5E1";
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    } else if (isFestival) {
      ctx.strokeStyle = theme.borderColor;
      ctx.lineWidth = 3;
      ctx.stroke();
    } else if (paperConfig.showCutGuides) {
      ctx.strokeStyle = "#94A3B8";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([8, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();

    if (isWideHorizontal) {
      const pad = mm(3.5);
      const photoW = (isFestival ? w * 0.36 : w * 0.48) - pad;
      const photoH = h - pad * 2;
      const photoX = x + pad;
      const photoY = y + pad;
      const border = mm(1);

      ctx.save();
      drawArchFrame(ctx, photoX, photoY, photoW, photoH);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.strokeStyle = "#E2E8F0";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();

      ctx.save();
      drawArchFrame(
        ctx,
        photoX + border,
        photoY + border,
        photoW - border * 2,
        photoH - border * 2
      );
      ctx.clip();
      if (loadedImg) {
        const pw = photoW - border * 2;
        const ph = photoH - border * 2;
        const imgAspect = loadedImg.naturalWidth / loadedImg.naturalHeight;
        const boxAspect = pw / ph;
        let dw = pw;
        let dh = ph;
        let dx = photoX + border;
        let dy = photoY + border;
        if (imgAspect > boxAspect) {
          dw = ph * imgAspect;
          dx -= (dw - pw) / 2;
        } else {
          dh = pw / imgAspect;
          dy -= (dh - ph) * 0.25;
        }
        ctx.drawImage(loadedImg, dx, dy, dw, dh);
      }
      ctx.restore();

      if (isFestival) {
        drawCanvasDoodles(ctx, 6, photoX, photoY, photoW, photoH);
      } else {
        // 3 black motion lines top-left
        ctx.save();
        ctx.strokeStyle = "#0F172A";
        ctx.lineWidth = Math.max(2, mm(0.7));
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(photoX, photoY + mm(2));
        ctx.lineTo(photoX + mm(4), photoY + mm(5));
        ctx.moveTo(photoX - mm(1.5), photoY + mm(6.5));
        ctx.lineTo(photoX + mm(3), photoY + mm(7.5));
        ctx.moveTo(photoX, photoY + mm(11));
        ctx.lineTo(photoX + mm(4), photoY + mm(9.5));
        ctx.stroke();
        ctx.restore();
      }

      // Right side stacked caption
      const caption = (captions[i] ?? (isFestival ? "Festive Vibes" : "")).trim();
      const words = caption.split(/\s+/);
      const lead = words.length > 1 ? words.slice(0, -1).join(" ") : caption;
      const accent = words.length > 1 ? words[words.length - 1] : "";
      const textCx = isFestival ? x + w * 0.68 : x + w * 0.74;
      const textCy = y + h * 0.44;
      const fSize = isFestival ? Math.min(mm(8), h * 0.17) : Math.min(mm(6.5), h * 0.14);
      const textMaxW = isFestival ? w * 0.56 : w * 0.44;

      ctx.save();
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      if (isFestival) {
        ctx.font = `800 ${Math.round(mm(2.6))}px "Plus Jakarta Sans", sans-serif`;
        ctx.fillStyle = "#B45309";
        ctx.fillText("FESTIVAL EDITION · SPECIAL STICKER", textCx, y + h * 0.18, textMaxW);
      }
      ctx.font = `800 ${Math.round(fSize)}px "Plus Jakarta Sans", sans-serif`;
      ctx.fillStyle = "#0F172A";
      ctx.fillText(lead, textCx, textCy - fSize * 0.55, textMaxW);
      if (accent) {
        ctx.fillStyle = isFestival ? "#EA580C" : "#DF1B6B";
        ctx.fillText(accent, textCx, textCy + fSize * 0.55, textMaxW);
      }
      // Zig-zag underline + festive sparkle or heart
      const zigStart = isFestival ? x + w * 0.55 : x + w * 0.56;
      const zigEnd = isFestival ? x + w * 0.74 : x + w * 0.72;
      ctx.beginPath();
      ctx.moveTo(zigStart, y + h * 0.7);
      ctx.lineTo(zigEnd, y + h * 0.68);
      ctx.lineTo(zigStart + (zigEnd - zigStart) * 0.25, y + h * 0.73);
      ctx.lineTo(zigEnd - (zigEnd - zigStart) * 0.1, y + h * 0.74);
      ctx.strokeStyle = isFestival ? "#F59E0B" : "#EC4899";
      ctx.lineWidth = Math.max(2, mm(0.9));
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();

      if (isFestival) {
        drawSparkle(ctx, x + w * 0.81, y + h * 0.71, mm(3.4), "#FACC15");
      } else {
        drawHeart(ctx, x + w * 0.84, y + h * 0.73, mm(3.0), "#F472B6");
      }

      if (trimmedTag) {
        const tagFont = Math.round(mm(2.6));
        ctx.font = `800 ${tagFont}px "Plus Jakarta Sans", sans-serif`;
        const tagW = Math.min(textMaxW, ctx.measureText(trimmedTag).width + mm(3.2));
        const tagH = mm(4.0);
        const tagY = y + h - mm(4.5);
        drawRoundedRect(ctx, textCx - tagW / 2, tagY - tagH / 2, tagW, tagH, tagH / 2);
        ctx.fillStyle = "#15233F";
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(trimmedTag, textCx, tagY + tagFont * 0.04, tagW - mm(1.5));
      }
      ctx.restore();
      continue;
    }

    // Inner organic arch die-cut sticker frame geometry
    const pad = mm(
      Math.min(slot.widthMm, slot.heightMm) * 0.08
    );
    const captionBandHeight = Math.max(mm(13), h * 0.26);
    const frameX = x + pad;
    const frameY = y + pad;
    const frameW = w - pad * 2;
    const frameH = h - pad * 1.4 - captionBandHeight;
    const whiteBorder = mm(1.25);
    const tilt = SLOT_TILTS_RAD[i % SLOT_TILTS_RAD.length];

    ctx.save();
    ctx.translate(frameX + frameW / 2, frameY + frameH / 2);
    ctx.rotate(tilt);

    const lx = -frameW / 2;
    const ly = -frameH / 2;

    // White die-cut sticker border + subtle shadow
    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.16)";
    ctx.shadowBlur = mm(1.8);
    ctx.shadowOffsetY = mm(0.7);
    drawArchFrame(ctx, lx, ly, frameW, frameH);
    ctx.fillStyle = "#FFFFFF";
    ctx.fill();
    ctx.restore();

    // Clipped photo inside white arch border
    const px = lx + whiteBorder;
    const py = ly + whiteBorder;
    const pw = frameW - whiteBorder * 2;
    const ph = frameH - whiteBorder * 2;

    ctx.save();
    drawArchFrame(ctx, px, py, pw, ph);
    ctx.clip();
    ctx.fillStyle = "#F8FAFC";
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

    // Hand-drawn doodle overlays on the tilted die-cut frame
    drawCanvasDoodles(ctx, i, lx, ly, frameW, frameH);
    ctx.restore();

    // Pastel highlighter brush swipe behind caption
    const caption = (captions[i] ?? "").trim();
    const captionCenterY = frameY + frameH + (y + h - (frameY + frameH)) * 0.4;
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
    ctx.translate(x + w / 2, captionCenterY + mm(0.6));
    ctx.rotate(-0.017);
    drawRoundedRect(ctx, -w * 0.36, -mm(1.5), w * 0.72, mm(3.0), mm(1.5));
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
