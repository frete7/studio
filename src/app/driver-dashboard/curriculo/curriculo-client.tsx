
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { updateUserResume, addResumeItem, updateResumeItem, deleteResumeItem } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogTrigger, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { Loader2, User, Mail, Phone, CalendarIcon, PlusCircle, Edit, Trash2, GraduationCap, Briefcase, Sparkles } from 'lucide-react';

// Sub-components for forms
const AcademicForm = ({ userId, defaultValues, onFormSubmit }: { userId: string, defaultValues?: any, onFormSubmit: () => void }) => {
    const formSchema = z.object({
        id: z.string().optional(),
        course: z.string().min(2, "O nome do curso é obrigatório."),
        institution: z.string().min(2, "O nome da instituição é obrigatório."),
        workload: z.string().optional(),
        startDate: z.date({ required_error: "Data de início é obrigatória." }),
        endDate: z.date({ required_error: "Data de término é obrigatória." }),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultValues ? {
            ...defaultValues,
            startDate: defaultValues.startDate ? parseISO(defaultValues.startDate) : undefined,
            endDate: defaultValues.endDate ? parseISO(defaultValues.endDate) : undefined,
        } : {},
    });
    const { toast } = useToast();

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        try {
            const dataToSave = {
                ...data,
                startDate: data.startDate.toISOString(),
                endDate: data.endDate.toISOString(),
            };
            if (data.id) {
                await updateResumeItem(userId, 'academicFormation', dataToSave);
                toast({ title: "Sucesso!", description: "Formação atualizada." });
            } else {
                await addResumeItem(userId, 'academicFormation', dataToSave);
                toast({ title: "Sucesso!", description: "Formação adicionada." });
            }
            onFormSubmit();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar a formação." });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="course" render={({ field }) => ( <FormItem><FormLabel>Curso/Formação</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="institution" render={({ field }) => ( <FormItem><FormLabel>Instituição</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="workload" render={({ field }) => ( <FormItem><FormLabel>Carga Horária (Opcional)</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Data de Início</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", {locale: ptBR}) : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                    <FormField control={form.control} name="endDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Data de Fim</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", {locale: ptBR}) : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                </div>
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                    <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Salvar</Button>
                </DialogFooter>
            </form>
        </Form>
    );
};

const ExperienceForm = ({ userId, defaultValues, onFormSubmit }: { userId: string, defaultValues?: any, onFormSubmit: () => void }) => {
    const formSchema = z.object({
        id: z.string().optional(),
        company: z.string().min(2, "O nome da empresa é obrigatório."),
        role: z.string().min(2, "O cargo é obrigatório."),
        startDate: z.date({ required_error: "Data de início é obrigatória." }),
        isCurrent: z.boolean().default(false),
        endDate: z.date().optional(),
    }).refine(data => data.isCurrent || !!data.endDate, {
        message: "A data de fim é obrigatória se não for o trabalho atual.",
        path: ["endDate"],
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: defaultValues ? {
            ...defaultValues,
            startDate: defaultValues.startDate ? parseISO(defaultValues.startDate) : undefined,
            endDate: defaultValues.endDate ? parseISO(defaultValues.endDate) : undefined,
        } : { isCurrent: false },
    });
    const { toast } = useToast();
    const isCurrent = form.watch("isCurrent");

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        try {
            const dataToSave = {
                ...data,
                startDate: data.startDate.toISOString(),
                endDate: data.isCurrent ? null : data.endDate?.toISOString(),
            };

            if (data.id) {
                await updateResumeItem(userId, 'professionalExperience', dataToSave);
                toast({ title: "Sucesso!", description: "Experiência atualizada." });
            } else {
                await addResumeItem(userId, 'professionalExperience', dataToSave);
                toast({ title: "Sucesso!", description: "Experiência adicionada." });
            }
            onFormSubmit();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar a experiência." });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="company" render={({ field }) => ( <FormItem><FormLabel>Empresa</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="role" render={({ field }) => ( <FormItem><FormLabel>Cargo</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <div className="grid grid-cols-2 gap-4">
                     <FormField control={form.control} name="startDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Data de Início</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "PPP", {locale: ptBR}) : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date()} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                     <FormField control={form.control} name="endDate" render={({ field }) => ( <FormItem className="flex flex-col"><FormLabel>Data de Fim</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")} disabled={isCurrent}>{field.value ? format(field.value, "PPP", {locale: ptBR}) : <span>Escolha uma data</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date > new Date() || isCurrent} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem> )} />
                </div>
                 <FormField control={form.control} name="isCurrent" render={({ field }) => ( <FormItem className="flex flex-row items-center space-x-2"><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormLabel>Trabalho Atual</FormLabel></FormItem> )} />
                <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                    <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Salvar</Button>
                </DialogFooter>
            </form>
        </Form>
    );
};

