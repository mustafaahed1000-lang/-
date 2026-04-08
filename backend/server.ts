// Simple Express Proxy/Scraper for Zamayl.com + بث ذكاء اصطناعي آمن للإنتاج (مفتاح Gemini على السيرفر فقط)
import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { GoogleGenerativeAI, type Part } from '@google/generative-ai';
import { createHash } from 'crypto';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

const corsOrigin = process.env.CORS_ORIGIN;
app.use(cors({
    origin: corsOrigin ? corsOrigin.split(',').map(s => s.trim()) : true,
    methods: ['GET', 'POST', 'OPTIONS'],
}));
app.use(express.json({ limit: '18mb' }));

// CORS_ORIGIN للإنتاج: https://yourdomain.com (فاصلة لعدة نطاقات)
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * ─────────────────────────────────────────────────────────────────────
 * AI Orchestrator (Server-only)
 * - Provider fallback: Gemini -> Pollinations -> Groq
 * - Retries + Timeouts
 * - Circuit breaker per provider
 * - In-memory cache for repeated prompts
 * - Global queue + concurrency limit
 * - Per-student/IP burst rate limit
 * ─────────────────────────────────────────────────────────────────────
 */
type InMsg = { role: string; content: string; image?: { data: string; mimeType?: string } };
type AiPayload = { messages?: InMsg[]; systemInstruction?: string };
type ProviderName = 'gemini' | 'pollinations' | 'groq';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY?.trim() || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
const POLLINATIONS_API_KEY = process.env.POLLINATIONS_API_KEY?.trim() || '';
const POLLINATIONS_FALLBACK_KEYS = (process.env.POLLINATIONS_FALLBACK_KEYS || '')
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);
const POLLINATIONS_BASE = process.env.POLLINATIONS_BASE?.trim() || 'https://gen.pollinations.ai';
const GROQ_API_KEY = process.env.GROQ_API_KEY?.trim() || '';
const GROQ_MODEL_TEXT = process.env.GROQ_MODEL_TEXT?.trim() || 'llama-3.3-70b-versatile';

const MAX_CONCURRENT_AI = Math.max(1, parseInt(process.env.AI_MAX_CONCURRENCY || '4', 10) || 4);
let activeAiJobs = 0;
const aiQueue: Array<() => void> = [];

function runQueued<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
        const start = () => {
            activeAiJobs++;
            fn()
                .then(resolve)
                .catch(reject)
                .finally(() => {
                    activeAiJobs--;
                    const next = aiQueue.shift();
                    if (next) next();
                });
        };
        if (activeAiJobs < MAX_CONCURRENT_AI) start();
        else aiQueue.push(start);
    });
}

const studentBurst = new Map<string, { count: number; resetAt: number }>();
function burstAllow(studentKey: string): boolean {
    const now = Date.now();
    const winMs = 60_000;
    const maxReq = 35;
    const prev = studentBurst.get(studentKey);
    if (!prev || now >= prev.resetAt) {
        studentBurst.set(studentKey, { count: 1, resetAt: now + winMs });
        return true;
    }
    if (prev.count >= maxReq) return false;
    prev.count++;
    return true;
}

const cache = new Map<string, { text: string; exp: number }>();
const CACHE_TTL_MS = 8 * 60_1000;
function cacheKey(payload: Required<AiPayload>): string {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
}

const breaker = new Map<ProviderName, { failures: number; openUntil: number }>([
    ['gemini', { failures: 0, openUntil: 0 }],
    ['pollinations', { failures: 0, openUntil: 0 }],
    ['groq', { failures: 0, openUntil: 0 }],
]);
const BREAKER_FAILS = 3;
const BREAKER_OPEN_MS = 45_000;
function breakerOpen(name: ProviderName): boolean {
    const b = breaker.get(name)!;
    return Date.now() < b.openUntil;
}
function breakerOk(name: ProviderName) {
    const b = breaker.get(name)!;
    b.failures = 0;
    b.openUntil = 0;
}
function breakerFail(name: ProviderName) {
    const b = breaker.get(name)!;
    b.failures++;
    if (b.failures >= BREAKER_FAILS) {
        b.openUntil = Date.now() + BREAKER_OPEN_MS;
        b.failures = 0;
    }
}

