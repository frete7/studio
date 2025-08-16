import { doc, getDoc, updateDoc, collection, addDoc, deleteDoc, query, where, getDocs, getCountFromServer, serverTimestamp, runTransaction, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function safeGetDoc<T>(path: string, id: string): Promise<T | null> {
    try {
        const docRef = doc(db, path, id);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } as T : null;
    } catch (error) {
        console.error(`Error getting document from ${path}:`, error);
        return null;
    }
}

export async function safeUpdateDoc(path: string, id: string, data: any): Promise<void> {
    try {
        const docRef = doc(db, path, id);
        await updateDoc(docRef, data);
    } catch (error) {
        throw new Error(`Falha ao atualizar documento em ${path}: ${error}`);
    }
}

export async function safeAddDoc<T>(path: string, data: any): Promise<T> {
    try {
        const collectionRef = collection(db, path);
        const docRef = await addDoc(collectionRef, data);
        return { id: docRef.id, ...data } as T;
    } catch (error) {
        throw new Error(`Falha ao adicionar documento em ${path}: ${error}`);
    }
}

export async function safeDeleteDoc(path: string, id: string): Promise<void> {
    try {
        const docRef = doc(db, path, id);
        await deleteDoc(docRef);
    } catch (error) {
        throw new Error(`Falha ao deletar documento em ${path}: ${error}`);
    }
}

export async function safeQueryDocs<T>(path: string, conditions: Array<[string, string, any]> = []): Promise<T[]> {
    try {
        let q = collection(db, path);
        
        if (conditions.length > 0) {
            q = query(q, ...conditions.map(([field, operator, value]) => where(field, operator as any, value)));
        }
        
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as T));
    } catch (error) {
        console.error(`Error querying documents from ${path}:`, error);
        return [];
    }
}

export async function safeCountDocs(path: string, conditions: Array<[string, string, any]> = []): Promise<number> {
    try {
        let q = collection(db, path);
        
        if (conditions.length > 0) {
            q = query(q, ...conditions.map(([field, operator, value]) => where(field, operator as any, value)));
        }
        
        const snapshot = await getCountFromServer(q);
        return snapshot.data().count;
    } catch (error) {
        console.error(`Error counting documents from ${path}:`, error);
        return 0;
    }
}

export function createTimestamp() {
    return serverTimestamp();
}

export async function executeTransaction<T>(updateFunction: (transaction: any) => Promise<T>): Promise<T> {
    return await runTransaction(db, updateFunction);
}

export function createBatch() {
    return writeBatch(db);
}
