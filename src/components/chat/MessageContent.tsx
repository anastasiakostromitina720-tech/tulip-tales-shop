import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const PHOTO_RE = /\[\[photo:([0-9a-fA-F-]{36})\]\]/g;

type ProductPreview = {
  id: string;
  name: string;
  price: number;
  image: string | null;
};

// Module-level cache so we don't refetch the same product across messages
const cache = new Map<string, ProductPreview | null>();
const inflight = new Map<string, Promise<ProductPreview | null>>();

async function loadProduct(id: string): Promise<ProductPreview | null> {
  if (cache.has(id)) return cache.get(id) ?? null;
  if (inflight.has(id)) return inflight.get(id)!;
  const p = (async () => {
    const { data } = await supabase
      .from("products")
      .select("id, name, price, images")
      .eq("id", id)
      .maybeSingle();
    const preview: ProductPreview | null = data
      ? {
          id: data.id,
          name: data.name,
          price: Number(data.price),
          image: Array.isArray(data.images) && data.images.length > 0 ? (data.images[0] as string) : null,
        }
      : null;
    cache.set(id, preview);
    inflight.delete(id);
    return preview;
  })();
  inflight.set(id, p);
  return p;
}

export function MessageContent({ content, linkProducts = true }: { content: string; linkProducts?: boolean }) {
  // Split content into text + photo parts in render order
  const parts: Array<{ type: "text"; value: string } | { type: "photo"; id: string }> = [];
  let lastIndex = 0;
  for (const match of content.matchAll(PHOTO_RE)) {
    const idx = match.index ?? 0;
    if (idx > lastIndex) parts.push({ type: "text", value: content.slice(lastIndex, idx) });
    parts.push({ type: "photo", id: match[1] });
    lastIndex = idx + match[0].length;
  }
  if (lastIndex < content.length) parts.push({ type: "text", value: content.slice(lastIndex) });

  return (
    <div className="space-y-2">
      {parts.map((p, i) => {
        if (p.type === "text") {
          const trimmed = p.value.replace(/^\n+|\n+$/g, "");
          if (!trimmed) return null;
          return (
            <div key={i} className="whitespace-pre-wrap break-words">
              {trimmed}
            </div>
          );
        }
        return <PhotoCard key={i} id={p.id} linkProducts={linkProducts} />;
      })}
    </div>
  );
}

function PhotoCard({ id, linkProducts }: { id: string; linkProducts: boolean }) {
  const [product, setProduct] = useState<ProductPreview | null | undefined>(
    cache.has(id) ? cache.get(id) ?? null : undefined,
  );

  useEffect(() => {
    let active = true;
    if (product === undefined) {
      loadProduct(id).then((p) => { if (active) setProduct(p); });
    }
    return () => { active = false; };
  }, [id, product]);

  if (product === undefined) {
    return <div className="h-32 w-full rounded-xl bg-muted/50 animate-pulse" />;
  }
  if (!product) return null;

  const inner = (
    <div className="rounded-xl overflow-hidden border border-border bg-background hover:shadow-md transition-shadow">
      {product.image ? (
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="w-full h-40 object-cover"
        />
      ) : (
        <div className="h-40 bg-muted flex items-center justify-center text-xs text-muted-foreground">
          Нет фото
        </div>
      )}
      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{product.name}</span>
        <span className="text-sm text-primary font-medium shrink-0">{product.price}₽</span>
      </div>
    </div>
  );

  if (!linkProducts) return inner;

  return (
    <Link to="/catalog/$id" params={{ id: product.id }} className="block">
      {inner}
    </Link>
  );
}
