import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { aiClient, type AIChatMessage } from '../lib/ai/aiClient';
import { Send, Trash2, Paperclip, MessageSquare, Download, Brain, FileText, X, Copy, BookOpen, Mic, StopCircle, Zap } from 'lucide-react';
import { exportToPDF } from '../lib/utils/pdfExport';
import { db, type ChatSession } from '../lib/db/database';
import AppLayout from '../layouts/AppLayout';

export default function ChatPage() {
    const [messages, setMessages] = useState<AIChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [sessionId, setSessionId] = useState<string>(`session_${Date.now()}`);
    const [savedDocs, setSavedDocs] = useState<any[]>([]);
    const [selectedContextDocId, setSelectedContextDocId] = useState<string>("");
    const [isTyping, setIsTyping] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [chatHistoryList, setChatHistoryList] = useState<any[]>([]);

    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const [attachedFileText, setAttachedFileText] = useState<string | null>(null);
    const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
    const [isListening, setIsListening] = useState(false);

    useEffect(() => {
        db.getAllDocuments().then(setSavedDocs);
        db.getAllChatSessions().then(setChatHistoryList);
        
        // Intercept Pollinations PK from hash
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const apiKey = hashParams.get("api_key");
        if (apiKey) {
            localStorage.setItem("pollinations_pk", apiKey);
            localStorage.setItem("pk", apiKey);
            window.history.replaceState(null, "", window.location.pathname);
            setTimeout(() => alert("✅ تم ربط حسابك وتفعيل خدمة الرؤية بنجاح!"), 500);
        }

        const lastSessionId = localStorage.getItem('solvica_last_session');
        if (lastSessionId) {
            loadSession(lastSessionId);
        } else {
            setGreeting();
        }
    }, []);

    const setGreeting = () => {
        const helloMsg: AIChatMessage = { 
            role: 'assistant', 
            content: "أهلاً بك! أنا Solvica المساعد الأكاديمي الذكي. كيف يمكنني مساعدتك في دراستك اليوم؟ يمكنك سؤالي عن مراجعة التخصصات، حل المسائل، أو تحليل الصور والملفات! 🚀🧪" 
        };
        setMessages([helloMsg]);
    };

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isTyping]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            // ✅ Validate format: JPG, PNG, WebP, GIF only
            const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (!allowedImageTypes.includes(file.type)) {
                alert('❌ نوع الصورة غير مدعوم. الأنواع المقبولة: JPG, PNG, WebP, GIF');
                return;
            }
            // ✅ 10MB size limit
            if (file.size > 10 * 1024 * 1024) {
                alert('❌ حجم الصورة يتجاوز 10MB. الرجاء اختيار صورة أصغر.');
                return;
            }

            // ✅ Check PK before reading the image
            const pk = localStorage.getItem('pk');
            if (!pk || pk === 'pk_kn9KoGgYC7i5Sk6P' || pk === 'no-login-required') {
                const redirectUrl = encodeURIComponent(window.location.href);
                const loginUrl = `https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}&permissions=profile,balance,usage,offline_access&app_key=pk_kn9KoGgYC7i5Sk6P&expiry=never`;
                const errorText = `⚠️ أهلاً يا صديقي، خوادم تحليل الصور المجانية المفتوحة تواجه ضغطاً عالياً حالياً.\n\n💡 لكي تتمكن من رفع وقراءة الصور والملفات فوراً وبلا رسائل خطأ، يرجى التكرم **[بتسجيل الدخول بأمان عبر حسابك في جوجل من هنا](${loginUrl})**! 🚀 مجرد ضغطة واحدة وتصبح الميزات مجانية للأبد وتسري لك حصتك الشخصية الكاملة!`;
                
                // Show message as Solvica
                setMessages(prev => [...prev, { role: 'assistant', content: errorText }]);
                e.target.value = ''; // Reset file input
                return; 
            }

            // ✅ FileReader → Base64 (no external libraries)
            const reader = new FileReader();
            reader.onload = (ev) => setSelectedImage(ev.target?.result as string);
            reader.readAsDataURL(file); // Result: "data:image/jpeg;base64,/9j/..."
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setAttachedFileText(ev.target?.result as string);
                setAttachedFileName(file.name);
            };
            reader.readAsText(file);
        }
    };


    const sendMessage = async () => {
        if (!input.trim() && !selectedImage) return;

        const userText = input;
        const userImage = selectedImage;
        const currentAttachedText = attachedFileText;
        const currentAttachedName = attachedFileName;

        const userMsg: AIChatMessage = { 
            role: 'user', 
            content: userText, 
            image: userImage || undefined,
            attachmentName: currentAttachedName || undefined
        };

        const newMessages: AIChatMessage[] = [...messages, userMsg];

        setMessages(newMessages);
        setInput('');
        setSelectedImage(null);
        setAttachedFileText(null);
        setAttachedFileName(null);
        setIsTyping(true);

        try {

            // 📚 RAG Context Gathering (NotebookLM-Level Accuracy using Smart Keyword Extraction)
            let contextText = "";
            let allAvailableChunks: string[] = [];
            
            if (selectedContextDocId) {
                if (selectedContextDocId.startsWith("subject:")) {
                    const subject = selectedContextDocId.replace("subject:", "");
                    const docs = savedDocs.filter(d => d.subjectName === subject);
                    allAvailableChunks = docs.flatMap(d => d.chunks).map(c => c.text || c);
                } else {
                    const doc = savedDocs.find(d => d.id === selectedContextDocId);
                    if (doc) allAvailableChunks = doc.chunks.map((c: any) => c.text || c);
                }
            } else if (!userImage && userText.length > 5) {
                // Auto-RAG for general queries
                allAvailableChunks = savedDocs.flatMap(d => d.chunks).map(c => c.text || c);
            }

            // 🎯 SUPER-FAST RAG FILTER (Top 12 Most Relevant Chunks + Surrounding Context)
            if (allAvailableChunks.length > 0) {
                // 1. Tokenize query into powerful keywords (ignore common Arabic stop words)
                const stopWords = ['هل', 'كيف', 'ما', 'متى', 'أين', 'لماذا', 'من', 'في', 'على', 'إلى', 'عن', 'هو', 'هي', 'التي', 'الذي', 'و', 'أو', 'ثم', 'مع', 'هذا', 'هذه', 'ذلك', 'كان', 'يكون', 'أن', 'إن', 'لا', 'لم', 'لن'];
                const rawWords = userText.replace(/[؟.,؛:]/g, ' ').split(/\s+/);
                const queryKeywords = Array.from(new Set(rawWords.map(w => w.trim().replace(/^ال/, '')).filter(w => w.length > 2 && !stopWords.includes(w))));
                
                if (queryKeywords.length > 0) {
                    // 2. Score chunks based on keyword density
                    const scoredChunks = allAvailableChunks.map((chunk, index) => {
                        let score = 0;
                        const lowerChunk = chunk.toLowerCase();
                        for (const kw of queryKeywords) {
                            if (lowerChunk.includes(kw.toLowerCase())) score += 10;
                            // Exact sequence match bonus
                            if (lowerChunk.includes(' ' + kw.toLowerCase() + ' ')) score += 5;
                        }
                        return { chunk, index, score };
                    });

                    // 3. Keep chunks that have a score, sort them, take top 12
                    const topMatches = scoredChunks.filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, 12);

                    if (topMatches.length > 0) {
                        // 4. Sort chronologically to preserve document flow
                        topMatches.sort((a, b) => a.index - b.index);
                        contextText = topMatches.map(m => m.chunk).join('\n---\n');
                    } else {
                        // Fallback: send the first few chunks if no keywords match cleanly
                        contextText = allAvailableChunks.slice(0, 10).join('\n---\n');
                    }
                } else {
                    // Very short query, just send start of doc
                    contextText = allAvailableChunks.slice(0, 5).join('\n---\n');
                }
            }

            if (currentAttachedText) {
                contextText = `[مستند إضافي مرفق: ${currentAttachedName}]\n${currentAttachedText}\n\n${contextText}`;
            }

            let webSearchContext = "";
            if (!selectedContextDocId && !userImage) {
                try {
                    const TAVILY_API_KEY = "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";
                    const webRes = await fetch("https://api.tavily.com/search", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ api_key: TAVILY_API_KEY, query: userText.substring(0, 150), search_depth: "basic", max_results: 3 })
                    });
                    if (webRes.ok) {
                        const data = await webRes.json();
                        webSearchContext = data.results.map((r: any) => `[موقع: ${r.title}] (${r.url})\n${r.content}`).join('\\n\\n');
                    }
                } catch (e) { console.error("Web Search Error", e); }
            }

            const systemInstruction = `أنت بخبرة بروفيسور جامعي ومحرك ذكاء اصطناعي بحثي أكاديمي (Solvica V13). وظيفتك الإجابة على استفسارات الطالب بأسلوب ذكي، سريع، والمساعدة في دراسة المجلدات والملفات المرفقة إن وجدت بدقة 100%. 

--- قوانين المحادثة والحل (دقة 100% - استجابة سريعة جداً) ---
1. الأسئلة التفاعلية والترحيب: أجب برد إنساني طبيعي وقصير جداً ولا تسترسل.
2. صانعك ومطورك: أجب فوراً وبفخر: "مُطوّري وصانعي هو الخبير مصطفى! 👑✨"
3. الإجابات المختصرة: اجعل إجاباتك الأكاديمية واضحة ومباشرة وموجزة دائماً.
4. حالة "المجلد المحدد": ركز حصراً وبدقة 100% على محتوى المجلد لاستخراج الإجابة. إذا لم تجد الإجابة بشكل واضح المجلد، يجب عليك استخدام ذكاءك الفائق لحل السؤال واكتب صراحة: (الإجابة من معرفتي العامة لعدم ذكرها في المرفقات)، ولا تعتذر أبداً.
5. الروابط الحقيقية فقط: يُمنع اختراع الروابط والمواقع ومصادر غير دقيقة.
6. الثقة التامة والحتمية: اكتب بكل دقة ولا يرف لك جفن.
7. التنسيق: Markdown مع تنسيق أكاديمي ممتاز.`;

            let finalSysPrompt = systemInstruction;
            if (contextText) finalSysPrompt += '\n\n### 📚 نصوص المجلد والمراجع (ادرسها وحللها بدقة 100% قبل الإجابة):\n' + contextText;
            if (webSearchContext) finalSysPrompt += '\n\n### 🌍 نتائج بحث الويب الحية (استخرج منها الروابط والمعلومات الأكيدة ولا تخترع روابط غير موجودة هنا):\n' + webSearchContext;

            const chatHistory: AIChatMessage[] = newMessages.map(m => ({
                role: (m.role === 'user' ? 'user' : 'model') as Exclude<AIChatMessage['role'], 'assistant' | 'system'>,
                content: m.content,
                image: m.image
            }));

            let finalAIText = "";
            await aiClient.streamChat([
                { role: 'system', content: finalSysPrompt },
                ...chatHistory
            ], {
                onChunk: (chunk) => {
                    finalAIText += chunk;
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'assistant') {
                            return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
                        }
                        const newAssistantMsg: AIChatMessage = { role: 'assistant', content: chunk };
                        return [...prev, newAssistantMsg];
                    });
                },
                onComplete: (fullText) => {
                    finalAIText = fullText || finalAIText;
                }
            });

            // Save session with complete AI response
            const finalAssistantMsg: AIChatMessage = { role: 'assistant', content: finalAIText };
            
            const sessionMessages = finalAIText.trim() ? [...newMessages, finalAssistantMsg] : [...newMessages];
            const session: ChatSession = {
                id: sessionId,
                title: userText.substring(0, 30) || "محادثة جديدة",
                messages: sessionMessages,
                updatedAt: Date.now()
            };
            await db.saveChatSession(session);
            
            const updatedHistory = await db.getAllChatSessions();
            setChatHistoryList(updatedHistory);
            localStorage.setItem('solvica_last_session', sessionId);

        } catch (error: any) {
            console.error(error);
            let errorText = "آسف، يبدو أن هناك خطأ في الاتصال، لكنني عدت للعمل للتو! يرجى إعادة المحاولة.";
            if (error?.message === "POLLINATIONS_LOGIN_REQUIRED") {
                const redirectUrl = encodeURIComponent(window.location.href);
                const loginUrl = `https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}&permissions=profile,balance,usage,offline_access&app_key=pk_kn9KoGgYC7i5Sk6P&expiry=never`;
                errorText = `⚠️ عذراً يا صديقي، خوادم تحليل الصور تواجه ضغطاً عالياً ولم أتمكن من قراءة صورتك.\n\n💡 لكي أتمكن من قراءة وفهم الصور والملفات مجاناً بدون انقطاع وبلا حدود تقريباً، يرجى التكرم **[بالضغط هنا لتفعيل حسابك المجاني بأمان عبر جوجل](${loginUrl})**! 🚀 مجرد ضغطة واحدة وتصبح خدمتك للرؤية مجانية للأبد!`;
            }

            const errorMsg: AIChatMessage = { 
                role: 'assistant', 
                content: errorText 
            };
            setMessages(prev => {
                const cleanPrev = prev.filter(m => m.role === 'user' || m.content?.trim());
                return [...cleanPrev, errorMsg];
            });
        } finally {
            setIsTyping(false);
        }
    };

    async function loadSession(id: string) {
        const session = await db.getChatSession(id);
        if (session) {
            setMessages(session.messages);
            setSessionId(id);
            localStorage.setItem('solvica_last_session', id);
        }
    };

    const deleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await db.deleteChatSession(id);
        const updated = await db.getAllChatSessions();
        setChatHistoryList(updated);
        if (sessionId === id) {
            setMessages([]);
            setSessionId(`session_${Date.now()}`);
            localStorage.removeItem('solvica_last_session');
        }
    };

    const handleExport = async () => {
        // Build clean HTML from messages instead of capturing messy DOM
        const chatHtml = messages
            .filter(m => m.role !== 'system')
            .map(m => {
                const isUser = m.role === 'user';
                const label = isUser ? '🧑‍🎓 أنت' : '🤖 Solvica AI';
                const bgColor = isUser ? '#e0f2fe' : '#f0fdf4';
                const borderColor = isUser ? '#38bdf8' : '#22c55e';
                // Convert markdown bold/italic to HTML
                let content = (m.content as string)
                    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.+?)\*/g, '<em>$1</em>')
                    .replace(/`(.+?)`/g, '<code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-family:monospace;font-size:13px;">$1</code>')
                    .replace(/\n/g, '<br/>');
                return `
                    <div style="background:${bgColor};border-right:4px solid ${borderColor};border-radius:12px;padding:16px 20px;margin-bottom:16px;direction:rtl;text-align:right;page-break-inside:avoid;">
                        <div style="font-weight:900;font-size:13px;color:${isUser ? '#0369a1' : '#15803d'};margin-bottom:8px;">${label}</div>
                        <div style="font-size:15px;line-height:1.9;color:#1f2937;word-break:break-word;">${content}</div>
                    </div>
                `;
            }).join('');

        // Create a temporary clean container
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = chatHtml;
        tempDiv.style.cssText = 'position:absolute;top:0;left:0;width:210mm;z-index:-9999;pointer-events:none;background:white;padding:20px;direction:rtl;font-family:Tajawal,sans-serif;';
        document.body.appendChild(tempDiv);

        try {
            const tempRef = { current: tempDiv } as React.RefObject<HTMLDivElement>;
            await exportToPDF(tempRef, `محادثة_سولفيكا_${Date.now()}`);
        } finally {
            if (tempDiv.parentNode) tempDiv.parentNode.removeChild(tempDiv);
        }
    };

    const startSpeechRecognition = () => {
        if (!('webkitSpeechRecognition' in window)) {
            alert("عذراً، متصفحك لا يدعم خاصية تحويل الصوت إلى نص.");
            return;
        }

        // @ts-ignore
        const recognition = new window.webkitSpeechRecognition();
        recognition.lang = 'ar-SA';
        recognition.continuous = false;
        recognition.interimResults = false;

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = () => setIsListening(false);
        
        recognition.onresult = (event: any) => {
            const transcript = event.results[0][0].transcript;
            setInput(prev => (prev ? prev + " " + transcript : transcript));
        };

        recognition.start();
    };

    const startNewChat = () => {
        setMessages([]);
        setSessionId(`session_${Date.now()}`);
        setIsSidebarOpen(false);
        setAttachedFileText(null);
        setAttachedFileName(null);
        setSelectedImage(null);
        setGreeting();
    };



    return (
        <AppLayout fullWidth={true}>
            <div className="flex h-[calc(100vh-45px)] overflow-hidden p-2 md:p-2 gap-4" dir="rtl">
                
                {/* Right Pane: History Sidebar Desktop & Mobile */}
                {/* Desktop: normal flex column. Mobile: fixed overlay drawer */}
                <div className="hidden lg:flex lg:flex-col w-[260px] max-w-[20%] h-full shrink-0 bg-[var(--bg-background)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm" dir="rtl">
                    <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)]">
                        <h2 className="text-sm md:text-base font-black text-[var(--text-main)] pr-1">محادثاتك</h2>
                        <button
                            onClick={startNewChat}
                            className="bg-[#2ba396] hover:bg-[#238b7f] text-white p-1.5 rounded-lg transition-all shadow-md active:scale-95 flex items-center justify-center shrink-0"
                            title="محادثة جديدة"
                        >
                            <Zap className="w-3.5 h-3.5" />
                        </button>
                    </div>
                        
                    <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                        {chatHistoryList.length === 0 && (
                            <div className="text-center py-10">
                                <MessageSquare className="w-8 h-8 text-[var(--text-muted)] opacity-20 mx-auto mb-2" />
                                <p className="text-xs text-[var(--text-muted)] px-4">ابدأ أول محادثة ذكية الآن لتظهر هنا</p>
                            </div>
                        )}
                        {chatHistoryList.map(session => (
                            <div 
                                key={session.id} 
                                onClick={() => { loadSession(session.id); setIsSidebarOpen(false); }}
                                className={`p-3 rounded-xl cursor-pointer transition-all border group flex justify-between items-center ${session.id === sessionId ? 'bg-[#2ba396]/10 border-[#2ba396] shadow-sm' : 'bg-[var(--bg-surface)] border-transparent hover:border-[var(--border-color)]'}`}
                            >
                                <span className={`truncate text-xs font-bold ${session.id === sessionId ? 'text-[#2ba396]' : 'text-[var(--text-main)]'}`}>
                                    {session.title}
                                </span>
                                <button
                                    onClick={(e) => deleteSession(session.id, e)}
                                    className="text-red-500 hover:text-white transition-opacity p-2 bg-red-500/10 hover:bg-red-500 rounded-lg shrink-0 flex items-center justify-center opacity-100 always-visible"
                                    title="حذف المحادثة"
                                >
                                    <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Mobile Overlay Drawer — rendered via Portal on document.body */}
                {isSidebarOpen && ReactDOM.createPortal(
                    <div
                        dir="rtl"
                        style={{position:'fixed', top:0, left:0, right:0, bottom:0, zIndex:99999}}
                    >
                        {/* Backdrop */}
                        <div
                            onClick={() => setIsSidebarOpen(false)}
                            style={{position:'absolute', inset:0, background:'rgba(0,0,0,0.8)'}}
                        />
                        {/* Drawer Panel */}
                        <div style={{position:'absolute', right:0, top:0, bottom:0, width:'80%', maxWidth:'320px', background:'var(--bg-background)', display:'flex', flexDirection:'column', overflow:'hidden', boxShadow:'-8px 0 40px rgba(0,0,0,0.6)'}}>
                            {/* Drawer Header */}
                            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px', borderBottom:'3px solid #2ba396', background:'var(--bg-surface)', minHeight:'72px', flexShrink:0}}>
                                <h2 style={{fontSize:'18px', fontWeight:'900', color:'var(--text-main)', margin:0}}>💬 محادثاتك</h2>
                                <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                                    <button
                                        onClick={() => { startNewChat(); setIsSidebarOpen(false); }}
                                        style={{display:'flex', alignItems:'center', gap:'6px', background:'#2ba396', color:'white', padding:'10px 14px', borderRadius:'14px', fontSize:'13px', fontWeight:'900', border:'none', cursor:'pointer', boxShadow:'0 4px 20px rgba(43,163,150,0.5)'}}
                                    >
                                        <Zap style={{width:'16px', height:'16px'}} /> جديدة
                                    </button>
                                    <button
                                        onClick={() => setIsSidebarOpen(false)}
                                        className="flex items-center justify-center bg-red-500 text-white w-10 h-10 rounded-xl shrink-0 shadow-[0_4px_20px_rgba(239,68,68,0.3)] hover:bg-red-600 transition-colors cursor-pointer border-0"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            </div>
                            {/* Drawer History List */}
                            <div style={{flex:1, overflowY:'auto', padding:'12px', display:'flex', flexDirection:'column', gap:'8px'}}>
                                {chatHistoryList.length === 0 && (
                                    <div style={{textAlign:'center', padding:'40px 16px'}}>
                                        <MessageSquare style={{width:'32px', height:'32px', opacity:0.2, margin:'0 auto 8px', color:'var(--text-muted)'}} />
                                        <p style={{fontSize:'12px', color:'var(--text-muted)'}}>ابدأ أول محادثة ذكية الآن لتظهر هنا</p>
                                    </div>
                                )}
                                {chatHistoryList.map(session => (
                                        <div
                                            key={session.id}
                                            onClick={() => { loadSession(session.id); setIsSidebarOpen(false); }}
                                            className={`p-3 rounded-xl cursor-pointer border flex justify-between items-center ${session.id === sessionId ? 'border-[#2ba396] bg-[#2ba396]/10' : 'border-transparent bg-[var(--bg-surface)] hover:border-[#2ba396]/20'}`}
                                        >
                                            <span className={`text-sm font-bold truncate flex-1 ${session.id === sessionId ? 'text-[#2ba396]' : 'text-[var(--text-main)]'}`}>
                                                {session.title}
                                            </span>
                                            <button
                                                onClick={(e) => deleteSession(session.id, e)}
                                                className="text-red-500 shrink-0 p-2 sm:p-1.5 ml-2 bg-red-500/10 hover:bg-red-500 hover:text-white rounded-lg flex items-center justify-center opacity-100 always-visible transition-colors"
                                            >
                                                <Trash2 className="w-5 h-5 sm:w-4 sm:h-4" />
                                            </button>
                                        </div>
                                ))}
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Main Content */}
                <div className="flex-1 flex flex-col bg-[var(--bg-background)] rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden relative">

                    {/* Header */}
                    <div className="p-3 md:p-4 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-surface)] backdrop-blur-md z-40 shrink-0 relative">
                        <div className="flex items-center gap-2 sm:gap-3 relative z-10 w-fit shrink-0">
                            <button
                                onClick={() => setIsSidebarOpen(true)}
                                className="lg:hidden p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-[var(--bg-background)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[#2ba396] active:bg-[var(--hover-bg)] transition-all shadow-sm active:scale-90"
                                title="سجل المحادثات"
                            >
                                <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5 transition-transform" />
                            </button>
                            <div className="flex flex-col">
                                <h1 className="font-display font-black tracking-widest text-lg sm:text-xl md:text-2xl lg:text-4xl m-0 leading-none bg-gradient-to-r from-[#00d2ff] via-[#8e2de2] to-[#f000ff] text-transparent bg-clip-text uppercase">Solvica</h1>
                                <span className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm text-[var(--text-muted)] font-bold flex items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1">
                                    <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 rounded-full bg-[#2ba396] shadow-[0_0_8px_#2ba396]" /> 
                                    المحرك التعليمي
                                </span>
                            </div>
                        </div>

                        <div className="flex items-center gap-1.5 sm:gap-2 overflow-hidden justify-end">
                            <div className="relative w-28 sm:w-32 md:w-48">
                                <select
                                    className="w-full bg-[#2ba396]/10 text-[#2ba396] text-[10px] sm:text-xs md:text-sm lg:text-base font-bold rounded-lg sm:rounded-xl px-2 sm:px-3 md:px-5 py-2 sm:py-2.5 border border-[#2ba396]/20 shadow-sm appearance-none cursor-pointer pr-6 sm:pr-8 md:pr-12 pl-1 outline-none hover:bg-[#2ba396]/20 transition-colors truncate"
                                    value={selectedContextDocId}
                                    onChange={(e) => setSelectedContextDocId(e.target.value)}
                                >
                                    <option value="">🔍 بحث ذكي</option>
                                    {Array.from(new Set(savedDocs.map(d => d.subjectName).filter(Boolean))).map(subj => (
                                        <option key={`subj-${subj}`} value={`subject:${subj}`}>📂 {subj}</option>
                                    ))}
                                    {savedDocs
                                        .filter(d => !d.filename?.startsWith("_solvica_folder_") && !d.title?.startsWith("_solvica_folder_"))
                                        .map(d => (
                                            <option key={d.id} value={d.id}>📖 {d.title || d.filename}</option>
                                        ))}
                                </select>
                                <BookOpen className="w-5 h-5 text-[#2ba396] absolute right-2 md:right-3 top-1/2 transform -translate-y-1/2 pointer-events-none" />
                            </div>
                            <button
                                onClick={messages.length > 1 ? handleExport : undefined}
                                className={`shrink-0 flex items-center gap-1 bg-[var(--bg-background)] border border-[var(--border-color)] p-2 sm:px-3 sm:py-2 rounded-lg sm:rounded-xl transition-all shadow-sm text-[10px] sm:text-xs font-bold ${messages.length > 1 ? 'hover:border-[#2ba396] text-[var(--text-muted)] hover:text-[#2ba396] cursor-pointer' : 'opacity-40 cursor-not-allowed text-[var(--text-muted)]'}`}
                                title={messages.length > 1 ? "تصدير المحادثة PDF" : "أرسل رسالة أولاً"}
                            >
                                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                                <span className="hidden sm:inline">تصدير PDF</span>
                            </button>
                        </div>
                    </div>

                    {/* Chat Messages */}
                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-8 custom-scrollbar bg-[var(--bg-background)]">
                        {messages.filter(msg => msg.role === 'user' || (msg.content && msg.content.trim()) || msg.image || msg.attachmentName).map((msg, idx) => (
                            <div key={idx} className={`flex gap-3 sm:gap-4 items-end max-w-[82%] sm:max-w-[75%] ${msg.role === 'user' ? 'mr-auto flex-row-reverse mb-6' : 'ml-auto'}`}
                                style={{animation: 'fadeInSlide 0.3s ease-out'}}>
                                {msg.role === 'assistant' && (
                                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#2ba396] to-teal-700 flex items-center justify-center shrink-0 mb-1 shadow-md border border-[#238b7f]">
                                        <Brain className="w-5 h-5 text-white" />
                                    </div>
                                )}
                                <div style={{ maxWidth: '78%' }}>
                                    {msg.role === 'user' ? (
                                        /* ─── Beautiful User Message Box ─── */
                                        <div style={{
                                            background: 'linear-gradient(135deg, #2ba396 0%, #1a7a70 60%, #8e2de2 100%)',
                                            borderRadius: '20px 20px 4px 20px',
                                            padding: '12px 18px',
                                            boxShadow: '0 4px 20px rgba(43,163,150,0.35)',
                                            color: 'white',
                                            fontWeight: '700',
                                            fontSize: '14px',
                                            lineHeight: '1.7',
                                            direction: 'rtl',
                                            textAlign: 'right',
                                            position: 'relative',
                                        }}>
                                            {msg.attachmentName && (
                                                <div style={{display:'flex', alignItems:'center', gap:'8px', background:'rgba(255,255,255,0.15)', borderRadius:'10px', padding:'8px 12px', marginBottom:'10px'}}>
                                                    <FileText style={{width:'16px', height:'16px', color:'white', flexShrink:0}} />
                                                    <span style={{fontSize:'12px', fontWeight:'700', opacity:0.9, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{msg.attachmentName}</span>
                                                </div>
                                            )}
                                            {msg.image && <img src={msg.image} alt="Upload" style={{maxWidth:'100%', maxHeight:'200px', borderRadius:'12px', marginBottom:'8px', border:'2px solid rgba(255,255,255,0.3)'}} />}
                                            <span>{msg.content}</span>
                                        </div>
                                    ) : (
                                        /* ─── Assistant Message Box ─── */
                                        <div className="relative group" style={{
                                            background: 'var(--bg-surface)',
                                            border: '1px solid var(--border-color)',
                                            borderRadius: '20px 20px 20px 4px',
                                            padding: '12px 16px',
                                            fontSize: '14px',
                                            lineHeight: '1.7',
                                            direction: 'rtl',
                                            textAlign: 'right',
                                        }}>
                                            <div className="absolute top-3 left-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all z-20">
                                                <button
                                                    onClick={() => navigator.clipboard.writeText(msg.content)}
                                                    className="p-2 bg-[var(--bg-background)] hover:bg-[#2ba396]/10 rounded-xl border border-[var(--border-color)] shadow-sm"
                                                    title="نسخ الإجابة"
                                                >
                                                    <Copy className="w-4 h-4 text-[#2ba396]" />
                                                </button>
                                            </div>
                                            {msg.attachmentName && (
                                                <div className="flex flex-wrap items-center gap-3 rounded-xl p-3 shadow-sm mb-3 w-fit pr-4 bg-[var(--bg-surface)] border border-[var(--border-color)]">
                                                    <FileText className="w-5 h-5 text-red-500" />
                                                    <div className="flex flex-col text-right truncate text-[var(--text-main)]">
                                                        <span className="font-bold text-sm truncate max-w-[200px]" dir="ltr">{msg.attachmentName}</span>
                                                        <span className="text-xs opacity-70">مستند ملحق</span>
                                                    </div>
                                                </div>
                                            )}
                                            {msg.image && <img src={msg.image} alt="Upload" className="max-w-xs h-auto rounded-xl border border-[var(--border-color)] mb-3 shadow-md" />}
                                            <div className="html-content text-[var(--text-main)] pb-2 text-[14px] leading-[1.7] break-words prose-a:text-blue-500 prose-a:underline hover:prose-a:text-blue-600">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm, remarkMath]}
                                                    rehypePlugins={[[rehypeKatex, { strict: false }]]}
                                                    components={{
                                                        a: ({node, href, ...props}: any) => {
                                                            const isAuthLink = href?.includes('pollinations.ai/authorize');
                                                            return <a 
                                                                href={href} 
                                                                {...props} 
                                                                target={isAuthLink ? "_self" : "_blank"} 
                                                                rel="noopener noreferrer" 
                                                                className="text-blue-500 underline hover:text-blue-700 font-bold" 
                                                            />;
                                                        },
                                                        code({node, inline, className, children, ...props}: any) {
                                                            const match = /language-(\w+)/.exec(className || '')
                                                            return !inline && match ? (
                                                                <SyntaxHighlighter
                                                                    // @ts-ignore
                                                                    style={vscDarkPlus}
                                                                    language={match[1]}
                                                                    PreTag="div"
                                                                    {...props}
                                                                >
                                                                    {String(children).replace(/\n$/, '')}
                                                                </SyntaxHighlighter>
                                                            ) : (
                                                                <code className={className} {...props}>
                                                                    {children}
                                                                </code>
                                                            )
                                                        }
                                                    }}
                                                >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isTyping && messages[messages.length - 1]?.role === 'user' && (
                            <div className="flex gap-3 sm:gap-4 items-end max-w-[85%] sm:max-w-[75%] ml-auto w-fit">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2ba396] to-teal-700 flex items-center justify-center shrink-0 mb-1 shadow-md border border-[#238b7f]">
                                    <Brain className="w-6 h-6 text-white animate-pulse" />
                                </div>
                                <div className="p-4 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-bl-sm flex gap-3 items-center">
                                    <span className="text-sm font-bold text-[#2ba396] animate-pulse">يتم استيعاب المراجع والتفكير للإجابة بدقة... 🧠</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-[var(--bg-background)] border-t border-[var(--border-color)]">
                        {selectedImage && (
                            <div className="mb-4 relative inline-block mr-2 md:mr-10 lg:mr-20">
                                <img src={selectedImage} alt="Preview" className="h-24 rounded-xl shadow-md border border-[var(--border-color)]" />
                                <button onClick={() => setSelectedImage(null)} className="absolute -top-3 -right-3 bg-red-500 rounded-full p-1.5 text-white shadow-lg"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        )}
                        {attachedFileName && (
                            <div className="mb-4 relative inline-block mr-2 md:mr-10 lg:mr-20 max-w-[100%]">
                                <div className="flex items-center gap-3 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl p-3 shadow-sm min-w-[200px] max-w-full pr-4 relative">
                                    <FileText className="w-5 h-5 text-red-500" />
                                    <div className="flex flex-col text-right truncate text-[var(--text-main)]">
                                        <span className="font-bold text-sm truncate max-w-[200px]" dir="ltr">{attachedFileName}</span>
                                        <span className="text-xs opacity-70">مستند مرفق</span>
                                    </div>
                                    <button onClick={() => { setAttachedFileName(null); setAttachedFileText(null); }} className="absolute -top-3 -right-3 bg-slate-800 rounded-full p-1.5 text-white shadow-lg"><X className="w-4 h-4" /></button>
                                </div>
                            </div>
                        )}
                        <div style={{display:'flex', alignItems:'center', gap:'8px', background:'var(--bg-surface)', borderRadius:'999px', border:'2px solid var(--border-color)', padding:'6px', width:'100%', maxWidth:'98%', margin:'0 auto', boxShadow:'0 4px 20px rgba(0,0,0,0.15)'}}>
                            <label style={{padding:'10px', color:'var(--text-muted)', cursor:'pointer', borderRadius:'50%', flexShrink:0}}>
                                <Paperclip style={{width:'22px', height:'22px'}} />
                                <input type="file" className="hidden" onChange={handleFileUpload} accept="image/*,.txt,.pdf,.md,.docx" />
                            </label>
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                                placeholder="اسأل Solvica أي شيء..."
                                style={{flex:1, background:'transparent', padding:'12px 8px', color:'var(--text-main)', outline:'none', fontSize:'14px', minWidth:0}}
                            />
                            <button
                                onClick={startSpeechRecognition}
                                style={{padding:'10px', borderRadius:'50%', flexShrink:0, color: isListening ? '#ef4444' : 'var(--text-muted)', background: isListening ? 'rgba(239,68,68,0.1)': 'transparent'}}
                            >
                                {isListening ? <StopCircle style={{width:'24px',height:'24px'}} /> : <Mic style={{width:'24px',height:'24px'}} />}
                            </button>
                            <button
                                onClick={sendMessage}
                                disabled={isTyping || (!input.trim() && !selectedImage)}
                                style={{width:'48px', height:'48px', borderRadius:'50%', background:'#2ba396', color:'white', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, opacity: (isTyping || (!input.trim() && !selectedImage)) ? 0.3 : 1, boxShadow:'0 4px 15px rgba(43,163,150,0.4)'}}
                            >
                                <Send style={{width:'22px', height:'22px', transform:'rotate(180deg)'}} />
                            </button>
                        </div>
                        <p className="text-center text-[10px] sm:text-xs text-[var(--text-muted)] mt-3 sm:mt-4 opacity-70 px-2 leading-relaxed">
                            قد يُنتِج موقع Solvica ردودًا غير دقيقة، لذا يُرجى التحقّق من ردودها. والموقع غير مسؤول عن استخدام الذكاء الاصطناعي في الغش الأكاديمي.
                        </p>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
