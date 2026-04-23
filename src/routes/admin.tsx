import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect } from "react";
import { LayoutDashboard, Package, ClipboardList, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === "/admin/login";

  useEffect(() => {
    if (loading) return;
    if (isLogin) return;
    if (!user) {
      navigate({ to: "/admin/login" });
      return;
    }
    if (user && !isAdmin) {
      // not admin: stay on a notice in login
      navigate({ to: "/admin/login" });
    }
  }, [loading, user, isAdmin, isLogin, navigate]);

  if (isLogin) {
    return <Outlet />;
  }

  if (loading || !user || !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Проверка доступа...
      </div>
    );
  }

  const nav: { to: "/admin" | "/admin/orders" | "/admin/products"; label: string; icon: typeof LayoutDashboard; exact?: boolean }[] = [
    { to: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true },
    { to: "/admin/orders", label: "Заявки", icon: ClipboardList },
    { to: "/admin/products", label: "Товары", icon: Package },
  ];

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/" className="text-xl font-serif italic">Тюльпаны</Link>
          <div className="text-xs text-muted-foreground mt-0.5">админ-панель</div>
        </div>
        <nav className="p-3 space-y-1 flex-1">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              activeOptions={{ exact: n.exact }}
              activeProps={{ className: "bg-primary/10 text-primary" }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm hover:bg-muted transition-colors"
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="p-3 border-t border-border space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted">
            <ArrowLeft className="h-4 w-4" /> На сайт
          </Link>
          <button
            onClick={async () => { await signOut(); navigate({ to: "/admin/login" }); }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-muted-foreground hover:bg-muted"
          >
            <LogOut className="h-4 w-4" /> Выйти
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
