import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyCX-pf42zk0oH5jg5-iJJCyNt3_wBKpUXI";

export interface VectorChunk {
    id: string;
    documentId: string;
    text: string;
    embedding: number[];
}

export class MemoryVectorStore {
    private chunks: VectorChunk[] = [];
    private genAI: GoogleGenerativeAI | null = null;
    private model: any = null;

    constructor() {
        if (GEMINI_API_KEY) {
            this.genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
            this.model = this.genAI.getGenerativeModel({ model: "gemini-embedding-001" });
        }
    }

    /**
     * Generates an embedding vector for a given text string.
     */
    async generateEmbedding(text: string): Promise<number[]> {
        if (!this.model) {
            console.warn("No Gemini API Key found. Returning dummy embedding for UI testing.");
            return new Array(768).fill(Math.random());
        }

        try {
            const result = await this.model.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            console.error("Embedding generation failed:", error);
            throw new Error("Failed to generate embedding");
        }
    }

    /**
     * Adds an array of text chunks to the memory store.
     */
    async addDocumentChunks(documentId: string, textChunks: string[]): Promise<void> {
        const newVectors: VectorChunk[] = [];

        // Process sequentially to prevent Gemini Rate Limiting (429) & Browser UI freezes
        for (let i = 0; i < textChunks.length; i++) {
            try {
                const embedding = await this.generateEmbedding(textChunks[i]);
                newVectors.push({
                    id: crypto.randomUUID(),
                    documentId,
                    text: textChunks[i],
                    embedding
                });

                // Yield to main thread every few chunks so the UI Spinner keeps spinning
                if (i % 5 === 0) {
                    await new Promise(r => setTimeout(r, 100));
                }
            } catch (error) {
                console.warn(`Embedding failed at chunk ${i} (Likely Rate Limit), using fallback vector...`, error);
                newVectors.push({
                    id: crypto.randomUUID(),
                    documentId,
                    text: textChunks[i],
                    embedding: new Array(768).fill(Math.random()) // Fallback to store text anyway
                });
            }
        }

        this.chunks.push(...newVectors);
        console.log(`Added ${newVectors.length} chunks to vector store.`);
    }

    /**
     * Removes all chunks associated with a specific document ID.
     */
    deleteDocumentChunks(documentId: string): void {
        const initialLength = this.chunks.length;
        this.chunks = this.chunks.filter(chunk => chunk.documentId !== documentId);
        console.log(`Deleted ${initialLength - this.chunks.length} chunks for document ${documentId}.`);
    }

    /**
     * Calculates cosine similarity between two vectors.
     */
    private cosineSimilarity(vecA: number[], vecB: number[]): number {
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            normA += vecA[i] * vecA[i];
            normB += vecB[i] * vecB[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    /**
     * Searches the vector store for chunks most similar to the query.
     */
    async similaritySearch(query: string, limit: number = 3, filterDocId?: string): Promise<VectorChunk[]> {
        let targetChunks = this.chunks;
        if (filterDocId) {
            targetChunks = this.chunks.filter(c => c.documentId === filterDocId);
        }

        if (targetChunks.length === 0) return [];

        try {
            const queryEmbedding = await this.generateEmbedding(query);

            // Calculate similarity scores
            const scoredChunks = targetChunks.map(chunk => ({
                chunk,
                score: this.cosineSimilarity(queryEmbedding, chunk.embedding)
            }));

            // Sort by descending score
            scoredChunks.sort((a, b) => b.score - a.score);

            // Return the top 'limit' chunks
            return scoredChunks.slice(0, limit).map(item => item.chunk);
        } catch (error) {
            console.warn("Similarity Search: Embedding API failed. Falling back to simple keyword search over memory chunks.", error);

            // Fallback: Simple keyword overlap scoring 
            const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
            if (keywords.length === 0) return targetChunks.slice(0, limit);

            const scoredChunks = targetChunks.map(chunk => {
                const text = chunk.text.toLowerCase();
                let matches = 0;
                for (const kw of keywords) {
                    if (text.includes(kw)) matches++;
                }
                return { chunk, score: matches };
            });

            // Keep only chunks with at least 1 match, sort by matches, take limit
            const relevant = scoredChunks.filter(c => c.score > 0).sort((a, b) => b.score - a.score);
            return relevant.length > 0
                ? relevant.slice(0, limit).map(item => item.chunk)
                : targetChunks.slice(0, limit); // If no matches, just return the first few to give AI *some* context
        }
    }
}

// Global instance for simple client-side app
export const globalVectorStore = new MemoryVectorStore();
