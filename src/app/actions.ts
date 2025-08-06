
'use server';

import {
  optimizeRoute,
  type OptimizeRouteInput,
  type OptimizeRouteOutput,
} from '@/ai/flows/optimize-route';
import { db } from '@/lib/firebase';
import { addDoc, collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';

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


// Vehicle Types Actions
export type VehicleType = {
  id: string;
  name: string;
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

export async function addVehicleType(name: string): Promise<VehicleType> {
  if (!name) {
    throw new Error('O nome do tipo de veículo é obrigatório.');
  }
  try {
    const vehicleTypesCollection = collection(db, 'vehicle_types');
    const docRef = await addDoc(vehicleTypesCollection, { name });
    return { id: docRef.id, name };
  } catch (error) {
    console.error("Error adding vehicle type: ", error);
    throw new Error('Falha ao adicionar o tipo de veículo.');
  }
}

export async function updateVehicleType(id: string, name: string): Promise<void> {
  if (!id || !name) {
    throw new Error('ID e nome do tipo de veículo são obrigatórios.');
  }
  try {
    const vehicleTypeDoc = doc(db, 'vehicle_types', id);
    await updateDoc(vehicleTypeDoc, { name });
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
    return [];
  }
}

export async function addVehicleCategory(name: string): Promise<VehicleCategory> {
  if (!name) {
    throw new Error('O nome da categoria é obrigatório.');
  }
  try {
    const categoriesCollection = collection(db, 'vehicle_categories');
    const docRef = await addDoc(categoriesCollection, { name });
    return { id: docRef.id, name };
  } catch (error) {
    console.error("Error adding vehicle category: ", error);
    throw new Error('Falha ao adicionar a categoria.');
  }
}

export async function updateVehicleCategory(id: string, name: string): Promise<void> {
  if (!id || !name) {
    throw new Error('ID e nome da categoria são obrigatórios.');
  }
  try {
    const categoryDoc = doc(db, 'vehicle_categories', id);
    await updateDoc(categoryDoc, { name });
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
