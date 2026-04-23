import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardList, Package, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/products";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

function AdminDashboard() {
  const [stats, setStats] = useState({ newOrders: 0, totalProducts: 0, weekRevenue: 0, weekCount: 0 });

  useEffect(() => {
    (async () => {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const [{ count: newCount }, { count: prodCount }, { data: weekOrders }] = await Promise.all([
        supabase.from("orders").select("*", { count: "exact", head: true }).eq("status", "new"),
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("orders").select("total").gte("created_at", weekAgo),
      ]);
      const weekRev = (weekOrders ?? []).reduce((s, o) => s + Number(o.total), 0);
      setStats({
        newOrders: newCount ?? 0,
        totalProducts: prodCount ?? 0,
        weekRevenue: weekRev,
        weekCount: weekOrders?.length ?? 0,
      });
    })();
  }, []);

  return (
    <div className="p-8 md:p-10 max-w-6xl">
      <h1 className="text-3xl font-serif italic">Дашборд</h1>
      <p className="text-muted-foreground mt-1">Сводка по магазину</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
        <Card icon={ClipboardList} label="Новые заявки" value={stats.newOrders} accent />
        <Card icon={Package} label="Товаров в каталоге" value={stats.totalProducts} />
        <Card icon={Sparkles} label="Заявок за неделю" value={stats.weekCount} sub={formatPrice(stats.weekRevenue)} />
      </div>
    </div>
  );
}

function Card({
  icon: Icon, label, value, sub, accent,
}: { icon: typeof ClipboardList; label: string; value: number | string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-3xl p-7 ${accent ? "bg-primary text-primary-foreground" : "bg-card"}`}>
      <Icon className="h-6 w-6 opacity-80" />
      <div className="text-4xl font-serif italic mt-4">{value}</div>
      <div className={`text-sm mt-1 ${accent ? "opacity-90" : "text-muted-foreground"}`}>{label}</div>
      {sub && <div className={`text-xs mt-2 ${accent ? "opacity-80" : "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}
