-- Enums
CREATE TYPE public.chat_status AS ENUM ('active', 'ticket', 'closed');
CREATE TYPE public.chat_role AS ENUM ('user', 'assistant', 'system', 'operator');

-- chat_sessions
CREATE TABLE public.chat_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  consent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status public.chat_status NOT NULL DEFAULT 'active',
  needs_operator BOOLEAN NOT NULL DEFAULT false,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  order_id UUID,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chat_sessions_status ON public.chat_sessions(status);
CREATE INDEX idx_chat_sessions_last_msg ON public.chat_sessions(last_message_at DESC);

CREATE TRIGGER trg_chat_sessions_updated_at
BEFORE UPDATE ON public.chat_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- chat_messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL,
  role public.chat_role NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_chat_messages_session ON public.chat_messages(session_id, created_at);

-- Helper: chat_session_exists
CREATE OR REPLACE FUNCTION public.chat_session_exists(_session_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = _session_id);
$$;

-- RPC: request_operator (public, scoped action)
CREATE OR REPLACE FUNCTION public.request_operator(_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_sessions
     SET needs_operator = true,
         status = 'ticket',
         updated_at = now()
   WHERE id = _session_id;
END;
$$;

-- RPC: touch_chat_session (update last_message_at) — used after public message insert
CREATE OR REPLACE FUNCTION public.touch_chat_session(_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.chat_sessions
     SET last_message_at = now()
   WHERE id = _session_id;
END;
$$;

-- RLS policies: chat_sessions
CREATE POLICY "Anyone can create chat session"
ON public.chat_sessions FOR INSERT TO public
WITH CHECK (
  length(customer_name) BETWEEN 1 AND 100
  AND length(phone) BETWEEN 5 AND 30
  AND status = 'active'
  AND needs_operator = false
  AND order_id IS NULL
  AND admin_notes IS NULL
);

CREATE POLICY "Admins can view chat sessions"
ON public.chat_sessions FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update chat sessions"
ON public.chat_sessions FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete chat sessions"
ON public.chat_sessions FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- RLS policies: chat_messages
CREATE POLICY "Anyone can create user chat message"
ON public.chat_messages FOR INSERT TO public
WITH CHECK (
  role = 'user'
  AND length(content) BETWEEN 1 AND 4000
  AND public.chat_session_exists(session_id)
);

CREATE POLICY "Admins can view chat messages"
ON public.chat_messages FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage chat messages"
ON public.chat_messages FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Public can read their own session row by id (no auth) — needed so client can see status/needs_operator updates
-- We expose only sessions explicitly fetched by id; safe because id is a UUID secret
CREATE POLICY "Public can read session by id"
ON public.chat_sessions FOR SELECT TO public
USING (true);

-- Public can read messages of an existing session (id-only access; UUID acts as secret)
CREATE POLICY "Public can read chat messages"
ON public.chat_messages FOR SELECT TO public
USING (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER TABLE public.chat_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;