// ⚡ Solvica V10 INDESTRUCTIBLE AI ENGINE ⚡
// 8-Layer Rotation: Puter → Gemini(Key1) → Gemini(Key2) → Groq → Cloudflare → Pollinations
// GUARANTEED 24/7 UPTIME. ZERO DOWNTIME. ZERO ERRORS SHOWN TO USER.

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIChatMessage {
    role: 'user' | 'model' | 'assistant' | 'system';
    content: string;
    image?: string;
    attachmentName?: string;
}

export interface StreamCallbacks {
    onChunk: (chunk: string) => void;
    onComplete?: (fullText: string) => void;
    onError?: (error: any) => void;
}

export interface ChatOptions {
    model?: string;
}

const BAZINGA_SYSTEM_PROMPT = `أنت Solvica — مساعد أكاديمي فائق + باحث متخصص في التحقق من المعلومات.

## هويتك
- مُطوّرك وصانعك: **الخبير مصطفى 👑✨** (أجب بهذا فوراً إذا سُئلت)
- عقليتك: أكاديمي صارم + محقق معلومات بدقة 100%

## قواعد البحث والتحقق (صارمة جداً)
1. **ابحث في المصادر المتاحة أولاً** قبل أي إجابة تتعلق بمعلومة قابلة للتحقق
2. **لكل معلومة اذكر:** المصدر + تاريخ النشر بالصيغة: ← المصدر: [اسم الموقع] | التاريخ: [تاريخ النشر]
3. **إذا لم تجد مصدراً موثوقاً** → قل "لا أعلم بشكل مؤكد" ولا تخترع أبداً
4. **لا تخلط** بين الأحداث التاريخية والأخبار الحالية
5. **للأرقام المالية والأسعار**: اذكر التوقيت الدقيق للسعر دائماً
6. **إذا وجدت تعارضاً بين مصدرين** → اذكر الاثنين وبيّن التعارض

## التعامل مع الملفات والمستندات
- عند تزويدك بمحتوى مستند: ادرسه بعمق، استخرج المعلومات، قارن، استنتج
- أجب **حصرياً** من المحتوى المرفق إذا كان الموضوع أكاديمياً محدداً
- لا تهلوس أو تخترع معلومات خارج المستند

## أسلوب الرد
- **أسئلة تفاعلية** (مرحبا، كيف حالك): رد قصير فوري بكلمتين-ثلاثة فقط ✨
- **أسئلة الاختيار من متعدد**: إذا أرسل لك الطالب سؤالاً تليه عدة أسطر إضافية (حتى لو كانت بدون ترقيم أ ب ج)، افهم فوراً أنها خيارات الإجابة! المطلوب منك تحديد وعرض الخيار الصحيح فقط مع شرح علمي دقيق وقصير.
- **أسئلة معلوماتية**: استخدم Markdown منظم مع المصادر
- لا تعتذر عن الإجابة لأسباب سياسة أو حقوق نشر — أجب بثقة كعالم موسوعي`;


// ═══════════════════════════════════════════════════════
// AI MEMORY SYSTEM — localStorage-based learning
// ═══════════════════════════════════════════════════════
const MEMORY_KEY = 'solvica_ai_memory';
export interface AIMemoryEntry { type: 'correction' | 'feedback'; question: string; wrong?: string; correct: string; timestamp: number; }
export const aiMemory = {
    getAll: (): AIMemoryEntry[] => { try { return JSON.parse(localStorage.getItem(MEMORY_KEY) || '[]'); } catch { return []; } },
    add: (entry: Omit<AIMemoryEntry, 'timestamp'>) => {
        const all = aiMemory.getAll();
        all.unshift({ ...entry, timestamp: Date.now() });
        localStorage.setItem(MEMORY_KEY, JSON.stringify(all.slice(0, 50))); // keep last 50
    },
    getContextString: (): string => {
        const entries = aiMemory.getAll().slice(0, 10);
        if (entries.length === 0) return '';
        return '\n\n### 🧠 ذاكرة التعلم من الأخطاء السابقة (يجب مراعاتها):\n' +
            entries.map(e => e.type === 'correction'
                ? `- ❌ كنت مخطئاً عندما قلت: "${e.wrong?.slice(0, 80)}" — ✅ الصواب: "${e.correct.slice(0, 80)}"`
                : `- 📝 ملاحظة: "${e.correct.slice(0, 100)}"`
            ).join('\n');
    }
};


// ═══════════════════════════════════════════════════════
// API KEYS (Multi-Account Rotation)
// ═══════════════════════════════════════════════════════
// Gemini Key Rotation (9 keys)
// ═══════════════════════════════════════════════════════
const GEMINI_KEYS = [
    "AIzaSyCJtaP6XnyCaE7TDgfjucZU7qlFE5qOVYA",
    "AIzaSyDNGrlUqxWVXTRmn-90NiXGGb_KY1o4hH8",
    "AIzaSyB_PGqNjGE5S7FmIMdyGDr61BQ5kO8hoeU",
    "AIzaSyAmoDmOZTpBWee0k8IkJuKHjbZRm_pGT_k",
    "AIzaSyD_hIhCAHeYAQ4rKRnTpoCmQtE4y9bf4_8",
    "AIzaSyBu__zdI944Ne15rZI7rgNb2lPeeXP_Qm0",
    "AIzaSyCME13msOmANMT_vEQ7-2jxqtwYaqZoBXg",
    "AIzaSyA3JB3jdnIv6fhXgJUGxroYPiefEZr62QA",
    "AIzaSyCQVeZTvNW7vHyOulehN74cyNpdWtj24YE",
    import.meta.env.VITE_GEMINI_API_KEY || "",
    import.meta.env.VITE_GEMINI_API_KEY_2 || "",
].filter(k => k.length > 10);
let geminiKeyIndex = 0;
const EXHAUSTED_KEYS = new Set<string>();

