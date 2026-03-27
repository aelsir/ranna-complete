import { Copy, Check, MessageCircle } from "lucide-react";
import { RannaIcon } from "@/components/icons/RannaIcon";
import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import {
  shareNative,
  canShareNative,
  getWhatsAppShareUrl,
  getTelegramShareUrl,
} from "@/lib/share";

interface ShareButtonProps {
  url: string;
  title: string;
  text?: string;
  variant?: "ghost" | "outline" | "secondary";
  size?: "icon" | "sm" | "default";
  className?: string;
}

export function ShareButton({
  url,
  title,
  text,
  variant = "ghost",
  size = "icon",
  className = "",
}: ShareButtonProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const shareText = text || title;

  const handleShare = useCallback(async () => {
    if (canShareNative()) {
      await shareNative(title, shareText, url);
    }
  }, [title, shareText, url]);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({ title: "تم النسخ", description: "تم نسخ الرابط" });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "خطأ", description: "لم يتم نسخ الرابط", variant: "destructive" });
    }
  }, [url, toast]);

  // On mobile, use native share directly
  if (canShareNative()) {
    return (
      <Button
        variant={variant}
        size={size}
        className={`text-muted-foreground hover:text-foreground ${className}`}
        onClick={handleShare}
      >
        <RannaIcon name="share" size={20} />
      </Button>
    );
  }

  // On desktop, show dropdown with options
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={`text-muted-foreground hover:text-foreground ${className}`}
        >
          <RannaIcon name="share" size={20} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="font-fustat text-sm min-w-[180px]" dir="rtl">
        <DropdownMenuItem onClick={handleCopy} className="gap-2 cursor-pointer">
          {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
          نسخ الرابط
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <a href={getWhatsAppShareUrl(shareText, url)} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="h-4 w-4" />
            مشاركة عبر واتساب
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="gap-2 cursor-pointer">
          <a href={getTelegramShareUrl(shareText, url)} target="_blank" rel="noopener noreferrer">
            <RannaIcon name="share" size={16} />
            مشاركة عبر تيليجرام
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
