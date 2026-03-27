/**
 * Centralized icon registry using custom SVG assets.
 *
 * Usage:
 *   <RannaIcon name="play" size={24} className="text-white" />
 *
 * To change an icon: replace the SVG file in src/assets/icons/
 * To add a new icon: add the SVG file + import it here + add to `icons` map
 *
 * Rotation variants (RTL support):
 *   <RannaIcon name="play" size={24} />           — rotated 180° (points right for RTL play)
 *   <RannaIcon name="back" size={24} />            — left-arrow rotated 180° (back in RTL)
 *   <RannaIcon name="chevron-down" size={24} />    — left-arrow rotated -90° (points down)
 *   <RannaIcon name="left-arrow" size={24} />      — original left-pointing arrow
 */

import type { SVGProps, FC } from "react";
import { cn } from "@/lib/utils";

// Import all SVG icons as React components
import PlayIcon from "@/assets/icons/play.svg?react";
import PauseIcon from "@/assets/icons/pause.svg?react";
import BackTrackIcon from "@/assets/icons/back-track.svg?react";
import ForwardTrackIcon from "@/assets/icons/forward-track.svg?react";
import Backward15Icon from "@/assets/icons/backward-fifteen-sec.svg?react";
import Forward15Icon from "@/assets/icons/forward-fifteen-sec.svg?react";
import LoveIcon from "@/assets/icons/love.svg?react";
import ShareIcon from "@/assets/icons/share.svg?react";
import SearchIcon from "@/assets/icons/search.svg?react";
import HomeIcon from "@/assets/icons/home.svg?react";
import LyricsIcon from "@/assets/icons/lyrics.svg?react";
import RepeatIcon from "@/assets/icons/repeat.svg?react";
import ShuffleIcon from "@/assets/icons/shuffle.svg?react";
import TimerIcon from "@/assets/icons/timer.svg?react";
import SettingIcon from "@/assets/icons/setting.svg?react";
import ProfileIcon from "@/assets/icons/profile.svg?react";
import LeftArrowIcon from "@/assets/icons/left-arrow.svg?react";
import DownloadIcon from "@/assets/icons/download.svg?react";
import FullSoundIcon from "@/assets/icons/full-sound.svg?react";
import LessSoundIcon from "@/assets/icons/less-sound.svg?react";
import MuteIcon from "@/assets/icons/mute.svg?react";

type SvgComponent = FC<SVGProps<SVGSVGElement>>;

/** Base icon definitions — SVG component + optional default rotation */
const iconDefs: Record<string, { component: SvgComponent; rotate?: string }> = {
  // Player controls
  "play": { component: PlayIcon, rotate: "rotate-180" },
  "pause": { component: PauseIcon },
  "back-track": { component: BackTrackIcon },
  "forward-track": { component: ForwardTrackIcon },
  "backward-15": { component: Backward15Icon },
  "forward-15": { component: Forward15Icon },
  "shuffle": { component: ShuffleIcon },
  "repeat": { component: RepeatIcon },
  "timer": { component: TimerIcon },

  // Actions
  "love": { component: LoveIcon },
  "share": { component: ShareIcon },
  "lyrics": { component: LyricsIcon },
  "download": { component: DownloadIcon },

  // Navigation
  "home": { component: HomeIcon },
  "search": { component: SearchIcon },
  "profile": { component: ProfileIcon },
  "setting": { component: SettingIcon },
  "left-arrow": { component: LeftArrowIcon },
  "back": { component: LeftArrowIcon, rotate: "rotate-180" },
  "chevron-down": { component: LeftArrowIcon, rotate: "-rotate-90" },

  // Volume
  "volume-full": { component: FullSoundIcon },
  "volume-low": { component: LessSoundIcon },
  "volume-mute": { component: MuteIcon },
};

export type RannaIconName = keyof typeof iconDefs;

interface RannaIconProps {
  name: RannaIconName;
  size?: number;
  className?: string;
  /** Override the default fill behavior. By default icons use currentColor. */
  fill?: string;
  strokeWidth?: number;
}

export function RannaIcon({ name, size = 24, className, fill, strokeWidth }: RannaIconProps) {
  const def = iconDefs[name];
  if (!def) {
    console.warn(`[RannaIcon] Unknown icon: ${name}`);
    return null;
  }

  const { component: Icon, rotate } = def;

  return (
    <Icon
      width={size}
      height={size}
      className={cn(rotate, className)}
      fill={fill}
      strokeWidth={strokeWidth}
    />
  );
}

/** List all available icon names (useful for debugging/documentation) */
export const iconNames = Object.keys(iconDefs) as RannaIconName[];
