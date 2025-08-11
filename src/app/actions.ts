
'use server';

import {
  optimizeRoute,
  type OptimizeRouteInput,
  type OptimizeRouteOutput,
} from '@/ai/flows/optimize-route';
import { db } from '@/lib/firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, writeBatch, where, getCountFromServer, serverTimestamp, Timestamp, collectionGroup, startAt, endAt, orderBy, arrayUnion, arrayRemove, setDoc } from 'firebase/firestore';

export async function getOptimizedRoute(
  input: OptimizeRouteInput
): Promise<OptimizeRouteOutput> {
  try {
    const result = await optimizeRoute(input);
    return result;
  } catch (error) {
    console.error('Error optimizing route:', error);
    throw new Error('Falha ao otimizar a rota. Tente novamente mais tarde.');
  }
}

export async function updateUserStatus(uid: string, status: string) {
  if (!uid || !status) {
    throw new Error('UID do usuário e novo status são obrigatórios.');
  }
  const userDocRef = doc(db, 'users', uid);
  try {
    await updateDoc(userDocRef, { status: status });
  } catch (error: any) {
     console.error("Error updating user status: ", error);
     throw new Error(`Falha ao atualizar o status do usuário: ${error.code || error.message}`);
  }
}


export async function updateDocumentStatus(userId: string, docField: 'responsible.document' | 'cnpjCard', docStatus: string) {
    if (!userId || !docField || !docStatus) {
        throw new Error('User ID, document field, and status are required.');
    }
    const userDocRef = doc(db, 'users', userId);

    try {
        const userDoc = await getDoc(userDocRef);
        if (!userDoc.exists()) {
            throw new Error("User not found.");
        }

        const userData = userDoc.data();
        const updatePayload: { [key: string]: any } = {};
        
        // Helper function to safely get and structure document data
        const getDocumentData = (docData: any) => {
             if (typeof docData === 'string') {
                return { url: docData, status: 'pending' }; 
            }
            return docData || {}; 
        }

        if (docField === 'responsible.document') {
            const responsibleData = userData.responsible || {};
            const documentData = getDocumentData(responsibleData.document);
            // Ensure we update the nested object correctly
            updatePayload['responsible.document'] = { ...documentData, status: docStatus };
        } else { 
             const cnpjCardData = getDocumentData(userData.cnpjCard);
             // Ensure we update the nested object correctly
            updatePayload['cnpjCard'] = { ...cnpjCardData, status: docStatus };
        }
        
        await updateDoc(userDocRef, updatePayload);

    } catch (error: any) {
        console.error("Error updating document status: ", error);
        throw new Error(`Falha ao atualizar o status do documento: ${error.code || error.message}`);
    }
}


export async function assignPlanToUser(userId: string, planId: string, planName: string): Promise<void> {
  if (!userId) {
    throw new Error('ID do usuário é obrigatório.');
  }
  try {
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
      activePlanId: planId,
      activePlanName: planName,
     });
  } catch (error: any) {
    console.error("Error assigning plan to user: ", error);
    throw new Error(`Falha ao atribuir o plano ao usuário: ${error.code || error.message}`);
  }
}

export async function updateUserByAdmin(userId: string, data: any): Promise<void> {
    if (!userId) {
        throw new Error('ID do usuário é obrigatório.');
    }
    try {
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
            throw new Error("User not found.");
        }
        
        const userData = userDoc.data();
        
        // Create the update object safely
        const updateData = {
            name: data.name,
            tradingName: data.tradingName,
            cnpj: data.cnpj,
            address: data.address,
            // Safely merge responsible data
            responsible: {
                ...(userData.responsible || {}), // Start with existing data or an empty object
            }
        };

        await updateDoc(userDocRef, updateData);
    } catch (error: any) {
        console.error("Error updating user by admin: ", error);
        throw new Error(`Falha ao atualizar os dados do usuário: ${error.code || error.message}`);
    }
}


// Vehicle Types Actions
export type VehicleType = {
  id: string;
  name: string;
  categoryId: string;
};

export async function getVehicleTypes(): Promise<VehicleType[]> {
  try {
    const vehicleTypesCollection = collection(db, 'vehicle_types');
    const snapshot = await getDocs(vehicleTypesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleType));
  } catch (error) {
    console.error("Error fetching vehicle types: ", error);
    return [];
  }
}

