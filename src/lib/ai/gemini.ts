import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyCX-pf42zk0oH5jg5-iJJCyNt3_wBKpUXI";

export interface StreamCallbacks {
    onChunk: (chunk: string) => void;
    onComplete?: (fullText: string) => void;
    onError?: (error: any) => void;
}

export class GeminiClient {
    private genAI: GoogleGenerativeAI;

    constructor() {
        this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    }

    async streamChat(messages: any[], callbacks: StreamCallbacks, systemInstruction?: string) {
        try {
            // Usually gemini-2.5-flash but falling back to 1.5-flash if there are capacity issues
            const modelName = "gemini-2.5-flash";
            const model = this.genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemInstruction || undefined,
            });

            // Convert chat history
            const history = messages.slice(0, -1).map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            const chat = model.startChat({ history });
            let lastMsg = messages[messages.length - 1];

            const result = await chat.sendMessageStream(lastMsg.content);

            let fullText = '';
            for await (const chunk of result.stream) {
                const chunkText = chunk.text();
                fullText += chunkText;
                callbacks.onChunk(chunkText);
            }

            callbacks.onComplete?.(fullText);

        } catch (error) {
            console.error("Gemini Error:", error);
            callbacks.onError?.(error);
        }
    }

    async chat(messages: any[], systemInstruction?: string): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
                systemInstruction: systemInstruction || undefined,
            });

            const history = messages.slice(0, -1).map(m => ({
                role: m.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: m.content }]
            }));

            const chat = model.startChat({ history });
            const lastMsg = messages[messages.length - 1];

            const result = await chat.sendMessage(lastMsg.content);
            return result.response.text();
        } catch (error) {
            console.error("Gemini Error:", error);
            throw error;
        }
    }
}

export const geminiClient = new GeminiClient();