function sanitizeMessagesForProvider(messages: InMsg[]): InMsg[] {
    const maxPerMsg = 9000;
    return messages.map((m, i) => {
        const isLast = i === messages.length - 1;
        const cap = isLast ? 65_000 : maxPerMsg;
        const content = String(m.content || '');
        if (content.length <= cap) return m;
        return {
            ...m,
            content: content.slice(0, cap - 4000) + '\n\n...[مختصر تلقائياً]...\n\n' + content.slice(-3500),
        };
    });
}

async function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    return await Promise.race([
        p,
        new Promise<T>((_, rej) => setTimeout(() => rej(new Error(`timeout_${ms}`)), ms)),
    ]);
}

async function withRetry<T>(fn: () => Promise<T>, tries = 2, waitMs = 700): Promise<T> {
    let lastErr: unknown;
    for (let i = 0; i < tries; i++) {
        try {
            return await fn();
        } catch (e) {
            lastErr = e;
            if (i < tries - 1) await sleep(waitMs * (i + 1));
        }
    }
    throw lastErr;
}

function toOpenAiMessages(messages: InMsg[], systemInstruction?: string): any[] {
    const out: any[] = [];
    if (systemInstruction?.trim()) out.push({ role: 'system', content: systemInstruction });
    for (const m of messages) {
        const role = m.role === 'assistant' || m.role === 'model' ? 'assistant' : 'user';
        if (m.image?.data && String(m.image.data).length > 40) {
            out.push({
                role: 'user',
                content: [
                    { type: 'text', text: String(m.content || '').slice(0, 9000) },
                    { type: 'image_url', image_url: { url: `data:${m.image.mimeType || 'image/jpeg'};base64,${m.image.data}` } },
                ],
            });
        } else {
            out.push({ role, content: String(m.content || '') });
        }
    }
    return out;
}

function tokenizeArabicLite(s: string): string[] {
    return String(s || '')
        .toLowerCase()
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .split(/\s+/)
        .map(t => t.trim())
        .filter(t => t.length >= 3);
}

