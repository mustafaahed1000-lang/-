import { useState } from 'react';
import { X, Home, BookOpen, Activity, MessageSquare, Settings, Gamepad2, BrainCircuit, CheckSquare } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import SettingsModal from './SettingsModal';

interface SidebarProps {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    const navItems = [
        { icon: <Home className="w-5 h-5" />, label: 'الرئيسية', path: '/dashboard' },
        { icon: <MessageSquare className="w-5 h-5" />, label: 'المحادثة الذكية', path: '/chat' },
        { icon: <BookOpen className="w-5 h-5" />, label: 'ملفاتي وموادي', path: '/files' },
        { icon: <CheckSquare className="w-5 h-5 text-emerald-500" />, label: 'حل الواجبات', path: '/solver' },
        { icon: <BookOpen className="w-5 h-5 text-indigo-500" />, label: 'تلخيص ذكي', path: '/generator' },
        { icon: <Activity className="w-5 h-5" />, label: 'خطتي الدراسية', path: '/planner' },
        { icon: <Gamepad2 className="w-5 h-5 text-secondary" />, label: 'الألعاب التفاعلية', path: '/games' },
        { icon: <BrainCircuit className="w-5 h-5" />, label: 'المستشار الأكاديمي', path: '/advisor' },
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
                        <div className="w-9 h-9 rounded-xl bg-[#2ba396] flex items-center justify-center shadow-md">
                            <span className="font-display font-bold text-white text-sm tracking-widest">S</span>
                        </div>
                        <span className="text-xl font-display font-black tracking-widest text-[var(--text-main)]">SOLVICA</span>
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
                            className={({ isActive }) => `flex items-center gap-4 px-4 py-3 rounded-xl font-bold transition-all duration-300 ${isActive ? 'bg-primary/10 text-primary shadow-[0_0_20px_rgba(123,47,255,0.1)] border border-primary/20 border-r-2 border-r-primary' : 'text-[var(--text-muted)] hover:bg-[var(--hover-bg)] hover:text-[var(--text-main)]'}`}
                        >
                            {item.icon}
                            <span>{item.label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="p-6 border-t border-[var(--border-color)]">
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
