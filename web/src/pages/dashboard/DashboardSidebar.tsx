import {
  Music,
  ListMusic,
  Home,
  LogOut,
  GalleryHorizontal,
  BarChart3,
  LibraryBig,
  Book,
  Shell,
  Podcast,
  AudioLines,
  PenTool,
} from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { SidebarItem } from "./dashboard-types";

interface Props {
  activeSection: SidebarItem;
  onSectionChange: (section: SidebarItem) => void;
  signOut: () => Promise<void>;
  contentTypeCounts?: Record<string, number>;
  artistCount: number;
  narratorCount: number;
  playlistCount: number;
}

type SidebarEntry =
  | { divider: true }
  | { id: SidebarItem; label: string; icon: React.ElementType; count?: number };

export function DashboardSidebar({
  activeSection,
  onSectionChange,
  signOut,
  contentTypeCounts,
  artistCount,
  narratorCount,
  playlistCount,
}: Props) {
  const sidebarItems: SidebarEntry[] = [
    { id: "madhat", label: "المدائح", icon: Music, count: contentTypeCounts?.["madha"] },
    { id: "quran", label: "القرآن", icon: Book, count: contentTypeCounts?.["quran"] },
    { id: "lectures", label: "الدروس", icon: LibraryBig, count: contentTypeCounts?.["lecture"] },
    { id: "dhikr", label: "الأذكار", icon: Shell, count: contentTypeCounts?.["dhikr"] },
    { id: "inshad", label: "الإنشاد", icon: Podcast, count: contentTypeCounts?.["inshad"] },
    { divider: true },
    { id: "madiheen", label: "المادحين", icon: AudioLines, count: artistCount },
    { id: "ruwat", label: "الرواة", icon: PenTool, count: narratorCount },
    { id: "playlists", label: "قوائم مميزة", icon: ListMusic, count: playlistCount },
    { id: "hero_images", label: "صور الواجهة", icon: GalleryHorizontal },
    { divider: true },
    { id: "analytics", label: "الإحصائيات", icon: BarChart3 },
  ];

  return (
    <aside className="w-64 border-l border-border bg-card flex flex-col shrink-0">
      <div className="p-5 border-b border-border">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="h-9 w-9 rounded-xl bg-primary flex items-center justify-center">
            <Music className="h-4.5 w-4.5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-fustat font-bold text-base text-foreground leading-tight">لوحة التحكم</h1>
            <p className="text-[10px] text-muted-foreground">إدارة محتوى رنّة</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-1">
        {sidebarItems.map((item, idx) => {
          if ("divider" in item && item.divider) {
            return <div key={`divider-${idx}`} className="my-1.5 border-t border-border" />;
          }
          const navItem = item as Exclude<SidebarEntry, { divider: true }>;
          return (
            <button
              key={navItem.id}
              onClick={() => onSectionChange(navItem.id)}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-fustat transition-all duration-200 ${
                activeSection === navItem.id
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <navItem.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-start">{navItem.label}</span>
              {navItem.count != null && (
                <Badge
                  variant={activeSection === navItem.id ? "secondary" : "outline"}
                  className="text-[10px] h-5 px-1.5 rounded-md"
                >
                  {navItem.count}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border space-y-1">
        <Link to="/">
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground text-xs">
            <Home className="h-3.5 w-3.5" />
            العودة للتطبيق
          </Button>
        </Link>
        <Button variant="ghost" size="sm" onClick={signOut} className="w-full justify-start gap-2 text-muted-foreground text-xs">
          <LogOut className="h-3.5 w-3.5" />
          تسجيل الخروج
        </Button>
      </div>
    </aside>
  );
}
