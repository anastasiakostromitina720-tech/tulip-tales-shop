import { createFileRoute } from "@tanstack/react-router";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/about")({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: "О нас — Тюльпаны · Москва" },
      { name: "description", content: "Маленькая семейная цветочная мастерская в Москве. Мы влюблены в тюльпаны." },
    ],
  }),
});

function AboutPage() {
  return (
    <SiteLayout>
      <section className="container mx-auto max-w-3xl px-4 md:px-6 pt-16 pb-12">
        <p className="font-script text-2xl text-primary">о нас</p>
        <h1 className="text-4xl md:text-6xl font-serif italic mt-1">Маленькая мастерская весны</h1>
        <p className="mt-6 text-lg text-muted-foreground leading-relaxed">
          Мы — небольшая семейная флористическая студия в самом центре Москвы. Любим тюльпаны
          за их простоту и нежность, и каждый букет собираем вручную, с настроением.
        </p>
        <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
          Работаем напрямую с подмосковными теплицами и голландскими поставщиками — поэтому
          у нас всегда свежие, плотные бутоны и широкая палитра цветов.
        </p>
      </section>

      <section className="container mx-auto max-w-7xl px-4 md:px-6 py-12 grid md:grid-cols-3 gap-6">
        {[
          { t: "Свежесть", d: "Цветы у нас не лежат — мы собираем букет под заявку, в день доставки." },
          { t: "Внимание", d: "Каждый букет упакован вручную и проверен флористом перед отправкой." },
          { t: "Любовь", d: "Мы делаем то, что любим, и хотим, чтобы это чувствовалось." },
        ].map((v) => (
          <div key={v.t} className="bg-card rounded-3xl p-7">
            <h3 className="font-serif text-2xl">{v.t}</h3>
            <p className="mt-2 text-muted-foreground text-sm leading-relaxed">{v.d}</p>
          </div>
        ))}
      </section>
    </SiteLayout>
  );
}
