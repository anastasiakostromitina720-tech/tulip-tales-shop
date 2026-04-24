import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Package, TrendingUp, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/products";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type OrderRow = { id: string; total: number; created_at: string; delivery_date: string | null; customer_name: string; status: string };
type ItemRow = { product_name: string; quantity: number; price: number; created_at: string };

function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

function AdminDashboard() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<ItemRow[]>([]);
  const [productsCount, setProductsCount] = useState(0);

  useEffect(() => {
    (async () => {
      const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [ordersRes, itemsRes, prodRes] = await Promise.all([
        supabase.from("orders").select("id,total,created_at,delivery_date,customer_name,status").gte("created_at", monthAgo).order("created_at", { ascending: false }),
        supabase.from("order_items").select("product_name,quantity,price,created_at").gte("created_at", monthAgo),
        supabase.from("products").select("*", { count: "exact", head: true }),
      ]);
      setOrders((ordersRes.data as OrderRow[]) ?? []);
      setItems((itemsRes.data as ItemRow[]) ?? []);
      setProductsCount(prodRes.count ?? 0);
    })();
  }, []);

  const stats = useMemo(() => {
    const today = dayKey(new Date());
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newCount = orders.filter((o) => o.status === "new").length;
    const weekOrders = orders.filter((o) => new Date(o.created_at).getTime() >= weekAgo);
    const weekRev = weekOrders.reduce((s, o) => s + Number(o.total), 0);
    const avg = weekOrders.length ? Math.round(weekRev / weekOrders.length) : 0;
    const todayDelivery = orders.filter((o) => o.delivery_date === today && o.status !== "cancelled");
    return { newCount, weekRev, weekCount: weekOrders.length, avg, todayDelivery };
  }, [orders]);

  const chartData = useMemo(() => {
    const days: { day: string; label: string; count: number; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = dayKey(d);
      days.push({
        day: key,
        label: d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
        count: 0,
        revenue: 0,
      });
    }
    const map = new Map(days.map((d) => [d.day, d]));
    for (const o of orders) {
      const k = dayKey(new Date(o.created_at));
      const bucket = map.get(k);
      if (bucket) {
        bucket.count += 1;
        bucket.revenue += Number(o.total);
      }
    }
    return days;
  }, [orders]);

  const topProducts = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const it of items) {
      const cur = m.get(it.product_name) ?? { name: it.product_name, qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += Number(it.price) * it.quantity;
      m.set(it.product_name, cur);
    }
    return Array.from(m.values()).sort((a, b) => b.qty - a.qty).slice(0, 5);
  }, [items]);

  return (
    <div className="p-8 md:p-10 max-w-6xl">
      <h1 className="text-3xl font-serif italic">Дашборд</h1>
      <p className="text-muted-foreground mt-1">Сводка по магазину за последние 30 дней</p>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
        <Card icon={ClipboardList} label="Новые заявки" value={stats.newCount} accent />
        <Card icon={TrendingUp} label="Заявок за неделю" value={stats.weekCount} sub={formatPrice(stats.weekRev)} />
        <Card icon={Calendar} label="Средний чек (неделя)" value={formatPrice(stats.avg)} />
        <Card icon={Package} label="Товаров в каталоге" value={productsCount} />
      </div>

      <div className="mt-8 bg-card rounded-3xl p-6">
        <h2 className="font-serif text-xl mb-4">Заявки за последние 14 дней</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="var(--color-muted-foreground)" />
              <Tooltip
                contentStyle={{
                  background: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.75rem",
                }}
                formatter={(v: number) => [v, "Заявок"]}
              />
              <Area type="monotone" dataKey="count" stroke="var(--color-primary)" fill="url(#g1)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-5">
        <div className="bg-card rounded-3xl p-6">
          <h2 className="font-serif text-xl mb-4">Сегодня к доставке</h2>
          {stats.todayDelivery.length === 0 ? (
            <p className="text-sm text-muted-foreground">На сегодня заказов нет</p>
          ) : (
            <ul className="space-y-2">
              {stats.todayDelivery.map((o) => (
                <li key={o.id} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                  <div>
                    <div className="font-medium">{o.customer_name}</div>
                    <div className="text-xs text-muted-foreground">{formatPrice(Number(o.total))}</div>
                  </div>
                  <Link to="/admin/orders" className="text-xs text-primary hover:underline">открыть</Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-card rounded-3xl p-6">
          <h2 className="font-serif text-xl mb-4">Топ товаров (30 дней)</h2>
          {topProducts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Пока нет продаж</p>
          ) : (
            <ul className="space-y-2">
              {topProducts.map((p, i) => (
                <li key={p.name} className="flex justify-between items-center text-sm py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-muted-foreground w-5">{i + 1}.</span>
                    <span className="truncate">{p.name}</span>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <div className="font-medium">{p.qty} шт.</div>
                    <div className="text-xs text-muted-foreground">{formatPrice(p.revenue)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
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
      <div className="text-3xl font-serif italic mt-4">{value}</div>
      <div className={`text-sm mt-1 ${accent ? "opacity-90" : "text-muted-foreground"}`}>{label}</div>
      {sub && <div className={`text-xs mt-2 ${accent ? "opacity-80" : "text-muted-foreground"}`}>{sub}</div>}
    </div>
  );
}
