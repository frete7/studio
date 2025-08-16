'use server';

import { PagSeguroClient } from '@/lib/pagseguro/client';
import { 
  PagSeguroPaymentRequest, 
  PagSeguroPaymentResponse, 
  PagSeguroTransaction,
  PagSeguroCustomer,
  PagSeguroItem,
  PagSeguroPaymentMethod
} from '@/lib/pagseguro/config';
import { safeAddDoc, safeUpdateDoc, safeGetDoc, safeQueryDocs } from './utils/firestore-helpers';
import { handleFirestoreError, validateRequiredFields } from './utils/error-handling';
import { createNotification } from './notification-actions';
import { assignPlanToUser } from './user-actions';
import { getPlans, type Plan } from '@/app/actions';

// Tipos para o sistema de pagamentos
export type PaymentTransaction = {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  paymentMethod: 'PIX' | 'CREDITCARD' | 'BOLETO';
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
  pagseguroCode: string;
  pagseguroStatus: number;
  createdAt: any;
  updatedAt: any;
  paidAt?: any;
  expiresAt?: any;
  qrCode?: string;
  qrCodeText?: string;
  paymentUrl?: string;
  installments?: number;
  cardLastDigits?: string;
  cardBrand?: string;
  boletoCode?: string;
  boletoUrl?: string;
};

export type Subscription = {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'active' | 'pending' | 'cancelled' | 'expired' | 'suspended';
  startDate: any;
  endDate: any;
  renewalDate?: any;
  autoRenew: boolean;
  paymentMethod: 'PIX' | 'CREDITCARD' | 'BOLETO';
  lastPaymentId?: string;
  createdAt: any;
  updatedAt: any;
};

// Inicializar cliente PagSeguro
function getPagSeguroClient(): PagSeguroClient {
  const email = process.env.PAGSEGURO_EMAIL;
  const token = process.env.PAGSEGURO_TOKEN;
  const environment = (process.env.PAGSEGURO_ENVIRONMENT as 'sandbox' | 'production') || 'sandbox';

  if (!email || !token) {
    throw new Error('Credenciais do PagSeguro não configuradas');
  }

  return new PagSeguroClient({ email, token }, environment);
}

/**
 * Cria um pagamento PIX para um plano
 */
