import React from "react";
import { User } from "lucide-react";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  FESTIVAL_STICKER_THEME,
  STICKER_THEMES,
} from "../constants";
import type { PaperConfig } from "../types";
import { computeA4Slots } from "../utils/sheetLayout";
import { StickerDoodles } from "./StickerDoodles";

interface A4SheetRendererProps {
  photoSrc: string | null;
  captions: string[];
  paperConfig: PaperConfig;
  stickerTag?: string;
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
  stickerTag = "#DYPAICoE",
  selectedSlot = null,
  onSelectSlot,
  printExact = false,
}) => {
  const trimmedTag = stickerTag.trim();
  const slots = computeA4Slots(paperConfig);
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

  const maxRightMm = slots.reduce((m, s) => Math.max(m, s.leftMm + s.widthMm), 0);
  const maxBottomMm = slots.reduce((m, s) => Math.max(m, s.topMm + s.heightMm), 0);

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
      {!printExact && slots.length > 0 && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 border border-dashed border-slate-200/80"
          style={{
            top: pctY(slots[0].topMm),
            left: pctX(slots[0].leftMm),
            right: "auto",
            bottom: "auto",
            width: pctX(maxRightMm - slots[0].leftMm),
            height: pctY(maxBottomMm - slots[0].topMm),
          }}
        />
      )}

      {slots.map((slot) => {
        const index = slot.index;
        const leftMm = slot.leftMm;
        const topMm = slot.topMm;
        const slotWidthMm = slot.widthMm;
        const slotHeightMm = slot.heightMm;
        const isFestival = slot.isFestival;

        const theme = isFestival
          ? FESTIVAL_STICKER_THEME
          : STICKER_THEMES[index % STICKER_THEMES.length];
        const caption = captions[index] ?? (isFestival ? "Festive Vibes" : "");
        const isSelected = selectedSlot === index;

        const isWideHorizontal = isSideBySide || (isFestival && slotWidthMm > slotHeightMm * 1.35);

        const cardBg = isWhiteVinyl || isSideBySide ? "#FFFFFF" : theme.bgColor;
        const leadTextColor =
          isWhiteVinyl || isSideBySide ? "#0F172A" : theme.textColor;
        const accentTextColor =
          isFestival
            ? "#D97706"
            : isWhiteVinyl || isSideBySide
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
              width: `${slotWidthMm}mm`,
              height: `${slotHeightMm}mm`,
              borderRadius: `${paperConfig.cornerRadiusMm}mm`,
              overflow: "hidden",
              backgroundColor: paperConfig.testGridOnly
                ? "transparent"
                : cardBg,
              border: paperConfig.testGridOnly
                ? "0.4mm dashed #0F172A"
                : isWhiteVinyl || isSideBySide
                  ? "0.35mm dashed #CBD5E1"
                  : isFestival
                    ? `0.45mm solid ${theme.borderColor}`
                    : paperConfig.showCutGuides
                      ? "0.3mm dashed #94A3B8"
                      : "none",
              padding: `${Math.min(slotWidthMm, slotHeightMm) * 0.065}mm`,
              display: "flex",
              flexDirection: isWideHorizontal ? "row" : "column",
              alignItems: isWideHorizontal ? "center" : undefined,
              justifyContent: "space-between",
              boxSizing: "border-box",
            }
          : {
              position: "absolute",
              left: pctX(leftMm),
              top: pctY(topMm),
              width: pctX(slotWidthMm),
              height: pctY(slotHeightMm),
              borderRadius: `${(paperConfig.cornerRadiusMm / A4_WIDTH_MM) * 100}% / ${(paperConfig.cornerRadiusMm / A4_HEIGHT_MM) * 100}%`,
              overflow: "hidden",
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
                      : `1.5px solid ${theme.borderColor}`,
              boxShadow:
                (isWhiteVinyl || isSideBySide || isFestival) && !paperConfig.testGridOnly
                  ? "0 4px 14px rgba(15, 23, 42, 0.08)"
                  : undefined,
              padding: isWideHorizontal ? "1.6% 2.2%" : "2.0%",
              display: "flex",
              flexDirection: isWideHorizontal ? "row" : "column",
              alignItems: isWideHorizontal ? "center" : undefined,
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
                  Slot {index + 1} · {slotWidthMm}×{slotHeightMm}mm
                </span>
              </div>
            </div>
          );
        }

        const Tag = onSelectSlot && !printExact ? "button" : "div";
        const tilt = isFestival ? "-0.8deg" : SLOT_TILTS[index % SLOT_TILTS.length];
        const brushColor = isFestival
          ? "rgba(250, 204, 21, 0.35)"
          : isWhiteVinyl
            ? "rgba(244, 114, 182, 0.22)"
            : BRUSH_HIGHLIGHTS[index % BRUSH_HIGHLIGHTS.length];
        const { lead, accent } = splitTwoToneCaption(caption);

        if (isWideHorizontal) {
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
              {/* Left: Portrait with Festival or motion doodles */}
              <div
                className="relative h-full flex items-center justify-center"
                style={{ width: isFestival ? "36%" : "50%" }}
              >
                <div
                  className="relative w-full h-[90%] bg-white shadow-sm border border-slate-200"
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
                  {isFestival && <StickerDoodles slotIndex={6} />}
                </div>
                {!isFestival && (
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
                )}
              </div>

              {/* Right: Stacked two-tone brush caption + festive/zig-zag motif + lower stamp */}
              <div
                className="relative h-full flex flex-col items-center justify-center text-center pr-[2%]"
                style={{ width: isFestival ? "62%" : "48%" }}
              >
                {isFestival && (
                  <span
                    className="font-display font-extrabold uppercase tracking-widest text-[#B45309] mb-[2%]"
                    style={{
                      fontSize: printExact
                        ? "7pt"
                        : "clamp(6px, 0.78vw, 9px)",
                    }}
                  >
                    Festival Edition · Special Sticker
                  </span>
                )}
                <span
                  className="font-display font-extrabold leading-[0.98] tracking-tight text-slate-900 truncate w-full"
                  style={{
                    fontSize: printExact
                      ? `${Math.min(18, Math.max(9.5, slotHeightMm * 0.21))}pt`
                      : isFestival
                        ? "clamp(12px, 1.8vw, 20px)"
                        : "clamp(10px, 1.45vw, 16px)",
                  }}
                >
                  {lead}
                </span>
                {accent && (
                  <span
                    className="font-display font-extrabold leading-[0.98] tracking-tight truncate w-full"
                    style={{
                      color: isFestival ? "#EA580C" : "#DF1B6B",
                      fontSize: printExact
                        ? `${Math.min(18.5, Math.max(10, slotHeightMm * 0.22))}pt`
                        : isFestival
                          ? "clamp(12px, 1.85vw, 21px)"
                          : "clamp(10px, 1.5vw, 17px)",
                    }}
                  >
                    {accent}
                  </span>
                )}

                {/* Zig-zag underline + festive/heart motif */}
                <svg
                  viewBox="0 0 120 26"
                  aria-hidden="true"
                  className="w-[75%] h-[18%] mt-[2%] overflow-visible"
                >
                  <path
                    d="M8 10 Q44 3 76 9 Q36 16 68 18"
                    fill="none"
                    stroke={isFestival ? "#F59E0B" : "#EC4899"}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  {isFestival ? (
                    <path
                      d="M96 4 L99 10 L106 12 L99 14 L96 20 L93 14 L86 12 L93 10 Z"
                      fill="#FACC15"
                      stroke="#15233F"
                      strokeWidth="2.2"
                    />
                  ) : (
                    <path
                      d="M94 9 C90 3, 82 7, 86 14 C88 18, 94 22, 94 22 C94 22, 100 18, 102 14 C106 7, 98 3, 94 9 Z"
                      fill="#F472B6"
                      stroke="#0F172A"
                      strokeWidth="2.6"
                      strokeLinejoin="round"
                    />
                  )}
                </svg>

                {trimmedTag && (
                  <span
                    className="inline-block font-display font-extrabold tracking-wide leading-none mt-[3%] px-[6%] py-[2%] rounded-full bg-[#15233F] text-white truncate max-w-full"
                    style={{
                      fontSize: printExact
                        ? `${Math.min(8.2, Math.max(6, slotHeightMm * 0.095))}pt`
                        : "clamp(6.5px, 0.85vw, 10px)",
                    }}
                  >
                    {trimmedTag}
                  </span>
                )}
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

            {/* Expressive two-tone caption + marker brush highlight + lower #DYPAICoE stamp */}
            <div
              className="relative w-full flex flex-col items-center justify-center shrink-0"
              style={{
                height: trimmedTag
                  ? printExact
                    ? "29%"
                    : "30%"
                  : printExact
                    ? "25%"
                    : "26%",
                paddingTop: printExact ? "0.2mm" : "0.5%",
              }}
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-[10%] rounded-full pointer-events-none"
                style={{
                  height: printExact ? "3mm" : "34%",
                  bottom: trimmedTag
                    ? printExact
                      ? "4.8mm"
                      : "36%"
                    : printExact
                      ? "2.5mm"
                      : "26%",
                  backgroundColor: brushColor,
                  transform: "rotate(-1deg)",
                }}
              />
              <span
                className="relative font-display font-extrabold tracking-tight text-center leading-none truncate w-full px-1"
                style={{
                  color: leadTextColor,
                  fontSize: printExact
                    ? `${Math.min(13, Math.max(8, slotHeightMm * 0.145))}pt`
                    : "clamp(8px, 1.15vw, 13px)",
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
                className="relative w-[52%] h-[10%] mt-[1%] pointer-events-none"
              >
                <path
                  d="M4 6 Q50 1 96 5"
                  fill="none"
                  stroke={accentTextColor}
                  strokeWidth="2.8"
                  strokeLinecap="round"
                />
              </svg>
              {trimmedTag && (
                <span
                  className="relative font-display font-extrabold tracking-wide leading-none mt-[2.5%] px-[5%] py-[1.6%] rounded-full truncate max-w-[92%]"
                  style={{
                    backgroundColor:
                      !isWhiteVinyl && theme.id === "navy" ? "#FFFFFF" : "#15233F",
                    color:
                      !isWhiteVinyl && theme.id === "navy" ? "#15233F" : "#FFFFFF",
                    fontSize: printExact
                      ? `${Math.min(7.8, Math.max(5.5, slotHeightMm * 0.088))}pt`
                      : "clamp(6px, 0.78vw, 9.5px)",
                  }}
                >
                  {trimmedTag}
                </span>
              )}
            </div>
          </Tag>
        );
      })}
    </div>
  );
};
