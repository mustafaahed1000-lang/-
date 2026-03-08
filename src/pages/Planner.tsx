import React, { useState, useEffect, useRef } from 'react';
import { aiClient } from '../lib/ai/aiClient';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { motion } from 'framer-motion';
import { Activity, Clock, BookOpen, BrainCircuit, ChevronLeft, Map, Download, Check } from 'lucide-react';
import { exportToPDF } from '../lib/utils/pdfExport';
import { db } from '../lib/db/database';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function Planner() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        subjects: [] as string[],
        hoursPerDay: '3',
        methodology: 'متوازن (تقنية بومودورو)'
    });

    const [plannerResponse, setPlannerResponse] = useState<string>('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [savedDocs, setSavedDocs] = useState<any[]>([]);

    useEffect(() => {
        db.getAllDocuments().then(setSavedDocs);
    }, []);

    // Progress Tracking Logic
    const [xp, setXp] = useState(0);
    const [level, setLevel] = useState(1);
    const [progressPercent, setProgressPercent] = useState(0);

    useEffect(() => {
        const storedXp = parseInt(localStorage.getItem('solvica_course_progress') || '0', 10);
        setXp(storedXp);
        const calcLevel = Math.floor(storedXp / 100) + 1;
        setLevel(calcLevel);
        const xpInCurrentLevel = storedXp % 100;
        setProgressPercent(xpInCurrentLevel); // since each level is 100 xp, the % is just the remainder
    }, []);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = () => {
        setIsGenerating(true);
        exportToPDF(printRef, 'جدول_دراسي_Solvica').finally(() => setIsGenerating(false));
    };

    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    useEffect(() => {
        if (step === 3 && !isGenerating && !plannerResponse) {
            generatePlan();
        }
    }, [step]);

    const generatePlan = async () => {
        setIsGenerating(true);
        try {
            // Retrieve actual document content to feed to the AI
            const targetDocs = savedDocs.filter(doc => formData.subjects.includes(doc.filename));
            let contextStr = "";

            if (targetDocs.length > 0) {
                // Extract ALL chunks to give full context to the AI
                const allChunks = targetDocs.flatMap(doc => doc.chunks).map((c: any) => c.text ? c.text : c);
                contextStr = allChunks.join('\n---\n').substring(0, 40000);
            }

            const prompt = `أنت خبير في التخطيط الأكاديمي لجامعة القدس المفتوحة.
المواد/الملفات المختارة: "ـ${formData.subjects.join('`، `')}ـ"
الوقت المتاح: "${formData.hoursPerDay}" يومياً.
أسلوب الدراسة: "${formData.methodology}".

=== محتوى الملفات المرفقة ===
${contextStr ? contextStr : 'لا يوجد محتوى نصي.'}
=== نهاية المحتوى ===

**تعليمات تحليل الملف (إلزامي):**
اقرأ المحتوى أعلاه بعناية، ثم قرر نوع الملف:

**إذا كان الملف يحتوي على أسئلة امتحان / أسئلة سابقة / تمارين:**
→ استخرج المواضيع الرئيسية من هذه الأسئلة (مثل: إذا تكررت أسئلة عن "قواعد البيانات"، "الجبر العلائقي"، إلخ)
→ ابن عليها جدول دراسة حسب تكرار السؤال (أكثر تكراراً = أكثر أهمية = لازم تبدأ به الدراسة)
→ اذكر أرقام الصفحات أو أرقام الأسئلة من الملف لكل موضوع

**إذا كان الملف كتاباً نظرياً:**
→ صمّم جدولاً دراسياً فعلياً لختم المنهج بالفصول.

**الشكل المطلوب:**
- جدول Markdown بالأعمدة (اليوم/الجلسة | الموضوع | الوقت | الهدف)
- إيموجيات مناسبة 🚀📚
- تتضمن مقترحات عملية: "ابدأ بسؤال 3، ثم 1، ثم 7..." وليس عناوين مجردة
- **لا تعطني كلاماً عاماً. التدريب العملي وحل الأسئلة هو الأهم.**`;

            const response = await aiClient.chat([{ role: 'user', content: prompt }], { model: 'gpt-4o' });
            setPlannerResponse(response);
            setStep(4);
        } catch (error) {
            setPlannerResponse("عذراً، حدث خطأ أثناء بناء خطتك الدراسية. يرجى المحاولة مرة أخرى لاحقاً.");
            setStep(4);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AppLayout>
            <div className="max-w-3xl mx-auto mt-8">

                <div className="text-center mb-12">
                    <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 items-center justify-center mb-6 shadow-[0_0_30px_rgba(52,211,153,0.4)]">
                        <Activity className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-display font-black mb-4 text-[var(--text-main)]">مولد الخطط ومستوى التقدم الحقيقي</h1>
                    <p className="text-[var(--text-muted)] max-w-xl mx-auto">تتبع مستواك الفعلي بناءً على الامتحانات والألعاب التفاعلية للمناهج، ثم دع الذكاء الاصطناعي يبني لك مسارك الدراسي.</p>
                </div>

                {/* Progress Tracker Widget */}
                <div className="glass-widget p-6 rounded-3xl mb-8 flex flex-col md:flex-row items-center gap-6 border-2 border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 shadow-[0_0_40px_rgba(52,211,153,0.1)]">
                    <div className="w-20 h-20 rounded-full flex items-center justify-center bg-[var(--widget-bg)] border-4 border-emerald-500 shadow-lg shadow-emerald-500/30 shrink-0">
                        <div className="text-center">
                            <span className="block text-xs font-bold text-[var(--text-muted)]">مستوى</span>
                            <span className="block text-2xl font-black text-emerald-500">{level}</span>
                        </div>
                    </div>
                    <div className="flex-1 w-full">
                        <div className="flex justify-between items-end mb-2">
                            <h3 className="text-xl font-bold text-[var(--text-main)]">مستوى التقدم في دراسة المواد</h3>
                            <span className="text-sm font-bold text-teal-600">{xp} XP الإجمالي</span>
                        </div>
                        <div className="h-4 w-full bg-[var(--bg-background)] rounded-full overflow-hidden border border-[var(--border-color)]">
                            <motion.div
                                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 relative"
                                initial={{ width: 0 }}
                                animate={{ width: `${progressPercent}%` }}
                                transition={{ duration: 1, delay: 0.5 }}
                            >
                                <div className="absolute inset-0 bg-white/20 w-full animate-pulse"></div>
                            </motion.div>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] mt-2 font-bold">يتبقى {100 - progressPercent} نقطة للوصول للمستوى {level + 1}. العب تحدي المادة لزيادة نقاطك!</p>
                    </div>
                </div>

                <div className="glass-widget p-8 rounded-3xl relative overflow-hidden bg-[var(--bg-surface)]">
                    {/* Progress Bar */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-[var(--border-color)]">
                        <motion.div
                            className="h-full bg-gradient-to-r from-teal-400 to-emerald-500"
                            initial={{ width: '0%' }}
                            animate={{ width: `${(step / 3) * 100}%` }}
                            transition={{ duration: 0.5 }}
                        />
                    </div>

                    <div className="min-h-[300px]">
                        <AnimateStep step={step} currentStep={1}>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-[var(--text-main)]">
                                <BookOpen className="text-emerald-500" />
                                ماذا تريد أن تدرس؟
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-main)] mb-4">اختر المواد التي تخطط لدراستها (يمكنك اختيار أكثر من مادة)</label>
                                    <div className="space-y-6 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                                        {(() => {
                                            const folders = savedDocs.reduce((acc, doc) => {
                                                const key = doc.subjectName || 'مقرر عام';
                                                if (!acc[key]) acc[key] = [];
                                                acc[key].push(doc);
                                                return acc;
                                            }, {} as Record<string, any[]>);

                                            const entries = Object.entries(folders);
                                            if (entries.length === 0) {
                                                return <p className="text-[var(--text-muted)] text-center py-8">لم تقم برفع أي ملفات دراسية بعد. يرجى الذهاب لصفحة "ملفاتي ومواردي" لإنشاء مجلدات ورفع موادك.</p>;
                                            }

                                            return entries.map(([folderName, folderDocs]) => {
                                                const docsArray = folderDocs as any[];
                                                const files = docsArray.filter(d => d.filename !== '_solvica_folder_');
                                                if (files.length === 0) return null;
                                                return (
                                                    <div key={folderName} className="bg-[var(--bg-background)] p-4 rounded-xl border border-[var(--border-color)]">
                                                        <h3 className="text-sm font-bold text-emerald-500 mb-3 border-b border-emerald-500/20 pb-2 flex items-center gap-2">
                                                            <BookOpen className="w-4 h-4" />
                                                            {folderName}
                                                        </h3>
                                                        <div className="flex flex-wrap gap-2">
                                                            {files.map((doc: any) => {
                                                                const isSelected = formData.subjects.includes(doc.filename);
                                                                return (
                                                                    <button
                                                                        key={doc.id}
                                                                        onClick={() => {
                                                                            setFormData(prev => ({
                                                                                ...prev,
                                                                                subjects: isSelected
                                                                                    ? prev.subjects.filter(s => s !== doc.filename)
                                                                                    : [...prev.subjects, doc.filename]
                                                                            }));
                                                                        }}
                                                                        className={`px-4 py-2 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${isSelected
                                                                            ? 'bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-500/20'
                                                                            : 'bg-[var(--widget-bg)] text-[var(--text-main)] border-[var(--border-color)] hover:border-emerald-500/50'
                                                                            }`}
                                                                    >
                                                                        {isSelected && <Check className="w-4 h-4" />}
                                                                        {doc.filename}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </div>
                            </div>
                        </AnimateStep>

                        <AnimateStep step={step} currentStep={2}>
                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 text-[var(--text-main)]">
                                <Clock className="text-teal-400" />
                                الوقت والأسلوب
                            </h2>
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-main)] mb-2">ما هو الوقت المتاح لديك لدراسة هذه المواد؟ (بالساعات أو الدقائق)</label>
                                    <input
                                        type="text"
                                        placeholder="مثال: 4 ساعات، أو 30 دقيقة"
                                        className="w-full bg-[var(--widget-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] placeholder:text-[var(--text-muted)]/60 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                        value={formData.hoursPerDay}
                                        onChange={e => setFormData({ ...formData, hoursPerDay: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-main)] mb-2">الأسلوب المفضل في الدراسة</label>
                                    <select
                                        className="w-full bg-[var(--widget-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-emerald-500/50 transition-colors cursor-pointer"
                                        value={formData.methodology}
                                        onChange={e => setFormData({ ...formData, methodology: e.target.value })}
                                    >
                                        <option value="متوازن (تقنية العمل لفترات مبنية على Pomodoro)">متوازن (فترات متقطعة للتركيز العميق - Pomodoro)</option>
                                        <option value="مكثف (تحضير سريع للامتحان - Spaced Repetition)">مكثف (تكرار متباعد للتحضير للامتحانات)</option>
                                        <option value="عميق (شرح المواضيع المعقدة - تقنية Feynman)">عميق (شرح المواضيع المعقدة للفهم الجذري - تقنية Feynman)</option>
                                    </select>
                                </div>
                            </div>
                        </AnimateStep>

                        <AnimateStep step={step} currentStep={3}>
                            <div className="text-center py-8">
                                <BrainCircuit className="w-20 h-20 text-emerald-500 mx-auto mb-6 animate-pulse" />
                                <h2 className="text-2xl font-bold mb-4 text-[var(--text-main)]">جاري تصميم مسارك...</h2>
                                <p className="text-[var(--text-muted)] mb-8 max-w-md mx-auto">الذكاء الاصطناعي يحلل موادك ويدمجها مع الاستراتيجية التي اخترتها لبناء خطة دراسية عملية يمكنك تطبيقها الآن.</p>

                                <div className="w-16 h-16 border-4 border-[var(--border-color)] border-t-emerald-500 rounded-full animate-spin mx-auto" />
                            </div>
                        </AnimateStep>

                        <AnimateStep step={step} currentStep={4}>
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-2xl font-bold flex items-center gap-3 text-[var(--text-main)]">
                                    <Map className="text-emerald-500" />
                                    خطتك اليومية الجاهزة
                                </h2>
                                <button onClick={handlePrint} className="flex items-center gap-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-500 px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20">
                                    <Download className="w-5 h-5" />
                                    تصدير الجدول كـ PDF
                                </button>
                            </div>

                            <div
                                className="bg-[var(--widget-bg)] border border-emerald-500/20 rounded-2xl p-6 md:p-8 shadow-inner print:bg-white print:text-black print:border-none print:shadow-none print:p-12 print:overflow-visible"
                                ref={printRef}
                                dir="rtl"
                            >
                                {/* Print-only Header for Professional Branding */}
                                <div className="hidden print:block text-center mb-10 border-b-2 border-emerald-600 pb-6">
                                    <h1 className="text-4xl font-black mb-3 text-emerald-700 font-display">جامعة القدس المفتوحة</h1>
                                    <h2 className="text-2xl font-bold text-gray-800 tracking-widest mb-4">مولّد الخطط الدراسية الذكي (SOLVICA)</h2>
                                    <div className="flex justify-center gap-8 text-gray-600 font-bold border-t border-gray-200 pt-4 mt-4 w-3/4 mx-auto">
                                        <p>المواد: <span className="text-emerald-700">{formData.subjects.join('، ')}</span></p>
                                        <p>وقت الدراسة: <span className="text-blue-600">{formData.hoursPerDay} ساعات</span></p>
                                        <p>الأسلوب: <span className="text-purple-600">{formData.methodology.split('(')[0]}</span></p>
                                    </div>
                                </div>

                                <div className="whitespace-pre-wrap leading-relaxed text-[var(--text-main)] text-lg html-content prose prose-invert max-w-none print:max-w-none print:prose-p:text-black print:prose-headings:text-black print:prose-strong:text-black print:prose-li:text-black print:prose-table:text-black">
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{plannerResponse}</ReactMarkdown>
                                </div>

                                {/* Print-only Footer */}
                                <div className="hidden print:block mt-16 pt-6 border-t border-gray-300 text-center text-gray-500 font-medium">
                                    <p>تم تصميم هذا الجدول آلياً بواسطة نظام الذكاء الاصطناعي SOLVICA لدعم طلبة الجامعة في تنظيم وقتهم بفعالية.</p>
                                    <p className="text-sm mt-2 opacity-70">© {new Date().getFullYear()} Solvica AI Assistant</p>
                                </div>
                            </div>
                            <div className="mt-8 flex justify-center">
                                <button
                                    onClick={() => {
                                        setStep(1);
                                        setPlannerResponse('');
                                        setFormData({ subjects: [], hoursPerDay: '3', methodology: 'متوازن (تقنية بومودورو)' });
                                    }}
                                    className="px-6 py-3 rounded-xl font-bold text-emerald-500 bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                                >
                                    خطة جديدة
                                </button>
                                <button
                                    onClick={() => navigate('/course-challenge')}
                                    className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-blue-500 to-indigo-600 hover:opacity-90 transition-opacity shadow-md flex items-center gap-2"
                                >
                                    🚀 اختبر نفسي
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

                            <button
                                onClick={handleNext}
                                disabled={step === 1 && formData.subjects.length === 0}
                                className="bg-gradient-to-r from-teal-400 to-emerald-500 hover:opacity-90 disabled:opacity-50 text-white font-bold flex items-center gap-2 px-8 py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(52,211,153,0.3)]"
                            >
                                التالي <ChevronLeft className="w-5 h-5" />
                            </button>
                        </div>
                    )}
                </div>

            </div>
        </AppLayout >
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
