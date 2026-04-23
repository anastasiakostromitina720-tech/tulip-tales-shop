import { Link } from "@tanstack/react-router";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/60 bg-background/60">
      <div className="container mx-auto max-w-7xl px-4 md:px-6 py-12 grid gap-10 md:grid-cols-4">
        <div className="md:col-span-2">
          <div className="text-2xl font-serif italic">Тюльпаны · Москва</div>
          <p className="mt-3 text-sm text-muted-foreground max-w-md leading-relaxed">
            Свежие тюльпаны и авторские букеты с доставкой по Москве. Срезаем утром,
            привозим к вашему дому в тот же день.
          </p>
          <p className="mt-4 text-sm font-script text-2xl text-primary">
            весна — это маленькое чудо
          </p>
        </div>
        <div>
          <div className="text-sm font-medium mb-3">Магазин</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/catalog" className="hover:text-primary">Каталог</Link></li>
            <li><Link to="/delivery" className="hover:text-primary">Доставка</Link></li>
            <li><Link to="/about" className="hover:text-primary">О нас</Link></li>
            <li><Link to="/contacts" className="hover:text-primary">Контакты</Link></li>
          </ul>
        </div>
        <div>
          <div className="text-sm font-medium mb-3">Документы</div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li><Link to="/privacy" className="hover:text-primary">Политика конфиденциальности</Link></li>
            <li><Link to="/oferta" className="hover:text-primary">Публичная оферта</Link></li>
            <li><Link to="/admin/login" className="hover:text-primary">Админ-панель</Link></li>
          </ul>
          <div className="mt-4 text-sm text-muted-foreground">
            <a href="tel:+74951234567" className="hover:text-primary">+7 (495) 123-45-67</a>
            <br />
            ежедневно 9:00 — 21:00
          </div>
        </div>
      </div>
      <div className="border-t border-border/60">
        <div className="container mx-auto max-w-7xl px-4 md:px-6 py-5 text-xs text-muted-foreground flex flex-col md:flex-row justify-between gap-2">
          <span>© {new Date().getFullYear()} Тюльпаны · Москва. Все права защищены.</span>
          <span>Сделано с ♡ для весны</span>
        </div>
      </div>
    </footer>
  );
}
