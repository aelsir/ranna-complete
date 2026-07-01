import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Trash2,
  Upload,
  Filter,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SidebarItem, MappedArtist, MappedNarrator } from "./dashboard-types";
import { AUDIO_QUALITY_META, LYRICS_STATUS_META, SECTION_CONTENT_TYPE, SECTION_LABELS } from "./dashboard-types";

interface Props {
  activeSection: SidebarItem;
  isContentSection: boolean;
  isEditMode: boolean;

  // Selection counts
  selectedTrackCount: number;
  selectedMadiheenCount: number;
  selectedRuwatCount: number;

  // Search & filter state
  searchQuery: string;
  onSearchChange: (q: string) => void;
  showFilters: boolean;
  onToggleFilters: () => void;
  filterArtist: string;
  onFilterArtistChange: (v: string) => void;
  filterNarrator: string;
  onFilterNarratorChange: (v: string) => void;
  filterLyricsStatus: string;
  onFilterLyricsStatusChange: (v: string) => void;
  filterAudioQuality: string;
  onFilterAudioQualityChange: (v: string) => void;
  activeFilterCount: number;
  onClearFilters: () => void;

  // Sort
  sortBy: "created_at" | "play_count";
  sortAscending: boolean;
  onSortChange: (field: "created_at" | "play_count") => void;

  // Reference data for filter dropdowns
  artists: MappedArtist[];
  narrators: MappedNarrator[];

  // Actions
  onAdd: () => void;
  onBulkUpload: () => void;
  onFindReplace: () => void;
  onDeleteMadiheen: () => void;
  onDeleteRuwat: () => void;
}

