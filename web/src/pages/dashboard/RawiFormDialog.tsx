import { Music, Save, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { getImageUrl } from "@/lib/format";
import type { Rawi, RawiInsert } from "@/types/database";

// ============================================
// Edit Rawi Dialog
// ============================================

interface EditRawiDialogProps {
  rawi: Rawi | null;
  onClose: () => void;
  onChange: (rawi: Rawi) => void;
  onSave: () => void;
  isPending: boolean;
  associatedTracks: { id: string; title: string }[];
  onOpenImagePicker: () => void;
}

export function EditRawiDialog({
  rawi,
  onClose,
  onChange,
  onSave,
  isPending,
  associatedTracks,
  onOpenImagePicker,
}: EditRawiDialogProps) {
  if (!rawi) return null;

  return (
    <Dialog open={!!rawi} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-fustat">تعديل الراوي</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الاسم</label>
            <Input value={rawi.name} onChange={(e) => onChange({ ...rawi, name: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">النبذة</label>
            <Textarea value={rawi.bio || ""} onChange={(e) => onChange({ ...rawi, bio: e.target.value })} rows={3} />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الصورة</label>
            <div className="flex items-center gap-3">
              {rawi.image_url && (
                <img src={getImageUrl(rawi.image_url)} alt="صورة" className="w-14 h-14 rounded-lg object-cover" />
              )}
              <Button variant="outline" size="sm" onClick={onOpenImagePicker}>
                <Upload className="h-3.5 w-3.5 ml-1" /> رفع صورة
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الميلاد</label>
              <Input type="number" value={rawi.birth_year || ""} onChange={(e) => onChange({ ...rawi, birth_year: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الوفاة</label>
              <Input type="number" value={rawi.death_year || ""} onChange={(e) => onChange({ ...rawi, death_year: e.target.value ? Number(e.target.value) : null })} />
            </div>
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
// Add Rawi Dialog
// ============================================

interface AddRawiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  rawi: Partial<RawiInsert>;
  onChange: (rawi: Partial<RawiInsert>) => void;
  onSave: () => void;
  isPending: boolean;
  onOpenImagePicker: () => void;
}

export function AddRawiDialog({
  open,
  onOpenChange,
  rawi,
  onChange,
  onSave,
  isPending,
  onOpenImagePicker,
}: AddRawiDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-fustat">إضافة راوي جديد</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الاسم *</label>
            <Input value={rawi.name || ""} onChange={(e) => onChange({ ...rawi, name: e.target.value })} placeholder="اسم الراوي" />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">النبذة</label>
            <Textarea value={rawi.bio || ""} onChange={(e) => onChange({ ...rawi, bio: e.target.value })} rows={3} placeholder="نبذة مختصرة..." />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الصورة</label>
            <div className="flex items-center gap-3">
              {rawi.image_url && (
                <img src={getImageUrl(rawi.image_url)} alt="صورة" className="w-14 h-14 rounded-lg object-cover" />
              )}
              <Button variant="outline" size="sm" onClick={onOpenImagePicker}>
                <Upload className="h-3.5 w-3.5 ml-1" /> رفع صورة
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الميلاد</label>
              <Input type="number" value={rawi.birth_year || ""} onChange={(e) => onChange({ ...rawi, birth_year: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">سنة الوفاة</label>
              <Input type="number" value={rawi.death_year || ""} onChange={(e) => onChange({ ...rawi, death_year: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { onOpenChange(false); onChange({}); }} className="font-fustat">إلغاء</Button>
          <Button disabled={!rawi.name || isPending} className="gap-1.5 font-fustat" onClick={onSave}>
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

export function RawiFormDialog(props: any) {
  if (props.isEdit) {
    return (
      <EditRawiDialog
        rawi={props.rawi}
        onClose={() => props.onOpenChange(false)}
        onChange={props.onChange}
        onSave={props.onSave}
        isPending={props.isSaving}
        associatedTracks={props.fetchedTracks.filter((t: any) => t.rawi_id === props.rawi?.id)}
        onOpenImagePicker={props.openImagePicker}
      />
    );
  }

  return (
    <AddRawiDialog
      open={props.isOpen}
      onOpenChange={props.onOpenChange}
      rawi={props.rawi}
      onChange={props.onChange}
      onSave={props.onSave}
      isPending={props.isSaving}
      onOpenImagePicker={props.openImagePicker}
    />
  );
}
