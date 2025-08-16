'use server';

import { safeUpdateDoc, safeGetDoc } from './utils/firestore-helpers';
import { handleFirestoreError, validateRequiredField, validateRequiredFields } from './utils/error-handling';
import { validateCPF, sanitizeString } from './utils/validation';

// Types
export type UserUpdateData = {
    name?: string;
    tradingName?: string;
    cnpj?: string;
    address?: {
        cep?: string;
        logradouro?: string;
        numero?: string;
        complemento?: string;
        bairro?: string;
        cidade?: string;
        uf?: string;
    };
    responsible?: {
        name?: string;
        cpf?: string;
        phone?: string;
        email?: string;
        document?: {
            url?: string;
            status?: string;
        };
    };
};

// User Status Actions
export async function updateUserStatus(uid: string, status: string): Promise<void> {
    validateRequiredFields({ uid, status });
    
    try {
        await safeUpdateDoc('users', uid, { status });
    } catch (error) {
        handleFirestoreError(error, 'atualizar o status do usuário');
    }
}

export async function updateDocumentStatus(
    userId: string, 
    docField: 'responsible.document' | 'cnpjCard', 
    docStatus: string
): Promise<void> {
    validateRequiredFields({ userId, docField, docStatus });
    
    try {
        const userDoc = await safeGetDoc('users', userId);
        if (!userDoc) {
            throw new Error("User not found.");
        }

        const userData = userDoc as any;
        const updatePayload: { [key: string]: any } = {};
        
        const getDocumentData = (docData: any) => {
            if (typeof docData === 'string') {
                return { url: docData, status: 'pending' }; 
            }
            return docData || {}; 
        };

        if (docField === 'responsible.document') {
            const responsibleData = userData.responsible || {};
            const documentData = getDocumentData(responsibleData.document);
            updatePayload['responsible.document'] = { ...documentData, status: docStatus };
        } else { 
            const cnpjCardData = getDocumentData(userData.cnpjCard);
            updatePayload['cnpjCard'] = { ...cnpjCardData, status: docStatus };
        }
        
        await safeUpdateDoc('users', userId, updatePayload);
    } catch (error) {
        handleFirestoreError(error, 'atualizar o status do documento');
    }
}

export async function assignPlanToUser(userId: string, planId: string, planName: string): Promise<void> {
    validateRequiredFields({ userId, planId, planName });
    
    try {
        await safeUpdateDoc('users', userId, {
            activePlanId: planId,
            activePlanName: planName,
        });
    } catch (error) {
        handleFirestoreError(error, 'atribuir o plano ao usuário');
    }
}

// User Update Actions
function validateUserUpdateData(data: any): Partial<UserUpdateData> {
    const validatedData: Partial<UserUpdateData> = {};
    
    if (data.name && typeof data.name === 'string') {
        validatedData.name = sanitizeString(data.name);
    }
    
    if (data.tradingName && typeof data.tradingName === 'string') {
        validatedData.tradingName = sanitizeString(data.tradingName);
    }
    
    if (data.cnpj && typeof data.cnpj === 'string') {
        validatedData.cnpj = sanitizeString(data.cnpj);
    }
    
    if (data.address && typeof data.address === 'object') {
        validatedData.address = {};
        if (data.address.cep && typeof data.address.cep === 'string') validatedData.address.cep = sanitizeString(data.address.cep);
        if (data.address.logradouro && typeof data.address.logradouro === 'string') validatedData.address.logradouro = sanitizeString(data.address.logradouro);
        if (data.address.numero && typeof data.address.numero === 'string') validatedData.address.numero = sanitizeString(data.address.numero);
        if (data.address.complemento && typeof data.address.complemento === 'string') validatedData.address.complemento = sanitizeString(data.address.complemento);
        if (data.address.bairro && typeof data.address.bairro === 'string') validatedData.address.bairro = sanitizeString(data.address.bairro);
        if (data.address.cidade && typeof data.address.cidade === 'string') validatedData.address.cidade = sanitizeString(data.address.cidade);
        if (data.address.uf && typeof data.address.uf === 'string') validatedData.address.uf = sanitizeString(data.address.uf);
    }
    
    if (data.responsible && typeof data.responsible === 'object') {
        validatedData.responsible = {};
        if (data.responsible.name && typeof data.responsible.name === 'string') validatedData.responsible.name = sanitizeString(data.responsible.name);
        if (data.responsible.cpf && typeof data.responsible.cpf === 'string') validatedData.responsible.cpf = sanitizeString(data.responsible.cpf);
        if (data.responsible.phone && typeof data.responsible.phone === 'string') validatedData.responsible.phone = sanitizeString(data.responsible.phone);
        if (data.responsible.email && typeof data.responsible.email === 'string') validatedData.responsible.email = sanitizeString(data.responsible.email);
        if (data.responsible.document && typeof data.responsible.document === 'object') {
            validatedData.responsible.document = {};
            if (data.responsible.document.url && typeof data.responsible.document.url === 'string') validatedData.responsible.document.url = data.responsible.document.url;
            if (data.responsible.document.status && typeof data.responsible.document.status === 'string') validatedData.responsible.document.status = data.responsible.document.status;
        }
    }
    
    return validatedData;
}

export async function updateUserByAdmin(userId: string, data: any): Promise<void> {
    validateRequiredField(userId, 'ID do usuário');
    
    const validatedData = validateUserUpdateData(data);
    
    try {
        const userDoc = await safeGetDoc('users', userId);
        if (!userDoc) {
            throw new Error("User not found.");
        }
        
        const userData = userDoc as any;
        
        const updateData = {
            ...validatedData,
            responsible: {
                ...(userData.responsible || {}),
                ...(validatedData.responsible || {}),
            }
        };

        await safeUpdateDoc('users', userId, updateData);
    } catch (error) {
        handleFirestoreError(error, 'atualizar os dados do usuário');
    }
}
