import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "operator";
  content: string;
  created_at: string;
};

type Step = "intro" | "chat";

type ChatContextValue = {
  open: boolean;
  setOpen: (v: boolean) => void;
  step: Step;
  sessionId: string | null;
  messages: ChatMessage[];
  sending: boolean;
  unread: number;
  needsOperator: boolean;
  start: (name: string, phone: string) => Promise<{ error: string | null }>;
  send: (text: string) => Promise<void>;
  requestOperator: () => Promise<void>;
  reset: () => void;
};

const ChatContext = createContext<ChatContextValue | null>(null);
const STORAGE_KEY = "tulips-chat-session-v1";

export function ChatProvider({ children }: { children: ReactNode }) {
  const [open, setOpenState] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const [needsOperator, setNeedsOperator] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;

  // Restore session on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.localStorage.getItem(STORAGE_KEY);
    if (id) setSessionId(id);
  }, []);

  // Load messages + subscribe when session is known
  useEffect(() => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });
      if (!cancelled && data) setMessages(data as ChatMessage[]);

      const { data: s } = await supabase
        .from("chat_sessions")
        .select("needs_operator")
        .eq("id", sessionId)
        .maybeSingle();
      if (!cancelled && s) setNeedsOperator(!!s.needs_operator);
    })();

    const channel = supabase
      .channel(`chat-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const msg = payload.new as ChatMessage;
          setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
          if (!openRef.current && (msg.role === "assistant" || msg.role === "operator")) {
            setUnread((u) => u + 1);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const s = payload.new as { needs_operator: boolean };
          setNeedsOperator(!!s.needs_operator);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [sessionId]);

  const setOpen = useCallback((v: boolean) => {
    setOpenState(v);
    if (v) setUnread(0);
  }, []);

  const start = useCallback<ChatContextValue["start"]>(async (name, phone) => {
    const { data, error } = await supabase
      .from("chat_sessions")
      .insert({ customer_name: name.trim(), phone: phone.trim() })
      .select("id")
      .single();
    if (error || !data) return { error: error?.message ?? "Не удалось начать чат" };
    window.localStorage.setItem(STORAGE_KEY, data.id);
    setSessionId(data.id);
    // Greeting from assistant — saved server-side via first send not needed; insert greeting message via service is not allowed for public.
    // We'll show an inline assistant message stored only in UI, then bot responds after first user message.
    setMessages([
      {
        id: "greet-local",
        role: "assistant",
        content: `Здравствуйте, ${name.trim()}! Я Лиза, флорист «Тюльпаны». Подберу букет под ваш повод и бюджет — расскажите, что нужно?`,
        created_at: new Date().toISOString(),
      },
    ]);
    return { error: null };
  }, []);

  const send = useCallback<ChatContextValue["send"]>(
    async (text) => {
      if (!sessionId || !text.trim()) return;
      setSending(true);
      // Optimistic user message
      const tempId = `tmp-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: tempId, role: "user", content: text.trim(), created_at: new Date().toISOString() },
      ]);
      try {
        const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-bot`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ session_id: sessionId, message: text.trim() }),
        });
        if (!resp.ok) {
          const j = await resp.json().catch(() => ({}));
          setMessages((prev) => [
            ...prev,
            {
              id: `err-${Date.now()}`,
              role: "assistant",
              content: j.error ?? "Не удалось получить ответ. Попробуйте ещё раз.",
              created_at: new Date().toISOString(),
            },
          ]);
        }
        // realtime delivers the persisted messages; remove optimistic temp once a real one arrives
      } catch (e) {
        console.error(e);
      } finally {
        setSending(false);
      }
    },
    [sessionId],
  );

  const requestOperator = useCallback(async () => {
    if (!sessionId) return;
    await supabase.rpc("request_operator", { _session_id: sessionId });
    setNeedsOperator(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `op-${Date.now()}`,
        role: "system",
        content: "Запрос отправлен оператору. Мы свяжемся с вами в ближайшее время.",
        created_at: new Date().toISOString(),
      },
    ]);
  }, [sessionId]);

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setSessionId(null);
    setMessages([]);
    setNeedsOperator(false);
  }, []);

  // Dedup optimistic temps when persisted INSERT arrives
  useEffect(() => {
    setMessages((prev) => {
      // remove temp user message if a same-content user message exists with real id
      const realUserContents = new Set(
        prev.filter((m) => m.role === "user" && !m.id.startsWith("tmp-")).map((m) => m.content),
      );
      return prev.filter((m) => !(m.id.startsWith("tmp-") && realUserContents.has(m.content)));
    });
  }, [messages.length]);

  const step: Step = sessionId ? "chat" : "intro";

  const value = useMemo<ChatContextValue>(
    () => ({ open, setOpen, step, sessionId, messages, sending, unread, needsOperator, start, send, requestOperator, reset }),
    [open, setOpen, step, sessionId, messages, sending, unread, needsOperator, start, send, requestOperator, reset],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChat must be used inside ChatProvider");
  return ctx;
}
