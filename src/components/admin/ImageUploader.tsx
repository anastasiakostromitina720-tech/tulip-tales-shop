import { useRef, useState } from "react";
import { Upload, X, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase } from "@/integrations/supabase/client";
import { resolveImage } from "@/lib/products";
import { toast } from "sonner";

const BUCKET = "product-images";

function pathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  return url.slice(idx + marker.length);
}

type Props = {
  images: string[];
  onChange: (images: string[]) => void;
};

export function ImageUploader({ images, onChange }: Props) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  async function uploadFiles(files: FileList | File[]) {
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;
    setUploading(true);
    const uploaded: string[] = [];
    for (const file of arr) {
      try {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
        uploaded.push(data.publicUrl);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Не удалось загрузить файл";
        toast.error(msg);
      }
    }
    if (uploaded.length) {
      onChange([...images, ...uploaded]);
      toast.success(`Загружено: ${uploaded.length}`);
    }
    setUploading(false);
  }

  async function removeAt(index: number) {
    const url = images[index];
    const path = pathFromPublicUrl(url);
    onChange(images.filter((_, i) => i !== index));
    if (path) {
      await supabase.storage.from(BUCKET).remove([path]).catch(() => {});
    }
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((src) => src === active.id);
    const newIndex = images.findIndex((src) => src === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onChange(arrayMove(images, oldIndex, newIndex));
  }

  return (
    <div className="space-y-3">
      {images.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={images} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {images.map((src, i) => (
                <SortableImage key={src} id={src} index={i} onRemove={() => removeAt(i)} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) uploadFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
        }}
        disabled={uploading}
        className={`w-full inline-flex items-center justify-center gap-2 rounded-xl border border-dashed py-6 text-sm hover:border-primary disabled:opacity-50 transition-colors ${
          dragOver ? "border-primary bg-primary/5" : "border-border"
        }`}
      >
        <Upload className="h-4 w-4" />
        {uploading ? "Загружаем..." : "Загрузить фото или перетащите сюда"}
      </button>
      {images.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Перетаскивайте миниатюры, чтобы изменить порядок. Первое фото — обложка.
        </p>
      )}
    </div>
  );
}

function SortableImage({ id, index, onRemove }: { id: string; index: number; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} className="relative group">
      <img src={resolveImage(id)} alt="" className="aspect-square rounded-xl object-cover w-full" />
      {index === 0 && (
        <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 rounded-full">
          обложка
        </span>
      )}
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 bg-background/80 backdrop-blur p-1 rounded-full opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing"
        aria-label="Перетащить"
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 bg-background/80 backdrop-blur p-1 rounded-full opacity-0 group-hover:opacity-100"
        aria-label="Удалить"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
