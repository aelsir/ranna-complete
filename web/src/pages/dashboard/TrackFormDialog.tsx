import {
  Music,
  Save,
  Upload,
  Loader2,
  X,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { CONTENT_TYPES } from "@/types/database";
import { getImageUrl } from "@/lib/format";
import type { ExtendedTrack, MappedArtist, MappedNarrator, MappedTariqa, MappedFan } from "./dashboard-types";

// ============================================
// Edit Track Dialog
// ============================================

interface EditTrackDialogProps {
  track: ExtendedTrack | null;
  onClose: () => void;
  onChange: (track: ExtendedTrack) => void;
  onSave: () => void;
  isPending: boolean;
  artists: MappedArtist[];
  narrators: MappedNarrator[];
  tariqas: MappedTariqa[];
  funoon: MappedFan[];
  onOpenImagePicker: () => void;
  onOpenAudioPicker: () => void;
  audioUploading: boolean;
  isAudioTarget: boolean;
}

export function EditTrackDialog({
  track,
  onClose,
  onChange,
  onSave,
  isPending,
  artists,
  narrators,
  tariqas,
  funoon,
  onOpenImagePicker,
  onOpenAudioPicker,
  audioUploading,
  isAudioTarget,
}: EditTrackDialogProps) {
  if (!track) return null;

  return (
    <Dialog open={!!track} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-fustat">تعديل المدحة</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">العنوان</label>
            <Input value={track.title} onChange={(e) => onChange({ ...track, title: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">المادح</label>
              <SearchableSelect
                value={track.artistId}
                onValueChange={(v) => {
                  const a = artists.find((a) => a.id === v);
                  onChange({ ...track, artistId: v, artistName: a?.name || "" });
                }}
                options={artists.map((a) => ({ value: a.id, label: a.name }))}
                placeholder="اختر المادح"
                searchPlaceholder="ابحث عن مادح..."
              />
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">الراوي</label>
              <SearchableSelect
                value={track.narratorId}
                onValueChange={(v) => {
                  const n = narrators.find((n) => n.id === v);
                  onChange({ ...track, narratorId: v, narratorName: n?.name || "" });
                }}
                options={narrators.map((n) => ({ value: n.id, label: n.name }))}
                placeholder="اختر الراوي"
                searchPlaceholder="ابحث عن راوي..."
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">الطريقة</label>
              <SearchableSelect
                value={track.tariqa || "none"}
                onValueChange={(v) => onChange({ ...track, tariqa: v === "none" ? "" : v })}
                options={[{ value: "none", label: "بدون" }, ...tariqas.map((tq) => ({ value: tq.name, label: tq.name }))]}
                placeholder="اختر الطريقة"
                searchPlaceholder="ابحث عن طريقة..."
              />
            </div>
            <div>
              <label className="text-xs font-fustat text-muted-foreground mb-1 block">الفن</label>
              <SearchableSelect
                value={track.fan || "none"}
                onValueChange={(v) => onChange({ ...track, fan: v === "none" ? "" : v })}
                options={[{ value: "none", label: "بدون" }, ...funoon.map((fn) => ({ value: fn.name, label: fn.name }))]}
                placeholder="اختر الفن"
                searchPlaceholder="ابحث عن فن..."
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">المدة</label>
            <Input value={track.duration} onChange={(e) => onChange({ ...track, duration: e.target.value })} className="w-32" />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">المقطع الصوتي</label>
            <div className="flex items-center gap-3">
              <div className="flex-1 space-y-2">
                <Input
                  value={track.audioUrl || ""}
                  onChange={(e) => onChange({ ...track, audioUrl: e.target.value })}
                  placeholder="مثال: audio/madha/filename.mp3"
                  dir="ltr"
                  className="text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs"
                  onClick={onOpenAudioPicker}
                  disabled={audioUploading && isAudioTarget}
                >
                  {audioUploading && isAudioTarget ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3" />
                  )}
                  {audioUploading && isAudioTarget ? "جاري الرفع..." : "رفع مقطع صوتي"}
                </Button>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">ارفع ملف صوتي أو أدخل مسار الملف في R2</p>
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">صورة الغلاف</label>
            <div className="flex items-center gap-3">
              {track.imageUrl && (
                <img src={getImageUrl(track.imageUrl)} alt="غلاف" className="h-16 w-16 rounded-xl object-cover shrink-0 border border-border" />
              )}
              <div className="flex-1 space-y-2">
                <Input
                  value={track.imageUrl || ""}
                  onChange={(e) => onChange({ ...track, imageUrl: e.target.value })}
                  placeholder="مثال: images/madha/cover.jpg"
                  dir="ltr"
                  className="text-sm"
                />
                <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onOpenImagePicker}>
                  <ImagePlus className="h-3 w-3" />
                  رفع صورة
                </Button>
              </div>
            </div>
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">الكلمات</label>
            <Textarea
              value={track.lyrics || ""}
              onChange={(e) => onChange({ ...track, lyrics: e.target.value })}
              placeholder="أدخل كلمات المدحة هنا..."
              className="min-h-[120px] text-sm leading-relaxed"
            />
          </div>
          <div>
            <label className="text-xs font-fustat text-muted-foreground mb-1 block">ملاحظات</label>
            <Textarea
              value={track.notes || ""}
              onChange={(e) => onChange({ ...track, notes: e.target.value })}
              placeholder="ملاحظات إضافية..."
              className="min-h-[60px] text-sm"
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending} className="font-fustat">إلغاء</Button>
          <Button onClick={onSave} disabled={isPending} className="gap-1.5 font-fustat">
            <Save className="h-3.5 w-3.5" />
            {isPending ? "جاري الحفظ..." : "حفظ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Add Track Dialog
// ============================================

interface AddTrackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  track: Partial<ExtendedTrack>;
  onChange: (track: Partial<ExtendedTrack>) => void;
  onSave: () => void;
  onClearDraft: () => void;
  isPending: boolean;
  artists: MappedArtist[];
  narrators: MappedNarrator[];
  tariqas: MappedTariqa[];
  funoon: MappedFan[];
  onOpenImagePicker: () => void;
  onOpenAudioPicker: () => void;
  audioUploading: boolean;
  isAudioTarget: boolean;
}

export function AddTrackDialog({
  open,
  onOpenChange,
  track,
  onChange,
  onSave,
  onClearDraft,
  isPending,
  artists,
  narrators,
  tariqas,
  funoon,
  onOpenImagePicker,
  onOpenAudioPicker,
  audioUploading,
  isAudioTarget,
}: AddTrackDialogProps) {
  const contentType = track.contentType || "madha";

  const handleClose = () => {
    if (Object.keys(track).length > 0) {
      const confirmed = window.confirm("هل تريد حذف المسودة وإغلاق النافذة؟");
      if (!confirmed) return;
      onChange({});
      onClearDraft();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-fustat text-xl text-center">رفع محتوى جديد</DialogTitle>
          <p className="text-xs text-muted-foreground text-center">اختر نوع المحتوى وأدخل التفاصيل</p>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* Section: الوسائط */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 rounded-full bg-secondary" />
              <h3 className="font-fustat font-bold text-base text-foreground">الوسائط</h3>
            </div>
            <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-4">
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-2 block">المقطع الصوتي</label>
                {!track.audioUrl ? (
                  <button
                    type="button"
                    onClick={onOpenAudioPicker}
                    disabled={audioUploading && isAudioTarget}
                    className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group"
                  >
                    {audioUploading && isAudioTarget ? (
                      <>
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <span className="text-xs font-fustat text-muted-foreground">جاري رفع المقطع الصوتي...</span>
                      </>
                    ) : (
                      <>
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Upload className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-fustat font-semibold text-foreground">ارفع المقطع الصوتي</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">MP3, WAV, OGG, M4A</p>
                        </div>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="flex items-center gap-3 bg-background rounded-xl border border-border p-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Music className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-fustat text-foreground truncate" dir="ltr">{track.audioUrl}</p>
                      <p className="text-[10px] text-muted-foreground">تم رفع المقطع بنجاح</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onOpenAudioPicker} disabled={audioUploading}>
                        <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => onChange({ ...track, audioUrl: "" })}>
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                )}
                <Input
                  value={track.audioUrl || ""}
                  onChange={(e) => onChange({ ...track, audioUrl: e.target.value })}
                  placeholder="أو أدخل الرابط يدوياً..."
                  dir="ltr"
                  className="text-sm mt-2"
                />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-2 block">صورة الغلاف</label>
                <div className="flex items-center gap-3">
                  {track.imageUrl && (
                    <img src={getImageUrl(track.imageUrl)} alt="غلاف" className="h-16 w-16 rounded-xl object-cover shrink-0 border border-border" />
                  )}
                  <div className="flex-1 space-y-2">
                    <Input
                      value={track.imageUrl || ""}
                      onChange={(e) => onChange({ ...track, imageUrl: e.target.value })}
                      placeholder="مثال: images/madha/cover.jpg"
                      dir="ltr"
                      className="text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onOpenImagePicker}>
                      <ImagePlus className="h-3 w-3" />
                      رفع صورة
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section: المعلومات الأساسية */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 rounded-full bg-secondary" />
              <h3 className="font-fustat font-bold text-base text-foreground">المعلومات الأساسية</h3>
            </div>
            <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-4">
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-2 block">نوع المحتوى *</label>
                <div className="flex gap-2 flex-wrap">
                  {CONTENT_TYPES.map((ct) => (
                    <button
                      key={ct.value}
                      type="button"
                      onClick={() => onChange({ ...track, contentType: ct.value })}
                      className={`px-3 py-1.5 rounded-full text-xs font-fustat font-bold transition-all border ${
                        contentType === ct.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50"
                      }`}
                    >
                      {ct.icon} {ct.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                  {contentType === "madha" ? "اسم المدحة *" : contentType === "quran" ? "اسم السورة / المقطع *" : contentType === "lecture" ? "عنوان الدرس *" : contentType === "dhikr" ? "اسم الذكر *" : "العنوان *"}
                </label>
                <Input
                  value={track.title || ""}
                  onChange={(e) => onChange({ ...track, title: e.target.value })}
                  placeholder={contentType === "madha" ? "أدخل اسم المدحة..." : contentType === "quran" ? "أدخل اسم السورة أو المقطع..." : contentType === "lecture" ? "أدخل عنوان الدرس..." : contentType === "dhikr" ? "أدخل اسم الذكر..." : "أدخل العنوان..."}
                />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                  {contentType === "madha" ? "المادح *" : contentType === "quran" ? "القارئ *" : contentType === "lecture" ? "المحاضر *" : contentType === "dhikr" ? "المنشد *" : "الفنان *"}
                </label>
                <SearchableSelect
                  value={track.artistId}
                  onValueChange={(v) => onChange({ ...track, artistId: v })}
                  options={artists.map((a) => ({ value: a.id, label: a.name }))}
                  placeholder={contentType === "madha" ? "اختر المادح" : contentType === "quran" ? "اختر القارئ" : contentType === "lecture" ? "اختر المحاضر" : "اختر المنشد"}
                  searchPlaceholder="ابحث..."
                />
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                  {contentType === "madha" ? "الراوي (اختياري)" : contentType === "quran" ? "الرواية (اختياري)" : "الكاتب (اختياري)"}
                </label>
                <SearchableSelect
                  value={track.narratorId}
                  onValueChange={(v) => onChange({ ...track, narratorId: v })}
                  options={narrators.map((n) => ({ value: n.id, label: n.name }))}
                  placeholder="اختر الراوي"
                  searchPlaceholder="ابحث عن راوي..."
                />
              </div>
            </div>
          </div>

          {/* Section: التفاصيل */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 rounded-full bg-accent" />
              <h3 className="font-fustat font-bold text-base text-foreground">التفاصيل</h3>
              <span className="text-[10px] text-muted-foreground">(اختياري)</span>
            </div>
            <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-4">
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                  {contentType === "madha" ? "كلمات المدحة" : contentType === "quran" ? "نص الآيات" : contentType === "lecture" ? "ملخص الدرس" : "كلمات الذكر"}
                </label>
                <Textarea
                  value={track.lyrics || ""}
                  onChange={(e) => onChange({ ...track, lyrics: e.target.value })}
                  placeholder="أدخل كلمات المدحة هنا..."
                  className="min-h-[120px] text-sm leading-relaxed"
                />
                <p className="text-[10px] text-muted-foreground mt-1">سيتم مراجعة الكلمات من قبل المشرفين قبل الموافقة</p>
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">مكان التسجيل</label>
                <Input
                  value={track.location || ""}
                  onChange={(e) => onChange({ ...track, location: e.target.value })}
                  placeholder="مثال: أمدرمان، حجر العسل، الخرطوم..."
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">الطريقة</label>
                  <SearchableSelect
                    value={track.tariqa}
                    onValueChange={(v) => onChange({ ...track, tariqa: v })}
                    options={tariqas.map((tq) => ({ value: tq.name, label: tq.name }))}
                    placeholder="اختر الطريقة..."
                    searchPlaceholder="ابحث عن طريقة..."
                  />
                </div>
                <div>
                  <label className="text-xs font-fustat text-muted-foreground mb-1 block">الفن</label>
                  <SearchableSelect
                    value={track.fan}
                    onValueChange={(v) => onChange({ ...track, fan: v })}
                    options={funoon.map((fn) => ({ value: fn.name, label: fn.name }))}
                    placeholder="اختر الفن..."
                    searchPlaceholder="ابحث عن فن..."
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-fustat text-muted-foreground mb-1 block">المدة</label>
                <Input
                  value={track.duration || ""}
                  onChange={(e) => onChange({ ...track, duration: e.target.value })}
                  placeholder="مثال: ٥:٣٠"
                  className="w-32"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={handleClose} disabled={isPending} className="font-fustat">إلغاء</Button>
          <Button onClick={onSave} disabled={isPending} className="gap-1.5 w-full sm:w-auto font-fustat">
            <Upload className="h-3.5 w-3.5" />
            {isPending ? "جاري الإضافة..." : "رفع المدحة"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Unified Wrapper
// ============================================

export function TrackFormDialog(props: any) {
  if (props.isEdit) {
    return (
      <EditTrackDialog
        track={props.track}
        onClose={() => props.onOpenChange(false)}
        onChange={props.onChange}
        onSave={props.onSave}
        isPending={props.isSaving}
        artists={props.artists}
        narrators={props.narrators}
        tariqas={props.tariqas}
        funoon={props.funoon}
        onOpenImagePicker={() => props.openImagePicker("editTrack")}
        onOpenAudioPicker={() => props.openAudioPicker("editTrack")}
        audioUploading={props.audioUploading}
        isAudioTarget={props.audioUploadTarget === "editTrack"}
      />
    );
  }

  return (
    <AddTrackDialog
      open={props.isOpen}
      onOpenChange={props.onOpenChange}
      track={props.track}
      onChange={props.onChange}
      onSave={props.onSave}
      onClearDraft={() => {}}
      isPending={props.isSaving}
      artists={props.artists}
      narrators={props.narrators}
      tariqas={props.tariqas}
      funoon={props.funoon}
      onOpenImagePicker={() => props.openImagePicker("addTrack")}
      onOpenAudioPicker={() => props.openAudioPicker("addTrack")}
      audioUploading={props.audioUploading}
      isAudioTarget={props.audioUploadTarget === "addTrack"}
    />
  );
}
