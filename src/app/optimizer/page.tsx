import type { Metadata } from 'next';
import OptimizerClient from './optimizer-client';

export const metadata: Metadata = {
  title: 'Otimizador de Rotas | Frete7',
  description: 'Use nossa IA para encontrar a rota mais eficiente e lucrativa para sua viagem.',
};

export default function OptimizerPage() {
  return (
    <div className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
                <h1 className="text-4xl font-bold font-headline text-primary">Otimizador de Rotas com IA</h1>
                <p className="mt-2 text-lg text-foreground/70">
                    Preencha os detalhes da sua viagem para receber uma rota otimizada, dicas de eficiência e sugestões para frete de retorno.
                </p>
            </div>
            <OptimizerClient />
        </div>
    </div>
  );
}
