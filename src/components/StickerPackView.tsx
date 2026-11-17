import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Download,
  Loader2,
  Printer,
  RefreshCw,
  Sparkles,
  Wand2,
} from "lucide-react";
import { CameraStep } from "./CameraStep";
import {
  A4,
  STICKER_USE_CASES,
  downloadDataUrl,
  packStickers,
  renderPackPageToPng,
  svgToDieCutPng,
  type PlacedSticker,
} from "../utils/stickerPack";

const CLAUDE_STYLES = [
  "Chibi cartoon",
  "Flat vector",
  "Kawaii pastel",
  "Retro badge",
  "Comic pop",
] as const;
type ClaudeStyle = (typeof CLAUDE_STYLES)[number];

const VIBES = [
  "Fun everyday laptop & phone stickers",
  "Festival & celebration vibes",
  "Tech / coder life",
  "Coffee & study vibes",
  "Gym & sports energy",
  "Travel & adventure",
  "Office humour",
];

interface Idea {
  title: string;
  caption: string;
  pose_and_scene: string;
}

type Status = "queued" | "drawing" | "done" | "error";
interface StickerSlot {
  idea: Idea;
  status: Status;
  svg?: string;
  png?: string;
  error?: string;
  include: boolean;
}

type Phase = "setup" | "camera" | "studio";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

export const PackSheet: React.FC<{ page: PlacedSticker[]; printExact?: boolean }> = ({
  page,
  printExact,
}) => (
  <div
    className="relative bg-white overflow-hidden"
    style={
      printExact
        ? { width: "210mm", height: "297mm", breakAfter: "page" }
        : { width: "100%", aspectRatio: `${A4.w} / ${A4.h}` }
    }
  >
    {page.map((p, i) => (
      <img
        key={i}
        src={p.src}
        alt=""
        className="absolute"
        style={{
          left: `${(p.xMm / A4.w) * 100}%`,
          top: `${(p.yMm / A4.h) * 100}%`,
          width: `${(p.sizeMm / A4.w) * 100}%`,
          height: `${(p.sizeMm / A4.h) * 100}%`,
          objectFit: "contain",
        }}
      />
    ))}
  </div>
);

interface StickerPackViewProps {
  stickerTag: string;
  onPrintPages: (pages: PlacedSticker[][]) => void;
}