export async function addVehicleType(data: Omit<VehicleType, 'id'>): Promise<VehicleType> {
  if (!data.name || !data.categoryId) {
    throw new Error('Nome e categoria do tipo de veículo são obrigatórios.');
  }
  try {
    const vehicleTypesCollection = collection(db, 'vehicle_types');
    const docRef = await addDoc(vehicleTypesCollection, data);
    return { id: docRef.id, ...data };
  } catch (error: any) {
    console.error("Error adding vehicle type: ", error);
    throw new Error(`Falha ao adicionar o tipo de veículo: ${error.code || error.message}`);
  }
}

export async function updateVehicleType(id: string, data: Partial<Omit<VehicleType, 'id'>>): Promise<void> {
  if (!id || !data.name || !data.categoryId) {
    throw new Error('ID, nome e categoria do tipo de veículo são obrigatórios.');
  }
  try {
    const vehicleTypeDoc = doc(db, 'vehicle_types', id);
    await updateDoc(vehicleTypeDoc, data);
  } catch (error: any) {
    console.error("Error updating vehicle type: ", error);
    throw new Error(`Falha ao atualizar o tipo de veículo: ${error.code || error.message}`);
  }
}

export async function deleteVehicleType(id: string): Promise<void> {
  if (!id) {
    throw new Error('O ID do tipo de veículo é obrigatório.');
  }
  try {
    const vehicleTypeDoc = doc(db, 'vehicle_types', id);
    await deleteDoc(vehicleTypeDoc);
  } catch (error: any) {
    console.error("Error deleting vehicle type: ", error);
    throw new Error(`Falha ao deletar o tipo de veículo: ${error.code || error.message}`);
  }
}

// Vehicle Categories Actions
export type VehicleCategory = {
  id: string;
  name: string;
};

export async function getVehicleCategories(): Promise<VehicleCategory[]> {
  try {
    const categoriesCollection = collection(db, 'vehicle_categories');
    const snapshot = await getDocs(categoriesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VehicleCategory));
  } catch (error) {
    console.error("Error fetching vehicle categories: ", error);
    throw new Error('Falha ao buscar as categorias de veículos.');
  }
}


export async function addVehicleCategory(data: Omit<VehicleCategory, 'id'>): Promise<VehicleCategory> {
  if (!data.name) {
    throw new Error('O nome da categoria é obrigatório.');
  }
  try {
    const categoriesCollection = collection(db, 'vehicle_categories');
    const docRef = await addDoc(categoriesCollection, data);
    return { id: docRef.id, ...data };
  } catch (error: any) {
    console.error("Error adding vehicle category: ", error);
    throw new Error(`Falha ao adicionar a categoria: ${error.code || error.message}`);
  }
}

export async function updateVehicleCategory(id: string, data: Partial<VehicleCategory>): Promise<void> {
  if (!id || !data.name) {
    throw new Error('ID e nome da categoria são obrigatórios.');
  }
  try {
    const categoryDoc = doc(db, 'vehicle_categories', id);
    await updateDoc(categoryDoc, data);
  } catch (error: any) {
    console.error("Error updating vehicle category: ", error);
    throw new Error(`Falha ao atualizar a categoria: ${error.code || error.message}`);
  }
}

export async function deleteVehicleCategory(id: string): Promise<void> {
  if (!id) {
    throw new Error('O ID da categoria é obrigatório.');
  }
  try {
    const categoryDoc = doc(db, 'vehicle_categories', id);
    await deleteDoc(categoryDoc);
  } catch (error: any) {
    console.error("Error deleting vehicle category: ", error);
    throw new Error(`Falha ao deletar a categoria: ${error.code || error.message}`);
  }
}


// Vehicles Actions
export type Vehicle = {
    id: string;
    model: string;
    licensePlate: string;
    typeId: string;
    categoryId: string;
    // Optional because we can have vehicles not assigned to anyone
    driverId?: string;
};

export async function getVehicles(): Promise<Vehicle[]> {
    try {
        const vehiclesCollection = collection(db, 'vehicles');
        const snapshot = await getDocs(vehiclesCollection);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Vehicle));
    } catch (error) {
        console.error("Error fetching vehicles: ", error);
        throw new Error("Falha ao buscar os veículos.");
    }
}

export async function addVehicle(data: Omit<Vehicle, 'id' | 'driverId'>): Promise<Vehicle> {
    if (!data.model || !data.licensePlate || !data.typeId || !data.categoryId) {
        throw new Error('Todos os campos são obrigatórios.');
    }
    try {
        const docRef = await addDoc(collection(db, 'vehicles'), data);
        return { id: docRef.id, ...data };
    } catch (error: any) {
        console.error("Error adding vehicle: ", error);
        throw new Error(`Falha ao adicionar o veículo: ${error.code || error.message}`);
    }
}

