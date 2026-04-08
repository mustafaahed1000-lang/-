import { useState, useEffect, useRef } from 'react';
import AppLayout from '../layouts/AppLayout';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../lib/db/database';
import { aiClient } from '../lib/ai/aiClient';
import type { AIChatMessage } from '../lib/ai/aiClient';
import { Target, BrainCircuit, ChevronRight, Download, History, Send, Loader2, Trash2, X, CheckCircle2, XCircle, Trophy } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { exportToPDF } from '../lib/utils/pdfExport';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { checkQuota, consumeQuota } from '../lib/utils/dailyQuota';

// ── Types ─────────────────────────────────────────────────────────────────────
interface QuizQuestion {
    id: number;
    type: 'mcq' | 'tf';
    text: string;
    options?: string[];          // mcq: ['أ) ...', 'ب) ...', 'ج) ...', 'د) ...']
    correctIndex?: number;       // mcq: 0-3
    correctTF?: boolean;         // tf: true=صح, false=خطأ
    explanation: string;
}

interface QuizResult {
    questionId: number;
    selected: number | boolean;  // mcq: index chosen, tf: true/false
    correct: boolean;
}

interface SavedQuiz {
    id: string;
    docName: string;
    score: number;
    total: number;
    results: QuizResult[];
    questions: QuizQuestion[];
    createdAt: number;
}

