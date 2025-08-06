import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ArrowRight, Building, PackageCheck, Route, Sparkles, User, Users } from 'lucide-react';
import Link from 'next/link';

const features = [
  {
    icon: <PackageCheck className="h-8 w-8 text-primary" />,
    title: 'Listagens de Frete',
    description: 'Encontre uma vasta gama de fretes disponíveis, atualizados em tempo real para todo o Brasil.',
    link: '#',
  },
  {
    icon: <Sparkles className="h-8 w-8 text-primary" />,
    title: 'Otimizador de Rotas com IA',
    description: 'Nossa ferramenta de IA sugere as melhores rotas para maximizar seus ganhos e reduzir custos.',
    link: '/optimizer',
  },
  {
    icon: <Users className="h-8 w-8 text-primary" />,
    title: 'Perfis Verificados',
    description: 'Conecte-se com motoristas e empresas com perfis verificados, garantindo mais segurança.',
    link: '#',
  },
];

const testimonials = [
    {
        name: 'João Silva',
        role: 'Motorista de Caminhão',
        image: 'https://placehold.co/100x100.png',
        comment: 'O Frete7 mudou minha forma de trabalhar. Consigo encontrar fretes de retorno facilmente, o que aumentou meus lucros em 30%!',
        aiHint: 'man truck driver'
    },
    {
        name: 'Maria Fernandes',
        role: 'Gerente de Logística, Transportadora Veloz',
        image: 'https://placehold.co/100x100.png',
        comment: 'A plataforma é muito intuitiva. Publicar nossas cargas e encontrar motoristas qualificados ficou muito mais rápido e eficiente.',
        aiHint: 'woman manager'
    },
    {
        name: 'Carlos Pereira',
        role: 'Motorista Autônomo',
        image: 'https://placehold.co/100x100.png',
        comment: 'O otimizador de rotas é fantástico! Economizo combustível e tempo em todas as viagens. Recomendo a todos os colegas.',
        aiHint: 'male driver'
    },
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="py-20 md:py-32 bg-background">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold font-headline text-primary tracking-tighter">
            Conectando Cargas e Caminhoneiros
          </h1>
          <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-foreground/80">
            A plataforma inteligente que otimiza suas rotas, aumenta seus lucros e simplifica a logística de fretes no Brasil.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="#">Buscar Fretes <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#">Anunciar Carga</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* "How it Works" Section */}
      <section className="py-16 bg-muted/40">
        <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 font-headline">Como Funciona?</h2>
            <div className="grid md:grid-cols-3 gap-8 text-center">
                <div className="flex flex-col items-center">
                    <div className="bg-primary/10 rounded-full p-4 mb-4">
                        <Building className="h-10 w-10 text-primary"/>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">1. Anuncie sua Carga</h3>
                    <p className="text-foreground/70">Empresas e pessoas físicas publicam suas necessidades de frete de forma rápida e detalhada.</p>
                </div>
                <div className="flex flex-col items-center">
                     <div className="bg-primary/10 rounded-full p-4 mb-4">
                        <User className="h-10 w-10 text-primary"/>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">2. Encontre um Frete</h3>
                    <p className="text-foreground/70">Motoristas buscam e encontram as melhores oportunidades de frete, filtrando por rota, tipo de carga e valor.</p>
                </div>
                <div className="flex flex-col items-center">
                    <div className="bg-primary/10 rounded-full p-4 mb-4">
                        <Route className="h-10 w-10 text-primary"/>
                    </div>
                    <h3 className="text-xl font-semibold mb-2">3. Feche Negócio</h3>
                    <p className="text-foreground/70">As partes se conectam diretamente pela plataforma para combinar os detalhes e iniciar a viagem com segurança.</p>
                </div>
            </div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold font-headline">Ferramentas para o seu Sucesso</h2>
            <p className="mt-2 text-lg text-foreground/70">Tudo o que você precisa em um só lugar.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature) => (
              <Card key={feature.title} className="text-center shadow-lg hover:shadow-xl transition-shadow duration-300">
                <CardHeader>
                  <div className="mx-auto bg-primary/10 rounded-full p-3 w-fit">
                    {feature.icon}
                  </div>
                  <CardTitle className="mt-4">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-foreground/70">{feature.description}</p>
                   <Button variant="link" asChild className="mt-4 text-primary">
                    <Link href={feature.link}>Saiba Mais <ArrowRight className="ml-2 h-4 w-4" /></Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-muted/40">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 font-headline">O que nossos usuários dizem</h2>
          <Carousel opts={{ align: "start", loop: true }} className="w-full max-w-4xl mx-auto">
            <CarouselContent>
              {testimonials.map((testimonial, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/2">
                  <div className="p-1">
                    <Card className="h-full flex flex-col justify-between">
                      <CardContent className="p-6">
                        <p className="text-foreground/80 italic mb-6">"{testimonial.comment}"</p>
                        <div className="flex items-center">
                          <Avatar>
                            <AvatarImage src={testimonial.image} alt={testimonial.name} data-ai-hint={testimonial.aiHint} />
                            <AvatarFallback>{testimonial.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div className="ml-4">
                            <p className="font-semibold">{testimonial.name}</p>
                            <p className="text-sm text-foreground/60">{testimonial.role}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious />
            <CarouselNext />
          </Carousel>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4 font-headline">Pronto para otimizar seus fretes?</h2>
          <p className="max-w-xl mx-auto mb-8 text-primary-foreground/80">
            Junte-se a milhares de motoristas e empresas que já estão transformando sua logística.
          </p>
          <Button size="lg" className="bg-accent text-accent-foreground hover:bg-accent/90" asChild>
            <Link href="#">Cadastre-se Gratuitamente</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
