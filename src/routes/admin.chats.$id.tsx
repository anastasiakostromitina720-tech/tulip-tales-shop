import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, CheckCircle2, XCircle, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageContent } from "@/components/chat/MessageContent";

export const Route = createFileRoute("/admin/chats/$id")({
  component: AdminChatDetail,
});

type Session = {
  id: string;
  customer_name: string;
  phone: string;
  status: "active" | "ticket" | "closed";
  needs_operator: boolean;
  order_id: string | null;
  admin_notes: string | null;
};

type Message = {
  id: string;
  role: "user" | "assistant" | "system" | "operator";
  content: string;
  created_at: string;
};

function AdminChatDetail() {
  const { id } = Route.useParams();
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: s } = await supabase.from("chat_sessions").select("*").eq("id", id).maybeSingle();
      setSession(s as Session | null);
      const { data: msgs } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", id)
        .order("created_at", { ascending: true });
      setMessages((msgs ?? []) as Message[]);
    };
    load();

    const ch = supabase
      .channel(`admin-chat-${id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${id}` },
        (p) => setMessages((prev) => [...prev, p.new as Message]),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_sessions", filter: `id=eq.${id}` },
        (p) => setSession(p.new as Session),
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || sending) return;
    setSending(true);
    const { error } = await supabase.from("chat_messages").insert({
      session_id: id,
      role: "operator",
      content: reply.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Не удалось отправить");
      return;
    }
    setReply("");
    await supabase.from("chat_sessions").update({ needs_operator: false }).eq("id", id);
  }

  async function setStatus(status: "active" | "ticket" | "closed") {
    const { error } = await supabase
      .from("chat_sessions")
      .update({ status, needs_operator: status === "ticket" })
      .eq("id", id);
    if (error) toast.error("Не удалось обновить статус");
    else toast.success("Статус обновлён");
  }

  if (!session) {
    return <div className="p-8 text-muted-foreground">Загрузка...</div>;
  }

  return (
    <div className="flex flex-col h-screen">
      <header className="px-6 py-4 border-b border-border bg-card flex items-center gap-4">
        <Link to="/admin/chats" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1 min-w-0">
          <div className="font-medium truncate">{session.customer_name}</div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Phone className="h-3 w-3" />
            <a href={`tel:${session.phone}`} className="hover:underline">{session.phone}</a>
            {session.order_id ? <span className="ml-2 text-primary">· заявка #{session.order_id.slice(0, 8)}</span> : null}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setStatus("closed")}
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70"
          >
            <CheckCircle2 className="h-3.5 w-3.5" /> Закрыть
          </button>
          {session.status === "closed" ? (
            <button
              onClick={() => setStatus("active")}
              className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-muted hover:bg-muted/70"
            >
              <XCircle className="h-3.5 w-3.5" /> Открыть
            </button>
          ) : null}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3 bg-background">
        {messages.map((m) => {
          if (m.role === "system") {
            return (
              <div key={m.id} className="text-center text-xs text-muted-foreground italic">
                {m.content}
              </div>
            );
          }
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={`flex ${isUser ? "justify-start" : "justify-end"}`}>
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm break-words ${
                  isUser
                    ? "bg-card border border-border"
                    : m.role === "operator"
                      ? "bg-accent text-accent-foreground"
                      : "bg-primary/10 text-foreground"
                }`}
              >
                <div className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">
                  {m.role === "user" ? session.customer_name : m.role === "operator" ? "Оператор" : "Лиза (ИИ)"}
                </div>
                {m.role === "assistant" ? (
                  <MessageContent content={m.content} linkProducts={false} />
                ) : (
                  <span className="whitespace-pre-wrap break-words">{m.content}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="p-4 border-t border-border bg-card flex gap-2">
        <input
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Ответить от лица оператора..."
          className="input flex-1"
          disabled={sending}
          maxLength={4000}
        />
        <button
          type="submit"
          disabled={sending || !reply.trim()}
          className="h-9 px-4 rounded-full bg-primary text-primary-foreground inline-flex items-center gap-2 disabled:opacity-50"
        >
          <Send className="h-4 w-4" /> Отправить
        </button>
      </form>
    </div>
  );
}
