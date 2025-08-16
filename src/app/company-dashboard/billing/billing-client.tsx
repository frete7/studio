
'use client';

import { useState } from 'react';
import { type Plan } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, CreditCard, Star, Loader2, QrCode, ExternalLink, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPixPayment, createCreditCardPayment, createBoletoPayment } from '@/lib/actions/payment-actions';
import { type PagSeguroCustomer } from '@/lib/pagseguro/config';

type BillingClientProps = {
    allPlans: Plan[];
    currentPlanId?: string;
};

type PaymentMethod = 'PIX' | 'CREDITCARD' | 'BOLETO';

type PaymentFormData = {
    paymentMethod: PaymentMethod;
    customerData: PagSeguroCustomer;
    cardData?: {
        number: string;
        brand: string;
        cvv: string;
        expirationMonth: string;
        expirationYear: string;
        holder: {
            name: string;
            birthDate: string;
            cpf: string;
        };
    };
    installments: number;
};

export default function BillingClient({ allPlans, currentPlanId }: BillingClientProps) {
    const [selectedPlanId, setSelectedPlanId] = useState<string | undefined>(currentPlanId);
    const [isLoading, setIsLoading] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedPlanForPayment, setSelectedPlanForPayment] = useState<Plan | null>(null);
    const [paymentFormData, setPaymentFormData] = useState<PaymentFormData>({
        paymentMethod: 'PIX',
        customerData: {
            name: '',
            email: '',
            cpf: '',
            phone: {
                areaCode: '',
                number: '',
            },
            address: {
                street: '',
                number: '',
                complement: '',
                district: '',
                city: '',
                state: '',
                country: 'Brasil',
                postalCode: '',
            },
        },
        installments: 1,
    });
    const [paymentResult, setPaymentResult] = useState<any>(null);

    const { toast } = useToast();

    const formatCurrency = (value: number) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    }
    
    const getPlanFeatures = (plan: Plan): string[] => {
        const features = [];
        
        if (plan.freightLimitType === 'unlimited') {
            features.push("Solicitação de fretes ilimitada");
        } else {
            features.push(`${plan.freightLimit} solicitações de frete/mês`);
        }
        
        const allowedTypes = [];
        if(plan.allowedFreightTypes.agregamento) allowedTypes.push('Agregamento');
        if(plan.allowedFreightTypes.completo) allowedTypes.push('Completo');
        if(plan.allowedFreightTypes.retorno) allowedTypes.push('Retorno');
        features.push(`Acesso aos fretes: ${allowedTypes.join(', ')}`);

        if (plan.collaboratorLimitType === 'unlimited') {
            features.push("Colaboradores ilimitados");
        } else {
            features.push(`${plan.collaboratorLimit} colaboradores`);
        }

        if (plan.hasStatisticsAccess) {
            features.push("Acesso a estatísticas de desempenho");
        }

        if (plan.hasReturningDriversAccess) {
            features.push("Acesso a motoristas de retorno");
        }

        features.push("Suporte Prioritário");

        return features;
    }

    const handleSelectPlan = (planId: string) => {
        setSelectedPlanId(planId);
        const plan = allPlans.find(p => p.id === planId);
        if (plan) {
            setSelectedPlanForPayment(plan);
            setIsPaymentDialogOpen(true);
        }
    };

    const handlePaymentSubmit = async () => {
        if (!selectedPlanForPayment) return;

        setIsLoading(true);
        setPaymentResult(null);

        try {
            let paymentResponse;

            switch (paymentFormData.paymentMethod) {
                case 'PIX':
                    paymentResponse = await createPixPayment(
                        'current-user-id', // Será obtido do contexto de autenticação
                        selectedPlanForPayment.id,
                        paymentFormData.customerData
                    );
                    break;
                case 'CREDITCARD':
                    if (!paymentFormData.cardData) {
                        toast({
                            variant: 'destructive',
                            title: 'Erro',
                            description: 'Dados do cartão são obrigatórios',
                        });
                        return;
                    }
                    paymentResponse = await createCreditCardPayment(
                        'current-user-id', // Será obtido do contexto de autenticação
                        selectedPlanForPayment.id,
                        paymentFormData.customerData,
                        paymentFormData.cardData,
                        paymentFormData.installments
                    );
                    break;
                case 'BOLETO':
                    paymentResponse = await createBoletoPayment(
                        'current-user-id', // Será obtido do contexto de autenticação
                        selectedPlanForPayment.id,
                        paymentFormData.customerData
                    );
                    break;
                default:
                    throw new Error('Método de pagamento não suportado');
            }

            if (paymentResponse.success) {
                setPaymentResult(paymentResponse);
                toast({
                    title: 'Pagamento criado com sucesso!',
                    description: 'Aguarde a confirmação do pagamento.',
                });
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erro ao criar pagamento',
                    description: paymentResponse.error?.message || 'Erro desconhecido',
                });
            }
        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Erro',
                description: error.message || 'Erro ao processar pagamento',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: 'Copiado!',
            description: 'Texto copiado para a área de transferência',
        });
    };

    const renderPaymentForm = () => (
        <div className="space-y-6">
            {/* Método de Pagamento */}
            <div>
                <Label className="text-base font-semibold">Método de Pagamento</Label>
                <RadioGroup
                    value={paymentFormData.paymentMethod}
                    onValueChange={(value: PaymentMethod) => setPaymentFormData(prev => ({ ...prev, paymentMethod: value }))}
                    className="grid grid-cols-3 gap-4 mt-2"
                >
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="PIX" id="pix" />
                        <Label htmlFor="pix">PIX</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="CREDITCARD" id="creditcard" />
                        <Label htmlFor="creditcard">Cartão de Crédito</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <RadioGroupItem value="BOLETO" id="boleto" />
                        <Label htmlFor="boleto">Boleto</Label>
                    </div>
                </RadioGroup>
            </div>

            {/* Dados do Cliente */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <Label htmlFor="name">Nome Completo</Label>
                    <Input
                        id="name"
                        value={paymentFormData.customerData.name}
                        onChange={(e) => setPaymentFormData(prev => ({
                            ...prev,
                            customerData: { ...prev.customerData, name: e.target.value }
                        }))}
                        placeholder="Seu nome completo"
                    />
                </div>
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={paymentFormData.customerData.email}
                        onChange={(e) => setPaymentFormData(prev => ({
                            ...prev,
                            customerData: { ...prev.customerData, email: e.target.value }
                        }))}
                        placeholder="seu@email.com"
                    />
                </div>
                <div>
                    <Label htmlFor="cpf">CPF</Label>
                    <Input
                        id="cpf"
                        value={paymentFormData.customerData.cpf}
                        onChange={(e) => setPaymentFormData(prev => ({
                            ...prev,
                            customerData: { ...prev.customerData, cpf: e.target.value }
                        }))}
                        placeholder="000.000.000-00"
                    />
                </div>
                <div>
                    <Label htmlFor="phone">Telefone</Label>
                    <div className="flex gap-2">
                        <Input
                            value={paymentFormData.customerData.phone?.areaCode}
                            onChange={(e) => setPaymentFormData(prev => ({
                                ...prev,
                                customerData: { 
                                    ...prev.customerData, 
                                    phone: { ...prev.customerData.phone!, areaCode: e.target.value }
                                }
                            }))}
                            placeholder="11"
                            className="w-20"
                        />
                        <Input
                            value={paymentFormData.customerData.phone?.number}
                            onChange={(e) => setPaymentFormData(prev => ({
                                ...prev,
                                customerData: { 
                                    ...prev.customerData, 
                                    phone: { ...prev.customerData.phone!, number: e.target.value }
                                }
                            }))}
                            placeholder="99999-9999"
                        />
                    </div>
                </div>
            </div>

            {/* Endereço */}
            <div>
                <Label className="text-base font-semibold">Endereço</Label>
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <div className="col-span-2">
                        <Label htmlFor="street">Rua</Label>
                        <Input
                            id="street"
                            value={paymentFormData.customerData.address?.street}
                            onChange={(e) => setPaymentFormData(prev => ({
                                ...prev,
                                customerData: { 
                                    ...prev.customerData, 
                                    address: { ...prev.customerData.address!, street: e.target.value }
                                }
                            }))}
                            placeholder="Nome da rua"
                        />
                    </div>
                    <div>
                        <Label htmlFor="number">Número</Label>
                        <Input
                            id="number"
                            value={paymentFormData.customerData.address?.number}
                            onChange={(e) => setPaymentFormData(prev => ({
                                ...prev,
                                customerData: { 
                                    ...prev.customerData, 
                                    address: { ...prev.customerData.address!, number: e.target.value }
                                }
                            }))}
                            placeholder="123"
                        />
                    </div>
                    <div>
                        <Label htmlFor="complement">Complemento</Label>
                        <Input
                            id="complement"
                            value={paymentFormData.customerData.address?.complement}
                            onChange={(e) => setPaymentFormData(prev => ({
                                ...prev,
                                customerData: { 
                                    ...prev.customerData, 
                                    address: { ...prev.customerData.address!, complement: e.target.value }
                                }
                            }))}
                            placeholder="Apto 45"
                        />
                    </div>
                    <div>
                        <Label htmlFor="district">Bairro</Label>
                        <Input
                            id="district"
                            value={paymentFormData.customerData.address?.district}
                            onChange={(e) => setPaymentFormData(prev => ({
                                ...prev,
                                customerData: { 
                                    ...prev.customerData, 
                                    address: { ...prev.customerData.address!, district: e.target.value }
                                }
                            }))}
                            placeholder="Centro"
                        />
                    </div>
                    <div>
                        <Label htmlFor="city">Cidade</Label>
                        <Input
                            id="city"
                            value={paymentFormData.customerData.address?.city}
                            onChange={(e) => setPaymentFormData(prev => ({
                                ...prev,
                                customerData: { 
                                    ...prev.customerData, 
                                    address: { ...prev.customerData.address!, city: e.target.value }
                                }
                            }))}
                            placeholder="São Paulo"
                        />
                    </div>
                    <div>
                        <Label htmlFor="state">Estado</Label>
                        <Input
                            id="state"
                            value={paymentFormData.customerData.address?.state}
                            onChange={(e) => setPaymentFormData(prev => ({
                                ...prev,
                                customerData: { 
                                    ...prev.customerData, 
                                    address: { ...prev.customerData.address!, state: e.target.value }
                                }
                            }))}
                            placeholder="SP"
                        />
                    </div>
                    <div>
                        <Label htmlFor="postalCode">CEP</Label>
                        <Input
                            id="postalCode"
                            value={paymentFormData.customerData.address?.postalCode}
                            onChange={(e) => setPaymentFormData(prev => ({
                                ...prev,
                                customerData: { 
                                    ...prev.customerData, 
                                    address: { ...prev.customerData.address!, postalCode: e.target.value }
                                }
                            }))}
                            placeholder="00000-000"
                        />
                    </div>
                </div>
            </div>

            {/* Dados do Cartão (se aplicável) */}
            {paymentFormData.paymentMethod === 'CREDITCARD' && (
                <div>
                    <Label className="text-base font-semibold">Dados do Cartão</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                        <div className="col-span-2">
                            <Label htmlFor="cardNumber">Número do Cartão</Label>
                            <Input
                                id="cardNumber"
                                value={paymentFormData.cardData?.number || ''}
                                onChange={(e) => setPaymentFormData(prev => ({
                                    ...prev,
                                    cardData: { ...prev.cardData!, number: e.target.value }
                                }))}
                                placeholder="0000 0000 0000 0000"
                            />
                        </div>
                        <div>
                            <Label htmlFor="cardBrand">Bandeira</Label>
                            <Select
                                value={paymentFormData.cardData?.brand || ''}
                                onValueChange={(value) => setPaymentFormData(prev => ({
                                    ...prev,
                                    cardData: { ...prev.cardData!, brand: value }
                                }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione a bandeira" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="visa">Visa</SelectItem>
                                    <SelectItem value="mastercard">Mastercard</SelectItem>
                                    <SelectItem value="elo">Elo</SelectItem>
                                    <SelectItem value="amex">American Express</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="cvv">CVV</Label>
                            <Input
                                id="cvv"
                                value={paymentFormData.cardData?.cvv || ''}
                                onChange={(e) => setPaymentFormData(prev => ({
                                    ...prev,
                                    cardData: { ...prev.cardData!, cvv: e.target.value }
                                }))}
                                placeholder="123"
                                maxLength={4}
                            />
                        </div>
                        <div>
                            <Label htmlFor="expMonth">Mês de Expiração</Label>
                            <Select
                                value={paymentFormData.cardData?.expirationMonth || ''}
                                onValueChange={(value) => setPaymentFormData(prev => ({
                                    ...prev,
                                    cardData: { ...prev.cardData!, expirationMonth: value }
                                }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Mês" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                        <SelectItem key={month} value={month.toString().padStart(2, '0')}>
                                            {month.toString().padStart(2, '0')}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label htmlFor="expYear">Ano de Expiração</Label>
                            <Select
                                value={paymentFormData.cardData?.expirationYear || ''}
                                onValueChange={(value) => setPaymentFormData(prev => ({
                                    ...prev,
                                    cardData: { ...prev.cardData!, expirationYear: value }
                                }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Ano" />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i).map(year => (
                                        <SelectItem key={year} value={year.toString()}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Label htmlFor="holderName">Nome no Cartão</Label>
                            <Input
                                id="holderName"
                                value={paymentFormData.cardData?.holder?.name || ''}
                                onChange={(e) => setPaymentFormData(prev => ({
                                    ...prev,
                                    cardData: { 
                                        ...prev.cardData!, 
                                        holder: { ...prev.cardData!.holder!, name: e.target.value }
                                    }
                                }))}
                                placeholder="Nome como está no cartão"
                            />
                        </div>
                        <div>
                            <Label htmlFor="holderBirthDate">Data de Nascimento</Label>
                            <Input
                                id="holderBirthDate"
                                type="date"
                                value={paymentFormData.cardData?.holder?.birthDate || ''}
                                onChange={(e) => setPaymentFormData(prev => ({
                                    ...prev,
                                    cardData: { 
                                        ...prev.cardData!, 
                                        holder: { ...prev.cardData!.holder!, birthDate: e.target.value }
                                    }
                                }))}
                            />
                        </div>
                        <div>
                            <Label htmlFor="holderCpf">CPF do Titular</Label>
                            <Input
                                id="holderCpf"
                                value={paymentFormData.cardData?.holder?.cpf || ''}
                                onChange={(e) => setPaymentFormData(prev => ({
                                    ...prev,
                                    cardData: { 
                                        ...prev.cardData!, 
                                        holder: { ...prev.cardData!.holder!, cpf: e.target.value }
                                    }
                                }))}
                                placeholder="000.000.000-00"
                            />
                        </div>
                        <div>
                            <Label htmlFor="installments">Parcelas</Label>
                            <Select
                                value={paymentFormData.installments.toString()}
                                onValueChange={(value) => setPaymentFormData(prev => ({
                                    ...prev,
                                    installments: parseInt(value)
                                }))}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(installment => (
                                        <SelectItem key={installment} value={installment.toString()}>
                                            {installment}x de {formatCurrency(selectedPlanForPayment ? selectedPlanForPayment.priceCard / installment : 0)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )}

            {/* Resumo do Plano */}
            {selectedPlanForPayment && (
                <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Resumo do Plano</h4>
                    <div className="space-y-1 text-sm">
                        <p><strong>Plano:</strong> {selectedPlanForPayment.name}</p>
                        <p><strong>Valor:</strong> {formatCurrency(
                            paymentFormData.paymentMethod === 'CREDITCARD' 
                                ? selectedPlanForPayment.priceCard 
                                : selectedPlanForPayment.pricePix
                        )}</p>
                        {paymentFormData.paymentMethod === 'CREDITCARD' && paymentFormData.installments > 1 && (
                            <p><strong>Parcelas:</strong> {paymentFormData.installments}x de {formatCurrency(
                                (paymentFormData.paymentMethod === 'CREDITCARD' 
                                    ? selectedPlanForPayment.priceCard 
                                    : selectedPlanForPayment.pricePix) / paymentFormData.installments
                            )}</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );

    const renderPaymentResult = () => {
        if (!paymentResult) return null;

        return (
            <div className="space-y-4">
                <div className="text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-green-600">Pagamento Criado com Sucesso!</h3>
                    <p className="text-muted-foreground">Aguarde a confirmação do pagamento</p>
                </div>

                {paymentResult.qrCode && (
                    <div className="text-center">
                        <h4 className="font-semibold mb-2">QR Code PIX</h4>
                        <div className="bg-white p-4 rounded-lg inline-block">
                            <QrCode className="h-32 w-32" />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Escaneie o QR Code com seu app bancário
                        </p>
                    </div>
                )}

                {paymentResult.qrCodeText && (
                    <div className="text-center">
                        <h4 className="font-semibold mb-2">Código PIX</h4>
                        <div className="flex items-center justify-center gap-2">
                            <code className="bg-muted px-3 py-2 rounded text-sm font-mono">
                                {paymentResult.qrCodeText}
                            </code>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => copyToClipboard(paymentResult.qrCodeText)}
                            >
                                <Copy className="h-4 w-4" />
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                            Copie e cole no seu app bancário
                        </p>
                    </div>
                )}

                {paymentResult.paymentUrl && (
                    <div className="text-center">
                        <Button asChild className="w-full">
                            <a href={paymentResult.paymentUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Acessar Página de Pagamento
                            </a>
                        </Button>
                    </div>
                )}

                <div className="bg-muted p-4 rounded-lg">
                    <h4 className="font-semibold mb-2">Informações da Transação</h4>
                    <div className="space-y-1 text-sm">
                        <p><strong>ID da Transação:</strong> {paymentResult.transactionId}</p>
                        <p><strong>Status:</strong> Aguardando pagamento</p>
                        <p><strong>Método:</strong> {paymentFormData.paymentMethod}</p>
                    </div>
                </div>
            </div>
        );
    };

    const renderPlans = () => {
        if (!allPlans || allPlans.length === 0) {
            return (
                <Card className="text-center p-8">
                    <CardTitle>Nenhum Plano Disponível</CardTitle>
                    <CardDescription className="mt-2">
                        No momento não há planos disponíveis. Por favor, volte mais tarde.
                    </CardDescription>
                </Card>
            )
        }

        return (
             <div className="grid md:grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                {allPlans.map((plan, index) => {
                    const isCurrent = plan.id === currentPlanId;
                    const isPopular = index === 1; // Example logic to make one plan "popular"
                    const planFeatures = getPlanFeatures(plan);

                    return (
                        <Card key={plan.id} className={cn("flex flex-col", isCurrent && "border-primary border-2", isPopular && "shadow-lg")}>
                            {isPopular && (
                                <div className="bg-primary text-primary-foreground text-center text-sm font-bold py-1 rounded-t-lg">
                                    Mais Popular
                                </div>
                            )}
                            <CardHeader className="items-center text-center">
                                <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-baseline">
                                        <span className="text-muted-foreground">Valor no PIX:</span>
                                        <span className="text-2xl font-bold">{formatCurrency(plan.pricePix)}<span className='text-sm font-normal text-muted-foreground'>/mês</span></span>
                                    </div>
                                    <div className="flex justify-between items-baseline">
                                         <span className="text-muted-foreground">Valor no Cartão:</span>
                                        <span className="text-2xl font-bold">{formatCurrency(plan.priceCard)}<span className='text-sm font-normal text-muted-foreground'>/mês</span></span>
                                    </div>
                                </div>
                                <Separator />
                                <ul className="space-y-3 text-sm">
                                    {planFeatures.map((feature, i) => (
                                        <li key={i} className="flex items-start gap-3">
                                            <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span className="text-muted-foreground">{feature}</span>
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <CardFooter>
                                <Button
                                    className="w-full"
                                    disabled={isCurrent || isLoading}
                                    onClick={() => handleSelectPlan(plan.id)}
                                >
                                    {isCurrent ? 'Plano Atual' : 'Selecionar Plano'}
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="text-center">
                <h1 className="text-4xl font-bold font-headline text-primary">Planos e Assinatura</h1>
                <p className="mt-2 text-lg text-foreground/70">
                    Escolha o plano que melhor se adapta às necessidades da sua empresa.
                </p>
            </div>
            
            {renderPlans()}

            <Card className="mt-12">
                <CardHeader>
                    <CardTitle>Gerenciar Pagamentos</CardTitle>
                    <CardDescription>Acesse seu histórico de faturas e atualize seu método de pagamento.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">O seu plano atual é o <span className="font-semibold text-primary">{allPlans.find(p => p.id === currentPlanId)?.name || 'Básico'}</span>.</p>
                </CardContent>
                <CardFooter>
                    <Button variant="outline">
                        <CreditCard className="mr-2 h-4 w-4" />
                        Portal de Pagamentos
                    </Button>
                </CardFooter>
            </Card>

            {/* Modal de Pagamento */}
            <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {paymentResult ? 'Pagamento Criado' : 'Finalizar Assinatura'}
                        </DialogTitle>
                    </DialogHeader>
                    
                    {paymentResult ? renderPaymentResult() : renderPaymentForm()}
                    
                    {!paymentResult && (
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsPaymentDialogOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                onClick={handlePaymentSubmit}
                                disabled={isLoading}
                            >
                                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isLoading ? 'Processando...' : 'Finalizar Pagamento'}
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
