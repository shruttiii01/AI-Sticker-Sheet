import React from "react";
import { ArrowRight, Check } from "lucide-react";
import { STICKER_STYLES } from "../constants";
import type { PaperConfig, StickerStyle } from "../types";
import { A4SheetRenderer } from "./A4SheetRenderer";

interface CheckInStepProps {
  firstName: string;
  onChangeFirstName: (name: string) => void;
  style: StickerStyle;
  onChangeStyle: (style: StickerStyle) => void;
  consentChecked: boolean;
  onChangeConsent: (checked: boolean) => void;
  captions: string[];
  paperConfig: PaperConfig;
  onContinue: () => void;
}

export const CheckInStep: React.FC<CheckInStepProps> = ({
  firstName,
  onChangeFirstName,
  style,
  onChangeStyle,
  consentChecked,
  onChangeConsent,
  captions,
  paperConfig,
  onContinue,
}) => {
  const canProceed = consentChecked && firstName.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canProceed) {
      onContinue();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left: Fast Visitor Check-In Form */}
      <form
        onSubmit={handleSubmit}
        className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6"
      >
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-slate-500">
            Step 1 of 3 · Takes ~15 seconds
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Visitor Check-In
          </h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            Enter your first name, pick your sticker look, and confirm photo consent to snap your 6-sticker A4 sheet.
          </p>
        </div>

        <div className="space-y-5">
          <div>
            <label
              htmlFor="visitor-first-name"
              className="block text-sm font-semibold text-slate-800 mb-2"
            >
              First Name
            </label>
            <input
              id="visitor-first-name"
              type="text"
              required
              autoFocus
              maxLength={32}
              value={firstName}
              onChange={(e) => onChangeFirstName(e.target.value)}
              placeholder="e.g., Aarav or Ananya"
              className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-base placeholder:text-slate-400 focus:outline-none focus:border-[#15233F] focus:ring-2 focus:ring-[#15233F]/15 transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="sticker-style"
              className="block text-sm font-semibold text-slate-800 mb-2"
            >
              Sticker Style
            </label>
            <select
              id="sticker-style"
              value={style}
              onChange={(e) => onChangeStyle(e.target.value as StickerStyle)}
              className="w-full min-h-[48px] px-4 rounded-xl border border-slate-300 bg-white text-slate-900 text-base focus:outline-none focus:border-[#15233F] focus:ring-2 focus:ring-[#15233F]/15 transition-colors"
            >
              {STICKER_STYLES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-slate-500">
              Used for your sheet style & optional AI avatar mode; your photo fits cleanly in all 6 frames.
            </p>
          </div>

          {/* Consent checkbox */}
          <div>
            <label
              htmlFor="visitor-consent"
              className={`flex items-start gap-3.5 p-4 rounded-xl border cursor-pointer transition-colors min-h-[44px] ${
                consentChecked
                  ? "border-[#15233F] bg-slate-50"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span className="relative flex items-center justify-center mt-0.5 shrink-0">
                <input
                  id="visitor-consent"
                  type="checkbox"
                  checked={consentChecked}
                  onChange={(e) => onChangeConsent(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                    consentChecked
                      ? "bg-[#15233F] border-[#15233F] text-white"
                      : "bg-white border-slate-300 text-transparent"
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[2.5]" />
                </span>
              </span>
              <span className="text-sm text-slate-700 leading-snug">
                <strong className="font-semibold text-slate-900">
                  Photo Booth Consent:
                </strong>{" "}
                I agree to capture my photo at the #DYPAICoE launch booth to generate and print my A4 sticker sheet. Photos stay saved on this booth browser and can be wiped anytime.
              </span>
            </label>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={!canProceed}
            className="w-full min-h-[52px] px-6 py-3 rounded-xl bg-[#15233F] text-white font-display font-semibold text-base flex items-center justify-center gap-2 hover:bg-[#1d3157] disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <span>Open Camera</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          {!canProceed && (
            <p className="mt-2 text-xs text-slate-500 text-center">
              Enter your first name and tick the consent box to continue.
            </p>
          )}
        </div>
      </form>

      {/* Right: Instant Sheet Preview */}
      <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Your 6-Sticker Sheet Layout
            </h2>
            <p className="text-xs text-slate-500">
              Navy · Orange · Sky · 3 Soft Tints · Bold Captions
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500">
            A4 · 210 × 297 mm
          </span>
        </div>

        <div className="max-w-[380px] mx-auto">
          <A4SheetRenderer
            photoSrc={null}
            captions={captions}
            paperConfig={paperConfig}
          />
        </div>
      </div>
    </div>
  );
};
