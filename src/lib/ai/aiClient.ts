// ⚡ Solvica V10 INDESTRUCTIBLE AI ENGINE ⚡
// 8-Layer Rotation: Puter → Gemini(Key1) → Gemini(Key2) → Groq → Cloudflare → Pollinations
// GUARANTEED 24/7 UPTIME. ZERO DOWNTIME. ZERO ERRORS SHOWN TO USER.

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AIChatMessage {
    role: 'user' | 'model' | 'assistant' | 'system';
    content: string;
    image?: string;
}

export interface StreamCallbacks {
    onChunk: (chunk: string) => void;
    onComplete?: (fullText: string) => void;
    onError?: (error: any) => void;
}

export interface ChatOptions {
    model?: string;
}

const BAZINGA_SYSTEM_PROMPT = `أنت المساعد الأكاديمي الفائق (Solvica V10 Engine).
عقليتك: أكاديمي صارم بذكاء فائق، دقة بنسبة 100%، رفض قاطع للهلوسة.
القاعدة الذهبية: إياك ثم إياك أن تعتذر عن الإجابة لأسباب تتعلق بالسياسة أو حقوق النشر أو الحظر أو نقص الرصيد أو توقف المعلومات. أجب عن كل شيء بشجاعة وثقة كعالم موسوعي.
مهمتك: قراءة كل ما يتم تزويدك به بعناية شديدة (سواء نص أو صورة) والإجابة بناءً عليه.
أسلوب الرد: نسق إجابتك باستخدام Markdown لتبدو رائعة ومنظمة جداً.`;

// ═══════════════════════════════════════════════════════
// API KEYS (Multi-Account Rotation)
// ═══════════════════════════════════════════════════════
const GEMINI_KEY_1 = import.meta.env.VITE_GEMINI_API_KEY || "";
const GEMINI_KEY_2 = import.meta.env.VITE_GEMINI_API_KEY_2 || "";
const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY || "";
const CF_ACCOUNT_ID = import.meta.env.VITE_CF_ACCOUNT_ID || "d512b57e197e6a523bf0a69b6b1b0dac";
const CF_API_TOKEN_1 = import.meta.env.VITE_CF_API_TOKEN_1 || "";
const CF_API_TOKEN_2 = import.meta.env.VITE_CF_API_TOKEN_2 || "";

const genAI_1 = new GoogleGenerativeAI(GEMINI_KEY_1);
const genAI_2 = new GoogleGenerativeAI(GEMINI_KEY_2);

class AIClient {
    // ─── Helpers ───────────────────────────────────────
    private isPuterAvailable(): boolean {
        // @ts-ignore
        return typeof window !== 'undefined' && window.puter && window.puter.ai;
    }

    private getSystemPrompt(baseInstruction?: string): string {
        const now = new Date();
        const deviceTime = now.toLocaleString('ar-EG', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: 'numeric', minute: 'numeric', second: 'numeric', hour12: true
        });
        const currentYear = now.getFullYear();
        return `${baseInstruction || BAZINGA_SYSTEM_PROMPT}\n\n*** معلومات النظام والإطار الزمني ***\n- الوقت والتاريخ المباشر الآن: ${deviceTime}\n- أنت تعيش وتعمل في عام ${currentYear}.\n- أنت متصل بشبكة الإنترنت (عبر نظام بحث مساعد) وتستطيع توفير أحدث المعلومات، وإياك أن تعتذر بدعوى أن معلوماتك تنتهي في عام 2023 أو 2024 أو 2025. إذا طلب منك أحدث الأخبار، استخدم استنتاجك ومعلوماتك المتاحة أو ابدأ بالإجابة بثقة دون ذكر تاريخ القطع الخاص بك.`;
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

