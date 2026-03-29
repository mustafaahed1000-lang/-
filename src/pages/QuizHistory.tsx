import React, { useState, useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import { db, type SavedActivity } from '../lib/db/database';
import { Trash2, ClipboardList, ChevronDown, ChevronUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function QuizHistory() {
    const [quizzes, setQuizzes] = useState<SavedActivity[]>([]);
    const [expanded, setExpanded] = useState<string | null>(null);

    useEffect(() => {
        loadQuizzes();
    }, []);

    const loadQuizzes = async () => {
        const all = await db.getAllActivities();
        setQuizzes(all.filter(a => a.type === 'other' || a.title?.includes('اختبر')));
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('هل تريد حذف هذا الاختبار؟')) return;
        await db.deleteActivity(id);
        setQuizzes(prev => prev.filter(q => q.id !== id));
    };

    const formatDate = (ts: number) => {
        return new Date(ts).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <AppLayout>
            <div dir="rtl" className="max-w-4xl mx-auto px-4 py-6 space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#8e2de2] to-[#2ba396] flex items-center justify-center shadow-lg">
                        <ClipboardList className="w-7 h-7 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-[var(--text-main)]">سجل اختباراتي 📝</h1>
                        <p className="text-sm text-[var(--text-muted)] mt-1">جميع الاختبارات التي أجريتها مع Solvica</p>
                    </div>
                </div>

                {quizzes.length === 0 ? (
                    <div className="text-center py-20 space-y-4">
                        <div className="w-24 h-24 rounded-full bg-[var(--bg-surface)] border-2 border-dashed border-[var(--border-color)] flex items-center justify-center mx-auto">
                            <ClipboardList className="w-10 h-10 text-[var(--text-muted)]" />
                        </div>
                        <h2 className="text-xl font-bold text-[var(--text-muted)]">لا يوجد اختبارات محفوظة بعد</h2>
                        <p className="text-sm text-[var(--text-muted)]">اذهب إلى صفحة "اختبر نفسي" وابدأ اختباراً لتظهر هنا</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {quizzes.map(quiz => (
                            <div
                                key={quiz.id}
                                className="rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] overflow-hidden shadow-sm transition-all hover:shadow-md"
                            >
                                {/* Quiz Header */}
                                <div
                                    onClick={() => setExpanded(expanded === quiz.id ? null : quiz.id)}
                                    className="p-4 flex items-center gap-3 cursor-pointer hover:bg-[var(--hover-bg)] transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-black text-[var(--text-main)] truncate text-base">
                                            {quiz.title}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
                                                <Clock className="w-3 h-3" />
                                                {formatDate(quiz.updatedAt)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        <button
                                            onClick={(e) => handleDelete(quiz.id, e)}
                                            className="p-2 rounded-xl text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                        {expanded === quiz.id
                                            ? <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" />
                                            : <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />
                                        }
                                    </div>
                                </div>

                                {/* Quiz Content */}
                                {expanded === quiz.id && (
                                    <div className="border-t border-[var(--border-color)] p-4 bg-[var(--bg-background)]">
                                        {quiz.chatHistory && quiz.chatHistory.length > 0 ? (
                                            <div className="space-y-4">
                                                {quiz.chatHistory.map((msg, idx) => (
                                                    <div key={idx} className={`rounded-xl p-4 border ${msg.role === 'assistant' ? 'bg-[var(--bg-surface)] border-[var(--border-color)]' : 'bg-[#2ba396]/10 border-[#2ba396]/30'}`}>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            {msg.role === 'assistant'
                                                                ? <><CheckCircle className="w-4 h-4 text-[#2ba396]" /><span className="text-xs font-bold text-[#2ba396]">إجابة Solvica</span></>
                                                                : <><XCircle className="w-4 h-4 text-purple-400" /><span className="text-xs font-bold text-purple-400">سؤالك</span></>
                                                            }
                                                        </div>
                                                        <div className="html-content text-sm text-[var(--text-main)] leading-relaxed">
                                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {quiz.content ? (
                                                    <div className="html-content text-sm text-[var(--text-main)] leading-relaxed">
                                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{quiz.content}</ReactMarkdown>
                                                    </div>
                                                ) : (
                                                    <div className="text-center p-6 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl">
                                                        <p className="text-[var(--text-muted)] font-bold">محتوى الاختبار غير متوفر أو لم يتم إكماله.</p>
                                                    </div>
                                                )}
                                                <div className="flex justify-center mt-4 pt-4 border-t border-[var(--border-color)]">
                                                    <button onClick={() => window.location.href = '/course-challenge'} className="bg-[#2ba396] hover:bg-[#238b7f] text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-md flex items-center gap-2">
                                                        🔄 إعادة اختبار هذه المادة في المولد
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