function normalizeArabicLiteText(s: string): string {
    return String(s || '')
        .toLowerCase()
        .replace(/[إأآا]/g, 'ا')
        .replace(/ى/g, 'ي')
        .replace(/ة/g, 'ه')
        .replace(/[ً-ْ]/g, '')
        .replace(/[^\p{L}\p{N}\s]/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function splitSentencesLite(s: string): string[] {
    return String(s || '')
        .split(/[\n\r]+|(?<=[.!؟؛:])\s+/)
        .map(x => x.trim())
        .filter(Boolean);
}

function extractChoiceCandidatesLite(question: string): string[] {
    const afterQMark = question.split(/[؟?]/).slice(1).join(' ').trim() || question;
    const rawParts = afterQMark
        .replace(/\b(?:الخيار الصحيح|هو|هي|صح|خطأ)\b/gi, ' ')
        .replace(/[()]/g, ' ')
        .split(/[\n\.\u060C،;؛]+/)
        .map(s => s.trim())
        .filter(Boolean);
    const uniq: string[] = [];
    for (const p of rawParts) {
        if (p.length < 2 || p.length > 80) continue;
        if (!uniq.includes(p)) uniq.push(p);
    }
    return uniq.slice(0, 8);
}

function buildEmergencyAnswer(payload: Required<AiPayload>): string {
    const last = payload.messages[payload.messages.length - 1];
    const raw = String(last?.content || '').trim();
    const qMatch = raw.match(/السؤال من الطالب[\s\S]*?:\s*([\s\S]*?)(?:\n\[أمر|$)/);
    const cMatch = raw.match(/### 📚 \[نصوص المجلد الدراسي الحصري\]:\n([\s\S]*?)\n\n---/);
    const question = (qMatch?.[1] || raw || 'السؤال').trim();
    const context = (cMatch?.[1] || '').trim();

    if (/^\s*(مرحبا|اهلا|أهلا|السلام عليكم)\s*$/i.test(question)) {
        return 'مرحباً! أنا معك وجاهز للإجابة بدقة. اكتب سؤالك مباشرة.';
    }
    if (/كيفك|شلونك|اخبارك/i.test(question)) {
        return 'أنا بخير وجاهز للمساعدة. اكتب سؤالك الآن وسأجيبك مباشرة.';
    }
    if (/شو اسمك|ما اسمك|مين انت|من انت/i.test(question)) {
        return 'أنا Solvica، مساعدك الأكاديمي الذكي.';
    }

    if (/صح\s*خطأ|خطأ\s*صح/i.test(question)) {
        const stmt = question.split(/صح\s*خطأ|خطأ\s*صح/i)[0]?.trim() || question;
        const qTokens = tokenizeArabicLite(stmt);
        const cLow = context.toLowerCase();
        const hit = qTokens.filter(t => cLow.includes(t)).length;
        const ratio = qTokens.length ? hit / qTokens.length : 0;
        const verdict = ratio >= 0.45 ? 'صح' : 'خطأ';
        return `✅ الخيار الصحيح هو: ${verdict}\n\nالترجيح مبني على النص المرفق مباشرة.`;
    }

    const options = extractChoiceCandidatesLite(question);
    if (options.length >= 2 && context.length > 40) {
        const cNorm = normalizeArabicLiteText(context);
        const scored = options
            .map(o => {
                const toks = tokenizeArabicLite(o);
                const oNorm = normalizeArabicLiteText(o);
                const tokenScore = toks.reduce((n, t) => n + (cNorm.includes(normalizeArabicLiteText(t)) ? 1 : 0), 0);
                const exactBonus = oNorm && cNorm.includes(oNorm) ? 5 : 0;
                return { o, score: tokenScore + exactBonus };
            })
            .sort((a, b) => b.score - a.score);
        const best = scored[0];
        if (best && best.score > 0) return `✅ الخيار الصحيح هو: ${best.o}`;
    }

    if (context.length > 40) {
        const qTokens = tokenizeArabicLite(question);
        const ranked = splitSentencesLite(context)
            .map(s => {
                const low = s.toLowerCase();
                const score = qTokens.reduce((n, t) => n + (low.includes(t) ? 1 : 0), 0);
                return { s, score };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, 3)
            .map(x => x.s);
        if (ranked.length) return `✅ الإجابة:\n- ${ranked.join('\n- ')}`;
    }

    return '✅ سأجيبك مباشرة. اكتب السؤال كاملًا مع الخيارات، أو أرسل صورة السؤال بوضوح.';
}

async function callGemini(messages: InMsg[], systemInstruction?: string): Promise<string> {
    if (!GEMINI_API_KEY) throw new Error('gemini_key_missing');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL, systemInstruction: systemInstruction || undefined });
    const history = messages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' || m.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(m.content || '') }],
    }));
    const last = messages[messages.length - 1];
    const parts: Part[] = [{ text: String(last?.content || '') }];
    if (last?.image?.data && String(last.image.data).length > 40) {
        parts.push({
            inlineData: {
                data: String(last.image.data).replace(/^data:[^;]+;base64,/, ''),
                mimeType: last.image.mimeType?.trim() || 'image/jpeg',
            },
        });
    }
    const chat = model.startChat({ history });
    const res = await chat.sendMessage(parts);
    const t = res.response.text();
    if (!t?.trim()) throw new Error('gemini_empty');
    return t;
}

async function callPollinations(messages: InMsg[], systemInstruction: string | undefined, apiKey: string): Promise<string> {
    if (!apiKey) throw new Error('pollinations_key_missing');
    const body = {
        model: 'gemini-fast',
        messages: toOpenAiMessages(messages, systemInstruction),
        max_tokens: 2048,
        stream: false,
    };
    const res = await axios.post(`${POLLINATIONS_BASE}/v1/chat/completions`, body, {
        headers: { Authorization: `Bearer ${apiKey}` },
        timeout: 50_000,
        validateStatus: () => true,
    });
    if (res.status < 200 || res.status >= 300) throw new Error(`pollinations_${res.status}`);
    const t = res.data?.choices?.[0]?.message?.content || '';
    if (!String(t).trim()) throw new Error('pollinations_empty');
    return String(t);
}