export async function createPixPayment(
  userId: string, 
  planId: string, 
  customerData: PagSeguroCustomer
): Promise<PagSeguroPaymentResponse> {
  try {
    validateRequiredFields({ userId, planId, customerData });

    // Buscar dados do plano
    const plan = await getPlanById(planId);
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    // Buscar dados do usuário
    const userDoc = await safeGetDoc('users', userId);
    if (!userDoc) {
      throw new Error('Usuário não encontrado');
    }

    const user = userDoc as any;

    // Criar referência única para o pagamento
    const reference = `PLAN_${planId}_${userId}_${Date.now()}`;

    // Preparar dados para o PagSeguro
    const paymentRequest: PagSeguroPaymentRequest = {
      reference,
      customer: customerData,
      items: [{
        id: planId,
        description: `Assinatura ${plan.name} - ${plan.durationDays} dias`,
        amount: plan.pricePix,
        quantity: 1,
      }],
      paymentMethod: { type: 'PIX' },
      notificationURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/pagseguro`,
    };

    // Criar pagamento no PagSeguro
    const pagseguroClient = getPagSeguroClient();
    const paymentResponse = await pagseguroClient.createPixPayment(paymentRequest);

    if (paymentResponse.success && paymentResponse.transactionId) {
      // Salvar transação no Firestore
      const transaction: Omit<PaymentTransaction, 'id'> = {
        userId,
        planId,
        planName: plan.name,
        amount: plan.pricePix,
        paymentMethod: 'PIX',
        status: 'pending',
        pagseguroCode: paymentResponse.transactionId,
        pagseguroStatus: 1, // Aguardando pagamento
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 horas
        qrCode: paymentResponse.qrCode,
        qrCodeText: paymentResponse.qrCodeText,
        paymentUrl: paymentResponse.paymentUrl,
      };

      const transactionRef = await safeAddDoc('payment_transactions', transaction);
      
      // Criar notificação para o usuário
      await createNotification(userId, 'payment_created', {
        planName: plan.name,
        amount: plan.pricePix,
        paymentMethod: 'PIX',
        transactionId: transactionRef.id,
      });

      return {
        ...paymentResponse,
        transactionId: transactionRef.id,
      };
    }

    return paymentResponse;
  } catch (error: any) {
    console.error('Erro ao criar pagamento PIX:', error);
    return {
      success: false,
      error: {
        code: 'PAYMENT_CREATION_ERROR',
        message: error.message || 'Erro ao criar pagamento',
      },
    };
  }
}

/**
 * Cria um pagamento com cartão de crédito
 */
export async function createCreditCardPayment(
  userId: string,
  planId: string,
  customerData: PagSeguroCustomer,
  cardData: any,
  installments: number = 1
): Promise<PagSeguroPaymentResponse> {
  try {
    validateRequiredFields({ userId, planId, customerData, cardData });

    // Buscar dados do plano
    const plan = await getPlanById(planId);
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    // Criar referência única
    const reference = `PLAN_${planId}_${userId}_${Date.now()}`;

    // Preparar dados para o PagSeguro
    const paymentRequest: PagSeguroPaymentRequest = {
      reference,
      customer: customerData,
      items: [{
        id: planId,
        description: `Assinatura ${plan.name} - ${plan.durationDays} dias`,
        amount: plan.priceCard,
        quantity: 1,
      }],
      paymentMethod: { 
        type: 'CREDITCARD',
        installments,
        cardData,
      },
      notificationURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/pagseguro`,
    };

    // Criar pagamento no PagSeguro
    const pagseguroClient = getPagSeguroClient();
    const paymentResponse = await pagseguroClient.createCreditCardPayment(paymentRequest);

    if (paymentResponse.success && paymentResponse.transactionId) {
      // Salvar transação no Firestore
      const transaction: Omit<PaymentTransaction, 'id'> = {
        userId,
        planId,
        planName: plan.name,
        amount: plan.priceCard,
        paymentMethod: 'CREDITCARD',
        status: 'pending',
        pagseguroCode: paymentResponse.transactionId,
        pagseguroStatus: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        installments,
        cardLastDigits: cardData.number.slice(-4),
        cardBrand: cardData.brand,
      };

      const transactionRef = await safeAddDoc('payment_transactions', transaction);

      // Criar notificação
      await createNotification(userId, 'payment_created', {
        planName: plan.name,
        amount: plan.priceCard,
        paymentMethod: 'CREDITCARD',
        transactionId: transactionRef.id,
      });

      return {
        ...paymentResponse,
        transactionId: transactionRef.id,
      };
    }

    return paymentResponse;
  } catch (error: any) {
    console.error('Erro ao criar pagamento com cartão:', error);
    return {
      success: false,
      error: {
        code: 'PAYMENT_CREATION_ERROR',
        message: error.message || 'Erro ao criar pagamento',
      },
    };
  }
}

/**
 * Cria um pagamento com boleto
 */