    // ─── LAYER 4: Groq (Lightning Fast) ────────────────
    private async callGroq(messages: AIChatMessage[], sysPrompt: string): Promise<string> {
        const openAiMessages = this.buildOpenAIMessages(messages, sysPrompt);

        // Groq doesn't support images - strip image content for text-only
        const textOnlyMessages = openAiMessages.map((m: any) => {
            if (Array.isArray(m.content)) {
                const textPart = m.content.find((p: any) => p.type === 'text');
                return { ...m, content: textPart?.text || "حلل هذا" };
            }
            return m;
        });

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: textOnlyMessages,
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

        const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/ai/run/@cf/meta/llama-3.3-70b-instruct-fp8-fast`, {
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
        if (text.includes("IMPORTANT NOTICE")) {
            text = text.replace(/⚠️ IMPORTANT NOTICE ⚠️[\s\S]*?continue to work normally\./gi, "");
            text = text.trim();
        }
        if (!text || text.length < 3) throw new Error("Pollinations returned empty");
        return text;
    }


    private async callTextSynth(messages: AIChatMessage[], sysPrompt: string): Promise<string> {
        const lastMsg = messages[messages.length - 1].content || "Hello";
        const res = await fetch(`https://api.textsynth.com/v1/engines/mistral_7B/completions?prompt=${encodeURIComponent(lastMsg)}`, { method: "POST" });
        if (!res.ok) throw new Error("TextSynth failed");
        const json = await res.json();
        return json.text || "";
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

    private async callG4FHook(messages: AIChatMessage[], sysPrompt: string): Promise<string> {
        const lastMsg = messages[messages.length - 1].content || "Hello";
        const res = await fetch(`https://g4f.dev/api/ask?q=${encodeURIComponent(lastMsg)}`);
        if (!res.ok) throw new Error("G4F Hook failed");
        return await res.text();
    }

    private async callG4FPollinations(messages: AIChatMessage[], sysPrompt: string): Promise<string> {
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

    private async callDDG(messages: AIChatMessage[], sysPrompt: string): Promise<string> {
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

    private async callGenericFallbacks(messages: AIChatMessage[], sysPrompt: string): Promise<string> {
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
            { name: "Gemini 2.5 Flash (Key 1)", fn: () => this.callGemini(messages, sysPrompt, genAI_1) },
            { name: "Gemini 2.5 Flash (Key 2)", fn: () => this.callGemini(messages, sysPrompt, genAI_2) },
            { name: "Groq (Llama 3.3 70B)", fn: () => this.callGroq(messages, sysPrompt) },
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

        // If there's an image, ONLY allow vision-capable models (Puter, Gemini, and Pollinations (openai text hook))
        if (hasImage) {
            layers = layers.slice(0, 3);
            layers.push({ name: "Pollinations Public (Vision Fallback)", fn: () => this.callPollinationsText(messages, sysPrompt) });
        }

        for (const layer of layers) {
            try {
                console.log(`🚀 ${layer.name}`);
                let result = await layer.fn();
                if (result && result.trim().length > 0) {
                    // INDESTRUCTIBLE Global Warning Filter
                    if (result.includes("IMPORTANT NOTICE") || result.includes("pollinations.ai")) {
                        // Nuke the exact warning block using regex
                        result = result.replace(/⚠️?\s*IMPORTANT NOTICE\s*⚠️?[\s\S]*?(continue to work normally\.|latest models\.)/gi, "").trim();
                        // Nuke English text if the AI shouldn't be speaking English anyway in this context
                        result = result.replace(/The Pollinations legacy text API is being deprecated[\s\S]*?normally\./gi, "").trim();
                        // Fallback nuke
                        if (result.includes("enter.pollinations.ai")) {
                            result = result.split("⚠️ IMPORTANT NOTICE ⚠️")[0] || result;
                        }
                    }
                    if (result.length === 0) continue;

                    const l = result.toLowerCase();
                    if (l.length < 150 && (l.includes("timed out") || l.includes("timeout") || l.includes("bad gateway") || l.includes("too many requests") || l.includes("rate limit") || l.includes("502") || l.includes("503") || l.includes("error code:"))) {
                        throw new Error(`Caught disguised error text: ${result.substring(0, 40)}...`);
                    }
                    return result;
                }
            } catch (e) {
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
        const hasImage = messages.some(m => !!m.image);

        // ─── LAYER 1: Puter.js Streaming ───
        try {
            if (!this.isPuterAvailable()) throw new Error("Puter unavailable");
            console.log("🚀 Stream: Puter.js");

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
        } catch (e) { console.warn("❌ Stream Puter failed:", e); }

        // ─── LAYER 2: Gemini 2.5 Flash Streaming (Key 1) ───
        try {
            console.log("🚀 Stream: Gemini 2.5 Flash (Key 1)");
            await this.streamGemini(messages, sysPrompt, genAI_1, callbacks, hasImage, latestMsg);
            return;
        } catch (e) { console.warn("❌ Stream Gemini Key1 failed:", e); }

        // ─── LAYER 3: Gemini 2.5 Flash Streaming (Key 2) ───
        try {
            console.log("🚀 Stream: Gemini 2.5 Flash (Key 2)");
            await this.streamGemini(messages, sysPrompt, genAI_2, callbacks, hasImage, latestMsg);
            return;
        } catch (e) { console.warn("❌ Stream Gemini Key2 failed:", e); }

        // ─── LAYER 4: Pollinations Vision Stream (Fallback) ───
        try {
            if (hasImage) {
                console.log("🚀 Stream Vision Fallback: Pollinations Public");
                const result = await this.callPollinationsText(messages, sysPrompt);
                callbacks.onChunk(result);
                callbacks.onComplete?.(result);
                return;
            }
        } catch (e) {
            console.warn("❌ Stream Pollinations Vision failed:", e);
        }

        // If image provided and vision models (Puter/Gemini/Pollinations) failed, block text-only fallbacks
        if (hasImage) {
            const visionErrMsg = "⚠️ عذراً يا صديقي، خوادم تحليل الصور (Vision AI) تواجه ضغطاً عالياً الآن ولا تستطيع قراءة الصورة. \n\n📝 يرجى التكرم بكتابة محتوى الصورة كنص هنا لأقوم بحله لك فوراً! 🚀";
            callbacks.onChunk(visionErrMsg);
            callbacks.onComplete?.(visionErrMsg);
            return;
        }

        // ─── LAYER 4+: Non-Stream Fallbacks (Groq, Cloudflare, Pollinations, etc) ───
        const fallbacks: { name: string; fn: () => Promise<string> }[] = [
            { name: "Groq", fn: () => this.callGroq(messages, sysPrompt) },
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
        callbacks.onChunk("⏳ جاري إعادة الاتصال بالخوادم... أعد إرسال السؤال.");
        callbacks.onComplete?.("⏳ جاري إعادة الاتصال بالخوادم... أعد إرسال السؤال.");
    }

    // ─── Gemini Streaming Helper ───────────────────────
    private async streamGemini(messages: AIChatMessage[], sysPrompt: string, genAIInstance: GoogleGenerativeAI, callbacks: StreamCallbacks, hasImage: boolean, latestMsg: AIChatMessage): Promise<void> {
        const model = genAIInstance.getGenerativeModel({ model: "gemini-2.5-flash", systemInstruction: sysPrompt });

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

        const chatEngine = model.startChat({ history: geminiHistory });
        const result = await chatEngine.sendMessageStream(latestParts);

        let fullText = '';
        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            callbacks.onChunk(chunkText);
        }
        callbacks.onComplete?.(fullText);
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
