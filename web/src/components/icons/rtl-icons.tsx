import { Play, SkipBack, SkipForward, type LucideProps } from "lucide-react";
import { cn } from "@/lib/utils";

export const RtlPlay = ({ className, ...props }: LucideProps) => (
  <Play className={cn("rotate-180", className)} {...props} />
);

export const RtlSkipBack = ({ className, ...props }: LucideProps) => (
  <SkipBack className={cn("rotate-180", className)} {...props} />
);

export const RtlSkipForward = ({ className, ...props }: LucideProps) => (
  <SkipForward className={cn("rotate-180", className)} {...props} />
);
