import { useLocation } from "@tanstack/react-router";
import { MessageCircle, X } from "lucide-react";
import { useChat } from "@/lib/chat";
import { ChatPanel } from "./ChatPanel";

export function ChatWidget() {
  const location = useLocation();
  const { open, setOpen, unread } = useChat();

  // Hide on admin pages
  if (location.pathname.startsWith("/admin")) return null;

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        aria-label={open ? "Закрыть чат" : "Открыть чат с флористом"}
        className="fixed bottom-5 right-5 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
      >
        {open ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
        {!open && unread > 0 ? (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full text-[10px] min-w-[20px] h-5 px-1 flex items-center justify-center font-medium">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? <ChatPanel /> : null}
    </>
  );
}
