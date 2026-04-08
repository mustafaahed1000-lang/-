import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

/**
 * Renders a specific page of a PDF File to a Base64 image string.
 * This is used for sending the visual structure of a page (like tables or figures) to Gemini Vision.
 */
export async function renderPdfPageToBase64(file: Blob | File, pageNumber: number, scale: number = 2.0): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdfDocument = await pdfjsLib.getDocument({
        data: arrayBuffer,
        isEvalSupported: false,
        useWorkerFetch: false,
        verbosity: 0,
    }).promise;

    if (pageNumber < 1 || pageNumber > pdfDocument.numPages) {
        throw new Error(`الصفحة ${pageNumber} غير موجودة في هذا الملف. (إجمالي الصفحات: ${pdfDocument.numPages})`);
    }

    const page = await pdfDocument.getPage(pageNumber);
    const viewport = page.getViewport({ scale });

    // Create a canvas element
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');

    if (!context) {
        throw new Error('فشل في إنشاء إطار للرسم (Canvas Context)');
    }

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Render PDF page into canvas context
    const renderContext = {
        canvasContext: context,
        viewport: viewport
    };

    // @ts-ignore
    await page.render(renderContext).promise;

    // Convert canvas to Base64 (JPEG to save API payload size)
    return canvas.toDataURL('image/jpeg', 0.8);
}
