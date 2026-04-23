import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Minus, Plus, X, ShoppingBag } from "lucide-react";
import { z } from "zod";
import { SiteLayout } from "@/components/SiteLayout";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/products";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  component: CartPage,
  head: () => ({ meta: [{ title: "Корзина — Тюльпаны · Москва" }] }),
});

const orderSchema = z.object({
  customer_name: z.string().trim().min(2, "Укажите имя").max(100),
  phone: z.string().trim().min(5, "Укажите телефон").max(30),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  delivery_date: z.string().optional().or(z.literal("")),
  delivery_time: z.string().max(50).optional().or(z.literal("")),
  comment: z.string().max(1000).optional().or(z.literal("")),
});

function CartPage() {
  const cart = useCart();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    customer_name: "",
    phone: "",
    address: "",
    delivery_date: "",
    delivery_time: "",
    comment: "",
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (cart.items.length === 0) {
      toast.error("Корзина пуста");
      return;
    }
    const parsed = orderSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Проверьте данные");
      return;
    }
    setSubmitting(true);
    try {
      const orderId = crypto.randomUUID();

      const { error: orderError } = await supabase
        .from("orders")
        .insert({
          id: orderId,
          customer_name: parsed.data.customer_name,
          phone: parsed.data.phone,
          address: parsed.data.address || null,
          delivery_date: parsed.data.delivery_date || null,
          delivery_time: parsed.data.delivery_time || null,
          comment: parsed.data.comment || null,
          total: cart.total,
        });

      if (orderError) {
        throw new Error(`ORDER_CREATE_FAILED:${orderError.message}`);
      }

      const items = cart.items.map((i) => ({
        order_id: orderId,
        product_id: i.realProductId ?? i.productId,
        product_name: i.name,
        quantity: i.quantity,
        price: i.price,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(items);
      if (itemsErr) {
        throw new Error(`ORDER_ITEMS_CREATE_FAILED:${itemsErr.message}`);
      }

      cart.clear();
      navigate({ to: "/cart/thanks" });
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "";

      if (message.startsWith("ORDER_CREATE_FAILED:")) {
        toast.error("Не удалось создать заявку. Попробуйте ещё раз.");
      } else if (message.startsWith("ORDER_ITEMS_CREATE_FAILED:")) {
        toast.error("Заявка создана, но товары не добавились. Попробуйте ещё раз.");
      } else {
        toast.error("Не удалось отправить заявку. Попробуйте ещё раз.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (cart.items.length === 0) {
    return (
      <SiteLayout>
        <section className="container mx-auto max-w-2xl px-4 md:px-6 py-24 text-center">
          <ShoppingBag className="h-12 w-12 text-primary/50 mx-auto" />
          <h1 className="mt-6 text-4xl font-serif italic">Корзина пуста</h1>
          <p className="mt-3 text-muted-foreground">Загляните в каталог — там сейчас цветёт весна.</p>
          <Link to="/catalog" className="mt-6 inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm">
            В каталог
          </Link>
        </section>
      </SiteLayout>
    );
  }

  return (
    <SiteLayout>
      <section className="container mx-auto max-w-7xl px-4 md:px-6 pt-10 pb-6">
        <p className="font-script text-2xl text-primary">корзина</p>
        <h1 className="text-4xl md:text-5xl font-serif italic mt-1">Ваш букет</h1>
      </section>

      <section className="container mx-auto max-w-7xl px-4 md:px-6 pb-20 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 space-y-4">
          {cart.items.map((it) => (
            <div key={it.productId} className="bg-card rounded-3xl p-4 md:p-5 flex gap-4 items-center">
              <img src={it.image} alt={it.name} className="h-24 w-24 rounded-2xl object-cover shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-serif text-lg truncate">{it.name}</div>
                <div className="text-sm text-muted-foreground mt-0.5">{formatPrice(it.price)}</div>
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex items-center bg-background border border-border rounded-full">
                    <button
                      className="h-8 w-8 flex items-center justify-center"
                      onClick={() => cart.setQuantity(it.productId, it.quantity - 1)}
                    >
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <div className="w-8 text-center text-sm">{it.quantity}</div>
                    <button
                      className="h-8 w-8 flex items-center justify-center"
                      onClick={() => cart.setQuantity(it.productId, it.quantity + 1)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <button
                    onClick={() => cart.remove(it.productId)}
                    className="text-muted-foreground hover:text-destructive p-1"
                    aria-label="Удалить"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="text-right font-medium">{formatPrice(it.price * it.quantity)}</div>
            </div>
          ))}
        </div>

        <form onSubmit={submit} className="lg:col-span-5 bg-card rounded-3xl p-6 md:p-8 space-y-4 h-fit lg:sticky lg:top-24">
          <h2 className="font-serif text-2xl">Оформление заявки</h2>
          <p className="text-sm text-muted-foreground">Менеджер перезвонит для подтверждения. Оплата при получении.</p>

          <Field label="Ваше имя" required>
            <input
              required
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
              className="input"
              maxLength={100}
            />
          </Field>
          <Field label="Телефон" required>
            <input
              required
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="input"
              placeholder="+7 (___) ___-__-__"
              maxLength={30}
            />
          </Field>
          <Field label="Адрес доставки">
            <input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="input"
              placeholder="ул., дом, квартира"
              maxLength={500}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Дата">
              <input
                type="date"
                value={form.delivery_date}
                onChange={(e) => setForm({ ...form, delivery_date: e.target.value })}
                className="input"
              />
            </Field>
            <Field label="Время">
              <input
                value={form.delivery_time}
                onChange={(e) => setForm({ ...form, delivery_time: e.target.value })}
                className="input"
                placeholder="например, к 18:00"
                maxLength={50}
              />
            </Field>
          </div>
          <Field label="Комментарий">
            <textarea
              value={form.comment}
              onChange={(e) => setForm({ ...form, comment: e.target.value })}
              className="input min-h-[80px] resize-none"
              maxLength={1000}
            />
          </Field>

          <div className="border-t border-border pt-4 flex items-baseline justify-between">
            <span className="text-muted-foreground">Итого</span>
            <span className="text-2xl font-medium">{formatPrice(cart.total)}</span>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-primary text-primary-foreground py-3.5 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Отправляем..." : "Оставить заявку"}
          </button>
          <p className="text-xs text-muted-foreground text-center">
            Нажимая на кнопку, вы соглашаетесь с{" "}
            <Link to="/privacy" className="underline">политикой конфиденциальности</Link>{" "}и{" "}
            <Link to="/oferta" className="underline">офертой</Link>.
          </p>
        </form>
      </section>
    </SiteLayout>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">
        {label} {required && <span className="text-primary">*</span>}
      </div>
      {children}
    </label>
  );
}
