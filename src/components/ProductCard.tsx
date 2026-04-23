import { Link } from "@tanstack/react-router";
import { formatPrice, resolveImage, colorLabels } from "@/lib/products";

export type ProductCardData = {
  id: string;
  name: string;
  price: number;
  color: string | null;
  stems_count: number | null;
  images: string[];
};

export function ProductCard({ p }: { p: ProductCardData }) {
  const img = resolveImage(p.images?.[0]);
  return (
    <Link
      to="/catalog/$id"
      params={{ id: p.id }}
      className="group block"
    >
      <div className="relative overflow-hidden rounded-3xl bg-card aspect-[4/5] shadow-sm transition-all duration-500 group-hover:shadow-lg">
        <img
          src={img}
          alt={p.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3 bg-background/85 backdrop-blur px-3 py-1 rounded-full text-xs">
          {p.color ? colorLabels[p.color] ?? p.color : "Букет"}
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl leading-tight">{p.name}</h3>
          {p.stems_count && (
            <p className="text-xs text-muted-foreground mt-1">{p.stems_count} стеблей</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-medium">{formatPrice(p.price)}</div>
        </div>
      </div>
    </Link>
  );
}
