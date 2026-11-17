import React, { useState } from "react";
import { Download, Printer } from "lucide-react";
import { A4_HEIGHT_MM, A4_WIDTH_MM } from "../constants";

export const EXACT_STICKER_SRC =
  "/assets/aistudio/EDITED_LAPTOP_STCKER__89660d94.png";

export type ExactCopyLayout = 1 | 2 | 4 | 6;

interface ExactLayoutSpec {
  copies: ExactCopyLayout;
  label: string;
  sublabel: string;
  cols: number;
  rows: number;
  widthMm: number;
  heightMm: number;
  topMm: number;
  leftMm: number;
  gapXMm: number;
  gapYMm: number;
}

export const EXACT_LAYOUTS: Record<ExactCopyLayout, ExactLayoutSpec> = {
  1: {
    copies: 1,
    label: "1 Large Laptop Sticker",
    sublabel: "180 × 95 mm · Centered",
    cols: 1,
    rows: 1,
    widthMm: 180,
    heightMm: 95,
    topMm: 95,
    leftMm: 15,
    gapXMm: 0,
    gapYMm: 0,
  },
  2: {
    copies: 2,
    label: "2 Stacked Laptop Stickers",
    sublabel: "176 × 93 mm · 2 per A4",
    cols: 1,
    rows: 2,
    widthMm: 176,
    heightMm: 93,
    topMm: 45,
    leftMm: 17,
    gapXMm: 0,
    gapYMm: 20,
  },
  4: {
    copies: 4,
    label: "4 Laptop Stickers",
    sublabel: "88 × 47 mm · 2 × 2 Grid",
    cols: 2,
    rows: 2,
    widthMm: 88,
    heightMm: 47,
    topMm: 85,
    leftMm: 12,
    gapXMm: 10,
    gapYMm: 22,
  },
  6: {
    copies: 6,
    label: "6 Laptop Stickers",
    sublabel: "88 × 47 mm · 2 × 3 Grid",
    cols: 2,
    rows: 3,
    widthMm: 88,
    heightMm: 47,
    topMm: 52,
    leftMm: 12,
    gapXMm: 10,
    gapYMm: 22,
  },
};

interface ExactA4RendererProps {
  copies: ExactCopyLayout;
  showCutGuides: boolean;
  stickerTag?: string;
  printExact?: boolean;
}

