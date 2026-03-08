import { useState, useEffect, useRef } from 'react';
import AppLayout from '../layouts/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/db/database';
import { aiClient } from '../lib/ai/aiClient';
import { Trophy, Target, BrainCircuit, ChevronRight, RefreshCw, XCircle, CheckCircle2, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { exportToPDF } from '../lib/utils/pdfExport';

interface Question {
    question: string;
    options: string[];
    answer: string;
}

export default function CourseChallenge() {
    const navigate = useNavigate();
    const [latestDoc, setLatestDoc] = useState<any | null>(null);
    const [savedDocs, setSavedDocs] = useState<any[]>([]);
    const [gameState, setGameState] = useState<'idle' | 'generating' | 'playing' | 'results' | 'error'>('idle');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [score, setScore] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = () => {
        exportToPDF(printRef, 'اختبار_المادة_Solvica');
    };

    useEffect(() => {
        const fetchDocs = async () => {
            const docs = await db.getAllDocuments();
            setSavedDocs(docs);
            const files = docs.filter(d => d.filename !== '_solvica_folder_');
            if (files.length > 0) {
                setLatestDoc(files[files.length - 1]);
            }
        };
        fetchDocs();
    }, []);

    const startGame = async () => {
        if (!latestDoc) return;
        setGameState('generating');
        try {
            // Use ALL chunks (ordered) so the AI sees the full document and can extract real questions
            const allChunks = [...latestDoc.chunks].map((c: any) => typeof c === 'string' ? c : (c.text || ''));
            const textToAnalyze = allChunks.join('\n---\n').substring(0, 40000);

            const prompt = `أنت أستاذ أكاديمي صارم ومحترف.

المهمة: بناء اختبار قوي من أسئلة اختيار من متعدد بناءً على النص المرفق **فقط لا غير**.

📌 قواعد الامتحانات الإجبارية والصارمة:
1. الأسئلة والأجوبة يجب أن تكون مستخرجة حصرياً من النص المرفق في الأسفل، حرفياً وبالمعنى.
2. تحذير قطعي: يُمنع منعاً باتاً إضافة أو تأليف أسئلة من خارج النص أو من معلوماتك العامة، حتى لو كانت الأسئلة المطلوبة 10.
3. يمكنك توليد من 5 إلى 15 سؤال حسب حجم وأهمية المعلومات المتوفرة في النص. إذا كان النص صغيراً ولدّد 5 أسئلة فقط، لا تخترع الباقي أبداً!
4. الخيارات يجب أن تكون قوية وخادعة ومحتملة من داخل النص.
5. اكتب المعادلات هكذا: f'(x) = 2x أو س² + ص² أو x^2.

يجب أن يكون المخرج عبارة عن JSON فقط لا غير، Array of Objects بهذا الشكل:
[
  {
    "question": "نص السؤال هنا",
    "options": ["خيار حقيقي أ", "خيار حقيقي ب", "خيار حقيقي ج", "خيار حقيقي د"],
    "answer": "الخيار الصحيح هنا (يجب أن يكون مطابق حرفياً لأحد الخيارات)"
  }
]
لا تقم بإضافة أي نصوص أخرى.

الحصول على الأسئلة من السياق التالي:
${textToAnalyze}`;

            const res = await aiClient.chat([{ role: 'user', content: prompt }]);

            // Robust JSON extraction
            let cleanRes = res.replace(/```json/gi, '').replace(/```/g, '').trim();
            const jsonMatch = cleanRes.match(/\[\s*\{[\s\S]*\}\s*\]/);
            if (!jsonMatch) throw new Error("لم يقم الذكاء الاصطناعي بتوليد مصفوفة JSON صالحة.");

            let parsedStr = jsonMatch[0];
            // Fix trailing commas commonly output by LLMs
            parsedStr = parsedStr.replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');

            let parsedQs: Question[] = [];
            try {
                parsedQs = JSON.parse(parsedStr);
            } catch (e) {
                // Ultimate fallback for deeply mangled JSON
                parsedQs = eval('(' + parsedStr + ')');
            }

            if (parsedQs && parsedQs.length > 0) {
                // Ensure every question has 4 options
                const validQs = parsedQs.filter(q => q.question && q.options && q.options.length >= 2 && q.answer);
                if (validQs.length === 0) throw new Error("الأسئلة المستخرجة غير مكتملة.");

                setQuestions(validQs);
                setCurrentQIndex(0);
                setScore(0);
                setSelectedAnswer(null);
                setGameState('playing');
            } else {
                setGameState('error');
            }

        } catch (error) {
            console.error("Game Generation Error:", error);
            setGameState('error');
        }
    };

    const handleAnswer = (option: string) => {
        if (selectedAnswer !== null) return; // Prevent multiple clicks
        setSelectedAnswer(option);
        const correct = option === questions[currentQIndex].answer;

        if (correct) {
            setScore(prev => prev + 20);
            const currentXp = parseInt(localStorage.getItem('solvica_course_progress') || '0', 10);
            localStorage.setItem('solvica_course_progress', (currentXp + 20).toString());
        }

        setTimeout(() => {
            if (currentQIndex < questions.length - 1) {
                setCurrentQIndex(prev => prev + 1);
                setSelectedAnswer(null);
            } else {
                setGameState('results');
            }
        }, 1500);
    };

    return (
        <AppLayout>
            <div className="min-h-screen bg-[var(--bg-background)] flex flex-col p-4 md:p-8">

                <header className="flex justify-between items-center mb-8 max-w-4xl mx-auto w-full">
                    <button onClick={() => navigate('/games')} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors font-bold">
                        <ChevronRight className="w-5 h-5" /> رجوع للألعاب
                    </button>
                    {gameState === 'playing' && (
                        <div className="flex items-center gap-4 bg-[var(--bg-surface)] px-4 py-2 rounded-2xl border border-[var(--border-color)]">
                            <Trophy className="w-5 h-5 text-yellow-500" />
                            <span className="font-black text-xl text-[var(--text-main)]">{score}</span>
                        </div>
                    )}
                </header>

                <div className="flex-1 flex flex-col items-center justify-center max-w-3xl mx-auto w-full">
                    <AnimatePresence mode="wait">

                        {gameState === 'idle' && (
                            <motion.div
                                key="idle"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="glass-widget p-8 md:p-12 rounded-3xl text-center shadow-2xl w-full"
                            >
                                <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(123,47,255,0.2)]">
                                    <Target className="w-12 h-12 text-primary" />
                                </div>
                                <h1 className="text-3xl md:text-5xl font-black font-display mb-4 text-[var(--text-main)]">تحدي المادة الذكي</h1>

                                {latestDoc ? (
                                    <>
                                        <p className="text-[var(--text-muted)] text-lg mb-8">
                                            سيقوم الذكاء الاصطناعي ببناء 30 سؤالاً تفاعلياً بمستوى جامعة القدس المفتوحة بناءً على آخر ملزمة قمت برفعها. هل أنت مستعد لاختبار معلوماتك؟
                                        </p>
                                        <div className="bg-[var(--widget-bg)] border border-[var(--border-color)] rounded-xl p-6 mb-8 w-full max-w-md mx-auto text-right">
                                            <label className="block text-sm font-bold text-[var(--text-muted)] mb-3">اختر المادة التي ترغب باختبار نفسك بها:</label>
                                            <select
                                                className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-4 text-[var(--text-main)] outline-none font-bold shadow-sm focus:border-primary/50 transition-colors"
                                                value={latestDoc?.id || ''}
                                                onChange={(e) => {
                                                    const doc = savedDocs.find(d => d.id === e.target.value);
                                                    if (doc) setLatestDoc(doc);
                                                }}
                                            >
                                                {savedDocs.filter(d => d.filename !== '_solvica_folder_').map(doc => (
                                                    <option key={doc.id} value={doc.id}>
                                                        {doc.subjectName && doc.subjectName !== 'مقرر عام' ? `${doc.subjectName} - ` : ''}{doc.filename}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <br />
                                        <button onClick={startGame} className="btn-primary px-10 py-4 text-xl shadow-[0_0_20px_rgba(123,47,255,0.4)]">
                                            ابدأ التحدي الآن 🚀
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-[var(--text-muted)] text-lg mb-8">
                                            لم تقم برفع أي ملفات دراسية حتى الآن. يرجى رفع ملف أولاً ليبني الذكاء الاصطناعي تحدياً مخصصاً لك.
                                        </p>
                                        <button onClick={() => navigate('/files')} className="btn-secondary px-8 py-3">
                                            الذهاب للملفات
                                        </button>
                                    </>
                                )}
                            </motion.div>
                        )}

                        {gameState === 'generating' && (
                            <motion.div
                                key="generating"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-center"
                            >
                                <BrainCircuit className="w-24 h-24 text-primary mx-auto mb-6 animate-pulse drop-shadow-[0_0_20px_rgba(123,47,255,0.5)]" />
                                <h2 className="text-3xl font-bold mb-4 text-[var(--text-main)]">جاري صياغة الأسئلة...</h2>
                                <p className="text-[var(--text-muted)] text-lg">الذكاء يقرأ الملزمة ويستخرج أهم النقاط لتحداك بها.</p>
                            </motion.div>
                        )}

                        {gameState === 'playing' && questions.length > 0 && (
                            <motion.div
                                key={`q-${currentQIndex}`}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                className="w-full"
                            >
                                <div className="mb-6 flex justify-between items-center">
                                    <span className="text-[var(--text-muted)] font-bold">سؤال {currentQIndex + 1} من {questions.length}</span>
                                    <div className="flex gap-1">
                                        {questions.map((_, i) => (
                                            <div key={i} className={`h-2 w-8 rounded-full ${i <= currentQIndex ? 'bg-primary' : 'bg-[var(--border-color)]'}`} />
                                        ))}
                                    </div>
                                </div>

                                <div className="glass-widget p-6 md:p-10 rounded-3xl mb-8 shadow-xl">
                                    <h2 className="text-2xl md:text-3xl font-bold leading-relaxed text-[var(--text-main)]">
                                        {questions[currentQIndex].question}
                                    </h2>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {questions[currentQIndex].options.map((option, idx) => {
                                        const isSelected = selectedAnswer === option;
                                        const isCorrectOpt = option === questions[currentQIndex].answer;

                                        let btnClass = "glass-widget p-6 rounded-2xl text-right font-bold text-lg border-2 transition-all duration-300 relative overflow-hidden ";

                                        if (selectedAnswer !== null) {
                                            if (isCorrectOpt) {
                                                btnClass += "bg-emerald-500/10 border-emerald-500 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.2)]";
                                            } else if (isSelected) {
                                                btnClass += "bg-rose-500/10 border-rose-500 text-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.2)]";
                                            } else {
                                                btnClass += "border-[var(--border-color)] opacity-50";
                                            }
                                        } else {
                                            btnClass += "border-[var(--border-color)] hover:border-primary/50 hover:bg-[var(--hover-bg)] text-[var(--text-main)] cursor-pointer";
                                        }

                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswer(option)}
                                                disabled={selectedAnswer !== null}
                                                className={btnClass}
                                            >
                                                <div className="relative z-10 flex justify-between items-center">
                                                    <span>{option}</span>
                                                    {selectedAnswer !== null && isCorrectOpt && <CheckCircle2 className="w-6 h-6 shrink-0" />}
                                                    {selectedAnswer !== null && isSelected && !isCorrectOpt && <XCircle className="w-6 h-6 shrink-0" />}
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {gameState === 'results' && (
                            <motion.div
                                key="results"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="glass-widget p-8 md:p-12 rounded-3xl text-center shadow-2xl w-full"
                            >
                                <Trophy className={`w-24 h-24 mx-auto mb-6 drop-shadow-[0_0_30px_rgba(255,202,40,0.5)] ${score > questions.length * 5 ? 'text-yellow-400' : 'text-slate-400'}`} />
                                <h2 className="text-4xl font-black mb-2 text-[var(--text-main)]">انتهى التحدي!</h2>
                                <p className="text-[var(--text-muted)] text-lg mb-8">لقد أجبت بشكل صحيح وحصلت على:</p>

                                <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent mb-12">
                                    {score} <span className="text-2xl text-[var(--text-muted)] font-bold">نقطة</span>
                                </div>

                                <div className="flex flex-col md:flex-row gap-4 justify-center">
                                    <button onClick={handlePrint} className="btn-secondary px-8 py-3 flex items-center justify-center gap-2 border-emerald-500 text-emerald-500 hover:bg-emerald-500/10">
                                        <Download className="w-5 h-5" /> تصدير الاختبار المعياري (PDF)
                                    </button>
                                    <button onClick={startGame} className="btn-primary px-8 py-3 flex items-center justify-center gap-2">
                                        <RefreshCw className="w-5 h-5" /> إعادة التحدي بأسئلة جديدة
                                    </button>
                                    <button onClick={() => navigate('/games')} className="btn-secondary px-8 py-3 bg-transparent">
                                        رجوع للألعاب
                                    </button>
                                </div>

                                {/* Hidden Printable Exam Content */}
                                <div className="hidden">
                                    <div ref={printRef} className="print:block print:p-12 print:bg-white print:text-black" dir="rtl">
                                        <div className="text-center mb-10 border-b-2 border-gray-300 pb-6">
                                            <h1 className="text-4xl font-black mb-3">جامعة القدس المفتوحة</h1>
                                            <h2 className="text-2xl font-bold tracking-widest text-gray-700">امتحان مهارات - مادة: {latestDoc?.filename.split('.')[0] || 'المقرر'}</h2>
                                            <p className="text-gray-500 mt-4">تم إنشاء هذا الاختبار بمستوى جامعي عبر الذكاء الاصطناعي (Solvica)</p>
                                        </div>

                                        <div className="space-y-8 mb-16">
                                            {questions.map((q, qIndex) => (
                                                <div key={qIndex} className="break-inside-avoid">
                                                    <h3 className="text-xl font-bold mb-4">{qIndex + 1}. {q.question}</h3>
                                                    <div className="grid grid-cols-2 gap-4 mr-6">
                                                        {q.options.map((opt, oIndex) => (
                                                            <div key={oIndex} className="flex items-center gap-3">
                                                                <div className="w-6 h-6 rounded-full border-2 border-gray-400"></div>
                                                                <span className="text-lg">{opt}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-16 pt-8 border-t-2 border-dashed border-gray-300 break-before-page">
                                            <h2 className="text-2xl font-black text-center mb-8 bg-gray-100 p-4 rounded-xl">مفتاح إجابات الاختبار (للمصحح / للطالب بعد الانتهاء)</h2>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {questions.map((q, qIndex) => (
                                                    <div key={qIndex} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                                                        <span className="font-bold">سؤال {qIndex + 1}: </span>
                                                        <span className="text-emerald-700 font-bold">{q.answer}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {gameState === 'error' && (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-center"
                            >
                                <XCircle className="w-20 h-20 text-rose-500 mx-auto mb-6" />
                                <h2 className="text-3xl font-bold mb-4 text-[var(--text-main)]">عذراً، تعذر توليد الأسئلة</h2>
                                <p className="text-[var(--text-muted)] text-lg mb-8">ربما النص غير واضح أو واجه الذكاء مشكلة في التنسيق. حاول مرة أخرى.</p>
                                <button onClick={startGame} className="btn-primary px-8 py-3 rounded-full">المحاولة مجدداً</button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </div>
            </div>
        </AppLayout>
    );
}
