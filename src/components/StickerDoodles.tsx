import React from "react";

interface StickerDoodlesProps {
  slotIndex?: number;
}

/**
 * Unified cartoon sticker accent doodles shared identically across all 6 square stickers
 * so every sticker keeps the exact same format, balance, and cartoon pop energy.
 */
export const StickerDoodles: React.FC<StickerDoodlesProps> = () => {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
    >
      {/* Top-left cartoon motion pop ticks */}
      <g stroke="#15233F" strokeWidth="2.4" strokeLinecap="round">
        <line x1="-2" y1="8" x2="5" y2="12" />
        <line x1="4" y1="0" x2="8" y2="7" />
        <line x1="-4" y1="16" x2="3" y2="17" />
      </g>

      {/* Top-right cartoon four-point sparkle + mini star */}
      <path
        d="M91 3 L93 8.5 L98.5 10.5 L93 12.5 L91 18 L89 12.5 L83.5 10.5 L89 8.5 Z"
        fill="#FCD34D"
        stroke="#15233F"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M97 21 L98.2 24 L101 25.2 L98.2 26.4 L97 29.4 L95.8 26.4 L93 25.2 L95.8 24 Z"
        fill="#FFFFFF"
        stroke="#15233F"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />

      {/* Bottom-left cartoon sparkle */}
      <path
        d="M7 81 L8.8 85.5 L13.2 87.2 L8.8 89 L7 93.5 L5.2 89 L0.8 87.2 L5.2 85.5 Z"
        fill="#FCD34D"
        stroke="#15233F"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />

      {/* Bottom-right cartoon heart pop badge */}
      <g transform="translate(81, 79)">
        <circle cx="9" cy="9" r="8.5" fill="#FFFFFF" stroke="#15233F" strokeWidth="1.5" />
        <path
          d="M9 6.6 C7 4.2, 3.6 6, 5 9.2 C6 11.4, 9 13.5, 9 13.5 C9 13.5, 12 11.4, 13 9.2 C14.4 6, 11 4.2, 9 6.6 Z"
          fill="#EC4899"
          stroke="#15233F"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
};
