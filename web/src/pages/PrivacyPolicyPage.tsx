import { useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

const PrivacyPolicyPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pb-20 md:pb-0" dir="rtl">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pt-24 md:pt-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-card rounded-2xl border border-border p-6 md:p-10 shadow-sm"
        >
          {/* Arabic Section */}
          <section className="mb-16">
            <h1 className="text-3xl font-bold font-fustat mb-4 text-primary">سياسة الخصوصية</h1>
            <p className="text-sm text-muted-foreground mb-8">تاريخ آخر تحديث: 1 أبريل 2026</p>

            <div className="space-y-6 text-foreground font-fustat leading-relaxed">
              <p>
                تلتزم "رنّة" ("نحن" أو "لنا") بحماية خصوصيتك. توضح سياسة الخصوصية هذه كيفية جمع معلوماتك الشخصية واستخدامها والإفصاح عنها بواسطة تطبيق رنّة.
              </p>
              <p>
                من خلال تنزيل تطبيق رنّة أو الوصول إليه أو استخدامه، فإنك تقر بأنك قد قرأت وفهمت ووافقت على جمعنا لمعلوماتك الشخصية وتخزينها واستخدامها والإفصاح عنها كما هو موضح في سياسة الخصوصية هذه.
              </p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">1. المعلومات التي نجمعها</h2>
              <p>نحن نحد من جمع المعلومات الشخصية بما هو ضروري لعمل التطبيق بشكل صحيح:</p>
              <ul className="list-disc list-inside space-y-2 pr-4 text-muted-foreground">
                <li><strong className="text-foreground">معلومات الحساب:</strong> إذا اخترت إنشاء حساب، فإننا نجمع عنوان بريدك الإلكتروني وتفاصيل المصادقة لتأمين حسابك ومزامنة تفضيلاتك (تتم إدارتها عبر Supabase).</li>
                <li><strong className="text-foreground">بيانات الاستخدام والتحليلات:</strong> قد نجمع بيانات استخدام مجهولة المصدر (مثل التفاعلات مع التطبيق، الميزات المستخدمة، وتقارير الأعطال) لمساعدتنا في فهم كيفية استخدام التطبيق وتحسين أدائه.</li>
                <li><strong className="text-foreground">بيانات الجهاز المحلية:</strong> يتم تخزين المقاطع التي قمت بتنزيلها، وسجل الاستماع، والعناصر المفضلة محليًا على جهازك لتمكين وظيفة الاستماع بدون إنترنت وتوفير تجربة مخصصة.</li>
                <li><strong className="text-foreground">أذونات الجهاز:</strong>
                  <ul className="list-circle list-inside pr-8 mt-2">
                    <li><strong className="text-foreground">الميكروفون / الصوت:</strong> يستخدم التطبيق مكتبات صوتية للتشغيل والمعالجة في الخلفية. على الرغم من أن شركة Apple تتطلب وجود وصف لاستخدام الميكروفون بسبب هذه المكتبات الأساسية، <strong className="text-foreground">إلا أننا لا نقوم بتسجيل أو الاستماع أو جمع أي صوت من ميكروفون جهازك بأي شكل من الأشكال.</strong></li>
                  </ul>
                </li>
              </ul>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">2. كيف نستخدم معلوماتك</h2>
              <p>نحن نستخدم المعلومات التي نجمعها من أجل:</p>
              <ul className="list-disc list-inside space-y-2 pr-4 text-muted-foreground">
                <li>توفير تطبيق رنّة وصيانته وتحسينه.</li>
                <li>تمكين البث الصوتي وميزات التشغيل في الخلفية.</li>
                <li>السماح لك بمزامنة مفضلاتك وتفضيلاتك عبر الأجهزة (في حال تسجيل الدخول).</li>
                <li>تحليل أنماط الاستخدام لتعزيز تجربة المستخدم.</li>
                <li>الرد على استفسارات دعم العملاء.</li>
              </ul>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">3. خدمات الأطراف الثالثة</h2>
              <p>قد نشارك معلوماتك مع مزودي الخدمات من الأطراف الثالثة الذين يساعدوننا في تشغيل التطبيق:</p>
              <ul className="list-disc list-inside space-y-2 pr-4 text-muted-foreground">
                <li><strong className="text-foreground">Supabase:</strong> يُستخدم لمصادقة المستخدمين وإدارة قاعدة البيانات بشكل آمن.</li>
                <li><strong className="text-foreground">مزودو التحليلات:</strong> قد نستخدم خدمات (مثل Posthog) لتحليل استخدام التطبيق. تقوم هذه الخدمات بجمع البيانات بشكل مجهول.</li>
                <li><strong className="text-foreground">Apple (آبل) و Google (جوجل):</strong> نظرًا لكونه تطبيق هاتف، قد يتم جمع بعض بيانات الاستخدام وتقارير الأعطال بواسطة Apple أو Google وفقًا لسياسات الخصوصية الخاصة بهم.</li>
              </ul>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">4. أمن البيانات</h2>
              <p>نحن ننفذ تدابير أمنية معقولة لحماية معلوماتك الشخصية. يتم التعامل مع المصادقة ومزامنة البيانات بشكل آمن. ومع ذلك، يرجى العلم بأنه لا توجد طريقة نقل عبر الإنترنت أو تخزين إلكتروني آمنة بنسبة 100%.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">5. خياراتك</h2>
              <ul className="list-disc list-inside space-y-2 pr-4 text-muted-foreground">
                <li><strong className="text-foreground">حذف الحساب:</strong> يمكنك المطالبة بحذف حسابك والبيانات المرتبطة به عن طريق الاتصال بنا أو استخدام خيار حذف الحساب داخل التطبيق.</li>
                <li><strong className="text-foreground">البيانات المحلية:</strong> يمكنك مسح المقاطع التي تم تنزيلها والبيانات المحلية عن طريق إلغاء تثبيت التطبيق أو استخدام الإعدادات داخل التطبيق (إن وجدت).</li>
              </ul>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">6. التغييرات على سياسة الخصوصية هذه</h2>
              <p>قد نقوم بتحديث سياسة الخصوصية هذه من وقت لآخر. سنعلمك بأي تغييرات عن طريق نشر سياسة الخصوصية الجديدة داخل التطبيق والموقع.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">7. اتصل بنا</h2>
              <p>إذا كان لديك أي أسئلة حول سياسة الخصوصية هذه، يرجى التواصل معنا.</p>
            </div>
          </section>

          <hr className="border-border my-12" />

          {/* English Section */}
          <section className="text-left" dir="ltr">
            <h1 className="text-3xl font-bold mb-4 text-primary">Privacy Policy</h1>
            <p className="text-sm text-muted-foreground mb-8">Last Updated: April 1, 2026</p>

            <div className="space-y-6 text-foreground leading-relaxed">
              <p>
                Ranna ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how your personal information is collected, used, and disclosed by the Ranna app.
              </p>
              <p>
                By downloading, accessing, or using the Ranna app, you signify that you have read, understood, and agree to our collection, storage, use, and disclosure of your personal information as described in this Privacy Policy.
              </p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">1. Information We Collect</h2>
              <p>We limit the collection of personal information to what is necessary for the app to function properly:</p>
              <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                <li><strong className="text-foreground">Account Information:</strong> If you choose to create an account, we collect your email address and authentication details to secure your account and sync your preferences (managed via Supabase).</li>
                <li><strong className="text-foreground">Usage Data & Analytics:</strong> We may collect anonymous usage data (such as app interactions, features used, and crash reports) to help us understand how the app is used and to improve its performance.</li>
                <li><strong className="text-foreground">Local Device Data:</strong> Your downloaded tracks, listening history, and favorite items are stored locally on your device to enable offline functionality and a personalized experience.</li>
                <li><strong className="text-foreground">Device Permissions:</strong>
                  <ul className="list-circle list-inside pl-8 mt-2">
                    <li><strong className="text-foreground">Microphone / Audio:</strong> The app utilizes audio libraries for playback and background processing. While Apple requires a microphone usage description due to these underlying libraries, <strong className="text-foreground">we do not record, listen to, or collect any audio from your device's microphone.</strong></li>
                  </ul>
                </li>
              </ul>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">2. How We Use Your Information</h2>
              <p>We use the information we collect to:</p>
              <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                <li>Provide, maintain, and improve the Ranna app.</li>
                <li>Enable audio streaming and background playback functionalities.</li>
                <li>Allow you to sync your favorites and preferences across devices (if logged in).</li>
                <li>Analyze usage patterns to enhance user experience.</li>
                <li>Respond to customer support inquiries.</li>
              </ul>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">3. Third-Party Services</h2>
              <p>We may share your information with third-party service providers who help us operate the app:</p>
              <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                <li><strong className="text-foreground">Supabase:</strong> Used for secure user authentication and database management.</li>
                <li><strong className="text-foreground">Analytics Providers:</strong> We may use services (like Posthog) to analyze app usage. These services collect data anonymously.</li>
                <li><strong className="text-foreground">Apple & Google:</strong> As a mobile app, certain usage data and crash reports may be collected by Apple or Google in accordance with their privacy policies.</li>
              </ul>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">4. Data Security</h2>
              <p>We implement reasonable security measures to protect your personal information. Authentication and data syncing are handled securely. However, please be aware that no method of transmission over the internet or electronic storage is 100% secure.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">5. Your Choices</h2>
              <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                <li><strong className="text-foreground">Account Deletion:</strong> You can request the deletion of your account and associated data by contacting us or using the in-app deletion option.</li>
                <li><strong className="text-foreground">Local Data:</strong> You can clear your downloaded tracks and local data by uninstalling the app or using in-app settings (if available).</li>
              </ul>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">6. Changes to This Privacy Policy</h2>
              <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy within the app and website.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">7. Contact Us</h2>
              <p>If you have any questions about this Privacy Policy, please contact us.</p>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
};

export default PrivacyPolicyPage;
