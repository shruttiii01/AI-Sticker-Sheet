import { A4_HEIGHT_MM, A4_WIDTH_MM } from "../constants";
import type { PaperConfig } from "../types";

export interface SheetSlotRect {
  index: number;
  leftMm: number;
  topMm: number;
  widthMm: number;
  heightMm: number;
  isFestival: boolean;
}

/**
 * Computes exact A4 millimeter slot rectangles for the 6 base stickers and,
 * when `includeFestivalSticker` is active, fits the 7th wide Festival sticker
 * cleanly onto the same A4 sheet without overflowing 297 mm.
 */
export function computeA4Slots(paperConfig: PaperConfig): SheetSlotRect[] {
  const baseCount = Math.min(6, paperConfig.columns * paperConfig.rows);
  const showFestival =
    Boolean(paperConfig.includeFestivalSticker) && !paperConfig.testGridOnly;

  const spanWidthMm =
    paperConfig.columns * paperConfig.labelWidthMm +
    Math.max(0, paperConfig.columns - 1) * paperConfig.gapXMm;

  const rawBaseBottomMm =
    paperConfig.topMarginMm +
    paperConfig.rows * paperConfig.labelHeightMm +
    Math.max(0, paperConfig.rows - 1) * paperConfig.gapYMm;

  // If +1 Festival sticker is enabled and the base rows don't leave >= 74mm at the bottom,
  // smoothly compact the base rows so all 7 stickers fit comfortably inside A4 (210x297mm).
  const needsCompact = showFestival && A4_HEIGHT_MM - 10 - rawBaseBottomMm < 74;

  const topMarginMm = needsCompact
    ? Math.min(paperConfig.topMarginMm, 10)
    : paperConfig.topMarginMm;
  const gapYMm = needsCompact
    ? Math.min(paperConfig.gapYMm, 6)
    : paperConfig.gapYMm;
  const availableForRows = A4_HEIGHT_MM - 12 - 74 - topMarginMm;
  const rowHeightMm = needsCompact
    ? Math.max(
        42,
        Math.min(
          paperConfig.labelHeightMm,
          (availableForRows - Math.max(0, paperConfig.rows - 1) * gapYMm) /
            Math.max(1, paperConfig.rows),
        ),
      )
    : paperConfig.labelHeightMm;

  const slots: SheetSlotRect[] = [];
  for (let idx = 0; idx < baseCount; idx++) {
    const col = idx % paperConfig.columns;
    const row = Math.floor(idx / paperConfig.columns);
    slots.push({
      index: idx,
      leftMm:
        paperConfig.leftMarginMm +
        col * (paperConfig.labelWidthMm + paperConfig.gapXMm),
      topMm: topMarginMm + row * (rowHeightMm + gapYMm),
      widthMm: paperConfig.labelWidthMm,
      heightMm: rowHeightMm,
      isFestival: false,
    });
  }

  if (showFestival) {
    const actualBaseBottom =
      topMarginMm +
      paperConfig.rows * rowHeightMm +
      Math.max(0, paperConfig.rows - 1) * gapYMm;
    const festivalTopMm = actualBaseBottom + Math.max(6, gapYMm);
    const remainingHeight = A4_HEIGHT_MM - 10 - festivalTopMm;
    const festivalHeightMm = Math.max(48, Math.min(70, remainingHeight));
    const festivalWidthMm = Math.min(
      A4_WIDTH_MM - paperConfig.leftMarginMm * 2,
      Math.max(paperConfig.labelWidthMm, spanWidthMm),
    );
    const festivalLeftMm =
      paperConfig.leftMarginMm + Math.max(0, (spanWidthMm - festivalWidthMm) / 2);

    slots.push({
      index: 6,
      leftMm: festivalLeftMm,
      topMm: festivalTopMm,
      widthMm: festivalWidthMm,
      heightMm: festivalHeightMm,
      isFestival: true,
    });
  }

  return slots;
}
