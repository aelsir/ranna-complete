import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, ZoomIn } from "lucide-react";

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
  uploading?: boolean;
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<File> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;

  // Output 800x800 square
  const size = Math.min(800, pixelCrop.width);
  canvas.width = size;
  canvas.height = size;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    size,
    size
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error("Canvas is empty"));
        resolve(new File([blob], "cover.jpg", { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.9
    );
  });
}

export default function ImageCropDialog({
  open,
  imageSrc,
  onClose,
  onCropComplete,
  uploading = false,
}: ImageCropDialogProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropDone = useCallback(
    (_: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    const croppedFile = await getCroppedImg(imageSrc, croppedAreaPixels);
    onCropComplete(croppedFile);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !uploading && onClose()}>
      <DialogContent className="max-w-md p-0 overflow-hidden" dir="rtl">
        <DialogHeader className="px-5 pt-5 pb-0">
          <DialogTitle className="font-fustat text-center">
            قص الصورة
          </DialogTitle>
          <p className="text-xs text-muted-foreground text-center">
            حرّك الصورة وكبّرها لاختيار الجزء المربع
          </p>
        </DialogHeader>

        <div className="relative w-full aspect-square bg-black/90">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="rect"
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropDone}
          />
        </div>

        <div className="px-5 pb-2 flex items-center gap-3">
          <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={(v) => setZoom(v[0])}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground font-mono w-10 text-center">
            {zoom.toFixed(1)}x
          </span>
        </div>

        <DialogFooter className="px-5 pb-5 gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={uploading}
          >
            إلغاء
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={uploading || !croppedAreaPixels}
            className="gap-1.5"
          >
            {uploading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                جاري الرفع...
              </>
            ) : (
              "قص ورفع"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
