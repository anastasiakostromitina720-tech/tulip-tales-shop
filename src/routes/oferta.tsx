import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/oferta")({
  component: OfertaPage,
  head: () => ({ meta: [{ title: "Публичная оферта — Тюльпаны" }] }),
});

function OfertaPage() {
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 md:px-6 py-16">
        <h1 className="text-4xl md:text-5xl font-serif italic">Публичная оферта</h1>
        <p className="text-muted-foreground mt-2">Действует с {new Date().toLocaleDateString("ru-RU")}</p>

        <S t="1. Предмет оферты">
          Продавец предлагает любому физическому лицу (далее — «Покупатель») приобрести товары,
          представленные на Сайте tulips-msk.ru, на условиях настоящей оферты.
        </S>
        <S t="2. Оформление заказа">
          Покупатель оформляет заявку через корзину на Сайте, указывая контактные данные и адрес
          доставки. Заявка считается принятой после подтверждения менеджером по телефону.
        </S>
        <S t="3. Цена и оплата">
          Цены указаны в рублях и включают НДС. Оплата производится при получении заказа курьеру —
          наличными или банковской картой.
        </S>
        <S t="4. Доставка">
          Условия доставки описаны в разделе «Доставка». Срок и время уточняются при подтверждении заявки.
        </S>
        <S t="5. Возврат">
          В соответствии с законодательством РФ, цветы относятся к товарам, не подлежащим возврату.
          В случае получения некачественного товара мы заменим его или вернём деньги.
        </S>
        <S t="6. Ответственность">
          Продавец не несёт ответственности за задержку доставки, вызванную форс-мажорными обстоятельствами.
        </S>
        <S t="7. Контакты">
          ИП «Цветочная Мастерская», ИНН 7700000000, тел. +7 (495) 123-45-67, hello@tulips-msk.ru.
        </S>
      </article>
    </SiteLayout>
  );
}

function S({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="font-serif text-2xl">{t}</h2>
      <p className="mt-3 text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
