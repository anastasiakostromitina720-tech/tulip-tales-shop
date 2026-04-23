
Исправлю проблему оформления заказа как ошибку доступа к backend, а не как проблему формы.

### Точная причина

Сейчас на `/cart` заказ отправляется так:

- `src/routes/cart.tsx` делает `insert(...).select("id").single()` в таблицу `orders`
- запрос уходит как публичный пользователь
- в базе есть публичный `INSERT` policy для `orders`, но **нет публичного `SELECT` policy**
- из-за `.select("id")` backend пытается вернуть вставленную строку обратно, и это чтение блокируется RLS

Поэтому в сети видно:
- `POST /orders?select=id`
- `401`
- `new row violates row-level security policy for table "orders"`

Есть и второй скрытый дефект:
- policy для `order_items` проверяет `EXISTS (SELECT 1 FROM public.orders WHERE id = order_id)`
- но анонимный пользователь не может читать `orders`
- значит после первого фикса вставка позиций заказа тоже может падать

### Что будет исправлено

#### 1. Убрать зависимость от чтения заказа после вставки
В `src/routes/cart.tsx`:
- сгенерирую `orderId` на клиенте через `crypto.randomUUID()`
- вставлю заказ с этим `id`
- уберу `.select("id").single()`
- буду использовать уже известный `orderId` при вставке в `order_items`

Это уберёт RLS-конфликт на возврате строки.

#### 2. Исправить backend policy для `order_items`
Через новую миграцию:
- добавлю безопасную `SECURITY DEFINER` функцию вида `public.order_exists(_order_id uuid)`
- она будет проверять существование заказа без упора в публичный `SELECT`
- заменю policy `Anyone can create order items`, чтобы она использовала эту функцию вместо прямого `EXISTS (...) FROM public.orders`

Так позиции заказа смогут добавляться публично, как и задумано.

#### 3. Не открывать публичный доступ к чтению заказов
Публичный `SELECT` для `orders` добавлять не буду.
Админская изоляция сохранится:
- клиент сможет создать заказ
- видеть и редактировать заказы по-прежнему сможет только админка

#### 4. Улучшить обработку ошибок на форме
В `src/routes/cart.tsx`:
- оставлю пользовательский toast
- добавлю более точное ветвление ошибок, чтобы при повторной проблеме сразу было видно: сломалось создание `orders` или `order_items`

### Какие файлы затрону

- `src/routes/cart.tsx`
  - убрать `.select("id").single()`
  - генерировать `orderId` заранее
  - использовать его при вставке `order_items`
  - улучшить обработку ошибок

- `supabase/migrations/...sql`
  - добавить функцию проверки существования заказа
  - заменить `INSERT` policy для `public.order_items`

### Ожидаемый результат после исправления

- кнопка «Оставить заявку» на `/cart` начнёт создавать заказ без логина
- заказ будет сохраняться вместе с товарами
- пользователь попадёт на `/cart/thanks`
- заказ будет виден в админке `/admin/orders`

### Технические детали

Планируемая логика вставки:

```ts
const orderId = crypto.randomUUID()

await supabase.from("orders").insert({
  id: orderId,
  customer_name,
  phone,
  address,
  delivery_date,
  delivery_time,
  comment,
  total,
})

await supabase.from("order_items").insert(
  cart.items.map((item) => ({
    order_id: orderId,
    product_id: item.realProductId ?? item.productId,
    product_name: item.name,
    quantity: item.quantity,
    price: item.price,
  }))
)
```

Идея backend-фикса:
```sql
create or replace function public.order_exists(_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.orders where id = _order_id
  )
$$;
```

Затем policy для `order_items` будет проверять:
- валидное имя товара
- quantity > 0
- price >= 0
- `public.order_exists(order_id)`