export async function updateVehicle(id: string, data: Partial<Omit<Vehicle, 'id' | 'driverId'>>): Promise<void> {
    if (!id) {
        throw new Error('O ID do veículo é obrigatório.');
    }
    try {
        await updateDoc(doc(db, 'vehicles', id), data);
    } catch (error: any) {
        console.error("Error updating vehicle: ", error);
        throw new Error(`Falha ao atualizar o veículo: ${error.code || error.message}`);
    }
}

export async function deleteVehicle(id: string): Promise<void> {
  if (!id) {
    throw new Error('O ID do veículo é obrigatório.');
  }
  try {
    await deleteDoc(doc(db, 'vehicles', id));
  } catch (error: any) {
    console.error("Error deleting vehicle: ", error);
    throw new Error(`Falha ao deletar o veículo: ${error.code || error.message}`);
  }
}

// Body Types Actions
export type BodyType = {
  id: string;
  name: string;
  group: string;
};

export async function getBodyTypes(): Promise<BodyType[]> {
    try {
        const bodyTypesCollection = collection(db, 'body_types');
        const snapshot = await getDocs(bodyTypesCollection);
        if (snapshot.empty) {
            return [];
        }
        return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as BodyType));
    } catch (error) {
        console.error("Error fetching body types: ", error);
        return [];
    }
}

export async function addBodyType(data: Omit<BodyType, 'id'>): Promise<BodyType> {
  if (!data.name || !data.group) {
    throw new Error('Nome e grupo são obrigatórios.');
  }
  try {
    const docRef = await addDoc(collection(db, 'body_types'), data);
    return { id: docRef.id, ...data };
  } catch (error: any) {
    console.error("Error adding body type: ", error);
    throw new Error(`Falha ao adicionar o tipo de carroceria: ${error.message}`);
  }
}

export async function updateBodyType(id: string, data: Partial<Omit<BodyType, 'id'>>): Promise<void> {
  if (!id) {
    throw new Error('O ID do tipo de carroceria é obrigatório.');
  }
  try {
    await updateDoc(doc(db, 'body_types', id), data);
  } catch (error: any) {
    console.error("Error updating body type: ", error);
    throw new Error(`Falha ao atualizar o tipo de carroceria: ${error.message}`);
  }
}

export async function deleteBodyType(id: string): Promise<void> {
  if (!id) {
    throw new Error('O ID do tipo de carroceria é obrigatório.');
  }
  try {
    await deleteDoc(doc(db, 'body_types', id));
  } catch (error: any) {
    console.error("Error deleting body type: ", error);
    throw new Error(`Falha ao deletar o tipo de carroceria: ${error.message}`);
  }
}

export async function getVehicleBodyTypes(): Promise<BodyType[]> {
  try {
    const bodyTypesCollection = collection(db, 'body_types');
    const snapshot = await getDocs(bodyTypesCollection);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as BodyType));
  } catch (error) {
    console.error("Error fetching vehicle body types: ", error);
    return [];
  }
}

// Plans Actions
export type Plan = {
    id: string;
    name: string;
    description: string;
    durationDays: number;
    pricePix: number;
    priceCard: number;
    userType: 'driver' | 'company';
    freightLimitType: 'unlimited' | 'limited';
    freightLimit: number;
    allowedFreightTypes: {
        agregamento: boolean;
        completo: boolean;
        retorno: boolean;
    };
    collaboratorLimitType: 'unlimited' | 'limited';
    collaboratorLimit: number;
    hasStatisticsAccess: boolean;
    hasReturningDriversAccess: boolean;
};

export async function getPlans(): Promise<Plan[]> {
    try {
        const plansCollection = collection(db, 'plans');
        const snapshot = await getDocs(plansCollection);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
    } catch (error) {
        console.error("Error fetching plans: ", error);
        return [];
    }
}

export async function addPlan(data: Omit<Plan, 'id'>): Promise<Plan> {
  try {
    const docRef = await addDoc(collection(db, 'plans'), data);
    return { id: docRef.id, ...data };
  } catch (error: any) {
    console.error("Error adding plan: ", error);
    throw new Error(`Falha ao adicionar o plano: ${error.message}`);
  }
}

