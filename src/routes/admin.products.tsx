import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, Copy, Search, Eye, EyeOff } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, resolveImage, colorLabels, typeLabels } from "@/lib/products";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type Product = {
  id: string;
  name: string;
  description: string | null;
  composition: string | null;
  price: number;
  type: "bouquet" | "by_stem";
  color: string | null;
  stems_count: number | null;
  images: string[];
  in_stock: boolean;
  active: boolean;
  created_at?: string;
};

const empty: Omit<Product, "id"> = {
  name: "", description: "", composition: "", price: 0,
  type: "bouquet", color: "pink", stems_count: null, images: [],
  in_stock: true, active: true,
};

type SortKey = "new" | "name" | "price_asc" | "price_desc";

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | (Omit<Product, "id"> & { id?: string }) | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Product | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "bouquet" | "by_stem">("all");
  const [colorFilter, setColorFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "hidden" | "out">("all");
  const [sort, setSort] = useState<SortKey>("new");

  async function load() {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts((data as Product[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function remove(p: Product) {
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) return toast.error(error.message);
    toast.success("Товар удалён");
    setConfirmDelete(null);
    load();
  }

  async function quickToggle(p: Product, field: "in_stock" | "active") {
    const patch = field === "in_stock" ? { in_stock: !p.in_stock } : { active: !p.active };
    const { error } = await supabase.from("products").update(patch).eq("id", p.id);
    if (error) return toast.error(error.message);
    setProducts((arr) => arr.map((x) => (x.id === p.id ? { ...x, [field]: !x[field] } : x)));
  }

  function duplicate(p: Product) {
    const { id, created_at, ...rest } = p;
    void id; void created_at;
    setEditing({ ...rest, name: `${p.name} (копия)` });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let arr = products.filter((p) => {
      if (q && !p.name.toLowerCase().includes(q)) return false;
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (colorFilter !== "all" && p.color !== colorFilter) return false;
      if (statusFilter === "active" && !p.active) return false;
      if (statusFilter === "hidden" && p.active) return false;
      if (statusFilter === "out" && p.in_stock) return false;
      return true;
    });
    if (sort === "name") arr = [...arr].sort((a, b) => a.name.localeCompare(b.name, "ru"));
    if (sort === "price_asc") arr = [...arr].sort((a, b) => Number(a.price) - Number(b.price));
    if (sort === "price_desc") arr = [...arr].sort((a, b) => Number(b.price) - Number(a.price));
    return arr;
  }, [products, search, typeFilter, colorFilter, statusFilter, sort]);

  return (
    <div className="p-8 md:p-10">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-serif italic">Товары</h1>
          <p className="text-muted-foreground mt-1">Управление каталогом · {filtered.length} из {products.length}</p>
        </div>
        <button
          onClick={() => setEditing({ ...empty })}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Добавить товар
        </button>
      </div>

      {/* Filters */}
      <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_auto_auto_auto]">
        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            className="input pl-9"
            placeholder="Поиск по названию"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}>
          <option value="all">Все типы</option>
          <option value="bouquet">Букеты</option>
          <option value="by_stem">Поштучно</option>
        </select>
        <select className="input" value={colorFilter} onChange={(e) => setColorFilter(e.target.value)}>
          <option value="all">Все цвета</option>
          {Object.entries(colorLabels).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select className="input" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}>
          <option value="all">Все</option>
          <option value="active">Активные</option>
          <option value="hidden">Скрытые</option>
          <option value="out">Нет в наличии</option>
        </select>
        <select className="input" value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>
          <option value="new">Новые</option>
          <option value="name">По названию</option>
          <option value="price_asc">Цена ↑</option>
          <option value="price_desc">Цена ↓</option>
        </select>
      </div>

      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 && (
          <div className="col-span-full text-center text-muted-foreground py-16 bg-card rounded-3xl">
            Ничего не найдено
          </div>
        )}
        {filtered.map((p) => (
          <div key={p.id} className="bg-card rounded-3xl overflow-hidden">
            <div className="aspect-[5/4] bg-muted relative">
              <img src={resolveImage(p.images?.[0])} alt={p.name} className="h-full w-full object-cover" />
              <div className="absolute top-3 right-3 flex flex-col gap-1.5">
                <button
                  onClick={() => quickToggle(p, "active")}
                  className="bg-background/90 backdrop-blur rounded-full px-2.5 py-1 text-xs flex items-center gap-1.5"
                  title={p.active ? "Скрыть" : "Показать"}
                >
                  {p.active ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
                  {p.active ? "видно" : "скрыт"}
                </button>
                <button
                  onClick={() => quickToggle(p, "in_stock")}
                  className={`backdrop-blur rounded-full px-2.5 py-1 text-xs ${
                    p.in_stock ? "bg-background/90" : "bg-destructive/90 text-destructive-foreground"
                  }`}
                >
                  {p.in_stock ? "в наличии" : "нет"}
                </button>
              </div>
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="font-serif text-xl truncate">{p.name}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {typeLabels[p.type]} · {formatPrice(Number(p.price))}
                    {p.color && ` · ${colorLabels[p.color] ?? p.color}`}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => duplicate(p)} className="p-2 hover:bg-muted rounded-full" aria-label="Дублировать" title="Дублировать">
                    <Copy className="h-4 w-4" />
                  </button>
                  <button onClick={() => setEditing(p)} className="p-2 hover:bg-muted rounded-full" aria-label="Редактировать" title="Редактировать">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => setConfirmDelete(p)} className="p-2 hover:bg-muted rounded-full text-destructive" aria-label="Удалить" title="Удалить">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <ProductDrawer
          initial={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить товар?</AlertDialogTitle>
            <AlertDialogDescription>
              Товар «{confirmDelete?.name}» будет удалён без возможности восстановления.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDelete && remove(confirmDelete)} className="bg-destructive hover:bg-destructive/90">
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ProductDrawer({
  initial, onClose, onSaved,
}: {
  initial: Product | (Omit<Product, "id"> & { id?: string });
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || form.price < 0) {
      toast.error("Заполните название и цену");
      return;
    }
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || null,
      composition: form.composition || null,
      price: Number(form.price),
      type: form.type,
      color: form.color || null,
      stems_count: form.stems_count ? Number(form.stems_count) : null,
      images: form.images ?? [],
      in_stock: form.in_stock,
      active: form.active,
    };
    const { error } = "id" in form && form.id
      ? await supabase.from("products").update(payload).eq("id", form.id)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Сохранено");
    onSaved();
  }

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent
        side="right"
        className="flex h-[100dvh] w-screen max-w-none flex-col overflow-hidden p-0 sm:w-[42rem] sm:max-w-[42rem]"
      >
        <form onSubmit={save} className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="flex shrink-0 items-start justify-between border-b border-border bg-background px-4 py-4 sm:px-6 sm:py-5">
            <h2 className="text-2xl font-serif italic">{"id" in form && form.id ? "Редактировать" : "Новый товар"}</h2>
            <button type="button" onClick={onClose} className="p-2 hover:bg-muted rounded-full" aria-label="Закрыть"><X className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            <div className="space-y-4 pb-6">
              <FormField l="Название">
                <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={200} />
              </FormField>
              <FormField l="Описание">
                <textarea className="input min-h-[80px]" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} />
              </FormField>
              <FormField l="Состав">
                <input className="input" value={form.composition ?? ""} onChange={(e) => setForm({ ...form, composition: e.target.value })} maxLength={500} />
              </FormField>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <FormField l="Цена, ₽">
                  <input type="number" min={0} className="input" value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} required />
                </FormField>
                <FormField l="Кол-во стеблей">
                  <input type="number" min={0} className="input" value={form.stems_count ?? ""} onChange={(e) => setForm({ ...form, stems_count: e.target.value ? Number(e.target.value) : null })} />
                </FormField>
                <FormField l="Тип">
                  <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as Product["type"] })}>
                    <option value="bouquet">Букет</option>
                    <option value="by_stem">Поштучно</option>
                  </select>
                </FormField>
                <FormField l="Цвет">
                  <select className="input" value={form.color ?? "pink"} onChange={(e) => setForm({ ...form, color: e.target.value })}>
                    {Object.entries(colorLabels).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField l="Фотографии">
                <ImageUploader
                  images={form.images ?? []}
                  onChange={(images) => setForm((f) => ({ ...f, images }))}
                />
              </FormField>

              <div className="flex flex-wrap gap-x-6 gap-y-3 pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.in_stock} onChange={(e) => setForm({ ...form, in_stock: e.target.checked })} />
                  В наличии
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
                  Показывать на сайте
                </label>
              </div>
            </div>
          </div>

          <div className="shrink-0 border-t border-border bg-background px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-5">
            <button type="submit" disabled={saving} className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50">
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function FormField({ l, children }: { l: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1.5">{l}</div>
      {children}
    </label>
  );
}
