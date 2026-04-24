import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Send, UserRound, Loader2, RefreshCw } from "lucide-react";
import { z } from "zod";
import { useChat } from "@/lib/chat";

const introSchema = z.object({
  name: z.string().trim().min(2, "Укажите имя").max(100),
  phone: z.string().trim().min(5, "Укажите телефон").max(30),
  consent: z.literal(true, { errorMap: () => ({ message: "Нужно согласие" }) }),
});

export function ChatPanel() {
  const chat = useChat();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [introError, setIntroError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [starting, setStarting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [chat.messages, chat.sending]);

  async function handleStart(e: React.FormEvent) {
    e.preventDefault();
    setIntroError(null);
    const parsed = introSchema.safeParse({ name, phone, consent });
    if (!parsed.success) {
      setIntroError(parsed.error.issues[0]?.message ?? "Проверьте данные");
      return;
    }
    setStarting(true);
    const { error } = await chat.start(name, phone);
    setStarting(false);
    if (error) setIntroError("Не удалось начать чат. Попробуйте ещё раз.");
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t || chat.sending) return;
    setText("");
    await chat.send(t);
  }

  return (
    <div className="fixed z-50 inset-0 sm:inset-auto sm:bottom-24 sm:right-5 sm:w-[380px] sm:h-[560px] flex flex-col bg-card sm:rounded-3xl shadow-2xl border border-border overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-primary/5 flex items-center justify-between">
        <div>
          <div className="font-serif text-lg italic">Лиза, флорист</div>
          <div className="text-xs text-muted-foreground">
            {chat.needsOperator ? "Передано оператору · скоро ответим" : "Подберу букет за пару минут"}
          </div>
        </div>
        {chat.sessionId ? (
          <button
            onClick={chat.reset}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-lg"
            aria-label="Начать новый чат"
            title="Начать новый чат"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {chat.step === "intro" ? (
        <form onSubmit={handleStart} className="flex-1 overflow-y-auto p-5 space-y-4">
          <p className="text-sm text-muted-foreground">
            Привет! Чтобы начать чат и оформить заявку, оставьте имя и телефон — менеджер подключится, если понадобится.
          </p>
          <Field label="Ваше имя">
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="Анна"
              required
            />
          </Field>
          <Field label="Телефон">
            <input
              className="input"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              maxLength={30}
              placeholder="+7 (___) ___-__-__"
              required
            />
          </Field>
          <label className="flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Согласен(на) с{" "}
              <Link to="/privacy" className="underline" target="_blank">
                политикой конфиденциальности
              </Link>{" "}
              и обработкой данных.
            </span>
          </label>
          {introError ? <div className="text-xs text-destructive">{introError}</div> : null}
          <button
            type="submit"
            disabled={starting}
            className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50"
          >
            {starting ? "Запускаем..." : "Начать чат"}
          </button>
        </form>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {chat.messages.map((m) => (
              <MessageBubble key={m.id} role={m.role} content={m.content} />
            ))}
            {chat.sending ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground px-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Лиза печатает...
              </div>
            ) : null}
          </div>

          <div className="border-t border-border p-3 space-y-2">
            {!chat.needsOperator ? (
              <button
                onClick={chat.requestOperator}
                className="w-full text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1.5 py-1"
              >
                <UserRound className="h-3.5 w-3.5" /> Позвать оператора
              </button>
            ) : null}
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Напишите сообщение..."
                maxLength={4000}
                className="input flex-1"
                disabled={chat.sending}
              />
              <button
                type="submit"
                disabled={chat.sending || !text.trim()}
                className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50"
                aria-label="Отправить"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}

function MessageBubble({ role, content }: { role: string; content: string }) {
  if (role === "system") {
    return (
      <div className="text-center text-xs text-muted-foreground italic px-3 py-1.5 bg-muted/50 rounded-full mx-auto w-fit max-w-full">
        {content}
      </div>
    );
  }
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-md"
            : role === "operator"
              ? "bg-accent text-accent-foreground rounded-bl-md"
              : "bg-muted text-foreground rounded-bl-md"
        }`}
      >
        {role === "operator" ? <div className="text-[10px] uppercase tracking-wider opacity-70 mb-0.5">Оператор</div> : null}
        {content}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{label}</div>
      {children}
    </label>
  );
}
