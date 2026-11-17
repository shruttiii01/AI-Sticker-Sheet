import React from "react";

interface StickerDoodlesProps {
  slotIndex: number;
}

/**
 * Rich laptop-sticker doodle overlays inspired by the 3 reference sticker sheets:
 * jewelled crown, cool shades, smiling coffee/chai cup, pizza slice,
 * Dream Big thought bubble, mini checklist + smiley, and book stack + pink bow.
 */
export const StickerDoodles: React.FC<StickerDoodlesProps> = ({ slotIndex }) => {
  const variant = slotIndex % 6;

  // Slot 0: Jewelled Gold Crown + Sparkles + Pink Heart ("Queen of my Own World" vibe)
  if (variant === 0) {
    return (
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
      >
        {/* Jewelled Gold Crown perched top-center-left */}
        <g transform="translate(22, -13) rotate(-8 22 14)">
          <path
            d="M4 20 L1 6 L12 13 L21 2 L30 13 L41 6 L38 20 Z"
            fill="#FCD34D"
            stroke="#FFFFFF"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <path
            d="M4 20 L1 6 L12 13 L21 2 L30 13 L41 6 L38 20 Z"
            fill="#FCD34D"
            stroke="#15233F"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="15.5" r="1.7" fill="#EC4899" />
          <circle cx="21" cy="14" r="2" fill="#38BDF8" />
          <circle cx="30" cy="15.5" r="1.7" fill="#EC4899" />
        </g>

        {/* Sparkle Stars */}
        <path
          d="M87 10 L89 15 L94 17 L89 19 L87 24 L85 19 L80 17 L85 15 Z"
          fill="#FCD34D"
          stroke="#15233F"
          strokeWidth="1.2"
        />
        <path
          d="M93 28 L94.2 31 L97 32.2 L94.2 33.4 L93 36.4 L91.8 33.4 L89 32.2 L91.8 31 Z"
          fill="#FFFFFF"
          stroke="#15233F"
          strokeWidth="0.9"
        />

        {/* Pink Heart Bottom-Left */}
        <path
          d="M9 80 C6 76, 1 79, 3.5 84 C5 87, 9 90, 9 90 C9 90, 13 87, 14.5 84 C17 79, 12 76, 9 80 Z"
          fill="#EC4899"
          stroke="#FFFFFF"
          strokeWidth="1.5"
        />
      </svg>
    );
  }

  // Slot 1: Cool Sunglasses + Motion Burst Lines + Hearts ("Too Cool for You" vibe)
  if (variant === 1) {
    return (
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
      >
        {/* Motion Burst Lines Top-Left */}
        <g stroke="#15233F" strokeWidth="2.4" strokeLinecap="round">
          <line x1="3" y1="14" x2="10" y2="19" />
          <line x1="9" y1="5" x2="14" y2="13" />
          <line x1="0" y1="23" x2="8" y2="24" />
        </g>

        {/* Cool Shades Sticker Badge Bottom-Right */}
        <g transform="translate(62, 74) rotate(-6 18 10)">
          <rect
            x="0"
            y="1"
            width="36"
            height="16"
            rx="6"
            fill="#FFFFFF"
          />
          <rect
            x="3"
            y="4"
            width="13"
            height="10"
            rx="3"
            fill="#0F172A"
            stroke="#15233F"
            strokeWidth="1.4"
          />
          <rect
            x="20"
            y="4"
            width="13"
            height="10"
            rx="3"
            fill="#0F172A"
            stroke="#15233F"
            strokeWidth="1.4"
          />
          <line x1="16" y1="7.5" x2="20" y2="7.5" stroke="#0F172A" strokeWidth="2" />
          <line x1="6" y1="7" x2="10" y2="11" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
          <line x1="23" y1="7" x2="27" y2="11" stroke="#FFFFFF" strokeWidth="1.1" strokeLinecap="round" opacity="0.7" />
        </g>

        {/* Double Hearts Top-Right */}
        <path
          d="M88 8 C85 4, 80 7, 82.5 12 C84 15, 88 18, 88 18 C88 18, 92 15, 93.5 12 C96 7, 91 4, 88 8 Z"
          fill="#EC4899"
          stroke="#FFFFFF"
          strokeWidth="1.4"
        />
      </svg>
    );
  }

  // Slot 2: Smiling Coffee/Chai Cup + Cute Pizza Slice + Sparkles ("Coffee + Foodie" vibe)
  if (variant === 2) {
    return (
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
      >
        {/* Smiling Iced Coffee / Chai Cup Top-Left */}
        <g transform="translate(-3, -2) rotate(-10 14 16)">
          <rect x="2" y="2" width="22" height="28" rx="7" fill="#FFFFFF" />
          <line x1="13" y1="4" x2="16" y2="11" stroke="#EC4899" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M6 11 L20 11 L18 26 L8 26 Z" fill="#FDE68A" stroke="#15233F" strokeWidth="1.5" strokeLinejoin="round" />
          <rect x="5" y="9" width="16" height="3" rx="1.5" fill="#FDBA74" stroke="#15233F" strokeWidth="1.3" />
          <circle cx="10.5" cy="17" r="1" fill="#15233F" />
          <circle cx="15.5" cy="17" r="1" fill="#15233F" />
          <path d="M11 20 Q13 22 15 20" fill="none" stroke="#15233F" strokeWidth="1.2" strokeLinecap="round" />
        </g>

        {/* Cute Smiling Pizza Slice Bottom-Right */}
        <g transform="translate(72, 68) rotate(12 14 14)">
          <path
            d="M14 2 L26 24 Q14 28 2 24 Z"
            fill="#FCD34D"
            stroke="#FFFFFF"
            strokeWidth="3.5"
            strokeLinejoin="round"
          />
          <path
            d="M14 2 L26 24 Q14 28 2 24 Z"
            fill="#FCD34D"
            stroke="#15233F"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M2 22 Q14 26 26 22" fill="none" stroke="#EA580C" strokeWidth="3.2" strokeLinecap="round" />
          <circle cx="11" cy="13" r="1.7" fill="#EF4444" />
          <circle cx="17" cy="16" r="1.7" fill="#EF4444" />
          <circle cx="12.5" cy="18.5" r="0.9" fill="#15233F" />
          <circle cx="15.5" cy="18.5" r="0.9" fill="#15233F" />
        </g>

        {/* Sparkle Top-Right */}
        <path
          d="M89 12 L90.8 16.5 L95 18.2 L90.8 20 L89 24.5 L87.2 20 L83 18.2 L87.2 16.5 Z"
          fill="#FCD34D"
          stroke="#15233F"
          strokeWidth="1.1"
        />
      </svg>
    );
  }

  // Slot 3: "Dream Big" Cloud Thought Bubble + Double Pink Hearts
  if (variant === 3) {
    return (
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
      >
        {/* Cloud Thought Bubble Top-Right */}
        <g transform="translate(56, -6)">
          <path
            d="M10 22 C4 22, 2 16, 6 12 C5 6, 12 2, 18 5 C22 1, 31 2, 33 8 C39 8, 41 15, 36 19 C38 24, 32 27, 27 25 C22 28, 13 27, 10 22 Z"
            fill="#FFFFFF"
            stroke="#15233F"
            strokeWidth="1.7"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="30" r="2.2" fill="#FFFFFF" stroke="#15233F" strokeWidth="1.3" />
          <circle cx="5" cy="34" r="1.3" fill="#FFFFFF" stroke="#15233F" strokeWidth="1.2" />
          <text
            x="21"
            y="13.5"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="800"
            fill="#15233F"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            Dream
          </text>
          <text
            x="21"
            y="20.5"
            textAnchor="middle"
            fontSize="6.5"
            fontWeight="800"
            fill="#EC4899"
            fontFamily="Plus Jakarta Sans, sans-serif"
          >
            Big!
          </text>
        </g>

        {/* Double Pink Hearts Left */}
        <path
          d="M8 14 C5 10, 0 13, 2.5 18 C4 21, 8 24, 8 24 C8 24, 12 21, 13.5 18 C16 13, 11 10, 8 14 Z"
          fill="#F472B6"
          stroke="#15233F"
          strokeWidth="1.3"
        />
        <path
          d="M12 31 C10 28.5, 7 30.5, 8.5 33.5 C9.5 35.5, 12 37.5, 12 37.5 C12 37.5, 14.5 35.5, 15.5 33.5 C17 30.5, 14 28.5, 12 31 Z"
          fill="#EC4899"
          stroke="#15233F"
          strokeWidth="1.1"
        />
      </svg>
    );
  }

  // Slot 4: Mini Checklist Card ("Chai / Code / Win") + Happy Smiley
  if (variant === 4) {
    return (
      <svg
        viewBox="0 0 100 100"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
      >
        {/* Mini Checklist Sticker Top-Left */}
        <g transform="translate(-4, 4) rotate(-6 16 16)">
          <rect
            x="0"
            y="0"
            width="31"
            height="31"
            rx="5"
            fill="#FFFFFF"
            stroke="#15233F"
            strokeWidth="1.5"
          />
          <g stroke="#15233F" strokeWidth="1.3" fill="none">
            <rect x="4" y="5" width="4.5" height="4.5" rx="1" />
            <path d="M5 7.5 L6.3 8.8 L8.5 5.8" stroke="#EC4899" strokeWidth="1.4" strokeLinecap="round" />
            <rect x="4" y="13" width="4.5" height="4.5" rx="1" />
            <path d="M5 15.5 L6.3 16.8 L8.5 13.8" stroke="#EC4899" strokeWidth="1.4" strokeLinecap="round" />
            <rect x="4" y="21" width="4.5" height="4.5" rx="1" />
            <path d="M5 23.5 L6.3 24.8 L8.5 21.8" stroke="#EC4899" strokeWidth="1.4" strokeLinecap="round" />
          </g>
          <text x="11" y="9" fontSize="5.3" fontWeight="800" fill="#15233F" fontFamily="Plus Jakarta Sans, sans-serif">Chai</text>
          <text x="11" y="17" fontSize="5.3" fontWeight="800" fill="#15233F" fontFamily="Plus Jakarta Sans, sans-serif">Code</text>
          <text x="11" y="25" fontSize="5.3" fontWeight="800" fill="#EC4899" fontFamily="Plus Jakarta Sans, sans-serif">Win!</text>
        </g>

        {/* Happy Yellow Smiley Bottom-Right */}
        <g transform="translate(76, 74)">
          <circle cx="10" cy="10" r="9.5" fill="#FFFFFF" />
          <circle cx="10" cy="10" r="8" fill="#FCD34D" stroke="#15233F" strokeWidth="1.5" />
          <circle cx="7.4" cy="8.5" r="1.1" fill="#15233F" />
          <circle cx="12.6" cy="8.5" r="1.1" fill="#15233F" />
          <path
            d="M6.5 11.8 C8 14.5, 12 14.5, 13.5 11.8"
            fill="none"
            stroke="#15233F"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </g>
      </svg>
    );
  }

  // Slot 5: Stacked Books ("BIG DREAMS / AI") + Pink Ribbon Bow + Sparkles
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 w-full h-full overflow-visible"
    >
      {/* Pink Ribbon Bow Top-Right */}
      <g transform="translate(71, -2) rotate(12 13 10)">
        <path
          d="M13 10 L2 4 L4 16 Z M13 10 L24 4 L22 16 Z"
          fill="#F472B6"
          stroke="#FFFFFF"
          strokeWidth="3.2"
          strokeLinejoin="round"
        />
        <path
          d="M13 10 L2 4 L4 16 Z M13 10 L24 4 L22 16 Z"
          fill="#F472B6"
          stroke="#15233F"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />
        <path d="M11.5 11 L7 21 M14.5 11 L19 21" stroke="#15233F" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="13" cy="10" r="2.8" fill="#EC4899" stroke="#15233F" strokeWidth="1.3" />
      </g>

      {/* Stacked Books Badge Bottom-Left */}
      <g transform="translate(-3, 71) rotate(-5 16 14)">
        <rect x="0" y="0" width="32" height="24" rx="5" fill="#FFFFFF" />
        <rect x="3" y="3" width="26" height="6" rx="2" fill="#A78BFA" stroke="#15233F" strokeWidth="1.2" />
        <rect x="4" y="9" width="24" height="6" rx="2" fill="#F472B6" stroke="#15233F" strokeWidth="1.2" />
        <rect x="2" y="15" width="28" height="6.5" rx="2" fill="#FCD34D" stroke="#15233F" strokeWidth="1.2" />
        <text x="16" y="7.5" textAnchor="middle" fontSize="4.2" fontWeight="800" fill="#15233F" fontFamily="Plus Jakarta Sans, sans-serif">BIG DREAMS</text>
        <text x="16" y="13.5" textAnchor="middle" fontSize="4.2" fontWeight="800" fill="#15233F" fontFamily="Plus Jakarta Sans, sans-serif">AI + GOALS</text>
        <text x="16" y="19.8" textAnchor="middle" fontSize="4.2" fontWeight="800" fill="#15233F" fontFamily="Plus Jakarta Sans, sans-serif">HAPPY ME</text>
      </g>

      {/* Sparkle Top-Left */}
      <path
        d="M10 10 L11.8 14.5 L16 16.2 L11.8 18 L10 22.5 L8.2 18 L4 16.2 L8.2 14.5 Z"
        fill="#FCD34D"
        stroke="#15233F"
        strokeWidth="1.2"
      />
    </svg>
  );
};
