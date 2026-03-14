import { useState, useMemo } from "react";
import { Search, X, Mic, BookOpen } from "lucide-react";
import { RtlPlay } from "@/components/icons/rtl-icons";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import artist1 from "@/assets/artist-1.jpg";
import artist2 from "@/assets/artist-2.jpg";
import artist3 from "@/assets/artist-3.jpg";
import artist4 from "@/assets/artist-4.jpg";
import narrator1 from "@/assets/narrator-1.jpg";
import narrator2 from "@/assets/narrator-2.jpg";
import narrator3 from "@/assets/narrator-3.jpg";
import narrator4 from "@/assets/narrator-4.jpg";

type ResultType = "مدحة" | "مادح" | "راوي";

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  type: ResultType;
  image?: string;
}

const allData: SearchResult[] = [
  { id: "t1", title: "يا رسول الله يا نبينا", subtitle: "الشيخ أحمد البرعي", type: "مدحة" },
  { id: "t2", title: "صلوا على خير الأنام", subtitle: "الشيخ محمد الأمين", type: "مدحة" },
  { id: "t3", title: "مولاي صلي وسلم", subtitle: "فرقة الذاكرين", type: "مدحة" },
  { id: "t4", title: "طلع البدر علينا", subtitle: "أبو آمنة حامد", type: "مدحة" },
  { id: "t5", title: "قمر سيدنا النبي", subtitle: "الشيخ أحمد البرعي", type: "مدحة" },
  { id: "t6", title: "يا إلهي يا رحمن", subtitle: "فرقة الذاكرين", type: "مدحة" },
  { id: "t7", title: "يا حبيبي يا محمد", subtitle: "الشيخ محمد الأمين", type: "مدحة" },
  { id: "t8", title: "نور النبي أضاء", subtitle: "أبو آمنة حامد", type: "مدحة" },
  { id: "a1", title: "الشيخ أحمد البرعي", subtitle: "مادح", type: "مادح", image: artist1 },
  { id: "a2", title: "الشيخ محمد الأمين", subtitle: "مادح", type: "مادح", image: artist2 },
  { id: "a3", title: "فرقة الذاكرين", subtitle: "فرقة مدائح", type: "مادح", image: artist3 },
  { id: "a4", title: "أبو آمنة حامد", subtitle: "مادح", type: "مادح", image: artist4 },
  { id: "n1", title: "الشيخ عبد الرحيم البرعي", subtitle: "راوي", type: "راوي", image: narrator1 },
  { id: "n2", title: "الشيخ حسن الفاتح", subtitle: "راوي", type: "راوي", image: narrator2 },
  { id: "n3", title: "محمد المصطفى", subtitle: "راوي", type: "راوي", image: narrator3 },
  { id: "n4", title: "الشيخ إبراهيم الكباشي", subtitle: "راوي", type: "راوي", image: narrator4 },
];

const typeIcon: Record<ResultType, React.ReactNode> = {
  مدحة: <RtlPlay className="h-3 w-3" />,
  مادح: <Mic className="h-3 w-3" />,
  راوي: <BookOpen className="h-3 w-3" />,
};

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const SearchOverlay = ({ open, onClose }: SearchOverlayProps) => {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<ResultType | "الكل">("الكل");

  const filters: (ResultType | "الكل")[] = ["الكل", "مدحة", "مادح", "راوي"];

  const results = useMemo(() => {
    if (!query.trim()) return [];
    return allData.filter((item) => {
      const matchesQuery = item.title.includes(query) || item.subtitle.includes(query);
      const matchesFilter = activeFilter === "الكل" || item.type === activeFilter;
      return matchesQuery && matchesFilter;
    });
  }, [query, activeFilter]);

  const groupedResults = useMemo(() => {
    const groups: Partial<Record<ResultType, SearchResult[]>> = {};
    results.forEach((r) => {
      if (!groups[r.type]) groups[r.type] = [];
      groups[r.type]!.push(r);
    });
    return groups;
  }, [results]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-lg"
        >
          <div className="mx-auto max-w-2xl px-6 pt-6">
            <div className="flex items-center gap-3 rounded-full border border-border bg-card px-5 py-1.5">
              <Search className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <Input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ابحث عن مدحة، مادح أو راوي..."
                className="flex-1 border-0 bg-transparent font-naskh text-base shadow-none focus-visible:ring-0 placeholder:text-muted-foreground/60"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => { setQuery(""); onClose(); }}
                className="flex-shrink-0 h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mt-4 flex gap-2">
              {filters.map((f) => (
                <Button
                  key={f}
                  variant={activeFilter === f ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setActiveFilter(f)}
                  className="rounded-full font-fustat text-sm font-bold"
                >
                  {f}
                </Button>
              ))}
            </div>

            <div className="mt-6 max-h-[70vh] overflow-y-auto pb-8 scrollbar-hide">
              {query.trim() && results.length === 0 && (
                <p className="py-12 text-center text-muted-foreground font-naskh">
                  لا توجد نتائج لـ "{query}"
                </p>
              )}

              {!query.trim() && (
                <p className="py-12 text-center text-muted-foreground font-naskh">
                  ابدأ بالكتابة للبحث...
                </p>
              )}

              {(Object.entries(groupedResults) as [ResultType, SearchResult[]][]).map(
                ([type, items], groupIdx) => (
                  <div key={type} className="mb-6">
                    {groupIdx > 0 && <Separator className="mb-4" />}
                    <h3 className="mb-3 font-fustat text-sm font-bold text-muted-foreground">
                      {type === "مدحة" ? "المدائح" : type === "مادح" ? "المادحون" : "الراوون"}
                    </h3>
                    <div className="space-y-1">
                      {items.map((item, i) => (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, x: 10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.2, delay: i * 0.03 }}
                          className="flex items-center gap-3 rounded-lg p-3 cursor-pointer hover:bg-muted transition-colors group"
                        >
                          {item.image ? (
                            <Avatar className={`h-11 w-11 ${item.type === "مادح" ? "rounded-full" : "rounded-md"}`}>
                              <AvatarImage src={item.image} alt={item.title} className="object-cover" />
                              <AvatarFallback>{item.title[0]}</AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-muted flex-shrink-0 text-accent">
                              <RtlPlay className="h-4 w-4" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-fustat font-bold truncate">{item.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.subtitle}</p>
                          </div>
                          <Badge variant="secondary" className="flex items-center gap-1 font-fustat">
                            {typeIcon[item.type]}
                            {item.type}
                          </Badge>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SearchOverlay;
