// User Actions
export * from './user-actions';

// Admin Actions
export * from './admin-actions';

// Freight Actions
export * from './freight-actions';

// Notification Actions
export * from './notification-actions';

// Payment Actions
export * from './payment-actions';

// Re-export utility functions for convenience
export * from './utils/error-handling';
export * from './utils/firestore-helpers';
export * from './utils/validation';
export * from './utils/type-helpers';

// AI Route Optimization
export async function getOptimizedRoute(input: any): Promise<any> {
    try {
        const { optimizeRoute } = await import('@/ai/flows/optimize-route');
        const result = await optimizeRoute(input);
        return result;
    } catch (error) {
        console.error('Error optimizing route:', error);
        throw new Error('Falha ao otimizar a rota. Tente novamente mais tarde.');
    }
}
