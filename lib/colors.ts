import type { SWColor } from "@/types";
import swColors from "@/data/sw-colors.json";

export const allCuratedColors: SWColor[] = swColors as SWColor[];

export const COLOR_FAMILIES = [
  "Popular",
  "White",
  "Gray",
  "Greige",
  "Neutral",
  "Blue",
  "Teal",
  "Green",
  "Brown",
  "Black",
  "Red",
  "Orange",
  "Yellow",
  "Purple",
] as const;

export type ColorFamily = (typeof COLOR_FAMILIES)[number];

export function getPopularColors(): SWColor[] {
  return allCuratedColors.filter((c) => c.popular);
}

export function getAllColors(): SWColor[] {
  const familyOrder = COLOR_FAMILIES.slice(1); // skip "Popular"
  return [...allCuratedColors].sort((a, b) => {
    const ai = familyOrder.indexOf(a.family as ColorFamily);
    const bi = familyOrder.indexOf(b.family as ColorFamily);
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name);
  });
}

export function getColorsByFamily(family: string): SWColor[] {
  if (family === "Popular") return getPopularColors();
  return allCuratedColors.filter((c) => c.family === family);
}

export function searchColors(query: string): SWColor[] {
  const q = query.toLowerCase().trim();
  if (!q) return allCuratedColors;
  return allCuratedColors.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      c.sw_code.toLowerCase().includes(q)
  );
}

export function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}
