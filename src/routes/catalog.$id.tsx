import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Minus, Plus, Truck, Heart } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";
import { supabase } from "@/integrations/supabase/client";
import { colorLabels, formatPrice, resolveImage, typeLabels } from "@/lib/products";
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
        setProduct(data as Product | null);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-7xl px-4 md:px-6 py-20 text-center text-muted-foreground">Загружаем...</div>
      </SiteLayout>
    );
  }

  if (!product) {
    return (
      <SiteLayout>
        <div className="container mx-auto max-w-7xl px-4 md:px-6 py-20 text-center">
          <p className="text-muted-foreground">Букет не найден.</p>
          <Link to="/catalog" className="text-primary mt-4 inline-block">← В каталог</Link>
        </div>
      </SiteLayout>
    );
  }

  const img = resolveImage(product.images?.[0]);

  function addToCart(redirect = false) {
    if (!product) return;
    cart.add({ productId: product.id, name: product.name, price: product.price, image: img }, qty);
    toast.success("Добавлено в корзину");
    if (redirect) navigate({ to: "/cart" });
  }

  return (
    <SiteLayout>
      <div className="container mx-auto max-w-7xl px-4 md:px-6 py-8">
        <Link to="/catalog" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-4 w-4" /> Каталог
        </Link>
      </div>

      <section className="container mx-auto max-w-7xl px-4 md:px-6 grid lg:grid-cols-2 gap-10 lg:gap-16 pb-12">
        <div className="relative">
          <div className="blob blob-pink h-72 w-72 -top-12 -left-12" />
          <div className="relative rounded-[2rem] overflow-hidden bg-card shadow-md aspect-[4/5]">
            <img src={img} alt={product.name} className="h-full w-full object-cover" />
          </div>
        </div>

        <div className="lg:pt-8">
          <p className="font-script text-2xl text-primary">{typeLabels[product.type]}</p>
          <h1 className="text-4xl md:text-5xl font-serif italic mt-1">{product.name}</h1>
          {product.description && (
            <p className="mt-5 text-base text-muted-foreground leading-relaxed">{product.description}</p>
          )}

          <div className="mt-7 flex items-baseline gap-3">
            <div className="text-3xl font-medium">{formatPrice(product.price)}</div>
            {product.stems_count && (
              <div className="text-sm text-muted-foreground">за {product.stems_count} стеблей</div>
            )}
          </div>

          <div className="mt-8 flex items-center gap-4">
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
              className="rounded-full bg-primary text-primary-foreground px-7 py-3 text-sm font-medium hover:opacity-90"
            >
              В корзину
            </button>
            <button
              onClick={() => addToCart(true)}
              className="rounded-full border border-foreground/20 px-7 py-3 text-sm hover:border-primary hover:text-primary"
            >
              Купить сейчас
            </button>
          </div>

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
              <Truck className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <div className="text-sm font-medium">Доставка по Москве</div>
                <p className="text-xs text-muted-foreground mt-1">от 2 часов, оплата при получении</p>
              </div>
            </div>
            <div className="bg-card rounded-2xl p-5 flex items-start gap-3">
              <Heart className="h-5 w-5 mt-0.5 text-primary" />
              <div>
                <div className="text-sm font-medium">Свежесть гарантирована</div>
                <p className="text-xs text-muted-foreground mt-1">срезка в день доставки</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
