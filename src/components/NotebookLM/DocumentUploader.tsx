import React, { useCallback, useState, useRef } from 'react';

interface DocumentUploaderProps {
    onFilesSelected: (files: File[]) => void;
}

export const DocumentUploader: React.FC<DocumentUploaderProps> = ({ onFilesSelected }) => {
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const filesArray = Array.from(e.dataTransfer.files);
            // Filter for PDFs or Word docs (simple check)
            const validFiles = filesArray.filter(file =>
                file.type === 'application/pdf' ||
                file.name.endsWith('.pdf') ||
                file.name.endsWith('.docx') ||
                file.name.endsWith('.doc') ||
                file.type === 'text/plain'
            );

            if (validFiles.length > 0) {
                onFilesSelected(validFiles);
            } else {
                alert("يرجى رفع ملفات PDF أو Word فقط.");
            }
        }
    }, [onFilesSelected]);

    const onFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onFilesSelected(Array.from(e.target.files));
        }
    };

    return (
        <div className="w-full max-w-2xl mx-auto mb-6">
            <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                className={`relative overflow-hidden rounded-2xl border-2 border-dashed transition-all p-10 flex flex-col items-center justify-center text-center cursor-pointer
          ${isDragging ? 'border-blue-400 bg-blue-500/10' : 'border-white/20 bg-white/5 hover:bg-white/10'}`}
            >
                <div className="w-16 h-16 rounded-full bg-blue-500/20 flex items-center justify-center mb-4">
                    <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">ارفع مواد</h3>
                <p className="text-gray-400 mb-6">اسحب وأفلت الملفات هنا، أو انقر لاختيار ملفات (PDF, Word) للحصول على شروحات</p>

                <input
                    type="file"
                    id="file-upload"
                    ref={fileInputRef}
                    multiple
                    accept=".pdf,.doc,.docx,text/plain"
                    className="w-0 h-0 opacity-0 absolute"
                    onChange={onFileInputChange}
                />
                <label
                    htmlFor="file-upload"
                    className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-colors cursor-pointer border border-white/10"
                >
                    تصفح الملفات
                </label>
            </div>
        </div>
    );
};