export const StickerPackView: React.FC<StickerPackViewProps> = ({
  stickerTag,
  onPrintPages,
}) => {
  const stickerTagRef = useRef(stickerTag);
  stickerTagRef.current = stickerTag;
  const [phase, setPhase] = useState<Phase>("setup");
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [style, setStyle] = useState<ClaudeStyle>("Chibi cartoon");
  const [vibe, setVibe] = useState(VIBES[0]);
  const [count, setCount] = useState(6);
  const [includeFestival, setIncludeFestival] = useState(true);
  const [photo, setPhoto] = useState<string | null>(null);

  const [apiStatus, setApiStatus] = useState<{ hasApiKey: boolean; model?: string } | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [character, setCharacter] = useState<Record<string, string> | null>(null);
  const [slots, setSlots] = useState<StickerSlot[]>([]);

  const [useCaseId, setUseCaseId] = useState("laptop");
  const [copies, setCopies] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setApiStatus)
      .catch(() => setApiStatus({ hasApiKey: false }));
  }, []);

  const updateSlot = (i: number, patch: Partial<StickerSlot>) =>
    setSlots((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));

  // Re-stamp completed stickers immediately whenever the user changes the hashtag in the changer
  useEffect(() => {
    let cancelled = false;
    const readySlots = slots
      .map((s, idx) => ({ s, idx }))
      .filter(({ s }) => s.status === "done" && Boolean(s.svg));
    if (readySlots.length === 0) return;

    void Promise.all(
      readySlots.map(async ({ s, idx }) => {
        const png = await svgToDieCutPng(s.svg!, 1024, stickerTag);
        return { idx, png };
      }),
    ).then((updates) => {
      if (cancelled) return;
      setSlots((prev) =>
        prev.map((slot, idx) => {
          const found = updates.find((u) => u.idx === idx);
          return found ? { ...slot, png: found.png } : slot;
        }),
      );
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stickerTag]);

  const drawOne = async (i: number, idea: Idea, char: Record<string, string>) => {
    updateSlot(i, { status: "drawing", error: undefined });
    try {
      const { svg } = await postJson<{ svg: string }>("/api/stickers/draw", {
        imageDataUrl: photo,
        character: char,
        idea,
        style,
      });
      const png = await svgToDieCutPng(svg, 1024, stickerTagRef.current);
      updateSlot(i, { status: "done", svg, png });
    } catch (err) {
      updateSlot(i, {
        status: "error",
        error: err instanceof Error ? err.message : "Drawing failed",
      });
    }
  };

  const generate = async () => {
    if (!photo) return;
    setAnalyzing(true);
    setError(null);
    setSlots([]);
    setCharacter(null);
    const totalCount = Math.min(12, count + (includeFestival ? 1 : 0));
    try {
      const result = await postJson<{ character: Record<string, string>; ideas: Idea[] }>(
        "/api/stickers/analyze",
        { imageDataUrl: photo, count: totalCount, vibe, name, includeFestival },
      );
      setCharacter(result.character);
      setSlots(result.ideas.map((idea) => ({ idea, status: "queued", include: true })));
      setAnalyzing(false);
      await Promise.all(result.ideas.map((idea, i) => drawOne(i, idea, result.character)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setAnalyzing(false);
    }
  };

  const useCase = STICKER_USE_CASES.find((u) => u.id === useCaseId) ?? STICKER_USE_CASES[0];
  const readyStickers = slots.filter((s) => s.status === "done" && s.include && s.png).map((s) => s.png!);
  const pages = useMemo(
    () => (readyStickers.length ? packStickers(readyStickers, useCase, copies) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [readyStickers.join("|"), useCase, copies],
  );
  const busy = analyzing || slots.some((s) => s.status === "drawing" || s.status === "queued");
  const safeName = (name.trim() || "my").toLowerCase().replace(/[^a-z0-9]+/g, "-");

  const downloadPages = async () => {
    setExporting(true);
    try {
      for (let i = 0; i < pages.length; i++) {
        const url = await renderPackPageToPng(pages[i]);
        downloadDataUrl(url, `${safeName}-stickers-${useCase.id}-page${i + 1}.png`);
      }
    } finally {
      setExporting(false);
    }
  };

  const resetAll = () => {
    setPhoto(null);
    setSlots([]);
    setCharacter(null);
    setError(null);
    setPhase("setup");
  };

  // ---------- Setup ----------
  if (phase === "setup") {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-2xl border border-slate-200 p-6 space-y-5">
        <div>
          <p className="text-xs font-medium text-slate-500">Step 1 of 3 · Claude AI Sticker Pack</p>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Turn a photo into custom die-cut stickers
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Claude studies the photo, designs a pack of sticker ideas and hand-draws each one as
            vector art – then you print them sized for a laptop, phone, bottle or notebook.
          </p>
        </div>

        {apiStatus && !apiStatus.hasApiKey && (
          <div className="flex gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>
              The server has no <code>ANTHROPIC_API_KEY</code>. Add it to <code>.env</code> and restart
              <code> npm run dev</code>.
            </span>
          </div>
        )}

        <label className="block space-y-1">
          <span className="text-sm font-semibold text-slate-800">First name (optional)</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="e.g. Priya"
            className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 focus:outline-none focus:border-[#15233F]"
          />
        </label>

        <div className="space-y-2">
          <span className="text-sm font-semibold text-slate-800">Art style</span>
          <div className="flex flex-wrap gap-2">
            {CLAUDE_STYLES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStyle(s)}
                className={`min-h-[38px] px-3 rounded-lg text-sm font-semibold border cursor-pointer ${
                  style === s
                    ? "bg-[#15233F] text-white border-[#15233F]"
                    : "bg-white text-slate-700 border-slate-200 hover:border-slate-300"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">Pack theme</span>
            <select
              value={vibe}
              onChange={(e) => setVibe(e.target.value)}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white"
            >
              {VIBES.map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-semibold text-slate-800">Number of designs</span>
            <select
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white"
            >
              {[3, 4, 6, 7, 8].map((n) => (
                <option key={n} value={n}>
                  {n} stickers{includeFestival ? ` (+1 Festival = ${Math.min(12, n + 1)})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-sm text-slate-800 cursor-pointer">
          <input
            type="checkbox"
            checked={includeFestival}
            onChange={(e) => setIncludeFestival(e.target.checked)}
            className="mt-1 accent-[#F28C38]"
          />
          <span>
            <strong className="font-semibold">Add +1 Bonus Festival Sticker:</strong>{" "}
            Includes one extra festive celebration sticker (diya, marigold &amp; sparkles) in your pack.
          </span>
        </label>

        <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1"
          />
          <span>
            The person in the photo agrees to it being sent to Anthropic's Claude API to create their
            stickers.
          </span>
        </label>

        <button
          type="button"
          disabled={!consent}
          onClick={() => setPhase("camera")}
          className="w-full min-h-[52px] rounded-xl bg-[#15233F] text-white font-bold disabled:opacity-40 cursor-pointer"
        >
          Continue to camera
        </button>
      </div>
    );
  }

  // ---------- Camera ----------
  if (phase === "camera") {
    return (
      <CameraStep
        firstName={name}
        capturedPhoto={photo}
        onCapturePhoto={(url) => setPhoto(url || null)}
        stickerCount={Math.min(12, count + (includeFestival ? 1 : 0))}
        onBack={() => setPhase("setup")}
        onContinue={() => {
          setPhase("studio");
          void generate();
        }}
      />
    );
  }

  // ---------- Studio ----------
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-7 space-y-5">
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {photo && (
                <img src={photo} alt="Captured" className="w-14 h-14 rounded-xl object-cover border" />
              )}
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Step 3 of 3 · {style} · {apiStatus?.model ?? "Claude"}
                </p>
                <h1 className="text-xl font-bold text-slate-900">Your AI sticker pack</h1>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setPhoto(null);
                  setPhase("camera");
                }}
                className="min-h-[40px] px-3 rounded-xl border border-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Retake
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void generate()}
                className="min-h-[40px] px-3 rounded-xl bg-[#F28C38] text-[#15233F] text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Wand2 className="w-3.5 h-3.5" /> New ideas
              </button>
            </div>
          </div>

          {analyzing && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="w-4 h-4 animate-spin" />
              Claude is studying the photo and planning your sticker pack…
            </div>
          )}
          {error && (
            <div className="flex gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          {character && (
            <p className="text-xs text-slate-500">
              <span className="font-semibold text-slate-700">Claude sees: </span>
              {character.summary}
            </p>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {slots.map((slot, i) => (
              <div
                key={i}
                className={`rounded-xl border p-2 space-y-2 ${
                  slot.include && slot.status === "done" ? "border-[#15233F]" : "border-slate-200"
                } bg-[repeating-conic-gradient(#f1f5f9_0%_25%,#ffffff_0%_50%)] bg-[length:16px_16px]`}
              >
                <div className="aspect-square flex items-center justify-center">
                  {slot.status === "done" && slot.png ? (
                    <img
                      src={slot.png}
                      alt={slot.idea.title}
                      className="w-full h-full object-contain drop-shadow-md"
                    />
                  ) : slot.status === "error" ? (
                    <p className="text-[11px] text-red-700 text-center px-2">{slot.error}</p>
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-[11px] text-slate-500 text-center px-2">
                      <Sparkles className="w-5 h-5 text-[#F28C38] animate-pulse" />
                      {slot.status === "queued" ? "Queued" : "Claude is drawing…"}
                    </div>
                  )}
                </div>
                <div className="bg-white/90 rounded-lg px-2 py-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">{slot.idea.title}</p>
                  {slot.idea.caption && (
                    <p className="text-[11px] text-slate-500 truncate">“{slot.idea.caption}”</p>
                  )}
                </div>
                <div className="flex items-center justify-between gap-1">
                  <label className="flex items-center gap-1 text-[11px] text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={slot.include}
                      disabled={slot.status !== "done"}
                      onChange={(e) => updateSlot(i, { include: e.target.checked })}
                    />
                    Print
                  </label>
                  <div className="flex gap-1">
                    {slot.status === "done" && slot.png && (
                      <button
                        type="button"
                        title="Download this sticker (PNG)"
                        onClick={() =>
                          downloadDataUrl(slot.png!, `${safeName}-sticker-${i + 1}.png`)
                        }
                        className="p-1.5 rounded-md bg-white border border-slate-200 cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                    )}
                    {(slot.status === "done" || slot.status === "error") && character && (
                      <button
                        type="button"
                        title="Redraw this sticker"
                        onClick={() => void drawOne(i, slot.idea, character)}
                        className="p-1.5 rounded-md bg-white border border-slate-200 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
        <h2 className="text-base font-bold text-slate-900">Print sheet</h2>
        <div className="grid grid-cols-1 gap-2">
          {STICKER_USE_CASES.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => setUseCaseId(u.id)}
              className={`text-left px-3 py-2 rounded-xl border cursor-pointer ${
                useCaseId === u.id ? "border-[#15233F] bg-slate-50" : "border-slate-200"
              }`}
            >
              <span className="block text-sm font-semibold text-slate-900">{u.label}</span>
              <span className="block text-[11px] text-slate-500">{u.hint}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-800">Copies of each design</span>
          <select
            value={copies}
            onChange={(e) => setCopies(Number(e.target.value))}
            className="min-h-[36px] px-2 rounded-lg border border-slate-200 bg-white"
          >
            {[1, 2, 3, 4, 6].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>

        <div className="space-y-3">
          {pages.length === 0 ? (
            <div className="aspect-[210/297] rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-xs text-slate-500 text-center p-6">
              {busy ? "Stickers appear here as Claude finishes them…" : "Tick at least one finished sticker to print."}
            </div>
          ) : (
            pages.map((page, i) => (
              <div key={i} className="bg-slate-100 p-2 rounded-xl border border-slate-200">
                <p className="text-[11px] text-slate-500 mb-1 font-mono">
                  A4 page {i + 1} of {pages.length} · {page.length} stickers
                </p>
                <div className="shadow-sm">
                  <PackSheet page={page} />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            disabled={!pages.length}
            onClick={() => onPrintPages(pages)}
            className="w-full min-h-[50px] rounded-xl bg-[#15233F] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <Printer className="w-5 h-5" /> Print {pages.length > 1 ? `${pages.length} pages` : "sheet"}
          </button>
          <button
            type="button"
            disabled={!pages.length || exporting}
            onClick={() => void downloadPages()}
            className="w-full min-h-[44px] rounded-xl border border-slate-200 text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-4 h-4" /> {exporting ? "Rendering…" : "Download 300 dpi PNG"}
          </button>
          <p className="text-[11px] text-slate-500">
            Print on A4 sticker / vinyl paper at 100% scale (Actual size), margins None. Cut along
            the grey hairline.
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="w-full min-h-[40px] text-xs font-medium text-slate-600 underline cursor-pointer"
          >
            Start over with a new person
          </button>
        </div>
      </div>
    </div>
  );
};
