import { useState, useEffect } from 'react';
import { X, Home, BookOpen, Activity, MessageSquare, Settings, Gamepad2, BrainCircuit, CheckSquare, ClipboardList, Mail, LogIn, LogOut, User } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import SettingsModal from './SettingsModal';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [puterUser, setPuterUser] = useState<any>(null);

    useEffect(() => {
        // @ts-ignore
        if (window.puter && window.puter.auth.isSignedIn()) {
            // @ts-ignore
            window.puter.auth.getUser().then(user => setPuterUser(user));
        }
    }, []);

    const handleAuth = async () => {
        // @ts-ignore
        if (!window.puter) {
            alert("خدمة تسجيل الدخول غير متوفرة حالياً، يرجى التحقق من اتصالك بالإنترنت.");
            return;
        }
        try {
            // @ts-ignore
            if (window.puter.auth.isSignedIn()) {
                // @ts-ignore
                window.puter.auth.signOut();
                setPuterUser(null);
            } else {
                // @ts-ignore
                const user = await window.puter.auth.signIn();
                setPuterUser(user);
            }
        } catch (e) {
            console.error("Auth error:", e);
        }
    };

    const navItems = [
        { icon: <Home className="w-5 h-5" />, label: 'الرئيسية', path: '/dashboard' },
        { icon: <MessageSquare className="w-5 h-5" />, label: 'المحادثة الذكية', path: '/chat' },
        { icon: <BookOpen className="w-5 h-5" />, label: 'ملفاتي وموادي', path: '/files' },
        { icon: <CheckSquare className="w-5 h-5 text-emerald-500" />, label: 'حل الواجبات', path: '/solver' },
        { icon: <BookOpen className="w-5 h-5 text-indigo-500" />, label: 'تلخيص ذكي', path: '/generator' },
        { icon: <Activity className="w-5 h-5" />, label: 'خطتي الدراسية', path: '/planner' },
        { icon: <ClipboardList className="w-5 h-5 text-amber-500" />, label: 'سجل اختباراتي', path: '/quiz-history' },
        { icon: <Gamepad2 className="w-5 h-5 text-secondary" />, label: 'الألعاب التفاعلية', path: '/games' },
        { icon: <BrainCircuit className="w-5 h-5" />, label: 'المستشار الأكاديمي', path: '/advisor' },
        { icon: <Mail className="w-5 h-5 text-indigo-400" />, label: 'تواصل معنا', path: '/contact' },
    ];

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Sidebar Content */}
            <aside className={`fixed top-0 right-0 h-full w-72 bg-[var(--bg-surface)] backdrop-blur-2xl border-l border-[var(--border-color)] shadow-[0_0_30px_rgba(123,47,255,0.1)] z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'} flex flex-col`}>

                <div className="flex items-center justify-between p-6 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#8e2de2] to-[#f000ff] flex items-center justify-center shadow-md drop-shadow-[0_0_8px_rgba(142,45,226,0.3)]">
                            <span className="font-display font-bold text-white text-base tracking-widest">S</span>
                        </div>
                        <span className="text-xl font-display font-black tracking-widest bg-gradient-to-r from-[#00d2ff] via-[#8e2de2] to-[#f000ff] text-transparent bg-clip-text">SOLVICA</span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto">
                    {navItems.map((item, index) => (
                        <NavLink
                            key={index}
                            to={item.path}
                            onClick={() => setIsOpen(false)}
                            className={({ isActive }: { isActive: boolean }) => `flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${isActive ? 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(123,47,255,0.1)] border border-primary/20 border-r-2 border-r-primary' : 'text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-main)]'}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-4 border-t border-[var(--border-color)] space-y-2">
                    
                    {/* Puter Authentication Button */}
                    <button
                        onClick={handleAuth}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-bold transition-all duration-300 ${puterUser ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-primary/20 text-primary hover:bg-primary/30 shadow-[0_0_15px_rgba(123,47,255,0.2)]'}`}
                    >
                        <div className="flex items-center gap-3">
                            {puterUser ? <User className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                            <div className="flex flex-col items-start">
                                <span>{puterUser ? 'مسجل الدخول' : 'تسجيل الدخول'}</span>
                                <span className="text-[10px] opacity-80">{puterUser ? puterUser.username : 'لفتح حدود الاستخدام غير المحدودة'}</span>
                            </div>
                        </div>
                        {puterUser && <LogOut className="w-4 h-4 opacity-70 hover:opacity-100" />}
                    </button>

                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-full flex items-center gap-4 px-4 py-3 rounded-xl font-bold text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-main)] transition-all duration-300"
                    >
                        <Settings className="w-5 h-5" />
                        <span>الإعدادات</span>
                    </button>
                </div>
            </aside>

            <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
        </>
    );
}
