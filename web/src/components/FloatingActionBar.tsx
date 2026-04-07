import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Edit3,
  Search,
  Trash2,
  Loader2,
  Save,
  MoreHorizontal,
  ImagePlus,
  Clipboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface FloatingActionBarProps {
  selectedCount: number;
  isEditMode: boolean;
  changeCount: number;
  isSaving: boolean;
  isDeleting: boolean;
  onInlineEdit: () => void;
  onFindReplace: () => void;
  onDelete: () => void;
  onClearSelection: () => void;
  onSave: () => void;
  onCancel: () => void;
  onBulkFieldEdit: (field: string) => void;
  onPasteImage: () => void;
}

export function FloatingActionBar({
  selectedCount,
  isEditMode,
  changeCount,
  isSaving,
  isDeleting,
  onInlineEdit,
  onFindReplace,
  onDelete,
  onClearSelection,
  onSave,
  onCancel,
  onBulkFieldEdit,
  onPasteImage,
}: FloatingActionBarProps) {
  return (
    <AnimatePresence>
      {(selectedCount > 0 || isEditMode) && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
        >
          <div className="flex items-center gap-2 bg-card border border-border rounded-2xl shadow-2xl px-4 py-2.5 backdrop-blur-sm">
            {isEditMode ? (
              /* ── Edit Mode Bar ── */
              <>
                <Badge
                  variant={changeCount > 0 ? "default" : "secondary"}
                  className="text-xs font-fustat px-2.5 py-0.5"
                >
                  {changeCount > 0
                    ? `${changeCount} تعديل`
                    : "لا توجد تعديلات"}
                </Badge>

                <div className="w-px h-6 bg-border mx-1" />

                <Button
                  size="sm"
                  className="gap-1.5 text-xs font-fustat"
                  disabled={changeCount === 0 || isSaving}
                  onClick={onSave}
                >
                  {isSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Save className="h-3.5 w-3.5" />
                  )}
                  {isSaving ? "جاري الحفظ..." : "حفظ الكل"}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs font-fustat text-muted-foreground"
                  disabled={isSaving}
                  onClick={onCancel}
                >
                  إلغاء
                </Button>
              </>
            ) : (
              /* ── Selection Mode Bar ── */
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={onClearSelection}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>

                <Badge variant="secondary" className="text-xs font-fustat px-2.5 py-0.5 shrink-0">
                  {selectedCount} محدد
                </Badge>

                <div className="w-px h-6 bg-border mx-1" />

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-fustat"
                  onClick={onInlineEdit}
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  تعديل مباشر
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-fustat"
                  onClick={onFindReplace}
                >
                  <Search className="h-3.5 w-3.5" />
                  بحث واستبدال
                </Button>

                <div className="w-px h-6 bg-border mx-1" />

                <Button
                  variant="destructive"
                  size="sm"
                  className="gap-1.5 text-xs font-fustat"
                  disabled={isDeleting}
                  onClick={onDelete}
                >
                  {isDeleting ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                  حذف
                </Button>

                {/* Overflow menu for less common bulk actions */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="font-fustat text-xs">
                    <DropdownMenuItem onClick={() => onBulkFieldEdit("artistId")}>
                      تغيير المادح للجميع
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBulkFieldEdit("narratorId")}>
                      تغيير الراوي للجميع
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBulkFieldEdit("tariqa")}>
                      تغيير الطريقة للجميع
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBulkFieldEdit("fan")}>
                      تغيير الفن للجميع
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onBulkFieldEdit("contentType")}>
                      تغيير نوع المحتوى للجميع
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onPasteImage}>
                      <ImagePlus className="h-3.5 w-3.5 me-2" />
                      لصق صورة للجميع
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
