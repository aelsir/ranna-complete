import { useCallback, useRef, useState, useEffect, DragEvent } from "react";
import {
  Upload,
  X,
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Clock,
  Pause,
  Pencil,
} from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { RtlPlay } from "@/components/icons/rtl-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { SearchableSelect } from "@/components/ui/searchable-select";
import { Progress } from "@/components/ui/progress";
import {
  useBulkUpload,
  type BulkFile,
  type FileStatus,
  type FileMetadataOverrides,
  type SharedMetadata,
} from "@/hooks/useBulkUpload";
import { useToast } from "@/hooks/use-toast";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artists: { id: string; name: string }[];
  narrators: { id: string; name: string }[];
  tariqas: { id: string; name: string }[];
  funoon: { id: string; name: string }[];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function StatusIcon({ status }: { status: FileStatus }) {
  switch (status) {
    case "queued":
      return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    case "uploading":
    case "saving":
      return <Loader2 className="h-3.5 w-3.5 text-primary animate-spin" />;
    case "completed":
      return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />;
    case "failed":
      return <XCircle className="h-3.5 w-3.5 text-destructive" />;
  }
}

// ── Per-file row with collapsible metadata overrides + audio preview ──

function FileRow({
  file,
  artists,
  narrators,
  tariqas,
  funoon,
  sharedMetadata,
  isPreviewPlaying,
  previewProgress,
  onUpdateTitle,
  onRemove,
  onSetOverride,
  onClearOverrides,
  onTogglePreview,
  onOpenAdvanced,
}: {
  file: BulkFile;
  artists: { id: string; name: string }[];
  narrators: { id: string; name: string }[];
  tariqas: { id: string; name: string }[];
  funoon: { id: string; name: string }[];
  sharedMetadata: SharedMetadata;
  isPreviewPlaying: boolean;
  previewProgress: number;
  onUpdateTitle: (id: string, title: string) => void;
  onRemove: (id: string) => void;
  onSetOverride: (id: string, overrides: Partial<FileMetadataOverrides>) => void;
  onClearOverrides: (id: string) => void;
  onTogglePreview: () => void;
  onOpenAdvanced: (id: string) => void;
}) {
  const hasOverrides = Object.keys(file.overrides).length > 0;

  return (
    <div className="bg-background rounded-xl border border-border overflow-hidden">
      {/* Compact row — always visible */}
      <div className="flex items-center gap-3 p-3">
          {/* Play/Pause preview toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onTogglePreview();
            }}
            className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 transition-all active:scale-90 ${
              isPreviewPlaying
                ? "bg-accent/15 text-accent"
                : "bg-primary/10 text-primary hover:bg-primary/15"
            }`}
          >
            <AnimatePresence mode="wait">
              {isPreviewPlaying ? (
                <motion.div
                  key="pause"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <Pause className="h-3.5 w-3.5" fill="currentColor" />
                </motion.div>
              ) : (
                <motion.div
                  key="play"
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{ duration: 0.12 }}
                >
                  <RtlPlay className="h-3.5 w-3.5" fill="currentColor" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>

          <div className="flex-1 min-w-0">
            <Input
              value={file.title}
              onChange={(e) => onUpdateTitle(file.id, e.target.value)}
              className="text-sm h-7 border-0 bg-transparent px-0 focus-visible:ring-0"
              placeholder="اسم المدحة"
            />
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {hasOverrides && (
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[9px] px-1.5">
                مخصص
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] font-mono">
              {formatDuration(file.durationSeconds)}
            </Badge>
            <Badge variant="outline" className="text-[10px] font-mono">
              {formatFileSize(file.file.size)}
            </Badge>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onRemove(file.id)}
            >
              <X className="h-3 w-3 text-muted-foreground" />
            </Button>
          </div>
        </div>

        {/* Preview progress bar — thin accent line */}
        {isPreviewPlaying && (
          <div className="h-0.5 bg-border">
            <div
              className="h-full bg-accent transition-all duration-200 ease-linear"
              style={{ width: `${previewProgress}%` }}
            />
          </div>
        )}

      {/* Artist and Narrator always visible */}
      <div className="border-t border-border bg-muted/10 p-3 pt-2">
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">
              المادح
              {!file.overrides.madihId && sharedMetadata.madihName && (
                <span className="text-[9px] text-muted-foreground/60 mr-1">
                  (المشترك: {sharedMetadata.madihName})
                </span>
              )}
            </label>
            <SearchableSelect
              value={file.overrides.madihId || ""}
              onValueChange={(v) => {
                const name = artists.find((a) => a.id === v)?.name || "";
                onSetOverride(file.id, { madihId: v, madihName: name });
              }}
              options={artists.map((a) => ({ value: a.id, label: a.name }))}
              placeholder={sharedMetadata.madihName || "اختر المادح"}
              searchPlaceholder="ابحث عن مادح..."
              triggerClassName="h-8 text-xs"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">
              الراوي
              {!file.overrides.rawiId && sharedMetadata.rawiId && (
                <span className="text-[9px] text-muted-foreground/60 mr-1">
                  (المشترك)
                </span>
              )}
            </label>
            <SearchableSelect
              value={file.overrides.rawiId || ""}
              onValueChange={(v) => onSetOverride(file.id, { rawiId: v })}
              options={narrators.map((n) => ({ value: n.id, label: n.name }))}
              placeholder="اختر الراوي"
              searchPlaceholder="ابحث عن راوي..."
              triggerClassName="h-8 text-xs"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-8 text-[11px] font-fustat gap-1.5 w-28 shrink-0"
            onClick={() => onOpenAdvanced(file.id)}
          >
            <Pencil className="h-3 w-3" />
            أضف المزيد
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Dialog ──

export function BulkUploadDialog({
  open,
  onOpenChange,
  artists,
  narrators,
  tariqas,
  funoon,
}: BulkUploadDialogProps) {
  const {
    files,
    metadata,
    phase,
    completedCount,
    failedCount,
    totalCount,
    isUploading,
    isComplete,
    addFiles,
    removeFile,
    updateTitle,
    setMetadata,
    setFileOverride,
    clearFileOverrides,
    applySharedToAll,
    startUpload,
    cancelUpload,
    retryFailed,
    reset,
  } = useBulkUpload();

  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [advancedEditingId, setAdvancedEditingId] = useState<string | null>(null);
  const advancedFile = files.find((f) => f.id === advancedEditingId);

  // ── Audio preview state ──
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [previewProgress, setPreviewProgress] = useState(0);
  const [isPreviewActuallyPlaying, setIsPreviewActuallyPlaying] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  const stopPreview = useCallback(() => {
    const audio = previewAudioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
    }
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewingId(null);
    setPreviewProgress(0);
    setIsPreviewActuallyPlaying(false);
  }, []);

  const togglePreview = useCallback(
    (fileId: string, file: File) => {
      const audio = previewAudioRef.current;
      if (!audio) return;

      if (previewingId === fileId) {
        // Toggle pause/play on the same file
        if (audio.paused) {
          audio.play();
        } else {
          audio.pause();
        }
        return;
      }

      // Switch to a different file — clean up old URL
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;
      audio.src = url;
      audio.play();
      setPreviewingId(fileId);
      setPreviewProgress(0);
      setIsPreviewActuallyPlaying(true);
    },
    [previewingId]
  );

  // Attach audio event listeners
  useEffect(() => {
    const audio = previewAudioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.duration && isFinite(audio.duration)) {
        setPreviewProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const onEnded = () => {
      setPreviewingId(null);
      setPreviewProgress(0);
      setIsPreviewActuallyPlaying(false);
    };
    const onPlay = () => setIsPreviewActuallyPlaying(true);
    const onPause = () => setIsPreviewActuallyPlaying(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
    };
  }, []);

  // Stop preview when dialog closes or phase changes to uploading
  useEffect(() => {
    if (!open || phase === "uploading") {
      stopPreview();
    }
  }, [open, phase, stopPreview]);

  // Stop preview if the previewing file gets removed
  useEffect(() => {
    if (previewingId && !files.some((f) => f.id === previewingId)) {
      stopPreview();
    }
  }, [files, previewingId, stopPreview]);

  const handleFiles = useCallback(
    async (fileList: FileList | File[]) => {
      const result = await addFiles(fileList);
      if (result.rejected > 0) {
        toast({
          title: "ملفات مرفوضة",
          description: `تم رفض ${result.rejected} ملف (نوع غير مدعوم)`,
          variant: "destructive",
        });
      }
    },
    [addFiles, toast]
  );

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleStartUpload = useCallback(async () => {
    // Stop any preview before uploading
    stopPreview();

    // Every file needs a madih from either shared or its override
    const missingMadih = files.some(
      (f) => !f.overrides.madihId && !metadata.madihId
    );
    if (missingMadih) {
      toast({
        title: "خطأ",
        description: "يجب اختيار المادح لكل ملف أو تحديد مادح مشترك",
        variant: "destructive",
      });
      return;
    }
    await startUpload();
  }, [files, metadata.madihId, startUpload, stopPreview, toast]);

  // Show completion toast
  useEffect(() => {
    if (isComplete && phase === "uploading") {
      if (failedCount === 0) {
        toast({
          title: "تم الرفع بنجاح",
          description: `تم رفع ${completedCount} مدحة بنجاح`,
        });
      } else {
        toast({
          title: "اكتمل الرفع مع أخطاء",
          description: `نجح ${completedCount} من ${totalCount}، فشل ${failedCount}`,
          variant: "destructive",
        });
      }
    }
  }, [isComplete, phase, completedCount, failedCount, totalCount, toast]);

  const handleClose = useCallback(
    (value: boolean) => {
      if (!value && !isUploading) {
        stopPreview();
        reset();
        onOpenChange(false);
      } else if (!value && isUploading) {
        // Don't close during upload
      } else {
        onOpenChange(value);
      }
    },
    [isUploading, reset, stopPreview, onOpenChange]
  );

  const handleUploadMore = useCallback(() => {
    stopPreview();
    reset();
  }, [reset, stopPreview]);

  const progressPercent = totalCount > 0 ? Math.round(((completedCount + failedCount) / totalCount) * 100) : 0;
  const hasAnyOverrides = files.some((f) => Object.keys(f.overrides).length > 0);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
        {/* Hidden audio element for preview playback */}
        <audio ref={previewAudioRef} preload="auto" />

        <DialogHeader>
          <DialogTitle className="font-fustat text-xl text-center">
            رفع مجمّع للمدائح
          </DialogTitle>
          <p className="text-xs text-muted-foreground text-center">
            ارفع عدة ملفات صوتية دفعة واحدة مع تحديد البيانات المشتركة
          </p>
        </DialogHeader>

        <div className="space-y-6 mt-2">
          {/* ── Phase: Selection ── */}
          {phase === "selection" && (
            <>
              {/* Drop Zone */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 rounded-full bg-secondary" />
                  <h3 className="font-fustat font-bold text-base text-foreground">
                    الملفات الصوتية
                  </h3>
                  {files.length > 0 && (
                    <Badge variant="secondary" className="text-[10px]">
                      {files.length} ملف
                    </Badge>
                  )}
                </div>

                <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-4">
                  <div
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed transition-all cursor-pointer group ${
                      isDragging
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <Upload className="h-5 w-5 text-primary" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-fustat font-semibold text-foreground">
                        اسحب الملفات هنا أو اضغط للاختيار
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        MP3, WAV, OGG, M4A — حتى 50 ملف
                      </p>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => {
                        if (e.target.files) handleFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </div>

                  {/* File List — expandable rows with audio preview */}
                  {files.length > 0 && (
                    <div className="space-y-2 max-h-[28rem] overflow-y-auto">
                      {files.map((f) => (
                        <FileRow
                          key={f.id}
                          file={f}
                          artists={artists}
                          narrators={narrators}
                          tariqas={tariqas}
                          funoon={funoon}
                          sharedMetadata={metadata}
                          isPreviewPlaying={
                            previewingId === f.id && isPreviewActuallyPlaying
                          }
                          previewProgress={
                            previewingId === f.id ? previewProgress : 0
                          }
                          onUpdateTitle={updateTitle}
                          onRemove={removeFile}
                          onSetOverride={setFileOverride}
                          onClearOverrides={clearFileOverrides}
                          onTogglePreview={() => togglePreview(f.id, f.file)}
                          onOpenAdvanced={setAdvancedEditingId}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Shared Metadata */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1 h-6 rounded-full bg-secondary" />
                  <h3 className="font-fustat font-bold text-base text-foreground">
                    البيانات المشتركة
                  </h3>
                  <span className="text-[10px] text-muted-foreground">
                    (تُطبّق على جميع الملفات)
                  </span>
                  {hasAnyOverrides && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[10px] text-amber-600 mr-auto"
                      onClick={applySharedToAll}
                    >
                      تطبيق على الكل
                    </Button>
                  )}
                </div>

                <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-4">
                  <div>
                    <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                      المادح *
                    </label>
                    <SearchableSelect
                      value={metadata.madihId}
                      onValueChange={(v) => {
                        const name = artists.find((a) => a.id === v)?.name || "";
                        setMetadata({ madihId: v, madihName: name });
                      }}
                      options={artists.map((a) => ({ value: a.id, label: a.name }))}
                      placeholder="اختر المادح"
                      searchPlaceholder="ابحث عن مادح..."
                    />
                  </div>

                  <div>
                    <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                      الراوي (اختياري)
                    </label>
                    <SearchableSelect
                      value={metadata.rawiId}
                      onValueChange={(v) => setMetadata({ rawiId: v })}
                      options={narrators.map((n) => ({ value: n.id, label: n.name }))}
                      placeholder="اختر الراوي"
                      searchPlaceholder="ابحث عن راوي..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                        الطريقة
                      </label>
                      <SearchableSelect
                        value={metadata.tariqaId}
                        onValueChange={(v) => setMetadata({ tariqaId: v })}
                        options={tariqas.map((t) => ({ value: t.id, label: t.name }))}
                        placeholder="اختر الطريقة..."
                        searchPlaceholder="ابحث عن طريقة..."
                      />
                    </div>
                    <div>
                      <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                        الفن
                      </label>
                      <SearchableSelect
                        value={metadata.fanId}
                        onValueChange={(v) => setMetadata({ fanId: v })}
                        options={funoon.map((f) => ({ value: f.id, label: f.name }))}
                        placeholder="اختر الفن..."
                        searchPlaceholder="ابحث عن فن..."
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-fustat text-muted-foreground mb-1 block">
                      مكان التسجيل
                    </label>
                    <Input
                      value={metadata.recordingPlace}
                      onChange={(e) => setMetadata({ recordingPlace: e.target.value })}
                      placeholder="مثال: أمدرمان، حجر العسل، الخرطوم..."
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Phase: Uploading / Completed ── */}
          {phase === "uploading" && (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 rounded-full bg-secondary" />
                <h3 className="font-fustat font-bold text-base text-foreground">
                  {isComplete ? "نتيجة الرفع" : "جاري الرفع..."}
                </h3>
              </div>

              <div className="bg-muted/30 rounded-2xl border border-border p-5 space-y-4">
                {/* Overall Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-fustat text-muted-foreground">
                    <span>
                      {completedCount + failedCount} من {totalCount}
                    </span>
                    <span>{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2" />
                  {isComplete && (
                    <div className="flex items-center gap-3 mt-2">
                      {completedCount > 0 && (
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                          <CheckCircle2 className="h-3 w-3 ml-1" />
                          {completedCount} نجحت
                        </Badge>
                      )}
                      {failedCount > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          <XCircle className="h-3 w-3 ml-1" />
                          {failedCount} فشلت
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Per-file status */}
                <div className="space-y-2 max-h-72 overflow-y-auto">
                  {files.map((f) => (
                    <div
                      key={f.id}
                      className={`rounded-xl border p-3 ${
                        f.status === "completed"
                          ? "bg-emerald-500/5 border-emerald-500/20"
                          : f.status === "failed"
                          ? "bg-destructive/5 border-destructive/20"
                          : "bg-background border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon status={f.status} />
                        <span className="flex-1 text-sm font-fustat truncate">
                          {f.title}
                        </span>
                        {f.status === "failed" && f.error && (
                          <span className="text-[10px] text-destructive truncate max-w-[150px]">
                            {f.error}
                          </span>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            f.status === "completed"
                              ? "text-emerald-600 border-emerald-500/30"
                              : f.status === "failed"
                              ? "text-destructive border-destructive/30"
                              : f.status === "uploading" || f.status === "saving"
                              ? "text-primary border-primary/30"
                              : "text-muted-foreground"
                          }`}
                        >
                          {f.status === "queued" && "في الانتظار"}
                          {f.status === "uploading" && "جاري الرفع"}
                          {f.status === "saving" && "جاري الحفظ"}
                          {f.status === "completed" && "تم"}
                          {f.status === "failed" && "فشل"}
                        </Badge>
                      </div>
                      {/* Metadata row — shown for completed & failed files */}
                      {(f.status === "completed" || f.status === "failed") && (
                        <div className="flex items-center gap-2 mt-1.5 mr-6 flex-wrap">
                          {f.madhaId && (
                            <Badge variant="outline" className="text-[10px] font-mono text-muted-foreground gap-1">
                              ID: {f.madhaId.slice(0, 8)}
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]" dir="ltr">
                            {f.originalFilename}
                          </span>
                          {f.audioUrl && (
                            <span className="text-[10px] text-muted-foreground font-mono truncate max-w-[200px]" dir="ltr">
                              {f.audioUrl}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 gap-2">
          {phase === "selection" && (
            <>
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
              >
                إلغاء
              </Button>
              <Button
                onClick={handleStartUpload}
                disabled={
                  files.length === 0 ||
                  files.some((f) => !f.overrides.madihId && !metadata.madihId)
                }
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                بدء الرفع ({files.length} ملف)
              </Button>
            </>
          )}

          {phase === "uploading" && !isComplete && (
            <Button
              variant="destructive"
              onClick={cancelUpload}
              className="gap-1.5"
            >
              <X className="h-3.5 w-3.5" />
              إلغاء الرفع
            </Button>
          )}

          {phase === "uploading" && isComplete && (
            <>
              {failedCount > 0 && (
                <Button
                  variant="outline"
                  onClick={retryFailed}
                  className="gap-1.5"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  إعادة المحاولة ({failedCount})
                </Button>
              )}
              <Button
                variant="outline"
                onClick={handleUploadMore}
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" />
                رفع المزيد
              </Button>
              <Button onClick={() => handleClose(false)}>
                إغلاق
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Advanced Editing Dialog */}
    <Dialog open={!!advancedEditingId} onOpenChange={(o) => { if (!o) setAdvancedEditingId(null); }}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="font-fustat text-lg">تفاصيل إضافية</DialogTitle>
        </DialogHeader>
        {advancedFile && (
          <div className="space-y-4 py-2">
            <div className="flex justify-between items-center bg-muted p-2 rounded-lg mb-2">
              <span className="text-sm font-semibold truncate text-foreground">{advancedFile.title}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-muted-foreground shrink-0"
                onClick={() => clearFileOverrides(advancedFile.id)}
              >
                إعادة للمشترك
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
               <div className="col-span-2">
                 <label className="text-xs font-fustat text-muted-foreground mb-1 block">كلمات المدحة</label>
                 <textarea
                   className="w-full min-h-[120px] text-sm p-3 rounded-xl border border-border bg-background focus:ring-2 focus:ring-primary/20 outline-none resize-y"
                   value={advancedFile.overrides.lyrics ?? ""}
                   onChange={(e) => setFileOverride(advancedFile.id, { lyrics: e.target.value })}
                   placeholder="اكتب كلمات المدحة هنا..."
                 />
               </div>
               <div>
                  <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">
                    الطريقة
                  </label>
                  <SearchableSelect
                    value={advancedFile.overrides.tariqaId || ""}
                    onValueChange={(v) => setFileOverride(advancedFile.id, { tariqaId: v })}
                    options={tariqas.map((t) => ({ value: t.id, label: t.name }))}
                    placeholder={metadata.tariqaId ? tariqas.find((t) => t.id === metadata.tariqaId)?.name : "اختر الطريقة..."}
                    searchPlaceholder="ابحث عن طريقة..."
                    triggerClassName="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">
                    الفن
                  </label>
                  <SearchableSelect
                    value={advancedFile.overrides.fanId || ""}
                    onValueChange={(v) => setFileOverride(advancedFile.id, { fanId: v })}
                    options={funoon.map((f) => ({ value: f.id, label: f.name }))}
                    placeholder={metadata.fanId ? funoon.find((f) => f.id === metadata.fanId)?.name : "اختر الفن..."}
                    searchPlaceholder="ابحث عن فن..."
                    triggerClassName="h-8 text-xs"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">
                    مكان التسجيل
                  </label>
                  <Input
                    value={advancedFile.overrides.recordingPlace ?? ""}
                    onChange={(e) => setFileOverride(advancedFile.id, { recordingPlace: e.target.value })}
                    placeholder={metadata.recordingPlace || "مكان التسجيل..."}
                    className="h-8 text-sm"
                  />
                </div>
            </div>
            <DialogFooter className="mt-4">
              <Button className="w-full font-fustat" onClick={() => setAdvancedEditingId(null)}>
                حفظ وإغلاق
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
