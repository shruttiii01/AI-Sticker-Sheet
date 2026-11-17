import React, { useState } from "react";
import { Download, Printer, Trash2, UserPlus } from "lucide-react";
import { FESTIVAL_STICKER_THEME, STICKER_THEMES } from "../constants";
import type { PaperConfig, SavedOutput } from "../types";
import { renderA4SheetToPng } from "../utils/exportA4Png";
import { formatDuration } from "../utils/image";

interface SavedOutputsViewProps {
  outputs: SavedOutput[];
  paperConfig: PaperConfig;
  stickerTag: string;
  onReprintOutput: (output: SavedOutput) => void;
  onDeleteOne: (id: string) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onGoToBooth: () => void;
}

export const SavedOutputsView: React.FC<SavedOutputsViewProps> = ({
  outputs,
  paperConfig,
  stickerTag,
  onReprintOutput,
  onDeleteOne,
  onDeleteAll,
  onGoToBooth,
}) => {
  const [confirmClearAll, setConfirmClearAll] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const trimmedTag = stickerTag.trim();

  const getActivePhotoSrc = (item: SavedOutput): string => {
    if (item.photoMode === "ai" || (item.useAvatar && !item.photoMode)) {
      if (item.avatarDataUrl) return item.avatarDataUrl;
    }
    if (item.photoMode === "styled" && item.styledPhotoDataUrl) {
      return item.styledPhotoDataUrl;
    }
    return item.photoDataUrl;
  };

  const handleDownload = async (item: SavedOutput) => {
    setBusyId(item.id);
    try {
      const src = getActivePhotoSrc(item);
      const pngUrl = await renderA4SheetToPng({
        photoSrc: src,
        captions: item.captions,
        paperConfig,
        firstName: item.firstName,
        stickerTag,
      });
      const link = document.createElement("a");
      const safeName = (item.firstName.trim() || "visitor")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-");
      link.href = pngUrl;
      link.download = `dyp-aicoe-stickers-${safeName}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setBusyId(null);
    }
  };

  const handleConfirmDeleteAll = async () => {
    await onDeleteAll();
    setConfirmClearAll(false);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Saved Sticker Sheets
          </h1>
          <p className="text-sm text-slate-600 mt-0.5 tabular-nums">
            {outputs.length} {outputs.length === 1 ? "sheet" : "sheets"} stored locally on this booth browser
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {outputs.length > 0 && !confirmClearAll && (
            <button
              type="button"
              onClick={() => setConfirmClearAll(true)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm font-semibold flex items-center gap-2 hover:bg-red-100 transition-colors whitespace-nowrap cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete all outputs</span>
            </button>
          )}

          {confirmClearAll && (
            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-red-50 border border-red-200">
              <span className="text-xs font-semibold text-red-800 px-2">
                Wipe all {outputs.length} sheets?
              </span>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-bold hover:bg-red-700 cursor-pointer"
              >
                Confirm Delete All
              </button>
              <button
                type="button"
                onClick={() => setConfirmClearAll(false)}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-medium hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {outputs.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 mx-auto flex items-center justify-center">
            <UserPlus className="w-6 h-6" />
          </div>
          <div className="space-y-1 max-w-md mx-auto">
            <h2 className="text-lg font-bold text-slate-900">
              No saved sticker sheets yet
            </h2>
            <p className="text-sm text-slate-600">
              When a visitor clicks Save or Print in the booth, their 6-sticker sheet appears here for quick reprints.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToBooth}
            className="min-h-[46px] px-5 py-2.5 rounded-xl bg-[#15233F] text-white font-display font-semibold text-sm inline-flex items-center gap-2 hover:bg-[#1d3157] cursor-pointer"
          >
            <span>Open Booth</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {outputs.map((item) => {
            const activeSrc = getActivePhotoSrc(item);

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 flex flex-col justify-between gap-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 truncate">
                        {item.firstName}
                      </h3>
                      <p className="text-xs text-slate-500 tabular-nums">
                        {item.style} · {formatDuration(item.elapsedSeconds)} ·{" "}
                        {new Date(item.createdAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteOne(item.id)}
                      aria-label={`Delete ${item.firstName}'s sheet`}
                      className="min-h-[36px] min-w-[36px] rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Mini 6-sticker thumbnail grid + optional 7th Festival banner */}
                  <div className="space-y-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                    <div className="grid grid-cols-3 gap-1.5">
                      {STICKER_THEMES.map((theme, idx) => (
                        <div
                          key={theme.id}
                          className="rounded-lg p-1 flex flex-col items-center gap-1"
                          style={{ backgroundColor: theme.bgColor }}
                        >
                          <img
                            src={activeSrc}
                            alt={item.captions[idx] ?? ""}
                            className="w-full aspect-square object-cover rounded-md bg-white"
                          />
                          <span
                            className="text-[9px] font-display font-bold truncate w-full text-center leading-tight"
                            style={{ color: theme.textColor }}
                          >
                            {item.captions[idx] ?? ""}
                          </span>
                          {trimmedTag && (
                            <span
                              className="text-[7.5px] font-display font-extrabold tracking-wide leading-none px-1.5 py-0.5 rounded-full truncate max-w-full"
                              style={{
                                backgroundColor: theme.id === "navy" ? "#FFFFFF" : "#15233F",
                                color: theme.id === "navy" ? "#15233F" : "#FFFFFF",
                              }}
                            >
                              {trimmedTag}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {(paperConfig.includeFestivalSticker || item.captions[6]) && (
                      <div
                        className="rounded-lg p-1.5 flex items-center gap-2 border"
                        style={{
                          backgroundColor: FESTIVAL_STICKER_THEME.bgColor,
                          borderColor: FESTIVAL_STICKER_THEME.borderColor,
                        }}
                      >
                        <img
                          src={activeSrc}
                          alt={item.captions[6] ?? "Festive Vibes"}
                          className="w-9 h-9 object-cover rounded-md bg-white shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-[8px] font-display font-extrabold uppercase tracking-wider text-amber-800 leading-none">
                            +1 Festival Sticker
                          </p>
                          <p className="text-[10px] font-display font-extrabold text-[#15233F] truncate">
                            {item.captions[6] ?? "Festive Vibes"}
                          </p>
                        </div>
                        {trimmedTag && (
                          <span className="text-[7.5px] font-display font-extrabold tracking-wide leading-none px-1.5 py-0.5 rounded-full bg-[#15233F] text-white shrink-0">
                            {trimmedTag}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => onReprintOutput(item)}
                    className="min-h-[42px] px-3 py-2 rounded-xl bg-[#15233F] text-white text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-[#1d3157] cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Reprint A4</span>
                  </button>
                  <button
                    type="button"
                    disabled={busyId === item.id}
                    onClick={() => handleDownload(item)}
                    className="min-h-[42px] px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-800 text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-slate-50 disabled:opacity-60 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>{busyId === item.id ? "Saving..." : "PNG"}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
