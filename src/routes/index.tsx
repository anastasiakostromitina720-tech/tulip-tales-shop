import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, Truck, Sparkles, Heart, Search } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import heroImg from "@/assets/hero-tulips.jpg";

export const Route = createFileRoute("/")({
  component: HomePage,
  head: () => ({
    meta: [
      { title: "Тюльпаны · Москва — свежие букеты с доставкой" },
      {
        name: "description",
        content:
          "Авторские букеты тюльпанов и продажа поштучно. Доставка по Москве в день заказа.",
      },
    ],
  }),
});

function HomePage() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [byStem, setByStem] = useState<ProductCardData[]>([]);

  useEffect(() => {
    supabase
      .from("products")
      .select("id,name,price,color,stems_count,images,type")
      .eq("active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const all = (data ?? []) as (ProductCardData & { type: string })[];
        setProducts(all.filter((p) => p.type === "bouquet").slice(0, 4));
        setByStem(all.filter((p) => p.type === "by_stem"));
      });
  }, []);

  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="blob blob-pink h-[420px] w-[420px] -top-20 -left-20" />
        <div className="blob blob-mint h-[380px] w-[380px] top-40 right-0" />

        <div className="container mx-auto max-w-7xl px-4 md:px-6 pt-10 md:pt-16 pb-16 md:pb-24 grid md:grid-cols-12 gap-10 items-center relative">
          <div className="md:col-span-6 lg:col-span-5">
            <p className="font-script text-3xl md:text-4xl text-primary">здравствуй, весна</p>
            <h1 className="mt-3 text-6xl md:text-8xl lg:text-9xl font-serif italic leading-[1.02]">
              Весна приходит<br />
              <span className="text-primary">букетами</span>
            </h1>
            <p className="mt-6 text-base md:text-lg text-muted-foreground max-w-md leading-relaxed">
              Свежие тюльпаны прямо с утренней срезки. Авторские композиции, доставка по Москве
              в тот же день, оплата при получении.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/catalog"
                className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <Search className="h-4 w-4" /> Смотреть каталог <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/delivery"
                className="inline-flex items-center gap-2 rounded-full border border-foreground/20 px-6 py-3 text-sm hover:border-primary hover:text-primary transition-colors"
              >
                О доставке
              </Link>
            </div>

            <div className="mt-10 flex items-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2"><Truck className="h-4 w-4" /> по всей Москве</div>
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> срезка в день доставки</div>
            </div>
          </div>

          <div className="md:col-span-6 lg:col-span-7 relative">
            <div className="relative aspect-[5/4] rounded-[2.5rem] overflow-hidden bg-card shadow-xl">
              <img
                src={heroImg}
                alt="Букет нежных тюльпанов"
                width={1600}
                height={1100}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="hidden md:block absolute -bottom-6 -left-6 bg-card rounded-2xl p-5 shadow-lg max-w-[200px]">
              <div className="font-script text-xl text-primary">от 1 800 ₽</div>
              <div className="text-xs text-muted-foreground mt-1">букеты на любой бюджет</div>
            </div>
          </div>
        </div>
      </section>

      {/* TODAY IN STOCK */}
      <section className="container mx-auto max-w-7xl px-4 md:px-6 py-12 md:py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="font-script text-2xl text-primary">сегодня в наличии</p>
            <h2 className="text-3xl md:text-5xl font-serif italic mt-1">Свежие букеты</h2>
          </div>
          <Link to="/catalog" className="hidden md:inline-flex items-center gap-2 text-sm hover:text-primary">
            Весь каталог <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 md:gap-8">
          {products.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
      </section>

      {/* BY STEM */}
      <section className="relative py-16 md:py-24 bg-gradient-to-b from-transparent via-blush/15 to-transparent">
        <div className="container mx-auto max-w-7xl px-4 md:px-6 grid md:grid-cols-12 gap-10">
          <div className="md:col-span-4">
            <p className="font-script text-2xl text-primary">поштучно</p>
            <h2 className="text-3xl md:text-5xl font-serif italic mt-1 leading-tight">
              Тюльпаны<br />на ваш вкус
            </h2>
            <p className="mt-5 text-muted-foreground leading-relaxed">
              Выберите количество — мы соберём свежий букет любого цвета. От 25 до 101 стебля.
            </p>
            <Link
              to="/catalog"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-foreground/20 px-6 py-3 text-sm hover:border-primary hover:text-primary"
            >
              Выбрать количество <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {byStem.slice(0, 3).map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="container mx-auto max-w-7xl px-4 md:px-6 py-16 md:py-24">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <p className="font-script text-2xl text-primary">как мы работаем</p>
          <h2 className="text-3xl md:text-5xl font-serif italic mt-1">Просто, как весна</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { n: "01", t: "Выбираете букет", d: "В каталоге собраны готовые композиции и тюльпаны поштучно — на любой случай." },
            { n: "02", t: "Оставляете заявку", d: "Указываете адрес и удобное время. Менеджер перезвонит для подтверждения." },
            { n: "03", t: "Получаете цветы", d: "Курьер привозит букет к двери. Оплата при получении наличными или картой." },
          ].map((s) => (
            <div key={s.n} className="relative bg-card rounded-3xl p-8 shadow-sm">
              <div className="font-script text-5xl text-primary/40">{s.n}</div>
              <h3 className="font-serif text-2xl mt-2">{s.t}</h3>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto max-w-7xl px-4 md:px-6 pb-20">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-primary text-primary-foreground p-10 md:p-16">
          <div className="blob blob-pink h-72 w-72 -top-20 -right-20 opacity-30" />
          <div className="relative max-w-2xl">
            <Heart className="h-8 w-8 mb-4 opacity-80" />
            <h2 className="text-3xl md:text-5xl font-serif italic">
              Дарите весну каждый день
            </h2>
            <p className="mt-4 opacity-90 leading-relaxed">
              Доставка тюльпанов по Москве — от 2 часов после оформления заявки.
              Минимальный заказ — один букет.
            </p>
            <Link
              to="/catalog"
              className="mt-7 inline-flex items-center gap-2 rounded-full bg-background text-foreground px-6 py-3 text-sm font-medium hover:opacity-90"
            >
              Выбрать букет <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
