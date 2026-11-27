import type { PaperConfig, StickerStyle, StickerTheme } from "./types";

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const VISITOR_TARGET_SECONDS = 150; // 2 minutes 30 seconds

export const DEFAULT_STICKER_TAG = "#DYPBSAICoE";

export const STICKER_TAG_PRESETS: string[] = [
  "#DYPBSAICoE",
  "#DYPBS",
];

export const STICKER_STYLES: StickerStyle[] = [
  "Flat cartoon",
  "Comic",
  "Pixel art",
  "3D anime",
  "Retro style",
];

// 6 distinct sticker frame colors: Navy #15233F, Orange #F28C38, Sky #7FB3E8, and 3 soft tints
export const STICKER_THEMES: StickerTheme[] = [
  {
    id: "navy",
    name: "Navy",
    bgColor: "#15233F",
    textColor: "#FFFFFF",
    borderColor: "#0D172B",
    photoRingColor: "rgba(255, 255, 255, 0.2)",
  },
  {
    id: "orange",
    name: "Orange",
    bgColor: "#F28C38",
    textColor: "#15233F",
    borderColor: "#D67422",
    photoRingColor: "rgba(21, 35, 63, 0.14)",
  },
  {
    id: "sky",
    name: "Sky",
    bgColor: "#7FB3E8",
    textColor: "#15233F",
    borderColor: "#5C97D4",
    photoRingColor: "rgba(21, 35, 63, 0.14)",
  },
  {
    id: "tint-apricot",
    name: "Soft Apricot",
    bgColor: "#FDE8D7",
    textColor: "#15233F",
    borderColor: "#F2C39D",
    photoRingColor: "rgba(242, 140, 56, 0.25)",
  },
  {
    id: "tint-ice",
    name: "Soft Ice",
    bgColor: "#E3EFFB",
    textColor: "#15233F",
    borderColor: "#B7D5F2",
    photoRingColor: "rgba(127, 179, 232, 0.35)",
  },
  {
    id: "tint-mist",
    name: "Soft Slate",
    bgColor: "#E9EDF5",
    textColor: "#15233F",
    borderColor: "#C5CEE0",
    photoRingColor: "rgba(21, 35, 63, 0.16)",
  },
];

export const DEFAULT_CAPTIONS: string[] = [
  "Exam Mode",
  "Placement Ready",
  "Chai Break",
  "Deadline Hero",
  "Topper Energy",
  "#DYPBSAICoE",
];

// 6 core + 9 campus B-School captions for quick swap
export const ALL_CAPTIONS: string[] = [
  "Exam Mode",
  "Placement Ready",
  "Chai Break",
  "Deadline Hero",
  "Topper Energy",
  "#DYPBSAICoE",
  "Case Study Pro",
  "PPT Survivor",
  "Caffeine Powered",
  "AI Innovator",
  "Group Project CEO",
  "Campus Legend",
  "Future Leader",
  "99% Attendance",
  "Pitch Perfect",
];

export const DEFAULT_PAPER_CONFIG: PaperConfig = {
  labelWidthMm: 82,
  labelHeightMm: 82,
  columns: 2,
  rows: 3,
  topMarginMm: 14,
  leftMarginMm: 18,
  gapXMm: 10,
  gapYMm: 11.5,
  cornerRadiusMm: 4,
  showCutGuides: false,
  testGridOnly: false,
  dieCutWhiteVinyl: false,
};

export interface PaperPreset {
  id: string;
  label: string;
  description: string;
  config: Partial<PaperConfig>;
}

export const PAPER_PRESETS: PaperPreset[] = [
  {
    id: "2x3-square",
    label: "2 × 3 Square (82 × 82 mm)",
    description: "6 square stickers · 14 mm top · 18 mm left · centered",
    config: {
      labelWidthMm: 82,
      labelHeightMm: 82,
      columns: 2,
      rows: 3,
      topMarginMm: 14,
      leftMarginMm: 18,
      gapXMm: 10,
      gapYMm: 11.5,
      cornerRadiusMm: 4,
    },
  },
  {
    id: "2x3-large-square",
    label: "2 × 3 Large Square (88 × 88 mm)",
    description: "6 large squares · 10 mm top · 13 mm left · 8 mm gap",
    config: {
      labelWidthMm: 88,
      labelHeightMm: 88,
      columns: 2,
      rows: 3,
      topMarginMm: 10,
      leftMarginMm: 13,
      gapXMm: 8,
      gapYMm: 6.5,
      cornerRadiusMm: 4,
    },
  },
  {
    id: "3x2-square",
    label: "3 × 2 Square Grid (60 × 60 mm)",
    description: "6 compact squares · 30 mm top · 10 mm left · 5 mm gap",
    config: {
      labelWidthMm: 60,
      labelHeightMm: 60,
      columns: 3,
      rows: 2,
      topMarginMm: 30,
      leftMarginMm: 10,
      gapXMm: 5,
      gapYMm: 12,
      cornerRadiusMm: 3.5,
    },
  },
];
