import React, { useState } from "react";
import {
  ArrowLeft,
  Check,
  Download,
  Printer,
  RotateCcw,
  Shuffle,
  SlidersHorizontal,
  Sparkles,
  UserPlus,
} from "lucide-react";
import {
  ALL_CAPTIONS,
  DEFAULT_CAPTIONS,
  STICKER_STYLES,
  STICKER_THEMES,
} from "../constants";
import type { PaperConfig, StickerStyle } from "../types";
import { renderA4SheetToPng } from "../utils/exportA4Png";
import { A4SheetRenderer } from "./A4SheetRenderer";

export type PhotoMode = "styled" | "original" | "ai";

interface StickerStudioStepProps {
  firstName: string;
  style: StickerStyle;
  onChangeStyle: (style: StickerStyle) => void;
  capturedPhoto: string;
  styledPhoto: string | null;
  avatarPhoto: string | null;
  photoMode: PhotoMode;
  onChangePhotoMode: (mode: PhotoMode) => void;
  onAvatarGenerated: (avatarUrl: string) => void;
  captions: string[];
  onChangeCaption: (index: number, caption: string) => void;
  onSetAllCaptions: (captions: string[]) => void;
  paperConfig: PaperConfig;
  onChangePaperConfig: (next: PaperConfig) => void;
  onBackToCamera: () => void;
  onOpenPaperSetup: () => void;
  onSaveAndPrint: () => Promise<void>;
  onSaveOnly: () => Promise<void>;
  onStartNextVisitor: () => void;
}

