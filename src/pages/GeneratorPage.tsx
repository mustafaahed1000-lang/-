import { useState, useEffect, useRef } from 'react';
import AppLayout from '../layouts/AppLayout';
import { db } from '../lib/db/database';
import { aiClient } from '../lib/ai/aiClient';
import type { AIChatMessage } from '../lib/ai/aiClient';
import { exportToPDF } from '../lib/utils/pdfExport';
import { BookOpen, FileText, Loader2, Download, CheckCircle, History, Send, Trash2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export default function GeneratorPage() {
    const [savedDocs, setSavedDocs] = useState<any[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string>('');
    const [prompt, setPrompt] = useState('');

    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedContent, setGeneratedContent] = useState<string | null>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    // Chat & History State
    const [chatHistory, setChatHistory] = useState<AIChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [isChatting, setIsChatting] = useState(false);
    const [loadedActivityId, setLoadedActivityId] = useState<string | null>(null);

    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [savedActivities, setSavedActivities] = useState<any[]>([]);

    useEffect(() => {
        const loadDocsAndActivities = async () => {
            const docs = await db.getAllDocuments();
            setSavedDocs(docs);
            const activities = await db.getAllActivities();
            setSavedActivities(activities.filter(a => a.type === 'summary'));
        };
        loadDocsAndActivities();
    }, [isHistoryOpen]);

    const handleGenerate = async () => {
        if (!selectedDocId) {
            alert('يرجى اختيار المادة ليتم تحليلها وبناء المحتوى بناءً عليها.');
            return;
        }
        setIsGenerating(true);
        setGeneratedContent(null);

        try {
            const doc = savedDocs.find(d => d.id === selectedDocId);
            if (!doc) throw new Error("لم يتم العثور على المستند المحدد.");

            const rawTextChunks: string[] = (doc.chunks[0] && typeof doc.chunks[0] === 'object' && doc.chunks[0].text)
                ? doc.chunks.map((c: any) => c.text)
                : typeof doc.chunks[0] === 'string' ? doc.chunks : [];

            const userQuery = prompt || "دليل دراسي شامل وتلخيص عميق لكل المفاهيم والأمثلة والتعريفات";

            // SUPER FAST HEURISTIC RAG (Bypass slow/rate-limited Gemini Embeddings on Page Reload)
            const queryWords = userQuery.replace(/شامل|دليل|ملخص|شرح|مادة/g, '').trim().split(/\s+/).filter(k => k.length > 2);
            if (queryWords.length === 0) queryWords.push("سؤال", "امتحان", "حل", "تمرين", "شرح");

            const scoredChunks = rawTextChunks.map(chunk => {
                const text = chunk.toLowerCase();
                let score = 0;
                for (const kw of queryWords) {
                    if (text.includes(kw.toLowerCase())) score++;
                }
                return { chunk, score };
            });

            // Sort by highest keyword match, then take top 35 chunks
            scoredChunks.sort((a, b) => b.score - a.score);
            const topChunks = scoredChunks.slice(0, 35).map(c => c.chunk);

            // Guarantee global context: Append Intro/Outro for huge books
            if (rawTextChunks.length > 10) {
                const globalContext = rawTextChunks.slice(0, 3).concat(rawTextChunks.slice(-3));
                topChunks.push(...globalContext);
            }

            const contextStr = Array.from(new Set(topChunks)).join('\n---\n').substring(0, 30000);

            const sysPrompt = `أنت المساعد الأكاديمي الذكي الفائق (Solvica).
المعلومات المتوفرة لك من الكتاب/المستند المرفق:
${contextStr}

مهمتك: توليد تلخيص ومحتوى تفصيلي وعميق جداً وطوييييل بناءً على الطلب.
**أوامر عسكرية صارمة جداً:**
1. إياك أن تتحدث عن المستند نفسه أو تقول "بناء على المقتطفات" أو "المستند لا يحتوي على". 
2. **قاعدة ذهبية واستثناء هام جداً جداً:** قبل أن تبدأ بالتلخيص، قم بتحليل النص المرفق. إذا كان النص المرفق عبارة عن "أسئلة امتحان" أو "اختبارات سابقة" أو "واجب" أو "تمارين"، **توقف فوراً عن ميزة التلخيص الشامل ولا تقم بتأليف وشرح منهج كامل**. بل وظيفتك الآن هي **حل هذه الأسئلة بالترتيب** مع توفير إجابات نموذجية دقيقة وشرح تفصيلي لكل حل.
3. إذا كان المستند نظرياً (وليس أسئلة)، استخدم معرفتك الأكاديمية الواسعة لتكملة الشرح وجعله ضخماً ودقيقاً جداً.
4. تجاهل صفحات الغلاف. ادخل في صلب الموضوع العلمي مباشرة.
5. **التنسيق الإجباري:** يجب أن يكون الناتج في شكل HTML مبهر وبصرياً جذاب جداً! استخدم الكثيييير من الجداول الملونة (<table>)، والقوائم المنظمة (<ul>، <ol>)، والبطاقات المظللة، واستخدم الماركر والألوان لإبراز الكلمات (<strong>، <span style="color: blue;">). لا تجعله نصاً مملاً أبداً!
6. أريد الجواب النهائي فقط بصيغة HTML. لا تكتب أي مقدمات أو اعتذارات الدكاء الاصطناعي.

الطلب المحدد: ${userQuery}`;

            const response = await aiClient.chat([{ role: 'user', content: 'أعطني الملخص الأكاديمي الضخم المطلوب بصيغة HTML نظيف تماماً، ولا تكتب أي كلمة خارج الكود، ابدأ الكود بـ <div> وقم بإنهاءه بـ </div>.' }], { model: 'gpt-4o' }, sysPrompt);
            const cleanedHTML = response.replace(/^```html|```$/gm, '').trim();
            setGeneratedContent(cleanedHTML);
            setChatHistory([]);

            // Save Activity
            const newActivity = {
                id: `act_${Date.now()}`,
                type: 'summary' as const,
                title: userQuery.substring(0, 40) + '...',
                content: cleanedHTML,
                chatHistory: [],
                updatedAt: Date.now()
            };
            await db.saveActivity(newActivity);
            setLoadedActivityId(newActivity.id);
            db.getAllActivities().then(acts => setSavedActivities(acts.filter(a => a.type === 'summary')));

        } catch (error: any) {
            console.error(error);
            alert("حدث خطأ أثناء التوليد: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const sendChatMessage = async () => {
        if (!chatInput.trim() || isChatting || !loadedActivityId) return;
        const msg = chatInput.trim();
        setChatInput('');
        setIsChatting(true);
        const newHistory: AIChatMessage[] = [...chatHistory, { role: 'user' as const, content: msg }];
        setChatHistory(newHistory);

        try {
            const contextMsg: AIChatMessage = { role: 'system' as const, content: `أنت المساعد الأكاديمي. قمت بتوليد التلخيص التالي سابقاً:\n${generatedContent}\n\nأجب عن استفسارات الطالب بناء على التلخيص، بصيغة Markdown وبشرح مبسط ومباشر.` };
            const response = await aiClient.chat([contextMsg, ...newHistory]);

            const finalHistory: AIChatMessage[] = [...newHistory, { role: 'assistant' as const, content: response }];
            setChatHistory(finalHistory);

            const act = await db.getActivity(loadedActivityId);
            if (act) {
                act.chatHistory = finalHistory;
                await db.saveActivity(act);
            }
        } catch (e: any) {
            console.error("Chat Error", e);
        } finally {
            setIsChatting(false);
        }
    };

    const loadPastActivity = (act: any) => {
        setGeneratedContent(act.content);
        setChatHistory(act.chatHistory || []);
        setLoadedActivityId(act.id);
        setPrompt('');
        setIsHistoryOpen(false);
    };

    const deleteActivity = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await db.deleteActivity(id);
        const acts = await db.getAllActivities();
        setSavedActivities(acts.filter(a => a.type === 'summary'));
        if (loadedActivityId === id) {
            setGeneratedContent(null);
            setChatHistory([]);
            setLoadedActivityId(null);
        }
    };

    const downloadPDF = async () => {
        if (!contentRef.current) return;
        await exportToPDF(contentRef, 'تلخيص_ذكي');
    };

    return (
        <AppLayout>
            {isHistoryOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex justify-end transition-opacity" dir="rtl" onClick={() => setIsHistoryOpen(false)}>
                    <div className="w-full max-w-sm h-full bg-[var(--bg-surface)] border-l border-[var(--border-color)] p-6 overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                                <History className="w-6 h-6 text-[#2ba396]" />
                                سجل الأدلة الدراسية
                            </h2>
                            <button onClick={() => setIsHistoryOpen(false)} className="text-[var(--text-muted)] hover:text-red-500 bg-[var(--bg-background)] p-2 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                        </div>
                        {savedActivities.length === 0 ? (
                            <div className="text-center py-10 opacity-70">
                                <History className="w-16 h-16 text-[var(--text-muted)] mx-auto mb-4" />
                                <p className="text-[var(--text-muted)] font-bold">لا يوجد سجل محفوظ.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {savedActivities.map(act => (
                                    <div key={act.id} onClick={() => loadPastActivity(act)} className={`p-4 rounded-xl border transition-all cursor-pointer group hover:-translate-y-1 shadow-sm hover:shadow-md ${loadedActivityId === act.id ? 'border-[#2ba396] bg-[#2ba396]/10 shadow-[#2ba396]/10' : 'border-[var(--border-color)] hover:border-[#2ba396]/50 bg-[var(--bg-background)]'}`}>
                                        <h4 className="font-bold text-[var(--text-main)] mb-2 truncate" title={act.title}>{act.title || 'دليل دراسي'}</h4>
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs font-bold text-[var(--text-muted)]">{new Date(act.updatedAt).toLocaleDateString('ar-EG')}</p>
                                            <span className="text-xs bg-[#2ba396]/10 text-[#2ba396] px-2 py-1 rounded-md font-bold">{act.chatHistory?.length || 0} رسالة</span>
                                        </div>
                                        <div className="mt-3 text-left">
                                            <button onClick={(e) => deleteActivity(act.id, e)} className="text-red-400 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity p-2 bg-red-500/10 hover:bg-red-500 rounded-lg">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            <div className="flex justify-center items-center min-h-[90vh] p-4 lg:p-8 bg-[var(--bg-background)] font-sans transition-colors duration-300" dir="rtl">
                <div className="w-full max-w-6xl h-full flex flex-col gap-6 bg-[var(--bg-surface)] backdrop-blur-3xl rounded-[2.5rem] p-6 shadow-2xl border border-[var(--border-color)] transition-colors duration-300">

                    {/* Header */}
                    <div className="bg-[var(--bg-background)] rounded-3xl p-8 shadow-sm border border-[var(--border-color)] flex flex-col md:flex-row items-center justify-between transition-colors duration-300 gap-4">
                        <div>
                            <h1 className="text-3xl font-extrabold text-[var(--text-main)] mb-2 flex items-center gap-3">
                                <BookOpen className="w-8 h-8 text-indigo-500" />
                                تلخيص ذكي للمقررات
                            </h1>
                            <p className="text-[var(--text-muted)] font-medium">حول كتبك إلى ملخصات مركزة ودقيقة حسب الوحدة المطلوبة للتحضير السريع للامتحانات.</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="bg-[#2ba396]/10 text-[#2ba396] px-6 py-3 rounded-2xl font-bold border border-[#2ba396]/20 shadow-sm flex items-center gap-2">
                                <CheckCircle className="w-5 h-5" /> دقة NotebookLM
                            </div>
                            <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-2 bg-[var(--widget-bg)] border border-[var(--border-color)] hover:border-indigo-500 text-[var(--text-main)] px-4 py-3 rounded-2xl transition-all font-bold">
                                <History className="w-5 h-5" />
                                السجل السريع
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 flex-1">

                        {/* INPUT PANEL */}
                        <div className="md:col-span-4 bg-[var(--bg-background)] rounded-3xl p-8 shadow-sm border border-[var(--border-color)] flex flex-col gap-6 transition-colors duration-300">

                            {/* Reference Selection */}
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-main)] mb-3">حدد المادة لاستخراج الملخص منها بدقة:</label>
                                <select
                                    value={selectedDocId}
                                    onChange={e => setSelectedDocId(e.target.value)}
                                    className="w-full bg-[var(--bg-surface)] border-2 border-slate-200 rounded-xl p-4 text-[var(--text-main)] font-bold text-lg focus:ring-4 focus:ring-[#2ba396]/20 focus:border-[#2ba396] outline-none transition-all shadow-sm cursor-pointer"
                                >
                                    <option value="" disabled>-- اضغط لاختيار مرجع --</option>
                                    {savedDocs.filter(d => d.filename !== '_solvica_folder_').map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.filename}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Prompt */}
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-main)] mb-3">ما الذي تريد تلخيصه أو التركيز عليه؟</label>
                                <textarea
                                    value={prompt}
                                    onChange={e => setPrompt(e.target.value)}
                                    placeholder="مثال: قم بعمل تلخيص شامل ومفصل للوحدة الأولى التي تتحدث عن معمارية أنظمة قواعد البيانات ومراحل تطورها..."
                                    className="w-full bg-[var(--bg-surface)] border-2 border-slate-200 rounded-xl p-4 text-[var(--text-main)] font-medium text-lg focus:ring-4 focus:ring-[#2ba396]/20 focus:border-[#2ba396] outline-none resize-none h-40 transition-all shadow-sm leading-relaxed"
                                />
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={`w-full text-white font-bold py-5 px-6 rounded-2xl transition-all shadow-lg flex justify-center items-center gap-3 text-lg mt-auto ${isGenerating ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#2ba396] hover:bg-[#238b7f] hover:-translate-y-1'}`}
                            >
                                {isGenerating ? <Loader2 className="w-7 h-7 animate-spin" /> : <FileText className="w-7 h-7" />}
                                {isGenerating ? 'جاري بناء وتحليل الدليل...' : 'توليد الدليل الدراسي'}
                            </button>
                        </div>

                        {/* OUTPUT PANEL */}
                        <div className="md:col-span-8 bg-[var(--bg-background)] rounded-3xl p-8 shadow-sm border border-[var(--border-color)] flex flex-col min-h-[600px] transition-colors duration-300 relative">

                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                                    <FileText className="w-6 h-6 text-[#2ba396]" />
                                    مخرجات المادة
                                </h3>
                                {generatedContent && (
                                    <button onClick={downloadPDF} className="bg-[#2ba396] hover:bg-[#238b7f] text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-all text-sm shadow-md hover:shadow-lg">
                                        <Download className="w-5 h-5" /> تحميل كنسخة PDF
                                    </button>
                                )}
                            </div>

                            <div className="flex-1 bg-[var(--bg-surface)] flex items-center justify-center rounded-2xl p-8 border-2 border-dashed border-slate-200 overflow-y-auto custom-scrollbar relative">
                                {!generatedContent && !isGenerating && (
                                    <div className="text-center text-[var(--text-muted)] opacity-60">
                                        <FileText className="w-20 h-20 mb-6 mx-auto opacity-40 text-[#2ba396]" />
                                        <p className="font-bold text-2xl mb-2">الدليل الدراسي</p>
                                        <p className="text-lg">قم بتحديد المادة وطلب المخلص لاستخراج المعرفة.</p>
                                    </div>
                                )}

                                {isGenerating && (
                                    <div className="text-center text-[#2ba396]">
                                        <Loader2 className="w-16 h-16 animate-spin mb-6 mx-auto" />
                                        <p className="font-bold text-xl animate-pulse">يتم الآن قراءة وتحليل المستند بدقة متناهية...</p>
                                    </div>
                                )}

                                {/* PDF DISPLAY */}
                                {generatedContent && !isGenerating && (
                                    <div className="w-full flex flex-col h-full relative" ref={contentRef}>
                                        <div id="generation-output" className="bg-white text-black p-10 rounded-2xl shadow-sm border border-slate-100 mb-6" dangerouslySetInnerHTML={{ __html: generatedContent }} />

                                        {/* Chat History */}
                                        {chatHistory.length > 0 && (
                                            <div className="space-y-4">
                                                <h4 className="font-bold text-[var(--text-main)] border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                                                    <History className="w-4 h-4 ml-1" />
                                                    استفساراتك حول التلخيص
                                                </h4>
                                                {chatHistory.map((msg, i) => (
                                                    <div key={i} className={`p-5 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-[#2ba396]/10 border border-[#2ba396]/20 text-[#238b7f] mr-auto rounded-tr-sm' : 'bg-[var(--bg-background)] border border-[var(--border-color)] text-[var(--text-main)] ml-auto rounded-tl-sm'}`}>
                                                        {msg.role === 'assistant' ? (
                                                            <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-[var(--text-main)] leading-loose text-right" dir="rtl">
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content as string}</ReactMarkdown>
                                                            </div>
                                                        ) : (
                                                            <div className="font-bold">{msg.content as string}</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {isChatting && (
                                            <div className="flex items-center gap-2 p-4 text-[#2ba396] font-bold animate-pulse ml-auto bg-[#2ba396]/5 rounded-xl border border-[#2ba396]/20 mt-4">
                                                <Loader2 className="w-4 h-4 animate-spin" /> جاري التفكير والإجابة...
                                            </div>
                                        )}

                                        {/* Chat Input */}
                                        <div className="mt-8 relative z-10 pt-4 border-t border-[var(--border-color)]">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={chatInput}
                                                    onChange={e => setChatInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                                                    placeholder="استفسر عن أي نقطة غير واضحة في هذا الدليل..."
                                                    className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl px-4 py-4 text-[var(--text-main)] font-semibold outline-none focus:border-[#2ba396] focus:shadow-[0_0_15px_rgba(43,163,150,0.2)] transition-all"
                                                />
                                                <button
                                                    onClick={sendChatMessage}
                                                    disabled={isChatting || !chatInput.trim()}
                                                    className="bg-[#2ba396] hover:bg-[#238b7f] text-white rounded-xl px-5 py-4 flex items-center justify-center transition-all disabled:opacity-50"
                                                >
                                                    <Send className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
