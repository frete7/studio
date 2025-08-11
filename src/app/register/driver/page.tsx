
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import DriverRegisterForm from './driver-form';
import { type BodyType, type VehicleType } from '@/app/actions';

async function getVehicleData() {
    try {
        const [vtSnap, btSnap] = await Promise.all([
            getDocs(collection(db, 'vehicle_types')),
            getDocs(collection(db, 'body_types')),
        ]);

        const vehicleTypes = vtSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleType));
        const bodyTypes = btSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as BodyType));

        return { vehicleTypes, bodyTypes };
    } catch (error) {
        console.error("Failed to fetch vehicle/body types on server", error);
        return { vehicleTypes: [], bodyTypes: [] };
    }
}

export default async function DriverRegisterPage() {
  const { vehicleTypes, bodyTypes } = await getVehicleData();

  return <DriverRegisterForm allVehicleTypes={vehicleTypes} allBodyTypes={bodyTypes} />;
}
