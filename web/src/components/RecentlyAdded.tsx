import { useMadhaat } from "@/lib/api/hooks";
import { Card, CardContent } from "@/components/ui/card";
import TrackRow from "@/components/TrackRow";
import { TrackQueueProvider } from "@/context/TrackQueueContext";

const RecentlyAdded = () => {
  const { data: tracks, isLoading, error } = useMadhaat({
    limit: 5,
    orderBy: "created_at",
    ascending: false,
  });

  if (error) {
    console.error("RecentlyAdded query error:", error);
    return (
      <section className="py-10">
        <div className="flex items-center justify-between px-5 mb-5 md:px-12">
          <h2 className="font-panorama text-xl font-bold">أضيفت مؤخراً</h2>
        </div>
        <div className="px-5 md:px-12 text-center text-red-500 py-8">
          حدث خطأ أثناء تحميل المدائح: {error instanceof Error ? error.message : "خطأ غير معروف"}
        </div>
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="py-10">
        <div className="flex items-center justify-between px-5 mb-5 md:px-12">
          <h2 className="font-panorama text-xl font-bold">أضيفت مؤخراً</h2>
        </div>
        <div className="px-5 md:px-12 text-center text-muted-foreground py-8">
          جاري التحميل...
        </div>
      </section>
    );
  }

  if (!tracks || tracks.length === 0) {
    return null;
  }

  return (
    <section className="py-10">
      <div className="flex items-center justify-between px-5 mb-5 md:px-12">
        <h2 className="font-panorama text-xl font-bold">أضيفت مؤخراً</h2>
      </div>
      <div className="px-5 md:px-12">
        <Card className="rounded-2xl shadow-card border-border/20 overflow-hidden">
          <CardContent className="p-2">
            {/* Single wrap → all rows below auto-advance through this list. */}
            <TrackQueueProvider trackIds={tracks.map((t) => t.id)}>
              {tracks.map((track, i) => (
                <div key={track.id}>
                  <TrackRow track={track} index={i} />
                  {i < tracks.length - 1 && <div className="h-px bg-border/30 mx-3" />}
                </div>
              ))}
            </TrackQueueProvider>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default RecentlyAdded;
