import { Link } from "@tanstack/react-router";
import { ShoppingBag, Menu, X, Phone } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";

const nav = [
  { to: "/catalog", label: "Каталог" },
  { to: "/delivery", label: "Доставка" },
  { to: "/about", label: "О нас" },
  { to: "/contacts", label: "Контакты" },
] as const;

export function SiteHeader() {
  const { count } = useCart();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/60">
      <div className="container mx-auto max-w-7xl px-4 md:px-6 h-16 md:h-20 flex items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2 group" onClick={() => setOpen(false)}>
          <span className="text-2xl md:text-3xl font-serif italic tracking-tight">Тюльпаны</span>
          <span className="hidden sm:inline text-sm text-muted-foreground font-script text-lg">
            · Москва
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeProps={{ className: "text-primary" }}
              className="text-sm tracking-wide text-foreground/80 hover:text-primary transition-colors"
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="tel:+74951234567"
            className="hidden lg:flex items-center gap-1.5 text-sm text-foreground/80 hover:text-primary transition-colors"
          >
            <Phone className="h-4 w-4" />
            +7 (495) 123-45-67
          </a>
          <Link
            to="/cart"
            className="relative flex items-center justify-center h-10 w-10 rounded-full bg-card border border-border hover:border-primary transition-colors"
            aria-label="Корзина"
          >
            <ShoppingBag className="h-4 w-4" />
            {count > 0 && (
              <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-medium h-5 min-w-5 px-1 rounded-full flex items-center justify-center">
                {count}
              </span>
            )}
          </Link>
          <button
            className="md:hidden flex items-center justify-center h-10 w-10 rounded-full bg-card border border-border"
            onClick={() => setOpen((o) => !o)}
            aria-label="Меню"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur">
          <nav className="container mx-auto max-w-7xl px-4 py-4 flex flex-col gap-3">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                onClick={() => setOpen(false)}
                className="text-base py-2 text-foreground/80"
              >
                {n.label}
              </Link>
            ))}
            <a href="tel:+74951234567" className="text-base py-2 text-primary">
              +7 (495) 123-45-67
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
