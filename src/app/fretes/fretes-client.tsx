
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { type Freight, type BodyType, type Vehicle, type VehicleCategory } from '@/app/actions';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Eye, Loader2, MapPin, Search } from 'lucide-react';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { groupBy } from 'lodash';

type IBGEState = { id: number; sigla: string; nome: string; };
type IBGECity = { id: number; nome: string; };

const LocationSelector = ({ label, selectedCities, onSelectionChange }: { label: string, selectedCities: string[], onSelectionChange: (cities: string[]) => void }) => {
    const [states, setStates] = useState<IBGEState[]>([]);
    const [cities, setCities] = useState<IBGECity[]>([]);
    const [selectedState, setSelectedState] = useState<string>('');
    const [isLoadingStates, setIsLoadingStates] = useState(false);
    const [isLoadingCities, setIsLoadingCities] = useState(false);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        setIsLoadingStates(true);
        fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
            .then(res => res.json())
            .then(data => {
                setStates(data);
                setIsLoadingStates(false);
            });
    }, []);

    useEffect(() => {
        if (selectedState) {
            setIsLoadingCities(true);
            fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState}/municipios?orderBy=nome`)
                .then(res => res.json())
                .then(data => {
                    setCities(data);
                    setIsLoadingCities(false);
                });
        }
    }, [selectedState]);

    const handleSelectCity = (cityName: string) => {
        const fullCityName = `${cityName}, ${selectedState}`;
        const newSelection = selectedCities.includes(fullCityName)
            ? selectedCities.filter(c => c !== fullCityName)
            : [...selectedCities, fullCityName];
        onSelectionChange(newSelection);
    };

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium">{label}</label>
            <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-md"
            >
                <option value="" disabled>Selecione um estado</option>
                {states.map(s => <option key={s.id} value={s.sigla}>{s.nome}</option>)}
            </select>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between"
                        disabled={!selectedState || isLoadingCities}
                    >
                        <span className="truncate">
                         {selectedCities.length === 0 ? 'Selecione a(s) cidade(s)' : selectedCities.join('; ')}
                        </span>
                        <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0">
                    <Command>
                        <CommandInput placeholder="Buscar cidade..." />
                        <CommandList>
                            <CommandEmpty>Nenhuma cidade encontrada.</CommandEmpty>
                            <CommandGroup>
                                {cities.map((city) => (
                                    <CommandItem
                                        key={city.id}
                                        value={city.nome}
                                        onSelect={() => handleSelectCity(city.nome)}
                                    >
                                        <Checkbox
                                            className="mr-2"
                                            checked={selectedCities.includes(`${city.nome}, ${selectedState}`)}
                                            onCheckedChange={() => handleSelectCity(city.nome)}
                                        />
                                        {city.nome}
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>
        </div>
    );
};

export default function FretesClient() {
    const [freights, setFreights] = useState<Freight[]>([]);
    const [allBodyTypes, setAllBodyTypes] = useState<BodyType[]>([]);
    const [allVehicleTypes, setAllVehicleTypes] = useState<any[]>([]); // Using 'any' for simplicity
    const [allVehicleCategories, setAllVehicleCategories] = useState<VehicleCategory[]>([]);
    
    const [isLoading, setIsLoading] = useState(true);

    // Filter states
    const [originCities, setOriginCities] = useState<string[]>([]);
    const [destinationCities, setDestinationCities] = useState<string[]>([]);
    const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
    const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>([]);


    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                // Fetch freights, body types, vehicle types, and categories in parallel
                const freightsQuery = query(collection(db, 'freights'), where('status', '==', 'ativo'));
                const bodyTypesQuery = query(collection(db, 'body_types'));
                const vehicleTypesQuery = query(collection(db, 'vehicle_types'));
                const vehicleCategoriesQuery = query(collection(db, 'vehicle_categories'));

                const [freightsSnap, bodyTypesSnap, vehicleTypesSnap, vehicleCategoriesSnap] = await Promise.all([
                    getDocs(freightsQuery),
                    getDocs(bodyTypesQuery),
                    getDocs(vehicleTypesQuery),
                    getDocs(vehicleCategoriesQuery),
                ]);

                setFreights(freightsSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Freight)));
                setAllBodyTypes(bodyTypesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as BodyType)));
                setAllVehicleTypes(vehicleTypesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as any)));
                setAllVehicleCategories(vehicleCategoriesSnap.docs.map(doc => ({ ...doc.data(), id: doc.id } as VehicleCategory)));

            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);
    
    const groupedBodyTypes = useMemo(() => groupBy(allBodyTypes, 'group'), [allBodyTypes]);
    const groupedVehicleTypes = useMemo(() => {
        const categoryMap = new Map(allVehicleCategories.map(c => [c.id, c.name]));
        const typesWithCatName = allVehicleTypes.map(vt => ({...vt, categoryName: categoryMap.get(vt.categoryId) || 'Outros'}));
        return groupBy(typesWithCatName, 'categoryName');
    }, [allVehicleTypes, allVehicleCategories]);


    const filteredFreights = useMemo(() => {
        return freights.filter(freight => {
             if (originCities.length > 0 && !originCities.some(city => freight.origin.includes(city))) {
                return false;
            }
            if (destinationCities.length > 0 && !destinationCities.some(city => freight.destinations.some(d => d.includes(city)))) {
                return false;
            }
            // Vehicle and Body type filters can be added here once we have that data in freights
            return true;
        });
    }, [freights, originCities, destinationCities, selectedVehicles, selectedBodyTypes]);

    const handleVehicleSelection = (vehicleId: string) => {
        setSelectedVehicles(prev => 
            prev.includes(vehicleId) ? prev.filter(id => id !== vehicleId) : [...prev, vehicleId]
        );
    }
    const handleBodyTypeSelection = (bodyTypeId: string) => {
        setSelectedBodyTypes(prev => 
            prev.includes(bodyTypeId) ? prev.filter(id => id !== bodyTypeId) : [...prev, bodyTypeId]
        );
    }

    const renderFreightList = () => {
        if (isLoading) {
            return (
                <div className="space-y-4">
                    {[...Array(5)].map((_, i) => (
                        <Card key={i} className="p-4 h-24 animate-pulse bg-muted"></Card>
                    ))}
                </div>
            );
        }
        if (filteredFreights.length === 0) {
            return <Card className="p-8 text-center text-muted-foreground">Nenhum frete encontrado com os filtros selecionados.</Card>;
        }
        return (
            <div className="space-y-4">
                {filteredFreights.map(freight => (
                    <Card key={freight.id} className="p-4 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start">
                            <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground"/>
                                    <p className="font-semibold">{freight.origin}</p>
                                </div>
                                <div className="pl-6">
                                     <div className="border-l-2 border-dashed h-4"></div>
                                </div>
                                <div className="flex items-center gap-2">
                                     <MapPin className="h-4 w-4 text-muted-foreground"/>
                                     <p className="font-semibold">
                                        {freight.destinations[0]}
                                        {freight.destinations.length > 1 && <Badge variant="secondary" className="ml-2">+{freight.destinations.length - 1}</Badge>}
                                     </p>
                                </div>
                            </div>
                            <div className="text-right space-y-2 flex flex-col items-end">
                                {freight.freightType === 'comum' ? (
                                    <Badge variant="outline" className="text-base font-semibold border-primary/50 text-primary">COMUM</Badge>
                                ) : (
                                    <p className="font-bold text-lg text-primary">R$ •••••</p>
                                )}
                                <Button asChild variant="secondary" size="sm">
                                    <Link href={`/fretes/${freight.id}`}>
                                        Ver detalhes
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        );
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Sidebar */}
            <aside className="col-span-1 space-y-6">
                <Card className="p-4">
                    <h3 className="font-semibold mb-4">Origem e destino</h3>
                    <div className="space-y-4">
                        <LocationSelector label="Origem" selectedCities={originCities} onSelectionChange={setOriginCities} />
                        <LocationSelector label="Destino" selectedCities={destinationCities} onSelectionChange={setDestinationCities} />
                    </div>
                </Card>

                <Card className="p-4">
                    <h3 className="font-semibold mb-2">Veículo</h3>
                    <div className="space-y-4 max-h-96 overflow-y-auto">
                        {Object.entries(groupedVehicleTypes).map(([category, types]) => (
                             <div key={category}>
                                <h4 className="font-medium text-sm mb-2">{category}</h4>
                                <div className="space-y-2 pl-2">
                                    {types.map(type => (
                                        <div key={type.id} className="flex items-center space-x-2">
                                            <Checkbox id={`v-${type.id}`} onCheckedChange={() => handleVehicleSelection(type.id)} checked={selectedVehicles.includes(type.id)} />
                                            <label htmlFor={`v-${type.id}`} className="text-sm">{type.name}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>

                <Card className="p-4">
                     <h3 className="font-semibold mb-2">Carroceria</h3>
                     <div className="space-y-4 max-h-96 overflow-y-auto">
                        {Object.entries(groupedBodyTypes).map(([group, types]) => (
                             <div key={group}>
                                <h4 className="font-medium text-sm mb-2">{group}</h4>
                                <div className="space-y-2 pl-2">
                                    {types.map(type => (
                                        <div key={type.id} className="flex items-center space-x-2">
                                            <Checkbox id={`b-${type.id}`} onCheckedChange={() => handleBodyTypeSelection(type.id)} checked={selectedBodyTypes.includes(type.id)} />
                                            <label htmlFor={`b-${type.id}`} className="text-sm">{type.name}</label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </aside>

            {/* Main Content */}
            <main className="col-span-3 space-y-6">
                 <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                    <Eye className="h-4 w-4 !text-blue-700" />
                    <AlertTitle className="font-semibold">Para ver os valores dos fretes, você precisa se autenticar.</AlertTitle>
                    <AlertDescription>
                        <Link href="/login" className="font-bold underline">Entre</Link> ou <Link href="/register" className="font-bold underline">crie uma conta</Link> para ter acesso a todos os detalhes.
                    </AlertDescription>
                </Alert>
                <h2 className="text-lg font-medium">{filteredFreights.length} fretes disponíveis</h2>
                {renderFreightList()}
            </main>
        </div>
    );
}