export function DashboardHeader({
  activeSection,
  isContentSection,
  isEditMode,
  selectedTrackCount,
  selectedMadiheenCount,
  selectedRuwatCount,
  searchQuery,
  onSearchChange,
  showFilters,
  onToggleFilters,
  filterArtist,
  onFilterArtistChange,
  filterNarrator,
  onFilterNarratorChange,
  filterLyricsStatus,
  onFilterLyricsStatusChange,
  filterAudioQuality,
  onFilterAudioQualityChange,
  activeFilterCount,
  onClearFilters,
  artists,
  narrators,
  onAdd,
  onBulkUpload,
  onFindReplace,
  onDeleteMadiheen,
  onDeleteRuwat,
}: Props) {
  const sectionLabels = SECTION_LABELS[activeSection];
  // lyrics_review reuses the whole track-list pipeline (search, filters,
  // pagination) minus the content-management actions (add / bulk upload).
  const isTrackSection = isContentSection || activeSection === "lyrics_review";

  return (
    <>
      {/* Top Bar */}
      <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-fustat font-bold text-lg text-foreground">
            {activeSection === "analytics"
              ? "إحصائيات المنصة"
              : activeSection === "lyrics_review"
              ? "مراجعة الكلمات"
              : isContentSection
                ? `إدارة ${sectionLabels?.plural || "المحتوى"}`
                : activeSection === "madiheen"
                  ? "إدارة المادحين"
                  : activeSection === "ruwat"
                    ? "إدارة الرواة"
                    : activeSection === "hero_images"
                      ? "صور الواجهة"
                      : "إدارة القوائم المميزة"}
          </h2>
          {selectedTrackCount > 0 && isContentSection && (
            <Badge variant="secondary" className="text-xs">{selectedTrackCount} محدد</Badge>
          )}
          {selectedMadiheenCount > 0 && activeSection === "madiheen" && (
            <Badge variant="secondary" className="text-xs">{selectedMadiheenCount} محدد</Badge>
          )}
          {selectedRuwatCount > 0 && activeSection === "ruwat" && (
            <Badge variant="secondary" className="text-xs">{selectedRuwatCount} محدد</Badge>
          )}
        </div>
        <div className="flex items-center gap-2 relative z-10">
          {isContentSection && !isEditMode && (
            <Button
              variant="outline"
              size="sm"
              className="!gap-1.5 text-xs font-fustat"
              onClick={onFindReplace}
            >
              <Search className="h-3.5 w-3.5" />
              بحث واستبدال
            </Button>
          )}
          {selectedMadiheenCount > 0 && activeSection === "madiheen" && (
            <Button variant="destructive" size="sm" className="gap-1.5 text-xs" onClick={onDeleteMadiheen}>
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </Button>
          )}
          {selectedRuwatCount > 0 && activeSection === "ruwat" && (
            <Button variant="destructive" size="sm" className="gap-1.5 text-xs" onClick={onDeleteRuwat}>
              <Trash2 className="h-3.5 w-3.5" />
              حذف
            </Button>
          )}
          {isContentSection && (
            <Button variant="outline" size="sm" className="!gap-1.5 text-xs font-fustat" onClick={onBulkUpload}>
              <Upload className="h-3.5 w-3.5" />
              {sectionLabels?.uploadBulk || "رفع مجمّع"}
            </Button>
          )}
          {activeSection !== "hero_images" && activeSection !== "analytics" && activeSection !== "lyrics_review" && (
            <Button
              size="sm"
              className="!gap-1.5 bg-primary hover:bg-primary/90 text-xs font-fustat"
              onClick={onAdd}
            >
              <Plus className="h-3.5 w-3.5" />
              {isContentSection
                ? sectionLabels?.uploadSingle || "إضافة محتوى"
                : activeSection === "madiheen"
                  ? "إضافة مادح"
                  : activeSection === "ruwat"
                    ? "إضافة راوي"
                    : "إنشاء قائمة"}
            </Button>
          )}
        </div>
      </header>

      {/* Search + Filters */}
      {activeSection !== "analytics" && activeSection !== "hero_images" && (
        <div className="px-6 py-3 border-b border-border bg-card/50 space-y-3">
          <div className="flex items-center gap-2 relative z-10">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن مدحة، مادح، أو راوي..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pr-9 h-9 text-sm bg-background"
              />
            </div>
            {isTrackSection && (
              <Button
                variant={showFilters ? "default" : "outline"}
                size="sm"
                className="gap-1.5 text-xs shrink-0"
                onClick={onToggleFilters}
              >
                <Filter className="h-3.5 w-3.5" />
                فلاتر
                {activeFilterCount > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] rounded-full ms-1">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            )}
          </div>

          {/* Advanced Filters */}
          {showFilters && isTrackSection && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap items-end gap-3"
            >
              <div className="w-44">
                <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">المادح</label>
                <SearchableSelect
                  value={filterArtist}
                  onValueChange={onFilterArtistChange}
                  options={[{ value: "", label: "الكل" }, ...artists.map((a) => ({ value: a.id, label: a.name }))]}
                  placeholder="الكل"
                  searchPlaceholder="ابحث عن مادح..."
                  triggerClassName="h-8 text-xs font-fustat"
                />
              </div>
              <div className="w-44">
                <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">الراوي</label>
                <SearchableSelect
                  value={filterNarrator}
                  onValueChange={onFilterNarratorChange}
                  options={[{ value: "", label: "الكل" }, ...narrators.map((n) => ({ value: n.id, label: n.name }))]}
                  placeholder="الكل"
                  searchPlaceholder="ابحث عن راوي..."
                  triggerClassName="h-8 text-xs font-fustat"
                />
              </div>
              <div className="w-40">
                <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">حالة الكلمات</label>
                <Select value={filterLyricsStatus} onValueChange={(v) => onFilterLyricsStatusChange(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {(Object.keys(LYRICS_STATUS_META) as (keyof typeof LYRICS_STATUS_META)[]).map((status) => (
                      <SelectItem key={status} value={status}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2.5 w-4 rounded-sm ${LYRICS_STATUS_META[status].color}`} />
                          {LYRICS_STATUS_META[status].label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-40">
                <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">جودة الصوت</label>
                <Select value={filterAudioQuality} onValueChange={(v) => onFilterAudioQualityChange(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    {(Object.keys(AUDIO_QUALITY_META) as (keyof typeof AUDIO_QUALITY_META)[]).map((quality) => (
                      <SelectItem key={quality} value={quality}>
                        <span className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${AUDIO_QUALITY_META[quality].color}`} />
                          {AUDIO_QUALITY_META[quality].label}
                        </span>
                      </SelectItem>
                    ))}
                    <SelectItem value="unrated">غير مقيّمة</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1 text-xs text-muted-foreground h-8"
                  onClick={onClearFilters}
                >
                  <RotateCcw className="h-3 w-3" />
                  مسح الفلاتر
                </Button>
              )}
            </motion.div>
          )}
        </div>
      )}
    </>
  );
}
