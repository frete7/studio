
'use server';

import {
  optimizeRoute,
  type OptimizeRouteInput,
  type OptimizeRouteOutput,
} from '@/ai/flows/optimize-route';
import { db } from '@/lib/firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, writeBatch, where, getCountFromServer, serverTimestamp, Timestamp } from 'firebase/firestore';

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
                name: data.responsibleName,
                cpf: data.responsibleCpf,
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

// Plans Actions
export type Plan = {
    id: string;
    name: string;
    description: string;
    durationDays: number;
    pricePix: number;
    priceCard: number;
    userType: 'driver' | 'company';
};

export async function getPlans(): Promise<Plan[]> {
    try {
        const plansCollection = collection(db, 'plans');
        const snapshot = await getDocs(plansCollection);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
    } catch (error) {
        console.error("Error fetching plans: ", error);
        throw new Error("Falha ao buscar os planos.");
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
    freightType: 'comum' | 'agregamento' | 'frete completo' | 'frete de retorno';
    origin: any;
    destinations: any[];
    createdAt: any;
    companyId: string;
    companyName?: string;
    status: 'ativo' | 'concluido' | 'pendente' | 'cancelado';
    collaboratorId?: string; // Add collaboratorId
    responsibleCollaborators?: string[];
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

export async function addCompleteFreight(companyId: string, companyName: string, freightType: 'completo' | 'retorno', data: any): Promise<string> {
    if (!companyId) throw new Error("ID da empresa é obrigatório.");

    const freightsCollection = collection(db, 'freights');
    
    const prefix = freightType === 'completo' ? '#FC' : '#FR';
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const nums = '0123456789';

    const randomValues = new Uint32Array(5);
    crypto.getRandomValues(randomValues);
    const randomChar = (index: number) => chars[randomValues[index] % chars.length];
    const randomNum = (index: number) => nums[randomValues[index] % nums.length];
    const generatedId = `${prefix}-${randomNum(0)}${randomNum(1)}${randomChar(2)}${randomChar(3)}${randomChar(4)}`;

    const freightDoc = {
        ...data,
        id: generatedId,
        companyId: companyId,
        companyName: companyName,
        freightType: `frete ${freightType}`,
        status: 'ativo',
        createdAt: serverTimestamp(),
    };

    const docRef = await addDoc(freightsCollection, freightDoc);
    
    return generatedId;
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


// Collaborators Actions
export type Collaborator = {
  id: string;
  name: string;
  internalId?: string;
  cpf: string;
  department: string;
  phone: string;
};

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
            where('responsibleCollaborators', 'array-contains', collaboratorId)
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
            where('responsibleCollaborators', 'array-contains', collaboratorId)
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
    

    
