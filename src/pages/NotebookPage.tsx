import { useState } from 'react';
import { NotebookChat } from '../components/NotebookLM/NotebookChat';
import { ZamaylSearch } from '../components/NotebookLM/ZamaylSearch';

export default function NotebookPage() {
    const [scrapedFiles, setScrapedFiles] = useState<{ name: string, url: string }[]>([]);

    const handleZamaylFiles = async (files: { name: string, url: string }[]) => {
        setScrapedFiles(files);
        // In a full implementation, we would download the files here, parse them, 
        // and add them to the globalVectorStore.
        // For now, we just show that we found them.
        alert(`تم العثور على ${files.length} ملفات من زميل. سيتم برمجتها للتحميل لاحقاً.`);
    };

    return (
        <div className="min-h-screen bg-[#0f172a] bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] text-white p-6 pt-12">
            <div className="max-w-5xl mx-auto mb-8 text-center" dir="rtl">
                <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400 mb-4">
                    مساعدك الذكي (NotebookLM)
                </h1>
                <p className="text-gray-400 text-lg">
                    ارفع ملفاتك أو ابحث في موقع "زميل"، وسيقوم الذكاء الاصطناعي بفهمها وشرحها لك بدقة.
                </p>
            </div>

            <ZamaylSearch onFilesScraped={handleZamaylFiles} />

            {scrapedFiles.length > 0 && (
                <div className="max-w-2xl mx-auto mb-6 bg-white/5 border border-white/10 p-4 rounded-xl" dir="rtl">
                    <h4 className="text-lg font-bold text-blue-300 mb-2">الملفات المستخرجة من زميل:</h4>
                    <ul className="list-disc list-inside space-y-1">
                        {scrapedFiles.slice(0, 5).map((f, i) => (
                            <li key={i} className="text-gray-300 truncate">
                                <a href={f.url} target="_blank" rel="noreferrer" className="hover:text-blue-400 hover:underline">
                                    {f.name}
                                </a>
                            </li>
                        ))}
                        {scrapedFiles.length > 5 && <li className="text-gray-500">...و المزيد من الملفات</li>}
                    </ul>
                </div>
            )}

            <NotebookChat />
        </div>
    );
}
