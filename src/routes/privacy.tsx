import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({ meta: [{ title: "Политика конфиденциальности — Тюльпаны" }] }),
});

function PrivacyPage() {
  return (
    <SiteLayout>
      <article className="container mx-auto max-w-3xl px-4 md:px-6 py-16 prose-content">
        <h1 className="text-4xl md:text-5xl font-serif italic">Политика конфиденциальности</h1>
        <p className="text-muted-foreground mt-2">Дата вступления в силу: {new Date().toLocaleDateString("ru-RU")}</p>

        <Section t="1. Общие положения">
          Настоящая Политика регулирует обработку и защиту персональных данных пользователей сайта
          tulips-msk.ru (далее — «Сайт») в соответствии с ФЗ № 152-ФЗ «О персональных данных».
        </Section>
        <Section t="2. Какие данные мы собираем">
          Имя, телефон, адрес доставки, дата и время доставки, комментарий к заказу, а также
          техническую информацию (cookies, IP-адрес, тип браузера).
        </Section>
        <Section t="3. Цели обработки">
          Оформление и доставка заказов, связь с клиентом, улучшение работы сайта, информирование
          о статусе заявки.
        </Section>
        <Section t="4. Передача данных">
          Данные не передаются третьим лицам, кроме служб доставки, выполняющих заказ. Все сотрудники
          обязаны соблюдать конфиденциальность.
        </Section>
        <Section t="5. Хранение и защита">
          Данные хранятся на защищённых серверах. Срок хранения — не более 3 лет с момента последнего заказа.
        </Section>
        <Section t="6. Права пользователя">
          Вы можете запросить удаление или изменение своих данных, написав на hello@tulips-msk.ru.
        </Section>
      </article>
    </SiteLayout>
  );
}

function Section({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div className="mt-8">
      <h2 className="font-serif text-2xl">{t}</h2>
      <p className="mt-3 text-muted-foreground leading-relaxed">{children}</p>
    </div>
  );
}