const QualificationForm = ({ userId, defaultValues, onFormSubmit }: { userId: string, defaultValues?: any, onFormSubmit: () => void }) => {
    const formSchema = z.object({
        id: z.string().optional(),
        qualification: z.string().min(2, "A qualificação é obrigatória."),
        description: z.string().optional(),
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues,
    });
    const { toast } = useToast();

    const onSubmit = async (data: z.infer<typeof formSchema>) => {
        try {
            if (data.id) {
                await updateResumeItem(userId, 'qualifications', data);
                toast({ title: "Sucesso!", description: "Qualificação atualizada." });
            } else {
                await addResumeItem(userId, 'qualifications', data);
                toast({ title: "Sucesso!", description: "Qualificação adicionada." });
            }
            onFormSubmit();
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível salvar a qualificação." });
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField control={form.control} name="qualification" render={({ field }) => ( <FormItem><FormLabel>Qualificação/Curso</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Descrição (Opcional)</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem> )} />
                 <DialogFooter>
                    <DialogClose asChild><Button type="button" variant="secondary">Cancelar</Button></DialogClose>
                    <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}Salvar</Button>
                </DialogFooter>
            </form>
        </Form>
    );
};


// Main Component
export default function CurriculoClient({ profile }: { profile: any }) {
    const { toast } = useToast();
    const [isSearchable, setIsSearchable] = useState(profile.isSearchable || false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [dialogContent, setDialogContent] = useState<React.ReactNode | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleSearchableToggle = async (checked: boolean) => {
        setIsSubmitting(true);
        try {
            await updateUserResume(profile.uid, { isSearchable: checked });
            setIsSearchable(checked);
            toast({ title: "Visibilidade atualizada!" });
        } catch {
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível atualizar a visibilidade." });
            setIsSearchable(!checked); // Revert on error
        } finally {
            setIsSubmitting(false);
        }
    };

    const calculateAge = (birthDate: string | undefined) => {
        if (!birthDate) return '';
        const today = new Date();
        const birth = new Date(birthDate);
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }
        return `(${age} anos)`;
    };
    
    const openDialog = (type: 'academic' | 'experience' | 'qualification', defaultValues?: any) => {
        const onFormSubmit = () => setIsDialogOpen(false);
        switch (type) {
            case 'academic':
                setDialogContent(<AcademicForm userId={profile.uid} defaultValues={defaultValues} onFormSubmit={onFormSubmit} />);
                break;
            case 'experience':
                setDialogContent(<ExperienceForm userId={profile.uid} defaultValues={defaultValues} onFormSubmit={onFormSubmit} />);
                break;
            case 'qualification':
                setDialogContent(<QualificationForm userId={profile.uid} defaultValues={defaultValues} onFormSubmit={onFormSubmit} />);
                break;
        }
        setIsDialogOpen(true);
    };

    const handleDelete = async (field: 'academicFormation' | 'professionalExperience' | 'qualifications', itemId: string) => {
         try {
            await deleteResumeItem(profile.uid, field, itemId);
            toast({ title: "Sucesso!", description: "Item removido." });
        } catch (error) {
            toast({ variant: "destructive", title: "Erro", description: "Não foi possível remover o item." });
        }
    }
    
    const getInitials = (name: string) => {
        if (!name) return '';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    }
    
    return (
        <div className="space-y-8">
            <Card>
                <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-0.5">
                        <FormLabel>Permitir que empresas busquem meu currículo</FormLabel>
                        <FormDescription>Seu perfil será visível nos resultados de busca de empresas.</FormDescription>
                    </div>
                    <Switch checked={isSearchable} onCheckedChange={handleSearchableToggle} disabled={isSubmitting} />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20 border">
                            <AvatarImage src={profile.photoURL} alt={profile.name} />
                             <AvatarFallback>{getInitials(profile.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <CardTitle className="text-2xl">{profile.name}</CardTitle>
                            <CardDescription>{calculateAge(profile.birthDate)}</CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-2">
                     <div className="flex items-center gap-2 text-sm text-muted-foreground"><Phone className="h-4 w-4" />{profile.phone}</div>
                     <div className="flex items-center gap-2 text-sm text-muted-foreground"><Mail className="h-4 w-4" />{profile.email}</div>
                </CardContent>
            </Card>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>{dialogContent}</DialogContent>
            </Dialog>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Formação Acadêmica</CardTitle></div>
                    <Button variant="outline" size="sm" onClick={() => openDialog('academic')}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {profile.academicFormation?.length > 0 ? (
                        profile.academicFormation.map((item: any) => (
                            <div key={item.id} className="p-3 border rounded-md">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{item.course}</p>
                                        <p className="text-sm text-muted-foreground">{item.institution}</p>
                                        <p className="text-xs text-muted-foreground">{format(parseISO(item.startDate), 'MMM yyyy', {locale: ptBR})} - {format(parseISO(item.endDate), 'MMM yyyy', {locale: ptBR})}</p>
                                    </div>
                                    <div className="flex gap-1">
                                         <Button variant="ghost" size="icon" onClick={() => openDialog('academic', item)}><Edit className="h-4 w-4" /></Button>
                                         <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja realmente remover esta formação?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete('academicFormation', item.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma formação adicionada.</p>}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Experiência Profissional</CardTitle></div>
                    <Button variant="outline" size="sm" onClick={() => openDialog('experience')}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                    {profile.professionalExperience?.length > 0 ? (
                        profile.professionalExperience.map((item: any) => (
                             <div key={item.id} className="p-3 border rounded-md">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{item.role}</p>
                                        <p className="text-sm text-muted-foreground">{item.company}</p>
                                        <p className="text-xs text-muted-foreground">{format(parseISO(item.startDate), 'MMM yyyy', {locale: ptBR})} - {item.isCurrent ? 'Atual' : item.endDate ? format(parseISO(item.endDate), 'MMM yyyy', {locale: ptBR}) : ''}</p>
                                    </div>
                                    <div className="flex gap-1">
                                         <Button variant="ghost" size="icon" onClick={() => openDialog('experience', item)}><Edit className="h-4 w-4" /></Button>
                                         <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja realmente remover esta experiência?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete('professionalExperience', item.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma experiência adicionada.</p>}
                </CardContent>
            </Card>
            
            <Card>
                <CardHeader className="flex-row items-center justify-between">
                    <div className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /><CardTitle className="text-xl">Cursos e Qualificações</CardTitle></div>
                    <Button variant="outline" size="sm" onClick={() => openDialog('qualification')}><PlusCircle className="mr-2 h-4 w-4"/>Adicionar</Button>
                </CardHeader>
                <CardContent className="space-y-4">
                     {profile.qualifications?.length > 0 ? (
                        profile.qualifications.map((item: any) => (
                             <div key={item.id} className="p-3 border rounded-md">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="font-semibold">{item.qualification}</p>
                                        <p className="text-sm text-muted-foreground">{item.description}</p>
                                    </div>
                                    <div className="flex gap-1">
                                         <Button variant="ghost" size="icon" onClick={() => openDialog('qualification', item)}><Edit className="h-4 w-4" /></Button>
                                         <AlertDialog><AlertDialogTrigger asChild><Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button></AlertDialogTrigger><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle><AlertDialogDescription>Deseja realmente remover esta qualificação?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete('qualifications', item.id)}>Excluir</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : <p className="text-sm text-muted-foreground text-center py-4">Nenhuma qualificação adicionada.</p>}
                </CardContent>
            </Card>

        </div>
    );
}
