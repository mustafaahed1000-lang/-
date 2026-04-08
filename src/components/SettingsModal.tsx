import { useState, useEffect, useRef } from 'react';
import { X, Save, User, LogOut, Upload } from 'lucide-react';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AVATAR_PRESETS = [
    'https://api.dicebear.com/9.x/bottts/svg?seed=solvica1&backgroundColor=2ba396',
    'https://api.dicebear.com/9.x/bottts/svg?seed=solvica2&backgroundColor=4a85df',
    'https://api.dicebear.com/9.x/bottts/svg?seed=student3&backgroundColor=e74c3c',
    'https://api.dicebear.com/9.x/bottts/svg?seed=student4&backgroundColor=f39c12',
    'https://api.dicebear.com/9.x/bottts/svg?seed=solvica9&backgroundColor=ef4444',
    'https://api.dicebear.com/9.x/bottts/svg?seed=solvica10&backgroundColor=8b5cf6',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=solvica5&backgroundColor=9b59b6',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=solvica6&backgroundColor=1abc9c',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=solvica12&backgroundColor=14b8a6',
    'https://api.dicebear.com/9.x/adventurer/svg?seed=solvica13&backgroundColor=06b6d4',
    'https://api.dicebear.com/9.x/fun-emoji/svg?seed=student7&backgroundColor=3498db',
    'https://api.dicebear.com/9.x/fun-emoji/svg?seed=student8&backgroundColor=e67e22',
    'https://api.dicebear.com/9.x/fun-emoji/svg?seed=solvica15&backgroundColor=d946ef',
    'https://api.dicebear.com/9.x/fun-emoji/svg?seed=solvica16&backgroundColor=10b981',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=solvica17&backgroundColor=f43f5e',
    'https://api.dicebear.com/9.x/avataaars/svg?seed=solvica18&backgroundColor=6366f1'
];

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const [name, setName] = useState('');
    const [avatar, setAvatar] = useState('');
    const [pollinationsKey, setPollinationsKey] = useState('');
    const [chatanywhereKey, setChatanywhereKey] = useState('');
    const [cohereKey, setCohereKey] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const userStr = localStorage.getItem('solvicaUser');
            if (userStr) {
                try {
                    const u = JSON.parse(userStr);
                    setName(u.name || '');
                    setAvatar(u.picture || '');
                } catch { }
            }
            const pk = localStorage.getItem('solvica_pollinations_key');
            if (pk) setPollinationsKey(pk);
            
            const ck = localStorage.getItem('solvica_chatanywhere_key');
            if (ck) setChatanywhereKey(ck);

            const cohK = localStorage.getItem('solvica_cohere_key');
            if (cohK) setCohereKey(cohK);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const result = ev.target?.result as string;
                if (result) setAvatar(result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = () => {
        const userStr = localStorage.getItem('solvicaUser');
        let u: any = {};
        if (userStr) {
            try { u = JSON.parse(userStr); } catch { }
        }
        u.name = name || 'طالب ضيف';
        u.picture = avatar || AVATAR_PRESETS[0];
        localStorage.setItem('solvicaUser', JSON.stringify(u));
        if (pollinationsKey) {
            localStorage.setItem('solvica_pollinations_key', pollinationsKey.trim());
        } else {
            localStorage.removeItem('solvica_pollinations_key');
        }
        if (chatanywhereKey) {
            localStorage.setItem('solvica_chatanywhere_key', chatanywhereKey.trim());
        } else {
            localStorage.removeItem('solvica_chatanywhere_key');
        }
        if (cohereKey) {
            localStorage.setItem('solvica_cohere_key', cohereKey.trim());
        } else {
            localStorage.removeItem('solvica_cohere_key');
        }
        window.location.reload();
    };

    const handleSignOut = () => {
        localStorage.removeItem('solvicaUser');
        window.location.href = '/';
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-lg max-h-[90vh] shadow-2xl overflow-hidden flex flex-col">
                <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--widget-bg)]">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-[var(--text-main)]">
                        <User className="w-5 h-5 text-[#2ba396]" />
                        إعدادات الطالب
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-[var(--text-muted)]">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                        <label className="block text-sm font-bold text-[var(--text-muted)]">اسم الطالب</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-[var(--bg-dashboard)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-main)] focus:outline-none focus:border-[#2ba396] transition-colors"
                            placeholder="اسمك هنا..."
                        />
                    </div>

                    {/* Custom API Keys Section */}
                    <div className="bg-[#2ba396]/5 border border-[#2ba396]/20 p-4 rounded-2xl space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="textlg">🚀</span>
                            <h3 className="font-bold text-[#2ba396]">استهلاك مفتوح (مفاتيح الذكاء الاصطناعي)</h3>
                        </div>
                        <p className="text-xs text-[var(--text-muted)] opacity-80 mb-3">
                            أضف مفاتيحك الخاصة لتجاوز حدود الاستهلاك في الموقع والحصول على ذكاء غير محدود. يمكنك استخراجها مجاناً من الروابط أدناه.
                        </p>
                        
                        {/* Pollinations Key */}
                        <div className="space-y-2">
                            <label className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] mt-2">
                                <span>مفتاح (Pollinations AI) - GPT-4o</span>
                                <a href="https://pollinations.ai/" target="_blank" rel="noopener noreferrer" className="text-[#2ba396] hover:underline flex items-center gap-1">استخراج المفتاح <Upload className="w-3 h-3"/></a>
                            </label>
                            <input
                                type="password"
                                value={pollinationsKey}
                                onChange={e => setPollinationsKey(e.target.value)}
                                className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[#2ba396] transition-colors"
                                placeholder="انسخ المفتاح هنا..."
                            />
                        </div>

                        {/* ChatAnywhere Key */}
                        <div className="space-y-2">
                            <label className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)] mt-2">
                                <span>مفتاح (ChatAnywhere) - GPT-4o Mini</span>
                                <a href="https://api.chatanywhere.org/v1/oauth/free/github/render" target="_blank" rel="noopener noreferrer" className="text-[#2ba396] hover:underline flex items-center gap-1">استخراج المفتاح <Upload className="w-3 h-3"/></a>
                            </label>
                            <input
                                type="password"
                                value={chatanywhereKey}
                                onChange={e => setChatanywhereKey(e.target.value)}
                                className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[#2ba396] transition-colors"
                                placeholder="انسخ المفتاح هنا (sk-...)"
                            />
                        </div>

                        {/* Cohere Key */}
                        <div className="space-y-2 border-t border-[#2ba396]/20 pt-4 mt-4">
                            <label className="flex items-center justify-between text-xs font-bold text-[var(--text-muted)]">
                                <span>مفتاح (Cohere) - Command R+ (أسطورة الجامعة)</span>
                                <a href="https://dashboard.cohere.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-[#2ba396] hover:underline flex items-center gap-1">استخراج المفتاح <Upload className="w-3 h-3"/></a>
                            </label>
                            <p className="text-[10px] text-[var(--text-muted)] opacity-70 mb-1">
                                هذا النموذج يعطيك 1000 سؤال مجاني شهرياً، وهو مصمم خصيصاً لتحليل ملايين الكلمات بدقة نوت بوك 100%. أثبت جدارته في الميزان الصرفي والرياضيات.
                            </p>
                            <input
                                type="password"
                                value={cohereKey}
                                onChange={e => setCohereKey(e.target.value)}
                                className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[#2ba396] transition-colors"
                                placeholder="انسخ مفتاح Cohere هنا..."
                            />
                        </div>
                    </div>

                    {/* Profile Picture Upload */}
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-[var(--text-muted)]">صورة الملف الشخصي</label>

                        {/* Current Avatar Preview */}
                        <div className="flex items-center gap-4">
                            <div className="w-20 h-20 rounded-full border-2 border-[#2ba396] overflow-hidden bg-[var(--bg-dashboard)] flex items-center justify-center">
                                {avatar && !avatar.startsWith('http') && !avatar.startsWith('data:') ? (
                                    <span className="text-4xl">{avatar}</span>
                                ) : avatar ? (
                                    <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-10 h-10 text-[var(--text-muted)]" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#2ba396] hover:bg-[#238b7f] text-white rounded-xl text-sm font-bold transition-colors"
                                >
                                    <Upload className="w-4 h-4" />
                                    رفع صورة
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                />
                                <span className="text-xs text-[var(--text-muted)]">أو اختر شخصية 👇</span>
                            </div>
                        </div>

                        {/* Avatar Presets */}
                        <div className="grid grid-cols-4 gap-3 mt-3">
                            {AVATAR_PRESETS.map((preset, i) => (
                                <button
                                    key={i}
                                    onClick={() => setAvatar(preset)}
                                    className={`w-14 h-14 rounded-full overflow-hidden border-2 flex items-center justify-center transition-all hover:scale-110 ${avatar === preset ? 'border-[#2ba396] shadow-lg shadow-[#2ba396]/30 bg-[#2ba396]/20 scale-110' : 'border-[var(--border-color)] bg-[var(--bg-dashboard)]'}`}
                                >
                                    <img src={preset} alt={`Avatar ${i + 1}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="p-5 border-t border-[var(--border-color)] bg-[var(--widget-bg)] flex justify-between items-center gap-4">
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-400/10 rounded-xl transition-colors font-bold text-sm"
                    >
                        <LogOut className="w-4 h-4" />
                        تسجيل الخروج
                    </button>

                    <div className="flex gap-3">
                        <button onClick={onClose} className="px-5 py-2.5 rounded-full font-bold text-[var(--text-main)] hover:bg-white/5 transition-colors text-sm">
                            إلغاء
                        </button>
                        <button onClick={handleSave} className="btn-primary flex items-center gap-2 px-6 py-2.5 shadow-lg text-sm">
                            <Save className="w-4 h-4" />
                            حفظ
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
