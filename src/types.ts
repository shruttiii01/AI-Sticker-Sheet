export type StickerStyle = "Flat cartoon" | "Comic" | "Pixel art";

export type AppTab = "booth" | "exact" | "paper" | "saved";

export type BoothStep = "checkin" | "camera" | "studio";

export interface StickerTheme {
  id: string;
  name: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  photoRingColor: string;
}

export type StickerLayoutVariant = "colored" | "white-vinyl" | "side-by-side";

export interface PaperConfig {
  labelWidthMm: number;
  labelHeightMm: number;
  columns: number;
  rows: number;
  topMarginMm: number;
  leftMarginMm: number;
  gapXMm: number;
  gapYMm: number;
  cornerRadiusMm: number;
  showCutGuides: boolean;
  testGridOnly: boolean;
  dieCutWhiteVinyl?: boolean;
  layoutVariant?: StickerLayoutVariant;
}

export interface SavedOutput {
  id: string;
  firstName: string;
  style: StickerStyle;
  photoDataUrl: string;
  styledPhotoDataUrl?: string;
  avatarDataUrl?: string;
  useAvatar: boolean;
  photoMode?: "styled" | "original" | "ai";
  captions: string[];
  createdAt: number;
  elapsedSeconds: number;
}
