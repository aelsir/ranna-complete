/**
 * Admin panel for the landing-page hero images. CRUD over the
 * `hero_images` table, with up/down reordering, active toggle, and
 * direct upload to R2.
 */
import { useRef, useState } from "react";
import {
  ImagePlus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Loader2,
  ExternalLink,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { useToast } from "@/hooks/use-toast";
import {
  useAdminHeroImages,
  useCreateHeroImage,
  useUpdateHeroImage,
  useDeleteHeroImage,
  useSwapHeroImageOrder,
} from "@/lib/api/hooks";
import { uploadToR2 } from "@/lib/upload";
import { getImageUrl } from "@/lib/format";
import type { HeroImage } from "@/types/database";

export function HeroImagesPanel() {
  const { data: heroes, isLoading, error } = useAdminHeroImages();
  const createMutation = useCreateHeroImage();
  const updateMutation = useUpdateHeroImage();
  const deleteMutation = useDeleteHeroImage();
  const swapMutation = useSwapHeroImageOrder();
  const { toast } = useToast();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<HeroImage | null>(null);

  const list = heroes ?? [];

  const handleUpload = async (file: File) => {
    setUploading(true);
    try {
      const { path } = await uploadToR2(file, "hero", undefined, "hero");
      await createMutation.mutateAsync({
        image_url: path,
        title: file.name.replace(/\.[^.]+$/, ""),
        is_active: true,
      });
      toast({
        title: "تم الرفع",
        description: "تمت إضافة الصورة بنجاح",
      });
    } catch (e) {
      toast({
        title: "خطأ في الرفع",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const a = list[index];
    const b = list[index - 1];
    swapMutation.mutate({
      a: { id: a.id, display_order: a.display_order },
      b: { id: b.id, display_order: b.display_order },
    });
  };

  const moveDown = (index: number) => {
    if (index >= list.length - 1) return;
    const a = list[index];
    const b = list[index + 1];
    swapMutation.mutate({
      a: { id: a.id, display_order: a.display_order },
      b: { id: b.id, display_order: b.display_order },
    });
  };

  const toggleActive = (h: HeroImage) =>
    updateMutation.mutate({ id: h.id, updates: { is_active: !h.is_active } });

  const updateField = (h: HeroImage, field: "title" | "link_url", value: string) =>
    updateMutation.mutate({
      id: h.id,
      updates: { [field]: value.trim() === "" ? null : value },
    });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteMutation.mutateAsync(pendingDelete.id);
      toast({ title: "تم الحذف", description: "تمت إزالة الصورة" });
    } catch (e) {
      toast({
        title: "خطأ في الحذف",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setPendingDelete(null);
    }
  };

  const activeCount = list.filter((h) => h.is_active).length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-fustat font-bold">صور الواجهة</h1>
          <p className="text-xs text-muted-foreground mt-1">
            الصور التي تظهر أعلى الصفحة الرئيسية في الموقع والتطبيق.{" "}
            {activeCount > 1
              ? `${activeCount} صور نشطة — سيتم التنقل بينها تلقائيًا.`
              : activeCount === 1
                ? "صورة واحدة نشطة."
                : "لا توجد صور نشطة — سيتم عرض الصورة الافتراضية."}
          </p>
        </div>
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleUpload(f);
            }}
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1.5 font-fustat"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {uploading ? "جاري الرفع..." : "رفع صورة جديدة"}
          </Button>
        </div>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>تعذّر تحميل الصور — {(error as Error).message}</span>
        </div>
      ) : list.length === 0 ? (
        <div className="border border-dashed border-border rounded-xl p-10 text-center text-sm text-muted-foreground">
          لا توجد صور بعد. ارفع أول صورة من زر "رفع صورة جديدة".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((h, idx) => (
            <article
              key={h.id}
              className="rounded-xl border border-border bg-background overflow-hidden flex flex-col"
            >
              {/* Preview */}
              <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                <img
                  src={getImageUrl(h.image_url)}
                  alt={h.title ?? ""}
                  className={`w-full h-full object-cover transition-opacity ${
                    h.is_active ? "opacity-100" : "opacity-40"
                  }`}
                  loading="lazy"
                />
                <span className="absolute top-2 right-2 bg-background/85 backdrop-blur-sm rounded-md px-2 py-0.5 text-[10px] font-mono">
                  #{idx + 1}
                </span>
                {!h.is_active && (
                  <span className="absolute top-2 left-2 bg-background/85 backdrop-blur-sm rounded-md px-2 py-0.5 text-[10px] text-muted-foreground">
                    معطّلة
                  </span>
                )}
              </div>

              {/* Body */}
              <div className="p-3 space-y-3 flex-1">
                <div>
                  <label className="text-[11px] font-fustat text-muted-foreground mb-1 block">
                    اسم داخلي (لا يظهر للمستخدمين)
                  </label>
                  <Input
                    defaultValue={h.title ?? ""}
                    onBlur={(e) => {
                      if ((e.target.value ?? "") !== (h.title ?? "")) {
                        updateField(h, "title", e.target.value);
                      }
                    }}
                    placeholder="مثال: بانر رمضان"
                    className="h-8 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-fustat text-muted-foreground mb-1 block flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    رابط داخلي (اختياري)
                  </label>
                  <Input
                    defaultValue={h.link_url ?? ""}
                    onBlur={(e) => {
                      if ((e.target.value ?? "") !== (h.link_url ?? "")) {
                        updateField(h, "link_url", e.target.value);
                      }
                    }}
                    placeholder="/playlist/<uuid>"
                    className="h-8 text-xs"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Footer actions */}
              <div className="border-t border-border px-3 py-2 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={h.is_active}
                    onCheckedChange={() => toggleActive(h)}
                  />
                  <span className="text-[11px] text-muted-foreground">
                    {h.is_active ? "نشطة" : "معطّلة"}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0 || swapMutation.isPending}
                    aria-label="رفع"
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => moveDown(idx)}
                    disabled={idx === list.length - 1 || swapMutation.isPending}
                    aria-label="إنزال"
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                    onClick={() => setPendingDelete(h)}
                    aria-label="حذف"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-fustat">حذف الصورة؟</AlertDialogTitle>
            <AlertDialogDescription>
              لا يمكن التراجع عن هذا الإجراء. سيتم حذف الصورة بشكل نهائي.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-fustat">إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-fustat"
            >
              {deleteMutation.isPending ? "جاري الحذف..." : "حذف"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
