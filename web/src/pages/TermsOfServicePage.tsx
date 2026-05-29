import { useEffect } from "react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";

const TermsOfServicePage = () => {
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
            <h1 className="text-3xl font-bold font-fustat mb-4 text-primary">شروط الخدمة</h1>
            <p className="text-sm text-muted-foreground mb-8">تاريخ آخر تحديث: 1 أبريل 2026</p>

            <div className="space-y-6 text-foreground font-fustat leading-relaxed">
              <p>مرحباً بك في رنّة ("نحن" أو "التطبيق"). تنظم شروط الخدمة هذه وصولك إلى تطبيقنا وخدماتنا واستخدامها. باستخدام رنّة، فإنك توافق على الالتزام بهذه الشروط.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">1. قبول الشروط</h2>
              <p>من خلال إنشاء حساب أو الوصول إلى رنّة أو استخدامه، فإنك توافق على الالتزام بهذه الشروط وبسياسة الخصوصية الخاصة بنا. إذا كنت لا توافق على هذه الشروط، يرجى عدم استخدام خدماتنا.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">2. استخدام الخدمة</h2>
              <ul className="list-disc list-inside space-y-2 pr-4 text-muted-foreground">
                <li><strong className="text-foreground">الأهلية:</strong> يجب أن تكون مؤهلاً قانونياً للموافقة على هذه الشروط في ولايتك القضائية.</li>
                <li><strong className="text-foreground">حسابك:</strong> أنت مسؤول عن الحفاظ على سرية حسابك وكلمة المرور الخاصة بك أو آليات المصادقة وتتحمل المسؤولية عن جميع الأنشطة التي تحدث تحت حسابك.</li>
                <li><strong className="text-foreground">المحتوى:</strong> يهدف التطبيق إلى توفير المدائح النبوية وتجربة استماع مميزة. لا يجوز لك إساءة استخدام الخدمة أو التدخل في عملها.</li>
              </ul>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">3. حقوق الملكية الفكرية</h2>
              <p>جميع حقوق الملكية الفكرية في التطبيق (بما في ذلك التصميم والبرمجة والنصوص) مملوكة لنا أو لمرخصينا. يتم توفير المحتوى الصوتي (المدائح) للأغراض الشخصية وغير التجارية، وتظل حقوقه مملوكة لأصحابها الأصليين.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">4. إخلاء المسؤولية وتحديد المسؤولية</h2>
              <p>يتم توفير خدماتنا "كما هي" دون أي ضمانات من أي نوع. نحن لا نضمن أن تكون الخدمة دون انقطاع أو خالية من الأخطاء. لن نكون مسؤولين عن أي أضرار غير مباشرة أو عرضية تنشأ عن استخدام الخدمة.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">5. التغييرات على الشروط</h2>
              <p>نحتفظ بالحق في تعديل هذه الشروط في أي وقت. سنعلمك بالتغييرات الجوهرية. استمرار استخدامك للخدمة يعني موافقتك على الشروط المعدلة.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">6. الاتصال بنا</h2>
              <p>إذا كانت لديك أي أسئلة حول شروط الخدمة هذه، يرجى التواصل معنا.</p>
            </div>
          </section>

          <hr className="border-border my-12" />

          {/* English Section */}
          <section className="text-left" dir="ltr">
            <h1 className="text-3xl font-bold mb-4 text-primary">Terms of Service</h1>
            <p className="text-sm text-muted-foreground mb-8">Last Updated: April 1, 2026</p>

            <div className="space-y-6 text-foreground leading-relaxed">
              <p>Welcome to Ranna ("we", "us", or "the App"). These Terms of Service govern your access to and use of our application and services. By using Ranna, you agree to comply with these terms.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">1. Acceptance of Terms</h2>
              <p>By creating an account, accessing, or using Ranna, you agree to be bound by these Terms and our Privacy Policy. If you do not agree to these terms, please do not use our services.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">2. Use of Service</h2>
              <ul className="list-disc list-inside space-y-2 pl-4 text-muted-foreground">
                <li><strong className="text-foreground">Eligibility:</strong> You must be legally capable of entering into a binding contract in your jurisdiction to use this app.</li>
                <li><strong className="text-foreground">Your Account:</strong> You are responsible for maintaining the confidentiality of your account authentication methods and are liable for all activities that occur under your account.</li>
                <li><strong className="text-foreground">Content:</strong> The app provides religious poetry and audio content. You may not misuse the service or interfere with its operation.</li>
              </ul>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">3. Intellectual Property Rights</h2>
              <p>All intellectual property rights in the App (including design, code, and text) are owned by us or our licensors. The audio content provided is for personal, non-commercial use, and its rights remain with the original owners.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">4. Disclaimer and Limitation of Liability</h2>
              <p>Our services are provided "as is" without any warranties of any kind. We do not guarantee that the service will be uninterrupted or error-free. We shall not be liable for any indirect or incidental damages arising out of your use of the service.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">5. Changes to Terms</h2>
              <p>We reserve the right to modify these terms at any time. We will notify you of any material changes. Your continued use of the service signifies your acceptance of the modified terms.</p>

              <h2 className="text-xl font-bold mt-8 mb-4 text-primary/90">6. Contact Us</h2>
              <p>If you have any questions about these Terms of Service, please contact us.</p>
            </div>
          </section>
        </motion.div>
      </main>
    </div>
  );
};

export default TermsOfServicePage;
