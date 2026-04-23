import { createFileRoute } from "@tanstack/react-router";
import { Truck, Clock, MapPin, CreditCard } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/delivery")({
  component: DeliveryPage,
  head: () => ({
    meta: [
      { title: "Доставка тюльпанов по Москве — Тюльпаны" },
      { name: "description", content: "Условия доставки букетов тюльпанов по Москве: зоны, время, стоимость, самовывоз." },
    ],
  }),
});

function DeliveryPage() {
  return (
    <SiteLayout>
      <section className="container mx-auto max-w-4xl px-4 md:px-6 pt-16 pb-10">
        <p className="font-script text-2xl text-primary">доставка</p>
        <h1 className="text-4xl md:text-6xl font-serif italic mt-1">Привезём в тот же день</h1>
        <p className="mt-5 text-muted-foreground max-w-2xl text-lg leading-relaxed">
          Доставка по Москве — ежедневно с 9:00 до 21:00. Букет приедет свежим: срезаем утром,
          собираем перед выездом.
        </p>
      </section>

      <section className="container mx-auto max-w-7xl px-4 md:px-6 py-8 grid md:grid-cols-2 gap-5">
        {[
          { icon: Truck, t: "В пределах МКАД", d: "от 500 ₽, бесплатно при заказе от 5 000 ₽" },
          { icon: MapPin, t: "За МКАД", d: "от 800 ₽ — рассчитывается индивидуально по адресу" },
          { icon: Clock, t: "Время доставки", d: "от 2 часов после подтверждения заявки, или ко времени" },
          { icon: CreditCard, t: "Оплата", d: "наличными или картой курьеру при получении" },
        ].map((c) => (
          <div key={c.t} className="bg-card rounded-3xl p-7 flex gap-4">
            <c.icon className="h-7 w-7 text-primary shrink-0 mt-1" />
            <div>
              <h3 className="font-serif text-2xl">{c.t}</h3>
              <p className="text-muted-foreground mt-1.5 text-sm">{c.d}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="container mx-auto max-w-4xl px-4 md:px-6 py-12">
        <h2 className="font-serif text-3xl">Самовывоз</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Можно забрать букет самостоятельно из нашей мастерской на ул. Цветочной, 7 — без наценки.
          Предупредите нас за час, чтобы букет ждал свежим.
        </p>
        <h2 className="font-serif text-3xl mt-10">Анонимная доставка</h2>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          По вашему желанию курьер не назовёт отправителя. Подпишите открытку — мы прикрепим её к букету.
        </p>
      </section>
    </SiteLayout>
  );
}
