import { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { RtlPlay } from "@/components/icons/rtl-icons";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useSearch, useMadiheen, useRuwat } from "@/lib/api/hooks";
import { getImageUrl } from "@/lib/format";
import { arabicIncludes } from "@/lib/arabic";
import { usePlayer } from "@/context/PlayerContext";

type ResultType = "مدحة" | "مادح" | "راوي";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: ResultType;
  image?: string;
  linkTo?: string;
}

const SearchPage = () => {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ResultType | "الكل">("الكل");
  const navigate = useNavigate();
  const { playTrack } = usePlayer();

  const filters: (ResultType | "الكل")[] = ["الكل", "مدحة", "مادح", "راوي"];

  // Supabase search for tracks (debounced via React Query — only fires when query has content)
  const { data: searchResults = [] } = useSearch(query);

  // Full lists for client-side name filtering
  const { data: madiheen = [] } = useMadiheen();
  const { data: ruwat = [] } = useRuwat();

  const allData: SearchResult[] = useMemo(() => {
    if (!query.trim()) return [];

    const trackResults: SearchResult[] = searchResults.map((m) => ({
      id: m.id,
      title: m.title,
      subtitle:
        ((m as any).madiheen?.name || m.madih) +
        " · " +
        ((m as any).ruwat?.name || m.writer),
      type: "مدحة" as ResultType,
      image: getImageUrl((m as any).image_url || (m as any).madiheen?.image_url),
    }));

    const artistResults: SearchResult[] = madiheen
      .filter((a) => arabicIncludes(a.name, query))
      .map((a) => ({
        id: a.id,
        title: a.name,
        subtitle: "مادح",
        type: "مادح" as ResultType,
        image: getImageUrl(a.image_url),
        linkTo: "/profile/artist/" + a.id,
      }));

    const narratorResults: SearchResult[] = ruwat
      .filter((n) => arabicIncludes(n.name, query))
      .map((n) => ({
        id: n.id,
        title: n.name,
        subtitle: "راوي",
        type: "راوي" as ResultType,
        image: getImageUrl(n.image_url),
        linkTo: "/profile/narrator/" + n.id,
      }));

    return [...trackResults, ...artistResults, ...narratorResults];
  }, [query, searchResults, madiheen, ruwat]);

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

  const handleResultClick = (item: SearchResult) => {
    if (item.type === "مدحة") {
      // Play the track — build a queue from all track results
      const trackIds = results
        .filter((r) => r.type === "مدحة")
        .map((r) => r.id);
      playTrack(item.id, trackIds);
    } else if (item.linkTo) {
      navigate(item.linkTo);
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
          placeholder="ابحث عن مدحة، مادح أو راوي..."
          className="flex-1 border-0 bg-transparent font-naskh text-base shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/50"
        />
      </div>

      <div className="mt-3 flex gap-2.5">
        {filters.map((f) => (
          <Button
            key={f}
            variant={activeFilter === f ? "default" : "secondary"}
            size="sm"
            onClick={() => setActiveFilter(f)}
            className={`rounded-full font-fustat text-xs font-bold ${activeFilter === f ? "shadow-sm" : ""}`}
          >
            {f}
          </Button>
        ))}
      </div>

      <div className="mt-5">
        {query.trim() && results.length === 0 && (
          <p className="py-16 text-center text-sm text-muted-foreground font-naskh">
            لا توجد نتائج لـ "{query}"
          </p>
        )}

        {!query.trim() && (
          <p className="py-16 text-center text-sm text-muted-foreground font-naskh">
            ابدأ بالكتابة للبحث...
          </p>
        )}

        {Object.keys(groupedResults).length > 0 && (
          <Card className="rounded-2xl shadow-card border-border/20 overflow-hidden">
            <CardContent className="p-2">
              {(Object.entries(groupedResults) as [ResultType, SearchResult[]][]).map(
                ([type, items], groupIdx) => (
                  <div key={type} className="mb-2">
                    {groupIdx > 0 && <Separator className="mb-3 mt-1" />}
                    <h3 className="mb-2 px-2 font-fustat text-xs font-bold text-muted-foreground">
                      {type === "مدحة" ? "المدائح" : type === "مادح" ? "المادحون" : "الراوون"}
                    </h3>
                    <div className="space-y-0.5">
                      {items.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: 8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.15, delay: i * 0.02 }}
                          onClick={() => handleResultClick(item)}
                          className="flex items-center gap-3 rounded-xl px-2 py-2.5 cursor-pointer hover:bg-muted/60 active:scale-[0.98] transition-all"
                        >
                          {item.image ? (
                            <Avatar className={`h-10 w-10 ${item.type === "مادح" ? "rounded-full" : "rounded-xl"}`}>
                              <AvatarImage src={item.image} alt={item.title} className="object-cover" />
                              <AvatarFallback>{item.title[0]}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted flex-shrink-0 text-accent">
                              <RtlPlay className="h-3.5 w-3.5" fill="currentColor" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-fustat text-sm font-bold truncate">{item.title}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{item.subtitle}</p>
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
