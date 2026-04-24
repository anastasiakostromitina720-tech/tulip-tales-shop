## Чат-бот «Помощник по букетам» с переходом на оператора

Добавлю плавающую кнопку в правом нижнем углу сайта. По клику открывается окно чата: сначала пользователь оставляет имя + телефон и принимает политику, затем общается с ИИ. ИИ знает каталог и может: подобрать готовый букет, собрать букет из доступных цветов (поштучно), посчитать стоимость, оформить заявку. Если пользователь просит человека или ИИ не справляется — создаётся тикет, видимый в админке. Все диалоги (даже без тикета) тоже доступны админу.

---

### 1. Backend — новые таблицы (миграция)

**`chat_sessions`** — один ряд на каждый открытый чат
- `id uuid pk`, `created_at`, `updated_at`
- `customer_name text`, `phone text` (валидация по длине как в orders)
- `consent_at timestamptz` — момент принятия политики
- `status` enum `chat_status` (`active` | `ticket` | `closed`)
- `needs_operator boolean default false`
- `last_message_at timestamptz`
- `order_id uuid` — если из чата оформлена заявка

**`chat_messages`**
- `id uuid pk`, `session_id uuid fk → chat_sessions`
- `role` enum `chat_role` (`user` | `assistant` | `system` | `operator`)
- `content text` (макс. 4000)
- `created_at`

**RLS:**
- `chat_sessions` / `chat_messages`: `INSERT` доступен публике с валидацией длин и `chat_session_exists()` (security definer, по аналогии с `order_exists`); `SELECT/UPDATE/DELETE` — только админам через `has_role`. Для UPDATE сессии публикой разрешим узкий случай: проставить `needs_operator=true` и `last_message_at` (через rpc `request_operator(session_id)` security definer — безопаснее, чем UPDATE policy).
- Realtime включён для обеих таблиц (`alter publication supabase_realtime add table ...`).

### 2. Edge Function `chat-bot` (Lovable AI)

Новая функция `supabase/functions/chat-bot/index.ts`:
- Принимает `{ session_id, message }`.
- Загружает сессию + последние ~30 сообщений + актуальный каталог (`products` где `active=true, in_stock=true` — id, name, price, type, color, stems_count, composition).
- Системный промпт: «Ты — флорист-консультант магазина “Тюльпаны”. Помогай выбрать готовый букет или собрать свой из доступных позиций (тип `by_stem`). Считай итог, уточняй адрес/дату/время. При запросе человека вызови `request_operator`. Когда клиент согласился — вызови `create_order`. Отвечай по-русски, кратко.»
- Использует Lovable AI Gateway (`google/gemini-3-flash-preview`) с **tool calling**:
  - `create_order({ items:[{product_id, quantity, price, name}], address?, delivery_date?, delivery_time?, comment? })` → INSERT в `orders` + `order_items` (через service role), привязка `order_id` к сессии, возврат id.
  - `request_operator({ reason })` → ставит `needs_operator=true`, `status='ticket'`.
- Стримит ответ (SSE) обратно клиенту, после завершения сохраняет ответ в `chat_messages`.
- Сообщение пользователя сохраняется до запроса в gateway.
- Обработка 429/402 с понятными сообщениями.

`supabase/config.toml` — для функции `chat-bot` `verify_jwt = false` (публичный чат).

### 3. Frontend — виджет чата

Новые файлы:
- `src/components/chat/ChatWidget.tsx` — плавающая кнопка (round, bottom-right, `fixed`, иконка `MessageCircle`), бейдж непрочитанных от оператора. Скрывается на путях `/admin*`.
- `src/components/chat/ChatPanel.tsx` — выезжающее окно (мобильно — fullscreen sheet, desktop — карточка ~380×560, скруглённая, в фирменном стиле). Внутри:
  - **Шаг 1 — знакомство:** форма имя/телефон + чекбокс «согласен с [политикой](/privacy)». Валидация zod.
  - **Шаг 2 — чат:** список сообщений (markdown через `react-markdown`), поле ввода, кнопка «Позвать оператора», стрим ответов токен-за-токеном.
  - При успешном `create_order` — ассистент показывает «Заявка #… принята», кнопка «В корзину»/«На главную», сессия помечается.
- `src/lib/chat.tsx` — контекст: `sessionId` в `localStorage` (`tulips-chat-v1`), методы `start(name, phone)`, `send(text)`, `requestOperator()`, подписка на realtime новых сообщений (для ответов оператора).
- Подключить `<ChatWidget />` в `SiteLayout`.

### 4. Админка — новый раздел «Чаты»

- Новый роут `src/routes/admin.chats.tsx` — список сессий (поиск по имени/телефону, фильтр «нужен оператор / тикеты / все»), realtime обновление, бейдж в сайдбаре считает `status='ticket'` или `needs_operator=true`.
- `src/routes/admin.chats.$id.tsx` — открытый диалог: история сообщений, поле для ответа от лица оператора (`role='operator'`), кнопки «Закрыть тикет», «Отметить решённым», «Открыть связанную заявку».
- Обновить `admin.tsx`: добавить пункт навигации «Чаты» с бейджем + realtime-подписку.

### 5. Безопасность и UX

- Телефон/имя валидируются на клиенте (zod) и в RLS (длины) — те же лимиты, что для `orders`.
- Согласие с политикой обязательно до запуска чата; `consent_at` сохраняется.
- Rate limit на стороне edge: не больше 1 сообщения в секунду на сессию (простая проверка по `last_message_at`).
- `ChatWidget` не показывается на `/admin*` и на `/cart/thanks`.
- Тёмная тема — наследуется от существующих токенов.

### Итог изменений

**Новые файлы**
- `supabase/migrations/<ts>_chat.sql` — таблицы, enums, RLS, rpc, realtime
- `supabase/functions/chat-bot/index.ts`
- `src/components/chat/ChatWidget.tsx`, `ChatPanel.tsx`
- `src/lib/chat.tsx`
- `src/routes/admin.chats.tsx`, `src/routes/admin.chats.$id.tsx`

**Правки**
- `src/components/SiteLayout.tsx` — монтирование виджета
- `src/routes/admin.tsx` — пункт меню «Чаты» + бейдж
- `supabase/config.toml` — секция функции `chat-bot`

После одобрения — реализую всё одним пакетом.