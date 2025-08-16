'use server';

import { safeAddDoc, safeUpdateDoc, safeQueryDocs, safeCountDocs, executeTransaction, createTimestamp } from './utils/firestore-helpers';
import { handleFirestoreError, validateRequiredField } from './utils/error-handling';
import { generateUniqueId } from './utils/type-helpers';
import { doc } from 'firebase/firestore';

// Types
export type Freight = {
    id: string;
    freightType: 'comum' | 'agregamento' | 'frete-completo' | 'frete-retorno';
    origin: any;
    destinations: any[];
    createdAt: any;
    companyId: string;
    companyName?: string;
    status: 'active' | 'completed' | 'pending' | 'cancelled';
    collaboratorId?: string;
    responsibleCollaborators?: { id: string; name: string; phone: string }[];
    [key: string]: any;
};

export type FreightFilters = {
    originCities?: string[];
    destinationCities?: string[];
    freightTypes?: string[];
    requiredVehicles?: string[];
    requiredBodyworks?: string[];
    limit?: number;
};

// Freight Creation Actions
export async function addAggregationFreight(companyId: string, companyName: string, data: any): Promise<string[]> {
    validateRequiredField(companyId, 'ID da empresa');
    
    try {
        const freightsCollection = 'freights';
        const generatedIds: string[] = [];
        const { destinations, ...baseFreightData } = data;

        for (const destination of destinations) {
            const generatedId = generateUniqueId('#AG');
            
            const freightDoc = {
                ...baseFreightData,
                id: generatedId,
                destinations: [destination],
                companyId,
                companyName,
                freightType: 'agregamento',
                status: 'active',
                createdAt: createTimestamp(),
            };
            
            await safeAddDoc(freightsCollection, freightDoc);
            generatedIds.push(generatedId);
        }
        
        return generatedIds;
    } catch (error) {
        handleFirestoreError(error, 'criar fretes de agregamento');
    }
}

export async function addCompleteFreight(
    companyId: string | null, 
    companyName: string | null, 
    freightType: 'completo' | 'retorno' | 'comum', 
    data: any
): Promise<string> {
    const prefixes = {
        'completo': '#FC',
        'retorno': '#FR',
        'comum': '#CO'
    };

    const prefix = prefixes[freightType];
    const generatedId = generateUniqueId(prefix);

    try {
        const freightDoc = {
            ...data,
            id: generatedId,
            companyId,
            companyName,
            freightType,
            status: 'active',
            createdAt: createTimestamp(),
        };

        await safeAddDoc('freights', freightDoc);
        return generatedId;
    } catch (error) {
        handleFirestoreError(error, 'criar a solicitação de frete');
    }
}

// Freight Update Actions
export async function updateFreightStatus(freightId: string, status: Freight['status']): Promise<void> {
    validateRequiredField(freightId, 'ID do frete');
    validateRequiredField(status, 'Status do frete');
    
    try {
        const freights = await safeQueryDocs('freights', [['id', '==', freightId]]);
        
        if (freights.length === 0) {
            throw new Error('Frete não encontrado');
        }
        
        const freight = freights[0];
        await safeUpdateDoc('freights', freight.id, { status });
    } catch (error) {
        handleFirestoreError(error, 'atualizar o status do frete');
    }
}

// Freight Query Actions
export async function getFilteredFreights(filters: FreightFilters = {}): Promise<Freight[]> {
    try {
        const { limit = 50, ...otherFilters } = filters;
        
        let constraints: any[] = [];
        
        // Aplicar filtros se fornecidos
        if (otherFilters.originCities && otherFilters.originCities.length > 0) {
            constraints.push(['origin.city', 'in', otherFilters.originCities]);
        }
        
        if (otherFilters.destinationCities && otherFilters.destinationCities.length > 0) {
            constraints.push(['destinations', 'array-contains-any', otherFilters.destinationCities]);
        }
        
        if (otherFilters.freightTypes && otherFilters.freightTypes.length > 0) {
            constraints.push(['freightType', 'in', otherFilters.freightTypes]);
        }
        
        if (otherFilters.requiredVehicles && otherFilters.requiredVehicles.length > 0) {
            constraints.push(['requiredVehicles', 'array-contains-any', otherFilters.requiredVehicles]);
        }
        
        if (otherFilters.requiredBodyworks && otherFilters.requiredBodyworks.length > 0) {
            constraints.push(['requiredBodyworks', 'array-contains-any', otherFilters.requiredBodyworks]);
        }
        
        // Sempre filtrar por status ativo
        constraints.push(['status', '==', 'active']);
        
        const freights = await safeQueryDocs('freights', constraints, limit);
        return freights as Freight[];
    } catch (error) {
        handleFirestoreError(error, 'buscar fretes filtrados');
    }
}

export async function getFreightsByCompany(companyId: string): Promise<Freight[]> {
    validateRequiredField(companyId, 'ID da empresa');
    
    try {
        const freights = await safeQueryDocs('freights', [['companyId', '==', companyId]]);
        return freights as Freight[];
    } catch (error) {
        handleFirestoreError(error, 'buscar fretes da empresa');
    }
}

export async function getFreightById(freightId: string): Promise<Freight | null> {
    validateRequiredField(freightId, 'ID do frete');
    
    try {
        const freights = await safeQueryDocs('freights', [['id', '==', freightId]]);
        return freights.length > 0 ? (freights[0] as Freight) : null;
    } catch (error) {
        handleFirestoreError(error, 'buscar frete por ID');
    }
}

// Freight Statistics
export async function getFreightStats(companyId?: string): Promise<{
    total: number;
    active: number;
    completed: number;
    pending: number;
    cancelled: number;
}> {
    try {
        let constraints: any[] = [];
        
        if (companyId) {
            constraints.push(['companyId', '==', companyId]);
        }
        
        const total = await safeCountDocs('freights', constraints);
        const active = await safeCountDocs('freights', [...constraints, ['status', '==', 'active']]);
        const completed = await safeCountDocs('freights', [...constraints, ['status', '==', 'completed']]);
        const pending = await safeCountDocs('freights', [...constraints, ['status', '==', 'pending']]);
        const cancelled = await safeCountDocs('freights', [...constraints, ['status', '==', 'cancelled']]);
        
        return {
            total,
            active,
            completed,
            pending,
            cancelled,
        };
    } catch (error) {
        handleFirestoreError(error, 'buscar estatísticas de fretes');
    }
}

// Freight Search Actions
export async function searchFreights(query: string): Promise<Freight[]> {
    validateRequiredField(query, 'Termo de busca');
    
    try {
        // Busca por cidade de origem ou destino
        const freights = await safeQueryDocs('freights', [
            ['status', '==', 'active'],
            ['origin.city', '>=', query],
            ['origin.city', '<=', query + '\uf8ff']
        ]);
        
        return freights as Freight[];
    } catch (error) {
        handleFirestoreError(error, 'buscar fretes');
    }
}
