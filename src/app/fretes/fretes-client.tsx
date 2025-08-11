

'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { type Freight, type BodyType, type Vehicle, type VehicleCategory } from '@/app/actions';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Eye, Loader2, MapPin, Search, Filter, X, Truck } from 'lucide-react';
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { groupBy } from 'lodash';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';


type IBGEState = { id: number; sigla: string; nome: string; };
type IBGECity = { id: number; nome: string; };

const freightTypeVariants = cva(
  "",
  {
    variants: {
      freightType: {
        comum: "border-transparent bg-purple-500 text-white hover:bg-purple-600",
        agregamento: "border-transparent bg-blue-500 text-white hover:bg-blue-600",
        "frete-completo": "border-transparent bg-green-500 text-white hover:bg-green-600",
        "frete-retorno": "border-transparent bg-orange-500 text-white hover:bg-orange-600",
      },
    },
    defaultVariants: {
      freightType: "comum",
    },
  }
)

const getFreightTypeLabel = (type: Freight['freightType']): string => {
    const labels = {
        'comum': 'Comum',
        'agregamento': 'Agregamento',
        'frete-completo': 'Completo',
        'frete-retorno': 'Retorno',
    };
    return labels[type] || type;
}


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
            {selectedState && (
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
            )}
        </div>
    );
};

const freightTypes = [
    { id: 'comum', label: 'Comum' },
    { id: 'agregamento', label: 'Agregamento' },
    { id: 'frete-completo', label: 'Frete Completo' },
    { id: 'frete-retorno', label: 'Frete de Retorno' },
];

interface FretesClientProps {
    initialFreights: any[];
    initialBodyTypes: BodyType[];
    initialVehicleTypes: any[];
    initialVehicleCategories: VehicleCategory[];
}