export async function updatePlan(id: string, data: Partial<Omit<Plan, 'id'>>): Promise<void> {
  if (!id) throw new Error('O ID do plano é obrigatório.');
  try {
    await updateDoc(doc(db, 'plans', id), data);
  } catch (error: any) {
    console.error("Error updating plan: ", error);
    throw new Error(`Falha ao atualizar o plano: ${error.message}`);
  }
}

export async function deletePlan(id: string): Promise<void> {
  if (!id) throw new Error('O ID do plano é obrigatório.');
  try {
    await deleteDoc(doc(db, 'plans', id));
  } catch (error: any) {
    console.error("Error deleting plan: ", error);
    throw new Error(`Falha ao deletar o plano: ${error.message}`);
  }
}


// Freights Actions
export type Freight = {
    id: string;
    freightType: 'comum' | 'agregamento' | 'frete-completo' | 'frete-retorno';
    origin: any;
    destinations: any[];
    createdAt: any;
    companyId: string;
    companyName?: string;
    status: 'ativo' | 'concluido' | 'pendente' | 'cancelado';
    collaboratorId?: string; // Add collaboratorId
    responsibleCollaborators?: { id: string; name: string; phone: string }[];
    [key: string]: any; // Allow other properties
}

export async function addAggregationFreight(companyId: string, companyName: string, data: any): Promise<string[]> {
    if (!companyId) throw new Error("ID da empresa é obrigatório.");

    const freightsCollection = collection(db, 'freights');
    const generatedIds: string[] = [];

    const { destinations, ...baseFreightData } = data;

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';

    for (const destination of destinations) {
        const randomValues = new Uint32Array(5);
        crypto.getRandomValues(randomValues);
        const randomChar = (index: number) => chars[randomValues[index] % chars.length];
        const randomNum = (index: number) => nums[randomValues[index] % nums.length];
        const generatedId = `#AG-${randomNum(0)}${randomNum(1)}${randomChar(2)}${randomChar(3)}${randomChar(4)}`;

        const freightDoc = {
            ...baseFreightData,
            id: generatedId,
            destinations: [destination], // Each freight has a single destination from the list
            companyId: companyId,
            companyName: companyName,
            freightType: 'agregamento',
            status: 'ativo',
            createdAt: serverTimestamp(),
        };
        await addDoc(freightsCollection, freightDoc);
        generatedIds.push(generatedId);
    }
    
    return generatedIds;
}

export async function addCompleteFreight(companyId: string | null, companyName: string | null, freightType: 'completo' | 'retorno' | 'comum', data: any): Promise<string> {
    console.log("LOG: addCompleteFreight called with data:", { companyId, companyName, freightType, data });
    const freightsCollection = collection(db, 'freights');
    
    const prefixes = {
        'completo': '#FC',
        'retorno': '#FR',
        'comum': '#CO'
    }

    const prefix = prefixes[freightType];
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';

    try {
        const randomValues = new Uint32Array(5);
        crypto.getRandomValues(randomValues);
        const randomChar = (index: number) => chars[randomValues[index] % chars.length];
        const randomNum = (index: number) => nums[randomValues[index] % nums.length];
        const generatedId = `${prefix}-${randomNum(0)}${randomNum(1)}${randomChar(2)}${randomChar(3)}${randomChar(4)}`;

        const freightDoc = {
            ...data,
            id: generatedId,
            companyId: companyId, // Can be null for unauthenticated users
            companyName: companyName, // Can be "Visitante"
            freightType: freightType,
            status: 'ativo',
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(freightsCollection, freightDoc);
        console.log("LOG: Freight document written with ID: ", docRef.id);
        
        return generatedId;
    } catch(error) {
        console.error("ERROR: Failed to add complete freight to Firestore:", error);
        throw new Error("Falha ao criar la solicitação de frete no banco de dados.");
    }
}

export async function updateFreightStatus(freightId: string, status: Freight['status']): Promise<void> {
    if (!freightId || !status) {
        throw new Error('ID do frete e novo status são obrigatórios.');
    }
    try {
        // Since we don't have the original document ID from firestore, we have to query for it based on our custom ID
        const freightsCollection = collection(db, 'freights');
        const q = query(freightsCollection, where('id', '==', freightId));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            throw new Error(`Frete com ID ${freightId} não encontrado.`);
        }
        
        const firestoreDocId = snapshot.docs[0].id;
        const freightDocRef = doc(db, 'freights', firestoreDocId);
        await updateDoc(freightDocRef, { status: status });

    } catch (error: any) {
        console.error("Error updating freight status: ", error);
        throw new Error(`Falha ao atualizar o status do frete: ${error.code || error.message}`);
    }
}

