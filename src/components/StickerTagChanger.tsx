import React from "react";
import { Tag } from "lucide-react";
import { STICKER_TAG_PRESETS } from "../constants";

interface StickerTagChangerProps {
  value: string;
  onChange: (next: string) => void;
}

export const StickerTagChanger: React.FC<StickerTagChangerProps> = ({
  value,
  onChange,
}) => {
  const trimmed = value.trim();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-700">
        <Tag className="w-3.5 h-3.5 text-[#15233F]" />
        <span>Sticker Stamp:</span>
      </span>

      <div
        role="group"
        aria-label="Sticker hashtag changer"
        className="inline-flex flex-wrap items-center rounded-lg border border-slate-200 bg-white p-0.5 gap-0.5"
      >
        {STICKER_TAG_PRESETS.map((preset) => {
          const active = trimmed === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                active
                  ? "bg-[#15233F] text-white"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              {preset}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => onChange("")}
          className={`px-2 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
            trimmed === ""
              ? "bg-[#15233F] text-white"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
          }`}
        >
          Off
        </button>
      </div>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={24}
        placeholder="Custom tag..."
        aria-label="Custom sticker stamp text"
        className="w-28 sm:w-32 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#15233F]"
      />
    </div>
  );
};