export const StickerStudioStep: React.FC<StickerStudioStepProps> = ({
  firstName,
  style,
  onChangeStyle,
  capturedPhoto,
  styledPhoto,
  avatarPhoto,
  photoMode,
  onChangePhotoMode,
  onAvatarGenerated,
  captions,
  onChangeCaption,
  onSetAllCaptions,
  paperConfig,
  onChangePaperConfig,
  onBackToCamera,
  onOpenPaperSetup,
  onSaveAndPrint,
  onSaveOnly,
  onStartNextVisitor,
}) => {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const [exportingPng, setExportingPng] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null);

  const activePhoto =
    photoMode === "ai" && avatarPhoto
      ? avatarPhoto
      : photoMode === "styled" && styledPhoto
        ? styledPhoto
        : capturedPhoto;

  const handleShuffleCaptions = () => {
    const pool = [...ALL_CAPTIONS];
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    onSetAllCaptions(pool.slice(0, 6));
  };

  const handleResetCaptions = () => {
    onSetAllCaptions([...DEFAULT_CAPTIONS]);
  };

  const handleGenerateAvatar = async () => {
    setAvatarLoading(true);
    setAvatarMessage(null);
    try {
      const res = await fetch("/api/generate-avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: capturedPhoto,
          style,
        }),
      });
      const data = (await res.json()) as {
        avatarDataUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.avatarDataUrl) {
        setAvatarMessage(
          data.error ||
            "Paid AI avatar unavailable — using free instant style filter."
        );
        return;
      }
      onAvatarGenerated(data.avatarDataUrl);
      onChangePhotoMode("ai");
      setAvatarMessage("AI avatar generated. Switch looks anytime below.");
    } catch {
      setAvatarMessage(
        "Could not reach avatar service — using free instant style filter."
      );
    } finally {
      setAvatarLoading(false);
    }
  };

  const handleDownloadPng = async () => {
    setExportingPng(true);
    try {
      const pngUrl = await renderA4SheetToPng({
        photoSrc: activePhoto,
        captions,
        paperConfig,
        firstName,
      });
      const link = document.createElement("a");
      const safeName = (firstName.trim() || "visitor")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      link.href = pngUrl;
      link.download = `dyp-aicoe-stickers-${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setExportingPng(false);
    }
  };

  const handleQuickSave = async () => {
    await onSaveOnly();
    setSavedNotice(true);
    window.setTimeout(() => setSavedNotice(false), 2400);
  };

  const handleConfirmPrint = async () => {
    await onSaveAndPrint();
    setShowPrintModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Controls: Sticker Style, Caption Swapper & Print Actions */}
        <div className="lg:col-span-6 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Step 3 of 3 · {firstName} · {style}
                </p>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                  Customize & Print Stickers
                </h1>
              </div>

              <button
                type="button"
                onClick={onBackToCamera}
                className="min-h-[40px] px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Retake</span>
              </button>
            </div>

            {/* Instant Style Selector & Photo Mode Toggle (100% Free, No API Key Needed) */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800">
                  Doodle Collage Mode (Instant · No API Key Needed)
                </span>
                <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5">
                  <button
                    type="button"
                    onClick={() => onChangePhotoMode("original")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      photoMode === "original"
                        ? "bg-white text-[#15233F] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Real Photo + Doodles
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangePhotoMode("styled")}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      photoMode === "styled"
                        ? "bg-white text-[#15233F] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {style} Filter
                  </button>
                  {avatarPhoto && (
                    <button
                      type="button"
                      onClick={() => onChangePhotoMode("ai")}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                        photoMode === "ai"
                          ? "bg-white text-[#15233F] shadow-xs"
                          : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      AI Avatar
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {STICKER_STYLES.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        onChangeStyle(opt);
                        onChangePhotoMode("styled");
                      }}
                      className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap cursor-pointer ${
                        style === opt && photoMode === "styled"
                          ? "bg-[#15233F] text-white border-[#15233F]"
                          : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  disabled={avatarLoading}
                  onClick={handleGenerateAvatar}
                  className="min-h-[34px] px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-[11px] font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60 flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  title="Optional: requires a paid billing-enabled Gemini API key"
                >
                  <Sparkles className="w-3 h-3 text-[#F28C38]" />
                  <span>
                    {avatarLoading ? "Generating..." : "AI Avatar (Paid Key)"}
                  </span>
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-800">
                  Sticker Layout
                </span>
                <div className="inline-flex flex-wrap rounded-lg bg-slate-200/70 p-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      onChangePaperConfig({
                        ...paperConfig,
                        dieCutWhiteVinyl: false,
                        layoutVariant: "colored",
                      })
                    }
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      (paperConfig.layoutVariant ?? (paperConfig.dieCutWhiteVinyl ? "white-vinyl" : "colored")) === "colored"
                        ? "bg-white text-[#15233F] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    6 Colored Labels
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangePaperConfig({
                        ...paperConfig,
                        dieCutWhiteVinyl: true,
                        layoutVariant: "white-vinyl",
                      })
                    }
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      (paperConfig.layoutVariant ?? (paperConfig.dieCutWhiteVinyl ? "white-vinyl" : "colored")) === "white-vinyl"
                        ? "bg-white text-[#15233F] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    White Vinyl
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onChangePaperConfig({
                        ...paperConfig,
                        dieCutWhiteVinyl: true,
                        layoutVariant: "side-by-side",
                      })
                    }
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      paperConfig.layoutVariant === "side-by-side"
                        ? "bg-white text-[#15233F] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Side-by-Side Replica
                  </button>
                </div>
              </div>

              {avatarMessage && (
                <p className="text-xs text-slate-600 bg-white border border-slate-200 rounded-lg px-3 py-2">
                  {avatarMessage}
                </p>
              )}
            </div>

            {/* Caption Swap List (6 stickers × 15 caption choices) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">
                  Swap Any Caption (15 options)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleShuffleCaptions}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Shuffle</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleResetCaptions}
                    className="min-h-[36px] px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Defaults</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {STICKER_THEMES.map((theme, idx) => {
                  const isFocused = selectedSlot === idx;
                  return (
                    <div
                      key={theme.id}
                      onFocus={() => setSelectedSlot(idx)}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border transition-colors ${
                        isFocused
                          ? "border-[#15233F] bg-slate-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <span
                        className="w-6 h-6 rounded-md shrink-0 border"
                        style={{
                          backgroundColor: theme.bgColor,
                          borderColor: theme.borderColor,
                        }}
                        title={theme.name}
                      />
                      <div className="flex-1 min-w-0">
                        <label
                          htmlFor={`caption-select-${idx}`}
                          className="block text-[11px] font-medium text-slate-500 leading-none mb-1"
                        >
                          Sticker {idx + 1} · {theme.name}
                        </label>
                        <select
                          id={`caption-select-${idx}`}
                          value={captions[idx] ?? DEFAULT_CAPTIONS[idx]}
                          onChange={(e) => onChangeCaption(idx, e.target.value)}
                          className="w-full text-sm font-semibold text-slate-900 bg-transparent focus:outline-none cursor-pointer truncate"
                        >
                          {ALL_CAPTIONS.map((cap) => (
                            <option key={cap} value={cap}>
                              {cap}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Primary Print & Save Actions */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                className="w-full min-h-[52px] px-6 py-3 rounded-xl bg-[#15233F] text-white font-display font-bold text-base flex items-center justify-center gap-2.5 hover:bg-[#1d3157] transition-colors cursor-pointer"
              >
                <Printer className="w-5 h-5" />
                <span>Preview & Print A4 Sheet</span>
              </button>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={handleQuickSave}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>{savedNotice ? "Saved" : "Save Output"}</span>
                </button>

                <button
                  type="button"
                  disabled={exportingPng}
                  onClick={handleDownloadPng}
                  className="min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 disabled:opacity-60 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>{exportingPng ? "Rendering..." : "Download A4 PNG"}</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenPaperSetup}
                  className="col-span-2 sm:col-span-1 min-h-[44px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Paper ({paperConfig.labelWidthMm}×{paperConfig.labelHeightMm}mm)</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Preview: Live Calibrated A4 Sheet */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                A4 Sheet Preview
              </h2>
              <p className="text-xs text-slate-500 font-mono tabular-nums">
                {paperConfig.columns}×{paperConfig.rows} · {paperConfig.labelWidthMm}×{paperConfig.labelHeightMm}mm · Top {paperConfig.topMarginMm}mm · Left {paperConfig.leftMarginMm}mm
              </p>
            </div>

            <button
              type="button"
              onClick={onStartNextVisitor}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#F28C38] text-[#15233F] text-xs font-bold flex items-center gap-1.5 hover:bg-[#e57e2a] whitespace-nowrap cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Next Visitor</span>
            </button>
          </div>

          <div className="max-w-[440px] mx-auto bg-slate-100 p-3 rounded-xl border border-slate-200">
            <A4SheetRenderer
              photoSrc={activePhoto}
              captions={captions}
              paperConfig={paperConfig}
              selectedSlot={selectedSlot}
              onSelectSlot={setSelectedSlot}
            />
          </div>
        </div>
      </div>

      {/* Preview & Print Confirmation Modal */}
      {showPrintModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="print-modal-title"
        >
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full max-h-[92vh] overflow-y-auto p-6 space-y-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="print-modal-title"
                  className="text-xl font-bold text-slate-900"
                >
                  Print Preview · A4 Sticker Sheet
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-mono tabular-nums">
                  Set printer scale to 100% (Actual Size) · Margins: None · Paper: A4 Portrait
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPrintModal(false)}
                className="min-h-[40px] px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Close
              </button>
            </div>

            <div className="max-w-[340px] mx-auto bg-slate-100 p-3 rounded-xl border border-slate-200">
              <A4SheetRenderer
                photoSrc={activePhoto}
                captions={captions}
                paperConfig={paperConfig}
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleDownloadPng}
                className="min-h-[46px] px-4 py-2 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download A4 PNG</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmPrint}
                className="min-h-[46px] px-6 py-2 rounded-xl bg-[#15233F] text-white font-display font-bold text-sm flex items-center gap-2 hover:bg-[#1d3157] cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Save & Print Now</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
