import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/products";
import { toast } from "sonner";
import { X, Search, Download, Copy as CopyIcon, Phone } from "lucide-react";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type Order = {
  id: string;
  customer_name: string;
  phone: string;
  address: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  comment: string | null;
  total: number;
  status: "new" | "in_progress" | "completed" | "cancelled";
  admin_notes: string | null;
  created_at: string;
};

type OrderItem = {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
};

const statusLabels: Record<Order["status"], string> = {
  new: "Новая",
  in_progress: "В работе",
  completed: "Выполнена",
  cancelled: "Отменена",
};

const statusColors: Record<Order["status"], string> = {
  new: "bg-primary/10 text-primary",
  in_progress: "bg-chart-3/20 text-chart-3",
  completed: "bg-chart-2/20 text-chart-2",
  cancelled: "bg-muted text-muted-foreground",
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"all" | Order["status"]>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "tomorrow">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);

  async function load() {
    const { data } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    setOrders((data as Order[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-orders")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => [payload.new as Order, ...prev]);
        toast.success(`Новая заявка от ${(payload.new as Order).customer_name}`);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => prev.map((o) => (o.id === (payload.new as Order).id ? (payload.new as Order) : o)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "orders" }, (payload) => {
        setOrders((prev) => prev.filter((o) => o.id !== (payload.old as { id: string }).id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!selected) return;
    supabase.from("order_items").select("*").eq("order_id", selected.id).then(({ data }) => {
      setItems((data as OrderItem[]) ?? []);
    });
  }, [selected]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (dateFilter === "today" && o.delivery_date !== todayISO()) return false;
      if (dateFilter === "tomorrow" && o.delivery_date !== tomorrowISO()) return false;
      if (q && !`${o.customer_name} ${o.phone}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [orders, filter, dateFilter, search]);

  async function updateStatus(id: string, status: Order["status"]) {
    const { error } = await supabase.from("orders").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Статус обновлён");
    setSelected((s) => (s ? { ...s, status } : s));
  }

  async function updateNotes(id: string, admin_notes: string) {
    const { error } = await supabase.from("orders").update({ admin_notes }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Заметка сохранена");
  }

  function exportCSV() {
    const headers = ["Дата", "Клиент", "Телефон", "Адрес", "Доставка", "Время", "Комментарий", "Сумма", "Статус"];
    const rows = filtered.map((o) => [
      new Date(o.created_at).toLocaleString("ru-RU"),
      o.customer_name,
      o.phone,
      o.address ?? "",
      o.delivery_date ?? "",
      o.delivery_time ?? "",
      o.comment ?? "",
      String(o.total),
      statusLabels[o.status],
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${todayISO()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 md:p-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-serif italic">Заявки</h1>
          <p className="text-muted-foreground mt-1">Все заявки клиентов · {filtered.length} из {orders.length}</p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-primary"
        >
          <Download className="h-4 w-4" /> Экспорт CSV
        </button>
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto]">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input pl-9"
            placeholder="Поиск по имени или телефону"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={dateFilter} onChange={(e) => setDateFilter(e.target.value as typeof dateFilter)}>
          <option value="all">Все даты</option>
          <option value="today">Доставка сегодня</option>
          <option value="tomorrow">Доставка завтра</option>
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["all", "new", "in_progress", "completed", "cancelled"] as const).map((s) => {
          const count = s === "all" ? orders.length : orders.filter((o) => o.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-1.5 rounded-full text-sm border ${
                filter === s ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {s === "all" ? "Все" : statusLabels[s]} <span className="opacity-60">· {count}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-6 bg-card rounded-3xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="text-left p-4">Дата</th>
              <th className="text-left p-4">Клиент</th>
              <th className="text-left p-4">Телефон</th>
              <th className="text-left p-4">Доставка</th>
              <th className="text-left p-4">Сумма</th>
              <th className="text-left p-4">Статус</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="p-10 text-center text-muted-foreground">Заявок нет</td></tr>
            )}
            {filtered.map((o) => (
              <tr key={o.id} onClick={() => setSelected(o)} className="border-t border-border hover:bg-muted/40 cursor-pointer">
                <td className="p-4 whitespace-nowrap">{new Date(o.created_at).toLocaleString("ru-RU")}</td>
                <td className="p-4 font-medium">{o.customer_name}</td>
                <td className="p-4">{o.phone}</td>
                <td className="p-4 text-muted-foreground">{o.delivery_date ?? "—"} {o.delivery_time ?? ""}</td>
                <td className="p-4">{formatPrice(Number(o.total))}</td>
                <td className="p-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs ${statusColors[o.status]}`}>
                    {statusLabels[o.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <OrderDrawer
          order={selected}
          items={items}
          onClose={() => setSelected(null)}
          onStatus={(s) => updateStatus(selected.id, s)}
          onNotes={(n) => updateNotes(selected.id, n)}
        />
      )}
    </div>
  );
}

function OrderDrawer({
  order, items, onClose, onStatus, onNotes,
}: {
  order: Order; items: OrderItem[]; onClose: () => void;
  onStatus: (s: Order["status"]) => void; onNotes: (n: string) => void;
}) {
  const [notes, setNotes] = useState(order.admin_notes ?? "");

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => toast.success(`${label} скопирован`));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end" onClick={onClose}>
      <div className="bg-background w-full max-w-xl h-full overflow-y-auto p-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-serif italic">Заявка</h2>
            <p className="text-xs text-muted-foreground mt-1">{new Date(order.created_at).toLocaleString("ru-RU")}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-muted rounded-full"><X className="h-4 w-4" /></button>
        </div>

        <div className="mt-6 space-y-4">
          <Field l="Клиент" v={order.customer_name} />
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Телефон</div>
            <div className="text-sm mt-1 flex items-center gap-2">
              <a href={`tel:${order.phone}`} className="text-primary hover:underline">{order.phone}</a>
              <button onClick={() => copy(order.phone, "Телефон")} className="p-1 hover:bg-muted rounded"><CopyIcon className="h-3 w-3" /></button>
              <a href={`tel:${order.phone}`} className="p-1 hover:bg-muted rounded"><Phone className="h-3 w-3" /></a>
            </div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wider text-muted-foreground">Адрес</div>
            <div className="text-sm mt-1 flex items-start gap-2">
              <span className="flex-1">{order.address ?? "—"}</span>
              {order.address && (
                <button onClick={() => copy(order.address!, "Адрес")} className="p-1 hover:bg-muted rounded shrink-0"><CopyIcon className="h-3 w-3" /></button>
              )}
            </div>
          </div>
          <Field l="Дата доставки" v={order.delivery_date ?? "—"} />
          <Field l="Время" v={order.delivery_time ?? "—"} />
          <Field l="Комментарий" v={order.comment ?? "—"} />
        </div>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Состав</div>
          <div className="bg-card rounded-2xl p-4 space-y-2">
            {items.map((i) => (
              <div key={i.id} className="flex justify-between text-sm">
                <span>{i.product_name} × {i.quantity}</span>
                <span className="font-medium">{formatPrice(Number(i.price) * i.quantity)}</span>
              </div>
            ))}
            <div className="border-t border-border pt-2 mt-2 flex justify-between font-medium">
              <span>Итого</span>
              <span>{formatPrice(Number(order.total))}</span>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Статус</div>
          <div className="flex flex-wrap gap-2">
            {(["new", "in_progress", "completed", "cancelled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => onStatus(s)}
                className={`px-4 py-2 rounded-full text-sm border ${
                  order.status === s ? "bg-primary text-primary-foreground border-primary" : "border-border hover:border-primary"
                }`}
              >
                {statusLabels[s]}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Заметки</div>
          <textarea
            className="input min-h-[100px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onNotes(notes)}
          />
        </div>
      </div>
    </div>
  );
}

function Field({ l, v }: { l: string; v: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{l}</div>
      <div className="text-sm mt-1">{v}</div>
    </div>
  );
}