export async function createBoletoPayment(
  userId: string,
  planId: string,
  customerData: PagSeguroCustomer
): Promise<PagSeguroPaymentResponse> {
  try {
    validateRequiredFields({ userId, planId, customerData });

    // Buscar dados do plano
    const plan = await getPlanById(planId);
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    // Criar referência única
    const reference = `PLAN_${planId}_${userId}_${Date.now()}`;

    // Preparar dados para o PagSeguro
    const paymentRequest: PagSeguroPaymentRequest = {
      reference,
      customer: customerData,
      items: [{
        id: planId,
        description: `Assinatura ${plan.name} - ${plan.durationDays} dias`,
        amount: plan.pricePix, // Usar preço PIX para boleto
        quantity: 1,
      }],
      paymentMethod: { type: 'BOLETO' },
      notificationURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/pagseguro`,
    };

    // Criar pagamento no PagSeguro
    const pagseguroClient = getPagSeguroClient();
    const paymentResponse = await pagseguroClient.createBoletoPayment(paymentRequest);

    if (paymentResponse.success && paymentResponse.transactionId) {
      // Salvar transação no Firestore
      const transaction: Omit<PaymentTransaction, 'id'> = {
        userId,
        planId,
        planName: plan.name,
        amount: plan.pricePix,
        paymentMethod: 'BOLETO',
        status: 'pending',
        pagseguroCode: paymentResponse.transactionId,
        pagseguroStatus: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 dias
        paymentUrl: paymentResponse.paymentUrl,
      };

      const transactionRef = await safeAddDoc('payment_transactions', transaction);

      // Criar notificação
      await createNotification(userId, 'payment_created', {
        planName: plan.name,
        amount: plan.pricePix,
        paymentMethod: 'BOLETO',
        transactionId: transactionRef.id,
      });

      return {
        ...paymentResponse,
        transactionId: transactionRef.id,
      };
    }

    return paymentResponse;
  } catch (error: any) {
    console.error('Erro ao criar boleto:', error);
    return {
      success: false,
      error: {
        code: 'PAYMENT_CREATION_ERROR',
        message: error.message || 'Erro ao criar boleto',
      },
    };
  }
}

/**
 * Processa webhook do PagSeguro
 */
export async function processPagSeguroWebhook(notificationCode: string): Promise<void> {
  try {
    const pagseguroClient = getPagSeguroClient();
    const transaction = await pagseguroClient.processWebhook(notificationCode);

    // Buscar transação no Firestore
    const transactionsSnapshot = await safeQueryDocs(
      'payment_transactions',
      'pagseguroCode',
      '==',
      transaction.code
    );

    if (transactionsSnapshot.empty) {
      console.error('Transação não encontrada:', transaction.code);
      return;
    }

    const transactionDoc = transactionsSnapshot.docs[0];
    const transactionData = transactionDoc.data() as PaymentTransaction;

    // Atualizar status da transação
    const updateData: Partial<PaymentTransaction> = {
      pagseguroStatus: transaction.status,
      updatedAt: new Date(),
    };

    // Mapear status do PagSeguro para status interno
    switch (transaction.status) {
      case 3: // Paga
        updateData.status = 'paid';
        updateData.paidAt = new Date();
        break;
      case 7: // Cancelada
        updateData.status = 'cancelled';
        break;
      case 6: // Devolvida
        updateData.status = 'refunded';
        break;
      case 5: // Em disputa
        updateData.status = 'failed';
        break;
    }

    await safeUpdateDoc('payment_transactions', transactionDoc.id, updateData);

    // Se o pagamento foi confirmado, ativar o plano
    if (transaction.status === 3) {
      await activateUserPlan(
        transactionData.userId,
        transactionData.planId,
        transactionData.planName,
        transactionDoc.id
      );
    }

    // Criar notificação para o usuário
    await createNotification(transactionData.userId, 'payment_status_updated', {
      status: updateData.status,
      planName: transactionData.planName,
      amount: transactionData.amount,
    });

  } catch (error: any) {
    console.error('Erro ao processar webhook:', error);
    throw error;
  }
}

/**
 * Ativa o plano do usuário após pagamento confirmado
 */
async function activateUserPlan(
  userId: string,
  planId: string,
  planName: string,
  transactionId: string
): Promise<void> {
  try {
    // Atribuir plano ao usuário
    await assignPlanToUser(userId, planId, planName);

    // Buscar dados do plano para calcular datas
    const plan = await getPlanById(planId);
    if (!plan) {
      throw new Error('Plano não encontrado');
    }

    // Calcular datas da assinatura
    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);
    const renewalDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 1 dia antes

    // Criar ou atualizar assinatura
    const subscription: Omit<Subscription, 'id'> = {
      userId,
      planId,
      planName,
      status: 'active',
      startDate,
      endDate,
      renewalDate,
      autoRenew: true,
      paymentMethod: 'PIX', // Será atualizado com o método real
      lastPaymentId: transactionId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Verificar se já existe uma assinatura ativa
    const existingSubscriptions = await safeQueryDocs(
      'subscriptions',
      'userId',
      '==',
      userId
    );

    if (!existingSubscriptions.empty) {
      // Atualizar assinatura existente
      const existingSub = existingSubscriptions.docs[0];
      await safeUpdateDoc('subscriptions', existingSub.id, {
        ...subscription,
        id: existingSub.id,
      });
    } else {
      // Criar nova assinatura
      await safeAddDoc('subscriptions', subscription);
    }

    // Criar notificação de plano ativado
    await createNotification(userId, 'plan_activated', {
      planName,
      endDate: endDate.toLocaleDateString('pt-BR'),
    });

  } catch (error: any) {
    console.error('Erro ao ativar plano:', error);
    throw error;
  }
}

/**
 * Busca transações de pagamento de um usuário
 */
export async function getUserPaymentTransactions(userId: string): Promise<PaymentTransaction[]> {
  try {
    validateRequiredField(userId, 'ID do usuário');

    const transactionsSnapshot = await safeQueryDocs(
      'payment_transactions',
      'userId',
      '==',
      userId
    );

    return transactionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as PaymentTransaction[];
  } catch (error: any) {
    handleFirestoreError(error, 'buscar transações de pagamento');
  }
}

/**
 * Busca assinatura ativa de um usuário
 */
export async function getUserActiveSubscription(userId: string): Promise<Subscription | null> {
  try {
    validateRequiredField(userId, 'ID do usuário');

    const subscriptionsSnapshot = await safeQueryDocs(
      'subscriptions',
      'userId',
      '==',
      userId
    );

    if (subscriptionsSnapshot.empty) {
      return null;
    }

    // Retornar a assinatura mais recente
    const latestSubscription = subscriptionsSnapshot.docs.reduce((latest, current) => {
      const latestData = latest.data() as Subscription;
      const currentData = current.data() as Subscription;
      return currentData.createdAt > latestData.createdAt ? current : latest;
    });

    return {
      id: latestSubscription.id,
      ...latestSubscription.data(),
    } as Subscription;
  } catch (error: any) {
    handleFirestoreError(error, 'buscar assinatura ativa');
  }
}

/**
 * Cancela uma assinatura
 */
export async function cancelSubscription(userId: string, subscriptionId: string): Promise<void> {
  try {
    validateRequiredFields({ userId, subscriptionId });

    // Buscar assinatura
    const subscriptionDoc = await safeGetDoc('subscriptions', subscriptionId);
    if (!subscriptionDoc) {
      throw new Error('Assinatura não encontrada');
    }

    const subscription = subscriptionDoc as Subscription;
    if (subscription.userId !== userId) {
      throw new Error('Usuário não autorizado');
    }

    // Atualizar status da assinatura
    await safeUpdateDoc('subscriptions', subscriptionId, {
      status: 'cancelled',
      autoRenew: false,
      updatedAt: new Date(),
    });

    // Criar notificação
    await createNotification(userId, 'subscription_cancelled', {
      planName: subscription.planName,
    });

  } catch (error: any) {
    handleFirestoreError(error, 'cancelar assinatura');
  }
}

/**
 * Busca plano por ID
 */
async function getPlanById(planId: string): Promise<Plan | null> {
  try {
    const plans = await getPlans();
    return plans.find(plan => plan.id === planId) || null;
  } catch (error) {
    console.error('Erro ao buscar plano:', error);
    return null;
  }
}

/**
 * Validação de campo obrigatório
 */
function validateRequiredField(value: any, fieldName: string): void {
  if (!value) {
    throw new Error(`${fieldName} é obrigatório`);
  }
}
