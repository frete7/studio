
'use server';

import {
  optimizeRoute,
  type OptimizeRouteInput,
  type OptimizeRouteOutput,
} from '@/ai/flows/optimize-route';
import { db } from '@/lib/firebase';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, updateDoc, writeBatch } from 'firebase/firestore';

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
  await updateDoc(userDocRef, { status: status });
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
  } catch (error) {
    console.error("Error assigning plan to user: ", error);
    throw new Error('Falha ao atribuir o plano ao usuário.');
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
  } catch (error) {
    console.error("Error adding vehicle type: ", error);
    throw new Error('Falha ao adicionar o tipo de veículo.');
  }
}

export async function updateVehicleType(id: string, data: Partial<Omit<VehicleType, 'id'>>): Promise<void> {
  if (!id || !data.name || !data.categoryId) {
    throw new Error('ID, nome e categoria do tipo de veículo são obrigatórios.');
  }
  try {
    const vehicleTypeDoc = doc(db, 'vehicle_types', id);
    await updateDoc(vehicleTypeDoc, data);
  } catch (error) {
    console.error("Error updating vehicle type: ", error);
    throw new Error('Falha ao atualizar o tipo de veículo.');
  }
}

export async function deleteVehicleType(id: string): Promise<void> {
  if (!id) {
    throw new Error('O ID do tipo de veículo é obrigatório.');
  }
  try {
    const vehicleTypeDoc = doc(db, 'vehicle_types', id);
    await deleteDoc(vehicleTypeDoc);
  } catch (error) {
    console.error("Error deleting vehicle type: ", error);
    throw new Error('Falha ao deletar o tipo de veículo.');
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
  } catch (error) {
    console.error("Error adding vehicle category: ", error);
    throw new Error('Falha ao adicionar a categoria.');
  }
}

export async function updateVehicleCategory(id: string, data: Partial<VehicleCategory>): Promise<void> {
  if (!id || !data.name) {
    throw new Error('ID e nome da categoria são obrigatórios.');
  }
  try {
    const categoryDoc = doc(db, 'vehicle_categories', id);
    await updateDoc(categoryDoc, data);
  } catch (error) {
    console.error("Error updating vehicle category: ", error);
    throw new Error('Falha ao atualizar a categoria.');
  }
}

export async function deleteVehicleCategory(id: string): Promise<void> {
  if (!id) {
    throw new Error('O ID da categoria é obrigatório.');
  }
  try {
    const categoryDoc = doc(db, 'vehicle_categories', id);
    await deleteDoc(categoryDoc);
  } catch (error) {
    console.error("Error deleting vehicle category: ", error);
    throw new Error('Falha ao deletar a categoria.');
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
    } catch (error) {
        console.error("Error adding vehicle: ", error);
        throw new Error("Falha ao adicionar o veículo.");
    }
}

export async function updateVehicle(id: string, data: Partial<Omit<Vehicle, 'id' | 'driverId'>>): Promise<void> {
    if (!id) {
        throw new Error('O ID do veículo é obrigatório.');
    }
    try {
        await updateDoc(doc(db, 'vehicles', id), data);
    } catch (error) {
        console.error("Error updating vehicle: ", error);
        throw new Error("Falha ao atualizar o veículo.");
    }
}

export async function deleteVehicle(id: string): Promise<void> {
    if (!id) {
        throw new Error('O ID do veículo é obrigatório.');
    }
    try {
        await deleteDoc(doc(db, 'vehicles', id));
    } catch (error) {
        console.error("Error deleting vehicle: ", error);
        throw new Error("Falha ao deletar o veículo.");
    }
}

// Body Types Actions
export type BodyType = {
  id: string;
  name: string;
  group: string;
};

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
