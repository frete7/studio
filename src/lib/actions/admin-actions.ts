'use server';

import { safeGetDoc, safeUpdateDoc, safeQueryDocs, safeAddDoc } from './utils/firestore-helpers';
import { handleFirestoreError, validateRequiredField, validateRequiredFields } from './utils/error-handling';
import { validateCPF, validateCNPJ } from './utils/validation';
import { createNotification } from './notification-actions';

// Types
export type AdminUserProfile = {
    uid: string;
    name: string;
    email: string;
    role: 'driver' | 'company' | 'admin';
    status: 'active' | 'pending' | 'blocked' | 'suspended' | 'incomplete';
    createdAt: any;
    // Company specific fields
    cnpj?: string;
    responsible?: {
        name: string;
        cpf: string;
        document?: {
            url: string;
            status: 'pending' | 'approved' | 'rejected';
        };
    };
    cnpjCard?: {
        url: string;
        status: 'pending' | 'approved' | 'rejected';
    };
    // Driver specific fields
    cnh?: string;
    cnhCategory?: string;
};

export type DocumentApprovalResult = {
    success: boolean;
    message: string;
    newUserStatus?: string;
    requiresAction?: boolean;
};

// Document Approval Functions
export async function approveDocument(
    userId: string, 
    documentType: 'responsible.document' | 'cnpjCard', 
    adminId: string
): Promise<DocumentApprovalResult> {
    validateRequiredFields({ userId, documentType, adminId });
    
    try {
        // Update document status
        await safeUpdateDoc('users', userId, {
            [documentType]: { status: 'approved' }
        });
        
        // Check if user can be automatically activated
        const canActivate = await checkIfUserCanBeActivated(userId);
        
        if (canActivate) {
            await safeUpdateDoc('users', userId, { status: 'active' });
            
            // Create notification for user activation
            await createNotification(userId, 'user_activated');
            
            // Log admin action
            await logAdminAction(adminId, 'document_approved_and_user_activated', {
                userId,
                documentType,
                newStatus: 'active'
            });
            
            return {
                success: true,
                message: 'Documento aprovado e usuário ativado automaticamente',
                newUserStatus: 'active'
            };
        } else {
            // Create notification for document approval
            await createNotification(userId, 'document_approved');
            
            // Log admin action
            await logAdminAction(adminId, 'document_approved', {
                userId,
                documentType
            });
            
            return {
                success: true,
                message: 'Documento aprovado. Usuário ainda aguarda outros documentos.',
                requiresAction: true
            };
        }
    } catch (error) {
        handleFirestoreError(error, 'aprovar documento');
    }
}

export async function rejectDocument(
    userId: string, 
    documentType: 'responsible.document' | 'cnpjCard', 
    adminId: string,
    reason?: string
): Promise<DocumentApprovalResult> {
    validateRequiredFields({ userId, documentType, adminId });
    
    try {
        // Update document status
        await safeUpdateDoc('users', userId, {
            [documentType]: { 
                status: 'rejected',
                rejectionReason: reason || 'Documento não atende aos requisitos'
            }
        });
        
        // Set user status to incomplete if they were active
        const userDoc = await safeGetDoc('users', userId);
        if (userDoc && (userDoc as any).status === 'active') {
            await safeUpdateDoc('users', userId, { status: 'incomplete' });
        }
        
        // Create notification for document rejection
        await createNotification(userId, 'document_rejected', { reason });
        
        // Log admin action
        await logAdminAction(adminId, 'document_rejected', {
            userId,
            documentType,
            reason
        });
        
        return {
            success: true,
            message: 'Documento rejeitado. Usuário deve enviar novo documento.',
            newUserStatus: 'incomplete'
        };
    } catch (error) {
        handleFirestoreError(error, 'rejeitar documento');
    }
}

// User Status Management
export async function updateUserStatusWithValidation(
    userId: string, 
    newStatus: AdminUserProfile['status'], 
    adminId: string
): Promise<DocumentApprovalResult> {
    validateRequiredFields({ userId, newStatus, adminId });
    
    try {
        const userDoc = await safeGetDoc('users', userId);
        if (!userDoc) {
            throw new Error('Usuário não encontrado');
        }
        
        // Validate status change
        if (newStatus === 'active') {
            const canActivate = await checkIfUserCanBeActivated(userId);
            if (!canActivate) {
                return {
                    success: false,
                    message: 'Usuário não pode ser ativado. Documentos pendentes ou rejeitados.',
                    requiresAction: true
                };
            }
        }
        
        // Update user status
        await safeUpdateDoc('users', userId, { status: newStatus });
        
        // Log admin action
        await logAdminAction(adminId, 'user_status_changed', {
            userId,
            oldStatus: (userDoc as any).status,
            newStatus
        });
        
        return {
            success: true,
            message: `Status do usuário alterado para ${newStatus}`,
            newUserStatus: newStatus
        };
    } catch (error) {
        handleFirestoreError(error, 'alterar status do usuário');
    }
}

