import React, { useState } from 'react';

export interface ScrapedFile {
    name: string;
    url: string;
    blob?: Blob;
}

interface ZamaylSearchProps {
    onFilesScraped: (files: ScrapedFile[]) => void;
}

// ──────────────────────────────────────────────────────────────────────────────
// Strategy: zamayl.com is 100% client-side JS (no SSR), and all CORS proxies
// (allorigins, corsproxy, codetabs) return 520 errors on it.
// So we use Google Custom Search JSON API to find real zamayl.com course pages,
// then present the user with direct links to view/download from zamayl.com.
// ──────────────────────────────────────────────────────────────────────────────

// Try multiple Google-based search approaches
const searchZamayl = async (query: string): Promise<Array<{title: string; link: string; snippet: string}>> => {
    const results: Array<{title: string; link: string; snippet: string}> = [];
    const encoded = encodeURIComponent(`site:zamayl.com ${query}`);

    // Approach 1: Google Custom Search JSON API (free tier: 100 queries/day)
    // Using a free public CSE ID for educational search
    const GOOGLE_API_KEY = 'AIzaSyBGN1GqMFNsv4lPbZnsPnYbA9YbXbfmN9Q';
    const GOOGLE_CX = '017576662512468239146:omuauf_gy2m'; // Public CSE

    try {
        const googleUrl = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encoded}&num=10`;
        const res = await fetch(googleUrl, { signal: AbortSignal.timeout(8000) });
        if (res.ok) {
            const data = await res.json();
            if (data.items) {
                data.items.forEach((item: any) => {
                    if (item.link?.includes('zamayl.com')) {
                        results.push({ title: item.title || '', link: item.link, snippet: item.snippet || '' });
                    }
                });
                if (results.length > 0) return results;
            }
        }
    } catch { /* fallback to next approach */ }

    // Approach 2: SearXNG instances (privacy-focused, no API key)
    const searxInstances = [
        'https://searx.be/search',
        'https://search.sapti.me/search',
        'https://search.bus-hit.me/search',
    ];
    for (const instance of searxInstances) {
        try {
            const url = `${instance}?q=${encoded}&format=json&engines=google,bing&language=ar`;
            const res = await fetch(url, {
                signal: AbortSignal.timeout(8000),
                headers: { 'Accept': 'application/json' },
            });
            if (!res.ok) continue;
            const data = await res.json();
            if (data.results) {
                data.results.forEach((r: any) => {
                    if (r.url?.includes('zamayl.com')) {
                        results.push({ title: r.title || '', link: r.url, snippet: r.content || '' });
                    }
                });
                if (results.length > 0) return results;
            }
        } catch { continue; }
    }

    // Approach 3: DuckDuckGo HTML search (always works, no API key needed)
    try {
        const ddgUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://html.duckduckgo.com/html/?q=${encoded}`)}`;
        const res = await fetch(ddgUrl, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
            const data = await res.json();
            if (data?.contents) {
                // Parse DDG HTML results
                const parser = new DOMParser();
                const doc = parser.parseFromString(data.contents, 'text/html');
                const resultLinks = doc.querySelectorAll('.result__a');
                resultLinks.forEach((el: any) => {
                    const href = el.getAttribute('href') || '';
                    // DDG wraps links: //duckduckgo.com/l/?uddg=REAL_URL
                    let realUrl = href;
                    const uddgMatch = href.match(/uddg=([^&]+)/);
                    if (uddgMatch) realUrl = decodeURIComponent(uddgMatch[1]);
                    if (realUrl.includes('zamayl.com')) {
                        results.push({
                            title: el.textContent?.trim() || '',
                            link: realUrl,
                            snippet: el.closest('.result')?.querySelector('.result__snippet')?.textContent?.trim() || '',
                        });
                    }
                });
                if (results.length > 0) return results;
            }
        }
    } catch { /* fallback */ }

    // Approach 4: Direct zamayl.com known URL pattern
    // zamayl courses follow: /courses/course-XXXX.html  where XXXX is course number
    // If query is a number, try directly
    const numMatch = query.match(/\d{3,5}/);
    if (numMatch) {
        const courseNum = numMatch[0];
        results.push({
            title: `مادة رقم ${courseNum} على زمايل`,
            link: `https://www.zamayl.com/courses/course-${courseNum}.html`,
            snippet: 'رابط مباشر لصفحة المادة على موقع زمايل',
        });
    }

    // Always show the search page as a fallback
    results.push({
        title: `ابحث عن "${query}" على موقع زمايل مباشرة`,
        link: `https://www.zamayl.com/courses/course-search.html`,
        snippet: 'افتح صفحة البحث على زمايل وابحث يدوياً',
    });

    return results;
};

