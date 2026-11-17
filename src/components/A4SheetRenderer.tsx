import React from "react";
import { User } from "lucide-react";
import { A4_HEIGHT_MM, A4_WIDTH_MM, STICKER_THEMES } from "../constants";
import type { PaperConfig } from "../types";
import { StickerDoodles } from "./StickerDoodles";

interface A4SheetRendererProps {
  photoSrc: string | null;
  captions: string[];
  paperConfig: PaperConfig;
  selectedSlot?: number | null;
  onSelectSlot?: (index: number) => void;
  printExact?: boolean;
}

const SLOT_TILTS = ["-1.6deg", "1.4deg", "-1.2deg", "1.5deg", "-1.4deg", "1.2deg"];

const BRUSH_HIGHLIGHTS = [
  "rgba(242, 140, 56, 0.36)",
  "rgba(255, 255, 255, 0.48)",
  "rgba(255, 255, 255, 0.56)",
  "rgba(244, 114, 182, 0.25)",
  "rgba(244, 114, 182, 0.22)",
  "rgba(242, 140, 56, 0.24)",
];

function splitTwoToneCaption(caption: string): { lead: string; accent: string } {
  const trimmed = caption.trim();
  const parts = trimmed.split(/\s+/);
  if (parts.length <= 1) {
    return { lead: trimmed, accent: "" };
  }
  return {
    lead: parts.slice(0, -1).join(" "),
    accent: parts[parts.length - 1],
  };
}