function getPollinationsCandidateKeys(studentKey?: string): string[] {
    const keys = [studentKey || '', POLLINATIONS_API_KEY, ...POLLINATIONS_FALLBACK_KEYS]
        .map(k => String(k || '').trim())
        .filter(Boolean);
    return Array.from(new Set(keys));
}

async function callGroq(messages: InMsg[], systemInstruction?: string): Promise<string> {
    if (!GROQ_API_KEY) throw new Error('groq_key_missing');
    const openAi = toOpenAiMessages(messages, systemInstruction).map((m: any) => {
        if (Array.isArray(m.content)) {
            const textPart = m.content.find((p: any) => p.type === 'text');
            return { role: m.role, content: String(textPart?.text || 'حلل هذا').slice(0, 7000) };
        }
        return { role: m.role, content: String(m.content || '').slice(0, 7000) };
    });
    const res = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        { model: GROQ_MODEL_TEXT, messages: openAi, max_tokens: 900 },
        {
            headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
            timeout: 35_000,
            validateStatus: () => true,
        }
    );
    if (res.status < 200 || res.status >= 300) throw new Error(`groq_${res.status}`);
    const t = res.data?.choices?.[0]?.message?.content || '';
    if (!String(t).trim()) throw new Error('groq_empty');
    return String(t);
}

async function runAiOrchestrator(
    payload: Required<AiPayload>,
    studentPollinationsKey?: string
): Promise<{ text: string; provider: ProviderName | 'cache' | 'emergency' }> {
    const key = cacheKey(payload);
    const cached = cache.get(key);
    if (cached && cached.exp > Date.now()) return { text: cached.text, provider: 'cache' };

    const pollKeys = getPollinationsCandidateKeys(studentPollinationsKey);
    const sequence: Array<{ name: ProviderName; fn: () => Promise<string>; timeout: number }> = [
        { name: 'gemini', fn: () => callGemini(payload.messages, payload.systemInstruction), timeout: 45_000 },
        {
            name: 'pollinations',
            fn: async () => {
                let lastErr: unknown;
                for (const key of pollKeys) {
                    try {
                        return await callPollinations(payload.messages, payload.systemInstruction, key);
                    } catch (e) {
                        lastErr = e;
                    }
                }
                throw lastErr || new Error('pollinations_all_keys_failed');
            },
            timeout: 55_000,
        },
        { name: 'groq', fn: () => callGroq(payload.messages, payload.systemInstruction), timeout: 35_000 },
    ];

    for (const p of sequence) {
        if (breakerOpen(p.name)) continue;
        try {
            const text = await withRetry(() => withTimeout(p.fn(), p.timeout), 2, 800);
            breakerOk(p.name);
            cache.set(key, { text, exp: Date.now() + CACHE_TTL_MS });
            return { text, provider: p.name };
        } catch {
            breakerFail(p.name);
        }
    }

    return {
        text: buildEmergencyAnswer(payload),
        provider: 'emergency',
    };
}

function getStudentKey(req: Request): string {
    const sid = String(req.headers['x-student-id'] || '').trim();
    if (sid) return `sid:${sid}`;
    return `ip:${req.ip || 'unknown'}`;
}

