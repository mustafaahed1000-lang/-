import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, BookOpen, Video, MessageSquare, Activity, Sun, Moon, Lock, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') !== 'light';
    });

    useEffect(() => {
        document.documentElement.style.transition = 'none';
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
        document.documentElement.offsetHeight;
        requestAnimationFrame(() => { document.documentElement.style.transition = ''; });
    }, [isDarkMode]);

    return (
        <div className="min-h-screen bg-[var(--bg-background)] text-[var(--text-main)] selection:bg-secondary/30" dir="rtl">
            <MainScreen isDarkMode={isDarkMode} setIsDarkMode={setIsDarkMode} />
        </div>
    );
}

function MainScreen({ isDarkMode, setIsDarkMode }: { isDarkMode: boolean, setIsDarkMode: (val: boolean) => void }) {
    const navigate = useNavigate();
    const [user, setUser] = useState<any>(() => {
        const saved = localStorage.getItem('solvicaUser');
        return saved ? JSON.parse(saved) : null;
    });
    const [showLogin, setShowLogin] = useState(false);
    const [loginName, setLoginName] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState('');
    const [isRegister, setIsRegister] = useState(false);

    const handleLogin = () => {
        const username = loginName.trim();
        if (!username) { setLoginError('أدخل اسمك'); return; }
        if (!loginPassword.trim() || loginPassword.length < 4) { setLoginError('كلمة السر يجب أن تكون 4 أحرف على الأقل'); return; }

        const accounts = JSON.parse(localStorage.getItem('solvicaAccounts') || '{}');

        if (isRegister) {
            // Registration
            if (accounts[username]) { setLoginError('هذا الاسم مستخدم بالفعل، جرب اسم آخر'); return; }
            accounts[username] = { password: loginPassword, picture: 'https://api.dicebear.com/9.x/bottts/svg?seed=' + username };
            localStorage.setItem('solvicaAccounts', JSON.stringify(accounts));
            const newUser = { name: username, picture: accounts[username].picture };
            localStorage.setItem('solvicaUser', JSON.stringify(newUser));
            setUser(newUser);
            navigate('/dashboard');
        } else {
            // Login
            const account = accounts[username];
            if (!account) { setLoginError('الحساب غير موجود، سجل أولاً'); return; }
            if (account.password !== loginPassword) { setLoginError('كلمة السر خاطئة'); return; }
            const existingUser = { name: username, picture: account.picture };
            localStorage.setItem('solvicaUser', JSON.stringify(existingUser));
            setUser(existingUser);
            navigate('/dashboard');
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="min-h-screen flex flex-col items-center relative overflow-hidden"
        >
            {/* Ambient Background */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-[150px] pointer-events-none" />

            <div className="w-full max-w-7xl mx-auto px-6 py-8 z-10">
                <header className="flex justify-between items-center mb-16 glass-widget px-8 py-4 rounded-full">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#2ba396] flex items-center justify-center shadow-md">
                            <span className="text-white font-black text-sm tracking-widest">S</span>
                        </div>
                        <span className="text-2xl font-display font-black tracking-widest text-[var(--text-main)]">SOLVICA</span>
                    </div>
                    <nav className="hidden lg:flex items-center gap-8 text-sm font-bold text-[var(--text-muted)]">
                        <Link to="/features" className="hover:text-secondary transition-colors uppercase tracking-widest text-xs">المميزات</Link>
                        <Link to="/how-it-works" className="hover:text-primary transition-colors uppercase tracking-widest text-xs">كيف يعمل</Link>
                    </nav>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="w-10 h-10 rounded-full glass-widget flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                        >
                            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                        </button>

                        {user ? (
                            <div className="flex items-center gap-3">
                                <img src={user.picture} alt="Profile" className="w-10 h-10 rounded-full border-2 border-[#2ba396]" />
                                <Link to="/dashboard" className="btn-primary text-sm px-6 py-2.5 inline-block text-center">الرئيسية</Link>
                            </div>
                        ) : (
                            <div className="hidden sm:flex items-center gap-2">
                                <Link to="/dashboard" className="bg-[var(--bg-surface)] text-[var(--text-main)] border border-[var(--border-color)] hover:bg-[var(--hover-bg)] text-sm px-5 py-2.5 rounded-full transition-colors font-bold">
                                    دخول كزائر
                                </Link>
                                <button
                                    onClick={() => { setShowLogin(true); setIsRegister(false); }}
                                    className="btn-primary text-sm px-6 py-2.5 rounded-full shadow-lg"
                                >
                                    تسجيل الدخول 🔑
                                </button>
                            </div>
                        )}
                        {!user && <button onClick={() => { setShowLogin(true); setIsRegister(true); }} className="btn-primary text-sm px-6 py-2.5 inline-block text-center sm:hidden">حساب جديد</button>}
                    </div>
                </header>

                {/* Login/Register Modal */}
                {showLogin && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-md shadow-2xl p-8"
                        >
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#2ba396] to-[#238b7f] flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <span className="text-white font-black text-2xl">S</span>
                                </div>
                                <h2 className="text-2xl font-black text-[var(--text-main)]">{isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h2>
                                <p className="text-sm text-[var(--text-muted)] mt-2">{isRegister ? 'سجل حسابك وابدأ رحلتك الدراسية' : 'أدخل بياناتك للعودة لحسابك'}</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-muted)] mb-1">اسم الطالب</label>
                                    <div className="relative">
                                        <User className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                        <input
                                            type="text"
                                            value={loginName}
                                            onChange={e => { setLoginName(e.target.value); setLoginError(''); }}
                                            className="w-full bg-[var(--bg-dashboard)] border border-[var(--border-color)] rounded-xl pr-10 pl-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-[#2ba396]"
                                            placeholder="اسمك هنا..."
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-muted)] mb-1">كلمة السر</label>
                                    <div className="relative">
                                        <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                        <input
                                            type="password"
                                            value={loginPassword}
                                            onChange={e => { setLoginPassword(e.target.value); setLoginError(''); }}
                                            className="w-full bg-[var(--bg-dashboard)] border border-[var(--border-color)] rounded-xl pr-10 pl-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-[#2ba396]"
                                            placeholder="كلمة السر..."
                                            onKeyDown={e => e.key === 'Enter' && handleLogin()}
                                        />
                                    </div>
                                </div>

                                {loginError && (
                                    <p className="text-red-400 text-sm font-bold text-center bg-red-400/10 rounded-xl py-2">{loginError}</p>
                                )}

                                <button onClick={handleLogin} className="w-full btn-primary py-3 text-lg font-black rounded-xl shadow-lg">
                                    {isRegister ? 'إنشاء الحساب 🚀' : 'دخول 🔑'}
                                </button>

                                <div className="text-center">
                                    <button
                                        onClick={() => { setIsRegister(!isRegister); setLoginError(''); }}
                                        className="text-sm font-bold text-[#2ba396] hover:underline"
                                    >
                                        {isRegister ? 'عندك حساب؟ سجل دخول' : 'ما عندك حساب؟ سجل الآن'}
                                    </button>
                                </div>

                                <div className="border-t border-[var(--border-color)] pt-4">
                                    <button
                                        onClick={() => {
                                            const guestUser = { name: "طالب ضيف", picture: "https://api.dicebear.com/9.x/bottts/svg?seed=solvica" };
                                            setUser(guestUser);
                                            localStorage.setItem('solvicaUser', JSON.stringify(guestUser));
                                            navigate('/dashboard');
                                        }}
                                        className="w-full py-2.5 rounded-xl font-bold text-[var(--text-muted)] hover:bg-[var(--hover-bg)] border border-[var(--border-color)] transition-colors text-sm"
                                    >
                                        الدخول كزائر (بدون حفظ) 👤
                                    </button>
                                </div>
                            </div>

                            <button onClick={() => setShowLogin(false)} className="absolute top-4 left-4 text-[var(--text-muted)] hover:text-[var(--text-main)] text-xl font-bold">✕</button>
                        </motion.div>
                    </div>
                )}

                <main className="flex flex-col lg:flex-row items-center justify-between gap-6 sm:gap-16 mt-4 sm:mt-8">

                    {/* Left Hero Content */}
                    <div className="flex-1 flex flex-col items-start text-right">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-secondary/30 bg-secondary/10 text-xs font-bold text-secondary mb-8"
                        >
                            <Sparkles className="w-4 h-4" />
                            <span>المساعد الذكي الأول لطلاب جامعة القدس المفتوحة</span>
                        </motion.div>

                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-3xl sm:text-5xl md:text-7xl font-black mb-4 sm:mb-6 leading-[1.2]"
                        >
                            ارتقِ بدراستك مع <br />
                            <span className="text-gradient font-display text-4xl sm:text-6xl md:text-8xl mt-1 block tracking-widest">SOLVICA</span>
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                            className="text-sm sm:text-lg md:text-xl text-[var(--text-muted)] max-w-xl mb-6 sm:mb-10 leading-relaxed font-medium"
                        >
                            ارفع ملفاتك، ودع الذكاء الاصطناعي يحل واجباتك، يلخص كتبك، يشرحها بالفيديو، ويختبرك بها. رفيقك الدائم حتى بدون إنترنت.
                        </motion.p>

                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
                        >
                            <button onClick={() => { setShowLogin(true); setIsRegister(true); }} className="btn-primary flex items-center justify-center gap-3 text-lg px-10 py-4 w-full sm:w-auto">
                                ابدأ مجاناً <ArrowRight className="w-5 h-5 rotate-180" />
                            </button>
                            <Link to="/features" className="glass-widget flex items-center justify-center gap-3 text-lg px-10 py-4 rounded-full font-bold hover:bg-white/5 transition-colors w-full sm:w-auto border border-white/10">
                                استكشف الميزات
                            </Link>
                        </motion.div>
                    </div>

                    {/* Right Widget Grid Showcase */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5, duration: 0.8 }}
                        className="flex-1 w-full max-w-md relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 via-transparent to-secondary/20 blur-3xl rounded-full" />

                        <div className="grid grid-cols-2 gap-4 relative z-10">
                            <Link to="/solver" className="col-span-2 glass-widget bg-gradient-to-br from-[#c4f042] to-[#a3d122] text-black p-6 flex flex-col justify-between h-48 cursor-pointer hover:scale-[1.02] border-0">
                                <MessageSquare className="w-8 h-8 opacity-80" />
                                <div>
                                    <h3 className="text-2xl font-black">حل الواجبات الدراسية</h3>
                                    <p className="text-black/70 text-sm font-bold mt-1">ذكاء دقيق، مع إرفاق الإجابات كملف PDF</p>
                                </div>
                            </Link>

                            <Link to="/files" className="glass-widget bg-gradient-to-br from-[#c084fc] to-[#9333ea] p-6 flex flex-col justify-between h-40 cursor-pointer hover:scale-[1.02] border-0 shadow-[0_0_20px_rgba(192,132,252,0.3)]">
                                <BookOpen className="w-8 h-8 text-white opacity-90" />
                                <h3 className="text-lg font-bold text-white leading-tight">شرح الملفات<br />والملازم</h3>
                            </Link>

                            <Link to="/generator" className="glass-widget bg-gradient-to-br from-[#fb7185] to-[#e11d48] p-6 flex flex-col justify-between h-40 cursor-pointer hover:scale-[1.02] border-0 shadow-[0_0_20px_rgba(251,113,133,0.3)]">
                                <Video className="w-8 h-8 text-white opacity-90" />
                                <h3 className="text-lg font-bold text-white leading-tight">مصنع المحتوى<br />الذكي</h3>
                            </Link>
                        </div>

                        <Link to="/planner" className="glass-widget mt-4 p-5 flex items-center gap-4 bg-[var(--bg-surface)] backdrop-blur-2xl hover:bg-white/5 transition-colors cursor-pointer border-0">
                            <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                                <Activity className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h4 className="font-bold text-sm text-[var(--text-main)]">خطة دراسية ذكية</h4>
                                <div className="w-full bg-[var(--text-muted)]/20 h-2 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-gradient-to-r from-secondary to-primary w-[0%] h-full rounded-full" />
                                </div>
                            </div>
                            <span className="text-xs font-bold text-secondary">0%</span>
                        </Link>
                    </motion.div>

                </main>
            </div>
        </motion.div>
    );
}
