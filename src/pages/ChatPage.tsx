import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { aiClient, stripProviderNoise, type AIChatMessage } from '../lib/ai/aiClient';
import { Send, Trash2, Paperclip, MessageSquare, Download, Brain, FileText, X, Copy, BookOpen, Mic, StopCircle, Zap } from 'lucide-react';
import { exportToPDF } from '../lib/utils/pdfExport';
import { db, type ChatSession } from '../lib/db/database';
import AppLayout from '../layouts/AppLayout';
import { checkQuota, consumeQuota } from '../lib/utils/dailyQuota';
import { extractTextFromFile } from '../lib/rag/documentParser';

const CHAT_THINKING_PLACEHOLDER = '⏳ يتم استيعاب المراجع والتفكير للإجابة بدقة... 🧠';

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
    const [attachmentParsing, setAttachmentParsing] = useState(false);
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

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const fileInput = e.target;
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

            // ✅ Format & Size Validation passed, read the image natively
            // ✅ FileReader → Base64 (no external libraries)
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64Str = ev.target?.result as string;
                // Compress instantly on device to avoid Groq 400 Too Large Error
                // Used 1120x1120 which is Groq's official optimal max resolution for crystal clear OCR
                const img = new Image();
                img.onload = () => {
                    let width = img.width;
                    let height = img.height;
                    const maxDim = 1120;
                    if (width > maxDim || height > maxDim) {
                        const ratio = Math.min(maxDim / width, maxDim / height);
                        width = Math.round(width * ratio);
                        height = Math.round(height * ratio);
                    }
                    const canvas = document.createElement('canvas');
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.fillStyle = "#ffffff";
                        ctx.fillRect(0, 0, width, height);
                        ctx.drawImage(img, 0, 0, width, height);
                        // Use WebP with 0.95 quality for extremely crisp text preservation
                        setSelectedImage(canvas.toDataURL('image/webp', 0.95));
                    } else {
                        setSelectedImage(base64Str);
                    }
                    fileInput.value = '';
                };
                img.onerror = () => {
                    setSelectedImage(base64Str);
                    fileInput.value = '';
                };
                img.src = base64Str;
            };
            reader.readAsDataURL(file); // Result: "data:image/jpeg;base64,/9j/..."
        } else if (
            file.type === 'application/pdf' ||
            file.name.toLowerCase().endsWith('.pdf') ||
            file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            file.name.toLowerCase().endsWith('.docx')
        ) {
            if (file.size > 25 * 1024 * 1024) {
                alert('❌ حجم الملف كبير جداً (الحد 25MB). اختصر الملف أو صوّر الصفحات كصور.');
                e.target.value = '';
                return;
            }
            setAttachmentParsing(true);
            setAttachedFileText(null);
            setAttachedFileName(null);
            try {
                const pages = await extractTextFromFile(file);
                let text = pages.map((p) => (p.text || '').trim()).filter(Boolean).join('\n\n---\n\n');
                if (/[%]PDF|endstream|endobj|\/Filter\s*\/DCTDecode/i.test(text) && text.length > 500) {
                    text = text.replace(/stream[\s\S]{0,200}?endstream/gi, ' ').replace(/\s+/g, ' ').trim();
                }
                if (text.length < 120 && file.size > 80_000) {
                    text =
                        `[تنبيه: هذا PDF غالباً ممسوح ضوئياً (صور) أو نصه غير قابل للاستخراج آلياً. لسؤال يعتمد على صورة داخل الملف: أرفق لقطة شاشة للسؤال كصورة JPG/PNG.]\n\n---\n\n` +
                        (text || '(لا يوجد نص مستخرج)');
                }
                setAttachedFileText(text);
                setAttachedFileName(file.name);
            } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : String(err);
                alert(`تعذر قراءة الملف: ${msg}`);
            } finally {
                setAttachmentParsing(false);
            }
            e.target.value = '';
        } else {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setAttachedFileText(ev.target?.result as string);
                setAttachedFileName(file.name);
            };
            reader.readAsText(file);
            e.target.value = '';
        }
    };


    const sendMessage = async () => {
        if (isTyping) return;
        if (!input.trim() && !selectedImage && !attachedFileText) return;

        const quota = checkQuota('chat');
        if (!quota.ok) {
            alert(quota.message);
            return;
        }

        const userText = input.trim() || "قم بقراءة وتحليل الملف المرفق أو الصورة بدقة (قم بالتلخيص إن لزم).";
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

        setMessages([...newMessages, { role: 'assistant', content: CHAT_THINKING_PLACEHOLDER }]);
        setInput('');
        setSelectedImage(null);
        setAttachedFileText(null);
        setAttachedFileName(null);
        setIsTyping(true);

        try {

            // طلب أغنية/رابط/ترفيه مع بقاء المجلد مختاراً: نتجاهل المجلد لهذه الرسالة ونفعّل بحث الويب
            const entertainmentOrWebIntent = /أغن(ية|يه)|اغنية|موسيقى|مقطع\s*صوت|أوبنينغ|شارة|مسلسل|مولانا|يوتيوب|youtube|youtu\.be|r\.jina|رابط\s*(لـ?)?(أغنية|اغنية|فيديو|حلقة|مقطع)|soundtrack|spotify|سبوتify|نغم[ةه]|\bOST\b/i.test(userText.trim());
            const skipFolderRag = !!(selectedContextDocId && entertainmentOrWebIntent && !userImage && !currentAttachedText);

            // 📚 RAG Context Gathering (NotebookLM-Level Accuracy using Smart Keyword Extraction)
            let contextText = "";
            let allAvailableChunks: string[] = [];
            
            if (selectedContextDocId && !skipFolderRag) {
                if (selectedContextDocId.startsWith("subject:")) {
                    const subject = selectedContextDocId.replace("subject:", "");
                    const docs = savedDocs.filter(d => d.subjectName === subject);
                    allAvailableChunks = docs.flatMap(d => d.chunks).map(c => c.text || c);
                } else {
                    const doc = savedDocs.find(d => d.id === selectedContextDocId);
                    if (doc) allAvailableChunks = doc.chunks.map((c: any) => c.text || c);
                }
            }

            // 🎯 SUPER-SMART MASSIVE RAG (NotebookLM Level Accuracy + Surgical Fetch)
            if (allAvailableChunks.length > 0) {
                const maxChars = 400000; // Increased to 400k+ chars to mimic Google NotebookLM
                let contextChunks = allAvailableChunks;

                // If the book/folder is massive (> 400k chars), we MUST prioritize the relevant pages!
                const totalChars = allAvailableChunks.reduce((sum, c) => sum + c.length, 0);
                if (totalChars > maxChars) {
                    let keywords = userText.split(/[\s?!.,،]+/).filter(w => w.length > 2);
                    const symHits = userText.match(/\|\||&&|اتحاد|تقاطع|مكمل|أول|ثاني|عشري|ثنائي|مجموعة|bitset|union|intersection|two's|binary|O\(|Big-?O|Ω|Θ/gi);
                    if (symHits?.length) {
                        keywords = [...new Set([...keywords, ...symHits.map(s => s.toLowerCase())])];
                    }
                    if (/\|\|/.test(userText)) {
                        keywords = [...new Set([...keywords, '||', 'or', 'union', 'اتحاد'])];
                    }
                    if (/&&/.test(userText)) {
                        keywords = [...new Set([...keywords, '&&', 'and', 'تقاطع', 'intersection'])];
                    }
                    if (selectedContextDocId.startsWith("subject:")) {
                        const subj = selectedContextDocId.replace("subject:", "");
                        keywords = [...new Set([...subj.split(/\s+/).filter(w => w.length > 1), ...keywords])];
                    }
                    if (keywords.length > 0) {
                        const normalizeArabic = (t: string) => t.replace(/[ًٌٍَُِّْٰ]/g, '').replace(/[أإآا]/g, 'ا').replace(/[ة]/g, 'ه').replace(/[يى]/g, 'ي').toLowerCase();
                        const normalizedKeywords = keywords.map(kw => normalizeArabic(kw)).filter(kw => kw.length > 1);

                        const scoredChunks = allAvailableChunks.map((chunk, index) => {
                            let score = 0;
                            const chunkNorm = normalizeArabic(chunk);
                            for (const k of normalizedKeywords) {
                                if (chunkNorm.includes(k)) score += k.length <= 3 ? 6 : 10;
                            }
                            return { chunk, score: score - (index * 0.0001) };
                        });
                        scoredChunks.sort((a, b) => b.score - a.score);

                        const seen = new Set<string>();
                        const blended: string[] = [];
                        let used = 0;
                        const topBudget = Math.floor(maxChars * 0.62);
                        for (const { chunk } of scoredChunks) {
                            if (used >= topBudget) break;
                            if (seen.has(chunk)) continue;
                            if (used + chunk.length > topBudget) continue;
                            seen.add(chunk);
                            blended.push(chunk);
                            used += chunk.length;
                        }
                        for (const chunk of allAvailableChunks) {
                            if (used >= maxChars) break;
                            if (seen.has(chunk)) continue;
                            if (used + chunk.length > maxChars) break;
                            seen.add(chunk);
                            blended.push(chunk);
                            used += chunk.length;
                        }
                        contextChunks = blended;
                    }
                }

                const finalChunks: string[] = [];
                let currentChars = 0;
                for (const chunk of contextChunks) {
                    if (currentChars + chunk.length > maxChars) break;
                    finalChunks.push(chunk);
                    currentChars += chunk.length;
                }
                contextText = finalChunks.join('\n\n---\n\n');
            }

            if (currentAttachedText) {
                contextText = `[مستند إضافي مرفق: ${currentAttachedName}]\n${currentAttachedText}\n\n${contextText}`;
            }

            // 1️⃣ Extract and Scrape URLs from User Message
            let scrapedUrlContext = "";
            const urlRegex = /(https?:\/\/[^\s]+)/g;
            const urls = userText.match(urlRegex);
            if (urls && urls.length > 0) {
                try {
                    // Grab the first URL provided and scrape it!
                    const targetUrl = urls[0];
                    const scrapeRes = await fetch(`https://r.jina.ai/${targetUrl}`);
                    if (scrapeRes.ok) {
                        const content = await scrapeRes.text();
                        scrapedUrlContext = `\n[قام المستخدم بتزويدك بهذا الرابط: ${targetUrl}]\n[محتوى الرابط المقروء الآن]:\n${content.substring(0, 15000)}\n`;
                    }
                } catch (e) { console.error("URL Scrape Error", e); }
            }

            // 2️⃣ Web Search Capability
            let webSearchContext = "";
            if ((!selectedContextDocId || skipFolderRag) && !userImage) {
                try {
                    const TAVILY_API_KEY = "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";
                    let tavilyQuery = userText.substring(0, 200);
                    if (entertainmentOrWebIntent) {
                        tavilyQuery = `${userText.trim().slice(0, 120)} youtube official soundtrack`.slice(0, 200);
                    } else if (/القدس\s*المفتوحة|جامعة\s*القدس\s*المفتوحة|\bQOU\b|qou\.edu|الفروع|التسجيل.*القدس/i.test(userText)) {
                        tavilyQuery = `${userText.trim().slice(0, 90)} site:qou.edu OR "جامعة القدس المفتوحة"`.slice(0, 200);
                    } else if (/أستاذ|أستاذة|دكتور|دكتورة|جامعة|من\s+هو|من\s+هي|سيرة|تعريف\s+ب/i.test(userText)) {
                        tavilyQuery = `${userText.trim().slice(0, 130)} university faculty interview official`.slice(0, 200);
                    }
                    const webRes = await fetch("https://api.tavily.com/search", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ 
                            api_key: TAVILY_API_KEY, 
                            query: tavilyQuery, 
                            search_depth: "advanced", 
                            max_results: 15,
                            include_answer: true 
                        })
                    });
                    if (webRes.ok) {
                        const data = await webRes.json();
                        let searchResults = data.answer ? `[إجابة محرك البحث المختصرة]: ${data.answer}\n\n` : "";
                        searchResults += data.results.map((r: any) => `🔗 [موقع: ${r.title}] (${r.url})\n📄 المقتطف: ${r.content}\n`).join('\n');
                        webSearchContext = searchResults;
                    }
                } catch (e) { console.error("Web Search Error", e); }
            }

            const systemInstruction = `أنت المساعد الأكاديمي الذكي الفائق (Solvica V14).
صانعك ومبرمجك: **الخبير التكنولوجي مصطفى 👑✨**.

--- تحيات وهوية (مهم جداً) ---
- **لا تستخدم نفس الفقرة أو نفس الصياغة** في كل مرة. خالف الأسلوب بين الرسائل (جملة ترحيب، سؤال عنك، اسم، من صنعك…) بحيث يناسب **السؤال حرفياً**:
  - تحية فقط (مرحبا/هلا/السلام…) → رد ترحيبي قصير طبيعي، ويمكنك ذكر Solvica بجملة خفيفة دون تكرار قالب ثابت.
  - كيفك/شلونك/أخبارك → عن «الحال» بجملة أو اثنتين، بلهجة لبقة، ثم إن لزم تلميح أنك Solvica.
  - شو اسمك / ما اسمك → الاسم **Solvica** بجملة قصيرة فقط، دون إعادة سرد فقرة الهوية الكاملة.
  - مين عملك / من برمجك / المطور → مصطفى بجملة مختصرة؛ لا تلصق تلقائياً وصف «منصة ذكية فائقة» إن لم يُسأل عنها.
- **ممنوع** لصق نفس الإجابة الطويلة المتطابقة لأسئلة مختلفة داخل نفس المحادثة.

--- جامعة القدس المفتوحة (QOU) — أولوية للطالب ---
- جامعة المستخدم المرجعية هي **جامعة القدس المفتوحة** (Palestine). للأسئلة عن الجامعة، الفروع، التسجيل، البرامج، والامتحانات: اعتمد **الموقع الرسمي** (نطاق qou.edu) ونتائج البحث المرفقة؛ لا تخترع لوائح أو مواعيد غير واردة في المصدر.
- إن سُئلت عن شيء لا يظهر في النتائج، أوضح أنك تعتمد على الموقع/البحث فقط واقترح زيارة qou.edu أو التواصل مع الجامعة.

--- الدليل الإرشادي لمنصة Solvica (لتوجيه الطلاب) ---
تحتوي المنصة على الميزات التالية لتشرحها للطلاب إذا سألوا:
- (المجلدات / Folders): يمكن للطالب إنشاء مجلد لرفع مواده بداخله. عند دخول الدردشة، يمكنه اختيار المجلد من "القائمة المنسدلة" العلوية ليقوم المحرك بالبحث حصرياً داخل هذا المجلد.
- (رفع الملفات): من خلال إيقونة المرفقات بشريط الدردشة، يمكن رفع صورة أو ملف PDF ليقوم المحرك بحله فوراً.

--- قوانين التفوق والمنطق المنيعة (Zero-Hallucination) ---
1. الروابط والبحث على الويب:
   - إن وُجدت جملة تبدأ بـ «إجابة محرك البحث المختصرة» فهي **مسودة آلية قد تكون خاطئة**؛ لا تعتمدها إذا خالفت المقتطفات أو اخترعت سيرة شخص. الصواب: المقتطفات والعناوين والروابط المرفقة فقط.
   - يُمنع تأليف روابط (http/https) أو فيديوهات من خيالك. كل رابط يجب أن يظهر في **مقتطفات نتائج البحث المرفقة** أو في محتوى رابط مُزَحْلَق.
   - **موسيقى / أغنية / مقطع صوتي / أوبنينغ مسلسل / OST**: رتّب النتائج بحيث **تظهر روابط YouTube (youtube.com أو youtu.be) في المقدمة** إن وُجدت في النتائج وصِلتها واضحة بالمقتطف. بعدها يمكن Spotify أو Apple Music **إن وردت في النتائج**. لا تضع رابط فيسبوك كخيار أول لطلب «أغنية/مقطع» إن وُجد يوتيوب ذو صلة في النتائج.
   - **صفحة رسمية أو موقع مؤسسة**: فضّل الروابط الرسمية (.edu، موقع الجامعة، صفحة رسمية) عندما تطابق المقتطف السؤال.
   - **منشور أو صفحة على السوشال**: مسموح فيسبوك/إنستغرام/X **فقط** إذا ورد الرابط في النتائج والمقتطف يطابق طلب المستخدم.
   - **تنسيق الإخراج**: قائمة مرقّمة؛ **كل رابط في سطر منفصل**؛ بعد كل رابط سطر جديد فيه **جملة قصيرة (10–20 كلمة)** تشرح ماذا يوجد في الرابط — وصفك يجب أن ينبع من **المقتطف أو عنوان الصفحة** لا من تخمين.
   - إن لم تجد في النتائج ما يطابق الطلب: اعتذر ولا تخترع سيرة أو روابط.
2. **أشخاص حقيقيون** (أستاذ جامعي، صحفي، إلخ):
   - لا تذكر منصباً أو جامعة أو «أسس مؤسسة» أو إنجازات إلا إذا **نصّ المقتطف** على ذلك **ونفس الاسم والسياق** يطابقان سؤال المستخدم (مثلاً: الاسم الكامل + الجامعة + البلد معاً في نفس المصدر).
   - إذا النتائج مختلطة أو الصفحات عامة (عناوين فيسبوك طويلة دون تأكيد الهوية): قل صراحة أنك **لا تضمن** تطابق الشخص المطلوب، واعرض فقط ما ورد في النتائج مع الروابط دون دمج معلومات من أشخاص آخرين.
3. الرياضيات والبرمجة: حقق الخطوات بدقة تامة.
4. اللغة: عربية احترافية ولبقة (لا تشرح معنى سؤال المستخدم بشكل فج).
5. محظورات: روابط وهمية؛ لا تذكر منصات منافسة بدل الإجابة.

--- القدرات المدمجة ---
- 🖼️ توليد الصور: إذا طُلب رسم، أرسل فوراً: ![وصف إنجليزي](https://image.pollinations.ai/prompt/{text})
- 🗺️ الخرائط الذهنية: استخدم كتل mermaid.`;

            let finalSysPrompt = systemInstruction;
            if (contextText) {
                finalSysPrompt += `\n\n--- الركائز الأساسية المرجعية (NotebookLM Grounding) ---
أنت الآن مقيد تماماً بالمعلومات المرفقة لك في السياق.
- الإجابة يجب أن تكون دقيقة ومفصلة وشاملة كما يفعل مساعد NotebookLM تماماً.
- يُمنع إدراج روابط ويب خارجية إذا لم توجد في المجلد. استخرج الحقائق واشرحها للمستخدم بأفضل تبسيط علمي ممكن.`;
            }

            // 🚫 Remove the hardcoded greeting from being sent to the AI!
            const chatHistory: AIChatMessage[] = newMessages
                .filter(m => !m.content.includes("أنا Solvica المساعد الأكاديمي"))
                .map(m => ({
                    role: (m.role === 'user' ? 'user' : 'model') as Exclude<AIChatMessage['role'], 'assistant' | 'system'>,
                    content: m.content,
                    image: m.image
                }));

            // NotebookLM Strategy: Inject massive context directly into the LAST user message
            // so the AI physically cannot ignore it (solves 'Lost in the Middle' and model laziness)
            if (chatHistory.length > 0) {
                const last = chatHistory[chatHistory.length - 1];
                if (last.role === 'user') {
                    const originalQuestion = last.content;
                    const isSimpleGreeting = /^(مرحبا|كيفك|كيف حالك|طمني عنك|مين انت|من أنت|من برمجك|من صنعك|هلا|أهلاً|السلام عليكم|هاي|hi|hello|شو اسمك|ما اسمك|ايش اسمك|شلونك|من المطور|اسمك|مين المبرمج|من المبرمج|مين عامل المنصة|ايش اسمك|شو اخبارك)\s*$/i.test(originalQuestion.trim()) || originalQuestion.trim().length <= 15;

                    if (!isSimpleGreeting) {
                        let finalContent = originalQuestion;

                        if (contextText) {
                            // Universal Zero-Hallucination RAG Format (Grounding)
                            finalContent = `### 📚 [نصوص المجلد الدراسي الحصري]:\n${contextText}\n\n---\nالسؤال من الطالب استناداً للمعطيات أعلاه:\n${originalQuestion}\n\n[أمر نظامي صارم جداً للرد (NotebookLM): يُمنع منعاً باتاً ومطلقاً الإجابة من خارج النص المرفق! مهما كان تخصص السؤال (رياضيات، نحو، حاسوب، أو غيره)، يجب عليك استخراج الإجابة حصرياً وتفصيلياً من النصوص المرفقة فقط. إذا تأكدت أن المعلومة غير موجودة تماماً في المجلد، قُل فوراً "المعلومة غير موجودة في المجلد المقرّر" وإياك أن تهلوس. وإذا قدم الطالب أي خيارات لكي تختار منها (سواء كانت خيارات مرقمة، أو مجرد كلمات متجاورة ومبعثرة في سؤاله مثل: صح/خطأ، كذا. كذا. كذا)، فيجب عليك تحديد الخيار الصحيح الذي يطابق المجلد وكتابته بهذا التنسيق الحرفي حصرياً كأول سطر في إجابتك: (✅ الخيار الصحيح هو: [النص المطابق للخيار])، متبوعاً بسطر جديد يشرح التعليل الأكاديمي الحرفي.]`;
                        } else if (webSearchContext || scrapedUrlContext) {
                            // Natural Web Search / Scraped URL Format (No Folder Selected)
                            finalContent = `[أمر نظامي: سؤال يعتمد على الويب. استخدم فقط الروابط والمعلومات الظاهرة في النتائج أدناه للإجابة بشكل دقيق.]\n\nالطلب: ${originalQuestion}`;
                            if (webSearchContext) finalContent += `\n\n### 🌍 [أهم نتائج بحث الويب الحديثة]:\n${webSearchContext}\n\n[يرجى الاستعانة بهذه النتائج وتزويد الطالب بالمعلومات الصريحة والروابط بشكل مرتب ومنسق. الروابط الترفيهية (أغاني، فيديو) يجب أن تفضل YouTube من النتائج المرفقة.]`;
                            if (scrapedUrlContext) finalContent += `\n\n### 🔗 [محتوى الرابط المرفق]:\n${scrapedUrlContext}`;
                        }
                        
                        last.content = finalContent;
                    }
                    // If it's a simple greeting, or no context exists at all, the user message remains 100% untouched.
                }
            }

            let finalAIText = "";
            await aiClient.streamChat(
                chatHistory, 
                {
                onChunk: (chunk) => {
                    finalAIText = stripProviderNoise(finalAIText + chunk);

                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last && last.role === 'assistant') {
                            return [...prev.slice(0, -1), { ...last, content: finalAIText }];
                        }
                        const newAssistantMsg: AIChatMessage = { role: 'assistant', content: finalAIText };
                        return [...prev, newAssistantMsg];
                    });
                },
                onComplete: (fullText) => {
                    finalAIText = stripProviderNoise(fullText || finalAIText);
                    setMessages(prev => {
                        const last = prev[prev.length - 1];
                        if (last?.role !== 'assistant') return prev;
                        return [...prev.slice(0, -1), { ...last, content: finalAIText }];
                    });
                }
            }, {}, finalSysPrompt);

            if (!finalAIText.trim()) {
                setMessages(prev => prev.filter(m => !(m.role === 'assistant' && m.content === CHAT_THINKING_PLACEHOLDER)));
            }

            if (finalAIText.trim().length > 0) {
                consumeQuota('chat');
            }

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
            let errorText = "✅ مستمر معك الآن. اكتب سؤالك مباشرة وسأجيبك بشكل فوري.";
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
                const cleanPrev = prev.filter(m => {
                    if (m.role === 'assistant' && m.content === CHAT_THINKING_PLACEHOLDER) return false;
                    return m.role === 'user' || !!m.content?.trim();
                });
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
                                <div className="flex flex-row flex-wrap items-center gap-2 sm:gap-3 mt-0.5 sm:mt-1">
                                    <span className="text-[8px] sm:text-[10px] md:text-xs lg:text-sm text-[var(--text-muted)] font-bold inline-flex items-center gap-1 sm:gap-1.5">
                                        <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 rounded-full bg-[#2ba396] shadow-[0_0_8px_#2ba396] shrink-0" />
                                        المحرك التعليمي
                                    </span>
                                    {localStorage.getItem("pollinations_pk") ? (
                                        <span className="text-[8px] sm:text-[10px] md:text-xs text-green-500 font-bold whitespace-nowrap" title="تم تفعيل الدرع الإضافي">
                                            ✅ متصل
                                        </span>
                                    ) : null}
                                </div>
                                {!localStorage.getItem("pollinations_pk") ? (
                                    <button onClick={() => {
                                        const redirectUrl = encodeURIComponent(window.location.href.split('#')[0]);
                                        window.location.href = `https://enter.pollinations.ai/authorize?redirect_url=${redirectUrl}&permissions=profile,balance,usage,offline_access&app_key=pk_kn9KoGgYC7i5Sk6P&expiry=never`;
                                    }} className="mt-1 text-[10px] sm:text-xs shrink-0 flex items-center gap-1 bg-gradient-to-r from-gray-800 to-gray-600 px-2 flex-wrap py-0.5 rounded-md text-white shadow-sm hover:scale-105 transition-transform self-start" title="سجّل مجاناً بحساب جيت هب لتفعيل الرؤية اللامحدودة في حال الضغط">
                                        🛡️ تفعيل درع GitHub
                                    </button>
                                ) : null}
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
                                        <div className={`relative group ${msg.content === CHAT_THINKING_PLACEHOLDER ? 'animate-pulse' : ''}`} style={{
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
                                                        strong({node, children, ...props}: any) {
                                                            const textStr = String(children);
                                                            if (textStr.includes("الجواب:") || textStr.includes("الجواب الصحيح:")) {
                                                                return <strong className="text-red-500 font-black text-[16px] bg-red-500/10 px-2 py-1 rounded inline-block" {...props}>{children}</strong>;
                                                            }
                                                            return <strong className="font-bold" {...props}>{children}</strong>;
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

                    </div>

                    <div className="p-4 bg-[var(--bg-background)] border-t border-[var(--border-color)]">
                        {attachmentParsing && (
                            <div className="mb-3 text-sm font-bold text-[#2ba396] animate-pulse text-right mr-2 md:mr-10">
                                جاري استخراج النص من PDF / Word…
                            </div>
                        )}
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
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        sendMessage();
                                    }
                                }}
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
                                disabled={isTyping || attachmentParsing || (!input.trim() && !selectedImage && !attachedFileText)}
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