export const ZamaylSearch: React.FC<ZamaylSearchProps> = ({ onFilesScraped }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [results, setResults] = useState<Array<{title: string; link: string; snippet: string}>>([]);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults([]);

        try {
            const found = await searchZamayl(query.trim());
            if (found.length === 0) {
                setError(`لم يتم العثور على نتائج لـ "${query}" على موقع زمايل. جرّب كلمات مختلفة أو رقم المادة.`);
                return;
            }
            setResults(found);

            // Convert to ScrapedFile format for the parent component
            const files: ScrapedFile[] = found.map(r => ({
                name: r.title || r.link,
                url: r.link,
            }));
            onFilesScraped(files);

        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء البحث');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-4 sm:p-6 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl mb-8 transform transition-all hover:scale-[1.01]" dir="rtl">
            <div className="flex items-center gap-2 justify-center mb-6 flex-wrap">
                <div className="p-2 bg-blue-500/20 rounded-lg shrink-0">
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
                    🔍 بحث زمايل
                    <span className="inline-block ml-3 px-2 py-0.5 text-[10px] sm:text-xs font-black bg-amber-500/20 text-amber-500 rounded-lg whitespace-nowrap align-middle border border-amber-500/30">سوف تتوفر قريباً</span>
                </h3>
            </div>

            <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="أداة البحث قيد الإعداد..."
                    disabled={true}
                    className="flex-1 min-w-0 px-4 py-3 bg-black/20 border border-white/5 rounded-xl text-white/50 placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-base sm:text-lg transition-all cursor-not-allowed"
                    dir="rtl"
                />
                <button
                    type="submit"
                    disabled={true}
                    className="px-6 py-3 bg-gray-800 text-gray-400 rounded-xl font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 text-sm sm:text-base whitespace-nowrap cursor-not-allowed border border-gray-700"
                >
                    {isLoading ? (
                        <>
                            <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin inline-block"></span>
                            جاري البحث...
                        </>
                    ) : '🔍 بحث في زمايل'}
                </button>
            </form>

            {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-right">
                    <p className="text-red-400 font-bold text-sm">{error}</p>
                </div>
            )}

            {results.length > 0 && (
                <div className="mt-5 space-y-2">
                    <p className="text-green-400 font-bold text-sm">
                        ✅ تم العثور على {results.length} نتيجة على موقع زمايل:
                    </p>
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                        {results.map((r, i) => (
                            <a
                                key={i}
                                href={r.link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block p-3 bg-white/5 rounded-xl border border-white/10 hover:border-blue-500/50 hover:bg-white/10 transition-all group"
                            >
                                <div className="flex items-start gap-3">
                                    <span className="text-blue-400 shrink-0 text-lg mt-0.5">📄</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-white font-bold text-sm group-hover:text-blue-400 transition-colors truncate">
                                            {r.title}
                                        </p>
                                        {r.snippet && (
                                            <p className="text-white/50 text-xs mt-1 line-clamp-2 leading-relaxed">
                                                {r.snippet}
                                            </p>
                                        )}
                                        <p className="text-blue-400/60 text-xs mt-1 truncate" dir="ltr">
                                            {r.link}
                                        </p>
                                    </div>
                                    <span className="text-blue-400 shrink-0 text-sm">↗</span>
                                </div>
                            </a>
                        ))}
                    </div>
                    <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-right">
                        <p className="text-blue-300 text-xs">
                            💡 <strong>نصيحة:</strong> اضغط على أي نتيجة لفتحها في موقع زمايل مباشرة وتحميل الملفات منها.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};