// ── Parser: convert raw Markdown exam to structured questions ─────────────────
function parseExamToQuestions(md: string): QuizQuestion[] {
    const questions: QuizQuestion[] = [];
    const lines = md.split('\n');
    let id = 0;
    let currentQ: Partial<QuizQuestion> | null = null;
    let gatheringOptions = false;
    let optionBuffer: string[] = [];
    let correctLetterBuffer: string | null = null;
    let explanationBuffer = '';
    let inSection2 = false;

    const flush = () => {
        if (!currentQ) return;
        if (currentQ.type === 'mcq' && optionBuffer.length >= 2) {
            // map correct letter (أ ب ج د) to index
            const map: Record<string, number> = { 'أ': 0, 'ب': 1, 'ج': 2, 'د': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3, '1': 0, '2': 1, '3': 2, '4': 3 };
            const letter = correctLetterBuffer?.trim().toLowerCase() || '';
            const idx = map[letter] ?? map[letter[0]] ?? 0;
            questions.push({
                ...currentQ,
                id: ++id,
                options: optionBuffer,
                correctIndex: idx,
                explanation: explanationBuffer.trim() || 'راجع المادة للمزيد.',
            } as QuizQuestion);
        } else if (currentQ.type === 'tf') {
            const ans = correctLetterBuffer?.trim() || '';
            questions.push({
                ...currentQ,
                id: ++id,
                correctTF: ans.includes('صح') || ans.toLowerCase().includes('true') || ans.toLowerCase().startsWith('ص'),
                explanation: explanationBuffer.trim() || 'راجع المادة للمزيد.',
            } as QuizQuestion);
        }
        currentQ = null;
        optionBuffer = [];
        correctLetterBuffer = null;
        explanationBuffer = '';
        gatheringOptions = false;
    };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Detect section 2 (T/F)
        if (line.includes('القسم الثاني') || line.includes('صح أم خطأ') || line.includes('True/False') || line.includes('Section 2')) {
            flush();
            inSection2 = true;
            continue;
        }

        // Detect numbered question: starts with digit followed by . or )
        const qMatch = line.match(/^(\d+)[.)]\s*(.+)/);
        if (qMatch) {
            flush();
            currentQ = {
                type: inSection2 ? 'tf' : 'mcq',
                text: qMatch[2].replace(/\*+/g, '').trim(),
            };
            gatheringOptions = !inSection2;
            continue;
        }

        if (!currentQ) continue;

        // MCQ option lines: أ) ب) ج) د) or a) b) c) d) or A. B. C. D.
        if (gatheringOptions && line.match(/^[أبجدAaBbCcDd1234][.)]\s*.+/)) {
            optionBuffer.push(line.replace(/^[أبجدAaBbCcDd1234][.)]\s*/, '').replace(/\*+/g, '').trim());
            continue;
        }

        // Correct answer line
        if (line.match(/✔|الإجابة|الجواب|correct/i)) {
            const afterColon = line.split(/[:：]/)[1] || line;
            // Try to read the actual answer content after the colon for T/F
            const tfMatch = afterColon.match(/صح|خطأ|true|false/i);
            if (tfMatch && inSection2) {
                correctLetterBuffer = tfMatch[0];
            } else {
                // Extract letter for MCQ
                const letterMatch = afterColon.match(/[أبجدAaBbCcDd1234]/);
                correctLetterBuffer = letterMatch ? letterMatch[0] : afterColon.trim().charAt(0);
            }
            gatheringOptions = false;
            continue;
        }

        // Explanation line
        if (line.match(/📖|الشرح|Explanation/i)) {
            explanationBuffer = line.replace(/[📖*]+|الشرح[:：]?/gi, '').trim();
            // Also continue collecting explanation on subsequent lines until next question
            continue;
        }
        // Append to explanation if we've started reading it
        if (correctLetterBuffer !== null && explanationBuffer !== undefined && !line.match(/^[أبجدAaBbCcDd1234][.)]/)) {
            if (!line.match(/✔|الإجابة/i)) explanationBuffer += ' ' + line.replace(/\*+/g, '').trim();
        }
    }
    flush();
    return questions;
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function CourseChallenge() {
    const navigate = useNavigate();
    const location = useLocation();
    const contentRef = useRef<HTMLDivElement>(null);

    // Docs & generation
    const [latestDoc, setLatestDoc] = useState<any | null>(null);
    const [savedDocs, setSavedDocs] = useState<any[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [examMarkdown, setExamMarkdown] = useState<string | null>(null);

    // Interactive quiz
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [userAnswers, setUserAnswers] = useState<Record<number, number | boolean>>({});
    const [submitted, setSubmitted] = useState(false);
    const [results, setResults] = useState<QuizResult[]>([]);
    const [score, setScore] = useState(0);

    // History
    const [savedQuizzes, setSavedQuizzes] = useState<SavedQuiz[]>([]);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [viewedQuiz, setViewedQuiz] = useState<SavedQuiz | null>(null);

    // AI Chat
    const [chatHistory, setChatHistory] = useState<AIChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Load docs & quizzes
    useEffect(() => {
        const load = async () => {
            const docs = await db.getAllDocuments();
            setSavedDocs(docs);
            const files = docs.filter(d => d.filename !== '_solvica_folder_');
            if (files.length > 0) setLatestDoc(files[files.length - 1]);
            loadSavedQuizzes();
        };
        load();
    }, []);

    useEffect(() => {
        if (location.pathname === '/quiz-history') {
            setIsHistoryOpen(true);
        }
    }, [location.pathname]);

    const loadSavedQuizzes = () => {
        try {
            const stored = localStorage.getItem('solvica_quizzes');
            if (stored) setSavedQuizzes(JSON.parse(stored));
        } catch { /* ignore */ }
    };

    const saveQuizToHistory = async (qs: QuizQuestion[], res: QuizResult[], sc: number, docName: string) => {
        const quiz: SavedQuiz = {
            id: `quiz_${Date.now()}`,
            docName,
            score: sc,
            total: qs.length,
            results: res,
            questions: qs,
            createdAt: Date.now(),
        };
        const existing = (() => { try { return JSON.parse(localStorage.getItem('solvica_quizzes') || '[]'); } catch { return []; } })();
        const updated = [quiz, ...existing].slice(0, 30); // keep last 30
        localStorage.setItem('solvica_quizzes', JSON.stringify(updated));
        setSavedQuizzes(updated);

        // Also persist to DB for QuizHistory page
        try {
            await db.saveActivity({
                id: quiz.id,
                type: 'other',
                title: `اختبار: ${latestDoc?.title || quiz.docName} — ${sc}/${qs.length} ✅`,
                content: examMarkdown || '',
                chatHistory: [],
                updatedAt: Date.now(),
            });
        } catch (_) { /* fail silently */ }
    };

    const deleteQuiz = (id: string) => {
        const updated = savedQuizzes.filter(q => q.id !== id);
        localStorage.setItem('solvica_quizzes', JSON.stringify(updated));
        setSavedQuizzes(updated);
        if (viewedQuiz?.id === id) setViewedQuiz(null);
    };

    // ── Generate exam ─────────────────────────────────────────────────────────
    const generateExam = async () => {
        if (!latestDoc) return;
        const tq = checkQuota('selftest');
        if (!tq.ok) {
            alert(tq.message);
            return;
        }
        setIsGenerating(true);
        setExamMarkdown('');
        setQuestions([]);
        setUserAnswers({});
        setSubmitted(false);
        setViewedQuiz(null);
        setChatHistory([]);

        try {
            const allChunks = [...latestDoc.chunks].map((c: any) => typeof c === 'string' ? c : (c.text || ''));
            const contextStr = allChunks.join('\n---\n').substring(0, 300000);

            const sysPrompt = `أنت أستاذ جامعي ومصمم امتحانات معتمد. مهمتك إعداد ورقة اختبار أكاديمية معيارية دقيقة من النص المرفق.

🎯 شروط جودة الاختبار الإلزامية (30 سؤال بالظبط):

## 📝 القسم الأول: اختيار من متعدد (15 سؤالاً)
يجب وضع 15 سؤال اختيار من متعدد تقيس الفهم العميق.
النمط المطلوب لكل سؤال في هذا القسم:
1. السؤال هنا؟
أ) خيار أول
ب) خيار ثاني
ج) خيار ثالث
د) خيار رابع
✔ الإجابة: الحرف
📖 الشرح: جملة تشرح السبب.

## ✅ القسم الثاني: صح أم خطأ (15 سؤالاً)
يجب وضع 15 سؤال صح وخطأ.
النمط المطلوب لكل سؤال في هذا القسم:
16. العبارة هنا.
✔ الإجابة: صح / خطأ
📖 الشرح: جملة تشرح السبب.

⚠️ تأكيد حاسم: إذا كان النص المرفق فارغاً أو غير مكتمل (بسبب كونه ملف صور أو Scanned PDF لم نتمكن من قراءته)، إياك أن تعتذر أو تقول لا يوجد نص! بل اعتمد استثنائياً على معرفتك الأكاديمية العميقة لإنشاء اختبار افتراضي، واكتب في بداية الاختبار الرسالة التالية قبل الأسئلة: "> ⚠️ **ملاحظة:** الملف المرفق يحتوي على صور أو نصوص عير قابلة للقراءة آلياً، لذا قمت بتوليد اختبار شامل من قاعدة بياناتي الأكاديمية للفائدة."`;

            let fullMd = '';
            await aiClient.streamChat(
                [{ role: 'user', content: `=== محتوى المستند المرفق حصرياً ===\n${contextStr}\n=== نهاية المحتوى ===\n\nابدأ بتوليد ورقة الاختبار الشاملة من 30 سؤالاً الآن.` }],
                {
                    onChunk: (chunk: string) => {
                        fullMd += chunk;
                        setExamMarkdown(fullMd);
                    }
                },
                undefined,
                sysPrompt
            );

            // Parse into interactive questions
            const parsed = parseExamToQuestions(fullMd);
            if (parsed.length >= 5) {
                setQuestions(parsed);
                // Save immediately to history so the generated exam is accessible!
                saveQuizToHistory(parsed, [], 0, latestDoc?.title || "اختبار جديد");
            }

            const xp = parseInt(localStorage.getItem('solvica_course_progress') || '0', 10);
            localStorage.setItem('solvica_course_progress', (xp + 50).toString());

            if (fullMd.trim().length > 0) {
                consumeQuota('selftest');
            }

        } catch (error: any) {
            alert('حدث خطأ أثناء التوليد: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    // ── Submit quiz ───────────────────────────────────────────────────────────
    const submitQuiz = () => {
        const res: QuizResult[] = questions.map(q => {
            const selected = userAnswers[q.id];
            let correct = false;
            if (q.type === 'mcq') correct = selected === q.correctIndex;
            else correct = selected === q.correctTF;
            return { questionId: q.id, selected: selected ?? (q.type === 'mcq' ? -1 : null), correct };
        });
        const sc = res.filter(r => r.correct).length;
        setResults(res);
        setScore(sc);
        setSubmitted(true);
        saveQuizToHistory(questions, res, sc, latestDoc?.filename || 'مقرر');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // ── AI Chat ─────────────────────────────────────────────────────────────
    const sendChat = async () => {
        if (!chatInput.trim() || isChatting) return;
        const cq = checkQuota('chat');
        if (!cq.ok) {
            alert(cq.message);
            return;
        }
        const msg = chatInput.trim();
        setChatInput('');
        setIsChatting(true);
        const newHistory: AIChatMessage[] = [...chatHistory, { role: 'user', content: msg }];
        setChatHistory(newHistory);
        try {
            // Context: exam + wrong answers
            const wrongQs = submitted ? results.filter(r => !r.correct).map(r => {
                const q = questions.find(q => q.id === r.questionId);
                return q ? `❌ السؤال: ${q.text}\n✔ الإجابة الصحيحة: ${q.explanation}` : '';
            }).filter(Boolean).join('\n\n') : '';

            const sysContext: AIChatMessage = {
                role: 'system',
                content: `أنت مدرس أكاديمي متخصص. الطالب أنهى اختباراً وحصل على ${score}/${questions.length}.
الأسئلة التي أخطأ فيها:
${wrongQs || 'لا توجد أخطاء بعد.'}

ساعد الطالب بفهم أعمق للمواضيع التي يسأل عنها. كن مختصراً ومباشراً.`
            };

            const reply = await aiClient.chat([sysContext, ...newHistory]);
            const finalHistory: AIChatMessage[] = [...newHistory, { role: 'assistant', content: reply }];
            setChatHistory(finalHistory);
            if (reply && String(reply).trim().length > 0) {
                consumeQuota('chat');
            }
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
        } catch { /* ignore */ }
        finally { setIsChatting(false); }
    };

    // ── PDF export ────────────────────────────────────────────────────────────
    const handlePrint = () => {
        if (!contentRef.current) return;
        exportToPDF(contentRef, `اختبار_${latestDoc?.filename?.split('.')[0] || 'شامل'}`, false);
    };

    // ── Score color ───────────────────────────────────────────────────────────
    const scorePercent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const scoreColor = scorePercent >= 80 ? '#22c55e' : scorePercent >= 60 ? '#f59e0b' : '#ef4444';

    // ── Render helper: question card ─────────────────────────────────────────
    const renderQuestion = (q: QuizQuestion, idx: number, readOnly = false, resultData?: QuizResult) => {
        const chosen = readOnly ? resultData?.selected : userAnswers[q.id];
        const isCorrect = resultData?.correct;

        // Custom Styles for Majestic Academic Vibe
        const baseCardStyle = "p-6 sm:p-8 rounded-3xl border-2 transition-all duration-300 mb-6 relative overflow-hidden group shadow-sm";
        const interactiveCardStyle = "border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-[#2ba396]/50 hover:shadow-lg";
        const correctCardStyle = "border-emerald-500/50 bg-gradient-to-br from-emerald-500/5 to-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.1)]";
        const incorrectCardStyle = "border-red-500/50 bg-gradient-to-br from-red-500/5 to-red-500/10 shadow-[0_0_20px_rgba(239,68,68,0.1)]";

        return (
            <div key={q.id} className={`${baseCardStyle} ${!readOnly ? interactiveCardStyle : isCorrect ? correctCardStyle : incorrectCardStyle}`}>
                
                {/* Decorative Background Blur */}
                {!readOnly && <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#2ba396]/5 rounded-full blur-3xl group-hover:bg-[#2ba396]/10 transition-colors pointer-events-none"></div>}

                <div className="flex items-start gap-4 mb-6 relative z-10">
                    <span className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-black shadow-inner ${readOnly ? (isCorrect ? 'bg-emerald-500 text-white shadow-emerald-500/30' : 'bg-red-500 text-white shadow-red-500/30') : 'bg-gradient-to-br from-[#2ba396] to-[#238b7f] text-white shadow-[#2ba396]/30'}`}>
                        {readOnly ? (isCorrect ? '✓' : '✗') : idx + 1}
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black text-[var(--text-main)] leading-relaxed text-right flex-1 pt-1 opacity-90">{q.text}</h3>
                </div>

                {q.type === 'mcq' && q.options && (
                    <div className="space-y-3 pr-2 sm:pr-14 relative z-10">
                        {q.options.map((opt, oi) => {
                            const letters = ['أ', 'ب', 'ج', 'د'];
                            const isChosenOpt = chosen === oi;
                            const isCorrectOpt = readOnly && q.correctIndex === oi;
                            
                            let optStyle = 'border-[var(--border-color)] bg-[var(--bg-background)] text-[var(--text-muted)]';
                            let iconColor = 'text-[#2ba396]/50';
                            
                            if (readOnly) {
                                if (isCorrectOpt) {
                                    optStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold shadow-sm ring-1 ring-emerald-500/30';
                                    iconColor = 'text-emerald-600 dark:text-emerald-400';
                                }
                                else if (isChosenOpt && !isCorrectOpt) {
                                    optStyle = 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300 shadow-sm ring-1 ring-red-500/30';
                                    iconColor = 'text-red-600 dark:text-red-400';
                                }
                            } else if (isChosenOpt) {
                                optStyle = 'border-[#2ba396] bg-[#2ba396]/10 text-[#2ba396] font-bold shadow-sm ring-1 ring-[#2ba396]/30';
                                iconColor = 'text-[#2ba396]';
                            }

                            return (
                                <label key={oi} className={`flex items-center gap-4 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${optStyle} ${readOnly ? 'cursor-default' : 'hover:border-[#2ba396] hover:shadow-md hover:-translate-y-0.5'}`}>
                                    <div className="relative flex items-center justify-center shrink-0">
                                        <input
                                            type="radio"
                                            name={`q_${q.id}`}
                                            value={oi}
                                            checked={chosen === oi}
                                            disabled={readOnly}
                                            onChange={() => !readOnly && setUserAnswers(prev => ({ ...prev, [q.id]: oi }))}
                                            className="opacity-0 absolute w-full h-full cursor-pointer"
                                        />
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isChosenOpt || isCorrectOpt ? 'border-current' : 'border-gray-400'}`}>
                                            {(isChosenOpt || isCorrectOpt) && <div className="w-2.5 h-2.5 rounded-full bg-current"></div>}
                                        </div>
                                    </div>
                                    <span className={`font-black text-lg ${iconColor} shrink-0 w-6 text-center`}>{letters[oi]}</span>
                                    <span className="text-right flex-1 text-lg">{opt}</span>
                                </label>
                            );
                        })}
                    </div>
                )}

                {q.type === 'tf' && (
                    <div className="flex gap-4 pr-2 sm:pr-14 relative z-10 mt-4">
                        {([true, false] as boolean[]).map(val => {
                            const label = val ? 'صح ✅' : 'خطأ ❌';
                            const isChosenVal = chosen === val;
                            const isCorrectVal = readOnly && q.correctTF === val;
                            
                            let valStyle = 'border-[var(--border-color)] bg-[var(--bg-background)] text-[var(--text-muted)]';
                            
                            if (readOnly) {
                                if (isCorrectVal) valStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-black shadow-sm ring-1 ring-emerald-500/30';
                                else if (isChosenVal && !isCorrectVal) valStyle = 'border-red-500 bg-red-500/10 text-red-700 dark:text-red-300 font-bold shadow-sm ring-1 ring-red-500/30';
                            } else if (isChosenVal) {
                                valStyle = 'border-[#2ba396] bg-[#2ba396]/10 text-[#2ba396] font-black shadow-sm ring-1 ring-[#2ba396]/30';
                            }
                            return (
                                <label key={String(val)} className={`flex items-center gap-3 px-6 py-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 flex-1 justify-center text-xl ${valStyle} ${readOnly ? 'cursor-default' : 'hover:border-[#2ba396] hover:shadow-md hover:-translate-y-0.5'}`}>
                                    <input type="radio" name={`q_${q.id}`} value={String(val)} checked={chosen === val} disabled={readOnly} onChange={() => !readOnly && setUserAnswers(prev => ({ ...prev, [q.id]: val }))} className="hidden" />
                                    {label}
                                </label>
                            );
                        })}
                    </div>
                )}

                {readOnly && (
                    <div className="mt-3 p-3 bg-[var(--bg-background)] rounded-xl border border-[var(--border-color)] text-sm text-right">
                        <span className="font-black text-[#2ba396]">📖 الشرح: </span>
                        <span className="text-[var(--text-muted)]">{q.explanation}</span>
                    </div>
                )}
            </div>
        );
    };

    // ── Total answered count ─────────────────────────────────────────────────
    const answeredCount = Object.keys(userAnswers).length;

    return (
        <AppLayout>
            <div className="min-h-screen bg-[var(--bg-background)] flex flex-col p-4 md:p-8" dir="rtl">

                {/* History Drawer */}
                {isHistoryOpen && (
                    <div className="fixed inset-0 z-[99999] bg-black/60 backdrop-blur-sm flex justify-end transition-opacity" dir="rtl" onClick={() => setIsHistoryOpen(false)}>
                        <div className="w-full max-w-[320px] h-[100dvh] pt-12 sm:pt-0 bg-[var(--bg-surface)] border-l border-[var(--border-color)] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="p-5 sticky top-0 bg-[var(--bg-surface)] z-10 flex items-center justify-between border-b border-[var(--border-color)] shrink-0">
                                <h2 className="font-black text-xl sm:text-2xl text-[var(--text-main)] flex items-center gap-2"><History className="w-5 h-5 sm:w-6 sm:h-6 text-[#2ba396]" /> السجل</h2>
                                <button onClick={() => setIsHistoryOpen(false)} className="w-9 h-9 flex items-center justify-center bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors shadow-sm shrink-0"><X className="w-5 h-5" /></button>
                            </div>
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {savedQuizzes.length === 0 && <p className="text-center text-[var(--text-muted)] py-10">لا توجد اختبارات محفوظة.</p>}
                                {savedQuizzes.map(qz => (
                                    <div key={qz.id} onClick={() => { setViewedQuiz(qz); setIsHistoryOpen(false); }} className="p-4 bg-[var(--bg-background)] rounded-xl border border-[var(--border-color)] hover:border-[#2ba396]/50 cursor-pointer group transition-all">
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex-1 min-w-0">
                                                <p className="font-bold text-[var(--text-main)] text-sm whitespace-normal leading-snug break-words" style={{ wordBreak: 'break-word' }}>{qz.docName}</p>
                                                <p className="text-xs text-[var(--text-muted)] mt-1">{new Date(qz.createdAt).toLocaleDateString('ar-EG')}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 shrink-0">
                                                <span className="font-black text-sm" style={{ color: Math.round((qz.score / qz.total) * 100) >= 60 ? '#22c55e' : '#ef4444' }}>{qz.score}/{qz.total}</span>
                                                <button onClick={e => { e.stopPropagation(); deleteQuiz(qz.id); }} className="text-red-500 hover:text-white transition-opacity p-1.5 bg-red-500/10 hover:bg-red-500 rounded-lg shrink-0 flex items-center justify-center opacity-100 always-visible"><Trash2 className="w-5 h-5 sm:w-4 sm:h-4" /></button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Viewing a Past Quiz */}
                {viewedQuiz && (
                    <div className="max-w-4xl mx-auto w-full">
                        <div className="flex justify-between items-center mb-6">
                            <button onClick={() => setViewedQuiz(null)} className="flex items-center gap-2 text-[#2ba396] bg-[#2ba396]/10 px-4 py-2 rounded-xl hover:bg-[#2ba396]/20 font-bold transition-colors"><ChevronRight className="w-5 h-5" /> رجوع للمولد</button>
                            <div className="font-black text-2xl flex items-center gap-3">
                                <span className="text-[var(--text-main)] text-sm font-bold bg-[var(--bg-surface)] px-3 py-1 rounded-lg border border-[var(--border-color)] hidden md:block">{viewedQuiz.docName}</span>
                                <span style={{ color: Math.round((viewedQuiz.score / viewedQuiz.total) * 100) >= 60 ? '#22c55e' : '#ef4444' }}>{viewedQuiz.score}/{viewedQuiz.total}</span>
                            </div>
                        </div>
                        {viewedQuiz.questions && viewedQuiz.questions.length > 0 ? (
                            <div className="space-y-3 mb-8">
                                {viewedQuiz.questions.map((q, i) => renderQuestion(q, i, true, viewedQuiz.results.find(r => r.questionId === q.id)))}
                            </div>
                        ) : (
                            <div className="text-center p-10 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl mb-8">
                                <p className="text-[var(--text-muted)] font-bold text-lg">لم يتم حفظ الأسئلة في الإصدارات القديمة.</p>
                            </div>
                        )}
                        <div className="flex justify-center flex-wrap gap-4 pb-12">
                            {viewedQuiz.results.length === 0 ? (
                                <button onClick={() => {
                                    setQuestions(viewedQuiz.questions);
                                    setExamMarkdown("تم تحميل الاختبار بنجاح من السجل...");
                                    setUserAnswers({});
                                    setSubmitted(false);
                                    setViewedQuiz(null);
                                    setChatHistory([]);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }} className="btn-primary px-8 py-3 font-bold text-lg flex items-center gap-2 shadow-[0_0_20px_rgba(123,47,255,0.4)]">▶️ إكمال الامتحان الآن</button>
                            ) : (
                                <button onClick={() => {
                                    setQuestions(viewedQuiz.questions);
                                    setExamMarkdown("تم تحميل الاختبار بنجاح من السجل...");
                                    setUserAnswers({});
                                    setSubmitted(false);
                                    setViewedQuiz(null);
                                    setChatHistory([]);
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }} className="btn-primary px-8 py-3 font-bold text-lg flex items-center gap-2 shadow-[0_0_20px_rgba(123,47,255,0.4)]">🔄 إعادة تقديم نفس الاختبار</button>
                            )}
                            <button onClick={generateExam} className="bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-color)] hover:border-[#2ba396] px-8 py-3 font-bold text-lg rounded-xl flex items-center gap-2 transition-all">✨ توليد اختبار جديد</button>
                        </div>
                    </div>
                )}

                {!viewedQuiz && (
                    <>
                        {/* Header */}
                        <header className="flex justify-between items-center mb-8 max-w-5xl mx-auto w-full gap-3 flex-wrap">
                            <button onClick={() => navigate('/games')} className="flex items-center gap-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors font-bold shrink-0">
                                <ChevronRight className="w-5 h-5" /> رجوع للألعاب
                            </button>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-2 bg-[var(--widget-bg)] border border-[var(--border-color)] hover:border-[#2ba396] text-[var(--text-main)] px-4 py-2.5 rounded-xl font-bold transition-all text-sm">
                                    <History className="w-4 h-4" /> السجل
                                </button>
                                {examMarkdown && !isGenerating && (
                                    <button onClick={handlePrint} className="flex items-center gap-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 px-4 py-2.5 rounded-xl font-bold transition-all border border-emerald-500/20 text-sm">
                                        <Download className="w-4 h-4" /> <span className="hidden sm:inline">تصدير PDF</span>
                                    </button>
                                )}
                            </div>
                        </header>

                        <div className="flex-1 flex flex-col items-center justify-start max-w-5xl mx-auto w-full">
                            <AnimatePresence mode="wait">

                                {/* IDLE */}
                                {!isGenerating && !examMarkdown && (
                                    <motion.div key="idle" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="glass-widget p-8 md:p-12 rounded-3xl text-center shadow-2xl w-full max-w-3xl border-t-4 border-t-primary">
                                        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <Target className="w-12 h-12 text-primary" />
                                        </div>
                                        <h1 className="text-3xl md:text-5xl font-black font-display mb-4 text-[var(--text-main)]">مولد الاختبارات التفاعلية</h1>
                                        {latestDoc ? (
                                            <>
                                                <p className="text-[var(--text-muted)] text-lg mb-8 max-w-2xl mx-auto leading-relaxed">
                                                    سأوّلد ورقة اختبار أكاديمية مكوّنة من <strong className="text-primary">30 سؤالاً</strong> تفاعلياً — تختار إجابتك وتعرف نتيجتك فوراً مع شرح كل سؤال.
                                                </p>
                                                <div className="bg-[var(--widget-bg)] border border-[var(--border-color)] rounded-xl p-5 mb-8 w-full max-w-md mx-auto text-right">
                                                    <label className="block text-sm font-bold text-[var(--text-muted)] mb-3">حدد المقرر المرجعي:</label>
                                                    <select className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-4 text-[var(--text-main)] outline-none font-bold shadow-sm focus:border-primary/50 transition-colors"
                                                        value={latestDoc?.id || ''}
                                                        onChange={e => { const doc = savedDocs.find(d => d.id === e.target.value); if (doc) setLatestDoc(doc); }}>
                                                        {savedDocs.filter(d => d.filename !== '_solvica_folder_').map(doc => (
                                                            <option key={doc.id} value={doc.id}>{doc.subjectName && doc.subjectName !== 'مقرر عام' ? `${doc.subjectName} - ` : ''}{doc.filename}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <button onClick={generateExam} className="btn-primary px-12 py-5 text-xl font-bold shadow-[0_0_20px_rgba(123,47,255,0.4)] transition-all hover:scale-105">
                                                    ابدأ الاختبار التفاعلي 🎯
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-[var(--text-muted)] text-lg mb-8">ارفع ملفات دراسية أولاً لتوليد الاختبار منها.</p>
                                                <button onClick={() => navigate('/files')} className="btn-secondary px-8 py-3">إدارة الملفات</button>
                                            </>
                                        )}
                                    </motion.div>
                                )}

                                {/* GENERATING */}
                                {isGenerating && (
                                    <motion.div key="generating" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-center py-20">
                                        <BrainCircuit className="w-24 h-24 text-primary mx-auto mb-6 animate-pulse drop-shadow-[0_0_30px_rgba(123,47,255,0.5)]" />
                                        <h2 className="text-3xl font-bold mb-4 text-[var(--text-main)]">جاري تحليل المادة وبناء الاختبار...</h2>
                                        <p className="text-[var(--text-muted)] text-lg">سيكون جاهزاً خلال لحظات</p>
                                    </motion.div>
                                )}

                                {/* INTERACTIVE QUIZ & RESULTS CONTAINER */}
                                <motion.div key="interactive-quiz-container" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full">
                                    <div ref={contentRef} className="w-full">
                                        {!isGenerating && examMarkdown && questions.length >= 5 && !submitted && (
                                            <div className="w-full">
                                                {/* Progress bar */}
                                                <div className="sticky top-0 z-10 bg-[var(--bg-background)] border-b border-[var(--border-color)] px-4 py-3 mb-6 -mx-4 md:-mx-8 flex items-center gap-4">
                                                    <span className="text-sm font-bold text-[var(--text-muted)] shrink-0">{answeredCount}/{questions.length} إجابة</span>
                                                    <div className="flex-1 bg-[var(--border-color)] rounded-full h-2">
                                                        <div className="bg-[#2ba396] h-2 rounded-full transition-all duration-500" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
                                                    </div>
                                                </div>
                                                <div>
                                                    {questions.map((q, i) => renderQuestion(q, i))}
                                                </div>
                                                <div className="sticky bottom-4 mt-6 flex justify-center">
                                                    <button
                                                        onClick={submitQuiz}
                                                        disabled={answeredCount < questions.length}
                                                        className={`px-10 py-4 rounded-2xl font-black text-lg shadow-2xl transition-all ${answeredCount === questions.length ? 'bg-[#2ba396] hover:bg-[#238b7f] text-white hover:scale-105 hover:shadow-[#2ba396]/40' : 'bg-[var(--border-color)] text-[var(--text-muted)] cursor-not-allowed'}`}
                                                    >
                                                        {answeredCount < questions.length ? `أجب على ${questions.length - answeredCount} سؤال متبقٍ` : '📊 إنهاء الاختبار ومعرفة النتيجة'}
                                                    </button>
                                                </div>
                                            </div>
                                        )}

                                        {/* RESULTS */}
                                        {submitted && !viewedQuiz && (
                                            <div className="w-full">
                                                {/* Score card */}
                                                <div className="glass-widget p-8 rounded-3xl text-center mb-8 shadow-2xl border-2" style={{ borderColor: scoreColor + '40' }}>
                                                    <Trophy className="w-16 h-16 mx-auto mb-4" style={{ color: scoreColor }} />
                                                    <div className="text-6xl font-black mb-2" style={{ color: scoreColor }}>{score}/{questions.length}</div>
                                                    <div className="text-2xl font-bold text-[var(--text-muted)] mb-2">{scorePercent}%</div>
                                                    <div className="text-lg font-bold" style={{ color: scoreColor }}>
                                                        {scorePercent >= 80 ? '🎉 ممتاز! أداء رائع' : scorePercent >= 60 ? '👍 جيد، استمر في المراجعة' : '📚 تحتاج مراجعة أعمق'}
                                                    </div>
                                                    <div className="flex gap-3 justify-center mt-6 flex-wrap">
                                                        <div className="px-4 py-2 bg-green-500/10 text-green-500 rounded-xl font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" />{results.filter(r => r.correct).length} صحيح</div>
                                                        <div className="px-4 py-2 bg-red-500/10 text-red-500 rounded-xl font-bold flex items-center gap-2"><XCircle className="w-4 h-4" />{results.filter(r => !r.correct).length} خطأ</div>
                                                    </div>
                                                </div>

                                                {/* Questions with answers */}
                                                <h3 className="text-xl font-black text-[var(--text-main)] mb-4 flex items-center gap-2">
                                                    <CheckCircle2 className="w-6 h-6 text-[#2ba396]" /> مراجعة إجاباتك
                                                </h3>
                                                {questions.map((q, i) => renderQuestion(q, i, true, results.find(r => r.questionId === q.id)))}

                                                <div className="flex justify-center pb-12 mt-6" data-html2canvas-ignore="true">
                                                    <button onClick={() => { setExamMarkdown(null); setSubmitted(false); setQuestions([]); setUserAnswers({}); setChatHistory([]); }} className="btn-secondary px-10 py-4 font-bold border-2 text-lg hover:bg-[var(--hover-bg)]">
                                                        توليد اختبار جديد من نفس المادة
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div> {/* END CONTENT REF WRAPPER */}
                                </motion.div>

                                {/* AI Chat Section has to be EXCLUDED from contentRef to avoid PDF clutter */}
                                {submitted && !viewedQuiz && (
                                    <div className="w-full">
                                        <div className="mt-8 glass-widget p-6 rounded-3xl shadow-xl">
                                            <h3 className="text-lg font-black text-[var(--text-main)] mb-4 flex items-center gap-2">
                                                <BrainCircuit className="w-5 h-5 text-primary" /> اسأل الذكاء الاصطناعي
                                                <span className="text-sm font-normal text-[var(--text-muted)]">— شرح مفصل لأي سؤال أخطأت فيه</span>
                                            </h3>
                                            <div className="space-y-3 mb-4 max-h-80 overflow-y-auto custom-scrollbar">
                                                {chatHistory.length === 0 && <p className="text-[var(--text-muted)] text-sm text-right py-4 text-center">ابدأ محادثة مع الذكاء الاصطناعي...</p>}
                                                {chatHistory.map((m, i) => (
                                                    <div key={i} className={`p-4 rounded-2xl text-right max-w-[90%] ${m.role === 'user' ? 'bg-[#2ba396]/10 border border-[#2ba396]/20 mr-auto' : 'bg-[var(--bg-background)] border border-[var(--border-color)] ml-auto w-full max-w-full html-content'}`}>
                                                        {m.role === 'assistant' ? (
                                                            <div className="prose prose-sm dark:prose-invert max-w-none text-right text-[var(--text-main)]" dir="rtl">
                                                                <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }]]}>{m.content as string}</ReactMarkdown>
                                                            </div>
                                                        ) : <p className="font-bold text-[#238b7f]">{m.content as string}</p>}
                                                    </div>
                                                ))}
                                                {isChatting && <div className="flex items-center gap-2 text-[#2ba396] animate-pulse p-3"><Loader2 className="w-4 h-4 animate-spin" /> جاري التفكير...</div>}
                                                <div ref={chatEndRef} />
                                            </div>
                                            <div className="flex gap-2">
                                                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()} placeholder="اسأل عن أي سؤال أخطأت فيه..." className="flex-1 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] text-right outline-none focus:border-[#2ba396] transition-all" dir="rtl" />
                                                <button onClick={sendChat} disabled={isChatting || !chatInput.trim()} className="bg-[#2ba396] hover:bg-[#238b7f] text-white rounded-xl px-4 py-3 flex items-center justify-center transition-all disabled:opacity-50"><Send className="w-5 h-5" /></button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* FALLBACK: show markdown if parse failed */}
                                {!isGenerating && examMarkdown && questions.length < 5 && !submitted && (
                                    <motion.div key="result-md" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full">
                                        <div className="glass-widget html-content p-6 md:p-14 rounded-3xl shadow-2xl prose prose-lg prose-invert max-w-none prose-headings:text-[var(--text-main)] prose-p:text-[var(--text-main)] prose-strong:text-primary prose-li:text-[var(--text-main)] mb-8" ref={contentRef}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[[rehypeKatex, { strict: false }]]}>{examMarkdown}</ReactMarkdown>
                                        </div>
                                        <div className="flex justify-center pb-12">
                                            <button onClick={() => { setExamMarkdown(null); setQuestions([]); }} className="btn-secondary px-10 py-4 font-bold border-2 text-lg">توليد اختبار آخر</button>
                                        </div>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
