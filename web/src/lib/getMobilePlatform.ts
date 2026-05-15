export type MobilePlatform = "ios" | "android" | "other";

export function getMobilePlatform(
  ua: string = typeof navigator !== "undefined" ? navigator.userAgent : "",
  platform: string = typeof navigator !== "undefined" ? navigator.platform || "" : "",
  maxTouchPoints: number = typeof navigator !== "undefined" ? navigator.maxTouchPoints || 0 : 0,
): MobilePlatform {
  if (!ua) return "other";

  if (/android/i.test(ua)) return "android";

  if (/iPad|iPhone|iPod/.test(ua)) return "ios";

  // iPadOS 13+ identifies as "Mac" — disambiguate via touch support.
  if (/Mac/i.test(platform) && maxTouchPoints > 1) return "ios";

  return "other";
}
