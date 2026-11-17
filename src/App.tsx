import { useCallback, useEffect, useState } from "react";
import { A4SheetRenderer } from "./components/A4SheetRenderer";
import { CameraStep } from "./components/CameraStep";
import { CheckInStep } from "./components/CheckInStep";
import {
  ExactA4Renderer,
  ExactStickerView,
  type ExactCopyLayout,
} from "./components/ExactStickerView";
import { PaperSetupView } from "./components/PaperSetupView";
import { SavedOutputsView } from "./components/SavedOutputsView";
import { PackSheet, StickerPackView } from "./components/StickerPackView";
import { StickerTagChanger } from "./components/StickerTagChanger";
import type { PlacedSticker } from "./utils/stickerPack";
import {
  StickerStudioStep,
  type PhotoMode,
} from "./components/StickerStudioStep";
import {
  DEFAULT_CAPTIONS,
  VISITOR_TARGET_SECONDS,
} from "./constants";
import type {
  AppTab,
  BoothStep,
  PaperConfig,
  SavedOutput,
  StickerStyle,
} from "./types";
import { applyStickerStyleFilter, formatDuration } from "./utils/image";
import {
  deleteAllOutputs,
  deleteOutputRecord,
  getAllOutputs,
  loadPaperConfig,
  loadStickerTag,
  saveOutputRecord,
  savePaperConfig,
  saveStickerTag,
} from "./utils/storage";

