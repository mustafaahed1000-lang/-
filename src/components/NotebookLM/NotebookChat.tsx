import React, { useState, useRef, useEffect } from 'react';
import { aiClient } from '../../lib/ai/aiClient';
import type { AIChatMessage } from '../../lib/ai/aiClient';
import { globalVectorStore } from '../../lib/rag/vectorStore';
import { processDocument } from '../../lib/rag/documentParser';
import type { ParsedDocument } from '../../lib/rag/documentParser';
import { db } from '../../lib/db/database';
import { DocumentUploader } from './DocumentUploader';
import { ExplainerBoard } from '../ExplainerMode/ExplainerBoard';
import { promptGuard } from '../../lib/security/promptGuard';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

type ChatMode = 'general' | 'exam' | 'assignment';

export const NotebookChat: React.FC = () => {
    const [messages, setMessages] = useState<AIChatMessage[]>([
        { role: 'assistant', content: 'أهلاً بك في المساعد الذكي NotebookLM! يمكنك رفع ملفات PDF أو Word الخاصة بك وسأقوم بشرحها والإجابة على أسئلتك بناءً على محتواها فقط.' }
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [processedDocs, setProcessedDocs] = useState<ParsedDocument[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [explainingScript, setExplainingScript] = useState<string | null>(null);
    const [chatMode, setChatMode] = useState<ChatMode>('general');
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load existing documents from DB on mount
    useEffect(() => {
        const loadDocs = async () => {
            const savedDocs = await db.getAllDocuments();
            if (savedDocs.length > 0) {
                setProcessedDocs(savedDocs);
                // Re-hydrate the vector store with saved chunks
                for (const doc of savedDocs) {
                    await globalVectorStore.addDocumentChunks(doc.id, doc.chunks);
                }
            }
        };
        loadDocs();
    }, []);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    const handleFilesSelected = async (files: File[]) => {
        setIsProcessing(true);
        try {
            for (const file of files) {
                // 1. Extract text and chunk
                const parsedDoc = await processDocument(file);

                // 2. Add embeddings to vector store
                await globalVectorStore.addDocumentChunks(parsedDoc.id, parsedDoc.chunks);

                // 3. Save to persistent DB
                await db.saveDocument(parsedDoc);

                setProcessedDocs(prev => [...prev, parsedDoc]);

                setMessages(prev => [...prev, {
                    role: 'system',
                    content: `تمت معالجة الملف: ${file.name} بنجاح.`
                }]);
            }
        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: 'system',
                content: `حدث خطأ أثناء معالجة الملف: ${error.message}`
            }]);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim()) return;

        let sanitizedInput = input;
        try {
            sanitizedInput = promptGuard.sanitize(input);
        } catch (secError: any) {
            setMessages(prev => [...prev,
            { role: 'user', content: input },
            { role: 'assistant', content: secError.message }
            ]);
            setInput('');
            return;
        }

        const userMsg: AIChatMessage = { role: 'user', content: sanitizedInput };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setIsTyping(true);

        try {
            let contextText = '';

            // If documents are uploaded, perform RAG
            if (processedDocs.length > 0) {
                // Focus search on user query OR just grab random chunks if they just want an exam
                const searchTxt = chatMode === 'exam' ? 'امتحان اسئلة مهمة' : userMsg.content;
                const relevantChunks = await globalVectorStore.similaritySearch(searchTxt, 5);
                contextText = relevantChunks.map(c => c.text).join('\n---\n');
            }

            let systemInstruction = '';
            if (chatMode === 'exam') {
                systemInstruction = `أنت أستاذ في جامعة القدس المفتوحة واسمك Solvica. وظيفتك الآن هي "وضع امتحان" للطالب بناءً على ملخص المواد التالية:
${contextText}
قم بتوليد 3 أسئلة اختيار من متعدد، وسؤالين مقاليين معقولين. لا تعطِ الإجابات فوراً، بل اطلب من الطالب الإجابة عليها أولاً لتقييمه.`;
            } else if (chatMode === 'assignment') {
                systemInstruction = `أنت مساعد حل واجبات جامعية لجامعة القدس المفتوحة. الطالب يطلب مساعدة في حل واجب.
استخدم هذه المعلومات إذا لزم الأمر:
${contextText}
قم بحل الواجب المعطى من قبل الطالب خطوة بخطوة بطريقة أكاديمية ومنظمة جداً تصلح لنسخها في ملف Word أو PDF. كن دقيقاً.`;
            } else {
                systemInstruction = `أنت مساعد ذكي للطلاب في جامعة القدس المفتوحة واسمك Solvica.
${contextText ? `المعلومات المستخرجة من مستندات الطالب:\n${contextText}\n\nيجب عليك الإجابة على سؤال المستخدم بناءً على هذه المعلومات.` : `أجب على سؤال الطالب بشكل عام وودود.`}`;
            }

            // Build the specific RAG prompt
            const systemPrompt: AIChatMessage = {
                role: 'system',
                content: systemInstruction
            };

            const chatHistory = [systemPrompt, ...messages.filter(m => m.role !== 'system'), userMsg];

            const responseText = await aiClient.chat(chatHistory);

            setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);

        } catch (error: any) {
            setMessages(prev => [...prev, { role: 'assistant', content: `عذراً، حدث خطأ: ${error.message}` }]);
        } finally {
            setIsTyping(false);
        }
    };

    const downloadPDF = async (content: string) => {
        // Simplified PDF generation. For proper Arabic in jsPDF, a custom font (VFS) is usually required.
        // We'll use html2canvas as a trick to render the text as an image into the PDF to preserve Arabic accurately.
        const tempDiv = document.createElement('div');
        tempDiv.dir = 'rtl';
        tempDiv.style.width = '600px';
        tempDiv.style.padding = '20px';
        tempDiv.style.background = 'white';
        tempDiv.style.color = 'black';
        tempDiv.style.fontFamily = 'Arial, sans-serif';
        tempDiv.style.fontSize = '14px';
        tempDiv.style.lineHeight = '1.6';
        tempDiv.innerHTML = `
            <div style="text-align:center; border-bottom: 2px solid #ccc; padding-bottom: 10px; margin-bottom: 20px;">
                <h1 style="color: #2563eb;">جامعة القدس المفتوحة</h1>
                <h3>حل التعيين المقدم من المساعد Solvica</h3>
            </div>
            <div style="white-space: pre-wrap;">${content}</div>
        `;
        document.body.appendChild(tempDiv);

        try {
            const canvas = await html2canvas(tempDiv);
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            pdf.save('Solvica_Assignment.pdf');
        } catch (e) {
            console.error("PDF generation failed", e);
            alert("حدث خطأ أثناء توليد ملف الـ PDF");
        } finally {
            document.body.removeChild(tempDiv);
        }
    };

    return (
        <div className="w-full max-w-4xl mx-auto flex flex-col h-[80vh] bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-gradient-to-r from-blue-900/50 to-purple-900/50 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">NotebookLM Solvica</h2>
                        <div className="flex gap-2 mt-1">
                            <span className="text-sm text-blue-200">{processedDocs.length} ملفات</span>
                            <span className="text-sm text-gray-400">|</span>
                            {/* Mode Selectors */}
                            <select
                                value={chatMode}
                                onChange={(e) => setChatMode(e.target.value as ChatMode)}
                                className="bg-black/20 text-blue-200 text-sm border border-white/10 rounded px-2 py-0.5 focus:outline-none"
                            >
                                <option value="general">مساعد دراسي (عام)</option>
                                <option value="exam">اختبرني (امتحان)</option>
                                <option value="assignment">حل التعيين (واجب)</option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Document Uploader Zone (Only show if no docs or explicitly wanted) */}
            {processedDocs.length === 0 && (
                <div className="p-6">
                    <DocumentUploader onFilesSelected={handleFilesSelected} />
                    {isProcessing && <p className="text-center text-blue-400 animate-pulse">جاري قراءة وفهم الملفات...</p>}
                </div>
            )}

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth" dir="rtl">
                {messages.map((msg, index) => {
                    if (msg.role === 'system' && !msg.content.includes('بنجاح') && !msg.content.includes('خطأ')) {
                        return null; // Skip non-status system messages in UI
                    }

                    return (
                        <div key={index} className={`flex ${msg.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                            <div className="flex flex-col gap-2 max-w-[80%]">
                                <div className={`rounded-2xl p-4 ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : msg.role === 'system'
                                        ? 'bg-gray-800/50 text-gray-400 text-sm text-center mx-auto'
                                        : 'bg-white/10 text-gray-100 rounded-tl-none border border-white/5'
                                    }`}>
                                    <p className="whitespace-pre-wrap leading-relaxed">
                                        {msg.content}
                                    </p>
                                </div>

                                {/* Explainer Button for AI Messages */}
                                {msg.role === 'assistant' && (
                                    <div className="flex flex-col gap-1 items-end w-full">
                                        <button
                                            onClick={() => setExplainingScript(msg.content)}
                                            className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                                        >
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            اشرح لي هذا صوتياً ومرئياً
                                        </button>

                                        {chatMode === 'assignment' && (
                                            <button
                                                onClick={() => downloadPDF(msg.content)}
                                                className="text-xs flex items-center gap-1 text-green-400 hover:text-green-300 transition-colors"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                                تصدير كـ PDF رسمي
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}

                {isTyping && (
                    <div className="flex justify-end">
                        <div className="bg-white/10 rounded-2xl rounded-tl-none p-4 flex gap-2 items-center">
                            <span className="w-2 h-2 rounded-full bg-blue-400 animate-bounce cursor-default"></span>
                            <span className="w-2 h-2 rounded-full bg-purple-400 animate-bounce cursor-default" style={{ animationDelay: '0.2s' }}></span>
                            <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce cursor-default" style={{ animationDelay: '0.4s' }}></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t border-white/10 bg-black/20" dir="rtl">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="اسأل عن أي شيء في المواد المرفوعة..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        disabled={isProcessing}
                    />
                    <button
                        onClick={handleSendMessage}
                        disabled={!input.trim() || isProcessing || isTyping}
                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white p-3 rounded-xl transition-colors flex items-center justify-center"
                    >
                        <svg className="w-6 h-6 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </button>
                    {processedDocs.length > 0 && (
                        <div className="relative group">
                            <button className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-3 rounded-xl transition-colors flex items-center justify-center border border-white/10">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                            </button>
                            {/* Absolute positioned uploader hidden on hover using CSS in reality, simplifed here */}
                        </div>
                    )}
                </div>
            </div>

            {/* Explainer Overlay */}
            {explainingScript && (
                <ExplainerBoard
                    script={explainingScript}
                    onClose={() => setExplainingScript(null)}
                    onExplainDeeper={(topic) => {
                        setExplainingScript(null);
                        setInput(`اشرح لي هذه النقطة بالتفصيل وبشكل أبسط: "${topic}"`);
                    }}
                />
            )}
        </div>
    );
};