export async function getFreightsByCompany(companyId: string): Promise<Freight[]> {
    if (!companyId) {
        throw new Error('O ID da empresa é obrigatório.');
    }
    
    try {
        const freightsCollection = collection(db, 'freights');
        const q = query(freightsCollection, where('companyId', '==', companyId));
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return [];
        }
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt;

            // Convert Firestore Timestamp to a serializable format (ISO string)
            let serializableCreatedAt = null;
            if (createdAt && typeof createdAt.toDate === 'function') {
                serializableCreatedAt = createdAt.toDate().toISOString();
            }

            return {
                ...data,
                id: data.id, 
                firestoreId: doc.id,
                createdAt: serializableCreatedAt,
            } as Freight;
        });

    } catch (error) {
        console.error("Error fetching freights by company: ", error);
        throw new Error('Falha ao buscar os fretes da empresa.');
    }
}

type FreightFilters = {
    originCities?: string[];
    destinationCities?: string[];
    freightTypes?: string[];
    requiredVehicles?: string[];
    requiredBodyworks?: string[];
}

export async function getFilteredFreights(filters: FreightFilters): Promise<any[]> {
    try {
        let q = query(collection(db, 'freights'), where('status', '==', 'ativo'));

        if (filters.originCities && filters.originCities.length > 0) {
            q = query(q, where('origin.city', 'in', filters.originCities));
        }
        if (filters.destinationCities && filters.destinationCities.length > 0) {
            q = query(q, where('destinations', 'array-contains-any', filters.destinationCities.map(city => ({ city }))));
        }
         if (filters.freightTypes && filters.freightTypes.length > 0) {
            q = query(q, where('freightType', 'in', filters.freightTypes));
        }
        if (filters.requiredVehicles && filters.requiredVehicles.length > 0) {
            q = query(q, where('requiredVehicles', 'array-contains-any', filters.requiredVehicles));
        }
        if (filters.requiredBodyworks && filters.requiredBodyworks.length > 0) {
            q = query(q, where('requiredBodyworks', 'array-contains-any', filters.requiredBodyworks));
        }
        
        const snapshot = await getDocs(q);
        const freights: any[] = [];
        
        snapshot.forEach(doc => {
             const data = doc.data();
             const createdAt = data.createdAt;
             let serializableCreatedAt = null;
             if (createdAt instanceof Timestamp) {
                serializableCreatedAt = createdAt.toDate().toISOString();
             }

             const freightData = { ...data, firestoreId: doc.id, createdAt: serializableCreatedAt };

             // Client-side filter for destinations if Firestore query is not precise enough
            if (filters.destinationCities && filters.destinationCities.length > 0) {
                if(freightData.destinations.some((d: any) => filters.destinationCities?.includes(d.city))) {
                     freights.push(freightData);
                }
            } else {
                 freights.push(freightData);
            }
        });
        
        return freights;
    } catch (error) {
        console.error("Error fetching filtered freights: ", error);
        return [];
    }
}


// Collaborators Actions
export type Collaborator = {
  id: string;
  name: string;
  internalId?: string;
  cpf: string;
  department: string;
  phone: string;
};

export async function getCollaborators(companyId: string): Promise<Collaborator[]> {
    if (!companyId) return [];
    try {
        const collaboratorsCollection = collection(db, 'users', companyId, 'collaborators');
        const snapshot = await getDocs(collaboratorsCollection);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Collaborator));
    } catch (error) {
        console.error("Error fetching collaborators: ", error);
        return [];
    }
}

export async function addCollaborator(companyId: string, data: Omit<Collaborator, 'id'>): Promise<Collaborator> {
  if (!companyId) throw new Error('ID da empresa é obrigatório.');
  if (!data.name || !data.cpf || !data.department || !data.phone) {
    throw new Error('Campos obrigatórios estão faltando.');
  }
  try {
    const collaboratorsCollection = collection(db, 'users', companyId, 'collaborators');
    const docRef = await addDoc(collaboratorsCollection, data);
    return { id: docRef.id, ...data };
  } catch (error: any) {
    console.error("Error adding collaborator: ", error);
    throw new Error(`Falha ao adicionar o colaborador: ${error.message}`);
  }
}

