import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import { motion } from 'framer-motion';
import { BookOpen, Activity, Brain, Plus } from 'lucide-react';
import { db } from '../lib/db/database';

export default function Dashboard() {
    const navigate = useNavigate();
    const [recentFiles, setRecentFiles] = useState<any[]>([]);

    useEffect(() => {
        const fetchFiles = async () => {
            const files = await db.getAllDocuments();
            // Since we don't store timestamp currently, we just reverse so newest is first
            setRecentFiles(files.reverse().slice(0, 4));
        };
        fetchFiles();
    }, []);
    return (
        <AppLayout>
            <div className="flex flex-col gap-8 mt-4 lg:mt-6">

                {/* Welcome Banner */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-5 sm:p-10 rounded-3xl relative overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-xl shadow-primary/5 transition-colors duration-300"
                >
                    {/* Ambient Glows for the Banner */}
                    <div className="absolute -top-32 -right-32 w-80 h-80 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />
                    <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-secondary/10 blur-[100px] rounded-full pointer-events-none" />

                    <div className="relative z-10">
                        <h1 className="text-xl sm:text-3xl font-display font-bold mb-2 text-[var(--text-main)]">كيف يمكنني مساعدتك اليوم? ✨</h1>
                        <p className="text-[var(--text-muted)] font-bold text-sm sm:text-lg mb-5">ارفع موادك، ابدأ محادثة جديدة، أو راجع خطتك الدراسية.</p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button onClick={() => navigate('/chat')} className="btn-primary flex items-center justify-center gap-2 px-6 py-3 text-white shadow-xl shadow-primary/20 cursor-pointer">
                                <Plus className="w-5 h-5" />
                                محادثة جديدة
                            </button>
                            <button onClick={() => navigate('/files')} className="glass-widget flex items-center justify-center gap-2 px-6 py-3 font-bold hover:bg-[var(--hover-bg)] border border-[var(--border-color)] text-[var(--text-main)] bg-[var(--widget-bg)] shadow-md cursor-pointer">
                                <BookOpen className="w-5 h-5 text-secondary" />
                                إضافة مادة (PDF/Word)
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Quick Actions Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
                    <ActionCard
                        icon={<Brain className="w-6 h-6 text-[#c4f042]" />}
                        title="حل الواجبات (نظري/عملي)"
                        desc="أرفق ملف الواجب وسيقوم الذكاء بحله بشكل احترافي ودقيق وتجهيزه للرفع"
                        color="from-[#c4f042] to-emerald-500"
                        onClick={() => navigate('/solver')}
                    />
                    <ActionCard
                        icon={<Brain className="w-6 h-6 text-primary" />}
                        title="مراجعة الذكاء الاصطناعي"
                        desc="اختبر معلوماتك في مادة مستهدفة"
                        color="from-primary to-accent"
                        onClick={() => navigate('/chat?mode=exam')}
                    />
                    <ActionCard
                        title="تلخيص ذكي"
                        desc="شاهد شرحاً مبسطاً لآخر ملزمة رفعتها"
                        icon={<BookOpen className="w-6 h-6" />}
                        color="text-indigo-500"
                        onClick={() => navigate('/generator')}
                    />
                    <ActionCard
                        icon={<Activity className="w-6 h-6 text-emerald-400" />}
                        title="المواد المحفوظة"
                        desc="تصفح ملفاتك وارفع المزيد"
                        color="from-emerald-400 to-teal-500"
                        onClick={() => navigate('/files')}
                    />
                </div>

                {/* Recent Files Section */}
                <div>
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--text-main)]">
                        <BookOpen className="w-5 h-5 text-[var(--text-muted)]" />
                        المواد الأخيرة
                    </h3>
                    <div className="glass-widget p-1 rounded-2xl border border-[var(--border-color)]">
                        {recentFiles.length > 0 ? (
                            recentFiles.map(doc => (
                                <FileRow
                                    key={doc.id}
                                    name={doc.filename.replace('_solvica_folder_', '')}
                                    date="تم الرفع حديثاً"
                                    size={`${doc.chunks?.length || 0} قسم`}
                                    onClick={() => navigate(`/chat?file=${encodeURIComponent(doc.filename)}`)}
                                />
                            ))
                        ) : (
                            <div className="p-8 text-center text-[var(--text-muted)]">
                                <p>لم تقم برفع أي ملفات حتى الآن.</p>
                                <button onClick={() => navigate('/files')} className="mt-4 text-primary hover:underline font-bold">
                                    ارفع ملفك الأول
                                </button>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </AppLayout>
    );
}

function ActionCard({ title, desc, icon, color, onClick }: { title: string, desc: string, icon: React.ReactNode, color: string, onClick?: () => void }) {
    return (
        <motion.button
            onClick={onClick}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="glass-widget p-4 sm:p-6 text-right flex flex-col items-start gap-3 border-0 shadow-lg relative overflow-hidden group cursor-pointer w-full"
        >
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${color} opacity-20 blur-2xl rounded-full group-hover:opacity-40 transition-opacity`} />
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-[var(--widget-bg)] border border-[var(--border-color)] flex items-center justify-center relative z-10 group-hover:border-primary/50 transition-colors">
                {icon}
            </div>
            <div className="relative z-10">
                <h4 className="font-bold text-sm sm:text-base mb-0.5 text-[var(--text-main)] leading-tight">{title}</h4>
                <p className="text-xs text-[var(--text-muted)] hidden sm:block">{desc}</p>
            </div>
        </motion.button>
    );
}

function FileRow({ name, date, size, onClick }: { name: string, date: string, size: string, onClick?: () => void }) {
    return (
        <div className="flex items-center justify-between p-4 hover:bg-[var(--hover-bg)] rounded-xl cursor-pointer transition-colors border-b border-[var(--border-color)] last:border-0 group">
            <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center">
                    <BookOpen className="w-5 h-5" />
                </div>
                <div>
                    <h5 className="font-bold text-sm text-[var(--text-main)] transition-colors">{name}</h5>
                    <span className="text-xs text-[var(--text-muted)]">{date} • {size}</span>
                </div>
            </div>
            <button
                onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                className="text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity px-4 py-1.5 rounded-full bg-primary/10 hover:bg-primary/20"
            >
                شرح الملف
            </button>
        </div>
    )
}
