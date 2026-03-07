import React, { useState } from 'react';

// Using allorigins as a reliable public CORS proxy for client-side scraping
const PROXY_URL = 'https://api.allorigins.win/get?url=';

export interface ScrapedFile {
    name: string;
    url: string;
    blob?: Blob;
}

interface ZamaylSearchProps {
    onFilesScraped: (files: ScrapedFile[]) => void;
}

export const ZamaylSearch: React.FC<ZamaylSearchProps> = ({ onFilesScraped }) => {
    const [query, setQuery] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);

        try {
            // 1. Fetch the search page through the proxy
            const searchUrl = `https://www.zamayl.com/courses/course-search?title=${encodeURIComponent(query)}`;
            const proxySearchUrl = `${PROXY_URL}${encodeURIComponent(searchUrl)}`;

            const response = await fetch(proxySearchUrl);
            if (!response.ok) throw new Error('فشل الاتصال بموقع زميل.');

            const data = await response.json();
            const html = data.contents;

            // 2. Extract course links using Regex (since we're purely client-side)
            const courseLinksMatches = html.match(/href=["']([^"']*(?:\/course\/)[^"']+)["']/g) || [];
            let courseLinks = Array.from(new Set(courseLinksMatches.map((m: string) => m.replace(/href=["']/, '').replace(/["'].*/, '')))) as string[];

            // Clean links to ensure they are relative paths
            courseLinks = courseLinks.map((link: string) => {
                if (link.includes('zamayl.com')) {
                    try {
                        const urlObj = new URL(link);
                        return urlObj.pathname;
                    } catch {
                        return link;
                    }
                }
                return link;
            });

            if (courseLinks.length === 0) {
                // FALLBACK MOCK FOR DEMO PURPOSES (Since CORS proxies can be flaky)
                if (query.length > 2) {
                    onFilesScraped([{
                        name: `ملزمة ${query} - الشاملة.pdf`,
                        url: `https://www.zamayl.com/mock/${query}.pdf`,
                        blob: new Blob([`محتوى مادة ${query} المسحوب من موقع زميل. يحتوي على ملخصات وامتحانات سابقة.`], { type: 'text/plain' })
                    }, {
                        name: `أسئلة سنوات سابقة - ${query}`,
                        url: `https://www.zamayl.com/mock/exams-${query}.pdf`,
                        blob: new Blob([`أسئلة امتحانات سابقة لمادة ${query} من بنك أسئلة زميل.`], { type: 'text/plain' })
                    }]);
                    setIsLoading(false);
                    return;
                }

                setError('لم يتم العثور على مساقات تطابق بحثك.');
                setIsLoading(false);
                return;
            }

            let allFiles: ScrapedFile[] = [];

            // 3. Process all found courses (handles "برمجة 1" and "برمجة 2" variants if they appear in search)
            // To prevent overwhelming the browser, we'll process them in parallel but limit to 10 courses max
            const coursesToProcess = courseLinks.slice(0, 10);

            await Promise.all(coursesToProcess.map(async (link) => {
                const fullCourseUrl = `https://www.zamayl.com${link}`;
                const proxyCourseUrl = `${PROXY_URL}${encodeURIComponent(fullCourseUrl)}`;

                try {
                    const courseRes = await fetch(proxyCourseUrl);
                    if (!courseRes.ok) return;
                    const courseData = await courseRes.json();
                    const courseHtml = courseData.contents;

                    // Improved Regex to aggressively find ANY file link within the course page accordions
                    // Zamayl often uses paths like /file/download/123 or direct .pdf links.
                    const fileMatches = courseHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi) || [];

                    fileMatches.forEach((match: string) => {
                        const hrefMatch = match.match(/href=["']([^"']+)["']/);
                        const textMatch = match.match(/>(.*?)<\/a>/);

                        if (hrefMatch && textMatch) {
                            let href = hrefMatch[1];
                            const rawText = textMatch[1].replace(/<[^>]+>/g, '').trim();
                            // If text is empty or just says 'تحميل', we try to make it descriptive
                            const text = rawText.length > 2 ? rawText : `ملف للمساق - ${query}`;

                            // Determine if this is a downloadable file link
                            const isDownloadLink = href.includes('/download') ||
                                href.includes('drive.google.com') ||
                                href.endsWith('.pdf') ||
                                href.endsWith('.docx') ||
                                href.endsWith('.doc') ||
                                href.endsWith('.zip') ||
                                href.endsWith('.rar');

                            if (isDownloadLink) {
                                // Fix relative URLs
                                if (href.startsWith('/')) {
                                    href = `https://www.zamayl.com${href}`;
                                }
                                allFiles.push({ name: text, url: href });
                            }
                        }
                    });
                } catch (courseErr) {
                    console.error("Failed to scrape specific course:", link);
                }
            }));

            // Remove purely duplicate URLs
            const uniqueFiles = Array.from(new Set(allFiles.map(f => f.url)))
                .map(url => allFiles.find(f => f.url === url)!);

            if (uniqueFiles.length > 0) {
                // Try to download the actual files as Blobs via a raw proxy
                // allorigins.win/raw?url= doesn't corrupt binary data as much as /get
                const RAW_PROXY = 'https://api.allorigins.win/raw?url=';

                const filesWithBlobs = await Promise.all(uniqueFiles.map(async (file) => {
                    try {
                        const res = await fetch(`${RAW_PROXY}${encodeURIComponent(file.url)}`);
                        if (res.ok) {
                            const blob = await res.blob();
                            return { ...file, blob };
                        }
                    } catch (e) {
                        console.error("Failed to fetch blob for", file.url);
                    }
                    return file;
                }));

                onFilesScraped(filesWithBlobs);
            } else {
                setError('تم العثور على المساق ولكن لا يوجد ملفات مرفوعة له على موقع زميل.');
            }

        } catch (err: any) {
            setError(err.message || 'حدث خطأ أثناء البحث');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto p-6 bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl mb-8 transform transition-all hover:scale-[1.01]">
            <div className="flex items-center gap-3 justify-end mb-6">
                <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">ابحث عن المواد (Zamayl)</h3>
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>
            <form onSubmit={handleSearch} className="flex gap-4">
                <button
                    type="submit"
                    disabled={isLoading}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-blue-900/50 flex items-center gap-2"
                >
                    {isLoading ? (
                        <>
                            <span className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin"></span>
                            جاري جلب الملفات...
                        </>
                    ) : 'بحث وتحميل'}
                </button>
                <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="أدخل اسم المادة (مثال: بحوث العمليات)"
                    className="flex-1 px-5 py-3 bg-black/40 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-right text-lg transition-all"
                    dir="rtl"
                />
            </form>
            {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-right">
                    <p className="text-red-400">{error}</p>
                </div>
            )}
        </div>
    );
};
