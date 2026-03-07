import { Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function HowItWorksPage() {
    return (
        <div className="min-h-screen bg-[var(--bg-background)] text-[var(--text-main)]" dir="rtl">
            {/* Simple Independent Header */}
            <header className="p-6 flex justify-between items-center max-w-6xl mx-auto z-50 relative">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2ba396] to-[#238b7f] flex items-center justify-center shadow-md">
                        <span className="text-white font-black text-sm">S</span>
                    </div>
                    <span className="text-xl font-display font-bold tracking-widest text-[var(--text-main)]">SOLVICA</span>
                </div>
                <Link to="/" className="flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors bg-[var(--bg-surface)] px-4 py-2 rounded-full border border-[var(--border-color)] shadow-sm">
                    العودة للرئيسية <Home className="w-4 h-4 mr-1" />
                </Link>
            </header>

            <div className="max-w-4xl mx-auto py-4 px-6 relative">

                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-display font-black mb-4 text-[var(--text-main)]">كيف يعمل <span className="text-gradient">Solvica</span>؟ ⚙️</h1>
                    <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">ثلاث خطوات بسيطة تفصلك عن تجربة دراسية استثنائية مدعومة بالذكاء الاصطناعي.</p>
                </div>

                <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-primary/50 before:to-transparent">

                    {/* Step 1 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[var(--bg-background)] bg-primary text-white font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            1
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-widget p-6 rounded-2xl border border-[var(--border-color)] shadow-lg hover:border-primary/50 transition-colors">
                            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">تسجيل الدخول ورفع المواد</h3>
                            <p className="text-[var(--text-muted)]">قم بتسجيل الدخول باستخدام حساب جوجل الخاص بك، ثم ابدأ برفع ملفاتك الدراسية (PDF/Word) أو قم بسحبها مباشرة من منصة (زميل).</p>
                        </div>
                    </div>

                    {/* Step 2 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[var(--bg-background)] bg-secondary text-white font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            2
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-widget p-6 rounded-2xl border border-[var(--border-color)] shadow-lg hover:border-secondary/50 transition-colors">
                            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">المعالجة الذكية والفهم (RAG)</h3>
                            <p className="text-[var(--text-muted)]">يقوم نظامنا بتقطيع الملفات وفهمها بعمق باستخدام تقنيات (Retrieval-Augmented Generation)، مما يجعل الذكاء الاصطناعي خبيراً بمادتك الجامعية تحديداً.</p>
                        </div>
                    </div>

                    {/* Step 3 */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                        <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-[var(--bg-background)] bg-accent text-white font-bold shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                            3
                        </div>
                        <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] glass-widget p-6 rounded-2xl border border-[var(--border-color)] shadow-lg hover:border-accent/50 transition-colors">
                            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">ابدأ الحوار والتفاعل</h3>
                            <p className="text-[var(--text-muted)]">الآن، يمكنك التحدث مع الذكاء الاصطناعي نصياً أو صوتياً، طلب حل للواجبات، توليد امتحانات، أو حتى تحويل الشرح إلى فيديو مقروء.</p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
