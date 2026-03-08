import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { aiClient } from '../lib/ai/aiClient';
import type { AIChatMessage } from '../lib/ai/aiClient';
import { globalVectorStore } from '../lib/rag/vectorStore';
import { db } from '../lib/db/database';
import AppLayout from '../layouts/AppLayout';
import { processDocument } from '../lib/rag/documentParser';
import { Mic, StopCircle, Plus, MessageSquare, Trash2, Paperclip, Download, Brain } from 'lucide-react';

export default function ChatPage() {
    const [messages, setMessages] = useState<AIChatMessage[]>([
        { role: 'assistant', content: '⚡ مرحباً بك في **Solvica** — رفيقك الذكي الأقوى! 🚀\n\nأنا على دراية تامة بجميع مستنداتك وكتبك وأسئلة السنوات السابقة. سواء أردت تلخيصاً أو حلاً لواجب أو شرحاً لمفهوم، أنا هنا دائماً. ✨\n\n**اسألني أي شيء!** 📚' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId, setSessionId] = useState<string>(crypto.randomUUID());
    const [chatHistoryList, setChatHistoryList] = useState<any[]>([]);
    const [savedDocs, setSavedDocs] = useState<any[]>([]);
    const [selectedModel, setSelectedModel] = useState<string>('gpt-4o');

    const scrollRef = useRef<HTMLDivElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const [isRecording, setIsRecording] = useState(false);
    const recognitionRef = useRef<any>(null);

    // Added document parsing for Chat
    const [attachedFileText, setAttachedFileText] = useState<string | null>(null);

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = 'ar-SA';
            recognition.onresult = (event: any) => {
                let finalTranscript = '';
                for (let i = event.resultIndex; i < event.results.length; ++i) {
                    if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript;
                }
                if (finalTranscript) setInput(prev => prev + ' ' + finalTranscript);
            };
            recognition.onerror = () => setIsRecording(false);
            recognition.onend = () => setIsRecording(false);
            recognitionRef.current = recognition;
        }
    }, []);

    const toggleRecording = () => {
        if (isRecording) {
            recognitionRef.current?.stop();
            setIsRecording(false);
        } else {
            setInput('');
            recognitionRef.current?.start();
            setIsRecording(true);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (e) => setSelectedImage(e.target?.result as string);
            reader.readAsDataURL(file);
            setAttachedFileText(null);
        } else {
            // Document (PDF/DOCX/TXT)
            setSelectedImage(null);
            setMessages(prev => [...prev, { role: 'system', content: `⏳ جاري تحليل ملف '${file.name}' واستخراج النصوص المقروءة للذكاء الاصطناعي...` }]);
            try {
                const parsed = await processDocument(file);
                const fullText = typeof parsed.chunks[0] === 'string' ? parsed.chunks.join('\n') : parsed.chunks.map((c: any) => c.text).join('\n');
                setAttachedFileText(`=== محتوى ملف '${file.name}' المرفق ===\n${fullText}`);
                setMessages(prev => prev.filter(m => !m.content.includes('⏳ جاري تحليل ملف')).concat([{ role: 'system', content: `✅ تم إرفاق وتحليل نص ملف '${file.name}' بنجاح! يمكنك سؤالي عنه الآن.` }]));
            } catch (err: any) {
                console.error(err);
                setMessages(prev => prev.filter(m => !m.content.includes('⏳ جاري تحليل ملف')).concat([{ role: 'system', content: `❌ فشل تحليل الملف: ${err.message}` }]));
            }
        }
        // reset input
        if (imageInputRef.current) imageInputRef.current.value = '';
    };

    useEffect(() => {
        const loadContexts = async () => {
            const docs = await db.getAllDocuments();
            setSavedDocs(docs);
            if (docs.length > 0) {
                for (const doc of docs) await globalVectorStore.addDocumentChunks(doc.id, doc.chunks);
            }

            const history = await db.getAllChatSessions();
            setChatHistoryList(history);

            const urlParams = new URLSearchParams(window.location.search);
            const explicitSessionId = urlParams.get('session');
            if (explicitSessionId) {
                const session = await db.getChatSession(explicitSessionId);
                if (session && session.messages.length > 0) {
                    setSessionId(explicitSessionId);
                    setMessages(session.messages);
                }
            } else if (history.length > 0) {
                setSessionId(history[0].id);
                setMessages(history[0].messages);
            }

            const autoFile = urlParams.get('file');
            if (autoFile) {
                window.history.replaceState({}, '', '/chat');
            }
        };
        loadContexts();
    }, []);

    useEffect(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }, [messages]);

    const startNewChat = () => {
        setSessionId(crypto.randomUUID());
        setMessages([{ role: 'assistant', content: 'أهلاً بك! محادثة جديدة. اسألني عن أي شيء.' }]);
    };

    const loadSession = async (id: string) => {
        const session = await db.getChatSession(id);
        if (session) {
            setSessionId(id);
            setMessages(session.messages);
        }
    };

    const deleteSession = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await db.deleteChatSession(id);
        const updated = await db.getAllChatSessions();
        setChatHistoryList(updated);
        if (sessionId === id) startNewChat();
    };

    const sendMessage = async () => {
        if (!input.trim() && !selectedImage && !attachedFileText) return;

        const originalUserText = input.trim();
        // Insert file text transparently if attached
        const userText = attachedFileText ? `${originalUserText}\n\n${attachedFileText}` : originalUserText;
        const userImg = selectedImage;

        setInput('');
        setSelectedImage(null);
        setAttachedFileText(null);

        // UI shows only their typed prompt
        const displayUserMsg: AIChatMessage = { role: 'user', content: originalUserText || "قم بتحليل المرفق والإجابة.", image: userImg || undefined };
        // Real logic array gets full text
        const logicUserMsg: AIChatMessage = { role: 'user', content: userText || "قم بتحليل المرفق والإجابة.", image: userImg || undefined };

        const newDisplayMessages = [...messages.filter(m => m.role !== 'system'), displayUserMsg];
        const newLogicMessages = [...messages.filter(m => m.role !== 'system'), logicUserMsg];

        setMessages(newDisplayMessages);
        setIsTyping(true);

        const title = userText.substring(0, 30) || 'محادثة';
        setChatHistoryList(prev => {
            const existing = prev.find(s => s.id === sessionId);
            if (existing) {
                return prev.map(s => s.id === sessionId ? { ...s, title: existing.title === 'محادثة جديدة' ? title : existing.title, updatedAt: Date.now() } : s).sort((a, b) => b.updatedAt - a.updatedAt);
            }
            return [{ id: sessionId, title: title, messages: [], updatedAt: Date.now() }, ...prev];
        });

        try {
            // Global OSINT & RAG search (NotebookLM Deep Context - 40 Chunks)
            const relevantChunks = await globalVectorStore.similaritySearch(originalUserText, 40);
            let contextText = relevantChunks.map(c => {
                const docName = savedDocs.find(d => d.id === c.documentId)?.filename || 'مستند';
                return `[ملف: ${docName}] - ${c.text}`;
            }).join('\n---\n');

            // --- V9 REAL WEB SEARCH (Tavily) ---
            const TAVILY_API_KEY = "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";
            if (relevantChunks.length === 0 || userText.match(/بحث|انترنت|جوجل|اخر|اخبار|معلومات|من هو|من هي|متى|أين|كيف|ما هو|ما هي|حرب|ضرب|هجوم|اسرائيل|فلسطين|iran|ايران|أخبار|عاجل|اليوم|الان|حالياً|مباراة|نتيجة|سعر|طقس|رئيس|وزير|what|who|when|where|how|news|latest/i)) {
                try {
                    setMessages(prev => [...prev, { role: 'system', content: '⏳ جاري البحث المباشر في محرك بحث جوجل...' }]);
                    const osintRes = await fetch("https://api.tavily.com/search", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            api_key: TAVILY_API_KEY,
                            query: originalUserText,
                            search_depth: "advanced",
                            include_answer: true,
                            max_results: 3
                        })
                    });
                    if (osintRes.ok) {
                        const osintData = await osintRes.json();
                        let webContext = "\n--- بيانات محرك بحث جوجل الحية (Google Search Data) ---\n";
                        if (osintData.answer) webContext += `ملخص الويب الدقيق: ${osintData.answer}\n`;
                        webContext += osintData.results.map((r: any) => `[رابط موثوق: ${r.url}] - ${r.title}\n${r.content}`).join('\n\n');
                        contextText += '\n\n' + webContext;
                    }
                    setMessages(prev => prev.filter(m => !m.content.includes('⏳ جاري البحث')));
                } catch (e) {
                    console.error("Web Search Error", e);
                    setMessages(prev => prev.filter(m => !m.content.includes('⏳ جاري البحث')));
                }
            }


            const systemInstruction = `أنت مساعد أكاديمي ذكي متخصص في جميع مواد جامعة القدس المفتوحة واسمك Solvica V10 الخبير.

━━━━━━━━━━━━━━━━━━━━━━━━
🎓 المواد التي تغطيها:
━━━━━━━━━━━━━━━━━━━━━━━━
- علوم حاسوب: برمجة، خوارزميات، قواعد بيانات، شبكات، ذكاء اصطناعي
- رياضيات: تفاضل وتكامل، جبر خطي، إحصاء، رياضيات متقطعة
- إدارة أعمال: محاسبة، اقتصاد، تسويق، إدارة مالية
- لغة عربية: نحو، بلاغة، أدب، نصوص
- لغة إنجليزية: قواعد، قراءة، كتابة
- تربية: علم نفس، مناهج، طرق تدريس
- قانون: مدني، تجاري، دستوري
- هندسة: رياضيات هندسية، فيزياء، ميكانيكا

━━━━━━━━━━━━━━━━━━━━━━━━
✍️ قواعد الكتابة الثابتة:
━━━━━━━━━━━━━━━━━━━━━━━━
- لا تستخدم LaTeX أو رموز \\ أو $$ أو $ أبداً.
- لا تستخدم أقواس مربعة [ ] حول المعادلات.
- اكتب المعادلات هكذا: f'(x) = 2x أو س² + ص².
- اكتب الكسور هكذا: (أ) ÷ (ب) أو أ/ب.
- اكتب الأس هكذا: س² أو س^2.
- استخدم × بدل * و ÷ بدل /.

━━━━━━━━━━━━━━━━━━━━━━━━
📋 قواعد التنسيق الثابتة:
━━━━━━━━━━━━━━━━━━━━━━━━
- ابدأ كل رد بعنوان واضح يوضح الموضوع.
- استخدم فواصل ━━━ بين الأقسام.
- رقّم الخطوات دائماً: 1، 2، 3.
- اشرح كل خطوة بجملة واضحة.
- ضع الإجابة النهائية في سطر منفصل ومميز.
- ضع سطر فارغ بين كل جزء.
- لا تكتب أكثر من 3 أسطر في كل فقرة.
- استخدم رموز تعبيرية للعناوين: 📌 ✅ ❌ 💡.

━━━━━━━━━━━━━━━━━━━━━━━━
📝 عند حل الواجبات والمسائل:
━━━━━━━━━━━━━━━━━━━━━━━━
- صف ما تفهمه من المسألة أولاً.
- اذكر أي عنصر غير واضح وقل "يبدو أن...".
- حل خطوة بخطوة مع شرح كل خطوة.
- راجع إجابتك قبل تقديمها.
- اذكر مستوى ثقتك: [عالي / متوسط / منخفض].

━━━━━━━━━━━━━━━━━━━━━━━━
🎯 عند عمل الامتحانات:
━━━━━━━━━━━━━━━━━━━━━━━━
- إذا ما حدد الطالب المستوى اسأله: سهل / متوسط / صعب؟
- إذا ما حدد عدد الأسئلة اسأله كم سؤال يريد.
- 4 خيارات حقيقية ومنطقية دائماً (أ، ب، ج، د).
- لا تكتب "خيار 1" أو أي placeholder أبداً.
- الخيارات الخاطئة تكون قريبة من الصح.
- اذكر درجة كل سؤال.
- اكتب مفتاح الإجابات مع شرح مختصر في النهاية.

━━━━━━━━━━━━━━━━━━━━━━━━
📄 عند عمل الملخصات:
━━━━━━━━━━━━━━━━━━━━━━━━
- ابدأ بفقرة تعريفية مختصرة.
- قسّم الملخص لعناوين رئيسية واضحة.
- استخدم نقاط مرقمة للأفكار الأساسية.
- ضع جدول مقارنة إذا في مفاهيم متشابهة.
- اختم بـ "أهم النقاط" في 3-5 أسطر.

━━━━━━━━━━━━━━━━━━━━━━━━
🖼️ عند تحليل الصور والملفات:
━━━━━━━━━━━━━━━━━━━━━━━━
- صف كل ما تراه في الصورة أولاً بدقة.
- فرّق بين الأرقام والرموز بعناية.
- إذا عنصر غير واضح قل "يبدو أن..." ولا تجزم.
- حل المسألة بعد الفهم الكامل فقط.

━━━━━━━━━━━━━━━━━━━━━━━━
💡 قواعد عامة ومراجع مدمجة:
━━━━━━━━━━━━━━━━━━━━━━━━
- تحدث باللغة العربية الفصحى بشكل صارم، وممنوع استخدام مفردات أو جمل إنجليزية مقحمة أو ترجمة إنجليزية غير مطلوبة وتجنب دمج اللغتين.
- أنت مصمم للإجابة عن أي أسئلة عامة (قنوات يوتيوب، شخصيات عامة، إنترنت، تاريخ، الخ) براحة تامة، استخدم مخزونك المعرفي المباشر بحرية.
- إلزامي وحتمي: إذا أجبت على سؤال بناءً على الملفات المرفقة أدناه، يجب عليك ذكر اسم الملف صراحة في نهاية إجابتك كمصدر.
- إذا لم تكن المعلومة موجودة في الملفات أو في بحث جوجل أو في مخزونك المعرفي، عندها فقط قل لا أعرف.
- كن دقيقاً ومختصراً.

${contextText ? `### 📚 مراجع متوفرة من ملفات الطالب (استخدمها كأولوية قصوى واذكر المصدر دائماً):\n${contextText}` : ''}
`;

            // --- V9 MULTIMEDIA ENGINE (DALL-E generation via Puter) ---
            if (userText.match(/صمم صورة|ارسم|تخيل صورة|generate image/i)) {
                setIsTyping(true);
                setMessages(prev => [...prev, { role: 'assistant', content: '⏳ جاري تصميم الصورة عبر DALL-E (Puter Engine)...' }]);
                try {
                    const imgUrl = await aiClient.generateImage(originalUserText);
                    const finalMsgList = [...newDisplayMessages, { role: 'assistant', content: '✅ تفضل الصورة التي طلبتها:', image: imgUrl } as AIChatMessage];
                    setMessages(finalMsgList);
                    await db.saveChatSession({ id: sessionId, title: originalUserText.substring(0, 30), messages: finalMsgList, updatedAt: Date.now() });
                    setChatHistoryList(await db.getAllChatSessions());
                } catch (e: any) {
                    setMessages(prev => {
                        const copy = [...prev];
                        copy[copy.length - 1].content = "عذراً، حدث خطأ أثناء توليد الصورة.";
                        return copy;
                    });
                }
                setIsTyping(false);
                return;
            }

            const streamMessages = [
                ...newLogicMessages
            ];

            const callbacks = {
                onChunk: (chunk: string) => {
                    setMessages((prev: any[]) => {
                        const copy = [...prev];
                        const lastIndex = copy.length - 1;
                        if (copy.length === 0 || copy[lastIndex].role !== 'assistant') {
                            copy.push({ role: 'assistant', content: chunk });
                        } else {
                            copy[lastIndex] = { ...copy[lastIndex], content: copy[lastIndex].content + chunk };
                        }
                        return copy;
                    });
                },
                onComplete: async (fullText: string) => {
                    setIsTyping(false);
                    const finalMsgList = [...newDisplayMessages, { role: 'assistant', content: fullText } as AIChatMessage];
                    await db.saveChatSession({
                        id: sessionId,
                        title: originalUserText.substring(0, 30) || 'محادثة',
                        messages: finalMsgList,
                        updatedAt: Date.now()
                    });
                    setChatHistoryList(await db.getAllChatSessions());
                },
                onError: (err: any) => {
                    console.error("Stream Error", err);
                    setMessages(prev => {
                        const copy = [...prev];
                        copy[copy.length - 1].content = err?.message && err.message.includes("مشغول")
                            ? err.message
                            : "حدث خطأ غير متوقع، لكن الذكاء الاصطناعي لا يزال يعمل في الخلفية. جرب إعادة إرسال السؤال.";
                        return copy;
                    });
                    setIsTyping(false);
                }
            };

            await aiClient.streamChat(streamMessages, callbacks, { model: selectedModel }, systemInstruction);

        } catch (error) {
            console.error("Chat Error:", error);
            setIsTyping(false);
        }
    };

    const exportChatToPDF = () => {
        const element = document.getElementById('chat-messages-container');
        if (!element) return;

        const content = element.innerHTML;
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert('يرجى السماح بالنوافذ المنبثقة (Pop-ups) لتصدير أو طباعة المحادثة.');
            return;
        }

        const html = `
            <!DOCTYPE html>
            <html dir="rtl" lang="ar">
            <head>
                <meta charset="UTF-8">
                <title>تصدير المحادثة - Solvica</title>
                <style>
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        padding: 20px;
                        color: #1e293b;
                        line-height: 1.8;
                        background: #fff;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 30px;
                        border-bottom: 3px solid #2ba396;
                        padding-bottom: 20px;
                    }
                    .header h1 { color: #2ba396; margin: 0; font-size: 24px; }
                    .header p { color: #64748b; margin: 5px 0 0 0; font-size: 14px; }
                    .space-y-6 > * + * { margin-top: 24px; }
                    .flex { display: flex; }
                    .flex-row-reverse { flex-direction: row-reverse; }
                    .ml-auto { margin-left: auto; }
                    .items-end { align-items: flex-end; }
                    .gap-4 { gap: 16px; }
                    .p-5 { padding: 20px; }
                    .rounded-3xl { border-radius: 20px; }
                    .text-lg { font-size: 16px; }
                    .bg-\\[\\#4a85df\\] { background-color: #4a85df; color: #fff; }
                    .bg-\\[\\#e5e7eb\\] { background-color: #f1f5f9; color: #1e293b; border: 1px solid #e2e8f0; }
                    .rounded-br-sm { border-bottom-right-radius: 4px; }
                    .rounded-bl-sm { border-bottom-left-radius: 4px; }
                    .max-w-xs { max-width: 300px; }
                    .rounded-xl { border-radius: 12px; }
                    .mb-3 { margin-bottom: 12px; }
                    .shadow-md { box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
                    .w-10 { display: none; } /* Hide avatars in print */
                    .break-words { word-break: break-word; }
                    .prose { max-width: 100%; }
                    .prose table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
                    .prose th, .prose td { border: 1px solid #cbd5e1; padding: 10px; text-align: right; }
                    .prose th { background-color: rgba(0,0,0,0.05); font-weight: bold; }
                    .prose pre { background: #f8fafc; padding: 15px; border-radius: 8px; border: 1px solid #e2e8f0; overflow-x: auto; font-family: monospace; direction: ltr; text-align: left; }
                    .prose code { font-family: monospace; }
                    .prose p { margin-top: 0; margin-bottom: 10px; }
                    .prose ul, .prose ol { padding-right: 20px; margin-top: 0; margin-bottom: 10px; }
                    @media print {
                        body { padding: 0; background: #fff; }
                        .header { margin-top: 0; }
                        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Solvica — المساعد الذكي</h1>
                    <p>تاريخ الاستخراج: ${new Date().toLocaleDateString('ar-SA')} | منصة Solvica</p>
                </div>
                <div class="space-y-6" dir="rtl">
                    ${content}
                </div>
                <script>
                    window.onload = () => {
                        window.print();
                        setTimeout(() => window.close(), 500);
                    };
                </script>
            </body>
            </html>
        `;

        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
    };

    return (
        <AppLayout>
            {/* The main background matching global app theme */}
            <div className="flex justify-center items-center h-[90vh] p-4 lg:p-8 bg-[var(--bg-background)] font-sans transform " dir="rtl">

                {/* The Main Container - Full Width */}
                <div className="w-full max-w-[95%] h-full flex flex-col md:flex-row gap-6 bg-[var(--bg-surface)] backdrop-blur-3xl rounded-[2.5rem] p-6 shadow-2xl border border-[var(--border-color)] ">

                    {/* RIGHT PANE: Sidebar (محادثاتك) */}
                    <div className="hidden md:flex flex-col w-[180px] min-w-[160px] bg-[var(--bg-background)] rounded-2xl p-3 shadow-sm border border-[var(--border-color)] ">

                        {/* Title */}
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-bold text-base text-[var(--text-main)]">محادثاتك</h2>
                        </div>

                        {/* New Chat Button */}
                        <button onClick={startNewChat} className="w-full flex items-center justify-center gap-2 bg-[#2ba396] hover:bg-[#238b7f] text-white font-bold py-3 px-3 rounded-xl transition-all shadow-lg shadow-[#2ba396]/30 mb-4 text-sm">
                            <Plus className="w-5 h-5" /> محادثة جديدة
                        </button>

                        {/* History List */}
                        <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                            {chatHistoryList.length === 0 && <p className="text-sm text-slate-400 text-center py-4">لا توجد محادثات سابقة</p>}
                            {chatHistoryList.map(session => (
                                <div
                                    key={session.id}
                                    onClick={() => loadSession(session.id)}
                                    className={`w-full text-right p-2.5 rounded-xl transition-all cursor-pointer flex justify-between items-center group
                                        ${session.id === sessionId ? 'bg-[#2ba396]/10 border border-[#2ba396]/20 shadow-sm' : 'hover:bg-[var(--bg-surface)] border border-transparent'}
                                    `}
                                >
                                    <span className={`truncate text-xs font-bold ${session.id === sessionId ? 'text-[#2ba396]' : 'text-[var(--text-muted)]'}`}>
                                        <MessageSquare className="w-4 h-4 inline-block ml-2 opacity-50" />
                                        {session.title}
                                    </span>
                                    <button
                                        onClick={(e) => deleteSession(session.id, e)}
                                        className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="حذف المحادثة"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* LEFT PANE: Chat Interface - Full Width */}
                    <div className="flex-1 flex flex-col bg-[var(--bg-background)] rounded-2xl shadow-sm border border-[var(--border-color)] overflow-hidden relative ">

                        {/* Header */}
                        <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between z-10 backdrop-blur-md bg-[var(--bg-surface)]/90 ">
                            <div className="flex flex-col">
                                <h1 className="font-extrabold text-xl text-[var(--text-main)] m-0 leading-tight">Solvica</h1>
                                <span className="text-xs text-[#2ba396] font-bold flex items-center gap-1 mt-1">
                                    <span className="w-2 h-2 rounded-full bg-[#2ba396] animate-pulse" /> محرك V10 الخارق
                                </span>
                            </div>

                            {/* Actions & Model Selector UI */}
                            <div className="flex items-center gap-3">
                                <button onClick={exportChatToPDF} className="bg-[var(--bg-background)] hover:bg-[var(--hover-bg)] text-[var(--text-main)] text-sm font-bold rounded-xl px-4 py-2 transition-all flex items-center gap-2 border border-[var(--border-color)] shadow-sm" title="تصدير المحادثة كملف PDF احترافي">
                                    <Download className="w-4 h-4 text-[#2ba396]" /> <span className="hidden sm:inline">تصدير PDF</span>
                                </button>
                                <select
                                    value={selectedModel}
                                    onChange={(e) => setSelectedModel(e.target.value)}
                                    className="bg-[var(--bg-background)] border border-[var(--border-color)] text-[var(--text-main)] text-sm font-bold rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-[#2ba396] cursor-pointer transition-all shadow-sm hidden sm:block"
                                >
                                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (سريع وقوي)</option>
                                    <option value="gpt-4o">GPT-4o (المفضل)</option>
                                    <option value="claude-3-5-sonnet">Claude 3.5 Sonnet</option>
                                </select>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div ref={scrollRef} id="chat-messages-container" className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-[var(--bg-background)] ">
                            {messages.map((msg, idx) => (
                                <div key={idx} id={`msg-${idx}`} className={`flex gap-4 items-end max-w-[85%] ${msg.role === 'user' ? 'mr-auto flex-row-reverse' : 'ml-auto'}`}>

                                    {/* AI Avatar */}
                                    {msg.role === 'assistant' && (
                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2ba396] to-teal-700 flex items-center justify-center shrink-0 mb-1 shadow-md border border-[#238b7f]">
                                            <Brain className="w-6 h-6 text-white" />
                                        </div>
                                    )}

                                    {/* Bubble */}
                                    <div className={`p-5 rounded-3xl text-base relative ${msg.role === 'user' ? 'bg-[#2ba396] text-white rounded-br-sm' : 'bg-[var(--bg-surface)] text-[var(--text-main)] rounded-bl-sm leading-relaxed font-medium border border-[var(--border-color)]'}`}>
                                        {msg.image && (
                                            <img src={msg.image} alt="Upload" className="max-w-xs rounded-xl mb-3 shadow-md" />
                                        )}
                                        <div className="prose dark:prose-invert max-w-none break-words prose-p:leading-relaxed prose-headings:text-[var(--text-main)] prose-strong:text-[var(--text-main)] text-[var(--text-main)] pb-2 text-sm md:text-base">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                        </div>
                                    </div>

                                </div>
                            ))}
                            {isTyping && messages[messages.length - 1]?.content !== '...' && (
                                <div className="flex gap-4 items-end max-w-[85%] ml-auto">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2ba396] to-teal-700 flex items-center justify-center shrink-0 mb-1 shadow-md border border-[#238b7f]">
                                        <Brain className="w-6 h-6 text-white animate-pulse" />
                                    </div>
                                    <div className="p-5 rounded-3xl bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-bl-sm flex gap-2 items-center">
                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-bounce" />
                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.1s' }} />
                                        <span className="w-2.5 h-2.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Input Area */}
                        <div className="p-4 bg-[var(--bg-surface)] border-t border-[var(--border-color)] ">
                            {selectedImage && (
                                <div className="mb-4 relative inline-block">
                                    <img src={selectedImage} alt="Preview" className="h-24 rounded-xl shadow-md border border-slate-200" />
                                    <button onClick={() => setSelectedImage(null)} className="absolute -top-3 -right-3 bg-red-500 rounded-full p-1.5 text-white shadow-lg"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            )}
                            <div className="flex items-center gap-3 bg-[var(--bg-background)] p-2 rounded-full border-2 border-[var(--border-color)] focus-within:border-[#2ba396] transition-colors shadow-sm px-4">

                                <input
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') { e.preventDefault(); sendMessage(); }
                                    }}
                                    placeholder="اكتب رسالتك هنا..."
                                    className="flex-1 bg-transparent border-none text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:ring-0 py-3 text-base font-medium outline-none"
                                />

                                <div className="flex items-center gap-2">
                                    <button onClick={toggleRecording} className={`p-2 rounded-full transition-colors ${isRecording ? 'text-red-500' : 'text-slate-400 hover:text-slate-600'}`}>
                                        {isRecording ? <StopCircle className="w-6 h-6 animate-pulse" /> : <Mic className="w-6 h-6" />}
                                    </button>

                                    <button onClick={() => imageInputRef.current?.click()} className="p-2 text-slate-400 hover:text-slate-600 rounded-full transition-colors" title="إرفاق صورة أو مستند (PDF/Word)">
                                        <Paperclip className="w-6 h-6" />
                                        <input type="file" ref={imageInputRef} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt" onChange={handleFileUpload} />
                                    </button>

                                    <button
                                        onClick={sendMessage}
                                        disabled={isTyping || (!input.trim() && !selectedImage)}
                                        className="w-11 h-11 flex items-center justify-center bg-[#2ba396] hover:bg-[#238b7f] text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
