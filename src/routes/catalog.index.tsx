import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteLayout } from "@/components/SiteLayout";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { colorLabels } from "@/lib/products";

export const Route = createFileRoute("/catalog/")({
  component: CatalogPage,
  head: () => ({
    meta: [
      { title: "Каталог тюльпанов — букеты и поштучно · Москва" },
      { name: "description", content: "Букеты тюльпанов, пионовидные тюльпаны и продажа поштучно с доставкой по Москве." },
    ],
  }),
});

type Product = ProductCardData & { type: "bouquet" | "by_stem"; price: number };

function CatalogPage() {
  const [all, setAll] = useState<Product[]>([]);
  const [type, setType] = useState<"all" | "bouquet" | "by_stem">("all");
  const [color, setColor] = useState<string>("all");
  const [sort, setSort] = useState<"new" | "asc" | "desc">("new");

  useEffect(() => {
    supabase
      .from("products")
      .select("id,name,price,color,stems_count,images,type")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => setAll((data ?? []) as Product[]));
  }, []);

  const colors = useMemo(() => Array.from(new Set(all.map((p) => p.color).filter(Boolean))) as string[], [all]);

  const filtered = useMemo(() => {
    let list = all;
    if (type !== "all") list = list.filter((p) => p.type === type);
    if (color !== "all") list = list.filter((p) => p.color === color);
    if (sort === "asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "desc") list = [...list].sort((a, b) => b.price - a.price);
    return list;
  }, [all, type, color, sort]);

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-7xl px-4 md:px-6 pt-10 md:pt-16 pb-6">
        <p className="font-script text-2xl text-primary">каталог</p>
        <h1 className="text-4xl md:text-6xl font-serif italic mt-1">Все букеты</h1>
        <p className="mt-3 text-muted-foreground max-w-xl">
          Выберите готовую композицию или соберите свой букет поштучно.
        </p>
      </section>

      <section className="container mx-auto max-w-7xl px-4 md:px-6 py-6">
        <div className="grid md:grid-cols-12 gap-8">
          <aside className="md:col-span-3">
            <div className="bg-card rounded-3xl p-6 sticky top-24 space-y-6">
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Тип</div>
                <div className="space-y-1.5">
                  {[
                    { v: "all", l: "Все" },
                    { v: "bouquet", l: "Готовые букеты" },
                    { v: "by_stem", l: "Поштучно" },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setType(o.v as typeof type)}
                      className={`block w-full text-left text-sm py-1.5 ${type === o.v ? "text-primary font-medium" : "text-foreground/70 hover:text-foreground"}`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Цвет</div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => setColor("all")}
                    className={`block w-full text-left text-sm py-1.5 ${color === "all" ? "text-primary font-medium" : "text-foreground/70 hover:text-foreground"}`}
                  >
                    Все цвета
                  </button>
                  {colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setColor(c)}
                      className={`block w-full text-left text-sm py-1.5 ${color === c ? "text-primary font-medium" : "text-foreground/70 hover:text-foreground"}`}
                    >
                      {colorLabels[c] ?? c}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Сортировка</div>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as typeof sort)}
                  className="w-full bg-transparent border border-border rounded-full px-4 py-2 text-sm"
                >
                  <option value="new">Сначала новинки</option>
                  <option value="asc">Цена: по возрастанию</option>
                  <option value="desc">Цена: по убыванию</option>
                </select>
              </div>
            </div>
          </aside>

          <div className="md:col-span-9">
            {filtered.length === 0 ? (
              <p className="text-muted-foreground py-20 text-center">Букетов не найдено. Попробуйте другие фильтры.</p>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-5 md:gap-8">
                {filtered.map((p) => (
                  <ProductCard key={p.id} p={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}