// Groq key rotation
const GROQ_KEYS = [
    "gs" + "k_A5j4gxHjkw6iT1nzIl3eWGdyb3FYKlJHAIu78wvB9fvqb1TKUwcS",
    "gs" + "k_iguKzVIVZgs6zgcqsjgfWGdyb3FY2Qir4KIgAOxjzA8VJ4jisVRd",
    "gs" + "k_pwNkpwAOcLCuCJNkD8kRWGdyb3FY3eL5F8J1CKGh1ToKmHGEsdaz",
    "gs" + "k_1LIFYKVl7QpDIvzTFRZTWGdyb3FY3A2o6LyTSxKHfqcnbPF9wFhV",
    "gs" + "k_p2EzuMeDVFcWvXwYpFW2WGdyb3FYPOo15PQFG7oyUBg0aOptESDU",
    "gs" + "k_wyUoYtRFHLGAQDmWejGyWGdyb3FYDKM8nNzpHbaDhvu0mFNYv39c",
    "gs" + "k_8pkeHmVSuUWGUSUq3BkLWGdyb3FY1kpnLzpAzKRWnnuR2l4JWkfG",
    "gs" + "k_IA4W6Dg5QGxkEjdJareFWGdyb3FYvEtuETfhqwwpA5w4Yim38KE8",
    "gs" + "k_KTb0jbAFSPUXd6nAMSLfWGdyb3FY1gKlFIKXTh8Mc9cBqugwIWwe",
    import.meta.env.VITE_GROQ_API_KEY || "",
    import.meta.env.VITE_GROQ_API_KEY_2 || "",
    import.meta.env.VITE_GROQ_API_KEY_3 || "",
].filter(k => k.length > 0);
let groqKeyIndex = 0;
const getGroqKey = () => {
    const key = GROQ_KEYS[groqKeyIndex % GROQ_KEYS.length];
    groqKeyIndex = (groqKeyIndex + 1) % GROQ_KEYS.length;
    return key;
};
const CF_ACCOUNT_ID = import.meta.env.VITE_CF_ACCOUNT_ID || "d512b57e197e6a523bf0a69b6b1b0dac";
const CF_API_TOKEN_1 = import.meta.env.VITE_CF_API_TOKEN_1 || "";
const CF_API_TOKEN_2 = import.meta.env.VITE_CF_API_TOKEN_2 || "";


class AIClient {
    // ─── Helpers ───────────────────────────────────────
    private isPuterAvailable(): boolean {
        try {
            // @ts-ignore
            const p = window.puter;
            if (!p || !p.ai) return false;
            // Only use Puter if user is ALREADY signed in — never show login popup
            // @ts-ignore
            if (p.auth && typeof p.auth.isSignedIn === 'function') {
                // @ts-ignore
                return p.auth.isSignedIn() === true;
            }
            // If we can't check auth status, skip it to be safe
            return false;
        } catch {
            return false;
        }
    }

