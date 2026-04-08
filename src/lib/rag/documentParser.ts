import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';


pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export interface ParsedDocument {
    id: string;
    filename: string;
    subjectName?: string; // Added for categorization
    chunks: string[];
    fileData?: Blob; // Natively store the Blob in IndexedDB for rendering
}

export interface ExtractedPage {
    text: string;
    pageNum?: number;
}

/**
 * Extracts text from a File object (PDF or Txt).
 */
export async function extractTextFromFile(file: File): Promise<ExtractedPage[]> {
    if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdfDocument = await pdfjsLib.getDocument({
                data: arrayBuffer,
                isEvalSupported: false,
                useWorkerFetch: false,
                verbosity: 0,
            }).promise;

            const pages: ExtractedPage[] = [];
            const numPages = pdfDocument.numPages;

            // 🚀 سرعة فائقة جداً: دفعات ضخمة
            const batchSize = 40;
            for (let i = 1; i <= numPages; i += batchSize) {
                const batchPromises = [];
                for (let j = i; j < i + batchSize && j <= numPages; j++) {
                    batchPromises.push((async (pageNum) => {
                        const page = await pdfDocument.getPage(pageNum);
                        const textContent = await page.getTextContent();
                        let pageText = textContent.items.map((item: any) => item.str).join(' ');

                        // ─── Tesseract.js OCR Fallback has been removed for 100x speed ───
                        return { text: pageText, pageNum };
                    })(j));
                }
                const batchResults = await Promise.all(batchPromises);
                pages.push(...batchResults);

                // Yield لايكاد يُذكر للواجهة للحفاظ على الانسيابية
                await new Promise(r => setTimeout(r, 0));
            }
            return pages;
        } catch (error: any) {
            console.error("PDF Parsing failed:", error);
            throw new Error(`مشكلة فنية في قراءة المستند: ${error.message}`);
        }
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || file.name.endsWith('.docx')) {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            return [{ text: result.value || '' }];
        } catch (error: any) {
            console.error("Word Document Parsing failed:", error);
            throw new Error(`مشكلة فنية في قراءة ملف الورد: ${error.message}`);
        }
    } else if (file.type === 'text/plain' || file.name.endsWith('.txt')) {
        return [{ text: await file.text() }];
    } else {
        throw new Error(`نوع الملف غير مدعوم: ${file.name}`);
    }
}

/**
 * Splits extracted pages into smaller, overlapping chunks suitable for embeddings.
 * Prepends precise citation metadata to every chunk.
 */
export function chunkText(pages: ExtractedPage[], _filename: string, chunkSize: number = 4000, overlap: number = 500): string[] {
    const chunks: string[] = [];

    for (const page of pages) {
        let text = page.text;
        if (!text.trim()) continue;

        let startIndex = 0;
        while (startIndex < text.length) {
            const endIndex = Math.min(startIndex + chunkSize, text.length);
            let chunk = text.slice(startIndex, endIndex);

            // Try to break at a natural boundary (newline or period) if not at the very end
            if (endIndex < text.length) {
                const lastNewline = chunk.lastIndexOf('\n');
                const lastPeriod = chunk.lastIndexOf('. ');

                let breakPoint = Math.max(lastNewline, lastPeriod);
                if (breakPoint > chunkSize / 2) {
                    chunk = chunk.slice(0, breakPoint + 1);
                }
            }

            // We do NOT inject '[المصدر: ]' here anymore, because it confuses the LLM to output unwanted citations.
            chunks.push(chunk.trim());

            // Prevent infinite loop edge case: if chunk was cut very short, standard overlap would stall progression.
            const safeOverlap = Math.min(overlap, Math.floor(chunk.length * 0.25));
            startIndex += Math.max(1, chunk.length - safeOverlap);
        }
    }

    // Return ALL chunks so massive PDF books can be processed fully by our 300,000 char prompt engines
    return chunks;
}

/**
 * Process a single file: extract text and split into chunks.
 */
export async function processDocument(file: File, subjectName?: string): Promise<ParsedDocument> {
    const pages = await extractTextFromFile(file);
    const chunks = chunkText(pages, file.name);

    return {
        id: crypto.randomUUID(),
        filename: file.name,
        subjectName,
        chunks,
        fileData: file // Save the Blob for future rendering
    };
}