export async function updateCollaborator(companyId: string, collaboratorId: string, data: Partial<Omit<Collaborator, 'id'>>): Promise<void> {
  if (!companyId || !collaboratorId) throw new Error('ID da empresa e do colaborador são obrigatórios.');
  try {
    const collaboratorDoc = doc(db, 'users', companyId, 'collaborators', collaboratorId);
    await updateDoc(collaboratorDoc, data);
  } catch (error: any) {
    console.error("Error updating collaborator: ", error);
    throw new Error(`Falha ao atualizar o colaborador: ${error.message}`);
  }
}

export async function deleteCollaborator(companyId: string, collaboratorId: string): Promise<void> {
  if (!companyId || !collaboratorId) throw new Error('ID da empresa e do colaborador são obrigatórios.');
  try {
    const collaboratorDoc = doc(db, 'users', companyId, 'collaborators', collaboratorId);
    await deleteDoc(collaboratorDoc);
  } catch (error: any)
  {
    console.error("Error deleting collaborator: ", error);
    throw new Error(`Falha ao deletar o colaborador: ${error.message}`);
  }
}

export type CollaboratorStats = {
    totalFreights: number;
    activeFreights: number;
    completedFreights: number;
};

export async function getCollaboratorStats(companyId: string, collaboratorId: string): Promise<CollaboratorStats> {
    if (!companyId || !collaboratorId) {
        throw new Error('ID da empresa e do colaborador são obrigatórios.');
    }
    
    try {
        const freightsCollection = collection(db, 'freights');
        
        // Base query for the collaborator
        const baseQuery = query(
            freightsCollection,
            where('companyId', '==', companyId),
            // This assumes collaborator IDs are stored in an array
            where('responsibleCollaborators.id', '==', collaboratorId)
        );

        // Get total freights
        const totalSnapshot = await getCountFromServer(baseQuery);

        // Get active freights
        const activeQuery = query(baseQuery, where('status', '==', 'ativo'));
        const activeSnapshot = await getCountFromServer(activeQuery);
        
        // Get completed freights
        const completedQuery = query(baseQuery, where('status', '==', 'concluido'));
        const completedSnapshot = await getCountFromServer(completedQuery);

        return {
            totalFreights: totalSnapshot.data().count,
            activeFreights: activeSnapshot.data().count,
            completedFreights: completedSnapshot.data().count,
        };

    } catch (error) {
        console.error("Error fetching collaborator stats: ", error);
        throw new Error('Falha ao buscar as estatísticas do colaborador.');
    }
}

export async function getFreightsByCollaborator(companyId: string, collaboratorId: string): Promise<Freight[]> {
    if (!companyId || !collaboratorId) {
        throw new Error('ID da empresa e do colaborador são obrigatórios.');
    }
    
    try {
        const freightsCollection = collection(db, 'freights');
        const q = query(
            freightsCollection,
            where('companyId', '==', companyId),
            where('responsibleCollaborators.id', '==', collaboratorId)
        );
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return [];
        }
        
        return snapshot.docs.map(doc => {
            const data = doc.data();
            const createdAt = data.createdAt;

            // Convert Firestore Timestamp to a serializable format (ISO string)
            let serializableCreatedAt = null;
            if (createdAt && typeof createdAt.toDate === 'function') {
                serializableCreatedAt = createdAt.toDate().toISOString();
            }

            return {
                ...data,
                id: data.id, // Use the custom ID from the document data
                firestoreId: doc.id, // Keep the firestore id if needed
                createdAt: serializableCreatedAt,
            } as Freight;
        });

    } catch (error) {
        console.error("Error fetching freights by collaborator: ", error);
        throw new Error('Falha ao buscar os fretes do colaborador.');
    }
}

// Statistics Actions
export type CompanyStats = {
    totalFreights: number;
    activeFreights: number;
    completedFreights: number;
    canceledFreights: number;
};

export async function getCompanyStats(companyId: string): Promise<CompanyStats> {
    if (!companyId) {
        throw new Error('ID da empresa é obrigatório.');
    }
    
    try {
        const freightsCollection = collection(db, 'freights');
        const baseQuery = query(freightsCollection, where('companyId', '==', companyId));

        const totalSnapshot = await getCountFromServer(baseQuery);
        const activeSnapshot = await getCountFromServer(query(baseQuery, where('status', '==', 'ativo')));
        const completedSnapshot = await getCountFromServer(query(baseQuery, where('status', '==', 'concluido')));
        const canceledSnapshot = await getCountFromServer(query(baseQuery, where('status', '==', 'cancelado')));
        
        return {
            totalFreights: totalSnapshot.data().count,
            activeFreights: activeSnapshot.data().count,
            completedFreights: completedSnapshot.data().count,
            canceledFreights: canceledSnapshot.data().count,
        };

    } catch (error) {
        console.error("Error fetching company stats: ", error);
        throw new Error('Falha ao buscar as estatísticas da empresa.');
    }
}


