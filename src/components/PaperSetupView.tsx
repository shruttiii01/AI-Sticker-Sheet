import React from "react";
import { AlertTriangle, Printer, RotateCcw } from "lucide-react";
import {
  A4_HEIGHT_MM,
  A4_WIDTH_MM,
  DEFAULT_CAPTIONS,
  DEFAULT_PAPER_CONFIG,
  PAPER_PRESETS,
} from "../constants";
import type { PaperConfig } from "../types";
import { computeA4Slots } from "../utils/sheetLayout";
import { A4SheetRenderer } from "./A4SheetRenderer";

interface PaperSetupViewProps {
  paperConfig: PaperConfig;
  stickerTag: string;
  onChangeConfig: (next: PaperConfig) => void;
  onPrintTestPage: () => void;
  samplePhotoSrc: string | null;
}

export const PaperSetupView: React.FC<PaperSetupViewProps> = ({
  paperConfig,
  stickerTag,
  onChangeConfig,
  onPrintTestPage,
  samplePhotoSrc,
}) => {
  const updateNum = (field: keyof PaperConfig, raw: string, min = 0) => {
    const val = Number(raw);
    if (Number.isNaN(val)) return;
    onChangeConfig({
      ...paperConfig,
      [field]: Math.max(min, val),
    });
  };

  const slots = computeA4Slots(paperConfig);
  const totalUsedWidthMm = slots.reduce(
    (max, slot) => Math.max(max, slot.leftMm + slot.widthMm),
    paperConfig.leftMarginMm +
      paperConfig.columns * paperConfig.labelWidthMm +
      Math.max(0, paperConfig.columns - 1) * paperConfig.gapXMm,
  );

  const totalUsedHeightMm = slots.reduce(
    (max, slot) => Math.max(max, slot.topMm + slot.heightMm),
    paperConfig.topMarginMm +
      paperConfig.rows * paperConfig.labelHeightMm +
      Math.max(0, paperConfig.rows - 1) * paperConfig.gapYMm,
  );

  const exceedsWidth = totalUsedWidthMm > A4_WIDTH_MM;
  const exceedsHeight = totalUsedHeightMm > A4_HEIGHT_MM;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Millimeter Calibration Controls */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-slate-500">
              A4 Portrait (210 × 297 mm) · Pre-Cut Sticker Paper Calibration
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Sticker Paper Dimensions
            </h1>
          </div>

          <button
            type="button"
            onClick={() => onChangeConfig({ ...DEFAULT_PAPER_CONFIG })}
            className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-slate-700">
            Quick Paper Presets
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {PAPER_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  onChangeConfig({
                    ...paperConfig,
                    ...preset.config,
                  })
                }
                className="text-left p-3 rounded-xl border border-slate-200 hover:border-[#15233F] hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <p className="text-xs font-bold text-slate-900">
                  {preset.label}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                  {preset.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Exact Millimeter Inputs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div>
            <label
              htmlFor="cfg-width"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Label Width (mm)
            </label>
            <input
              id="cfg-width"
              type="number"
              step="0.5"
              min="20"
              max="200"
              value={paperConfig.labelWidthMm}
              onChange={(e) => updateNum("labelWidthMm", e.target.value, 10)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 font-mono tabular-nums text-sm text-slate-900 focus:outline-none focus:border-[#15233F]"
            />
          </div>

          <div>
            <label
              htmlFor="cfg-height"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Label Height (mm)
            </label>
            <input
              id="cfg-height"
              type="number"
              step="0.5"
              min="20"
              max="280"
              value={paperConfig.labelHeightMm}
              onChange={(e) => updateNum("labelHeightMm", e.target.value, 10)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 font-mono tabular-nums text-sm text-slate-900 focus:outline-none focus:border-[#15233F]"
            />
          </div>

          <div>
            <label
              htmlFor="cfg-radius"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Corner Radius (mm)
            </label>
            <input
              id="cfg-radius"
              type="number"
              step="0.5"
              min="0"
              max="25"
              value={paperConfig.cornerRadiusMm}
              onChange={(e) => updateNum("cornerRadiusMm", e.target.value, 0)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 font-mono tabular-nums text-sm text-slate-900 focus:outline-none focus:border-[#15233F]"
            />
          </div>

          <div>
            <label
              htmlFor="cfg-cols"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Columns
            </label>
            <input
              id="cfg-cols"
              type="number"
              min="1"
              max="6"
              value={paperConfig.columns}
              onChange={(e) =>
                updateNum("columns", String(Math.round(Number(e.target.value))), 1)
              }
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 font-mono tabular-nums text-sm text-slate-900 focus:outline-none focus:border-[#15233F]"
            />
          </div>

          <div>
            <label
              htmlFor="cfg-rows"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Rows
            </label>
            <input
              id="cfg-rows"
              type="number"
              min="1"
              max="6"
              value={paperConfig.rows}
              onChange={(e) =>
                updateNum("rows", String(Math.round(Number(e.target.value))), 1)
              }
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 font-mono tabular-nums text-sm text-slate-900 focus:outline-none focus:border-[#15233F]"
            />
          </div>

          <div>
            <label
              htmlFor="cfg-top"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Top Margin (mm)
            </label>
            <input
              id="cfg-top"
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={paperConfig.topMarginMm}
              onChange={(e) => updateNum("topMarginMm", e.target.value, 0)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 font-mono tabular-nums text-sm text-slate-900 focus:outline-none focus:border-[#15233F]"
            />
          </div>

          <div>
            <label
              htmlFor="cfg-left"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Left Margin (mm)
            </label>
            <input
              id="cfg-left"
              type="number"
              step="0.5"
              min="0"
              max="100"
              value={paperConfig.leftMarginMm}
              onChange={(e) => updateNum("leftMarginMm", e.target.value, 0)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 font-mono tabular-nums text-sm text-slate-900 focus:outline-none focus:border-[#15233F]"
            />
          </div>

          <div>
            <label
              htmlFor="cfg-gapx"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Horizontal Gap (mm)
            </label>
            <input
              id="cfg-gapx"
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={paperConfig.gapXMm}
              onChange={(e) => updateNum("gapXMm", e.target.value, 0)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 font-mono tabular-nums text-sm text-slate-900 focus:outline-none focus:border-[#15233F]"
            />
          </div>

          <div>
            <label
              htmlFor="cfg-gapy"
              className="block text-xs font-semibold text-slate-700 mb-1.5"
            >
              Vertical Gap (mm)
            </label>
            <input
              id="cfg-gapy"
              type="number"
              step="0.5"
              min="0"
              max="50"
              value={paperConfig.gapYMm}
              onChange={(e) => updateNum("gapYMm", e.target.value, 0)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 font-mono tabular-nums text-sm text-slate-900 focus:outline-none focus:border-[#15233F]"
            />
          </div>
        </div>

        {/* Overflow Check */}
        {(exceedsWidth || exceedsHeight) && (
          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-2.5 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-0.5">
              <p className="font-semibold">Layout exceeds A4 bounds (210 × 297 mm)</p>
              <p className="font-mono tabular-nums">
                Current span: {totalUsedWidthMm.toFixed(1)} mm wide ×{" "}
                {totalUsedHeightMm.toFixed(1)} mm tall. Reduce margins, gaps, or label size.
              </p>
            </div>
          </div>
        )}

        {/* Print Options & Alignment Test */}
        <div className="pt-3 border-t border-slate-100 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={Boolean(paperConfig.includeFestivalSticker)}
                onChange={(e) =>
                  onChangeConfig({
                    ...paperConfig,
                    includeFestivalSticker: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-[#15233F]"
              />
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  +1 Festival Sticker
                </p>
                <p className="text-[11px] text-slate-500">
                  Adds 7th Festival slot on A4
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={paperConfig.showCutGuides}
                onChange={(e) =>
                  onChangeConfig({
                    ...paperConfig,
                    showCutGuides: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-[#15233F]"
              />
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Show Dashed Cut Guides
                </p>
                <p className="text-[11px] text-slate-500">
                  Useful for plain A4 sticker sheets
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50">
              <input
                type="checkbox"
                checked={paperConfig.testGridOnly}
                onChange={(e) =>
                  onChangeConfig({
                    ...paperConfig,
                    testGridOnly: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-[#15233F]"
              />
              <div>
                <p className="text-xs font-semibold text-slate-900">
                  Alignment Test Grid Only
                </p>
                <p className="text-[11px] text-slate-500">
                  Prints outlines & crosshairs (no ink fill)
                </p>
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={onPrintTestPage}
            className="w-full min-h-[48px] px-5 py-2.5 rounded-xl bg-[#15233F] text-white font-display font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#1d3157] transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Alignment Test Page (100% Scale)</span>
          </button>
        </div>
      </div>

      {/* Right: Live A4 Calibration Schematic */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Live A4 Placement
            </h2>
            <p className="text-xs text-slate-500 font-mono tabular-nums">
              Span: {totalUsedWidthMm.toFixed(1)} / 210 mm · {totalUsedHeightMm.toFixed(1)} / 297 mm
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            Right {(A4_WIDTH_MM - totalUsedWidthMm).toFixed(1)} mm · Bottom{" "}
            {(A4_HEIGHT_MM - totalUsedHeightMm).toFixed(1)} mm
          </span>
        </div>

        <div className="max-w-[380px] mx-auto bg-slate-100 p-3 rounded-xl border border-slate-200">
          <A4SheetRenderer
            photoSrc={samplePhotoSrc}
            captions={DEFAULT_CAPTIONS}
            paperConfig={paperConfig}
            stickerTag={stickerTag}
          />
        </div>
      </div>
    </div>
  );
};
