import { Timestamp } from 'firebase/firestore';

export function convertTimestampToISO(timestamp: any): string | null {
    if (!timestamp) return null;
    
    if (timestamp instanceof Timestamp) {
        return timestamp.toDate().toISOString();
    }
    
    if (typeof timestamp.toDate === 'function') {
        return timestamp.toDate().toISOString();
    }
    
    return null;
}

export function generateUniqueId(prefix: string): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 7);
    return `${prefix}-${timestamp}-${random}`;
}

export function safeCast<T>(data: any, fallback: T): T {
    try {
        return data as T;
    } catch {
        return fallback;
    }
}

export function convertFirestoreDoc<T>(doc: any): T {
    const data = doc.data();
    const createdAt = convertTimestampToISO(data.createdAt);
    
    return {
        ...data,
        id: doc.id,
        createdAt,
    } as T;
}

export function convertFirestoreDocs<T>(docs: any[]): T[] {
    return docs.map(doc => convertFirestoreDoc<T>(doc));
}