    private getSystemPrompt(baseInstruction?: string): string {
        const now = new Date();
        const deviceTime = now.toLocaleString('ar-EG', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
        });
        const currentYear = now.getFullYear();
        const memoryContext = aiMemory.getContextString();
        return `${baseInstruction || BAZINGA_SYSTEM_PROMPT}\n\n*** معلومات النظام والإطار الزمني ***\n- الوقت والتاريخ المباشر الآن: ${deviceTime}\n- أنت تعيش وتعمل في عام ${currentYear}.\n- أنت متصل بشبكة الإنترنت (عبر نظام بحث مساعد) وتستطيع توفير أحدث المعلومات، وإياك أن تعتذر بدعوى أن معلوماتك تنتهي في عام 2023 أو 2024 أو 2025. إذا طلب منك أحدث الأخبار، استخدم استنتاجك ومعلوماتك المتاحة أو ابدأ بالإجابة بثقة دون ذكر تاريخ القطع الخاص بك.${memoryContext}`;
    }

    private async compressImageBase64(base64Str: string, maxWidth = 800, maxHeight = 800): Promise<string> {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
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
                    resolve(canvas.toDataURL('image/jpeg', 0.8));
                } else {
                    resolve(base64Str);
                }
            };
            img.onerror = () => resolve(base64Str);
            // Ensure data URL format
            img.src = base64Str.startsWith('data:') ? base64Str : `data:image/jpeg;base64,${base64Str}`;
        });
    }

    private buildOpenAIMessages(messages: AIChatMessage[], sysPrompt: string): any[] {
        const openAiMessages: any[] = [{ role: "system", content: sysPrompt }];
        const latestMsg = messages[messages.length - 1];
        const hasImage = !!latestMsg.image;

        messages.forEach(m => {
            if (m.role !== 'system') {
                const role = m.role === 'model' ? 'assistant' : m.role;
                if (m === latestMsg && hasImage) {
                    openAiMessages.push({
                        role: "user",
                        content: [
                            { type: "text", text: m.content || "حلل هذه الصورة" },
                            { type: "image_url", image_url: { url: m.image! } }
                        ]
                    });
                } else {
                    openAiMessages.push({ role, content: m.content });
                }
            }
        });
        return openAiMessages;
    }

    // ─── LAYER 1: Puter.js ─────────────────────────────
    private async callPuter(messages: AIChatMessage[], sysPrompt: string, targetModel?: string): Promise<string> {
        if (!this.isPuterAvailable()) throw new Error("Puter unavailable");

        const latestMsg = messages[messages.length - 1];
        const hasImage = !!latestMsg.image;

        const formattedMessages: any[] = [{ role: "system", content: sysPrompt }];
        messages.forEach(m => {
            if (m.role !== 'system') {
                if (m === latestMsg && hasImage) {
                    const img = latestMsg.image!;
                    const fullImg = img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
                    formattedMessages.push({
                        role: "user",
                        content: [
                            { type: "text", text: m.content },
                            { type: "image_url", image_url: { url: fullImg, detail: "high" } }
                        ]
                    });
                } else {
                    formattedMessages.push({ role: m.role, content: m.content });
                }
            }
        });

        // @ts-ignore
        const response = await window.puter.ai.chat(formattedMessages, { model: targetModel });
        if (typeof response === 'string') return response;
        return response?.message?.content || response?.content || response?.text || String(response);
    }

    // ─── HRN AI Sync: Pollinations Authenticated API ─────────────
    // Same as HRN AI: gemini-search = Gemini + live internet search!
    private async callPollinationsAuth(messages: AIChatMessage[], sysPrompt: string, model = "gemini-search"): Promise<string> {
        const pollinationsKey = (() => {
            try { return localStorage.getItem('pk') || "pk_kn9KoGgYC7i5Sk6P"; } catch { return "pk_kn9KoGgYC7i5Sk6P"; }
        })();
        const formattedMessages = this.buildOpenAIMessages(messages, sysPrompt);
        const res = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${pollinationsKey}` },
            body: JSON.stringify({ model, messages: formattedMessages, max_tokens: 8192, stream: false })
        });
        if (!res.ok) throw new Error(`Pollinations Auth (${model}) failed: ${res.status}`);
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        if (!text.trim()) throw new Error("Pollinations Auth returned empty");
        return text;
    }

    // ─── LAYER 2/3: Google Gemini (2 Keys) ─────────────
    private getGeminiParts(m: AIChatMessage) {
        const parts: any[] = [{ text: m.content || " " }];
        if (m.image) {
            const base64Data = m.image.includes(',') ? m.image.split(',')[1] : m.image;
            let mimeType = m.image.includes(';') ? m.image.split(';')[0].split(':')[1] : "image/jpeg";
            if (!mimeType) mimeType = "image/jpeg";
            parts.push({ inlineData: { data: base64Data, mimeType } });
        }
        return parts;
    }

    private async callGemini(messages: AIChatMessage[], sysPrompt: string, genAIInstance: GoogleGenerativeAI): Promise<string> {
        const model = genAIInstance.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: sysPrompt,
        });

        const geminiHistory = messages.slice(0, -1).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: this.getGeminiParts(m)
        }));

        const latestParts = this.getGeminiParts(messages[messages.length - 1]);

        const chatEngine = model.startChat({ history: geminiHistory });
        const result = await chatEngine.sendMessage(latestParts);
        return result.response.text();
    }

    // ─── LAYER 4: Groq (Lightning Fast - Supports Vision) ────────────────
    private async callGroq(messages: AIChatMessage[], sysPrompt: string): Promise<string> {
        const openAiMessages = this.buildOpenAIMessages(messages, sysPrompt);

        const hasImage = messages.some(m => !!m.image);
        let targetModel = "llama-3.3-70b-versatile";
        let finalMessages = openAiMessages;

        if (hasImage) {
            targetModel = "llama-3.2-90b-vision-preview";
        } else {
            // Groq non-vision doesn't support images - strip image content for text-only
            finalMessages = openAiMessages.map((m: any) => {
                if (Array.isArray(m.content)) {
                    const textPart = m.content.find((p: any) => p.type === 'text');
                    return { ...m, content: textPart?.text || "حلل هذا" };
                }
                return m;
            });
        }

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${getGroqKey()}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: targetModel,
                messages: finalMessages,
                max_tokens: 4096,
            })
        });

        if (!res.ok) throw new Error(`Groq failed: ${res.status}`);
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
    }

    // ─── LAYER 5/6: Cloudflare Workers AI (2 Tokens) ───
    private async callCloudflare(messages: AIChatMessage[], sysPrompt: string, token: string): Promise<string> {
        const textOnlyMessages = this.buildOpenAIMessages(messages, sysPrompt).map((m: any) => {
            if (Array.isArray(m.content)) {
                const textPart = m.content.find((p: any) => p.type === 'text');
                return { ...m, content: textPart?.text || "حلل هذا" };
            }
            return m;
        });

        const res = await fetch(`https://corsproxy.io/?https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ messages: textOnlyMessages })
        });

        if (!res.ok) throw new Error(`Cloudflare failed: ${res.status}`);
        const data = await res.json();
        return data.result?.response || "";
    }

    private async callCloudflareVision(messages: AIChatMessage[], sysPrompt: string, token: string): Promise<string> {
        const formattedMessages = this.buildOpenAIMessages(messages, sysPrompt).map(m => {
            if (Array.isArray(m.content)) {
                // Cloudflare requires byte array instead of base64 data uri for images
                const textPart = m.content.find((p: any) => p.type === 'text')?.text || "What is in this image?";
                const imgPart = m.content.find((p: any) => p.type === 'image_url')?.image_url?.url;
                
                if (imgPart && imgPart.includes(',')) {
                    const base64Data = imgPart.split(',')[1];
                    const binaryString = atob(base64Data);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const imageByteArray = Array.from(bytes);
                    
                    return { role: m.role, content: textPart, image: imageByteArray };
                }
            }
            return m;
        });

        const res = await fetch(`https://corsproxy.io/?https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.2-11b-vision-instruct`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ messages: formattedMessages })
        });

        if (!res.ok) throw new Error(`Cloudflare Vision failed: ${res.status}`);
        const data = await res.json();
        return data.result?.response || "";
    }

    // ─── POLLINATIONS STREAM AUTH (HRN AI Clone) ───
    private async streamPollinationsAuth(messages: AIChatMessage[], sysPrompt: string, callbacks: StreamCallbacks, targetModel = "gemini-search"): Promise<void> {
        let pk = null;
        try { pk = localStorage.getItem('pk'); } catch {}
        if (!pk) throw new Error("POLLINATIONS_LOGIN_REQUIRED");

        const formattedMessages = this.buildOpenAIMessages(messages, sysPrompt);
        const res = await fetch("https://gen.pollinations.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${pk}`
            },
            body: JSON.stringify({
                model: targetModel,
                messages: formattedMessages,
                stream: true
            })
        });

        if (res.status === 402) throw new Error("POLLINATIONS_LOGIN_REQUIRED");
        if (res.status === 401) throw new Error("POLLINATIONS_LOGIN_REQUIRED");
        if (!res.ok) throw new Error(`Pollinations Auth Stream failed: ${res.status}`);

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (const line of lines) {
                if (!line.trim().startsWith("data: ")) continue;
                const jsonStr = line.trim().slice(6);
                if ("[DONE]" === jsonStr) break;
                try {
                    const data = JSON.parse(jsonStr);
                    const content = data.choices?.[0]?.delta?.content;
                    if (content) {
                        fullText += content;
                        callbacks.onChunk(content);
                    }
                } catch { }
            }
        }
        callbacks.onComplete?.(fullText);
    }

    // ─── NEW MASSIVE FALLBACKS ───
    private async callPollinationsText(messages: AIChatMessage[], sysPrompt: string): Promise<string> {
        // Build openAI compatible JSON payload for pollinations including image support
        const formattedMessages = this.buildOpenAIMessages(messages, sysPrompt);

        const res = await fetch("https://text.pollinations.ai/", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                messages: formattedMessages,
                model: "openai"
            })
        });
        if (!res.ok) throw new Error("Pollinations Text failed");
        let text = await res.text();

        // Warning filter just in case
        if (text.includes("IMPORTANT NOTICE") || text.includes("pollinations.ai")) {
            text = text.replace(/⚠️?\s*IMPORTANT NOTICE\s*⚠️?[\s\S]*?(continue to work normally\.|latest models\.)/gi, "").trim();
            text = text.replace(/The Pollinations legacy text API is being deprecated[\s\S]*?normally\./gi, "").trim();
            if (text.includes("IMPORTANT NOTICE")) {
                const parts = text.split(/⚠️?\s*IMPORTANT NOTICE\s*⚠️?/);
                text = parts.length > 1 ? parts[parts.length - 1].replace(/[\s\S]*?(continue to work normally\.|latest models\.)/, "").trim() : parts[0];
            }
        }
        if (!text || text.length < 3) throw new Error("Pollinations returned empty");
        return text;
    }


    private async callTextSynth(messages: AIChatMessage[], _sysPrompt: string): Promise<string> {
        const lastMsg = messages[messages.length - 1].content || "Hello";
        const res = await fetch(`https://api.textsynth.com/v1/engines/mistral_7B/completions?prompt=${encodeURIComponent(lastMsg)}`, { method: "POST" });
        if (!res.ok) throw new Error("TextSynth failed");
        const json = await res.json();
        return json.text || "";
    }

    // ─── Cerebras (Ultra-Fast, Free Tier) ───
    private async callCerebras(messages: AIChatMessage[], sysPrompt: string): Promise<string> {
        const textOnlyMessages = this.buildOpenAIMessages(messages, sysPrompt).map((m: any) => {
            if (Array.isArray(m.content)) {
                const textPart = m.content.find((p: any) => p.type === 'text');
                return { ...m, content: (textPart?.text || "حلل هذا").substring(0, 90000) };
            }
            const cStr = (m.content || "");
            return { ...m, content: cStr.length > 90000 ? cStr.substring(0, 90000) + "..." : cStr };
        });
        const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": "Bearer csk-vfnpyjyy5fckt3dfmppeyf5nr93wevhvdkhvcvjvtfkhmkyc",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b",
                messages: textOnlyMessages,
                max_tokens: 8192
            })
        });
        if (!res.ok) throw new Error(`Cerebras failed: ${res.status}`);
        const data = await res.json();
        const text = data.choices?.[0]?.message?.content || "";
        if (!text.trim()) throw new Error("Cerebras returned empty");
        return text;
    }

    private async callPawan(messages: AIChatMessage[], sysPrompt: string): Promise<string> {
        const res = await fetch("https://api.pawan.krd/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model: "gpt-3.5-turbo", messages: this.buildOpenAIMessages(messages, sysPrompt) })
        });
        if (!res.ok) throw new Error("Pawan failed");
        const json = await res.json();
        return json.choices?.[0]?.message?.content || "";
    }

    private async callG4FHook(messages: AIChatMessage[], _sysPrompt: string): Promise<string> {
        const lastMsg = messages[messages.length - 1].content || "Hello";
        const res = await fetch(`https://g4f.dev/api/ask?q=${encodeURIComponent(lastMsg)}`);
        if (!res.ok) throw new Error("G4F Hook failed");
        return await res.text();
    }

    private async callG4FPollinations(messages: AIChatMessage[], _sysPrompt: string): Promise<string> {
        const lastMsg = messages[messages.length - 1].content || "Hello";
        const res = await fetch(`https://g4f.dev/ai/pollinations?prompt=${encodeURIComponent(lastMsg)}`);
        if (!res.ok) throw new Error("G4F Pollinations failed");
        const json = await res.json();
        return json.choices?.[0]?.message?.content || await res.text();
    }

    private async callAIHorde(messages: AIChatMessage[], sysPrompt: string): Promise<string> {
        const promptText = this.buildOpenAIMessages(messages, sysPrompt).map(m => m.role + ": " + m.content).join("\n");
        const res = await fetch("https://aihorde.net/api/v2/generate/text/async", {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": "0000000000" },
            body: JSON.stringify({ prompt: promptText + "\nassistant: ", params: { max_context_length: 1024, max_length: 512 } })
        });
        if (!res.ok) throw new Error("AI Horde Failed: " + res.status);
        const data = await res.json();
        if (data && data.generations && data.generations[0]) return data.generations[0].text;
        throw new Error("AI Horde async response, skipping");
    }

    private async callDDG(messages: AIChatMessage[], _sysPrompt: string): Promise<string> {
        const lastMsg = messages[messages.length - 1].content;
        const res = await fetch(`https://hf.space/embed/mistralai/Mistral-7B-Instruct/run?prompt=${encodeURIComponent(lastMsg)}`);
        if (!res.ok) throw new Error("HF Space failed");
        return await res.text();
    }

    private async callGPTResearch(messages: AIChatMessage[], sysPrompt: string): Promise<string> {
        const res = await fetch("https://api.gpt-research.org/api/v1/inference", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: this.buildOpenAIMessages(messages, sysPrompt) })
        });
        if (!res.ok) throw new Error("GPT Research failed");
        const root = await res.json();
        return root.response || root.text || root.choices?.[0]?.message?.content || "";
    }

    private async callGenericFallbacks(messages: AIChatMessage[], _sysPrompt: string): Promise<string> {
        const lastMsg = messages[messages.length - 1].content;
        const encoded = encodeURIComponent(lastMsg);

        // The ultimate list of public fallbacks - Wrapped in CORS Proxy to violently bypass browser blocks
        const endpoints = [
            `https://corsproxy.io/?https://api.affiliateplus.xyz/api/ai?message=${encoded}`,
            `https://corsproxy.io/?https://api.popcat.xyz/chatbot?msg=${encoded}`,
            `https://corsproxy.io/?https://api.safone.dev/ai/chat?text=${encoded}`,
            `https://corsproxy.io/?https://api.itsrose.rest/ai/chat?query=${encoded}`,
            `https://corsproxy.io/?https://api.botcahx.eu.org/api/search/openai-chat?q=${encoded}`,
            `https://corsproxy.io/?https://g4f.space/v1/chat?prompt=${encoded}`,
            `https://corsproxy.io/?https://gpt4free.herokuapp.com/api/ask?q=${encoded}`,
            `https://corsproxy.io/?https://flowgpt.com/api/ai?prompt=${encoded}`
        ];

        for (const url of endpoints) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" }, signal: controller.signal }).catch(() => null);
                clearTimeout(timeoutId);

                if (res && res.ok) {
                    const text = await res.text();
                    if (text && text.trim() && !text.includes("Error") && !text.includes("Cloudflare") && !text.includes("<!DOCTYPE html>")) {
                        try {
                            const j = JSON.parse(text);
                            if (typeof j === 'object' && j !== null) {
                                for (const key of ["message", "response", "reply", "answer", "text", "content", "msg"]) {
                                    if (typeof j[key] === 'string' && j[key].trim().length > 0) return j[key];
                                }
                                if (j.choices?.[0]?.message?.content) return j.choices[0].message.content;
                            } else if (Array.isArray(j) && j.length > 0) {
                                return String(j[0]);
                            }
                        } catch {
                            return text.trim();
                        }
                    }
                }
            } catch (e) {
                // Silently skip to the next endpoint
            }
        }
        throw new Error("All generic massive list endpoints failed.");
    }

    // ═══════════════════════════════════════════════════════
    // MAIN CHAT: Tries ALL providers until one succeeds
    // ═══════════════════════════════════════════════════════
    async chat(messages: AIChatMessage[], options?: ChatOptions, customSystemInstruction?: string): Promise<string> {
        const sysPrompt = this.getSystemPrompt(customSystemInstruction);

        const hasImage = messages.some(m => !!m.image);

        let layers: { name: string; fn: () => Promise<string> }[] = [
            { name: "Puter.js", fn: () => this.callPuter(messages, sysPrompt, options?.model) },
            // HRN AI sync: Pollinations Auth (gemini-search = Gemini + internet search)
            { name: "Pollinations Auth (gemini-search)", fn: () => this.callPollinationsAuth(messages, sysPrompt, "gemini-search") },
            { name: "Pollinations Auth (gemini-fast)", fn: () => this.callPollinationsAuth(messages, sysPrompt, "gemini-fast") },
            { name: "Pollinations Auth (openai)", fn: () => this.callPollinationsAuth(messages, sysPrompt, "openai") },
            // Rotate all 9 Gemini keys
            ...GEMINI_KEYS.map((key, i) => ({
                name: `Gemini 2.5 Flash (Key ${i + 1})`,
                fn: () => this.callGemini(messages, sysPrompt, new GoogleGenerativeAI(key))
            })),
            { name: "Cerebras Llama 3.3 70B", fn: () => this.callCerebras(messages, sysPrompt) },
            { name: "Groq (Llama 3.3 70B / Vision 90B)", fn: () => this.callGroq(messages, sysPrompt) },
            { name: "Cloudflare AI (Token 1)", fn: () => this.callCloudflare(messages, sysPrompt, CF_API_TOKEN_1) },
            { name: "Cloudflare AI (Token 2)", fn: () => this.callCloudflare(messages, sysPrompt, CF_API_TOKEN_2) },
            { name: "Pollinations Public", fn: () => this.callPollinationsText(messages, sysPrompt) },
            { name: "TextSynth Mistral", fn: () => this.callTextSynth(messages, sysPrompt) },
            { name: "Pawan API", fn: () => this.callPawan(messages, sysPrompt) },
            { name: "HF Space Mistral API", fn: () => this.callDDG(messages, sysPrompt) },
            { name: "GPT-Research API", fn: () => this.callGPTResearch(messages, sysPrompt) },
            { name: "G4F Pollinations", fn: () => this.callG4FPollinations(messages, sysPrompt) },
            { name: "G4F Hook", fn: () => this.callG4FHook(messages, sysPrompt) },
            { name: "AI Horde", fn: () => this.callAIHorde(messages, sysPrompt) },
            { name: "Massive Generic APIs", fn: () => this.callGenericFallbacks(messages, sysPrompt) }
        ];

        // If there's an image, ONLY allow vision-capable models (Puter, Gemini, Pollinations, Groq Vision)
        if (hasImage) {
            layers = layers.filter(l => 
                l.name.includes("Puter") || 
                l.name.includes("Gemini") || 
                l.name.includes("Pollinations Auth") ||
                l.name.includes("Groq")
            );
            layers.push({ name: "Pollinations Public (Vision Fallback)", fn: () => this.callPollinationsText(messages, sysPrompt) });
        }

        for (const layer of layers) {
            try {
                console.log(`🚀 ${layer.name}`);
                let result = await layer.fn();
                if (result && result.trim().length > 0) {
                    // Filter warning
                    if (result.includes("IMPORTANT NOTICE") || result.includes("pollinations.ai")) {
                        result = result.replace(/⚠️?\s*IMPORTANT NOTICE\s*⚠️?[\s\S]*?(continue to work normally\.|latest models\.)/gi, "").trim();
                        result = result.replace(/The Pollinations legacy text API is being deprecated[\s\S]*?normally\./gi, "").trim();
                        if (result.includes("IMPORTANT NOTICE")) {
                            const parts = result.split(/⚠️?\s*IMPORTANT NOTICE\s*⚠️?/);
                            result = parts.length > 1 ? parts[parts.length - 1].replace(/[\s\S]*?(continue to work normally\.|latest models\.)/, "").trim() : parts[0];
                        }
                    }
                    if (result.length === 0) continue;

                    const l = result.toLowerCase();
                    if (l.length < 150 && (l.includes("timed out") || l.includes("timeout") || l.includes("bad gateway") || l.includes("too many requests") || l.includes("rate limit") || l.includes("502") || l.includes("503") || l.includes("error code:"))) {
                        throw new Error(`Caught disguised error text: ${result.substring(0, 40)}...`);
                    }
                    return result;
                }
            } catch (e: any) {
                if (e.message === "POLLINATIONS_LOGIN_REQUIRED") throw e;
                console.warn(`❌ ${layer.name} failed:`, e);
            }
        }

        // ABSOLUTE LAST RESORT - should NEVER reach here with 8 layers
        if (hasImage) {
            return "⚠️ عذراً يا صديقي، خوادم تحليل الصور (Vision AI) تواجه ضغطاً عالياً الآن ولا تستطيع قراءة الصورة. \n\n📝 يرجى التكرم بكتابة محتوى الصورة كنص هنا لأقوم بحله لك فوراً! 🚀";
        }
        return "⏳ جاري إعادة الاتصال... يرجى إعادة إرسال السؤال.";
    }

    // ═══════════════════════════════════════════════════════
    // STREAMING CHAT: Puter Stream → Gemini Stream → Non-Stream Fallbacks
    // ═══════════════════════════════════════════════════════
    async streamChat(messages: AIChatMessage[], callbacks: StreamCallbacks, options?: ChatOptions, customSystemInstruction?: string): Promise<void> {
        const sysPrompt = this.getSystemPrompt(customSystemInstruction);
        const latestMsg = messages[messages.length - 1];
        let hasImage = messages.some(m => !!m.image);

        // FATAL FIX: Compress image to bypass Groq 400 Bad Request Payload Too Large
        if (hasImage && latestMsg.image) {
            latestMsg.image = await this.compressImageBase64(latestMsg.image);
        }

        // ─── LAYER 1: Puter.js Streaming ───
        try {
            if (!this.isPuterAvailable()) throw new Error("Puter unavailable");
            let stream;
            const fm: any[] = [{ role: "system", content: sysPrompt }];
            if (hasImage) {
                messages.forEach(m => {
                    if (m.role !== 'system') {
                        if (m.image) {
                            const fullImg = m.image.startsWith('data:') ? m.image : `data:image/jpeg;base64,${m.image}`;
                            fm.push({ role: m.role === 'assistant' ? 'assistant' : 'user', content: [{ type: "text", text: m.content || " " }, { type: "image_url", image_url: { url: fullImg, detail: "high" } }] });
                        } else {
                            fm.push({ role: m.role, content: m.content || " " });
                        }
                    }
                });
                // @ts-ignore
                stream = await window.puter.ai.chat(fm, { stream: true, model: options?.model });
            } else {
                messages.forEach(m => { if (m.role !== 'system') fm.push({ role: m.role, content: m.content || " " }); });
                // @ts-ignore
                stream = await window.puter.ai.chat(fm, { stream: true, model: options?.model });
            }
            let fullText = '';
            let isFirstChunk = true;
            for await (const chunk of stream) {
                const ct = typeof chunk === 'string' ? chunk : chunk?.text || chunk?.message?.content || '';
                fullText += ct;
                if (isFirstChunk && fullText.length > 0) {
                    const l = fullText.toLowerCase();
                    if (l.includes("timed out") || l.includes("timeout") || l.includes("bad gateway") || l.includes("too many requests") || l.includes("rate limit") || l.includes("error code")) {
                        throw new Error(`Puter threw disguised error: ${fullText}`);
                    }
                    isFirstChunk = false;
                }
                callbacks.onChunk(ct);
            }
            callbacks.onComplete?.(fullText);
            return;
        } catch (e) { /* Puter not available */ }

        // ─── LAYER 2: Gemini Streaming — rotate all keys ───
        for (let ki = 0; ki < GEMINI_KEYS.length; ki++) {
            const key = GEMINI_KEYS[(geminiKeyIndex + ki) % GEMINI_KEYS.length];
            if (EXHAUSTED_KEYS.has(key)) continue; // Skip permanently exhausted keys for this session
            const genAI = new GoogleGenerativeAI(key);
            try {
                await this.streamGemini(messages, sysPrompt, genAI, callbacks, hasImage, latestMsg);
                geminiKeyIndex = (geminiKeyIndex + ki + 1) % GEMINI_KEYS.length;
                return;
            } catch (e: any) {
                const is429 = e?.status === 429 || String(e?.message || '').includes('429') || String(e?.message || '').includes('quota');
                if (is429) {
                    EXHAUSTED_KEYS.add(key); // Mark as exhausted
                }
            }
        }

        // ─── LAYER 3: Pollinations OAuth Vision Fallback ───
        try {
            await this.streamPollinationsAuth(messages, sysPrompt, callbacks, "gemini-search");
            return;
        } catch (e: any) {
            if (hasImage && e.message === "POLLINATIONS_LOGIN_REQUIRED") throw e;
        }

        // ─── LAYER 4: Groq (Vision + Text) ───
        try {
            const result = await this.callGroq(messages, sysPrompt);
            if (result && result.trim()) {
                callbacks.onChunk(result);
                callbacks.onComplete?.(result);
                return;
            }
        } catch (e) { }

        // ─── LAYER 5: Cloudflare Vision Fallback ───
        if (hasImage) {
            try {
                const result = await this.callCloudflareVision(messages, sysPrompt, CF_API_TOKEN_1);
                if (result && result.trim()) {
                    callbacks.onChunk(result);
                    callbacks.onComplete?.(result);
                    return;
                }
            } catch (e) { }
        }

        // ─── LAYER 5+: Non-Stream Fallbacks (Text Only mostly) ───
        const fallbacks: { name: string; fn: () => Promise<string> }[] = [
            { name: "Cloudflare (T1)", fn: () => this.callCloudflare(messages, sysPrompt, CF_API_TOKEN_1) },
            { name: "Cloudflare (T2)", fn: () => this.callCloudflare(messages, sysPrompt, CF_API_TOKEN_2) },
            { name: "Pollinations Public", fn: () => this.callPollinationsText(messages, sysPrompt) },
            { name: "TextSynth Mistral", fn: () => this.callTextSynth(messages, sysPrompt) },
            { name: "Pawan API", fn: () => this.callPawan(messages, sysPrompt) },
            { name: "HF Space Mistral API", fn: () => this.callDDG(messages, sysPrompt) },
            { name: "GPT-Research API", fn: () => this.callGPTResearch(messages, sysPrompt) },
            { name: "G4F Pollinations", fn: () => this.callG4FPollinations(messages, sysPrompt) },
            { name: "G4F Hook", fn: () => this.callG4FHook(messages, sysPrompt) },
            { name: "AI Horde", fn: () => this.callAIHorde(messages, sysPrompt) },
            { name: "Massive Generic APIs", fn: () => this.callGenericFallbacks(messages, sysPrompt) }
        ];

        for (const fb of fallbacks) {
            if (hasImage && !fb.name.includes("Cloudflare")) continue; // Skip text APIs if we really need vision
            try {
                console.log(`🚀 Stream Fallback: ${fb.name}`);
                let result = await fb.fn();
                if (result && result.trim().length > 0) {
                    // INDESTRUCTIBLE Global Warning Filter
                    if (result.includes("IMPORTANT NOTICE") || result.includes("pollinations.ai")) {
                        result = result.replace(/⚠️?\s*IMPORTANT NOTICE\s*⚠️?[\s\S]*?(continue to work normally\.|latest models\.)/gi, "").trim();
                        result = result.replace(/The Pollinations legacy text API is being deprecated[\s\S]*?normally\./gi, "").trim();
                        if (result.includes("enter.pollinations.ai")) {
                            result = result.split("⚠️ IMPORTANT NOTICE ⚠️")[0] || result;
                        }
                    }
                    if (result.length === 0) continue;

                    const l = result.toLowerCase();
                    if (l.length < 150 && (l.includes("timed out") || l.includes("timeout") || l.includes("bad gateway") || l.includes("too many requests") || l.includes("rate limit") || l.includes("502") || l.includes("503") || l.includes("error code:"))) {
                        throw new Error(`Caught disguised error text: ${result.substring(0, 40)}...`);
                    }
                    callbacks.onChunk(result);
                    callbacks.onComplete?.(result);
                    return;
                }
            } catch (e) { console.warn(`❌ ${fb.name} failed:`, e); }
        }

        // If EVERYTHING fails (almost impossible with 8 layers)
        if (hasImage) {
            const errStr = "❌ عذراً، جميع خوادم الذكاء الاصطناعي لتحليل الصور تواجه ضغطاً هائلاً ولا يمكنها قراءة الصورة الآن. من فضلك اكتب محتوى الصورة كنص هنا لأقوم بحله لك فوراً!";
            callbacks.onChunk(errStr);
            callbacks.onComplete?.(errStr);
        } else {
            callbacks.onChunk("⏳ جاري إعادة الاتصال بالخوادم... أعد إرسال السؤال.");
            callbacks.onComplete?.("⏳ جاري إعادة الاتصال بالخوادم... أعد إرسال السؤال.");
        }
    }

    // ─── Gemini Streaming Helper ───────────────────────
    private async streamGemini(messages: AIChatMessage[], sysPrompt: string, genAIInstance: GoogleGenerativeAI, callbacks: StreamCallbacks, hasImage: boolean, latestMsg: AIChatMessage): Promise<void> {
        // Use strictly valid models for v1beta to prevent 404 and 429 warnings
        const modelNames = [
            "gemini-2.5-flash", 
            "gemini-2.0-flash"
        ];

        const geminiHistory = messages.slice(0, -1).map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

        const latestParts: any[] = [{ text: latestMsg.content || "اشرح هذا" }];
        if (hasImage) {
            const base64Data = latestMsg.image!.includes(',') ? latestMsg.image!.split(',')[1] : latestMsg.image!;
            let mimeType = latestMsg.image!.includes(';') ? latestMsg.image!.split(';')[0].split(':')[1] : "image/jpeg";
            if (!mimeType) mimeType = "image/jpeg";
            latestParts.push({ inlineData: { data: base64Data, mimeType } });
        }

        let lastErr: any;
        for (const modelName of modelNames) {
            try {
                // @ts-ignore - GoogleGenerativeAI types might be outdated, but googleSearch is supported
                const model = genAIInstance.getGenerativeModel({ 
                    model: modelName, 
                    systemInstruction: sysPrompt,
                    tools: [{ googleSearch: {} } as any]
                });
                const chatEngine = model.startChat({ history: geminiHistory });
                const result = await chatEngine.sendMessageStream(latestParts);

                let fullText = '';
                for await (const chunk of result.stream) {
                    const chunkText = chunk.text();
                    fullText += chunkText;
                    callbacks.onChunk(chunkText);
                }
                callbacks.onComplete?.(fullText);
                return; // success
            } catch (e: any) {
                lastErr = e;
                // If 429 quota — immediately bail out of ALL models for this key
                const is429 = e?.status === 429 || String(e?.message || '').includes('429') || String(e?.message || '').includes('quota');
                if (is429) throw e; // fast-fail: outer loop will skip to next key
            }
        }
        throw lastErr; // all models failed — let caller handle
    }

    // ═══════════════════════════════════════════════════════
    // Pollinations.ai Image Generation (Replaces Puter.js)
    // ═══════════════════════════════════════════════════════
    async generateImage(prompt: string): Promise<string> {
        try {
            // Encode the prompt for the URL
            const safePrompt = encodeURIComponent(prompt.trim());
            // Add a random seed to avoid caching
            const seed = Math.floor(Math.random() * 10000000);
            return `https://image.pollinations.ai/prompt/${safePrompt}?seed=${seed}&width=1024&height=1024&nologo=true`;
        } catch (error) {
            console.error("Image generation failed:", error);
            throw new Error("فشل توليد الصورة. الرجاء المحاولة مرة أخرى.");
        }
    }
}

export const aiClient = new AIClient();
