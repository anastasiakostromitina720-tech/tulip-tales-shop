// Chat bot edge function — talks to Lovable AI Gateway with tool calling
// Tools: create_order, request_operator
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

const tools = [
  {
    type: "function",
    function: {
      name: "create_order",
      description:
        "Оформить заявку на букет. Вызывай ТОЛЬКО когда клиент явно подтвердил итоговый состав и сумму, и сообщил телефон/имя (они уже есть в сессии). Адрес/дата/время — опциональны, но желательно уточнить.",
      parameters: {
        type: "object",
        properties: {
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                product_id: { type: "string", description: "uuid из каталога" },
                product_name: { type: "string" },
                quantity: { type: "integer", minimum: 1 },
                price: { type: "number", minimum: 0, description: "цена за единицу" },
              },
              required: ["product_id", "product_name", "quantity", "price"],
              additionalProperties: false,
            },
          },
          address: { type: "string" },
          delivery_date: { type: "string", description: "YYYY-MM-DD" },
          delivery_time: { type: "string" },
          comment: { type: "string" },
        },
        required: ["items"],
        additionalProperties: false,
      },
    },
  },
  {
    type: "function",
    function: {
      name: "request_operator",
      description: "Позвать живого оператора, когда клиент просит человека или ИИ не справляется.",
      parameters: {
        type: "object",
        properties: { reason: { type: "string" } },
        required: ["reason"],
        additionalProperties: false,
      },
    },
  },
];

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { session_id, message } = await req.json();
    if (!session_id || typeof message !== "string" || message.trim().length === 0) {
      return jsonResp({ error: "Bad request" }, 400);
    }
    if (message.length > 4000) {
      return jsonResp({ error: "Сообщение слишком длинное" }, 400);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Verify session exists
    const { data: session, error: sErr } = await admin
      .from("chat_sessions")
      .select("id, customer_name, phone, status, order_id")
      .eq("id", session_id)
      .maybeSingle();
    if (sErr || !session) return jsonResp({ error: "Сессия не найдена" }, 404);

    // Save the user message (server-side, bypasses RLS but enforces our schema)
    await admin.from("chat_messages").insert({
      session_id,
      role: "user",
      content: message.trim(),
    });
    await admin.rpc("touch_chat_session", { _session_id: session_id });

    // Load history (last 30)
    const { data: history } = await admin
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true })
      .limit(60);

    // Load catalog snapshot (with first image)
    const { data: products } = await admin
      .from("products")
      .select("id, name, price, type, color, stems_count, composition, in_stock, images")
      .eq("active", true)
      .eq("in_stock", true)
      .limit(200);

    const catalogText = (products ?? [])
      .map(
        (p) =>
          `- ${p.name} | id=${p.id} | ${p.type} | ${p.color ?? "-"} | ${
            p.stems_count ?? "-"
          } шт | ${p.price}₽${p.composition ? ` | состав: ${p.composition}` : ""}${
            Array.isArray(p.images) && p.images.length > 0 ? ` | photo=yes` : ` | photo=no`
          }`,
      )
      .join("\n");

    const systemPrompt = `Ты — Лиза, дружелюбный флорист-консультант магазина «Тюльпаны · Москва».
Помогаешь клиенту ${session.customer_name} (тел. ${session.phone}) подобрать готовый букет ИЛИ собрать свой из позиций каталога (особенно тип "by_stem" — поштучно).

Правила:
• Отвечай по-русски, кратко и тепло, как настоящий флорист.
• Уточняй повод, бюджет, цвет.
• Когда клиент собирает свой букет — считай итоговую цену вслух.
• Перед оформлением показывай состав и сумму, попроси подтвердить.
• Когда клиент подтвердил — вызови инструмент create_order с правильными product_id из каталога.
• Если клиент просит человека / жалуется / спрашивает что-то вне твоей компетенции — вызови request_operator.
• НИКОГДА не выдумывай товары. Используй только id из каталога ниже.
• Цены не округляй и не меняй — бери из каталога.

ПОКАЗ ФОТО (ОЧЕНЬ ВАЖНО):
• Когда рекомендуешь конкретный товар — вставляй маркер фото на отдельной строке: [[photo:PRODUCT_ID]] (PRODUCT_ID — id из каталога).
• Можно вставить несколько маркеров подряд для нескольких вариантов.
• Вставляй маркер ТОЛЬКО для товаров с photo=yes.
• ЗАПРЕЩЕНО писать markdown-картинки вида ![текст](url), HTML-теги <img>, ссылки на изображения или любые URL картинок. Никаких выдуманных адресов. Только маркер [[photo:ID]] — фронтенд сам подгрузит фото.
• Пример правильного ответа: «Вот красивый вариант на день рождения:\n[[photo:abc-123]]\nБукет из 25 розовых тюльпанов — 3500₽.»

Актуальный каталог:
${catalogText || "(каталог пуст)"}
${session.order_id ? `\nЗаявка уже оформлена: ${session.order_id}. Помоги, если есть вопросы.` : ""}`;

    const messages = [
      { role: "system", content: systemPrompt },
      ...(history ?? []).map((m) => ({
        role: m.role === "operator" ? "assistant" : m.role,
        content: m.content,
      })),
    ];

    // Call Lovable AI (non-streaming, single round of tool calls)
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        tools,
        tool_choice: "auto",
      }),
    });

    if (aiResp.status === 429) {
      return jsonResp({ error: "Слишком много запросов, попробуйте через минуту." }, 429);
    }
    if (aiResp.status === 402) {
      return jsonResp({ error: "Кредиты исчерпаны. Обратитесь к администратору." }, 402);
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return jsonResp({ error: "Ошибка AI-сервиса" }, 500);
    }

    const aiJson = await aiResp.json();
    const choice = aiJson.choices?.[0];
    const toolCalls = choice?.message?.tool_calls ?? [];

    let assistantText: string = choice?.message?.content ?? "";
    const events: Array<{ type: string; data: unknown }> = [];

    // Execute tool calls
    for (const call of toolCalls) {
      const name = call.function?.name;
      let args: Record<string, unknown> = {};
      try {
        args = JSON.parse(call.function?.arguments ?? "{}");
      } catch {
        args = {};
      }

      if (name === "request_operator") {
        await admin.rpc("request_operator", { _session_id: session_id });
        events.push({ type: "operator_requested", data: { reason: args.reason } });
      } else if (name === "create_order") {
        const items = (args.items as Array<{
          product_id: string;
          product_name: string;
          quantity: number;
          price: number;
        }>) ?? [];
        const total = items.reduce((s, i) => s + Number(i.price) * Number(i.quantity), 0);

        const { data: order, error: oErr } = await admin
          .from("orders")
          .insert({
            customer_name: session.customer_name,
            phone: session.phone,
            address: (args.address as string) || null,
            delivery_date: (args.delivery_date as string) || null,
            delivery_time: (args.delivery_time as string) || null,
            comment: (args.comment as string) || `Оформлено через чат-бот · сессия ${session_id}`,
            total,
          })
          .select("id")
          .single();

        if (oErr || !order) {
          console.error("Order create error", oErr);
          events.push({ type: "order_failed", data: { error: oErr?.message } });
        } else {
          await admin.from("order_items").insert(
            items.map((i) => ({
              order_id: order.id,
              product_id: i.product_id,
              product_name: i.product_name,
              quantity: i.quantity,
              price: i.price,
            })),
          );
          await admin
            .from("chat_sessions")
            .update({ order_id: order.id })
            .eq("id", session_id);
          events.push({ type: "order_created", data: { order_id: order.id, total } });
        }
      }
    }

    // If tools fired but no text, do a follow-up call so model summarises result
    if (toolCalls.length > 0) {
      const followupMessages = [
        ...messages,
        choice.message,
        ...toolCalls.map((c: { id: string; function: { name: string } }) => {
          const ev = events.find((e) =>
            (c.function.name === "create_order" && (e.type === "order_created" || e.type === "order_failed")) ||
            (c.function.name === "request_operator" && e.type === "operator_requested"),
          );
          return {
            role: "tool",
            tool_call_id: c.id,
            content: JSON.stringify(ev?.data ?? { ok: true }),
          };
        }),
      ];
      const f = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: followupMessages }),
      });
      if (f.ok) {
        const fj = await f.json();
        assistantText = fj.choices?.[0]?.message?.content ?? assistantText;
      }
    }

    if (!assistantText) assistantText = "Готово.";

    // Save assistant message
    await admin.from("chat_messages").insert({
      session_id,
      role: "assistant",
      content: assistantText,
    });
    await admin.rpc("touch_chat_session", { _session_id: session_id });

    return jsonResp({ assistant: assistantText, events });
  } catch (e) {
    console.error("chat-bot error", e);
    return jsonResp({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});