export async function getMonthlyFreightStats(companyId: string) {
  if (!companyId) {
    throw new Error('O ID da empresa é obrigatório.');
  }

  try {
    const freightsCollection = collection(db, 'freights');
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());

    // Simplified query to avoid needing a composite index
    const q = query(
      freightsCollection,
      where('companyId', '==', companyId)
    );

    const snapshot = await getDocs(q);
    const monthlyData: { [key: string]: { total: number; concluido: number; cancelado: number } } = {};

    snapshot.docs.forEach(doc => {
      const data = doc.data() as Freight;
      const createdAt = data.createdAt?.toDate();

      // Filter by date in the code
      if (createdAt && createdAt >= oneYearAgo) {
        const month = createdAt.toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyData[month]) {
          monthlyData[month] = { total: 0, concluido: 0, cancelado: 0 };
        }
        monthlyData[month].total++;
        if (data.status === 'concluido') {
          monthlyData[month].concluido++;
        }
        if (data.status === 'cancelado') {
            monthlyData[month].cancelado++;
        }
      }
    });
    
    // Format for chart
    const formattedData = Object.entries(monthlyData).map(([month, counts]) => ({
      name: new Date(month + '-02').toLocaleString('default', { month: 'short' }).toUpperCase(),
      ...counts,
    }));
    
    // Ensure we have data for all last 12 months, even if count is 0
    const finalData = [];
    for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = d.toLocaleString('default', { month: 'short' }).toUpperCase();
        const existingData = formattedData.find(m => m.name === monthName);
        if(existingData) {
            finalData.push(existingData);
        } else {
             finalData.push({ name: monthName, total: 0, concluido: 0, cancelado: 0 });
        }
    }

    return finalData;

  } catch (error) {
    console.error("Error fetching monthly freight stats: ", error);
    throw new Error('Falha ao buscar os dados mensais de fretes.');
  }
}
    
// Driver Actions
export type ReturnTrip = {
    id: string;
    driverId: string;
    driverName: string;
    driverPhone: string;
    origin: { state: string; city: string; };
    destination: { type: 'brasil' | 'estado' | 'cidade'; state?: string; city?: string; };
    departureDate: any;
    status: 'active' | 'inactive';
    createdAt: any;
    vehicle: string;
    availability: 'vazio' | 'parcial';
    notes?: string;
    hasCnpj: boolean;
    issuesInvoice: boolean;
}

export async function addReturnTrips(driverId: string, data: any) {
    if (!driverId) throw new Error("ID do motorista é obrigatório.");
    if (!data.returns || data.returns.length === 0) {
        throw new Error("Pelo menos uma viagem de retorno deve ser fornecida.");
    }
    
    const returnTripsCollection = collection(db, 'return_trips');
    const batch = writeBatch(db);

    const driverDocRef = doc(db, 'users', driverId);
    const driverDoc = await getDoc(driverDocRef);

    if (!driverDoc.exists()) {
        throw new Error("Motorista não encontrado.");
    }

    const driverData = driverDoc.data();
    
    const { returns, ...baseData } = data;

    returns.forEach((trip: any) => {
        const docRef = doc(returnTripsCollection); // Auto-generate ID
        batch.set(docRef, {
            ...baseData,
            driverId,
            driverName: driverData.name,
            driverPhone: driverData.phone,
            origin: trip.origin,
            destination: {
                type: trip.destinationType,
                state: trip.destinationState,
                city: trip.destinationCity,
            },
            status: 'active',
            createdAt: serverTimestamp(),
        });
    });

    await batch.commit();
}

export async function getReturnTripsByDriver(driverId: string): Promise<ReturnTrip[]> {
    if (!driverId) throw new Error('ID do motorista é obrigatório.');
    
    try {
        const q = query(collection(db, 'return_trips'), where('driverId', '==', driverId));
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => {
            const data = doc.data();
            const departureDate = data.departureDate;

            let serializableDepartureDate = null;
            if (departureDate && typeof departureDate.toDate === 'function') {
                serializableDepartureDate = departureDate.toDate().toISOString();
            }

            return {
                ...data,
                id: doc.id,
                departureDate: serializableDepartureDate,
            } as ReturnTrip;
        });
    } catch (error) {
        console.error("Error fetching return trips: ", error);
        throw new Error("Falha ao buscar as viagens de retorno.");
    }
}