// Validation Functions
async function checkIfUserCanBeActivated(userId: string): Promise<boolean> {
    try {
        const userDoc = await safeGetDoc('users', userId);
        if (!userDoc) return false;
        
        // Check if user is a company
        if ((userDoc as any).role === 'company') {
            // Company needs both documents approved
            const responsibleDoc = (userDoc as any).responsible?.document;
            const cnpjCard = (userDoc as any).cnpjCard;
            
            return (
                responsibleDoc?.status === 'approved' && 
                cnpjCard?.status === 'approved'
            );
        }
        
        // Driver needs CNH and basic info
        if ((userDoc as any).role === 'driver') {
            return (
                (userDoc as any).cnh && 
                (userDoc as any).cnhCategory && 
                (userDoc as any).name && 
                (userDoc as any).email
            );
        }
        
        return false;
    } catch (error) {
        console.error('Error checking if user can be activated:', error);
        return false;
    }
}

// Admin Action Logging
async function logAdminAction(
    adminId: string, 
    action: string, 
    details: any
): Promise<void> {
    try {
        const logData = {
            adminId,
            action,
            details,
            timestamp: new Date().toISOString(),
            ip: 'server' // In a real app, you'd get the actual IP
        };
        
        await safeAddDoc('admin_actions_log', logData);
    } catch (error) {
        console.error('Failed to log admin action:', error);
        // Don't throw error for logging failures
    }
}

// Bulk Operations
export async function bulkApproveUsers(
    userIds: string[], 
    adminId: string
): Promise<{ success: number; failed: number; details: string[] }> {
    validateRequiredField(userIds, 'IDs dos usuários');
    
    const results = {
        success: 0,
        failed: 0,
        details: [] as string[]
    };
    
    for (const userId of userIds) {
        try {
            const canActivate = await checkIfUserCanBeActivated(userId);
            if (canActivate) {
                await safeUpdateDoc('users', userId, { status: 'active' });
                results.success++;
                results.details.push(`Usuário ${userId} ativado com sucesso`);
            } else {
                results.failed++;
                results.details.push(`Usuário ${userId} não pode ser ativado - documentos pendentes`);
            }
        } catch (error) {
            results.failed++;
            results.details.push(`Erro ao ativar usuário ${userId}: ${error}`);
        }
    }
    
    // Log bulk action
    await logAdminAction(adminId, 'bulk_user_approval', {
        totalUsers: userIds.length,
        success: results.success,
        failed: results.failed
    });
    
    return results;
}

// User Validation Functions
export async function validateUserDocuments(userId: string): Promise<{
    isValid: boolean;
    issues: string[];
    missingDocuments: string[];
}> {
    try {
        const userDoc = await safeGetDoc('users', userId);
        if (!userDoc) {
            return { isValid: false, issues: ['Usuário não encontrado'], missingDocuments: [] };
        }
        
        const issues: string[] = [];
        const missingDocuments: string[] = [];
        
        if ((userDoc as any).role === 'company') {
            // Validate company documents
            if (!(userDoc as any).cnpj || !validateCNPJ((userDoc as any).cnpj)) {
                issues.push('CNPJ inválido ou não informado');
                missingDocuments.push('CNPJ válido');
            }
            
            if (!(userDoc as any).responsible?.cpf || !validateCPF((userDoc as any).responsible.cpf)) {
                issues.push('CPF do responsável inválido ou não informado');
                missingDocuments.push('CPF do responsável');
            }
            
            if (!(userDoc as any).responsible?.document?.url) {
                issues.push('Documento do responsável não enviado');
                missingDocuments.push('Documento do responsável');
            }
            
            if (!(userDoc as any).cnpjCard?.url) {
                issues.push('Cartão CNPJ não enviado');
                missingDocuments.push('Cartão CNPJ');
            }
        }
        
        if ((userDoc as any).role === 'driver') {
            // Validate driver documents
            if (!(userDoc as any).cnh) {
                issues.push('CNH não informada');
                missingDocuments.push('CNH');
            }
            
            if (!(userDoc as any).cnhCategory) {
                issues.push('Categoria da CNH não informada');
                missingDocuments.push('Categoria da CNH');
            }
        }
        
        return {
            isValid: issues.length === 0,
            issues,
            missingDocuments
        };
    } catch (error) {
        return { 
            isValid: false, 
            issues: [`Erro ao validar usuário: ${error}`], 
            missingDocuments: [] 
        };
    }
}
