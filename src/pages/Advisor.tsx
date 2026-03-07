import React, { useState, useEffect, useRef } from 'react';
import { aiClient } from '../lib/ai/aiClient';
import AppLayout from '../layouts/AppLayout';
import { motion } from 'framer-motion';
import { GraduationCap, Award, AlertTriangle, ChevronLeft, BrainCircuit, Download } from 'lucide-react';
import { exportToPDF } from '../lib/utils/pdfExport';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Advisor() {
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        major: '',
        cumulativeGpa: '',
        semesterGpa: '',
        failedCourses: '',
        difficultSubjects: ''
    });

    const [advisorResponse, setAdvisorResponse] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = () => {
        setIsGenerating(true); // Optional: Provide loading state
        exportToPDF(printRef, 'خطة_إنقاذ_أكاديمية_Solvica').finally(() => setIsGenerating(false));
    };

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    useEffect(() => {
        if (step === 3 && !isGenerating && !advisorResponse) {
            generateAdvice();
        }
    }, [step]);

    const generateAdvice = async () => {
        setIsGenerating(true);
        try {
            const prompt = `أنت مستشار أكاديمي خبير في جامعة القدس المفتوحة. 

بيانات الطالب:
- التخصص: "${formData.major}"
- المعدل التراكمي: ${formData.cumulativeGpa}
- المعدل الفصلي الأخير: ${formData.semesterGpa}
- المواد التي رسب فيها: "${formData.failedCourses}"
- الصعوبات: "${formData.difficultSubjects}"

## المطلوب:
اكتب **خطة إنقاذ أكاديمية مخصصة** من 5 نقاط.

## قواعد التنسيق الصارمة:
- استخدم Markdown فقط (عناوين ##، قوائم مرقمة، **عريض**)
- اكتب كل نقطة كعنوان ## مع إيموجي
- تحت كل نقطة اكتب 3-4 خطوات عملية واضحة كقائمة مرقمة
- أضف ⚠️ تحذيرات مهمة بخط عريض
- استخدم جدول Markdown لتلخيص الخطة في النهاية
- اختم بجملة تشجيعية مع إيموجي 💪

## مثال على التنسيق المطلوب:
## 1️⃣ العنوان الأول 💡
1. الخطوة الأولى
2. الخطوة الثانية
3. الخطوة الثالثة

> ⚠️ **تحذير**: نص التحذير هنا

| الأسبوع | الهدف | المعيار |
|---------|-------|---------|
| 1 | ... | ... |`;

            const response = await aiClient.chat([{ role: 'user', content: prompt }]);
            setAdvisorResponse(response);
            setStep(4);
        } catch (error) {
            setAdvisorResponse("عذراً، حدث خطأ أثناء تحليل بياناتك. يرجى المحاولة مرة أخرى لاحقاً.");
            setStep(4);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-3xl mx-auto mt-8">

                <div className="text-center mb-12">
                    <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-accent items-center justify-center mb-6 shadow-[0_0_30px_rgba(123,47,255,0.4)]">
                        <GraduationCap className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-display font-black mb-4 text-[var(--text-main)]">المستشار الأكاديمي الذكي</h1>
                    <p className="text-[var(--text-muted)] max-w-xl mx-auto">سيقوم الذكاء الاصطناعي بتحليل وضعك الأكاديمي، معدلك التراكمي، والمواد التي تواجه صعوبة فيها ليقدم لك خطة مخصصة لرفع معدلك وتجاوز العقبات.</p>
                </div>

                <div className="glass-widget p-8 rounded-3xl relative overflow-hidden bg-[var(--bg-surface)]">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-[var(--border-color)]">
                        <motion.div
                            className="h-full bg-gradient-to-r from-secondary to-primary"
                            initial={{ width: '0%' }}
                            animate={{ width: `${(step / 3) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>

                    <div className="min-h-[300px]">
                        <AnimateStep step={step} currentStep={1}>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-[var(--text-main)]">
                                <Award className="text-secondary" />
                                البيانات الأساسية للمعدل
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-main)] mb-2">تخصصك الجامعي</label>
                                    <input
                                        type="text"
                                        placeholder="مثال: هندسة البرمجيات"
                                        className="w-full bg-[var(--widget-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-primary/50 transition-colors"
                                        value={formData.major}
                                        onChange={e => setFormData({ ...formData, major: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-main)] mb-2">المعدل التراكمي</label>
                                        <input
                                            type="number"
                                            placeholder="مثال: 85"
                                            className="w-full bg-[var(--widget-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-primary/50 transition-colors"
                                            value={formData.cumulativeGpa}
                                            onChange={e => setFormData({ ...formData, cumulativeGpa: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-main)] mb-2">المعدل الفصلي الأخير</label>
                                        <input
                                            type="number"
                                            placeholder="مثال: 78"
                                            className="w-full bg-[var(--widget-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-primary/50 transition-colors"
                                            value={formData.semesterGpa}
                                            onChange={e => setFormData({ ...formData, semesterGpa: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                        </AnimateStep>

                        <AnimateStep step={step} currentStep={2}>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-[var(--text-main)]">
                                <AlertTriangle className="text-accent" />
                                التحديات والمواد
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-main)] mb-2">هل رسبت في أي مواد سابقاً؟ اذكرها إن وجدت</label>
                                    <input
                                        type="text"
                                        placeholder="مثال: تفاضل وتكامل 2"
                                        className="w-full bg-[var(--widget-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-primary/50 transition-colors"
                                        value={formData.failedCourses}
                                        onChange={e => setFormData({ ...formData, failedCourses: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-main)] mb-2">ما هي المواد التي تواجه صعوبة فيها حالياً؟</label>
                                    <textarea
                                        placeholder="مثال: أواجه صعوبة في فهم خوارزميات البرمجة والمواد التي تعتمد على الحفظ."
                                        className="w-full h-32 bg-[var(--widget-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-primary/50 transition-colors resize-none"
                                        value={formData.difficultSubjects}
                                        onChange={e => setFormData({ ...formData, difficultSubjects: e.target.value })}
                                    />
                                </div>
                            </div>
                        </AnimateStep>

                        <AnimateStep step={step} currentStep={3}>
                            <div className="text-center py-8">
                                <BrainCircuit className="w-20 h-20 text-primary mx-auto mb-6 animate-pulse" />
                                <h2 className="text-2xl font-bold mb-4 text-[var(--text-main)]">جاري تحليل بياناتك بدقة...</h2>
                                <p className="text-[var(--text-muted)] mb-8 max-w-md mx-auto">يقوم الذكاء الاصطناعي الآن ببناء خطة نصائح مخصصة بناءً على معدلك التراكمي والمشاكل التي تواجهها مع المواد الصعبة.</p>
                                <div className="w-16 h-16 border-4 border-[var(--border-color)] border-t-primary rounded-full animate-spin mx-auto" />
                            </div>
                        </AnimateStep>

                        <AnimateStep step={step} currentStep={4}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-3 text-[var(--text-main)]">
                                    <Award className="text-emerald-500" />
                                    خطتك الأكاديمية المخصصة
                                </h2>
                                <button onClick={handlePrint} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20">
                                    <Download className="w-5 h-5" />
                                    تصدير PDF
                                </button>
                            </div>

                            {/* The Printable Area */}
                            <div
                                className="bg-[var(--widget-bg)] border border-emerald-500/20 rounded-2xl p-6 md:p-8 shadow-inner print:bg-white print:text-black print:border-none print:shadow-none print:p-12"
                                ref={printRef}
                                dir="rtl"
                            >
                                {/* Print-only Header */}
                                <div className="hidden print:block text-center mb-10 border-b-2 border-emerald-600 pb-6">
                                    <h1 className="text-4xl font-black mb-3 text-emerald-700 font-display">جامعة القدس المفتوحة</h1>
                                    <h2 className="text-2xl font-bold text-gray-800 tracking-widest mb-4">المستشار الأكاديمي الذكي (SOLVICA)</h2>
                                    <div className="flex justify-center gap-8 text-gray-600 font-bold border-t border-gray-200 pt-4 mt-4 w-3/4 mx-auto">
                                        <p>التخصص: <span className="text-emerald-700">{formData.major}</span></p>
                                        <p>المعدل التراكمي: <span className="text-red-500">{formData.cumulativeGpa}</span></p>
                                        <p>المعدل الفصلي: <span className="text-purple-600">{formData.semesterGpa}</span></p>
                                    </div>
                                </div>

                                <div className="prose prose-lg dark:prose-invert max-w-none text-[var(--text-main)]" style={{ lineHeight: '2', direction: 'rtl', textAlign: 'right' }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{advisorResponse}</ReactMarkdown>
                                </div>

                                {/* Print-only Footer */}
                                <div className="hidden print:block mt-16 pt-6 border-t border-gray-300 text-center text-gray-500 font-medium">
                                    <p>تم إنشاء هذا التقرير آلياً بواسطة نظام الذكاء الاصطناعي SOLVICA لدعم طلبة الجامعة.</p>
                                    <p className="text-sm mt-2 opacity-70">© {new Date().getFullYear()} Solvica AI Assistant</p>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={() => {
                                        setStep(1);
                                        setAdvisorResponse('');
                                        setFormData({ major: '', cumulativeGpa: '', semesterGpa: '', failedCourses: '', difficultSubjects: '' });
                                    }}
                                    className="px-6 py-3 rounded-xl font-bold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                                >
                                    إعادة التقييم
                                </button>
                            </div>
                        </AnimateStep>
                    </div>

                    {/* Navigation Buttons */}
                    {step < 3 && (
                        <div className="flex items-center justify-between mt-8 pt-8 border-t border-[var(--border-color)]">
                            {step > 1 ? (
                                <button onClick={handleBack} className="text-[var(--text-muted)] hover:text-[var(--text-main)] font-bold transition-colors">
                                    تراجع
                                </button>
                            ) : <div></div>}

                            <button onClick={handleNext} className="btn-primary flex items-center gap-2 px-8 py-3">
                                التالي <ChevronLeft className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </AppLayout>
    );
}

function AnimateStep({ children, step, currentStep }: { children: React.ReactNode, step: number, currentStep: number }) {
    if (step !== currentStep) return null;
    return (
        <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
        >
            {children}
        </motion.div>
    )
}
