import localforage from 'localforage';
import type { ParsedDocument } from '../rag/documentParser';
import type { AIChatMessage } from '../ai/aiClient';

// Configure multiple stores for different types of data
export const documentsStore = localforage.createInstance({
    name: "SolvicaDB",
    storeName: "documents"
});

export const chatHistoryStore = localforage.createInstance({
    name: "SolvicaDB",
    storeName: "chat_sessions"
});

export const activitiesStore = localforage.createInstance({
    name: "SolvicaDB",
    storeName: "saved_activities"
});

export interface ChatSession {
    id: string;
    title: string;
    messages: AIChatMessage[];
    updatedAt: number;
}

export interface SavedActivity {
    id: string;
    type: 'solver' | 'summary' | 'other';
    title: string;
    content: string;
    chatHistory: AIChatMessage[];
    updatedAt: number;
}

export const db = {
    // --- Document Methods ---
    async saveDocument(doc: ParsedDocument): Promise<void> {
        await documentsStore.setItem(doc.id, doc);
    },

    async getDocument(id: string): Promise<ParsedDocument | null> {
        return await documentsStore.getItem<ParsedDocument>(id);
    },

    async getAllDocuments(): Promise<ParsedDocument[]> {
        const docs: ParsedDocument[] = [];
        await documentsStore.iterate((value: ParsedDocument) => {
            docs.push(value);
        });
        return docs;
    },

    async deleteDocument(id: string): Promise<void> {
        await documentsStore.removeItem(id);
    },

    // --- Chat Session Methods ---
    async saveChatSession(session: ChatSession): Promise<void> {
        session.updatedAt = Date.now();
        await chatHistoryStore.setItem(session.id, session);
    },

    async getChatSession(id: string): Promise<ChatSession | null> {
        return await chatHistoryStore.getItem<ChatSession>(id);
    },

    async getAllChatSessions(): Promise<ChatSession[]> {
        const sessions: ChatSession[] = [];
        await chatHistoryStore.iterate((value: ChatSession) => {
            sessions.push(value);
        });
        // Sort descending by date
        return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async deleteChatSession(id: string): Promise<void> {
        await chatHistoryStore.removeItem(id);
    },

    // --- Saved Activities Methods ---
    async saveActivity(activity: SavedActivity): Promise<void> {
        activity.updatedAt = Date.now();
        await activitiesStore.setItem(activity.id, activity);
    },

    async getActivity(id: string): Promise<SavedActivity | null> {
        return await activitiesStore.getItem<SavedActivity>(id);
    },

    async getAllActivities(): Promise<SavedActivity[]> {
        const activities: SavedActivity[] = [];
        await activitiesStore.iterate((value: SavedActivity) => {
            activities.push(value);
        });
        return activities.sort((a, b) => b.updatedAt - a.updatedAt);
    },

    async deleteActivity(id: string): Promise<void> {
        await activitiesStore.removeItem(id);
    }
};
