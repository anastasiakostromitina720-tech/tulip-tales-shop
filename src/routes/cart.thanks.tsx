import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/cart/thanks")({
  component: ThanksPage,
  head: () => ({ meta: [{ title: "Спасибо за заявку — Тюльпаны" }] }),
});

function ThanksPage() {
  return (
    <SiteLayout>
      <section className="container mx-auto max-w-2xl px-4 md:px-6 py-24 text-center">
        <Sparkles className="h-12 w-12 mx-auto text-primary" />
        <h1 className="mt-6 text-4xl md:text-5xl font-serif italic">Спасибо!</h1>
        <p className="font-script text-3xl text-primary mt-3">букет уже в пути к радости</p>
        <p className="mt-5 text-muted-foreground">
          Мы получили вашу заявку. Менеджер свяжется в течение 15 минут для подтверждения деталей.
        </p>
        <Link to="/catalog" className="mt-8 inline-flex rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm">
          Вернуться в каталог
        </Link>
      </section>
    </SiteLayout>
  );
}
