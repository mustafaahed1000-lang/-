import AppLayout from '../layouts/AppLayout';
import { Star, CheckCircle2 } from 'lucide-react';

export default function PricingPage() {
    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto py-12 relative" dir="rtl">
                <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />

                <div className="text-center mb-16 relative z-10">
                    <h1 className="text-4xl md:text-5xl font-display font-black mb-4 text-[var(--text-main)]">الاستثمار الذكي في مستقبلك 🚀</h1>
                    <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">اختر الخطة التي تناسب احتياجاتك الجامعية وابدأ بتحقيق التفوق الأكاديمي اليوم.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                    {/* Free Plan */}
                    <div className="glass-widget p-8 rounded-3xl border border-[var(--border-color)] flex flex-col items-center text-center hover:scale-[1.02] transition-transform">
                        <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">الأساسية</h3>
                        <p className="text-[var(--text-muted)] mb-6">مناسبة للتجربة السريعة</p>
                        <div className="text-4xl font-black text-[var(--text-main)] mb-6">مجانًا<span className="text-sm font-normal text-[var(--text-muted)]">/دائمًا</span></div>
                        <ul className="text-right space-y-4 mb-8 w-full">
                            <li className="flex items-center gap-3 text-[var(--text-main)]"><CheckCircle2 className="w-5 h-5 text-[#c4f042]" /> تحليل 5 ملفات شهريًا</li>
                            <li className="flex items-center gap-3 text-[var(--text-main)]"><CheckCircle2 className="w-5 h-5 text-[#c4f042]" /> محادثات محدودة يوميًا</li>
                            <li className="flex items-center gap-3 text-[var(--text-main)]"><CheckCircle2 className="w-5 h-5 text-gray-500 opacity-50" /> <span className="line-through text-gray-400">بدون إعلانات</span></li>
                            <li className="flex items-center gap-3 text-[var(--text-main)]"><CheckCircle2 className="w-5 h-5 text-gray-500 opacity-50" /> <span className="line-through text-gray-400">مولد الامتحانات والفيديو</span></li>
                        </ul>
                        <button className="w-full py-4 rounded-xl border border-primary text-primary font-bold hover:bg-primary/10 transition-colors mt-auto">البدء مجانًا</button>
                    </div>

                    {/* Pro Plan */}
                    <div className="glass-widget p-8 rounded-3xl border-2 border-primary bg-gradient-to-b from-primary/10 to-transparent flex flex-col items-center text-center transform md:-translate-y-4 shadow-[0_0_30px_rgba(123,47,255,0.2)]">
                        <div className="absolute top-0 right-0 w-full flex justify-center -mt-4">
                            <span className="bg-primary text-white text-xs font-bold px-4 py-1 rounded-full uppercase tracking-widest shadow-lg flex items-center gap-1"><Star className="w-3 h-3" /> الأكثر طلبًا</span>
                        </div>
                        <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">الطالب المتميز (Pro)</h3>
                        <p className="text-[var(--text-muted)] mb-6">لكل ما تحتاجه للفصل الدراسي</p>
                        <div className="text-4xl font-black text-primary mb-6">4$<span className="text-sm font-normal text-[var(--text-muted)]">/شهريًا</span></div>
                        <ul className="text-right space-y-4 mb-8 w-full">
                            <li className="flex items-center gap-3 text-[var(--text-main)]"><CheckCircle2 className="w-5 h-5 text-primary" /> تحليل 50 ملف شهريًا</li>
                            <li className="flex items-center gap-3 text-[var(--text-main)]"><CheckCircle2 className="w-5 h-5 text-primary" /> محادثات غير محدودة</li>
                            <li className="flex items-center gap-3 text-[var(--text-main)]"><CheckCircle2 className="w-5 h-5 text-primary" /> مولد الامتحانات المتقدم</li>
                            <li className="flex items-center gap-3 text-[var(--text-main)]"><CheckCircle2 className="w-5 h-5 text-primary" /> شرح مرئي (10 فيديوهات)</li>
                        </ul>
                        <button className="w-full py-4 rounded-xl btn-primary font-bold mt-auto shadow-[0_0_20px_rgba(123,47,255,0.4)]">اشترك الآن</button>
                    </div>

                    {/* Elite Plan */}
                    <div className="glass-widget p-8 rounded-3xl border border-[var(--border-color)] flex flex-col items-center text-center hover:scale-[1.02] transition-transform">
                        <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">الخريج (Elite)</h3>
                        <p className="text-[var(--text-muted)] mb-6">وصول كامل ومفتوح</p>
                        <div className="text-4xl font-black text-secondary mb-6">9$<span className="text-sm font-normal text-[var(--text-muted)]">/شهريًا</span></div>
                        <ul className="text-right space-y-4 mb-8 w-full">
                            <li className="flex items-center gap-3 text-[var(--text-main)]"><CheckCircle2 className="w-5 h-5 text-secondary" /> رفع ملفات بلا حدود</li>
                            <li className="flex items-center gap-3 text-[var(--text-main)]"><CheckCircle2 className="w-5 h-5 text-secondary" /> ذكاء اصطناعي فائق السرعة</li>
                            <li className="flex items-center gap-3 text-[var(--text-main)]"><CheckCircle2 className="w-5 h-5 text-secondary" /> توليد الفيديوهات والشروحات بلا حدود</li>
                            <li className="flex items-center gap-3 text-[var(--text-main)]"><CheckCircle2 className="w-5 h-5 text-secondary" /> سحب البيانات من "زميل" بشكل تلقائي</li>
                        </ul>
                        <button className="w-full py-4 rounded-xl bg-gradient-to-r from-secondary to-blue-500 text-white font-bold hover:opacity-90 transition-opacity mt-auto">اشترك الآن</button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
