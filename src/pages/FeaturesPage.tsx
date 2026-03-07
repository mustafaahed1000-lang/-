import { motion } from 'framer-motion';
import { Brain, FileText, Video, Network, Zap, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function FeaturesPage() {
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

            <div className="max-w-6xl mx-auto py-4 px-6 relative">
                <div className="absolute top-1/2 left-1/4 w-[500px] h-[500px] bg-secondary/10 blur-[150px] rounded-full pointer-events-none" />

                <div className="text-center mb-16 relative z-10">
                    <h1 className="text-4xl md:text-5xl font-display font-black mb-4 text-[var(--text-main)]">مميزات منصة <span className="text-gradient">Solvica</span> ✨</h1>
                    <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">صُممت خصيصاً لتلبي احتياجات طلاب جامعة القدس المفتوحة بتقنيات الذكاء الاصطناعي الأحدث عالمياً.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">

                    <FeatureCard
                        icon={<Brain className="w-8 h-8 text-[#c4f042]" />}
                        title="حل الواجبات الدراسية (Assignments)"
                        description="قم برفع ملف الواجب وسيقوم الذكاء الاصطناعي بتحليله، حله بخطوات علمية دقيقة، وتجهيزه للتحميل كملف PDF رسمي جاهز للتسليم."
                        color="from-[#c4f042] to-emerald-500"
                    />

                    <FeatureCard
                        icon={<Video className="w-8 h-8 text-primary" />}
                        title="الشرح المرئي والصوتي (Explainer Mode)"
                        description="هل تواجه صعوبة في فهم نص معقد؟ حوّل أي فقرة إلى شرح فيديو تفاعلي، حيث يقرأ لك الذكاء الاصطناعي النص ويوضحه لك بصوت عربي واضح."
                        color="from-primary to-accent"
                    />

                    <FeatureCard
                        icon={<FileText className="w-8 h-8 text-secondary" />}
                        title="مولد الامتحانات الذكي (AI Exams)"
                        description="اختبر جاهزيتك للامتحانات النصفية والنهائية! يقوم النظام بقراءة مقرراتك وتوليد أسئلة اختيار من متعدد وأسئلة مقالية مطابقة لنمط الجامعة."
                        color="from-secondary to-primary"
                    />

                    <FeatureCard
                        icon={<Network className="w-8 h-8 text-blue-400" />}
                        title="الربط المباشر مع البوابة الأكاديمية (زميل)"
                        description="لا داعي لتحميل الملفات يدوياً. قم بالبحث عن اسم المادة وسيقوم نظامنا بسحب جميع الملفات، الملخصات، والامتحانات السابقة من موقع (زميل) مباشرة إلى محادثتك."
                        color="from-blue-400 to-indigo-500"
                    />

                    <FeatureCard
                        icon={<Zap className="w-8 h-8 text-yellow-400" />}
                        title="ذاكرة حوارية دائمة"
                        description="الذكاء الاصطناعي في Solvica يتذكرك. لا حاجة لإعادة رفع نفس الملفات أو شرح السياق في كل مرة. كل محادثاتك وملفاتك محفوظة محلياً في متصفحك بشكل آمن."
                        color="from-yellow-400 to-orange-500"
                    />

                </div>
            </div>
        </div>
    );
}

function FeatureCard({ title, description, icon, color }: { title: string, description: string, icon: React.ReactNode, color: string }) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            className="glass-widget p-8 rounded-3xl border border-[var(--border-color)] relative overflow-hidden group"
        >
            <div className={`absolute top-0 left-0 w-32 h-32 bg-gradient-to-br ${color} opacity-10 blur-3xl rounded-full group-hover:opacity-30 transition-opacity`} />
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${color} bg-opacity-10 border border-[var(--border-color)] flex items-center justify-center mb-6 relative z-10`}>
                {icon}
            </div>
            <h3 className="text-2xl font-bold text-[var(--text-main)] mb-3 relative z-10">{title}</h3>
            <p className="text-[var(--text-muted)] leading-relaxed relative z-10">{description}</p>
        </motion.div>
    );
}
