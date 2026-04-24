import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, AlertCircle, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";

export const Route = createFileRoute("/admin/chats")({
  component: AdminChatsPage,
});

type Session = {
  id: string;
  customer_name: string;
  phone: string;
  status: "active" | "ticket" | "closed";
  needs_operator: boolean;
  last_message_at: string;
  created_at: string;
  order_id: string | null;
};

function AdminChatsPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [filter, setFilter] = useState<"all" | "ticket" | "active" | "closed">("all");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("chat_sessions")
        .select("*")
        .order("last_message_at", { ascending: false })
        .limit(200);
      setSessions((data ?? []) as Session[]);
      setLoading(false);
    };
    load();

    const ch = supabase
      .channel("admin-chats")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_sessions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = sessions.filter((s) => {
    if (filter === "ticket" && !(s.status === "ticket" || s.needs_operator)) return false;
    if (filter === "active" && s.status !== "active") return false;
    if (filter === "closed" && s.status !== "closed") return false;
    if (q.trim()) {
      const needle = q.toLowerCase();
      if (!s.customer_name.toLowerCase().includes(needle) && !s.phone.toLowerCase().includes(needle)) return false;
    }
    return true;
  });

  return (
    <div className="p-8 max-w-6xl">
      <h1 className="text-3xl font-serif italic">Чаты</h1>
      <p className="text-sm text-muted-foreground mt-1">Все диалоги клиентов с ИИ-флористом и заявки оператору.</p>

      <div className="mt-6 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Поиск по имени или телефону"
            className="input pl-9"
          />
        </div>
        <div className="flex gap-1 bg-muted rounded-full p-1">
          {[
            { id: "all", label: "Все" },
            { id: "ticket", label: "Тикеты" },
            { id: "active", label: "Активные" },
            { id: "closed", label: "Закрытые" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setFilter(t.id as typeof filter)}
              className={`px-3 py-1.5 rounded-full text-xs ${
                filter === t.id ? "bg-background shadow text-foreground" : "text-muted-foreground"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-card rounded-2xl border border-border overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Загрузка...</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">Пока нет чатов</div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((s) => (
              <li key={s.id}>
                <Link
                  to="/admin/chats/$id"
                  params={{ id: s.id }}
                  className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{s.customer_name}</span>
                      <span className="text-xs text-muted-foreground">{s.phone}</span>
                      {s.needs_operator ? (
                        <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                          <AlertCircle className="h-3 w-3" /> нужен оператор
                        </span>
                      ) : null}
                      {s.order_id ? (
                        <span className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          оформлена заявка
                        </span>
                      ) : null}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {formatDistanceToNow(new Date(s.last_message_at), { locale: ru, addSuffix: true })}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    s.status === "ticket" ? "bg-destructive/10 text-destructive" :
                    s.status === "closed" ? "bg-muted text-muted-foreground" :
                    "bg-primary/10 text-primary"
                  }`}>
                    {s.status === "ticket" ? "Тикет" : s.status === "closed" ? "Закрыт" : "Активен"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
