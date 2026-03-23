const SAMPLE_TITLE = "يا حبيبي يا رسول الله";
const SAMPLE_BODY = "صلى الله عليك يا نور الهدى والمرسلين، يا شفيع الخلق أجمعين، يا سيد المرسلين وخاتم النبيين، عليك أفضل الصلاة وأتم التسليم.";
const SAMPLE_VERSE = "طلع البدر علينا\nمن ثنيات الوداع\nوجب الشكر علينا\nما دعا لله داع";
const SAMPLE_HERO = "استمع لأجمل المدائح النبوية";
const SAMPLE_SHORT = "المادح: الشيخ نورين محمد صديق";
const SAMPLE_LYRICS = `يا رسول الله يا خير الورى\nيا شفيع الخلق يوم الحشر\nأنت نور الله أنت المصطفى\nأنت باب الله والمفتاح`;

const sizes = ["text-xs", "text-sm", "text-base", "text-lg", "text-xl", "text-2xl", "text-3xl", "text-4xl", "text-5xl"] as const;

function FontSpecimen({ fontClass, label, color }: { fontClass: string; label: string; color: string }) {
  return (
    <div className="space-y-4">
      <h3 className="font-fustat text-lg font-bold" style={{ color }}>{label}</h3>
      <div className="space-y-2">
        {sizes.map((size) => (
          <div key={size} className="flex items-baseline gap-3">
            <span className="text-[10px] font-fustat text-muted-foreground w-16 shrink-0">{size}</span>
            <p className={`${fontClass} ${size}`}>{SAMPLE_TITLE}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonCard({
  title,
  headingFont,
  bodyFont,
  accentFont,
  description,
  highlight,
}: {
  title: string;
  headingFont: string;
  bodyFont: string;
  accentFont?: string;
  description: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-2xl border p-6 space-y-4 ${highlight ? "border-secondary bg-secondary/5 ring-1 ring-secondary/20" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <h4 className="font-fustat text-sm font-bold text-primary">{title}</h4>
        {highlight && <span className="text-[10px] font-fustat font-bold bg-secondary text-primary px-2 py-0.5 rounded-full">موصى به</span>}
      </div>
      <p className="text-xs text-muted-foreground font-fustat">{description}</p>
      <div className="h-px bg-border" />

      {/* Heading sample */}
      <div>
        <span className="text-[10px] font-fustat text-muted-foreground/60 uppercase tracking-wider">عنوان</span>
        <h2 className={`${headingFont} text-2xl font-bold mt-1`}>{SAMPLE_TITLE}</h2>
      </div>

      {/* Body sample */}
      <div>
        <span className="text-[10px] font-fustat text-muted-foreground/60 uppercase tracking-wider">نص</span>
        <p className={`${bodyFont} text-sm leading-relaxed mt-1 text-muted-foreground`}>{SAMPLE_BODY}</p>
      </div>

      {/* Accent/Quote sample */}
      {accentFont && (
        <div className="bg-muted/50 rounded-xl p-4 border-r-2 border-secondary">
          <span className="text-[10px] font-fustat text-muted-foreground/60 uppercase tracking-wider">أبيات</span>
          <p className={`${accentFont} text-base leading-loose mt-1 whitespace-pre-line`}>{SAMPLE_VERSE}</p>
        </div>
      )}
    </div>
  );
}

function MockTrackRow({ headingFont, bodyFont }: { headingFont: string; bodyFont: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
        <span className="text-primary text-lg">♪</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className={`${headingFont} text-sm font-bold truncate`}>{SAMPLE_TITLE}</p>
        <p className={`${bodyFont} text-xs text-muted-foreground`}>{SAMPLE_SHORT}</p>
      </div>
      <span className="font-fustat text-xs text-muted-foreground/50 tabular-nums">٤:٣٢</span>
    </div>
  );
}

function MockSectionHeader({ headingFont, bodyFont }: { headingFont: string; bodyFont: string }) {
  return (
    <div className="space-y-1">
      <h2 className={`${headingFont} text-xl font-bold`}>الأكثر استماعاً</h2>
      <p className={`${bodyFont} text-xs text-muted-foreground`}>المدائح الأكثر استماعاً هذا الأسبوع</p>
    </div>
  );
}

function MockPlayerCard({ headingFont, bodyFont, lyricsFont }: { headingFont: string; bodyFont: string; lyricsFont: string }) {
  return (
    <div className="rounded-2xl bg-primary text-primary-foreground p-6 space-y-4">
      <div className="w-20 h-20 rounded-xl bg-white/10 mx-auto flex items-center justify-center">
        <span className="text-3xl">♪</span>
      </div>
      <div className="text-center space-y-1">
        <h3 className={`${headingFont} text-lg font-bold`}>{SAMPLE_TITLE}</h3>
        <p className={`${bodyFont} text-sm opacity-60`}>{SAMPLE_SHORT}</p>
      </div>
      <div className="bg-white/10 rounded-xl p-4">
        <p className={`${lyricsFont} text-sm leading-loose text-center whitespace-pre-line opacity-80`}>{SAMPLE_VERSE}</p>
      </div>
    </div>
  );
}

function MockHero({ headingFont, bodyFont }: { headingFont: string; bodyFont: string }) {
  return (
    <div className="rounded-2xl bg-gradient-to-bl from-primary to-primary/80 text-primary-foreground p-8 space-y-3">
      <span className="font-fustat text-[10px] font-bold uppercase tracking-wider opacity-60">رنّة</span>
      <h1 className={`${headingFont} text-3xl font-extrabold leading-tight`}>{SAMPLE_HERO}</h1>
      <p className={`${bodyFont} text-sm opacity-60 leading-relaxed`}>أكثر من ١٬٣٠٠ مدحة من أجمل المدائح النبوية السودانية</p>
    </div>
  );
}

function MockLyricsBlock({ lyricsFont }: { lyricsFont: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-3">
      <h4 className="font-fustat text-sm font-bold text-primary">كلمات المدحة</h4>
      <div className="h-px bg-border" />
      <p className={`${lyricsFont} text-base leading-[2.2] whitespace-pre-line text-foreground/80`}>{SAMPLE_LYRICS}</p>
    </div>
  );
}

export default function FontTestPage() {
  return (
    <div dir="rtl" className="min-h-screen bg-background p-4 pb-32 max-w-3xl mx-auto space-y-12">
      {/* Page header */}
      <div className="space-y-2 pt-8">
        <h1 className="font-fustat text-2xl font-extrabold text-primary">اختبار الخطوط</h1>
        <p className="font-fustat text-sm text-muted-foreground">مقارنة بين الخطوط المتاحة لمنصة رنّة</p>
      </div>

      {/* ═══════ Section 1: Font Specimens ═══════ */}
      <section className="space-y-8">
        <h2 className="font-fustat text-lg font-bold border-b border-border pb-2">١. عينات الخطوط</h2>
        <FontSpecimen fontClass="font-fustat" label="Fustat — فستات" color="hsl(184, 43%, 19%)" />
        <div className="h-px bg-border" />
        <FontSpecimen fontClass="font-naskh" label="Noto Naskh Arabic — نوتو نسخ" color="hsl(7, 100%, 70%)" />
        <div className="h-px bg-border" />
        <FontSpecimen fontClass="font-panorama" label="NTPanorama Naskh — بانوراما نسخ" color="hsl(73, 100%, 35%)" />
      </section>

      {/* ═══════ Section 2: Role Comparisons ═══════ */}
      <section className="space-y-6">
        <h2 className="font-fustat text-lg font-bold border-b border-border pb-2">٢. مقارنة التوزيع</h2>
        <div className="grid gap-4">
          <ComparisonCard
            title="الحالي — Fustat + Noto Naskh"
            headingFont="font-fustat"
            bodyFont="font-naskh"
            accentFont="font-naskh"
            description="العناوين بخط Fustat، النصوص والأبيات بخط Noto Naskh Arabic"
          />
          <ComparisonCard
            title="خيار أ — Fustat + NTPanorama"
            headingFont="font-fustat"
            bodyFont="font-panorama"
            accentFont="font-naskh"
            description="العناوين بخط Fustat، النصوص بخط NTPanorama، الأبيات بخط Noto Naskh"
          />
          <ComparisonCard
            title="خيار ب — NTPanorama + Fustat"
            headingFont="font-panorama"
            bodyFont="font-fustat"
            accentFont="font-naskh"
            description="العناوين بخط NTPanorama، النصوص بخط Fustat، الأبيات بخط Noto Naskh"
          />
          <ComparisonCard
            title="خيار ج — Fustat + NTPanorama (خطين فقط)"
            headingFont="font-fustat"
            bodyFont="font-panorama"
            description="العناوين بخط Fustat، كل شيء آخر بخط NTPanorama — بدون خط ثالث"
          />
          <ComparisonCard
            title="خيار د — NTPanorama للمحتوى الروحي + Fustat للواجهة"
            headingFont="font-fustat"
            bodyFont="font-fustat"
            accentFont="font-panorama"
            description="Fustat للعناوين والنصوص العامة، NTPanorama للأبيات والمحتوى الديني فقط"
            highlight
          />
        </div>
      </section>

      {/* ═══════ Section 3: Real UI Mockups ═══════ */}
      <section className="space-y-6">
        <h2 className="font-fustat text-lg font-bold border-b border-border pb-2">٣. محاكاة واجهة المستخدم</h2>

        {/* 3a: Current design */}
        <div className="space-y-3">
          <h3 className="font-fustat text-sm font-bold text-muted-foreground">الحالي — Fustat + Noto Naskh</h3>
          <MockHero headingFont="font-fustat" bodyFont="font-naskh" />
          <MockSectionHeader headingFont="font-fustat" bodyFont="font-naskh" />
          <MockTrackRow headingFont="font-fustat" bodyFont="font-naskh" />
          <MockTrackRow headingFont="font-fustat" bodyFont="font-naskh" />
          <MockPlayerCard headingFont="font-fustat" bodyFont="font-naskh" lyricsFont="font-naskh" />
          <MockLyricsBlock lyricsFont="font-naskh" />
        </div>

        <div className="h-px bg-border" />

        {/* 3b: Option D (recommended) */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h3 className="font-fustat text-sm font-bold text-muted-foreground">خيار د — NTPanorama للمحتوى الروحي</h3>
            <span className="text-[10px] font-fustat font-bold bg-secondary text-primary px-2 py-0.5 rounded-full">موصى به</span>
          </div>
          <MockHero headingFont="font-fustat" bodyFont="font-fustat" />
          <MockSectionHeader headingFont="font-fustat" bodyFont="font-fustat" />
          <MockTrackRow headingFont="font-fustat" bodyFont="font-fustat" />
          <MockTrackRow headingFont="font-fustat" bodyFont="font-fustat" />
          <MockPlayerCard headingFont="font-fustat" bodyFont="font-fustat" lyricsFont="font-panorama" />
          <MockLyricsBlock lyricsFont="font-panorama" />
        </div>

        <div className="h-px bg-border" />

        {/* 3c: Option A */}
        <div className="space-y-3">
          <h3 className="font-fustat text-sm font-bold text-muted-foreground">خيار أ — NTPanorama كنص أساسي</h3>
          <MockHero headingFont="font-fustat" bodyFont="font-panorama" />
          <MockSectionHeader headingFont="font-fustat" bodyFont="font-panorama" />
          <MockTrackRow headingFont="font-fustat" bodyFont="font-panorama" />
          <MockTrackRow headingFont="font-fustat" bodyFont="font-panorama" />
          <MockPlayerCard headingFont="font-fustat" bodyFont="font-panorama" lyricsFont="font-panorama" />
          <MockLyricsBlock lyricsFont="font-panorama" />
        </div>

        <div className="h-px bg-border" />

        {/* 3d: Option B — NTPanorama headings */}
        <div className="space-y-3">
          <h3 className="font-fustat text-sm font-bold text-muted-foreground">خيار ب — NTPanorama للعناوين</h3>
          <MockHero headingFont="font-panorama" bodyFont="font-fustat" />
          <MockSectionHeader headingFont="font-panorama" bodyFont="font-fustat" />
          <MockTrackRow headingFont="font-panorama" bodyFont="font-fustat" />
          <MockTrackRow headingFont="font-panorama" bodyFont="font-fustat" />
          <MockPlayerCard headingFont="font-panorama" bodyFont="font-fustat" lyricsFont="font-naskh" />
          <MockLyricsBlock lyricsFont="font-panorama" />
        </div>
      </section>

      {/* ═══════ Section 4: Recommendation ═══════ */}
      <section className="space-y-4">
        <h2 className="font-fustat text-lg font-bold border-b border-border pb-2">٤. التوصية</h2>
        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-6 space-y-3">
          <h3 className="font-fustat text-base font-bold text-primary">خيار د: ثلاثة خطوط بأدوار واضحة</h3>
          <div className="space-y-2 text-sm text-foreground/80">
            <div className="flex gap-2">
              <span className="font-fustat font-bold text-primary shrink-0">Fustat</span>
              <span className="font-fustat">— العناوين، الأزرار، التنقل، البيانات الوصفية. خط الواجهة الأساسي.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-panorama font-bold text-primary shrink-0">بانوراما</span>
              <span className="font-fustat">— الأبيات، كلمات المدائح، الاقتباسات، المحتوى الروحي. يعطي طابع تراثي مميز.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-naskh font-bold text-primary shrink-0">نوتو نسخ</span>
              <span className="font-fustat">— الخط الاحتياطي لبانوراما. يمكن استخدامه للنصوص الطويلة إذا لم يكن بانوراما مناسباً.</span>
            </div>
          </div>
          <div className="h-px bg-primary/10" />
          <p className="font-fustat text-xs text-muted-foreground leading-relaxed">
            هذا النهج يحافظ على نظافة الواجهة بخط Fustat الحديث، ويضيف طابعاً تراثياً مميزاً عند عرض المحتوى الديني بخط بانوراما نسخ.
            الفصل بين خط الواجهة وخط المحتوى يجعل التجربة أكثر احترافية ويميز رنّة عن المنصات الأخرى.
          </p>
        </div>
      </section>
    </div>
  );
}
