/**
 * MemoryVectorStore — Instant Local TF-IDF Engine
 *
 * ✅ No API calls. No rate limits. No hangs.
 * ✅ Indexing and search are both done 100% locally in the browser.
 * ✅ Uses BM25-style term frequency weighting for accurate semantic-like retrieval.
 */

export interface VectorChunk {
    id: string;
    documentId: string;
    text: string;
    embedding: number[]; // kept for interface compatibility, unused internally
    // Precomputed TF map for fast BM25 scoring
    termFreq?: Map<string, number>;
    numTokens?: number;
}

// ── Text helpers ──────────────────────────────────────────────────────────────

/** Tokenize Arabic + English text into meaningful lowercase words */
function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^\u0600-\u06FF\u0750-\u077F\w\s]/g, ' ')
        .split(/\s+/)
        .filter(w => w.length > 2);
}

/** Compute term-frequency map for a list of tokens */
function buildTermFreq(tokens: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
    return freq;
}

// ── BM25 Parameters ───────────────────────────────────────────────────────────
const K1 = 1.5;
const B = 0.75;

export class MemoryVectorStore {
    private chunks: VectorChunk[] = [];
    private idf: Map<string, number> = new Map();
    private avgDocLen = 0;

    /** Precompute IDF scores across all stored chunks */
    private rebuildIdf() {
        const N = this.chunks.length;
        if (N === 0) { this.avgDocLen = 0; return; }

        const df = new Map<string, number>();
        let totalTokens = 0;
        for (const chunk of this.chunks) {
            totalTokens += chunk.numTokens ?? 0;
            for (const term of (chunk.termFreq ?? new Map()).keys()) {
                df.set(term, (df.get(term) ?? 0) + 1);
            }
        }
        this.avgDocLen = totalTokens / N;
        this.idf = new Map();
        for (const [term, docCount] of df) {
            this.idf.set(term, Math.log((N - docCount + 0.5) / (docCount + 0.5) + 1));
        }
    }

    /** BM25 score for a chunk given a query token list */
    private bm25(chunk: VectorChunk, queryTokens: string[]): number {
        const tf = chunk.termFreq ?? new Map<string, number>();
        const dl = chunk.numTokens ?? 1;
        let score = 0;
        for (const term of queryTokens) {
            const idf = this.idf.get(term) ?? 0;
            const f = tf.get(term) ?? 0;
            score += idf * (f * (K1 + 1)) / (f + K1 * (1 - B + B * dl / (this.avgDocLen || 1)));
        }
        return score;
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /** Adds document chunks instantly — zero API calls, zero latency */
    async addDocumentChunks(documentId: string, textChunks: string[]): Promise<void> {
        // ⚡ DEDUPLICATION: Skip if already indexed to prevent memory leaks and lag
        if (this.chunks.some(c => c.documentId === documentId)) {
            return;
        }

        const newChunks: VectorChunk[] = textChunks.map(text => {
            const tokens = tokenize(text);
            return {
                id: crypto.randomUUID(),
                documentId,
                text,
                embedding: [], // not used
                termFreq: buildTermFreq(tokens),
                numTokens: tokens.length
            };
        });

        this.chunks.push(...newChunks);
        this.rebuildIdf();
        console.log(`⚡ Instantly indexed ${newChunks.length} chunks (no API calls)`);
    }

    /** Removes all chunks for a document */
    deleteDocumentChunks(documentId: string): void {
        const before = this.chunks.length;
        this.chunks = this.chunks.filter(c => c.documentId !== documentId);
        this.rebuildIdf();
        console.log(`Deleted ${before - this.chunks.length} chunks`);
    }

    /** Returns all chunks for a document (for summaries) */
    getAllDocumentChunks(documentId: string): VectorChunk[] {
        return this.chunks.filter(c => c.documentId === documentId);
    }

    /**
     * Fast BM25 similarity search — instant, no network calls.
     * Falls back to simple keyword matching if no chunks are indexed yet.
     */
    async similaritySearch(query: string, limit: number = 15, filterDocId?: string | string[]): Promise<VectorChunk[]> {
        let target = this.chunks;
        
        if (filterDocId) {
            if (Array.isArray(filterDocId)) {
                target = this.chunks.filter(c => filterDocId.includes(c.documentId));
            } else {
                target = this.chunks.filter(c => c.documentId === filterDocId);
            }
        }

        if (target.length === 0) return [];

        const queryTokens = tokenize(query);
        if (queryTokens.length === 0) return target.slice(0, limit);

        const scored = target.map(chunk => ({
            chunk,
            score: this.bm25(chunk, queryTokens)
        }));

        scored.sort((a, b) => b.score - a.score);

        // Return top results; if all scores are 0, fall back to positional order
        const top = scored.filter(s => s.score > 0);
        return (top.length > 0 ? top : scored).slice(0, limit).map(s => s.chunk);
    }

    // ─── Compatibility stub (kept for any code that calls this) ───────────────
    async generateEmbedding(_text: string): Promise<number[]> {
        return []; // BM25 mode — no embeddings needed
    }
}

// Global instance
export const globalVectorStore = new MemoryVectorStore();
