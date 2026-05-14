import { Music, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { getImageUrl } from "@/lib/format";
import type { Madih, MadihInsert, MadhaWithRelations } from "@/types/database";
import type { MappedTariqa } from "./dashboard-types";

// ============================================
// Edit Madih Dialog
// ============================================

interface EditMadihDialogProps {
  madih: Madih | null;
  onClose: () => void;
  onChange: (madih: Madih) => void;
  onSave: () => void;
  isPending: boolean;
  tariqas: MappedTariqa[];
  associatedTracks: { id: string; title: string }[];
  onOpenImagePicker: () => void;
}

export function EditMadihDialog({
  madih,
  onClose,
  onChange,
  onSave,
  isPending,
  tariqas,
  associatedTracks,
  onOpenImagePicker,
}: EditMadihDialogProps) {
  if (!madih) return null;

  return (
    <Dialog open={!!madih} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-fustat">تعديل المادح</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الاسم</label>
            <Input value={madih.name} onChange={(e) => onChange({ ...madih, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">النبذة</label>
            <Textarea value={madih.bio || ""} onChange={(e) => onChange({ ...madih, bio: e.target.value })} rows={3} />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الصورة</label>
            <div className="flex items-center gap-3">
              {madih.image_url && (
                <img src={getImageUrl(madih.image_url)} alt="صورة" className="w-14 h-14 rounded-lg object-cover" />
              )}
              <Button variant="outline" size="sm" onClick={onOpenImagePicker}>
                <Upload className="h-3.5 w-3.5 ml-1" /> رفع صورة
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الميلاد</label>
              <Input type="number" value={madih.birth_year || ""} onChange={(e) => onChange({ ...madih, birth_year: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الوفاة</label>
              <Input type="number" value={madih.death_year || ""} onChange={(e) => onChange({ ...madih, death_year: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الطريقة</label>
            <SearchableSelect
              value={madih.tariqa_id || ""}
              onValueChange={(v) => onChange({ ...madih, tariqa_id: v || null })}
              options={tariqas.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="اختر الطريقة"
              searchPlaceholder="ابحث عن طريقة..."
            />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-2 block">المدائح المرتبطة</label>
            <div className="space-y-1 max-h-40 overflow-y-auto rounded-lg border border-border p-2">
              {associatedTracks.map((m) => (
                <div key={m.id} className="flex items-center gap-2 py-1 px-2 rounded text-xs text-muted-foreground">
                  <Music className="h-3 w-3 shrink-0" />
                  <span className="truncate">{m.title}</span>
                </div>
              ))}
              {associatedTracks.length === 0 && (
                <p className="text-xs text-muted-foreground/50 text-center py-2">لا توجد مدائح مرتبطة</p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="font-fustat">إلغاء</Button>
          <Button disabled={isPending} className="gap-1.5 font-fustat" onClick={onSave}>
            <Save className="h-3.5 w-3.5" />
            {isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Add Madih Dialog
// ============================================

interface AddMadihDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  madih: Partial<MadihInsert>;
  onChange: (madih: Partial<MadihInsert>) => void;
  onSave: () => void;
  isPending: boolean;
  tariqas: MappedTariqa[];
  onOpenImagePicker: () => void;
}

export function AddMadihDialog({
  open,
  onOpenChange,
  madih,
  onChange,
  onSave,
  isPending,
  tariqas,
  onOpenImagePicker,
}: AddMadihDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-fustat">إضافة مادح جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الاسم *</label>
            <Input value={madih.name || ""} onChange={(e) => onChange({ ...madih, name: e.target.value })} placeholder="اسم المادح" />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">النبذة</label>
            <Textarea value={madih.bio || ""} onChange={(e) => onChange({ ...madih, bio: e.target.value })} rows={3} placeholder="نبذة مختصرة..." />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الصورة</label>
            <div className="flex items-center gap-3">
              {madih.image_url && (
                <img src={getImageUrl(madih.image_url)} alt="صورة" className="w-14 h-14 rounded-lg object-cover" />
              )}
              <Button variant="outline" size="sm" onClick={onOpenImagePicker}>
                <Upload className="h-3.5 w-3.5 ml-1" /> رفع صورة
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الميلاد</label>
              <Input type="number" value={madih.birth_year || ""} onChange={(e) => onChange({ ...madih, birth_year: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الوفاة</label>
              <Input type="number" value={madih.death_year || ""} onChange={(e) => onChange({ ...madih, death_year: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الطريقة</label>
            <SearchableSelect
              value={madih.tariqa_id || ""}
              onValueChange={(v) => onChange({ ...madih, tariqa_id: v || null })}
              options={tariqas.map((t) => ({ value: t.id, label: t.name }))}
              placeholder="اختر الطريقة"
              searchPlaceholder="ابحث عن طريقة..."
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); onChange({}); }} className="font-fustat">إلغاء</Button>
          <Button disabled={!madih.name || isPending} className="gap-1.5 font-fustat" onClick={onSave}>
            <Save className="h-3.5 w-3.5" />
            {isPending ? "جاري الإضافة..." : "إضافة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Unified Wrapper
// ============================================

export function MadihFormDialog(props: any) {
  if (props.isEdit) {
    return (
      <EditMadihDialog
        madih={props.madih}
        onClose={() => props.onOpenChange(false)}
        onChange={props.onChange}
        onSave={props.onSave}
        isPending={props.isSaving}
        tariqas={props.tariqas}
        associatedTracks={props.fetchedTracks.filter((t: any) => t.madih_id === props.madih?.id)}
        onOpenImagePicker={props.openImagePicker}
      />
    );
  }

  return (
    <AddMadihDialog
      open={props.isOpen}
      onOpenChange={props.onOpenChange}
      madih={props.madih}
      onChange={props.onChange}
      onSave={props.onSave}
      isPending={props.isSaving}
      tariqas={props.tariqas}
      onOpenImagePicker={props.openImagePicker}
    />
  );
}
