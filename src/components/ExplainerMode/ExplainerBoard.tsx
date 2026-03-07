import React, { useState, useEffect, useRef } from 'react';
import { Download } from 'lucide-react';
import { exportToPDF } from '../../lib/utils/pdfExport';

interface ExplainerBoardProps {
    script: string;
    voiceURI?: string;
    onExplainDeeper: (topic: string) => void;
    onClose: () => void;
}

export const ExplainerBoard: React.FC<ExplainerBoardProps> = ({ script, voiceURI, onExplainDeeper, onClose }) => {
    const contentRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
    const [currentCharIndex, setCurrentCharIndex] = useState(0);
    const speakRef = useRef<SpeechSynthesisUtterance | null>(null);
    const sentences = script.match(/[^.!?\n]+[.!?\n]+/g) || [script];

    // Initialize Speech Synthesis
    useEffect(() => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel(); // Clear any ongoing speech
        }

        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    const speakSentence = (index: number) => {
        if (!('speechSynthesis' in window)) return;
        if (index >= sentences.length) {
            setIsPlaying(false);
            return;
        }

        setCurrentSentenceIndex(index);
        setCurrentCharIndex(0);
        const utterance = new SpeechSynthesisUtterance(sentences[index]);
        utterance.lang = 'ar-SA'; // Assuming Arabic default, can be dynamic
        utterance.rate = 0.9;
        utterance.pitch = 1;

        if (voiceURI) {
            const selectedVoice = window.speechSynthesis.getVoices().find(v => v.voiceURI === voiceURI);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        utterance.onboundary = (event) => {
            if (event.name === 'word') {
                setCurrentCharIndex(event.charIndex);
            }
        };

        utterance.onend = () => {
            if (isPlaying) {
                speakSentence(index + 1);
            }
        };

        window.speechSynthesis.speak(utterance);
        speakRef.current = utterance;
    };

    const handlePlayPause = () => {
        if (isPlaying) {
            window.speechSynthesis.pause();
            setIsPlaying(false);
        } else {
            if (window.speechSynthesis.paused) {
                window.speechSynthesis.resume();
            } else {
                speakSentence(currentSentenceIndex);
            }
            setIsPlaying(true);
        }
    };

    const handleStopDeeper = () => {
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        // Extract the current sentence as the topic to explain deeper
        const topic = sentences[currentSentenceIndex];
        onExplainDeeper(topic);
    };



    return (
        <div className="flex flex-col h-full bg-black/90 backdrop-blur-xl pt-6 px-4 md:px-8 pb-6 rounded-3xl" dir="rtl">
            {/* Top Bar */}
            <div className="flex justify-between items-center mb-6 w-full">
                <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500 flex items-center gap-2">
                    <svg className="w-8 h-8 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    شرح مرئي وصوتي (Explainer Video Mode)
                </h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => exportToPDF(contentRef, 'تفاصيل_الشرح_Solvica', true)}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 text-white rounded-xl transition-all font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(236,72,153,0.3)]"
                        title="تحميل تفريغ الشرح كملف PDF"
                    >
                        <Download className="w-5 h-5" />
                        تنزيل PDF
                    </button>
                    <button onClick={() => { window.speechSynthesis.cancel(); onClose(); }} className="p-2 bg-white/10 hover:bg-red-500/20 text-white rounded-xl transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            </div>

            {/* Display Area */}
            <div id="explainer-content" ref={contentRef} className="flex-1 w-full bg-white/5 border border-white/10 rounded-2xl p-6 overflow-y-auto relative shadow-2xl">
                <div className="absolute top-4 left-4 flex gap-2">
                    <div className="flex gap-1">
                        <span className={`w-1 h-4 bg-purple-500 rounded-full ${isPlaying ? 'animate-bounce' : ''}`}></span>
                        <span className={`w-1 h-6 bg-pink-500 rounded-full ${isPlaying ? 'animate-bounce' : ''}`} style={{ animationDelay: '0.1s' }}></span>
                        <span className={`w-1 h-3 bg-blue-500 rounded-full ${isPlaying ? 'animate-bounce' : ''}`} style={{ animationDelay: '0.2s' }}></span>
                    </div>
                </div>

                <div className="prose prose-invert prose-lg max-w-none leading-relaxed">
                    {sentences.map((sentence, idx) => {
                        if (idx !== currentSentenceIndex) {
                            return (
                                <span key={idx} className={`transition-all duration-300 rounded ${idx < currentSentenceIndex ? 'text-gray-400 opacity-60' : 'text-gray-100'}`}>
                                    {sentence}{' '}
                                </span>
                            );
                        }

                        // Current sentence word-by-word logic
                        const beforeStr = sentence.slice(0, currentCharIndex);
                        const afterStr = sentence.slice(currentCharIndex);
                        const wordMatch = afterStr.match(/^\S+/);
                        const currentWord = wordMatch ? wordMatch[0] : '';
                        const restAfterWord = wordMatch ? afterStr.slice(currentWord.length) : afterStr;

                        return (
                            <span key={idx} className="bg-white/5 border border-white/10 p-2 inline-block rounded-xl my-2 shadow-[0_0_20px_rgba(255,255,255,0.05)] text-gray-200 transition-all scale-[1.02]">
                                <span>{beforeStr}</span>
                                <span className="bg-yellow-400 text-black font-extrabold px-1 rounded mx-0.5 shadow-md transition-all">{currentWord}</span>
                                <span>{restAfterWord}</span>
                                {' '}
                            </span>
                        );
                    })}
                </div>
            </div>

            {/* Controls */}
            <div className="max-w-3xl mx-auto w-full mt-6 bg-black/40 border border-white/10 p-4 rounded-full flex justify-center items-center gap-6">
                <button
                    onClick={handlePlayPause}
                    className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-purple-500/30"
                >
                    {isPlaying ? (
                        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    ) : (
                        <svg className="w-8 h-8 text-white pl-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    )}
                </button>

                <button
                    onClick={handleStopDeeper}
                    className="px-6 py-3 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 rounded-full font-bold transition-all flex items-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    قف! اشرح لي هذه النقطة بالتفصيل
                </button>
            </div>

            {/* Interactive Q&A Chatbox */}
            <div className="max-w-3xl mx-auto w-full mt-4 flex gap-2">
                <input
                    type="text"
                    placeholder="لديك سؤال عابر أو لم تفهم نقطة معينة؟ اسأل هنا..."
                    className="flex-1 bg-white/10 border border-white/20 rounded-2xl px-6 py-4 text-white placeholder-gray-400 focus:outline-none focus:border-pink-500 shadow-inner"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            const question = e.currentTarget.value;
                            e.currentTarget.value = '';
                            onExplainDeeper(question);
                        }
                    }}
                />
            </div>

        </div>
    );
};
