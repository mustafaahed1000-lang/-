import React, { useState, useEffect, useRef } from 'react';
import AppLayout from '../layouts/AppLayout';
import { db } from '../lib/db/database';
import { processDocument } from '../lib/rag/documentParser';
import { globalVectorStore } from '../lib/rag/vectorStore';
import { aiClient } from '../lib/ai/aiClient';
import type { AIChatMessage } from '../lib/ai/aiClient';
import { UploadCloud, Download, Loader2, Sparkles, BookOpen, CheckCircle, Maximize2, Minimize2, History, Send, Trash2, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { exportToSimplePDF } from '../lib/utils/pdfExport';

export default function SolverPage() {
    const [savedDocs, setSavedDocs] = useState<any[]>([]);
    const [selectedDocId, setSelectedDocId] = useState<string>('');
    const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
    const [assignmentImage, setAssignmentImage] = useState<string | null>(null);
    const [assignmentText, setAssignmentText] = useState('');
    const [isSolving, setIsSolving] = useState(false);
    const [solution, setSolution] = useState<string | null>(null);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const solutionRef = useRef<HTMLDivElement>(null);

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
            setSavedActivities(activities.filter(a => a.type === 'solver'));
        };
        loadDocsAndActivities();
    }, [isHistoryOpen]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setAssignmentImage(ev.target?.result as string);
                setAssignmentFile(null);
            };
            reader.readAsDataURL(file);
        } else {
            setAssignmentFile(file);
            setAssignmentImage(null);

            // Try to extract text natively if possible (pdf/doc) using document parser
            try {
                const parsed = await processDocument(file);
                const fullTextArr = parsed.chunks.join('\n');
                setAssignmentText(fullTextArr.substring(0, 5000)); // Grab first chunks to give AI context
            } catch (err) {
                console.log("Could not parse assignment file natively", err);
            }
        }
    };

    const solveAssignment = async () => {
        if (!selectedDocId) {
            alert('يرجى اختيار مادة مرجعية (الكتاب) أولاً.');
            return;
        }
        if (!assignmentFile && !assignmentImage && !assignmentText.trim()) {
            alert('يرجى إرفاق ملف الواجب أو تصويره أو كتابة نصه.');
            return;
        }

        setIsSolving(true);
        setSolution(null);

        try {
            // Context from referenced book & Web Search (Real-time Google Fallback)
            const doc = savedDocs.find(d => d.id === selectedDocId);

            const [searchContext, webSearchContext] = await Promise.all([
                globalVectorStore.similaritySearch(assignmentText + " حل التعيين الواجب", 40),
                (async () => {
                    const TAVILY_API_KEY = "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";
                    if (!assignmentText && !assignmentImage) return "";
                    const query = assignmentText ? assignmentText.substring(0, 150) : "سؤال جامعي";
                    try {
                        const res = await fetch("https://api.tavily.com/search", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ api_key: TAVILY_API_KEY, query, search_depth: "basic", max_results: 2 })
                        });
                        if (!res.ok) return "";
                        const data = await res.json();
                        let webStr = "";
                        if (data.answer) webStr += `ملخص ويب: ${data.answer} \n`;
                        return webStr + data.results.map((r: any) => `[موقع ويب: ${r.title}]\n${r.content} `).join('\n\n');
                    } catch (e) { return ""; }
                })()
            ]);

            const contextStr = `=== معلومات من الكتاب المرجعي ===\n` + searchContext.map(c => c.text).join('\n---\n') + `\n\n === معلومات مساعدة من محرك بحث الويب ===\n` + webSearchContext;



            const systemPrompt = `أنت أستاذ أكاديمي خبير واسمك Solvica V10. وظيفتك حل أسئلة وواجبات الطلاب بدقة مطلقة وشرح مبسط.

## 📖 الكتاب المرجعي / المستند المرفق: "${doc?.filename}"
${contextStr}

## أوامر الحل العسكرية (مهم جداً):
1. **استخدم معلومات المستند المرفق كمرجع أساسي وأولوي**. إذا وجدت الإجابة أو جزءاً منها في "معلومات المستند"، استخدمها.
2. التظاهر دائماً بأنك تعرف الإجابة. ابدأ بالحل مباشرة ولا تكتب مقدمات مثل "بناءً على...".
3. إياك أن تخترع إجابات من خارج المنهج إذا كانت المسألة تتعلق بتعريفات أو خطوات محددة مشروحة في المستند المرفق. اعتمد على المستند أولاً، ثم أكمل بعلمك الواسع إذا لزم الأمر فقط.
4. إذا سأل الطالب سؤالاً عاماً أو خارج المنهج (مثل ترجمة أو لغة أو معلومات عامة)، أجب عليه بدقة واحترافية. استعن بـ "معلومات مساعدة من محرك بحث الويب" إن وجدت.

### 2. قراءة الصور(OCR دقيق):
- اقرأ كل رقم وكل رمز في الصورة بدقة متناهية.
- ** قبل الحل **: اكتب بالضبط ما تراه في الصورة:
- اكتب التعبير الرياضي كما هو حرفياً
    - اكتب الأرقام والعمليات بالترتيب الصحيح
        - إذا كان هناك شجرة أو مخطط، صفه بدقة(الجذر، الأوراق، العمليات)
            - ** بعد ذلك **: حل خطوة بخطوة

### 3. الرياضيات:
- اكتب كل خطوة حسابية في سطر مستقل
    - استخدم الرموز الرياضية الصحيحة: \`×\` \`÷\` \`√\` \`²\` \`³\` \`≠\` \`≤\` \`≥\` \`∈\` \`∪\` \`∩\` \`⊂\`
- ضع التعبيرات الرياضية في \`backticks\`
- **راجع كل عملية حسابية مرتين** قبل كتابة الإجابة النهائية

### 4. التنسيق (Markdown فقط):
- استخدم \`## عنوان\` و \`### عنوان فرعي\`
- استخدم جداول Markdown للبيانات: \`| عمود1 | عمود2 |\`
- استخدم **خط عريض** للمفاهيم
- استخدم قوائم مرقمة 1. 2. 3. للخطوات
- ممنوع HTML نهائياً

### 5. هيكل الإجابة:
## 📖 المرجع: [اسم الكتاب]
## 📝 قراءة السؤال
[تفريغ دقيق لما في الصورة/النص]
## ✍️ الحل خطوة بخطوة
1. [الخطوة الأولى]
2. [الخطوة الثانية]
## ✅ النتيجة النهائية
[الجواب]

### 6. ممنوع:
- الاعتذار عن الإجابة
- قول "لا أستطيع"
- اختراع معلومات من خارج الكتاب`;

            let messages: any[] = [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: `قم بحل هذا الواجب/النشاط خطوة بخطوة. ${assignmentText}` }
            ];

            if (assignmentImage) {
                messages[1].image = assignmentImage;
            }

            const response = await aiClient.chat(messages);
            setSolution(response);
            setChatHistory([]);

            // Save to History
            const newActivity = {
                id: `act_${Date.now()}`,
                type: 'solver' as const,
                title: assignmentText ? assignmentText.substring(0, 40) + '...' : (assignmentFile ? assignmentFile.name : 'مسألة مصورة'),
                content: response,
                chatHistory: [],
                updatedAt: Date.now()
            };
            await db.saveActivity(newActivity);
            setLoadedActivityId(newActivity.id);
            db.getAllActivities().then(acts => setSavedActivities(acts.filter(a => a.type === 'solver')));

        } catch (error: any) {
            console.error("Solver Error:", error);
            setSolution('عذراً، حدث خطأ أثناء حل التعيين: ' + error.message);
        } finally {
            setIsSolving(false);
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
            const contextMsg: AIChatMessage = { role: 'system' as const, content: `أنت المساعد الأكاديمي. قمت بحل مسألة الطالب سابقاً:\n${solution}\n\nأجب عن استفسارات الطالب بناء على الحل السابق، بصيغة Markdown وبشرح مبسط ومباشر.` };
            // Ensure compatibility with AI client structure (user/assistant)
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
        setSolution(act.content);
        setChatHistory(act.chatHistory || []);
        setLoadedActivityId(act.id);
        setAssignmentText('');
        setAssignmentImage(null);
        setAssignmentFile(null);
        setIsHistoryOpen(false);
    };

    const deleteActivity = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await db.deleteActivity(id);
        const acts = await db.getAllActivities();
        setSavedActivities(acts.filter(a => a.type === 'solver'));
        if (loadedActivityId === id) {
            setSolution(null);
            setChatHistory([]);
            setLoadedActivityId(null);
        }
    };

    return (
        <AppLayout>
            {isHistoryOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[99999] flex justify-end transition-opacity" dir="rtl" onClick={() => setIsHistoryOpen(false)}>
                    <div className="w-full max-w-sm h-full bg-[var(--bg-surface)] border-l border-[var(--border-color)] p-6 overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-3">
                                <History className="w-6 h-6 text-blue-500" />
                                سجل الحلول
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
                                    <div key={act.id} onClick={() => loadPastActivity(act)} className={`p-4 rounded-xl border transition-all cursor-pointer group hover:-translate-y-1 shadow-sm hover:shadow-md ${loadedActivityId === act.id ? 'border-blue-500 bg-blue-500/10 shadow-blue-500/10' : 'border-[var(--border-color)] hover:border-blue-500/50 bg-[var(--bg-background)]'}`}>
                                        <h4 className="font-bold text-[var(--text-main)] mb-2 truncate" title={act.title}>{act.title || 'واجب تفاعلي'}</h4>
                                        <div className="flex justify-between items-center">
                                            <p className="text-xs font-bold text-[var(--text-muted)]">{new Date(act.updatedAt).toLocaleDateString('ar-EG')}</p>
                                            <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-md font-bold">{act.chatHistory?.length || 0} رسالة</span>
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
                    <div className="bg-[var(--bg-background)] rounded-3xl p-8 shadow-sm border border-[var(--border-color)] flex items-center justify-between transition-colors duration-300">
                        <div>
                            <h1 className="text-3xl font-extrabold text-[var(--text-main)] mb-2 flex items-center gap-3">
                                <Sparkles className="w-8 h-8 text-blue-500" />
                                حلّال الأنشطة والواجبات
                            </h1>
                            <p className="text-[var(--text-muted)] font-medium">قم برفع واجبك (صورة، ملف، نص) وحدد كتاب المادة وسيقوم المساعد بحله فوراً.</p>
                        </div>
                        <button onClick={() => setIsHistoryOpen(true)} className="flex items-center gap-2 bg-[var(--widget-bg)] border border-[var(--border-color)] hover:border-blue-500 text-[var(--text-main)] px-4 py-2 rounded-xl transition-all font-bold">
                            <History className="w-5 h-5" />
                            السجل المحفوظ
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">

                        {/* INPUT PANEL */}
                        <div className="bg-[var(--bg-background)] rounded-3xl p-8 shadow-sm border border-[var(--border-color)] flex flex-col gap-6 transition-colors duration-300">

                            {/* Step 1: Select Material */}
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">1</span>
                                    اختر المادة المرجعية
                                </h3>
                                <select
                                    value={selectedDocId}
                                    onChange={e => setSelectedDocId(e.target.value)}
                                    className="w-full bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-4 text-[var(--text-main)] font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                >
                                    <option value="">-- اختر من مكتبتك --</option>
                                    {savedDocs.map(doc => (
                                        <option key={doc.id} value={doc.id}>{doc.filename}</option>
                                    ))}
                                </select>
                            </div>

                            <hr className="border-[var(--border-color)]" />

                            {/* Step 2: Upload Assignment */}
                            <div>
                                <h3 className="text-lg font-bold text-[var(--text-main)] mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm">2</span>
                                    إرفاق الواجب
                                </h3>
                                <div className="border-2 border-dashed border-[var(--border-color)] rounded-2xl p-6 text-center hover:opacity-80 transition-colors cursor-pointer relative bg-[var(--bg-surface)]">
                                    <input
                                        type="file"
                                        accept="image/*,.pdf,.doc,.docx"
                                        onChange={handleFileUpload}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <UploadCloud className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                                    <p className="font-bold text-[var(--text-main)] flex items-center justify-center gap-2">
                                        ارفع ملف التعيين <span className="text-xs text-[var(--text-muted)] font-normal">(صورة، PDF، Word)</span>
                                    </p>
                                    {assignmentFile && <p className="text-sm text-green-500 mt-2 font-bold flex items-center justify-center gap-1"><CheckCircle className="w-4 h-4" /> {assignmentFile.name}</p>}
                                    {assignmentImage && <img src={assignmentImage} className="w-20 rounded-lg mx-auto mt-3 shadow-md border border-[var(--border-color)]" alt="preview" />}
                                </div>
                                <textarea
                                    value={assignmentText}
                                    onChange={e => setAssignmentText(e.target.value)}
                                    placeholder="أو اكتب/انسخ نص السؤال هنا مباشرة..."
                                    className="w-full mt-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-4 text-[var(--text-main)] font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32 transition-all"
                                />
                            </div>

                            <button
                                onClick={solveAssignment}
                                disabled={isSolving}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg flex justify-center items-center gap-2 disabled:opacity-50 mt-auto"
                            >
                                {isSolving ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                                {isSolving ? 'جاري الحل الدقيق...' : 'حل الواجب الآن'}
                            </button>
                        </div>

                        {/* OUTPUT PANEL */}
                        <div className={`${isFullscreen ? 'fixed inset-0 z-[9999] bg-[var(--bg-background)] p-8 overflow-y-auto' : 'bg-[var(--bg-background)] rounded-3xl p-8 shadow-sm border border-[var(--border-color)] flex flex-col h-full min-h-[500px]'} transition-colors duration-300`}>
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                                    <BookOpen className="w-6 h-6 text-emerald-500" />
                                    الحل النموذجي
                                </h3>
                                <div className="flex gap-2">
                                    {solution && !isSolving && (
                                        <button onClick={() => setIsFullscreen(!isFullscreen)} className="bg-slate-600 hover:bg-slate-700 text-white font-bold py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all text-sm shadow-md">
                                            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                                            {isFullscreen ? 'تصغير' : 'تكبير'}
                                        </button>
                                    )}
                                    {solution && !isSolving && (
                                        <button onClick={() => exportToSimplePDF(solutionRef, 'حل_الواجب_Solvica')} className="bg-gradient-to-l from-blue-600 to-indigo-600 hover:opacity-90 text-white font-bold py-2.5 px-5 rounded-xl flex items-center gap-2 transition-all text-sm shadow-md">
                                            <Download className="w-4 h-4" /> تصدير PDF
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 bg-[var(--bg-surface)] rounded-2xl p-6 border border-[var(--border-color)] overflow-y-auto custom-scrollbar relative transition-colors duration-300">
                                {!solution && !isSolving && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-muted)] opacity-50">
                                        <CheckCircle className="w-16 h-16 mb-4" />
                                        <p className="font-bold">الحل سيظهر هنا تفصيلياً</p>
                                    </div>
                                )}
                                {isSolving && (
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-blue-500">
                                        <Loader2 className="w-12 h-12 animate-spin mb-4" />
                                        <p className="font-bold animate-pulse">جاري استخراج الأدلة وصياغة الحل...</p>
                                    </div>
                                )}
                                {solution && !isSolving && (
                                    <div className="flex flex-col h-full gap-4">
                                        <div id="solution-box" ref={solutionRef} className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-10 prose prose-slate dark:prose-invert max-w-none text-[var(--text-main)] font-medium transition-colors duration-300 prose-headings:text-[var(--text-main)] prose-strong:text-[var(--text-main)] prose-p:text-[var(--text-main)] prose-li:text-[var(--text-main)] prose-table:text-[var(--text-main)] rounded-xl" style={{ lineHeight: '2.2', direction: 'rtl', textAlign: 'right' }}>
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{solution}</ReactMarkdown>
                                        </div>

                                        {/* Chat History */}
                                        {chatHistory.length > 0 && (
                                            <div className="space-y-4 mt-6">
                                                <h4 className="font-bold text-[var(--text-main)] border-b border-[var(--border-color)] pb-2 flex items-center gap-2">
                                                    <History className="w-4 h-4 ml-1" />
                                                    استفساراتك حول الحل
                                                </h4>
                                                {chatHistory.map((msg, i) => (
                                                    <div key={i} className={`p-5 rounded-2xl max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600/10 border border-blue-600/20 text-blue-500 mr-auto rounded-tr-sm' : 'bg-[var(--bg-background)] border border-[var(--border-color)] text-[var(--text-main)] ml-auto rounded-tl-sm'}`}>
                                                        {msg.role === 'assistant' ? (
                                                            <div className="prose prose-slate dark:prose-invert max-w-none text-sm text-[var(--text-main)] leading-loose">
                                                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                                            </div>
                                                        ) : (
                                                            <div className="font-bold">{msg.content}</div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {isChatting && (
                                            <div className="flex items-center gap-2 p-4 text-blue-500 font-bold animate-pulse ml-auto bg-blue-500/5 rounded-xl border border-blue-500/20">
                                                <Loader2 className="w-4 h-4 animate-spin" /> جاري التفكير والإجابة...
                                            </div>
                                        )}

                                        {/* Chat Input */}
                                        <div className="mt-auto relative z-10 pt-4">
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={chatInput}
                                                    onChange={e => setChatInput(e.target.value)}
                                                    onKeyDown={e => e.key === 'Enter' && sendChatMessage()}
                                                    placeholder="استفسر عن أي نقطة غير مفهومة في الحل..."
                                                    className="w-full bg-[var(--bg-background)] border border-[var(--border-color)] rounded-xl px-4 py-4 text-[var(--text-main)] font-semibold outline-none focus:border-blue-500 focus:shadow-[0_0_15px_rgba(59,130,246,0.2)] transition-all"
                                                />
                                                <button
                                                    onClick={sendChatMessage}
                                                    disabled={isChatting || !chatInput.trim()}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-4 flex items-center justify-center transition-all disabled:opacity-50"
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
