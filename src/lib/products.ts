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
