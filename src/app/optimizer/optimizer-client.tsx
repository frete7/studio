'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getOptimizedRoute } from '@/app/actions';
import { type OptimizeRouteOutput } from '@/ai/flows/optimize-route';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Route, Lightbulb, Repeat, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const formSchema = z.object({
  origin: z.string().min(2, { message: 'Origem é obrigatória.' }),
  destination: z.string().min(2, { message: 'Destino é obrigatório.' }),
  currentLocation: z.string().optional(),
  freightType: z.string({ required_error: 'Selecione o tipo de frete.' }),
  vehicleType: z.string({ required_error: 'Selecione o tipo de veículo.' }),
  preferences: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function OptimizerClient() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<OptimizeRouteOutput | null>(null);
  const { toast } = useToast();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      origin: '',
      destination: '',
      currentLocation: '',
      preferences: '',
    },
  });

  async function onSubmit(values: FormData) {
    setIsLoading(true);
    setResult(null);
    try {
      const optimizedResult = await getOptimizedRoute({
        ...values,
        avoidReturnFreight: true,
      });
      setResult(optimizedResult);
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Erro na Otimização',
        description: error instanceof Error ? error.message : 'Ocorreu um erro desconhecido.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span>Detalhes da Viagem</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="origin"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Origem</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: São Paulo, SP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="destination"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destino</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Rio de Janeiro, RJ" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                 <FormField
                  control={form.control}
                  name="currentLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Localização Atual (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Campinas, SP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                    control={form.control}
                    name="freightType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tipo de Frete</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Comum">Comum</SelectItem>
                            <SelectItem value="Agregamento">Agregamento</SelectItem>
                            <SelectItem value="Frete Completo">Frete Completo</SelectItem>
                            <SelectItem value="Frete de Retorno">Frete de Retorno</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="vehicleType"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Tipo de Veículo</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="Caminhão Toco">Caminhão Toco</SelectItem>
                            <SelectItem value="Caminhão Truck">Caminhão Truck</SelectItem>
                            <SelectItem value="Carreta Simples">Carreta Simples</SelectItem>
                            <SelectItem value="Carreta Eixo Extendido">Carreta Eixo Extendido</SelectItem>
                            <SelectItem value="Van">Van</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                />
              </div>
              <FormField
                control={form.control}
                name="preferences"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferências (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Ex: Evitar pedágios, preferência por estradas federais..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Otimizando...
                  </>
                ) : (
                  'Otimizar Rota'
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
      
      {isLoading && (
        <div className="mt-8 text-center">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary"/>
            <p className="mt-4 text-lg text-foreground/70">Aguarde, nossa IA está calculando a melhor rota para você...</p>
        </div>
      )}

      {result && (
        <div className="mt-12 space-y-8">
          <Card className="bg-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-primary">
                <Route className="h-6 w-6" />
                <span>Rota Otimizada</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-foreground/80 whitespace-pre-wrap">{result.optimizedRoute}</p>
            </CardContent>
          </Card>

          {result.returnFreightSuggestions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Repeat className="h-6 w-6" />
                  <span>Sugestões de Frete de Retorno</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 whitespace-pre-wrap">{result.returnFreightSuggestions}</p>
              </CardContent>
            </Card>
          )}

          {result.efficiencyTips && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <Lightbulb className="h-6 w-6" />
                  <span>Dicas de Eficiência</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-foreground/80 whitespace-pre-wrap">{result.efficiencyTips}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </>
  );
}
