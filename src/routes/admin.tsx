import { createFileRoute, Link, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LayoutDashboard, Package, ClipboardList, LogOut, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { user, isAdmin, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === "/admin/login";
  const [newCount, setNewCount] = useState(0);

  useEffect(() => {
    if (loading) return;
    if (isLogin) return;
    if (!user) {
      navigate({ to: "/admin/login" });
      return;
    }
    if (user && !isAdmin) {
      navigate({ to: "/admin/login" });
    }
  }, [loading, user, isAdmin, isLogin, navigate]);

  // Live counter of new orders
  useEffect(() => {
    if (!isAdmin) return;

    const fetchCount = async () => {
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("status", "new");
      setNewCount(count ?? 0);
    };
    fetchCount();

    const channel = supabase
      .channel("admin-sidebar-orders")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchCount();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [isAdmin]);

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

  const nav: { to: "/admin" | "/admin/orders" | "/admin/products"; label: string; icon: typeof LayoutDashboard; exact?: boolean; badge?: number }[] = [
    { to: "/admin", label: "Дашборд", icon: LayoutDashboard, exact: true },
    { to: "/admin/orders", label: "Заявки", icon: ClipboardList, badge: newCount },
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
              <span className="flex-1">{n.label}</span>
              {n.badge ? (
                <span className="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-[10px] font-medium min-w-[20px] text-center">
                  {n.badge}
                </span>
              ) : null}
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