app.post('/api/ai/chat', async (req: Request, res: Response) => {
    const body = req.body as AiPayload;
    if (!Array.isArray(body?.messages) || body.messages.length === 0) {
        res.status(400).json({ error: 'messages array required' });
        return;
    }
    const studentKey = getStudentKey(req);
    const studentPollinationsKey = String(req.headers['x-user-pollinations-key'] || '').trim();
    if (!burstAllow(studentKey)) {
        res.status(429).json({ error: 'rate_limited', message: 'Too many requests, please retry shortly.' });
        return;
    }
    const payload: Required<AiPayload> = {
        messages: sanitizeMessagesForProvider(body.messages),
        systemInstruction: String(body.systemInstruction || ''),
    };
    try {
        const out = await runQueued(() => runAiOrchestrator(payload, studentPollinationsKey));
        res.json({ text: out.text, provider: out.provider, queued: aiQueue.length, active: activeAiJobs });
    } catch (e: any) {
        res.status(500).json({ error: String(e?.message || e) });
    }
});

app.post('/api/ai/chat-stream', async (req: Request, res: Response) => {
    const body = req.body as AiPayload;
    if (!Array.isArray(body?.messages) || body.messages.length === 0) {
        res.status(400).json({ error: 'messages array required' });
        return;
    }
    const studentKey = getStudentKey(req);
    const studentPollinationsKey = String(req.headers['x-user-pollinations-key'] || '').trim();
    if (!burstAllow(studentKey)) {
        res.status(429).json({ error: 'rate_limited' });
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();

    const sendSse = (obj: object | string) => {
        if (typeof obj === 'string') res.write(`data: ${obj}\n\n`);
        else res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    const payload: Required<AiPayload> = {
        messages: sanitizeMessagesForProvider(body.messages),
        systemInstruction: String(body.systemInstruction || ''),
    };

    try {
        const out = await runQueued(() => runAiOrchestrator(payload, studentPollinationsKey));
        const chunks = String(out.text).match(/[\s\S]{1,350}/g) || [String(out.text)];
        for (const c of chunks) {
            sendSse({ t: c });
            await sleep(6);
        }
        sendSse('[DONE]');
        res.end();
    } catch (e: any) {
        sendSse({ error: String(e?.message || e) });
        res.end();
    }
});

app.get('/api/admin/ai-health', async (_req: Request, res: Response) => {
    const state: Record<string, any> = {};
    for (const [k, v] of breaker.entries()) {
        state[k] = {
            open: Date.now() < v.openUntil,
            openUntil: v.openUntil,
            failures: v.failures,
        };
    }
    let pollinationsBalance: any = null;
    if (POLLINATIONS_API_KEY) {
        try {
            const bal = await axios.get(`${POLLINATIONS_BASE}/account/balance`, {
                headers: { Authorization: `Bearer ${POLLINATIONS_API_KEY}` },
                timeout: 10_000,
                validateStatus: () => true,
            });
            pollinationsBalance = { status: bal.status, data: bal.data };
        } catch (e: any) {
            pollinationsBalance = { error: String(e?.message || e) };
        }
    }
    res.json({
        ok: true,
        queue: { active: activeAiJobs, pending: aiQueue.length, maxConcurrent: MAX_CONCURRENT_AI },
        providers: state,
        cacheSize: cache.size,
        pollinationsFallbackKeys: POLLINATIONS_FALLBACK_KEYS.length,
        pollinationsBalance,
    });
});

// Endpoint to search and scrape files
app.get('/api/scrape/zamayl', async (req: Request, res: Response) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query parameter 'q'" });

    try {
        console.log(`Scraping Zamayl for: ${query}`);
        // 1. Search for the course
        const searchUrl = `https://www.zamayl.com/courses/course-search?title=${encodeURIComponent(query as string)}`;
        const searchResponse = await axios.get(searchUrl);
        const $ = cheerio.load(searchResponse.data);

        // Find course links from the search results
        const courseLinks: string[] = [];
        $('a[href*="/course/"]').each((_i, el) => {
            const href = $(el).attr('href');
            if (href && !courseLinks.includes(href)) {
                // Ensure full URL
                courseLinks.push(href.startsWith('http') ? href : `https://www.zamayl.com${href}`);
            }
        });

        console.log(`Found ${courseLinks.length} potential courses.`);

        let allFiles: { name: string, url: string }[] = [];

        // 2. For each course found, scrape the files
        // (Limit to first 3 to avoid taking too long/getting banned)
        for (const courseUrl of courseLinks.slice(0, 3)) {
            try {
                const courseRes = await axios.get(courseUrl);
                const $course = cheerio.load(courseRes.data);

                // Usually files are in links containing 'download' or ending in .pdf/.docx
                $course('a').each((_i, el) => {
                    const href = $course(el).attr('href');
                    const text = $course(el).text().trim() || 'ملف';

                    if (href && (href.includes('/download') || href.endsWith('.pdf') || href.endsWith('.docx') || href.endsWith('.doc'))) {
                        const fullUrl = href.startsWith('http') ? href : `https://www.zamayl.com${href}`;
                        allFiles.push({ name: text, url: fullUrl });
                    }
                });
            } catch (e) {
                console.error(`Error scraping course ${courseUrl}`, e);
            }
        }

        // Remove duplicates
        const uniqueFiles = Array.from(new Set(allFiles.map(f => f.url)))
            .map(url => allFiles.find(f => f.url === url)!);

        res.json({ success: true, files: uniqueFiles });

    } catch (error: any) {
        console.error("Scraping error:", error.message);
        res.status(500).json({ error: "Failed to scrape Zamayl", details: error.message });
    }
});

// ==========================================
// V9 Deep OSINT Engine (Ashok & OpenClaw)
// ==========================================

// 1. Ashok: Deep Web & Google Crawler
app.get('/api/osint/search', async (req: Request, res: Response) => {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Missing query parameter 'q'" });

    try {
        console.log(`[Ashok] Deep Searching: ${query}`);
        // Simple Google Scraper logic (simulating Ashok OSINT)
        const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query as string)}`;
        const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
        const response = await axios.get(searchUrl, { headers });
        const $ = cheerio.load(response.data);

        const results: { title: string, snippet: string, link: string }[] = [];
        $('.result').each((i, el) => {
            if (i >= 5) return; // Top 5
            const title = $(el).find('.result__title').text().trim();
            const snippet = $(el).find('.result__snippet').text().trim();
            const link = $(el).find('.result__url').attr('href') || '';
            if (title && snippet) results.push({ title, snippet, link });
        });

        res.json({ source: 'Ashok-OSINT', query, results });
    } catch (error: any) {
        res.status(500).json({ error: "OSINT Search failed", details: error.message });
    }
});

// 2. Ashok: Wayback Machine Crawler
app.get('/api/osint/wayback', async (req: Request, res: Response) => {
    const domain = req.query.domain;
    if (!domain) return res.status(400).json({ error: "Missing domain parameter" });

    try {
        const response = await axios.get(`http://web.archive.org/cdx/search/cdx?url=${domain}/*&output=json&limit=5`);
        res.json({ source: 'Ashok-Wayback', domain, snapshots: response.data });
    } catch (error: any) {
        res.status(500).json({ error: "Wayback failed", details: error.message });
    }
});

// 3. Ashok: GitHub Info Extractor
app.get('/api/osint/github', async (req: Request, res: Response) => {
    const user = req.query.user;
    if (!user) return res.status(400).json({ error: "Missing user" });

    try {
        const response = await axios.get(`https://api.github.com/users/${user}`);
        res.json({ source: 'Ashok-GitHub', info: response.data });
    } catch (error: any) {
        res.status(500).json({ error: "GitHub extraction failed", details: error.message });
    }
});

// 4. API Radar: API Discovery Engine
app.get('/api/radar/discover', async (req: Request, res: Response) => {
    const topic = req.query.topic;
    res.json({
        source: 'APIRadar',
        description: `Simulated API Discovery for Bazinga Engine on topic: ${topic || 'General'}`,
        suggested_apis: [
            { name: "Publicis APIs", type: "REST", link: "https://apiradar.live" },
            { name: "OpenMeteo Weather", type: "REST", link: "https://open-meteo.com" }
        ]
    });
});

app.listen(PORT, () => {
    console.log(`Solvica API: http://localhost:${PORT} (Zamayl scrape + POST /api/ai/chat-stream — ضع GEMINI_API_KEY في البيئة)`);
});