export async function deleteReturnTrip(tripId: string): Promise<void> {
    if (!tripId) throw new Error('ID da viagem é obrigatório.');
    
    try {
        const tripDocRef = doc(db, 'return_trips', tripId);
        await deleteDoc(tripDocRef);
    } catch (error) {
        console.error("Error deleting return trip: ", error);
        throw new Error("Falha ao deletar a viagem de retorno.");
    }
}
    

// Resume Actions
export async function updateUserResume(userId: string, data: any) {
    if (!userId) {
        throw new Error('ID do usuário é obrigatório.');
    }
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, data);
}

export async function addResumeItem(userId: string, field: 'academicFormation' | 'professionalExperience' | 'qualifications', data: any) {
    if (!userId || !field || !data) {
        throw new Error('Dados inválidos.');
    }
    const userDocRef = doc(db, 'users', userId);
    await updateDoc(userDocRef, {
        [field]: arrayUnion({ ...data, id: new Date().toISOString() })
    });
}

export async function updateResumeItem(userId: string, field: 'academicFormation' | 'professionalExperience' | 'qualifications', data: any) {
    if (!userId || !field || !data || !data.id) {
        throw new Error('Dados inválidos para atualização.');
    }
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists()) {
        const existingData = userDoc.data()[field] || [];
        const updatedData = existingData.map((item: any) => (item.id === data.id ? data : item));
        await updateDoc(userDocRef, { [field]: updatedData });
    }
}

export async function deleteResumeItem(userId: string, field: 'academicFormation' | 'professionalExperience' | 'qualifications', itemId: string) {
    if (!userId || !field || !itemId) {
        throw new Error('Dados inválidos para exclusão.');
    }
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
     if (userDoc.exists()) {
        const existingData = userDoc.data()[field] || [];
        const itemToRemove = existingData.find((item: any) => item.id === itemId);
        if (itemToRemove) {
            await updateDoc(userDocRef, {
                [field]: arrayRemove(itemToRemove)
            });
        }
    }
}


// Notification Actions
export async function saveNotificationSettings(userId: string, cities: string[]) {
    if (!userId) {
        throw new Error('ID do usuário é obrigatório.');
    }
    const settingsDocRef = doc(db, 'users', userId, 'notification_settings', 'cities');
    try {
        await setDoc(settingsDocRef, { cities });
    } catch (error) {
        console.error("Error saving notification settings:", error);
        throw new Error("Não foi possível salvar as configurações de notificação.");
    }
}

export async function savePushSubscription(userId: string, subscription: PushSubscriptionJSON) {
  if (!userId) {
    throw new Error('ID do usuário é obrigatório.');
  }
  const subDocRef = doc(db, 'users', userId, 'push_subscriptions', subscription.endpoint.slice(-10));
  try {
    await setDoc(subDocRef, subscription);
  } catch (error) {
    console.error("Error saving push subscription:", error);
    throw new Error("Não foi possível salvar a inscrição de notificação.");
  }
}


// Support Chat Actions
export type SupportChatMessage = {
    id: string;
    text: string;
    sender: 'user' | 'support';
    createdAt: Timestamp;
    fileUrl?: string;
};

export async function sendSupportChatMessage(
    userId: string,
    messageData: { text: string; sender: 'user' | 'support'; fileUrl?: string }
) {
    if (!userId) {
        throw new Error("ID do usuário inválido.");
    }
    
    if (!messageData.text && !messageData.fileUrl) {
         throw new Error("A mensagem não pode estar vazia.");
    }

    try {
        const chatCollectionRef = collection(db, 'users', userId, 'supportChat');
        await addDoc(chatCollectionRef, {
            ...messageData,
            createdAt: serverTimestamp(),
        });
    } catch (error) {
        console.error("Error sending support chat message: ", error);
        throw new Error("Não foi possível enviar a mensagem.");
    }
}

export async function getSupportChatHistory(userId: string) {
    if (!userId) {
        throw new Error("ID do usuário é obrigatório.");
    }
    
    try {
        const chatCollection = collection(db, 'users', userId, 'supportChat');
        const q = query(chatCollection, orderBy('createdAt', 'asc'));
        
        const snapshot = await getDocs(q);
        if (snapshot.empty) {
            return [];
        }
        
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    } catch (error) {
        console.error("Error fetching support chat history: ", error);
        return [];
    }
}
