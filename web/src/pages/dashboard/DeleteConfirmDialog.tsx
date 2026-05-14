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

interface DeleteInfo {
  type: "tracks" | "madiheen" | "ruwat";
}

interface Props {
  confirm: DeleteInfo | null;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  title: string;
  description: string;
}

export function DeleteConfirmDialog({
  confirm,
  onClose,
  onConfirm,
  isPending,
  title,
  description,
}: Props) {
  return (
    <AlertDialog open={!!confirm} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent dir="rtl" className="font-fustat">
        <AlertDialogHeader>
          <AlertDialogTitle className="font-fustat text-base">{title}</AlertDialogTitle>
          <AlertDialogDescription className="font-fustat text-sm leading-relaxed">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row-reverse gap-2">
          <AlertDialogCancel className="font-fustat text-xs" disabled={isPending}>
            إلغاء
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 font-fustat text-xs"
            disabled={isPending}
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? "جاري الحذف..." : "تأكيد الحذف"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
