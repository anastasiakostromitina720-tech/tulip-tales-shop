import { createFileRoute } from "@tanstack/react-router";
import { Phone, Mail, MapPin, Clock, MessageCircle } from "lucide-react";
import { SiteLayout } from "@/components/SiteLayout";

export const Route = createFileRoute("/contacts")({
  component: ContactsPage,
  head: () => ({
    meta: [
      { title: "Контакты — Тюльпаны · Москва" },
      { name: "description", content: "Свяжитесь с нами: телефон, мессенджеры, адрес мастерской в Москве." },
    ],
  }),
});

function ContactsPage() {
  return (
    <SiteLayout>
      <section className="container mx-auto max-w-4xl px-4 md:px-6 pt-16 pb-12">
        <p className="font-script text-2xl text-primary">контакты</p>
        <h1 className="text-4xl md:text-6xl font-serif italic mt-1">Напишите нам</h1>
      </section>

      <section className="container mx-auto max-w-7xl px-4 md:px-6 py-8 grid md:grid-cols-2 gap-5">
        <a href="tel:+74951234567" className="bg-card rounded-3xl p-7 flex gap-4 hover:shadow-md transition-shadow">
          <Phone className="h-7 w-7 text-primary shrink-0 mt-1" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Телефон</div>
            <div className="font-serif text-2xl mt-1">+7 (495) 123-45-67</div>
          </div>
        </a>
        <a href="mailto:hello@tulips-msk.ru" className="bg-card rounded-3xl p-7 flex gap-4 hover:shadow-md transition-shadow">
          <Mail className="h-7 w-7 text-primary shrink-0 mt-1" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Email</div>
            <div className="font-serif text-2xl mt-1">hello@tulips-msk.ru</div>
          </div>
        </a>
        <div className="bg-card rounded-3xl p-7 flex gap-4">
          <MapPin className="h-7 w-7 text-primary shrink-0 mt-1" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Мастерская</div>
            <div className="font-serif text-2xl mt-1">Москва, ул. Цветочная, 7</div>
            <div className="text-sm text-muted-foreground mt-1">м. Пушкинская</div>
          </div>
        </div>
        <div className="bg-card rounded-3xl p-7 flex gap-4">
          <Clock className="h-7 w-7 text-primary shrink-0 mt-1" />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Часы работы</div>
            <div className="font-serif text-2xl mt-1">9:00 — 21:00</div>
            <div className="text-sm text-muted-foreground mt-1">без выходных</div>
          </div>
        </div>
      </section>

      <section className="container mx-auto max-w-4xl px-4 md:px-6 py-10">
        <div className="bg-primary text-primary-foreground rounded-3xl p-8 flex items-center gap-4">
          <MessageCircle className="h-8 w-8 shrink-0" />
          <div>
            <div className="font-serif text-2xl">Мы в мессенджерах</div>
            <p className="text-sm opacity-90 mt-1">Пишите в WhatsApp или Telegram — отвечаем мгновенно.</p>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
