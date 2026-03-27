import { useState, useMemo } from "react";
import { Search, BookOpen } from "lucide-react";
import { RtlPlay } from "@/components/icons/rtl-icons";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useSearchAll } from "@/lib/api/hooks";
import { getImageUrl } from "@/lib/format";
import { normalizeArabic } from "@/lib/arabic";
import { usePlayer } from "@/context/PlayerContext";

type ResultType = "مدحة" | "مادح" | "راوي" | "كلمات";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: ResultType;
  image?: string;
  linkTo?: string;
  lyricsSnippet?: string;
}

/**
 * Extract a short snippet around the first match of `query` in `lyrics`.
 */
function extractLyricsSnippet(lyrics: string | undefined | null, query: string): string | null {
  if (!lyrics || !query.trim()) return null;

  const normalizedLyrics = normalizeArabic(lyrics);
  const normalizedQuery = normalizeArabic(query);
  const idx = normalizedLyrics.indexOf(normalizedQuery);
  if (idx === -1) return null;

  const contextChars = 40;
  const start = Math.max(0, idx - contextChars);
  const end = Math.min(lyrics.length, idx + query.length + contextChars);

  let snippet = lyrics.slice(start, end).replace(/\n/g, " ").trim();
  if (start > 0) snippet = "..." + snippet;
  if (end < lyrics.length) snippet = snippet + "...";

  return snippet;
}

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ResultType | "الكل">("الكل");
  const navigate = useNavigate();
  const { playTrack } = usePlayer();

  const filters: (ResultType | "الكل")[] = ["الكل", "مدحة", "كلمات", "مادح", "راوي"];

  // Single RPC call — Arabic normalization happens server-side
  const { data: searchData } = useSearchAll(query);

  const allData: SearchResult[] = useMemo(() => {
    if (!query.trim() || !searchData) return [];

    const trackResults: SearchResult[] = (searchData.tracks || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      subtitle:
        (m.madiheen?.name || m.madih || "") +
        " · " +
        (m.ruwat?.name || m.writer || ""),
      type: "مدحة" as ResultType,
      image: getImageUrl(m.image_url || m.madiheen?.image_url),
    }));

    const lyricsResults: SearchResult[] = (searchData.lyrics || []).map((m: any) => ({
      id: m.id,
      title: m.title,
      subtitle:
        (m.madiheen?.name || m.madih || "") +
        " · " +
        (m.ruwat?.name || m.writer || ""),
      type: "كلمات" as ResultType,
      image: getImageUrl(m.image_url || m.madiheen?.image_url),
      lyricsSnippet: extractLyricsSnippet(m.lyrics, query),
    }));

    const artistResults: SearchResult[] = (searchData.artists || []).map((a: any) => ({
      id: a.id,
      title: a.name,
      subtitle: `مادح · ${a.track_count || 0} مدحة`,
      type: "مادح" as ResultType,
      image: getImageUrl(a.image_url),
      linkTo: "/profile/artist/" + a.id,
    }));

    const narratorResults: SearchResult[] = (searchData.narrators || []).map((n: any) => ({
      id: n.id,
      title: n.name,
      subtitle: `راوي · ${n.track_count || 0} مدحة`,
      type: "راوي" as ResultType,
      image: getImageUrl(n.image_url),
      linkTo: "/profile/narrator/" + n.id,
    }));

    return [...trackResults, ...lyricsResults, ...artistResults, ...narratorResults];
  }, [query, searchData]);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    if (activeFilter === "الكل") return allData;
    return allData.filter((item) => item.type === activeFilter);
  }, [query, activeFilter, allData]);

  const groupedResults = useMemo(() => {
    const groups: Partial<Record<ResultType, SearchResult[]>> = {};
    results.forEach((r) => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type]!.push(r);
    });
    return groups;
  }, [results]);

  const typeCounts = useMemo(() => {
    const counts: Partial<Record<ResultType, number>> = {};
    allData.forEach((r) => {
      counts[r.type] = (counts[r.type] || 0) + 1;
    });
    return counts;
  }, [allData]);

  const handleResultClick = (item: SearchResult) => {
    if (item.type === "مدحة" || item.type === "كلمات") {
      const trackIds = results
        .filter((r) => r.type === "مدحة" || r.type === "كلمات")
        .map((r) => r.id);
      playTrack(item.id, trackIds);
    } else if (item.linkTo) {
      navigate(item.linkTo);
    }
  };

  const groupLabel = (type: ResultType) => {
    switch (type) {
      case "مدحة": return "المدائح";
      case "كلمات": return "نتائج من الكلمات";
      case "مادح": return "المادحون";
      case "راوي": return "الراوون";
    }
  };

  return (
    <div className="px-5 pt-5 pb-5 md:px-12">
      <h2 className="mb-4 font-fustat text-xl font-bold">البحث</h2>

      <div className="flex items-center gap-3 rounded-2xl bg-muted px-4 py-2 shadow-sm ring-1 ring-border/20 focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="ابحث عن مدحة، مادح، راوي أو كلمات..."
          className="flex-1 border-0 bg-transparent font-naskh text-base shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="mt-3 flex gap-2.5 overflow-x-auto">
        {filters.map((f) => {
          const count = f === "الكل" ? allData.length : (typeCounts[f as ResultType] || 0);
          const hasResults = count > 0;
          return (
            <Button
              key={f}
              variant={activeFilter === f ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveFilter(f)}
              className={`rounded-full font-fustat text-xs font-bold whitespace-nowrap ${activeFilter === f ? "shadow-sm" : ""} ${!hasResults && query.trim() ? "opacity-50" : ""}`}
            >
              {f}
              {query.trim() && hasResults && (
                <span className="mr-1 text-[10px] opacity-70">({count})</span>
              )}
            </Button>
          );
        })}
      </div>

      <div className="mt-5">
        {query.trim() && results.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground font-naskh">
            لا توجد نتائج لـ "{query}"
          </p>
        )}

        {!query.trim() && (
          <p className="py-16 text-center text-sm text-muted-foreground font-naskh">
            ابدأ بالكتابة للبحث في المدائح والكلمات...
          </p>
        )}

        {Object.keys(groupedResults).length > 0 && (
          <Card className="rounded-2xl shadow-card border-border/20 overflow-hidden">
            <CardContent className="p-2">
              {(Object.entries(groupedResults) as [ResultType, SearchResult[]][]).map(
                ([type, items], groupIdx) => (
                  <div key={type} className="mb-2">
                    {groupIdx > 0 && <Separator className="mb-3 mt-1" />}
                    <h3 className="mb-2 px-2 font-fustat text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                      {type === "كلمات" && <BookOpen className="h-3 w-3" />}
                      {groupLabel(type)}
                    </h3>
                    <div className="space-y-0.5">
                      {items.map((item, i) => (
                        <motion.div
                          key={item.id + "-" + type}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15, delay: i * 0.02 }}
                          onClick={() => handleResultClick(item)}
                          className="flex items-center gap-3 rounded-xl px-2 py-2.5 cursor-pointer hover:bg-muted/60 active:scale-[0.98] transition-all"
                        >
                          {item.image ? (
                            <Avatar className={`h-10 w-10 ${item.type === "مادح" ? "rounded-full" : "rounded-xl"} flex-shrink-0`}>
                              <AvatarImage src={item.image} alt={item.title} className="object-cover" />
                              <AvatarFallback>{item.title[0]}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted flex-shrink-0 text-accent">
                              {type === "كلمات" ? (
                                <BookOpen className="h-3.5 w-3.5" />
                              ) : (
                                <RtlPlay className="h-3.5 w-3.5" fill="currentColor" />
                              )}
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-fustat text-sm font-bold truncate">{item.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
                            {item.lyricsSnippet && (
                              <p className="mt-0.5 text-[11px] text-muted-foreground/70 font-naskh line-clamp-2 leading-relaxed" dir="rtl">
                                «{item.lyricsSnippet}»
                              </p>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
