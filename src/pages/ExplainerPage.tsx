import { useState, useEffect } from 'react';
import AppLayout from '../layouts/AppLayout';
import { ExplainerBoard } from '../components/ExplainerMode/ExplainerBoard';
import { PenTool, Sparkles } from 'lucide-react';
import { aiClient } from '../lib/ai/aiClient';
import { globalVectorStore } from '../lib/rag/vectorStore';
import { db } from '../lib/db/database';

export default function ExplainerPage() {
    const [topic, setTopic] = useState<string>('');
    const [script, setScript] = useState<string>('');
    const [isExplaining, setIsExplaining] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const AI_PERSONAS = [
        { id: 'robot_blue', name: 'روبو الأزرق', role: 'شرح منهجي منظم', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=solvica1&backgroundColor=2ba396', bgColor: '#2ba396', borderColor: '#1e293b', prompt: 'أنت روبوت دقيق ومنظم، اشرح بشكل خطوات 1,2,3 واضحة ومباشرة.' },
        { id: 'robot_blue2', name: 'روبو المحلل', role: 'تحليل المنطق', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=solvica2&backgroundColor=4a85df', bgColor: '#4a85df', borderColor: '#1e293b', prompt: 'أنت روبوت بأسلوب التحري بطرح المعضلة ثم يحللها بدقة.' },
        { id: 'robot_red', name: 'روبو الناري', role: 'خطاب ملحمي', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=student3&backgroundColor=e74c3c', bgColor: '#e74c3c', borderColor: '#1e293b', prompt: 'أنت بطل خارق استخدم لغة ملحمية وقوية جداً.' },
        { id: 'robot_yellow', name: 'روبو الأصفر', role: 'فكرة لامعة', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=student4&backgroundColor=f39c12', bgColor: '#f39c12', borderColor: '#1e293b', prompt: 'أنت الفكرة المضيئة. ركز على الجوانب المبتكرة للإلهام.' },
        { id: 'robot_red2', name: 'روبو المنطلق', role: 'انطلاقة سريعة', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=solvica9&backgroundColor=ef4444', bgColor: '#ef4444', borderColor: '#1e293b', prompt: 'أنت صاروخ منطلق سريع تلخيصك يصيب الهدف.' },
        { id: 'robot_purple', name: 'عقل الروبوت', role: 'عقل مدبر', icon: 'https://api.dicebear.com/9.x/bottts/svg?seed=solvica10&backgroundColor=8b5cf6', bgColor: '#8b5cf6', borderColor: '#1e293b', prompt: 'أنت العقل المدبر. فكك المعلومة بدقة لا مثيل لها.' },
        { id: 'adv_purple', name: 'الساحر الحكيم', role: 'شرح مبهر', icon: 'https://api.dicebear.com/9.x/adventurer/svg?seed=solvica5&backgroundColor=9b59b6', bgColor: '#9b59b6', borderColor: '#1e293b', prompt: 'أنت ساحر حكيم استخدم أسلوباً مشوقاً وأمثلة سحرية.' },
        { id: 'adv_cyan', name: 'بطل المعرفة', role: 'شاب محفز', icon: 'https://api.dicebear.com/9.x/adventurer/svg?seed=solvica6&backgroundColor=1abc9c', bgColor: '#1abc9c', borderColor: '#1e293b', prompt: 'أنت شاب مليء بالحماس تشجع الطالب بقوة وحيوية.' },
        { id: 'adv_teal', name: 'ظل النينجا', role: 'خلاصة مباشرة', icon: 'https://api.dicebear.com/9.x/adventurer/svg?seed=solvica12&backgroundColor=14b8a6', bgColor: '#14b8a6', borderColor: '#1e293b', prompt: 'أنت نينجا سريع أعطِ الجواب النهائي والمهم.' },
        { id: 'adv_blue', name: 'صديق الأزرق', role: 'صديق متعاطف', icon: 'https://api.dicebear.com/9.x/adventurer/svg?seed=solvica13&backgroundColor=06b6d4', bgColor: '#06b6d4', borderColor: '#1e293b', prompt: 'أنت صديق متعاطف وصبور اشرح بهدوء كأنك تتكلم مع طفل.' },
        { id: 'smile_blue', name: 'مبتسم الأزرق', role: 'محفز مستمر', icon: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=student7&backgroundColor=3498db', bgColor: '#3498db', borderColor: '#1e293b', prompt: 'أنت مبتسم دائما اشرح بتفاؤل وطاقة إيجابية.' },
        { id: 'smile_orange', name: 'غمزة البرتقالي', role: 'شرح مرح', icon: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=student8&backgroundColor=e67e22', bgColor: '#e67e22', borderColor: '#1e293b', prompt: 'أنت شخصية مرحة استخدم النكت الخفيفة والأمثلة.' },
        { id: 'smile_pink', name: 'الرؤية العميقة', role: 'بصيرة فلسفية', icon: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=solvica15&backgroundColor=d946ef', bgColor: '#d946ef', borderColor: '#1e293b', prompt: 'أنت بوم ليلية حكيمة تشرح من منظور عميق جدا.' },
        { id: 'smile_green', name: 'ميكرو الأخضر', role: 'شرح غريب', icon: 'https://api.dicebear.com/9.x/fun-emoji/svg?seed=solvica16&backgroundColor=10b981', bgColor: '#10b981', borderColor: '#1e293b', prompt: 'أنت كائن تشرح المفاهيم بطريقة غريبة ومثيرة.' },
        { id: 'girl_pink', name: 'المعلمة الحنونة', role: 'شرح رقيق وهادئ', icon: 'https://api.dicebear.com/9.x/avataaars/svg?seed=solvica17&backgroundColor=f43f5e', bgColor: '#f43f5e', borderColor: '#1e293b', prompt: 'أنت معلمة حنونة جدا طمئني الطالب بأسلوب عطوف.' },
        { id: 'girl_purple', name: 'المفكرة الإبداعية', role: 'شرح بصري', icon: 'https://api.dicebear.com/9.x/avataaars/svg?seed=solvica18&backgroundColor=6366f1', bgColor: '#6366f1', borderColor: '#1e293b', prompt: 'أنت فتاة مبدعة ركزي على الألوان والتشبيهات البصرية.' }
    ];

    const [selectedPersona, setSelectedPersona] = useState(AI_PERSONAS[0]);

    // Voice Selection State
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
    const [allDocs, setAllDocs] = useState<any[]>([]); // New state for all documents

    // File State
    const [activeFileBlob, setActiveFileBlob] = useState<Blob | null>(null);
    const [activeFileName, setActiveFileName] = useState<string | null>(null);
    const [docxHtml, setDocxHtml] = useState<string>('');

    useEffect(() => {
        const loadVoices = () => {
            const availableVoices = window.speechSynthesis.getVoices().filter(v => v.lang.startsWith('ar') || v.lang.startsWith('en'));
            if (availableVoices.length > 0) {
                setVoices(availableVoices);
                setSelectedVoiceURI(availableVoices[0].voiceURI);
            }
        };
        loadVoices();
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }, []);

    useEffect(() => {
        const loadDoc = async () => {
            const savedDocs = await db.getAllDocuments();
            setAllDocs(savedDocs); // Store all docs for the picker

            const params = new URLSearchParams(window.location.search);
            const autoFile = params.get('file');
            if (autoFile) {
                const doc = savedDocs.find(d => d.filename === autoFile);
                if (doc && doc.fileData) {
                    setActiveFileBlob(doc.fileData);
                    setActiveFileName(doc.filename);
                    if (doc.filename.endsWith('.docx')) {
                        const m = await import('mammoth');
                        doc.fileData.arrayBuffer().then((ab: ArrayBuffer) => m.default.convertToHtml({ arrayBuffer: ab }).then((res: any) => setDocxHtml(res.value)));
                    }
                    if (!topic) {
                        setTopic(`قم بشرح مبسط جداً لأبرز المواضيع والمحتويات الموجودة في ملف "${doc.filename}" ليكون كمقدمة وتلخيص سريع للطالب.`);
                    }
                }
            }
        };
        loadDoc();
    }, []);

    const handleSelectDocument = async (filename: string) => {
        const doc = allDocs.find(d => d.filename === filename);
        if (doc && doc.fileData) {
            setActiveFileBlob(doc.fileData);
            setActiveFileName(doc.filename);
            if (doc.filename.endsWith('.docx')) {
                const m = await import('mammoth');
                doc.fileData.arrayBuffer().then((ab: ArrayBuffer) => m.default.convertToHtml({ arrayBuffer: ab }).then((res: any) => setDocxHtml(res.value)));
            } else {
                setDocxHtml('');
            }
            setTopic(`قم بشرح مبسط جداً لأبرز المواضيع والمحتويات الموجودة في ملف "${doc.filename}" ليكون كمقدمة وتلخيص سريع للطالب.`);
        }
    };

    const handleStartExplain = async () => {
        if (!topic.trim()) return;

        setIsGenerating(true);
        try {
            // Find context from user's files if relevant
            const relevantChunks = await globalVectorStore.similaritySearch(topic, 3);
            const contextText = relevantChunks.map(c => c.text).join('\n---\n');

            const systemPrompt = `أنت معلم افتراضي في منصة Solvica.
الشخصية التي تتقمصها الآن: ${selectedPersona.name} (${selectedPersona.role}).
تعليمات شخصيتك حصراً: ${selectedPersona.prompt}

المهمة: قم بشرح الموضوع أو النص التالي للطالب.
${contextText ? `استند في شرحك إلى هذه المعلومات من كتب الطالب:\n${contextText}\n\n` : ''}
الموضوع/النص المطلوب شرحه: ${topic}

شروط الشرح:
1. يمنع استخدام أي علامات تنسيق ماركداون (مثل النجوم أو الشرطات).
2. اجعل الشرح مقسماً إلى فقرات قصيرة وواضحة جداً ليسهل على محرك تحويل النص إلى كلام قراءتها.
3. ابدأ بترحيب يناسب شخصيتك تماماً.`;

            const generatedScript = await aiClient.chat([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'اشرح لي هذا الموضوع بأسلوب الفيديو التعليمي.' }
            ]);

            setScript(generatedScript);
            setIsExplaining(true);
        } catch (error: any) {
            alert('حدث خطأ أثناء توليد الشرح: ' + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <AppLayout>
            <div className={`flex flex-col md:flex-row gap-6 h-[85vh] max-w-[95rem] mx-auto`}>

                {/* Document Viewer Pane (Only visible if activeFileBlob exists) */}
                {activeFileBlob && (
                    <div className="hidden lg:flex flex-col w-[40%] xl:w-[45%] glass-widget border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl relative">
                        <div className="p-4 border-b border-[var(--border-color)] bg-black/10 backdrop-blur-md flex justify-between items-center" dir="rtl">
                            <h3 className="font-bold text-[var(--text-main)] truncate text-lg">📑 {activeFileName}</h3>
                            <button onClick={() => setActiveFileBlob(null)} className="text-[var(--text-muted)] hover:text-red-500 transition-colors" title="إغلاق العارض">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <div className="flex-1 bg-white overflow-hidden relative">
                            {activeFileName?.endsWith('.pdf') ? (
                                <iframe
                                    src={activeFileBlob ? URL.createObjectURL(activeFileBlob) : ''}
                                    className="w-full h-full border-0"
                                    title="PDF Viewer"
                                />
                            ) : activeFileName?.endsWith('.docx') ? (
                                <div
                                    className="w-full h-full p-8 overflow-y-auto text-[var(--text-main)] prose prose-lg prose-headings:font-display prose-headings:text-primary prose-a:text-secondary max-w-none text-right leading-relaxed"
                                    dir="rtl"
                                    style={{ fontFamily: 'var(--font-cairo)' }}
                                    dangerouslySetInnerHTML={{ __html: docxHtml }}
                                />
                            ) : (
                                <div className="flex items-center justify-center h-full text-black/50 text-xl font-bold">
                                    لا يمكن معاينة هذا الملف (نص عادي)
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Explainer Pane */}
                <div className="flex flex-col flex-1 glass-widget border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl relative" dir="rtl">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/10 blur-[120px] rounded-full pointer-events-none" />

                    {!isExplaining ? (
                        <div className="flex-1 overflow-y-auto p-8 relative z-10 flex flex-col justify-center">
                            <div className="text-center space-y-4 mb-12">
                                <h1 className="text-4xl md:text-5xl font-display font-black text-[var(--text-main)] tracking-tight">
                                    الشرح <span className="text-gradient">بالفيديو والصوت</span>
                                </h1>
                                <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
                                    ميزة تحاكي الفيديوهات التعليمية. انسخ أي فقرة واطلب من المساعد الذكي شرحها بالصوت والتظليل المتحرك.
                                </p>
                            </div>

                            <div className="glass-widget rounded-3xl border border-[var(--border-color)] p-8">
                                <div className="flex flex-col mb-8 gap-4">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="p-3 bg-secondary/20 rounded-xl">
                                            <PenTool className="w-6 h-6 text-secondary" />
                                        </div>
                                        <h2 className="text-2xl font-bold">اختر شخصية المعلم</h2>
                                    </div>
                                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-4">
                                        {AI_PERSONAS.map(p => (
                                            <button
                                                key={p.id}
                                                onClick={() => setSelectedPersona(p)}
                                                className={`p-4 rounded-3xl flex flex-col items-center justify-center gap-3 border-2 transition-all text-center group ${selectedPersona.id === p.id ? 'border-secondary bg-secondary/10 shadow-lg shadow-secondary/20 scale-105' : 'border-[var(--border-color)] bg-[var(--bg-dashboard)] hover:border-secondary/50 hover:bg-secondary/5'}`}
                                            >
                                                <div
                                                    className={`w-20 h-20 rounded-full flex items-center justify-center border-4 shadow-[inset_0_-4px_6px_rgba(0,0,0,0.3)] transition-transform group-hover:scale-110 ${selectedPersona.id === p.id ? 'ring-4 ring-secondary/30 ring-offset-2 ring-offset-[var(--bg-dashboard)] animate-pulse' : ''}`}
                                                    style={{ backgroundColor: p.bgColor, borderColor: p.borderColor }}
                                                >
                                                    <img src={p.icon} alt={p.name} className="w-14 h-14 object-contain filter drop-shadow-md" />
                                                </div>
                                                <div>
                                                    <div className="font-black text-[var(--text-main)] text-sm mb-0.5">{p.name}</div>
                                                    <div className="text-xs text-[var(--text-muted)] font-bold">{p.role}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                                    <h2 className="text-xl font-bold">ما الذي تريد شرحه؟</h2>
                                    <select
                                        value={selectedVoiceURI}
                                        onChange={e => setSelectedVoiceURI(e.target.value)}
                                        className="bg-[var(--bg-surface)] text-[var(--text-main)] text-sm font-bold border border-[var(--border-color)] rounded-xl px-4 py-2 focus:outline-none focus:border-secondary shadow-lg cursor-pointer max-w-[200px]"
                                    >
                                        {voices.length === 0 && <option value="" disabled>جاري التحميل...</option>}
                                        {voices.map(v => (
                                            <option key={v.voiceURI} value={v.voiceURI} title={v.name}>
                                                {v.name.split('-')[0]} ({v.lang})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-6">
                                    {!activeFileBlob && allDocs.length > 0 && (
                                        <div className="flex flex-col gap-2">
                                            <label className="text-sm font-bold text-[var(--text-muted)]">أو اختر مستنداً محفوظاً لفتحه وشرحه:</label>
                                            <select
                                                onChange={e => handleSelectDocument(e.target.value)}
                                                className="w-full bg-[var(--bg-dashboard)] text-[var(--text-main)] border border-[var(--border-color)] rounded-xl p-3 focus:outline-none focus:border-primary shadow-inner"
                                            >
                                                <option value="" disabled selected>اختر ملفاً لعرضه...</option>
                                                {allDocs.map(doc => (
                                                    <option key={doc.id} value={doc.filename}>{doc.filename} ({doc.chunks?.length || 0} أجزاء)</option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    <textarea
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder="اكتب موضوعاً أو انسخ فقرة من كتابك هنا، وسأقوم بتحويلها لدرس ممتع..."
                                        className="w-full h-40 bg-[var(--bg-surface)] border-2 border-[var(--border-color)] rounded-2xl p-6 text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-secondary transition-all resize-none text-xl leading-relaxed shadow-inner"
                                        disabled={isGenerating}
                                    />

                                    <button
                                        onClick={handleStartExplain}
                                        disabled={!topic.trim() || isGenerating}
                                        className={`w-full text-white text-xl py-5 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all
                                            ${isGenerating
                                                ? 'bg-gray-600 cursor-not-allowed opacity-70'
                                                : 'bg-gradient-to-r from-secondary to-purple-600 shadow-[0_4px_20px_0_rgba(255,60,172,0.4)] hover:scale-[1.02]'
                                            }`}
                                    >
                                        {isGenerating ? (
                                            <>
                                                <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                جاري تحضير الشرح المرئي وتلخيص المعلومات...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-6 h-6" />
                                                توليد وبدء الشرح المرئي
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 relative z-10 w-full h-full">
                            <ExplainerBoard
                                script={script}
                                voiceURI={selectedVoiceURI}
                                onClose={() => setIsExplaining(false)}
                                onExplainDeeper={(subTopic) => {
                                    setTopic(`أريد شرحاً أعمق عن هذه النقطة بالتحديد: ${subTopic}`);
                                    setIsExplaining(false);
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
