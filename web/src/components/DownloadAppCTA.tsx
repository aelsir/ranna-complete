import { useEffect, useState } from "react";
import { Apple } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getMobilePlatform, type MobilePlatform } from "@/lib/getMobilePlatform";
import { trackEvent } from "@/lib/analytics";

const APP_STORE_URL =
  "https://apps.apple.com/gb/app/%D8%B1%D9%86%D8%A9-%D9%84%D9%84%D9%85%D8%AF%D8%A7%D8%A6%D8%AD-%D8%A7%D9%84%D9%86%D8%A8%D9%88%D9%8A%D8%A9/id6761441761";
const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=ranna.aelsir.me";

const BUTTON_BASE_CLASSES =
  "rounded-full gap-2.5 font-fustat font-bold shadow-glow-secondary hover:shadow-glow-secondary hover:scale-[1.03] active:scale-[0.97] transition-all duration-200";

const GooglePlayIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={className}
    fill="currentColor"
  >
    <path d="M3.609 1.814 13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893 2.302 2.302-10.27 5.846 7.968-8.148zm3.434-3.434 2.823 1.605c.764.434.764 1.534 0 1.968l-2.823 1.605-2.387-2.394 2.387-2.784zM5.531 1.376l10.27 5.847-2.301 2.302-7.969-8.149z" />
  </svg>
);

interface StoreLinkProps {
  store: "ios" | "android";
  detectedPlatform: MobilePlatform;
  size: "lg" | "default";
  label: string;
  icon: React.ReactNode;
  href: string;
}

const StoreLink = ({
  store,
  detectedPlatform,
  size,
  label,
  icon,
  href,
}: StoreLinkProps) => (
  <Button
    asChild
    variant="secondary"
    size={size}
    className={`${BUTTON_BASE_CLASSES} ${size === "lg" ? "px-7" : "px-5"}`}
  >
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() =>
        trackEvent("download_app_click", {
          store,
          source: "hero_cta",
          detected_platform: detectedPlatform,
        })
      }
    >
      {icon}
      {label}
    </a>
  </Button>
);

const DownloadAppCTA = () => {
  const [platform, setPlatform] = useState<MobilePlatform>("other");

  useEffect(() => {
    setPlatform(getMobilePlatform());
  }, []);

  if (platform === "ios") {
    return (
      <StoreLink
        store="ios"
        detectedPlatform={platform}
        size="lg"
        label="تحميل من App Store"
        icon={<Apple className="h-4 w-4" strokeWidth={2.5} />}
        href={APP_STORE_URL}
      />
    );
  }

  if (platform === "android") {
    return (
      <StoreLink
        store="android"
        detectedPlatform={platform}
        size="lg"
        label="تحميل من Google Play"
        icon={<GooglePlayIcon className="h-4 w-4" />}
        href={PLAY_STORE_URL}
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-3">
      <StoreLink
        store="ios"
        detectedPlatform={platform}
        size="default"
        label="App Store"
        icon={<Apple className="h-4 w-4" strokeWidth={2.5} />}
        href={APP_STORE_URL}
      />
      <StoreLink
        store="android"
        detectedPlatform={platform}
        size="default"
        label="Google Play"
        icon={<GooglePlayIcon className="h-4 w-4" />}
        href={PLAY_STORE_URL}
      />
    </div>
  );
};

export default DownloadAppCTA;
