import React, { useState, useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import SettingsModal from '../components/SettingsModal';
import { Menu, Bell, Moon, Sun, Settings } from 'lucide-react';

interface AppLayoutProps {
    children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [user, setUser] = useState<any>(() => {
        const saved = localStorage.getItem('solvicaUser');
        return saved ? JSON.parse(saved) : null;
    });
    const [isDarkMode, setIsDarkMode] = useState(() => {
        return localStorage.getItem('theme') !== 'light';
    });

    // Listen for storage changes (when settings are saved)
    useEffect(() => {
        const handleStorage = () => {
            const saved = localStorage.getItem('solvicaUser');
            setUser(saved ? JSON.parse(saved) : null);
        };
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    useEffect(() => {
        // Instant transition: temporarily disable transitions, apply theme, re-enable
        document.documentElement.style.transition = 'none';
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
        } else {
            document.documentElement.classList.remove('dark');
            localStorage.setItem('theme', 'light');
        }
        // Force reflow then re-enable transitions
        document.documentElement.offsetHeight;
        requestAnimationFrame(() => {
            document.documentElement.style.transition = '';
        });
    }, [isDarkMode]);

    const displayName = user?.name || user?.given_name || '';

    return (
        <div className="min-h-screen bg-[var(--bg-background)] text-[var(--text-main)] selection:bg-secondary/30 flex dir-rtl" dir="rtl">

            <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
            <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

            <main className="flex-1 flex flex-col min-w-0 lg:pr-72 relative">

                <header className="sticky top-0 z-30 flex items-center justify-between px-3 py-3 lg:px-6 lg:py-4 bg-[var(--bg-background)] backdrop-blur-xl border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-2 min-w-0">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 flex-shrink-0 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                        >
                            <Menu className="w-5 h-5" />
                        </button>
                        <h2 className="text-sm sm:text-lg font-bold hidden sm:block text-[var(--text-main)] truncate">
                            {displayName ? `مرحباً ${displayName} 👋` : 'مرحباً بك 👋'}
                        </h2>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            className="w-9 h-9 rounded-full glass-widget flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"
                        >
                            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                        </button>
                        <button className="w-9 h-9 rounded-full glass-widget flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] relative">
                            <Bell className="w-4 h-4" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse shadow-[0_0_10px_rgba(255,60,172,0.8)]" />
                        </button>
                        <button
                            onClick={() => setSettingsOpen(true)}
                            className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2ba396] to-[#238b7f] border border-[#2ba396]/30 flex items-center justify-center overflow-hidden shadow-md hover:scale-105 transition-transform flex-shrink-0"
                            title="إعدادات الحساب"
                        >
                            {user?.picture && !user.picture.startsWith('http') && !user.picture.startsWith('data:') ? (
                                <span className="text-lg">{user.picture}</span>
                            ) : user?.picture ? (
                                <img src={user.picture} alt="Profile" className="w-full h-full rounded-full object-cover" />
                            ) : (
                                <Settings className="w-4 h-4 text-white" />
                            )}
                        </button>
                    </div>
                </header>

                <div className="p-4 lg:p-6 space-y-6 flex-1 overflow-x-hidden relative z-10 w-full max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
