'use server';

import { safeAddDoc, safeUpdateDoc, safeGetDoc } from './utils/firestore-helpers';
import { handleFirestoreError, validateRequiredField } from './utils/error-handling';

// Types
export type NotificationType = 
    | 'document_approved' 
    | 'document_rejected' 
    | 'user_activated' 
    | 'user_blocked' 
    | 'user_suspended'
    | 'plan_assigned'
    | 'freight_status_changed';

export type Notification = {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
    isRead: boolean;
    createdAt: any;
    readAt?: any;
};

export type NotificationTemplate = {
    type: NotificationType;
    title: string;
    message: string;
    data?: any;
};

// Notification Templates
const notificationTemplates: Record<NotificationType, NotificationTemplate> = {
    document_approved: {
        type: 'document_approved',
        title: 'Documento Aprovado! 🎉',
        message: 'Seu documento foi aprovado pela nossa equipe. Continue com o processo de cadastro.',
        data: { requiresAction: true }
    },
    document_rejected: {
        type: 'document_rejected',
        title: 'Documento Rejeitado ❌',
        message: 'Seu documento foi rejeitado. Verifique as observações e envie um novo documento.',
        data: { requiresAction: true }
    },
    user_activated: {
        type: 'user_activated',
        title: 'Conta Ativada! 🚀',
        message: 'Sua conta foi ativada com sucesso! Agora você pode usar todas as funcionalidades da plataforma.',
        data: { requiresAction: false }
    },
    user_blocked: {
        type: 'user_blocked',
        title: 'Conta Bloqueada ⚠️',
        message: 'Sua conta foi bloqueada temporariamente. Entre em contato com o suporte para mais informações.',
        data: { requiresAction: true }
    },
    user_suspended: {
        type: 'user_suspended',
        title: 'Conta Suspensa ⚠️',
        message: 'Sua conta foi suspensa. Entre em contato com o suporte para resolver a situação.',
        data: { requiresAction: true }
    },
    plan_assigned: {
        type: 'plan_assigned',
        title: 'Plano Atribuído 💎',
        message: 'Um novo plano foi atribuído à sua conta. Aproveite os novos recursos disponíveis!',
        data: { requiresAction: false }
    },
    freight_status_changed: {
        type: 'freight_status_changed',
        title: 'Status do Frete Alterado 📦',
        message: 'O status de um de seus fretes foi alterado. Verifique os detalhes na plataforma.',
        data: { requiresAction: false }
    }
};

// Create Notification
export async function createNotification(
    userId: string, 
    type: NotificationType, 
    customData?: any
): Promise<string> {
    validateRequiredField(userId, 'ID do usuário');
    
    try {
        const template = notificationTemplates[type];
        if (!template) {
            throw new Error(`Tipo de notificação inválido: ${type}`);
        }
        
        const notificationData: Omit<Notification, 'id'> = {
            userId,
            type,
            title: customData?.title || template.title,
            message: customData?.message || template.message,
            data: { ...template.data, ...customData },
            isRead: false,
            createdAt: new Date().toISOString()
        };
        
        const result = await safeAddDoc('notifications', notificationData);
        return result.id;
    } catch (error) {
        handleFirestoreError(error, 'criar notificação');
    }
}

// Mark Notification as Read
export async function markNotificationAsRead(notificationId: string): Promise<void> {
    validateRequiredField(notificationId, 'ID da notificação');
    
    try {
        await safeUpdateDoc('notifications', notificationId, {
            isRead: true,
            readAt: new Date().toISOString()
        });
    } catch (error) {
        handleFirestoreError(error, 'marcar notificação como lida');
    }
}

// Mark All User Notifications as Read
export async function markAllUserNotificationsAsRead(userId: string): Promise<void> {
    validateRequiredField(userId, 'ID do usuário');
    
    try {
        // This would require a batch update in a real implementation
        // For now, we'll just update the most recent ones
        const notifications = await safeQueryDocs('notifications', [
            ['userId', '==', userId],
            ['isRead', '==', false]
        ]);
        
        const batch = writeBatch();
        notifications.forEach(notification => {
            const docRef = doc(db, 'notifications', notification.id);
            batch.update(docRef, {
                isRead: true,
                readAt: new Date().toISOString()
            });
        });
        
        await batch.commit();
    } catch (error) {
        handleFirestoreError(error, 'marcar todas as notificações como lidas');
    }
}

// Get User Notifications
export async function getUserNotifications(
    userId: string, 
    limit: number = 50
): Promise<Notification[]> {
    validateRequiredField(userId, 'ID do usuário');
    
    try {
        const notifications = await safeQueryDocs('notifications', [
            ['userId', '==', userId]
        ]);
        
        // Sort by creation date (newest first) and limit results
        return notifications
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, limit);
    } catch (error) {
        handleFirestoreError(error, 'buscar notificações do usuário');
    }
}

// Get Unread Notifications Count
export async function getUnreadNotificationsCount(userId: string): Promise<number> {
    validateRequiredField(userId, 'ID do usuário');
    
    try {
        const notifications = await safeQueryDocs('notifications', [
            ['userId', '==', userId],
            ['isRead', '==', false]
        ]);
        
        return notifications.length;
    } catch (error) {
        handleFirestoreError(error, 'contar notificações não lidas');
    }
}

// Delete Old Notifications
export async function deleteOldNotifications(
    userId: string, 
    daysOld: number = 30
): Promise<void> {
    validateRequiredFields({ userId, daysOld });
    
    try {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        const notifications = await safeQueryDocs('notifications', [
            ['userId', '==', userId],
            ['createdAt', '<', cutoffDate.toISOString()]
        ]);
        
        const batch = writeBatch();
        notifications.forEach(notification => {
            const docRef = doc(db, 'notifications', notification.id);
            batch.delete(docRef);
        });
        
        await batch.commit();
    } catch (error) {
        handleFirestoreError(error, 'deletar notificações antigas');
    }
}

// Bulk Notification Creation
export async function createBulkNotifications(
    userIds: string[], 
    type: NotificationType, 
    customData?: any
): Promise<{ success: number; failed: number }> {
    validateRequiredFields({ userIds, type });
    
    const results = { success: 0, failed: 0 };
    
    for (const userId of userIds) {
        try {
            await createNotification(userId, type, customData);
            results.success++;
        } catch (error) {
            console.error(`Failed to create notification for user ${userId}:`, error);
            results.failed++;
        }
    }
    
    return results;
}

// System Notifications (for important updates)
export async function createSystemNotification(
    title: string, 
    message: string, 
    targetUsers?: 'all' | 'companies' | 'drivers' | string[]
): Promise<void> {
    validateRequiredFields({ title, message });
    
    try {
        let userIds: string[] = [];
        
        if (targetUsers === 'all') {
            // Get all users
            const allUsers = await safeQueryDocs('users');
            userIds = allUsers.map(user => user.uid);
        } else if (targetUsers === 'companies') {
            // Get only company users
            const companies = await safeQueryDocs('users', [['role', '==', 'company']]);
            userIds = companies.map(user => user.uid);
        } else if (targetUsers === 'drivers') {
            // Get only driver users
            const drivers = await safeQueryDocs('users', [['role', '==', 'driver']]);
            userIds = drivers.map(user => user.uid);
        } else if (Array.isArray(targetUsers)) {
            userIds = targetUsers;
        }
        
        if (userIds.length > 0) {
            await createBulkNotifications(userIds, 'system_update', {
                title,
                message,
                isSystemNotification: true
            });
        }
    } catch (error) {
        handleFirestoreError(error, 'criar notificação do sistema');
    }
}