export const ExactA4Renderer: React.FC<ExactA4RendererProps> = ({
  copies,
  showCutGuides,
  stickerTag = "#DYPAICoE",
  printExact = false,
}) => {
  const spec = EXACT_LAYOUTS[copies];
  const items = Array.from({ length: spec.copies }, (_, idx) => idx);
  const trimmedTag = stickerTag.trim();

  const pctX = (v: number) => `${(v / A4_WIDTH_MM) * 100}%`;
  const pctY = (v: number) => `${(v / A4_HEIGHT_MM) * 100}%`;

  return (
    <div
      style={
        printExact
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
            }
      }
      className={
        printExact
          ? ""
          : "rounded-xl border border-slate-200 shadow-sm select-none"
      }
    >
      {items.map((idx) => {
        const col = idx % spec.cols;
        const row = Math.floor(idx / spec.cols);
        const leftMm = spec.leftMm + col * (spec.widthMm + spec.gapXMm);
        const topMm = spec.topMm + row * (spec.heightMm + spec.gapYMm);

        return (
          <div
            key={idx}
            style={
              printExact
                ? {
                    position: "absolute",
                    left: `${leftMm}mm`,
                    top: `${topMm}mm`,
                    width: `${spec.widthMm}mm`,
                    height: `${spec.heightMm}mm`,
                    border: showCutGuides ? "0.3mm dashed #CBD5E1" : "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    paddingBottom: trimmedTag ? `${spec.heightMm * 0.01}mm` : 0,
                    boxSizing: "border-box",
                  }
                : {
                    position: "absolute",
                    left: pctX(leftMm),
                    top: pctY(topMm),
                    width: pctX(spec.widthMm),
                    height: pctY(spec.heightMm),
                    border: showCutGuides ? "1px dashed #CBD5E1" : "none",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }
            }
          >
            <img
              src={EXACT_STICKER_SRC}
              alt={`Exact laptop sticker ${idx + 1}`}
              className={
                trimmedTag
                  ? "w-full flex-1 min-h-0 object-contain"
                  : "w-full h-full object-contain"
              }
            />
            {trimmedTag && (
              <span
                className="font-display font-extrabold tracking-wide leading-none shrink-0 mt-[1.5%] px-[3.5%] py-[1%] rounded-full bg-[#15233F] text-white"
                style={{
                  fontSize: printExact
                    ? `${Math.min(10, Math.max(6.5, spec.heightMm * 0.085))}pt`
                    : "clamp(6.5px, 0.95vw, 12px)",
                }}
              >
                {trimmedTag}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

interface ExactStickerViewProps {
  copies: ExactCopyLayout;
  onChangeCopies: (copies: ExactCopyLayout) => void;
  showCutGuides: boolean;
  onChangeShowCutGuides: (show: boolean) => void;
  stickerTag: string;
  onPrintExact: () => void;
}

export const ExactStickerView: React.FC<ExactStickerViewProps> = ({
  copies,
  onChangeCopies,
  showCutGuides,
  onChangeShowCutGuides,
  stickerTag,
  onPrintExact,
}) => {
  const [exporting, setExporting] = useState(false);
  const trimmedTag = stickerTag.trim();

  const handleDownloadA4Png = async () => {
    setExporting(true);
    try {
      const dpi = 200;
      const mmToPx = dpi / 25.4;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(A4_WIDTH_MM * mmToPx);
      canvas.height = Math.round(A4_HEIGHT_MM * mmToPx);
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("Could not load reference sticker."));
        el.src = EXACT_STICKER_SRC;
      });

      const spec = EXACT_LAYOUTS[copies];
      const imgAspect = img.naturalWidth / img.naturalHeight;

      for (let i = 0; i < spec.copies; i++) {
        const col = i % spec.cols;
        const row = Math.floor(i / spec.cols);
        const x = (spec.leftMm + col * (spec.widthMm + spec.gapXMm)) * mmToPx;
        const y = (spec.topMm + row * (spec.heightMm + spec.gapYMm)) * mmToPx;
        const w = spec.widthMm * mmToPx;
        const h = spec.heightMm * mmToPx;

        if (showCutGuides) {
          ctx.save();
          ctx.strokeStyle = "#CBD5E1";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([8, 6]);
          ctx.strokeRect(x, y, w, h);
          ctx.restore();
        }

        // Preserve exact aspect ratio (object-contain) with zero cropping or distortion
        const tagBandH = trimmedTag ? h * 0.13 : 0;
        const imgBoxH = h - tagBandH;
        const boxAspect = w / imgBoxH;
        let drawW = w;
        let drawH = imgBoxH;
        let drawX = x;
        let drawY = y;
        if (imgAspect > boxAspect) {
          drawH = w / imgAspect;
          drawY = y + (imgBoxH - drawH) / 2;
        } else {
          drawW = imgBoxH * imgAspect;
          drawX = x + (w - drawW) / 2;
        }
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        if (trimmedTag) {
          ctx.save();
          const fontPx = Math.max(14, Math.round(spec.heightMm * 0.082 * mmToPx * 0.36));
          ctx.font = `800 ${fontPx}px "Plus Jakarta Sans", sans-serif`;
          const badgeW = Math.min(w * 0.9, ctx.measureText(trimmedTag).width + fontPx * 1.1);
          const badgeH = fontPx * 1.55;
          const bx = x + (w - badgeW) / 2;
          const by = y + h - tagBandH * 0.45 - badgeH / 2;
          const r = badgeH / 2;
          ctx.beginPath();
          ctx.moveTo(bx + r, by);
          ctx.arcTo(bx + badgeW, by, bx + badgeW, by + badgeH, r);
          ctx.arcTo(bx + badgeW, by + badgeH, bx, by + badgeH, r);
          ctx.arcTo(bx, by + badgeH, bx, by, r);
          ctx.arcTo(bx, by, bx + badgeW, by, r);
          ctx.closePath();
          ctx.fillStyle = "#15233F";
          ctx.fill();

          ctx.fillStyle = "#FFFFFF";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(trimmedTag, x + w / 2, by + badgeH / 2 + fontPx * 0.04, badgeW - fontPx * 0.5);
          ctx.restore();
        }
      }

      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = `laptop-sticker-exact-${copies}x-a4.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-500">
            Unchanged Reference Asset · Ready for A4 Vinyl Print
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Exact Laptop Sticker Sheet
          </h1>
          <p className="text-sm text-slate-600">
            Renders your uploaded sticker cleanly at 100% original artwork with zero edits.
          </p>
        </div>

        {/* Exact preview + lower active sticker stamp */}
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center gap-2">
          <img
            src={EXACT_STICKER_SRC}
            alt="Exact uploaded laptop sticker"
            className="w-full max-h-44 object-contain"
          />
          {trimmedTag && (
            <span className="font-display font-extrabold text-xs tracking-wide px-3 py-1 rounded-full bg-[#15233F] text-white">
              {trimmedTag}
            </span>
          )}
        </div>

        {/* Copies on A4 */}
        <div className="space-y-2.5">
          <span className="block text-xs font-semibold text-slate-800">
            Stickers per A4 Page
          </span>
          <div className="grid grid-cols-2 gap-2.5">
            {([1, 2, 4, 6] as ExactCopyLayout[]).map((count) => {
              const spec = EXACT_LAYOUTS[count];
              const active = copies === count;
              return (
                <button
                  key={count}
                  type="button"
                  onClick={() => onChangeCopies(count)}
                  className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                    active
                      ? "border-[#15233F] bg-slate-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <p className="text-xs font-bold text-slate-900">
                    {spec.label}
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                    {spec.sublabel}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
          <input
            type="checkbox"
            checked={showCutGuides}
            onChange={(e) => onChangeShowCutGuides(e.target.checked)}
            className="w-4 h-4 accent-[#15233F]"
          />
          <div>
            <p className="text-xs font-semibold text-slate-900">
              Show Dashed Cut Margins
            </p>
            <p className="text-[11px] text-slate-500">
              Light border around each sticker slot for easy hand-cutting
            </p>
          </div>
        </label>

        <div className="space-y-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onPrintExact}
            className="w-full min-h-[52px] px-6 py-3 rounded-xl bg-[#15233F] text-white font-display font-bold text-base flex items-center justify-center gap-2.5 hover:bg-[#1d3157] transition-colors cursor-pointer"
          >
            <Printer className="w-5 h-5" />
            <span>Print Exact Sticker Sheet (A4)</span>
          </button>

          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              disabled={exporting}
              onClick={handleDownloadA4Png}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{exporting ? "Rendering..." : "Download A4 PNG"}</span>
            </button>

            <a
              href={EXACT_STICKER_SRC}
              download="exact-laptop-sticker.png"
              className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50"
            >
              <Download className="w-4 h-4" />
              <span>Original PNG</span>
            </a>
          </div>
        </div>
      </div>

      {/* Right: Live A4 Preview */}
      <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              A4 Print Preview
            </h2>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              {EXACT_LAYOUTS[copies].label} · 210 × 297 mm
            </p>
          </div>
        </div>

        <div className="max-w-[420px] mx-auto bg-slate-100 p-3 rounded-xl border border-slate-200">
          <ExactA4Renderer
            copies={copies}
            showCutGuides={showCutGuides}
            stickerTag={stickerTag}
          />
        </div>
      </div>
    </div>
  );
};
