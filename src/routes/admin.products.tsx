import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Plus, Pencil, Trash2, X, Upload } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice, resolveImage } from "@/lib/products";
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
};

const empty: Omit<Product, "id"> = {
  name: "", description: "", composition: "", price: 0,
  type: "bouquet", color: "pink", stems_count: null, images: [],
  in_stock: true, active: true,
};

function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [editing, setEditing] = useState<Product | (Omit<Product, "id"> & { id?: string }) | null>(null);

  async function load() {
    const { data } = await supabase.from("products").select("*").order("created_at", { ascending: false });
    setProducts((data as Product[]) ?? []);
  }

  useEffect(() => { load(); }, []);

  async function remove(id: string) {
    if (!confirm("Удалить товар?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Товар удалён");
    load();
  }

  return (
    <div className="p-8 md:p-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif italic">Товары</h1>
          <p className="text-muted-foreground mt-1">Управление каталогом</p>
        </div>
        <button
          onClick={() => setEditing({ ...empty })}
          className="inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground px-5 py-2.5 text-sm hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Добавить товар
        </button>
      </div>

      <div className="mt-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((p) => (
          <div key={p.id} className="bg-card rounded-3xl overflow-hidden">
            <div className="aspect-[5/4] bg-muted">
              <img src={resolveImage(p.images?.[0])} alt={p.name} className="h-full w-full object-cover" />
            </div>
            <div className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-serif text-xl">{p.name}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {p.type === "bouquet" ? "Букет" : "Поштучно"} · {formatPrice(Number(p.price))}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setEditing(p)} className="p-2 hover:bg-muted rounded-full" aria-label="Редактировать">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove(p.id)} className="p-2 hover:bg-muted rounded-full text-destructive" aria-label="Удалить">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                {!p.active && <span className="px-2 py-0.5 rounded-full bg-muted">скрыт</span>}
                {!p.in_stock && <span className="px-2 py-0.5 rounded-full bg-destructive/10 text-destructive">нет в наличии</span>}
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
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function uploadImage(file: File) {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("product-images").upload(path, file, { upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from("product-images").getPublicUrl(path);
      setForm((f) => ({ ...f, images: [...(f.images ?? []), data.publicUrl] }));
      toast.success("Фото загружено");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Не удалось загрузить";
      toast.error(msg);
    } finally {
      setUploading(false);
    }
  }

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
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end overflow-hidden" onClick={onClose}>
      <form
        onSubmit={save}
        className="bg-background w-full sm:max-w-xl h-[100dvh] max-h-[100dvh] flex flex-col overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start p-5 sm:p-8 pb-4 border-b border-border shrink-0">
          <h2 className="text-2xl font-serif italic">{"id" in form && form.id ? "Редактировать" : "Новый товар"}</h2>
          <button type="button" onClick={onClose} className="p-2 hover:bg-muted rounded-full"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 sm:p-8 space-y-4 [-webkit-overflow-scrolling:touch]">

        <FormField l="Название">
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required maxLength={200} />
        </FormField>
        <FormField l="Описание">
          <textarea className="input min-h-[80px]" value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={1000} />
        </FormField>
        <FormField l="Состав">
          <input className="input" value={form.composition ?? ""} onChange={(e) => setForm({ ...form, composition: e.target.value })} maxLength={500} />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
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
              <option value="pink">Розовые</option>
              <option value="white">Белые</option>
              <option value="yellow">Жёлтые</option>
              <option value="red">Красные</option>
              <option value="mix">Микс</option>
              <option value="peony">Пионовидные</option>
            </select>
          </FormField>
        </div>

        <FormField l="Фотографии">
          <div className="space-y-3">
            {(form.images ?? []).length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {form.images.map((src, i) => (
                  <div key={i} className="relative group">
                    <img src={resolveImage(src)} className="aspect-square rounded-xl object-cover w-full" alt="" />
                    <button
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, images: f.images.filter((_, idx) => idx !== i) }))}
                      className="absolute top-1 right-1 bg-background/80 backdrop-blur p-1 rounded-full opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadImage(f);
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm hover:border-primary disabled:opacity-50"
            >
              <Upload className="h-4 w-4" />
              {uploading ? "Загружаем..." : "Загрузить фото"}
            </button>
          </div>
        </FormField>

          <div className="flex flex-wrap gap-x-6 gap-y-3">
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

        <div className="p-5 sm:p-8 pt-4 border-t border-border bg-background shrink-0">
          <button type="submit" disabled={saving} className="w-full rounded-full bg-primary text-primary-foreground py-3 text-sm font-medium hover:opacity-90 disabled:opacity-50">
            {saving ? "Сохраняем..." : "Сохранить"}
          </button>
        </div>
      </form>
    </div>
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
