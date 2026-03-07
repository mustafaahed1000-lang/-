import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import AppLayout from '../layouts/AppLayout';
import { db } from '../lib/db/database';
import { processDocument } from '../lib/rag/documentParser';
import type { ParsedDocument } from '../lib/rag/documentParser';
import { globalVectorStore } from '../lib/rag/vectorStore';
import { DocumentUploader } from '../components/NotebookLM/DocumentUploader';
import { ZamaylSearch } from '../components/NotebookLM/ZamaylSearch';
import type { ScrapedFile } from '../components/NotebookLM/ZamaylSearch';
import { FileText, Trash2, Search, UploadCloud, Plus, AlertTriangle, FolderPlus } from 'lucide-react';

export default function FilesPage() {
    const [savedDocs, setSavedDocs] = useState<ParsedDocument[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeTab, setActiveTab] = useState<'create_folder' | 'search'>('create_folder');
    const [viewingDoc, setViewingDoc] = useState<ParsedDocument | null>(null);
    const [activeSubject, setActiveSubject] = useState<string | null>(null);
    const [subjectInput, setSubjectInput] = useState<string>('مقرر عام');
    const [folderToDelete, setFolderToDelete] = useState<string | null>(null);
    const folderUploadRef = useRef<HTMLInputElement>(null);

    const [docxHtml, setDocxHtml] = useState<string | null>(null);
    const [isGeneratingDocx, setIsGeneratingDocx] = useState(false);

    useEffect(() => {
        loadDocs();
    }, []);

    useEffect(() => {
        if (viewingDoc && (viewingDoc.filename.toLowerCase().endsWith('.docx') || viewingDoc.filename.toLowerCase().endsWith('.doc'))) {
            setIsGeneratingDocx(true);
            setDocxHtml(null);

            const parseDocx = async () => {
                try {
                    const mammoth = (await import('mammoth')).default;
                    let arrayBuffer: ArrayBuffer | undefined;

                    if ((viewingDoc as any).rawBuffer) {
                        arrayBuffer = (viewingDoc as any).rawBuffer;
                    } else if (viewingDoc.fileData && viewingDoc.fileData instanceof Blob) {
                        arrayBuffer = await viewingDoc.fileData.arrayBuffer();
                    }

                    if (arrayBuffer) {
                        const result = await mammoth.convertToHtml({ arrayBuffer });
                        setDocxHtml(result.value);
                    }
                } catch (e) {
                    console.error('Failed to parse docx', e);
                } finally {
                    setIsGeneratingDocx(false);
                }
            };

            parseDocx();
        } else {
            setDocxHtml(null);
        }
    }, [viewingDoc]);

    const loadDocs = async () => {
        const docs = await db.getAllDocuments();
        setSavedDocs(docs);
    };

    const handleFilesSelected = async (files: File[]) => {
        setIsProcessing(true);
        try {
            const uploadPromises = files.map(async (file) => {
                // 1. Instantly read the raw file as an ArrayBuffer to store locally without Base64 freezing
                let rawData: ArrayBuffer | undefined;
                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                    rawData = await file.arrayBuffer();
                }

                // yield to the browser thread to ensure the UI updates and doesn't freeze
                await new Promise(r => setTimeout(r, 10));

                // 2. Perform AI text extraction with subject tag
                const parsedDoc = await processDocument(file, subjectInput);

                // 3. Attach the raw binary buffer for future visual rendering
                if (rawData) {
                    (parsedDoc as any).rawBuffer = rawData;
                }

                await globalVectorStore.addDocumentChunks(parsedDoc.id, parsedDoc.chunks);
                await db.saveDocument(parsedDoc);
            });

            await Promise.all(uploadPromises);
            await loadDocs();
        } catch (error: any) {
            alert(`حدث خطأ أثناء معالجة الملف: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleZamaylFilesScraped = async (files: ScrapedFile[]) => {
        setIsProcessing(true);
        try {
            for (const f of files) {
                if (f.blob) {
                    // Convert blob to File to use our existing pipeline
                    const fileObj = new File([f.blob], f.name, { type: 'text/plain' });
                    // Even if it was originally a PDF, reading proxy blob as text might yield HTML or garbled, 
                    // but we will pass it to processDocument which handles text/pdf
                    try {
                        const parsedDoc = await processDocument(fileObj, subjectInput);
                        await globalVectorStore.addDocumentChunks(parsedDoc.id, parsedDoc.chunks);
                        await db.saveDocument(parsedDoc);
                        continue;
                    } catch (e) {
                        console.error('Failed to parse downloaded blob', e);
                    }
                }

                // Fallback: Just save the URL as a text document
                const chunks = f.url ? [`مرجع خارجي من زميل: ${f.name}\nالرابط: ${f.url}`] : [];
                const fakeDoc: ParsedDocument = {
                    id: Math.random().toString(36).substring(7),
                    filename: f.name,
                    subjectName: subjectInput,
                    chunks
                };
                await globalVectorStore.addDocumentChunks(fakeDoc.id, fakeDoc.chunks);
                await db.saveDocument(fakeDoc);
            }
            await loadDocs();
            alert(`تم جلب وحفظ ${files.length} ملفات بنجاح من زميل!`);
        } catch (error: any) {
            alert(`حدث خطأ: ${error.message}`);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDeleteDoc = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        await db.deleteDocument(id);
        if ((globalVectorStore as any).deleteDocumentChunks) {
            (globalVectorStore as any).deleteDocumentChunks(id);
        }
        await loadDocs();
    };

    const handleDeleteFolder = async (subject: string) => {
        const docs = subjectsMap[subject] || [];
        for (const doc of docs) {
            await db.deleteDocument(doc.id);
            if ((globalVectorStore as any).deleteDocumentChunks) {
                (globalVectorStore as any).deleteDocumentChunks(doc.id);
            }
        }
        setFolderToDelete(null);
        setActiveSubject(null);
        await loadDocs();
    };

    const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0 || !activeSubject) return;
        setIsProcessing(true);
        try {
            for (const file of Array.from(files)) {
                let rawData: ArrayBuffer | undefined;
                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                    rawData = await file.arrayBuffer();
                }
                await new Promise(r => setTimeout(r, 10));
                const parsedDoc = await processDocument(file, activeSubject);
                if (rawData) { (parsedDoc as any).rawBuffer = rawData; }
                await globalVectorStore.addDocumentChunks(parsedDoc.id, parsedDoc.chunks);
                await db.saveDocument(parsedDoc);
            }
            await loadDocs();
        } catch (error: any) {
            alert(`حدث خطأ: ${error.message}`);
        } finally {
            setIsProcessing(false);
            if (folderUploadRef.current) folderUploadRef.current.value = '';
        }
    };

    const handleCreateFolder = async () => {
        if (!subjectInput.trim()) return;
        setIsProcessing(true);
        try {
            const checkExisting = savedDocs.find(d => d.subjectName === subjectInput.trim());
            if (!checkExisting) {
                const folderPlaceholder: ParsedDocument = {
                    id: `folder_${Date.now()}`,
                    filename: '_solvica_folder_',
                    subjectName: subjectInput.trim(),
                    chunks: []
                };
                await db.saveDocument(folderPlaceholder);
                await loadDocs();
            }
            setActiveSubject(subjectInput.trim());
            setSubjectInput('');
        } catch (e: any) {
            alert(e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    // Group documents by subjectName
    const subjectsMap = savedDocs.reduce((acc, doc) => {
        const key = doc.subjectName || 'مقرر عام';
        if (!acc[key]) acc[key] = [];
        acc[key].push(doc);
        return acc;
    }, {} as Record<string, ParsedDocument[]>);

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto space-y-8" dir="rtl">

                {/* Header */}
                <div className="text-center space-y-4 mb-12">
                    <h1 className="text-4xl md:text-5xl font-display font-black text-[var(--text-main)] tracking-tight">
                        ملفاتي ومشروعاتي <span className="text-gradient">الدراسية</span>
                    </h1>
                    <p className="text-lg text-[var(--text-muted)] max-w-2xl mx-auto">
                        ارفع ملفاتك، أو ابحث في منصة زميل، وسيقوم الذكاء الاصطناعي بقراءتها وحفظها في قاعدة بيانات جهازك للأبد ليكون جاهزاً للإجابة على جميع أسئلتك.
                    </p>
                </div>

                {/* Main Content Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                    {/* Left Column: Management */}
                    <div className="space-y-6">
                        <div className="glass-widget rounded-3xl p-8 relative overflow-hidden h-full">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] rounded-full pointer-events-none" />

                            <h2 className="text-2xl font-bold mb-6 flex items-center gap-3 relative z-10">
                                <FileText className="w-6 h-6 text-primary" />
                                المقررات المحفوظة ({savedDocs.length})
                            </h2>

                            {!activeSubject ? (
                                // View 1: Subject Folders
                                <div className="space-y-4 relative z-10">
                                    {Object.entries(subjectsMap).length === 0 ? (
                                        <div className="text-center py-12 relative z-10">
                                            <div className="w-20 h-20 bg-[var(--hover-bg)] rounded-full flex items-center justify-center mx-auto mb-4 border border-[var(--border-color)]">
                                                <FileText className="w-10 h-10 text-[var(--text-muted)]" />
                                            </div>
                                            <p className="text-[var(--text-muted)] font-medium">لا يوجد مجلدات مواد حتى الآن.</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {Object.entries(subjectsMap).map(([subject, docs]) => (
                                                <div
                                                    key={subject}
                                                    onClick={() => setActiveSubject(subject)}
                                                    className="p-6 bg-[var(--bg-dashboard)] border border-[var(--border-color)] rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-[var(--hover-bg)] transition-all flex flex-col items-center text-center gap-3 group shadow-sm hover:shadow-md"
                                                >
                                                    <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                                                        <svg className="w-8 h-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"></path></svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-lg text-[var(--text-main)] group-hover:text-primary transition-colors">{subject}</h3>
                                                        <span className="text-sm font-bold text-[var(--text-muted)]">{docs.filter(d => d.filename !== '_solvica_folder_').length} ملفات</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                // View 2: Files Inside a Subject
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex items-center gap-2 mb-4">
                                        <button
                                            onClick={() => setActiveSubject(null)}
                                            className="self-start flex items-center gap-2 text-sm font-bold text-[var(--text-muted)] hover:text-primary transition-colors"
                                        >
                                            <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"></path></svg>
                                            رجوع
                                        </button>
                                    </div>

                                    <h3 className="text-xl font-bold mb-4 text-[var(--text-main)] border-b border-[var(--border-color)] pb-2 flex items-center justify-between">
                                        <span>📂 {activeSubject}</span>
                                        <span className="text-sm text-[var(--text-muted)]">{subjectsMap[activeSubject]?.filter(d => d.filename !== '_solvica_folder_').length} ملف</span>
                                    </h3>

                                    {/* Folder Actions: Upload + Delete */}
                                    <div className="flex gap-2 mb-4">
                                        <button
                                            onClick={() => folderUploadRef.current?.click()}
                                            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#2ba396] hover:bg-[#238b7f] text-white rounded-xl text-sm font-bold transition-colors shadow-md"
                                        >
                                            <Plus className="w-4 h-4" />
                                            رفع ملفات للمجلد
                                        </button>
                                        <input
                                            type="file"
                                            ref={folderUploadRef}
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.txt"
                                            multiple
                                            onChange={handleFolderUpload}
                                        />
                                        <button
                                            onClick={() => setFolderToDelete(activeSubject)}
                                            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-bold transition-colors border border-red-500/20"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            حذف المجلد
                                        </button>
                                    </div>

                                    <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                                        {subjectsMap[activeSubject]?.filter(d => d.filename !== '_solvica_folder_').length === 0 && (
                                            <div className="text-center py-10 text-[var(--text-muted)] font-bold">المجلد فارغ. قم برفع مستندات لهذا المقرر.</div>
                                        )}
                                        {subjectsMap[activeSubject]?.filter(d => d.filename !== '_solvica_folder_').map(doc => (
                                            <div key={doc.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl hover:border-primary/50 transition-colors group gap-4">
                                                <div className="flex items-center gap-4 w-full sm:w-auto overflow-hidden">
                                                    <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center shrink-0">
                                                        <FileText className="w-5 h-5 text-indigo-500" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-bold text-[var(--text-main)] truncate max-w-[200px] sm:max-w-xs">{doc.filename}</h4>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2 w-full sm:w-auto justify-end sm:opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    <button
                                                        onClick={() => setViewingDoc(doc)}
                                                        className="px-4 py-1.5 text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 rounded-lg transition-colors border-0"
                                                    >
                                                        عرض المحتوى
                                                    </button>
                                                    <button
                                                        onClick={(e) => handleDeleteDoc(doc.id, e)}
                                                        className="p-2 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors border-0"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Actions */}
                    <div className="space-y-6">
                        <div className="glass-widget rounded-3xl p-2 flex">
                            <button
                                onClick={() => setActiveTab('create_folder')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${activeTab === 'create_folder' ? 'bg-[var(--bg-surface)] shadow-md text-primary border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            >
                                <FolderPlus className="w-5 h-5" />
                                إنشاء مجلد مادة
                            </button>
                            <button
                                onClick={() => setActiveTab('search')}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl font-bold transition-all ${activeTab === 'search' ? 'bg-[var(--bg-surface)] shadow-md text-secondary border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                            >
                                <Search className="w-5 h-5" />
                                البحث في موقع زميل
                            </button>
                        </div>

                        <div className="glass-widget rounded-3xl p-8 relative overflow-hidden min-h-[400px]">
                            {isProcessing && (
                                <div className="absolute inset-0 bg-[var(--glass-bg)] backdrop-blur-sm z-50 flex flex-col items-center justify-center">
                                    <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                    <p className="mt-4 font-bold text-primary animate-pulse text-lg">جاري معالجة وفهم الملفات...</p>
                                </div>
                            )}

                            {activeTab === 'create_folder' ? (
                                <div className="h-full flex flex-col justify-center space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-muted)] mb-2">اسم المادة / المقرر الذي تود إنشاء مجلد له:</label>
                                        <input
                                            type="text"
                                            value={subjectInput}
                                            onChange={(e) => setSubjectInput(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') handleCreateFolder(); }}
                                            className="w-full bg-[var(--bg-dashboard)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-4 py-3 font-bold focus:border-primary focus:outline-none transition-colors shadow-inner"
                                            placeholder="مثال: رياضيات 1، خوارزميات..."
                                        />
                                    </div>
                                    <div className="pt-4 mt-2">
                                        <button
                                            onClick={handleCreateFolder}
                                            disabled={!subjectInput.trim() || isProcessing}
                                            className="w-full py-4 bg-primary text-white font-black text-lg rounded-2xl shadow-lg shadow-primary/30 hover:shadow-primary/50 transition-all flex justify-center items-center gap-2 disabled:opacity-50"
                                        >
                                            <FolderPlus className="w-6 h-6" />
                                            إنشاء وبدء الدخول للمجلد
                                        </button>
                                        <p className="text-center text-xs text-[var(--text-muted)] mt-4">يمكنك رفع الملفات من الداخل بعد إنشاء المجلد لتنظيم أفضل.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col justify-center space-y-4">
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-muted)] mb-2">حفظ الملفات المجلوبة تحت مادة:</label>
                                        <input
                                            type="text"
                                            value={subjectInput}
                                            onChange={(e) => setSubjectInput(e.target.value)}
                                            className="w-full bg-[var(--bg-dashboard)] border border-[var(--border-color)] text-[var(--text-main)] rounded-xl px-4 py-3 font-bold focus:border-primary focus:outline-none transition-colors shadow-inner"
                                            placeholder="مثال: ثقافة إسلامية..."
                                        />
                                    </div>
                                    <div className="pt-4 border-t border-[var(--border-color)]">
                                        <ZamaylSearch onFilesScraped={handleZamaylFilesScraped} />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Folder Delete Confirmation Dialog */}
                {folderToDelete && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" dir="rtl">
                        <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center">
                            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <AlertTriangle className="w-8 h-8 text-red-500" />
                            </div>
                            <h3 className="text-xl font-black text-[var(--text-main)] mb-2">حذف المجلد؟</h3>
                            <p className="text-sm text-[var(--text-muted)] mb-6">
                                سيتم حذف مجلد <span className="font-bold text-red-400">"{folderToDelete}"</span> وجميع الملفات بداخله نهائياً. لا يمكن التراجع عن هذا الإجراء.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setFolderToDelete(null)}
                                    className="flex-1 px-4 py-2.5 rounded-xl font-bold text-[var(--text-main)] border border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={() => handleDeleteFolder(folderToDelete)}
                                    className="flex-1 px-4 py-2.5 rounded-xl font-bold bg-red-500 hover:bg-red-600 text-white transition-colors shadow-lg"
                                >
                                    حذف نهائياً
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Document Viewer Pane */}
                {viewingDoc && createPortal(
                    <div dir="rtl" className="fixed inset-y-0 left-0 right-0 lg:right-72 z-[100] bg-[var(--bg-background)] flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.1)] transition-transform duration-300">
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)] z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <FileText className="w-6 h-6 text-primary shrink-0" />
                                <h3 className="text-lg font-bold text-[var(--text-main)] truncate max-w-[200px] sm:max-w-md">
                                    {viewingDoc.filename}
                                </h3>
                            </div>

                            <div className="flex items-center gap-2 sm:gap-4">
                                <button
                                    onClick={() => {
                                        const fname = viewingDoc.filename;
                                        setViewingDoc(null);
                                        window.location.href = `/chat?file=${encodeURIComponent(fname)}`;
                                    }}
                                    className="px-4 py-2 rounded-xl font-bold bg-gradient-to-r from-primary to-secondary text-white transition-all shadow-md hover:shadow-primary/50 text-sm sm:text-base shrink-0"
                                >
                                    اسأل الذكاء
                                </button>
                                <button
                                    onClick={() => setViewingDoc(null)}
                                    className="p-2 sm:px-4 sm:py-2 rounded-xl font-bold bg-[var(--hover-bg)] border border-[var(--border-color)] text-[var(--text-main)] hover:bg-red-500/10 hover:text-red-500 transition-colors flex items-center gap-2 shrink-0"
                                >
                                    <span className="hidden sm:inline">إغلاق</span>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* PDF Viewer */}
                        <div className="flex-1 overflow-hidden relative bg-[var(--bg-surface)]">
                            {(() => {
                                let objectUrl = '';
                                let isPdf = viewingDoc.filename.toLowerCase().endsWith('.pdf');
                                let isWord = viewingDoc.filename.toLowerCase().endsWith('.docx') || viewingDoc.filename.toLowerCase().endsWith('.doc');
                                let isValidVisual = false;

                                try {
                                    if ((viewingDoc as any).rawBuffer) {
                                        const blob = new Blob([(viewingDoc as any).rawBuffer], { type: isPdf ? 'application/pdf' : 'application/octet-stream' });
                                        objectUrl = URL.createObjectURL(blob);
                                        isValidVisual = isPdf;
                                    } else if (viewingDoc.fileData && viewingDoc.fileData instanceof Blob) {
                                        objectUrl = URL.createObjectURL(viewingDoc.fileData);
                                        isValidVisual = isPdf;
                                    }
                                } catch (e) {
                                    console.warn('Failed to construct object URL for file preview', e);
                                }

                                if (isValidVisual && objectUrl) {
                                    return (
                                        <iframe
                                            src={objectUrl + '#view=FitH'}
                                            className="w-full h-full border-0"
                                            title={viewingDoc.filename}
                                        />
                                    );
                                } else if (isWord) {
                                    return (
                                        <div className="p-4 sm:p-8 h-full overflow-y-auto bg-white custom-scrollbar">
                                            {isGeneratingDocx ? (
                                                <div className="flex flex-col items-center justify-center h-full">
                                                    <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                                                    <p className="mt-4 font-bold text-primary animate-pulse">جاري تحميل المعاينة...</p>
                                                </div>
                                            ) : docxHtml ? (
                                                <div
                                                    className="prose prose-sm sm:prose-base max-w-none text-right"
                                                    style={{ direction: 'rtl', color: 'black' }}
                                                    dangerouslySetInnerHTML={{ __html: docxHtml }}
                                                />
                                            ) : (
                                                <div className="text-center text-gray-500 font-bold">تعذر تحميل المعاينة المرئية لهذا الملف.</div>
                                            )}
                                        </div>
                                    );
                                } else {
                                    return (
                                        <div className="p-4 sm:p-8 h-full overflow-y-auto whitespace-pre-wrap text-base sm:text-lg leading-relaxed text-[var(--text-muted)] custom-scrollbar">
                                            <div className="mb-4 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-600 dark:text-orange-400 font-medium">
                                                المعاينة المرئية غير مدعومة لهذا النوع من الملفات في المتصفح. يتم عرض النصوص المستخرجة فقط.
                                            </div>
                                            {viewingDoc.chunks.length > 0 ? viewingDoc.chunks.join('\n\n---\n\n') : 'لا يوجد محتوى يمكن عرضه في هذا الملف.'}
                                        </div>
                                    );
                                }
                            })()}
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </AppLayout>
    );
}
