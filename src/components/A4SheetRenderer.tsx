import React from "react";
import { User } from "lucide-react";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  STICKER_THEMES,
} from "../constants";
import type { PaperConfig } from "../types";
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
  stickerTag = "#DYPBSAICoE",
  selectedSlot = null,
  onSelectSlot,
  printExact = false,
}) => {
  const trimmedTag = stickerTag.trim();
  const totalSlots = Math.min(6, paperConfig.columns * paperConfig.rows);
  const layoutVariant =
    paperConfig.layoutVariant ??
    (paperConfig.dieCutWhiteVinyl ? "white-vinyl" : "colored");
  const isWhiteVinyl = layoutVariant === "white-vinyl";

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

  const totalGridW =
    paperConfig.columns * paperConfig.labelWidthMm +
    Math.max(0, paperConfig.columns - 1) * paperConfig.gapXMm;
  const totalGridH =
    paperConfig.rows * paperConfig.labelHeightMm +
    Math.max(0, paperConfig.rows - 1) * paperConfig.gapYMm;

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
            width: pctX(totalGridW),
            height: pctY(totalGridH),
          }}
        />
      )}

      {Array.from({ length: totalSlots }).map((_, index) => {
        const col = index % paperConfig.columns;
        const row = Math.floor(index / paperConfig.columns);
        const leftMm =
          paperConfig.leftMarginMm +
          col * (paperConfig.labelWidthMm + paperConfig.gapXMm);
        const topMm =
          paperConfig.topMarginMm +
          row * (paperConfig.labelHeightMm + paperConfig.gapYMm);
        const slotWidthMm = paperConfig.labelWidthMm;
        const slotHeightMm = paperConfig.labelHeightMm;

        const theme = STICKER_THEMES[index % STICKER_THEMES.length];
        const caption = captions[index] ?? "";
        const isSelected = selectedSlot === index;

        const cardBg = isWhiteVinyl ? "#FFFFFF" : theme.bgColor;
        const leadTextColor = isWhiteVinyl ? "#0F172A" : theme.textColor;
        const accentTextColor = isWhiteVinyl
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
                : paperConfig.showCutGuides
                  ? "0.35mm dashed #94A3B8"
                  : "0.5mm solid #15233F",
              padding: `${Math.min(slotWidthMm, slotHeightMm) * 0.06}mm`,
              display: "flex",
              flexDirection: "column",
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
                  ? "2.5px solid #0F172A"
                  : paperConfig.showCutGuides
                    ? "1.5px dashed #94A3B8"
                    : "2px solid #15233F",
              boxShadow: !paperConfig.testGridOnly
                ? "2.5px 2.5px 0px #15233F"
                : undefined,
              padding: "2.0%",
              display: "flex",
              flexDirection: "column",
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
        const brushColor = isWhiteVinyl
          ? "rgba(244, 114, 182, 0.22)"
          : BRUSH_HIGHLIGHTS[index % BRUSH_HIGHLIGHTS.length];
        const { lead, accent } = splitTwoToneCaption(caption);

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
            {/* Uniform Comic Halftone Corner Dots for Cartoon Depth */}
            <svg
              viewBox="0 0 100 100"
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.14]"
            >
              <g fill={!isWhiteVinyl && theme.id === "navy" ? "#FFFFFF" : "#15233F"}>
                <circle cx="8" cy="8" r="1.4" />
                <circle cx="15" cy="8" r="1.2" />
                <circle cx="22" cy="8" r="0.9" />
                <circle cx="8" cy="15" r="1.2" />
                <circle cx="15" cy="15" r="0.9" />
                <circle cx="92" cy="8" r="1.4" />
                <circle cx="85" cy="8" r="1.2" />
                <circle cx="78" cy="8" r="0.9" />
                <circle cx="92" cy="15" r="1.2" />
                <circle cx="85" cy="15" r="0.9" />
              </g>
            </svg>

            {/* Centered Upright 1:1 Square Cartoon Portrait Frame + Identical Cartoon Accents */}
            <div className="relative w-full flex-1 min-h-0 flex items-center justify-center p-[2.6%]">
              <div
                className="relative h-full max-w-full aspect-square bg-white"
                style={{
                  borderRadius: "8%",
                  padding: printExact ? "1mm" : "3.2%",
                  border: printExact ? "0.48mm solid #15233F" : "2px solid #15233F",
                  boxShadow: printExact
                    ? "0.85mm 0.85mm 0 #15233F"
                    : "2.5px 2.5px 0 #15233F",
                }}
              >
                <div
                  className="w-full h-full overflow-hidden bg-[#EFF6FF] flex items-center justify-center"
                  style={{
                    borderRadius: "6%",
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
                    <div className="w-full h-full bg-[#EFF6FF] flex flex-col items-center justify-center text-slate-400">
                      <User className="w-1/3 h-1/3 stroke-[1.75]" />
                    </div>
                  )}
                </div>

                <StickerDoodles slotIndex={index} />
              </div>
            </div>

            {/* Expressive two-tone caption + marker brush highlight + lower #DYPBSAICoE stamp */}
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
