import { useEffect, useState } from "react";
import appStoreBadge from "@/assets/icons/apple-store-badge-logo.svg";
import playStoreBadge from "@/assets/icons/google-play-badge-logo.svg";
import { getMobilePlatform, type MobilePlatform } from "@/lib/getMobilePlatform";
import { trackEvent } from "@/lib/analytics";

const APP_STORE_URL =
  "https://apps.apple.com/gb/app/%D8%B1%D9%86%D8%A9-%D9%84%D9%84%D9%85%D8%AF%D8%A7%D8%A6%D8%AD-%D8%A7%D9%84%D9%86%D8%A8%D9%88%D9%8A%D8%A9/id6761441761";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=ranna.aelsir.me";

interface BadgeLinkProps {
  store: "ios" | "android";
  detectedPlatform: MobilePlatform;
  href: string;
  src: string;
  alt: string;
  className: string;
}

const BadgeLink = ({
  store,
  detectedPlatform,
  href,
  src,
  alt,
  className,
}: BadgeLinkProps) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    aria-label={alt}
    onClick={() =>
      trackEvent("download_app_click", {
        store,
        source: "hero_cta",
        detected_platform: detectedPlatform,
      })
    }
    className="inline-block transition-transform duration-200 hover:scale-[1.04] active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-md"
  >
    <img src={src} alt={alt} className={className} draggable={false} />
  </a>
);

const DownloadAppCTA = () => {
  const [platform, setPlatform] = useState<MobilePlatform>("other");

  useEffect(() => {
    setPlatform(getMobilePlatform());
  }, []);

  if (platform === "ios") {
    return (
      <BadgeLink
        store="ios"
        detectedPlatform={platform}
        href={APP_STORE_URL}
        src={appStoreBadge}
        alt="حمّل التطبيق من App Store"
        className="h-14 w-auto"
      />
    );
  }

  if (platform === "android") {
    return (
      <BadgeLink
        store="android"
        detectedPlatform={platform}
        href={PLAY_STORE_URL}
        src={playStoreBadge}
        alt="حمّل التطبيق من Google Play"
        className="h-14 w-auto"
      />
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <BadgeLink
        store="ios"
        detectedPlatform={platform}
        href={APP_STORE_URL}
        src={appStoreBadge}
        alt="حمّل التطبيق من App Store"
        className="h-12 w-auto"
      />
      <BadgeLink
        store="android"
        detectedPlatform={platform}
        href={PLAY_STORE_URL}
        src={playStoreBadge}
        alt="حمّل التطبيق من Google Play"
        className="h-12 w-auto"
      />
    </div>
  );
};

export default DownloadAppCTA;
