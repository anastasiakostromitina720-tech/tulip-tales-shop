import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Minus, Plus, Truck, Heart, Droplets, Scissors, Snowflake, Clock } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import {
  colorLabels,
  formatPrice,
  resolveImage,
  typeLabels,
  packagingOptions,
  stemVariantsFor,
  computeVariantPrice,
  CARD_PRICE,
} from "@/lib/products";
import { useCart } from "@/lib/cart";
import { toast } from "sonner";

export const Route = createFileRoute("/catalog/$id")({
  component: ProductPage,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  composition: string | null;
  price: number;
  color: string | null;
  type: string;
  stems_count: number | null;
  images: string[];
};

function ProductPage() {
  const { id } = Route.useParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [activeImg, setActiveImg] = useState(0);
  const [stems, setStems] = useState<number | null>(null);
  const [packagingId, setPackagingId] = useState<typeof packagingOptions[number]["id"]>("kraft");
  const [withCard, setWithCard] = useState(false);
  const [cardText, setCardText] = useState("");
  const [loading, setLoading] = useState(true);
  const cart = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    supabase
      .from("products")
      .select("id,name,description,composition,price,color,type,stems_count,images")
      .eq("id", id)
      .eq("active", true)
      .maybeSingle()
      .then(({ data }) => {
        const p = data as Product | null;
        setProduct(p);
        if (p?.stems_count && p.stems_count > 1) setStems(p.stems_count);
        setLoading(false);
      });
  }, [id]);

  const isBouquet = product?.type === "bouquet";
  const stemOptions = useMemo(
    () => (isBouquet ? stemVariantsFor(product?.stems_count ?? null) : []),
    [isBouquet, product?.stems_count],
  );
  const packaging = packagingOptions.find((p) => p.id === packagingId) ?? packagingOptions[0];

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    if (isBouquet && stems) {
      return computeVariantPrice(product.price, product.stems_count, stems, packaging.priceDelta, withCard);
    }
    return product.price + (withCard ? CARD_PRICE : 0);
  }, [product, isBouquet, stems, packaging.priceDelta, withCard]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-7xl px-4 md:px-6 py-20 text-center text-muted-foreground">
          Загружаем...
        </div>
      </SiteLayout>
    );
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-7xl px-4 md:px-6 py-20 text-center">
          <p className="text-muted-foreground">Букет не найден.</p>
          <Link to="/catalog" className="text-primary mt-4 inline-block">
            ← В каталог
          </Link>
        </div>
      </SiteLayout>
    );
  }

  const images = product.images?.length ? product.images : [null];
  const mainImg = resolveImage(images[activeImg] ?? images[0]);

  function buildVariantSummary() {
    const parts: string[] = [];
    if (isBouquet && stems) parts.push(`${stems} шт`);
    parts.push(packaging.label.toLowerCase());
    if (withCard) parts.push("с открыткой");
    return parts.join(" · ");
  }

  function addToCart(redirect = false) {
    if (!product) return;
    const variantKey = `${product.id}__${stems ?? "x"}__${packagingId}__${withCard ? "c" : "n"}`;
    const variantName = `${product.name} · ${buildVariantSummary()}`;
    cart.add(
      { productId: variantKey, name: variantName, price: unitPrice, image: mainImg },
      qty,
    );
    toast.success("Добавлено в корзину");
    if (redirect) navigate({ to: "/cart" });
  }

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-7xl px-4 md:px-6 py-6 md:py-8">
        <Link
          to="/catalog"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" /> Каталог
        </Link>
      </div>

      <section className="container mx-auto max-w-7xl px-4 md:px-6 grid lg:grid-cols-2 gap-8 lg:gap-16 pb-12">
        <div className="relative">
          <div className="blob blob-pink h-72 w-72 -top-12 -left-12 hidden md:block" />
          <div className="relative rounded-[2rem] overflow-hidden bg-card shadow-md aspect-[4/5]">
            <img src={mainImg} alt={product.name} className="h-full w-full object-cover" />
          </div>
          {images.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`relative shrink-0 h-20 w-20 rounded-2xl overflow-hidden border-2 transition ${
                    i === activeImg ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
                  }`}
                  aria-label={`Фото ${i + 1}`}
                >
                  <img src={resolveImage(src)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:pt-4">
          <p className="font-script text-2xl text-primary">{typeLabels[product.type]}</p>
          <h1 className="text-3xl md:text-5xl font-serif italic mt-1">{product.name}</h1>

          {product.description && (
            <p className="mt-5 text-base text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          <div className="mt-6 flex items-baseline gap-3">
            <div className="text-3xl font-medium">{formatPrice(unitPrice)}</div>
            {isBouquet && stems && (
              <div className="text-sm text-muted-foreground">за {stems} шт</div>
            )}
          </div>

          {/* Варианты количества стеблей */}
          {isBouquet && stemOptions.length > 0 && (
            <div className="mt-7">
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">
                Количество стеблей
              </div>
              <div className="flex flex-wrap gap-2">
                {stemOptions.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStems(s)}
                    className={`rounded-full border px-4 py-2 text-sm transition ${
                      stems === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-card border-border hover:border-primary"
                    }`}
                  >
                    {s} шт
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Упаковка */}
          <div className="mt-6">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Упаковка</div>
            <div className="flex flex-wrap gap-2">
              {packagingOptions.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setPackagingId(opt.id)}
                  className={`rounded-full border px-4 py-2 text-sm transition ${
                    packagingId === opt.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border hover:border-primary"
                  }`}
                >
                  {opt.label}
                  {opt.priceDelta !== 0 && (
                    <span className="ml-1.5 opacity-80">
                      {opt.priceDelta > 0 ? "+" : ""}
                      {opt.priceDelta} ₽
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Открытка */}
          <div className="mt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={withCard}
                onChange={(e) => setWithCard(e.target.checked)}
                className="mt-1 h-4 w-4 accent-primary"
              />
              <div className="flex-1">
                <div className="text-sm font-medium">
                  Добавить открытку <span className="text-muted-foreground">+{CARD_PRICE} ₽</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Напишем ваше пожелание и приложим к букету
                </p>
              </div>
            </label>
            {withCard && (
              <textarea
                value={cardText}
                onChange={(e) => setCardText(e.target.value)}
                placeholder="Текст пожелания..."
                rows={3}
                maxLength={300}
                className="mt-3 w-full bg-card border border-border rounded-2xl p-3 text-sm focus:outline-none focus:border-primary"
              />
            )}
          </div>

          {/* Количество и кнопки */}
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center bg-card border border-border rounded-full">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-11 w-11 flex items-center justify-center hover:text-primary"
                aria-label="Меньше"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="w-10 text-center font-medium">{qty}</div>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="h-11 w-11 flex items-center justify-center hover:text-primary"
                aria-label="Больше"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => addToCart(false)}
              className="rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:opacity-90"
            >
              В корзину · {formatPrice(unitPrice * qty)}
            </button>
            <button
              onClick={() => addToCart(true)}
              className="rounded-full border border-foreground/20 px-6 py-3 text-sm hover:border-primary hover:text-primary"
            >
              Купить сейчас
            </button>
          </div>

          {/* Инфо-блоки */}
          <div className="mt-10 grid sm:grid-cols-2 gap-4">
            {product.composition && (
              <div className="bg-card rounded-2xl p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Состав</div>
                <p className="text-sm leading-relaxed">{product.composition}</p>
              </div>
            )}
            {product.color && (
              <div className="bg-card rounded-2xl p-5">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Цвет</div>
                <p className="text-sm">{colorLabels[product.color] ?? product.color}</p>
              </div>
            )}
            <div className="bg-card rounded-2xl p-5 flex items-start gap-3">
              <Truck className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <div>
                <div className="text-sm font-medium">Доставка по Москве</div>
                <p className="text-xs text-muted-foreground mt-1">от 2 часов, оплата при получении</p>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-5 flex items-start gap-3">
              <Heart className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <div>
                <div className="text-sm font-medium">Свежесть гарантирована</div>
                <p className="text-xs text-muted-foreground mt-1">срезка в день доставки</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Уход за букетом */}
      <section className="container mx-auto max-w-7xl px-4 md:px-6 py-10 border-t border-border/50">
        <h2 className="text-2xl md:text-3xl font-serif italic">Уход и стойкость</h2>
        <p className="text-sm text-muted-foreground mt-2">При правильном уходе букет простоит 5–7 дней</p>
        <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { Icon: Scissors, title: "Подрежьте стебли", text: "На 2–3 см под углом 45° перед постановкой в воду" },
            { Icon: Droplets, title: "Меняйте воду", text: "Каждый день, добавляйте каплю отбеливателя" },
            { Icon: Snowflake, title: "Держите в прохладе", text: "Тюльпаны любят 15–18 °C, подальше от батарей" },
            { Icon: Clock, title: "5–7 дней", text: "Средняя стойкость при правильном уходе" },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="bg-card rounded-2xl p-5">
              <Icon className="h-6 w-6 text-primary" />
              <div className="text-sm font-medium mt-3">{title}</div>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>
    </SiteLayout>
  );
}