export default function FretesClient({ 
    initialFreights, 
    initialBodyTypes, 
    initialVehicleTypes, 
    initialVehicleCategories 
}: FretesClientProps) {
    const [freights, setFreights] = useState<any[]>(initialFreights);
    const [allBodyTypes, setAllBodyTypes] = useState<BodyType[]>(initialBodyTypes);
    const [allVehicleTypes, setAllVehicleTypes] = useState<any[]>(initialVehicleTypes);
    const [allVehicleCategories, setAllVehicleCategories] = useState<VehicleCategory[]>(initialVehicleCategories);
    
    const [isLoading, setIsLoading] = useState(false); // No initial loading
    const [user, setUser] = useState<User | null>(null);

    // Filter states
    const [originCities, setOriginCities] = useState<string[]>([]);
    const [destinationCities, setDestinationCities] = useState<string[]>([]);
    const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
    const [selectedBodyTypes, setSelectedBodyTypes] = useState<string[]>([]);
    const [selectedFreightTypes, setSelectedFreightTypes] = useState<string[]>([]);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });
        
        const freightsQuery = query(collection(db, 'freights'), where('status', '==', 'ativo'));
        const unsubscribeFreights = onSnapshot(freightsQuery, (snapshot) => {
             setFreights(snapshot.docs.map(doc => ({ ...doc.data(), firestoreId: doc.id })));
        });
        
        return () => {
            unsubscribeAuth();
            unsubscribeFreights();
        };
    }, []);
    
    const groupedBodyTypes = useMemo(() => groupBy(allBodyTypes, 'group'), [allBodyTypes]);
    const groupedVehicleTypes = useMemo(() => {
        const categoryMap = new Map(allVehicleCategories.map(c => [c.id, c.name]));
        const typesWithCatName = allVehicleTypes.map(vt => ({...vt, categoryName: categoryMap.get(vt.categoryId) || 'Outros'}));
        return groupBy(typesWithCatName, 'categoryName');
    }, [allVehicleTypes, allVehicleCategories]);


    const filteredFreights = useMemo(() => {
        return freights.filter(freight => {
             const originString = `${freight.origin?.city}, ${freight.origin?.state}`;
             if (originCities.length > 0 && !originCities.some(city => originString.includes(city))) {
                return false;
            }
            if (destinationCities.length > 0 && !destinationCities.some(city => freight.destinations.some((d: any) => `${d.city}, ${d.state}`.includes(city)))) {
                return false;
            }
            if (selectedFreightTypes.length > 0 && !selectedFreightTypes.includes(freight.freightType)) {
                return false;
            }
            if (selectedVehicles.length > 0 && !freight.requiredVehicles.some((vId: string) => selectedVehicles.includes(vId))) {
                 return false;
            }
            if (selectedBodyTypes.length > 0 && !freight.requiredBodyworks.some((bId: string) => selectedBodyTypes.includes(bId))) {
                return false;
            }
            return true;
        });
    }, [freights, originCities, destinationCities, selectedVehicles, selectedBodyTypes, selectedFreightTypes]);

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

    const handleFreightTypeSelection = (freightTypeId: string) => {
        setSelectedFreightTypes(prev => 
            prev.includes(freightTypeId) ? prev.filter(id => id !== freightTypeId) : [...prev, freightTypeId]
        );
    }

    const clearFilters = () => {
        setOriginCities([]);
        setDestinationCities([]);
        setSelectedVehicles([]);
        setSelectedBodyTypes([]);
        setSelectedFreightTypes([]);
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
                {filteredFreights.map(freight => {
                    const detailLink = freight.freightType === 'agregamento' 
                        ? `/fretes/agregamento/${freight.firestoreId}` 
                        : `/fretes/${freight.firestoreId}`;
                    
                     const requiredVehicleNames = (freight.requiredVehicles || [])
                        .map((vehicle: any) => {
                            const vehicleId = typeof vehicle === 'string' ? vehicle : vehicle.id;
                            return allVehicleTypes.find(v => v.id === vehicleId)?.name;
                        })
                        .filter(Boolean);

                    const allTags = [...requiredVehicleNames];
                    const displayedTags = allTags.slice(0, 3);
                    const hiddenTagsCount = allTags.length - displayedTags.length;

                    const additionalStops = (freight.destinations.length - 1) + 
                        (freight.destinations[0]?.stops > 1 ? freight.destinations[0].stops -1 : 0);

                    return (
                        <Card key={freight.id} className="p-4 hover:shadow-md transition-shadow">
                            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                <div className="flex-1 space-y-3 w-full">
                                    <div className="flex justify-between items-center">
                                        <p className="text-xs font-mono text-muted-foreground">Pedido: {freight.id}</p>
                                        <Badge className={cn(freightTypeVariants({ freightType: freight.freightType }), "text-xs font-semibold uppercase")}>
                                            {getFreightTypeLabel(freight.freightType)}
                                        </Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground"/>
                                        <p className="font-semibold">{freight.origin.city}, {freight.origin.state}</p>
                                    </div>
                                    <div className="pl-6">
                                            <div className="border-l-2 border-dashed h-4"></div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground"/>
                                            <div className="font-semibold flex items-center gap-2">
                                            <span>{freight.destinations[0].city}, {freight.destinations[0].state}</span>
                                            {additionalStops > 0 && <Badge variant="secondary">+{additionalStops}</Badge>}
                                            </div>
                                    </div>
                                    <div className="pt-2 flex flex-wrap gap-2">
                                        {displayedTags.map(tag => <Badge key={tag} variant="outline" className="text-xs"><Truck className="mr-1 h-3 w-3"/>{tag}</Badge>)}
                                        {hiddenTagsCount > 0 && <Badge variant="secondary" className="text-xs">+{hiddenTagsCount}</Badge>}
                                    </div>
                                </div>
                                <div className="w-full sm:w-auto text-right space-y-2 flex flex-col items-end sm:items-center sm:justify-center flex-shrink-0 pt-4 sm:pt-0">
                                     <Button asChild variant="secondary" size="sm" className="w-full sm:w-auto">
                                        <Link href={detailLink}>
                                            Ver detalhes
                                        </Link>
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>
        );
    };

    const renderFilters = () => (
         <aside className="col-span-1 space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">Filtros</h3>
                <Button variant="ghost" size="sm" onClick={clearFilters}>Limpar Filtros</Button>
            </div>
            <Card className="p-4">
                <h3 className="font-semibold mb-4">Origem e destino</h3>
                <div className="space-y-4">
                    <LocationSelector label="Origem" selectedCities={originCities} onSelectionChange={setOriginCities} />
                    <LocationSelector label="Destino" selectedCities={destinationCities} onSelectionChange={setDestinationCities} />
                </div>
            </Card>

            <Card className="p-4">
                <h3 className="font-semibold mb-2">Tipo de Frete</h3>
                <div className="space-y-2">
                     {freightTypes.map(type => (
                        <div key={type.id} className="flex items-center space-x-2">
                            <Checkbox id={`ft-${type.id}`} onCheckedChange={() => handleFreightTypeSelection(type.id)} checked={selectedFreightTypes.includes(type.id)} />
                            <label htmlFor={`ft-${type.id}`} className="text-sm">{type.label}</label>
                        </div>
                    ))}
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
    );


    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Mobile Filter Button and Sheet */}
            <div className="md:hidden col-span-1 mb-4">
                 <Sheet>
                    <SheetTrigger asChild>
                        <Button variant="outline" className="w-full">
                            <Filter className="mr-2 h-4 w-4" />
                            Filtros
                        </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="overflow-y-auto">
                         {renderFilters()}
                    </SheetContent>
                </Sheet>
            </div>


            {/* Sidebar for Desktop */}
            <div className="hidden md:block col-span-1">
                 {renderFilters()}
            </div>

            {/* Main Content */}
            <main className="col-span-1 md:col-span-3 space-y-6">
                {!user && (
                    <Alert className="bg-blue-50 border-blue-200 text-blue-800">
                        <Eye className="h-4 w-4 !text-blue-700" />
                        <AlertTitle className="font-semibold">Para ver os valores dos fretes, você precisa se autenticar.</AlertTitle>
                        <AlertDescription>
                            <Link href="/login" className="font-bold underline">Entre</Link> ou <Link href="/register" className="font-bold underline">crie uma conta</Link> para ter acesso a todos os detalhes.
                        </AlertDescription>
                    </Alert>
                )}
                <h2 className="text-lg font-medium">{filteredFreights.length} fretes disponíveis</h2>
                {renderFreightList()}
            </main>
        </div>
    );
}
