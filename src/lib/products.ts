import bouquetPink from "@/assets/bouquet-pink.jpg";
import bouquetWhite from "@/assets/bouquet-white.jpg";
import bouquetYellow from "@/assets/bouquet-yellow.jpg";
import bouquetMix from "@/assets/bouquet-mix.jpg";
import bouquetPeony from "@/assets/bouquet-peony.jpg";
import byStem25 from "@/assets/by-stem-25.jpg";
import byStem51 from "@/assets/by-stem-51.jpg";

const localImages: Record<string, string> = {
  "bouquet-pink": bouquetPink,
  "bouquet-white": bouquetWhite,
  "bouquet-yellow": bouquetYellow,
  "bouquet-mix": bouquetMix,
  "bouquet-peony": bouquetPeony,
  "by-stem-25": byStem25,
  "by-stem-51": byStem51,
};

export function resolveImage(src: string | undefined | null): string {
  if (!src) return bouquetPink;
  if (src.startsWith("http") || src.startsWith("/")) return src;
  return localImages[src] ?? bouquetPink;
}

export function formatPrice(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

export const colorLabels: Record<string, string> = {
  pink: "Розовые",
  white: "Белые",
  yellow: "Жёлтые",
  mix: "Микс",
  peony: "Пионовидные",
  red: "Красные",
};

export const typeLabels: Record<string, string> = {
  bouquet: "Букет",
  by_stem: "Поштучно",
};

export type PackagingOption = {
  id: "kraft" | "ribbon" | "tissue" | "none";
  label: string;
  priceDelta: number;
};

export const packagingOptions: PackagingOption[] = [
  { id: "kraft", label: "Крафт-бумага", priceDelta: 0 },
  { id: "ribbon", label: "Атласная лента", priceDelta: 300 },
  { id: "tissue", label: "Прозрачная плёнка", priceDelta: 200 },
  { id: "none", label: "Без упаковки", priceDelta: -200 },
];

export const CARD_PRICE = 150;

export const stemVariantsFor = (baseStems: number | null): number[] => {
  if (!baseStems || baseStems <= 1) return [];
  const all = [15, 25, 35, 51, 75, 101];
  const set = new Set<number>(all);
  set.add(baseStems);
  return Array.from(set).sort((a, b) => a - b);
};

export function computeVariantPrice(
  basePrice: number,
  baseStems: number | null,
  selectedStems: number,
  packagingDelta: number,
  withCard: boolean,
): number {
  const perStem = baseStems && baseStems > 0 ? basePrice / baseStems : basePrice;
  const stemsPrice = Math.round(perStem * selectedStems);
  return stemsPrice + packagingDelta + (withCard ? CARD_PRICE : 0);
}