export const A4SheetRenderer: React.FC<A4SheetRendererProps> = ({
  photoSrc,
  captions,
  paperConfig,
  selectedSlot = null,
  onSelectSlot,
  printExact = false,
}) => {
  const totalSlots = Math.min(6, paperConfig.columns * paperConfig.rows);
  const slots = Array.from({ length: totalSlots }, (_, idx) => idx);
  const layoutVariant =
    paperConfig.layoutVariant ??
    (paperConfig.dieCutWhiteVinyl ? "white-vinyl" : "colored");
  const isWhiteVinyl = layoutVariant === "white-vinyl";
  const isSideBySide = layoutVariant === "side-by-side";

  const pctX = (mmVal: number) => `${(mmVal / A4_WIDTH_MM) * 100}%`;
  const pctY = (mmVal: number) => `${(mmVal / A4_HEIGHT_MM) * 100}%`;

  const containerStyle: React.CSSProperties = printExact
    ? {
        width: `${A4_WIDTH_MM}mm`,
        height: `${A4_HEIGHT_MM}mm`,
        position: "relative",
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
      }
    : {
        width: "100%",
        aspectRatio: `${A4_WIDTH_MM} / ${A4_HEIGHT_MM}`,
        position: "relative",
        backgroundColor: "#FFFFFF",
        overflow: "hidden",
      };

  return (
    <div
      style={containerStyle}
      className={
        printExact
          ? ""
          : "rounded-xl border border-slate-200 shadow-sm select-none"
      }
    >
      {/* Subtle margin guide overlay in preview mode only */}
      {!printExact && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border border-dashed border-slate-200/80"
          style={{
            top: pctY(paperConfig.topMarginMm),
            left: pctX(paperConfig.leftMarginMm),
            right: "auto",
            bottom: "auto",
            width: pctX(
              paperConfig.columns * paperConfig.labelWidthMm +
                Math.max(0, paperConfig.columns - 1) * paperConfig.gapXMm
            ),
            height: pctY(
              paperConfig.rows * paperConfig.labelHeightMm +
                Math.max(0, paperConfig.rows - 1) * paperConfig.gapYMm
            ),
          }}
        />
      )}

      {slots.map((index) => {
        const col = index % paperConfig.columns;
        const row = Math.floor(index / paperConfig.columns);
        const leftMm =
          paperConfig.leftMarginMm +
          col * (paperConfig.labelWidthMm + paperConfig.gapXMm);
        const topMm =
          paperConfig.topMarginMm +
          row * (paperConfig.labelHeightMm + paperConfig.gapYMm);

        const theme = STICKER_THEMES[index % STICKER_THEMES.length];
        const caption = captions[index] ?? "";
        const isSelected = selectedSlot === index;

        const cardBg = isWhiteVinyl || isSideBySide ? "#FFFFFF" : theme.bgColor;
        const leadTextColor =
          isWhiteVinyl || isSideBySide ? "#0F172A" : theme.textColor;
        const accentTextColor =
          isWhiteVinyl || isSideBySide
            ? "#DF1B6B"
            : theme.id === "navy"
              ? "#FCD34D"
              : theme.id === "orange"
                ? "#FFFFFF"
                : "#EC4899";

        const slotStyle: React.CSSProperties = printExact
          ? {
              position: "absolute",
              left: `${leftMm}mm`,
              top: `${topMm}mm`,
              width: `${paperConfig.labelWidthMm}mm`,
              height: `${paperConfig.labelHeightMm}mm`,
              borderRadius: `${paperConfig.cornerRadiusMm}mm`,
              backgroundColor: paperConfig.testGridOnly
                ? "transparent"
                : cardBg,
              border: paperConfig.testGridOnly
                ? "0.4mm dashed #0F172A"
                : isWhiteVinyl || isSideBySide
                  ? "0.35mm dashed #CBD5E1"
                  : paperConfig.showCutGuides
                    ? "0.3mm dashed #94A3B8"
                    : "none",
              padding: `${Math.min(paperConfig.labelWidthMm, paperConfig.labelHeightMm) * 0.065}mm`,
              display: "flex",
              flexDirection: isSideBySide ? "row" : "column",
              alignItems: isSideBySide ? "center" : undefined,
              justifyContent: "space-between",
              boxSizing: "border-box",
            }
          : {
              position: "absolute",
              left: pctX(leftMm),
              top: pctY(topMm),
              width: pctX(paperConfig.labelWidthMm),
              height: pctY(paperConfig.labelHeightMm),
              borderRadius: `${(paperConfig.cornerRadiusMm / A4_WIDTH_MM) * 100}% / ${(paperConfig.cornerRadiusMm / A4_HEIGHT_MM) * 100}%`,
              backgroundColor: paperConfig.testGridOnly
                ? "transparent"
                : cardBg,
              border: paperConfig.testGridOnly
                ? "1.5px dashed #0F172A"
                : isSelected
                  ? "2px solid #0F172A"
                  : isWhiteVinyl || isSideBySide
                    ? "1.5px solid #E2E8F0"
                    : paperConfig.showCutGuides
                      ? "1px dashed #94A3B8"
                      : `1px solid ${theme.borderColor}`,
              boxShadow:
                (isWhiteVinyl || isSideBySide) && !paperConfig.testGridOnly
                  ? "0 4px 14px rgba(15, 23, 42, 0.08)"
                  : undefined,
              padding: "2.2%",
              display: "flex",
              flexDirection: isSideBySide ? "row" : "column",
              alignItems: isSideBySide ? "center" : undefined,
              justifyContent: "space-between",
              boxSizing: "border-box",
            };

        if (paperConfig.testGridOnly) {
          return (
            <div key={index} style={slotStyle}>
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-900 relative">
                <div className="w-4 h-[1px] bg-slate-500 absolute" />
                <div className="h-4 w-[1px] bg-slate-500 absolute" />
                <span
                  className="font-mono font-semibold text-slate-800 mt-6 text-center"
                  style={{
                    fontSize: printExact ? "8.5pt" : "clamp(8px, 1.1vw, 11px)",
                  }}
                >
                  Slot {index + 1} · {paperConfig.labelWidthMm}×
                  {paperConfig.labelHeightMm}mm
                </span>
              </div>
            </div>
          );
        }

        const Tag = onSelectSlot && !printExact ? "button" : "div";
        const tilt = SLOT_TILTS[index % SLOT_TILTS.length];
        const brushColor = isWhiteVinyl
          ? "rgba(244, 114, 182, 0.22)"
          : BRUSH_HIGHLIGHTS[index % BRUSH_HIGHLIGHTS.length];
        const { lead, accent } = splitTwoToneCaption(caption);

        if (isSideBySide) {
          return (
            <Tag
              key={index}
              type={Tag === "button" ? "button" : undefined}
              onClick={onSelectSlot ? () => onSelectSlot(index) : undefined}
              style={slotStyle}
              className={
                onSelectSlot && !printExact
                  ? "text-left transition-transform duration-150 hover:scale-[1.015] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer gap-[3%]"
                  : "gap-[3%]"
              }
            >
              {/* Left: Portrait with 3 black motion lines at top-left */}
              <div className="relative w-[50%] h-full flex items-center justify-center">
                <div
                  className="relative w-full h-[90%] bg-white shadow-sm overflow-hidden border border-slate-200"
                  style={{
                    borderRadius: "42% 42% 14% 14%",
                    padding: printExact ? "0.9mm" : "3%",
                  }}
                >
                  <div
                    className="w-full h-full overflow-hidden bg-slate-50 flex items-center justify-center"
                    style={{ borderRadius: "40% 40% 12% 12%" }}
                  >
                    {photoSrc ? (
                      <img
                        src={photoSrc}
                        alt={`Sticker ${index + 1}: ${caption}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center"
                      />
                    ) : (
                      <User className="w-1/3 h-1/3 text-slate-300" />
                    )}
                  </div>
                </div>
                {/* 3 black motion lines top-left */}
                <svg
                  viewBox="0 0 30 30"
                  aria-hidden="true"
                  className="pointer-events-none absolute -top-0.5 -left-0.5 w-[24%] h-[24%]"
                >
                  <g stroke="#0F172A" strokeWidth="3" strokeLinecap="round">
                    <line x1="6" y1="6" x2="14" y2="12" />
                    <line x1="3" y1="14" x2="12" y2="16" />
                    <line x1="6" y1="22" x2="14" y2="20" />
                  </g>
                </svg>
              </div>

              {/* Right: Stacked two-tone brush caption + 3 motion lines + zig-zag underline + pink heart */}
              <div className="relative w-[48%] h-full flex flex-col items-center justify-center text-center pr-[2%]">
                <span
                  className="font-display font-extrabold leading-[0.98] tracking-tight text-slate-900 truncate w-full"
                  style={{
                    fontSize: printExact
                      ? `${Math.min(16, Math.max(9.5, paperConfig.labelHeightMm * 0.17))}pt`
                      : "clamp(10px, 1.45vw, 16px)",
                  }}
                >
                  {lead}
                </span>
                {accent && (
                  <span
                    className="font-display font-extrabold leading-[0.98] tracking-tight truncate w-full"
                    style={{
                      color: "#DF1B6B",
                      fontSize: printExact
                        ? `${Math.min(16.5, Math.max(10, paperConfig.labelHeightMm * 0.175))}pt`
                        : "clamp(10px, 1.5vw, 17px)",
                    }}
                  >
                    {accent}
                  </span>
                )}
                <span
                  className="font-display font-bold text-slate-900 leading-tight mt-[4%] truncate w-full"
                  style={{
                    fontSize: printExact
                      ? `${Math.min(8, Math.max(5.5, paperConfig.labelHeightMm * 0.08))}pt`
                      : "clamp(6px, 0.75vw, 8.5px)",
                  }}
                >
                  #DYPAICoE
                </span>

                {/* 3 motion lines left of pink word + zig-zag underline + outlined heart */}
                <svg
                  viewBox="0 0 100 32"
                  aria-hidden="true"
                  className="w-full h-[28%] mt-[4%] overflow-visible"
                >
                  <path
                    d="M8 10 Q38 4 64 9 Q28 16 58 18"
                    fill="none"
                    stroke="#EC4899"
                    strokeWidth="4.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M80 12 C76 6, 68 10, 72 17 C74 21, 80 25, 80 25 C80 25, 86 21, 88 17 C92 10, 84 6, 80 12 Z"
                    fill="#F472B6"
                    stroke="#0F172A"
                    strokeWidth="2.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </Tag>
          );
        }

        return (
          <Tag
            key={index}
            type={Tag === "button" ? "button" : undefined}
            onClick={onSelectSlot ? () => onSelectSlot(index) : undefined}
            style={slotStyle}
            className={
              onSelectSlot && !printExact
                ? "text-left transition-transform duration-150 hover:scale-[1.015] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 cursor-pointer"
                : ""
            }
          >
            {/* Organic arch die-cut sticker photo frame + hand-drawn laptop sticker doodles */}
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center p-[3.2%]">
              <div
                className="relative w-full h-full bg-white shadow-sm"
                style={{
                  transform: `rotate(${tilt})`,
                  borderRadius: "42% 42% 16% 16%",
                  padding: printExact ? "1.15mm" : "3.6%",
                  border: isWhiteVinyl ? "1px solid #E2E8F0" : "none",
                }}
              >
                <div
                  className="w-full h-full overflow-hidden bg-slate-50 flex items-center justify-center"
                  style={{
                    borderRadius: "40% 40% 14% 14%",
                  }}
                >
                  {photoSrc ? (
                    <img
                      src={photoSrc}
                      alt={`Sticker ${index + 1}: ${caption}`}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover object-center"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-50 flex flex-col items-center justify-center text-slate-300">
                      <User className="w-1/3 h-1/3 stroke-[1.5]" />
                    </div>
                  )}
                </div>

                {/* Hand-drawn doodle props anchored around the die-cut portrait */}
                <StickerDoodles slotIndex={index} />
              </div>
            </div>

            {/* Expressive two-tone caption + marker brush highlight & underline swoosh */}
            <div
              className="relative w-full flex flex-col items-center justify-center shrink-0 overflow-hidden"
              style={{
                height: printExact ? "23%" : "24%",
                paddingTop: printExact ? "0.4mm" : "1.5%",
              }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-[10%] rounded-full pointer-events-none"
                style={{
                  height: printExact ? "3.2mm" : "42%",
                  bottom: printExact ? "1.4mm" : "18%",
                  backgroundColor: brushColor,
                  transform: "rotate(-1deg)",
                }}
              />
              <span
                className="relative font-display font-extrabold tracking-tight text-center leading-none truncate w-full px-1"
                style={{
                  color: leadTextColor,
                  fontSize: printExact
                    ? `${Math.min(14.5, Math.max(9.2, paperConfig.labelHeightMm * 0.155))}pt`
                    : "clamp(9px, 1.3vw, 14.5px)",
                }}
              >
                <span>{lead}</span>
                {accent && (
                  <>
                    {" "}
                    <span style={{ color: accentTextColor }}>{accent}</span>
                  </>
                )}
              </span>
              {/* Hand-drawn marker underline swoosh */}
              <svg
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="relative w-[58%] h-[16%] mt-[2%] pointer-events-none"
              >
                <path
                  d="M4 6 Q50 1 96 5"
                  fill="none"
                  stroke={accentTextColor}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </Tag>
        );
      })}
    </div>
  );
};