type PrintTarget =
  | {
      kind: "booth";
      photoSrc: string | null;
      captions: string[];
      paperConfig: PaperConfig;
      stickerTag: string;
    }
  | {
      kind: "exact";
      copies: ExactCopyLayout;
      showCutGuides: boolean;
      stickerTag: string;
    }
  | {
      kind: "pack";
      pages: PlacedSticker[][];
    };

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>("stickers");
  const [boothStep, setBoothStep] = useState<BoothStep>("checkin");

  // Visitor session state
  const [sessionId, setSessionId] = useState<string>(() =>
    crypto.randomUUID()
  );
  const [firstName, setFirstName] = useState("");
  const [style, setStyle] = useState<StickerStyle>("Flat cartoon");
  const [consentChecked, setConsentChecked] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [styledPhoto, setStyledPhoto] = useState<string | null>(null);
  const [avatarPhoto, setAvatarPhoto] = useState<string | null>(null);
  const [photoMode, setPhotoMode] = useState<PhotoMode>("original");
  const [captions, setCaptions] = useState<string[]>([...DEFAULT_CAPTIONS]);
  const [sessionStartMs, setSessionStartMs] = useState<number>(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Exact sticker sheet state
  const [exactCopies, setExactCopies] = useState<ExactCopyLayout>(2);
  const [exactCutGuides, setExactCutGuides] = useState(false);

  // Calibrated A4 paper settings & sticker stamp tag
  const [paperConfig, setPaperConfig] = useState<PaperConfig>(() =>
    loadPaperConfig()
  );
  const [stickerTag, setStickerTag] = useState<string>(() => loadStickerTag());

  // Saved outputs in IndexedDB
  const [savedOutputs, setSavedOutputs] = useState<SavedOutput[]>([]);

  // Explicit print target rendered into hidden print root
  const [printTarget, setPrintTarget] = useState<PrintTarget | null>(null);

  useEffect(() => {
    void getAllOutputs().then(setSavedOutputs);
  }, []);

  // Generate free instant local style filter (Comic / Flat cartoon / Pixel art) whenever photo or style changes
  useEffect(() => {
    if (!capturedPhoto) {
      setStyledPhoto(null);
      return;
    }
    let cancelled = false;
    void applyStickerStyleFilter(capturedPhoto, style).then((filtered) => {
      if (!cancelled) {
        setStyledPhoto(filtered);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [capturedPhoto, style]);

  // Stopwatch for the < 2m 30s visitor flow benchmark
  useEffect(() => {
    const interval = window.setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartMs) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [sessionStartMs]);

  const currentActivePhoto =
    photoMode === "ai" && avatarPhoto
      ? avatarPhoto
      : photoMode === "styled" && styledPhoto
        ? styledPhoto
        : capturedPhoto;

  const handlePaperConfigChange = (next: PaperConfig) => {
    setPaperConfig(next);
    savePaperConfig(next);
  };

  const handleStickerTagChange = (next: string) => {
    setStickerTag(next);
    saveStickerTag(next);
  };

  const resetVisitorSession = useCallback(() => {
    setSessionId(crypto.randomUUID());
    setFirstName("");
    setStyle("Flat cartoon");
    setConsentChecked(false);
    setCapturedPhoto(null);
    setStyledPhoto(null);
    setAvatarPhoto(null);
    setPhotoMode("original");
    setCaptions([...DEFAULT_CAPTIONS]);
    setSessionStartMs(Date.now());
    setElapsedSeconds(0);
    setBoothStep("checkin");
    setActiveTab("booth");
  }, []);

  const persistCurrentOutput = useCallback(async (): Promise<SavedOutput | null> => {
    if (!capturedPhoto) return null;
    const record: SavedOutput = {
      id: sessionId,
      firstName: firstName.trim() || "Visitor",
      style,
      photoDataUrl: capturedPhoto,
      styledPhotoDataUrl: styledPhoto ?? undefined,
      avatarDataUrl: avatarPhoto ?? undefined,
      useAvatar: Boolean(photoMode === "ai" && avatarPhoto),
      photoMode,
      captions: [...captions],
      createdAt: Date.now(),
      elapsedSeconds: Math.floor((Date.now() - sessionStartMs) / 1000),
    };
    await saveOutputRecord(record);
    const updated = await getAllOutputs();
    setSavedOutputs(updated);
    return record;
  }, [
    avatarPhoto,
    captions,
    capturedPhoto,
    firstName,
    photoMode,
    sessionId,
    sessionStartMs,
    style,
    styledPhoto,
  ]);

  const triggerPrintWithTarget = useCallback((target: PrintTarget) => {
    setPrintTarget(target);
    window.setTimeout(() => {
      window.print();
    }, 80);
  }, []);

  const handleSaveAndPrint = async () => {
    await persistCurrentOutput();
    triggerPrintWithTarget({
      kind: "booth",
      photoSrc: currentActivePhoto,
      captions,
      paperConfig,
      stickerTag,
    });
  };

  const handlePrintTestPage = () => {
    triggerPrintWithTarget({
      kind: "booth",
      photoSrc: null,
      captions: DEFAULT_CAPTIONS,
      paperConfig: {
        ...paperConfig,
        testGridOnly: true,
      },
      stickerTag,
    });
  };

  const handlePrintExactSticker = () => {
    triggerPrintWithTarget({
      kind: "exact",
      copies: exactCopies,
      showCutGuides: exactCutGuides,
      stickerTag,
    });
  };

  const handleReprintSaved = (item: SavedOutput) => {
    let activePhoto = item.photoDataUrl;
    if (
      (item.photoMode === "ai" || (item.useAvatar && !item.photoMode)) &&
      item.avatarDataUrl
    ) {
      activePhoto = item.avatarDataUrl;
    } else if (item.photoMode === "styled" && item.styledPhotoDataUrl) {
      activePhoto = item.styledPhotoDataUrl;
    }

    triggerPrintWithTarget({
      kind: "booth",
      photoSrc: activePhoto,
      captions: item.captions,
      paperConfig,
      stickerTag,
    });
  };

  const handleDeleteOne = async (id: string) => {
    await deleteOutputRecord(id);
    setSavedOutputs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleDeleteAll = async () => {
    await deleteAllOutputs();
    setSavedOutputs([]);
  };

  const handleCaptionChange = (index: number, caption: string) => {
    setCaptions((prev) => {
      const next = [...prev];
      next[index] = caption;
      return next;
    });
  };

  const activePrintTarget: PrintTarget =
    printTarget ??
    (activeTab === "exact"
      ? {
          kind: "exact",
          copies: exactCopies,
          showCutGuides: exactCutGuides,
          stickerTag,
        }
      : {
          kind: "booth",
          photoSrc: currentActivePhoto,
          captions,
          paperConfig,
          stickerTag,
        });

  const overBudget = elapsedSeconds > VISITOR_TARGET_SECONDS;

  return (
    <>
      {/* Screen UI (hidden during physical print) */}
      <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col print:hidden">
        {/* Strict 3-Zone Top Bar */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
            {/* Zone 1: Single-line Brand Wordmark */}
            <button
              type="button"
              onClick={() => setActiveTab("stickers")}
              className="font-display text-lg font-extrabold tracking-tight text-[#15233F] whitespace-nowrap shrink-0 cursor-pointer"
            >
              AI Sticker Sheet
            </button>

            {/* Zone 2: Single-line Navigation Links */}
            <nav
              aria-label="Primary navigation"
              className="flex items-center gap-4 sm:gap-6 text-sm font-medium overflow-x-auto"
            >
              <button
                type="button"
                onClick={() => setActiveTab("stickers")}
                className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "stickers"
                    ? "border-[#15233F] text-[#15233F] font-semibold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                AI Stickers
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("booth")}
                className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "booth"
                    ? "border-[#15233F] text-[#15233F] font-semibold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Booth
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("exact")}
                className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "exact"
                    ? "border-[#15233F] text-[#15233F] font-semibold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Exact Sticker
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("paper")}
                className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer ${
                  activeTab === "paper"
                    ? "border-[#15233F] text-[#15233F] font-semibold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Paper Setup
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("saved")}
                className={`py-1 whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer tabular-nums ${
                  activeTab === "saved"
                    ? "border-[#15233F] text-[#15233F] font-semibold"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Saved ({savedOutputs.length})
              </button>
            </nav>

            {/* Zone 3: Primary Action */}
            <div className="shrink-0">
              <button
                type="button"
                onClick={resetVisitorSession}
                className="min-h-[40px] px-4 py-2 rounded-lg bg-[#15233F] text-white text-xs font-semibold hover:bg-[#1d3157] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                New Visitor
              </button>
            </div>
          </div>
        </header>

        {/* Clean Context Bar + Global Sticker Stamp Changer */}
        <div className="max-w-6xl w-full mx-auto px-4 sm:px-6 pt-5 pb-2 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-slate-700">
              Dr. D. Y. Patil B-School, Pune
            </span>
            <span aria-hidden="true">·</span>
            <span>{stickerTag.trim() || "#DYPAICoE"} Launch</span>
            {activeTab === "booth" && (
              <>
                <span aria-hidden="true">·</span>
                <span
                  className={`font-mono tabular-nums ${
                    overBudget ? "text-amber-700 font-semibold" : "text-slate-600"
                  }`}
                >
                  Session {formatDuration(elapsedSeconds)} (Target &lt; 02:30)
                </span>
              </>
            )}
          </div>

          <StickerTagChanger value={stickerTag} onChange={handleStickerTagChange} />
        </div>

        {/* Main Workspace */}
        <main className="max-w-6xl w-full mx-auto px-4 sm:px-6 py-4 flex-1">
          {activeTab === "stickers" && (
            <StickerPackView
              stickerTag={stickerTag}
              onPrintPages={(pages) => triggerPrintWithTarget({ kind: "pack", pages })}
            />
          )}

          {activeTab === "booth" && (
            <>
              {boothStep === "checkin" && (
                <CheckInStep
                  firstName={firstName}
                  onChangeFirstName={setFirstName}
                  style={style}
                  onChangeStyle={setStyle}
                  consentChecked={consentChecked}
                  onChangeConsent={setConsentChecked}
                  captions={captions}
                  paperConfig={paperConfig}
                  stickerTag={stickerTag}
                  onContinue={() => setBoothStep("camera")}
                />
              )}

              {boothStep === "camera" && (
                <CameraStep
                  firstName={firstName}
                  capturedPhoto={capturedPhoto}
                  onCapturePhoto={(dataUrl) => {
                    setCapturedPhoto(dataUrl || null);
                    setAvatarPhoto(null);
                    setPhotoMode("original");
                  }}
                  onBack={() => setBoothStep("checkin")}
                  onContinue={() => setBoothStep("studio")}
                />
              )}

              {boothStep === "studio" && capturedPhoto && (
                <StickerStudioStep
                  firstName={firstName}
                  style={style}
                  onChangeStyle={setStyle}
                  capturedPhoto={capturedPhoto}
                  styledPhoto={styledPhoto}
                  avatarPhoto={avatarPhoto}
                  photoMode={photoMode}
                  onChangePhotoMode={setPhotoMode}
                  onAvatarGenerated={(url) => setAvatarPhoto(url)}
                  captions={captions}
                  onChangeCaption={handleCaptionChange}
                  onSetAllCaptions={setCaptions}
                  paperConfig={paperConfig}
                  stickerTag={stickerTag}
                  onChangePaperConfig={handlePaperConfigChange}
                  onBackToCamera={() => setBoothStep("camera")}
                  onOpenPaperSetup={() => setActiveTab("paper")}
                  onSaveAndPrint={handleSaveAndPrint}
                  onSaveOnly={async () => {
                    await persistCurrentOutput();
                  }}
                  onStartNextVisitor={resetVisitorSession}
                />
              )}
            </>
          )}

          {activeTab === "exact" && (
            <ExactStickerView
              copies={exactCopies}
              onChangeCopies={setExactCopies}
              showCutGuides={exactCutGuides}
              onChangeShowCutGuides={setExactCutGuides}
              stickerTag={stickerTag}
              onPrintExact={handlePrintExactSticker}
            />
          )}

          {activeTab === "paper" && (
            <PaperSetupView
              paperConfig={paperConfig}
              stickerTag={stickerTag}
              onChangeConfig={handlePaperConfigChange}
              onPrintTestPage={handlePrintTestPage}
              samplePhotoSrc={currentActivePhoto}
            />
          )}

          {activeTab === "saved" && (
            <SavedOutputsView
              outputs={savedOutputs}
              paperConfig={paperConfig}
              stickerTag={stickerTag}
              onReprintOutput={handleReprintSaved}
              onDeleteOne={handleDeleteOne}
              onDeleteAll={handleDeleteAll}
              onGoToBooth={() => setActiveTab("booth")}
            />
          )}
        </main>
      </div>

      {/* Exact Physical A4 Print Surface (only visible to printer) */}
      <div className="hidden print:block">
        {activePrintTarget.kind === "pack" ? (
          activePrintTarget.pages.map((page, i) => (
            <PackSheet key={i} page={page} printExact />
          ))
        ) : activePrintTarget.kind === "exact" ? (
          <ExactA4Renderer
            copies={activePrintTarget.copies}
            showCutGuides={activePrintTarget.showCutGuides}
            stickerTag={activePrintTarget.stickerTag}
            printExact
          />
        ) : (
          <A4SheetRenderer
            photoSrc={activePrintTarget.photoSrc}
            captions={activePrintTarget.captions}
            paperConfig={activePrintTarget.paperConfig}
            stickerTag={activePrintTarget.stickerTag}
            printExact
          />
        )}
      </div>
    </>
  );
}
