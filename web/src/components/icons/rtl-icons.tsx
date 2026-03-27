/**
 * RTL icon wrappers — kept for backward compatibility.
 * New code should use <RannaIcon name="play" /> directly.
 */

import { RannaIcon } from "./RannaIcon";

interface IconProps {
  className?: string;
  size?: number;
  fill?: string;
  [key: string]: any;
}

export const RtlPlay = ({ className, size, ...props }: IconProps) => (
  <RannaIcon name="play" size={size} className={className} />
);

export const RtlSkipBack = ({ className, size, ...props }: IconProps) => (
  <RannaIcon name="back-track" size={size} className={className} />
);

export const RtlSkipForward = ({ className, size, ...props }: IconProps) => (
  <RannaIcon name="forward-track" size={size} className={className} />
);
