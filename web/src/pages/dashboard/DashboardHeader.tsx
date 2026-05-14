import { motion } from "framer-motion";
import {
  Search,
  Plus,
  Trash2,
  Upload,
  Filter,
  Headphones,
  CalendarIcon,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/ui/searchable-select";
import type { SidebarItem, MappedArtist, MappedNarrator, MappedTariqa } from "./dashboard-types";
import { SECTION_CONTENT_TYPE, SECTION_LABELS } from "./dashboard-types";

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
  filterTariqa: string;
  onFilterTariqaChange: (v: string) => void;
  filterDateRange: string;
  onFilterDateRangeChange: (v: string) => void;
  filterPlayCount: string;
  onFilterPlayCountChange: (v: string) => void;
  activeFilterCount: number;
  onClearFilters: () => void;

  // Sort
  sortBy: "created_at" | "play_count";
  sortAscending: boolean;
  onSortChange: (field: "created_at" | "play_count") => void;

  // Reference data for filter dropdowns
  artists: MappedArtist[];
  narrators: MappedNarrator[];
  tariqas: MappedTariqa[];

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
  filterTariqa,
  onFilterTariqaChange,
  filterDateRange,
  onFilterDateRangeChange,
  filterPlayCount,
  onFilterPlayCountChange,
  activeFilterCount,
  onClearFilters,
  artists,
  narrators,
  tariqas,
  onAdd,
  onBulkUpload,
  onFindReplace,
  onDeleteMadiheen,
  onDeleteRuwat,
}: Props) {
  const sectionLabels = SECTION_LABELS[activeSection];

  return (
    <>
      {/* Top Bar */}
      <header className="h-16 border-b border-border bg-card px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <h2 className="font-fustat font-bold text-lg text-foreground">
            {activeSection === "analytics"
              ? "إحصائيات المنصة"
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
          {activeSection !== "hero_images" && activeSection !== "analytics" && (
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
            {isContentSection && (
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
          {showFilters && isContentSection && (
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
                <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">الطريقة</label>
                <SearchableSelect
                  value={filterTariqa}
                  onValueChange={onFilterTariqaChange}
                  options={[{ value: "", label: "الكل" }, ...tariqas.map((tq) => ({ value: tq.name, label: tq.name }))]}
                  placeholder="الكل"
                  searchPlaceholder="ابحث عن طريقة..."
                  triggerClassName="h-8 text-xs font-fustat"
                />
              </div>
              <div className="w-36">
                <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">
                  <CalendarIcon className="h-3 w-3 inline-block me-1 opacity-60" />
                  زمن التحديث
                </label>
                <Select value={filterDateRange} onValueChange={(v) => onFilterDateRangeChange(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="today">اليوم</SelectItem>
                    <SelectItem value="week">آخر أسبوع</SelectItem>
                    <SelectItem value="month">آخر شهر</SelectItem>
                    <SelectItem value="older">أقدم من شهر</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="w-36">
                <label className="text-[10px] font-fustat text-muted-foreground mb-1 block">
                  <Headphones className="h-3 w-3 inline-block me-1 opacity-60" />
                  مرات التشغيل
                </label>
                <Select value={filterPlayCount} onValueChange={(v) => onFilterPlayCountChange(v === "all" ? "" : v)}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder="الكل" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">الكل</SelectItem>
                    <SelectItem value="0">لم تُشغّل</SelectItem>
                    <SelectItem value="low">أقل من ١٠٠</SelectItem>
                    <SelectItem value="mid">١٠٠ - ١٠٠٠</SelectItem>
                    <SelectItem value="high">أكثر من ١٠٠٠</SelectItem>
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
