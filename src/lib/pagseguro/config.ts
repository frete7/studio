export const PAGSEGURO_CONFIG = {
  // URLs da API
  SANDBOX: {
    API_URL: 'https://ws.sandbox.pagseguro.uol.com.br',
    PAYMENT_URL: 'https://sandbox.pagseguro.uol.com.br',
    NOTIFICATION_URL: 'https://ws.sandbox.pagseguro.uol.com.br/v3/transactions/notifications',
  },
  PRODUCTION: {
    API_URL: 'https://ws.pagseguro.uol.com.br',
    PAYMENT_URL: 'https://pagseguro.uol.com.br',
    NOTIFICATION_URL: 'https://ws.pagseguro.uol.com.br/v3/transactions/notifications',
  },
  
  // Configurações padrão
  DEFAULT_CURRENCY: 'BRL',
  DEFAULT_LANGUAGE: 'pt_BR',
  
  // Timeouts
  REQUEST_TIMEOUT: 30000, // 30 segundos
  
  // Configurações de retry
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 segundo
};

export type PagSeguroEnvironment = 'sandbox' | 'production';

export interface PagSeguroCredentials {
  email: string;
  token: string;
  appId?: string;
  appKey?: string;
}

export interface PagSeguroPaymentMethod {
  type: 'PIX' | 'CREDITCARD' | 'BOLETO';
  installments?: number;
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
}

export interface PagSeguroCustomer {
  name: string;
  email: string;
  cpf?: string;
  cnpj?: string;
  phone?: {
    areaCode: string;
    number: string;
  };
  address?: {
    street: string;
    number: string;
    complement?: string;
    district: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
  };
}

export interface PagSeguroItem {
  id: string;
  description: string;
  amount: number; // Em centavos
  quantity: number;
  weight?: number;
}

export interface PagSeguroPaymentRequest {
  reference: string; // ID único do pedido
  customer: PagSeguroCustomer;
  items: PagSeguroItem[];
  paymentMethod: PagSeguroPaymentMethod;
  notificationURL?: string;
  extraAmount?: number; // Taxas adicionais
  shipping?: {
    type: number;
    cost: number;
    address: PagSeguroCustomer['address'];
  };
}

export interface PagSeguroPaymentResponse {
  success: boolean;
  code?: string;
  message?: string;
  transactionId?: string;
  paymentUrl?: string;
  qrCode?: string;
  qrCodeText?: string;
  status?: string;
  error?: {
    code: string;
    message: string;
  };
}

export interface PagSeguroWebhookData {
  notificationCode: string;
  notificationType: string;
}

export interface PagSeguroTransaction {
  code: string;
  reference: string;
  status: number;
  statusText: string;
  paymentMethod: {
    type: number;
    code: number;
  };
  grossAmount: string;
  discountAmount: string;
  feeAmount: string;
  netAmount: string;
  extraAmount: string;
  installmentCount: number;
  itemCount: number;
  items: Array<{
    id: string;
    description: string;
    amount: string;
    quantity: number;
  }>;
  sender: {
    name: string;
    email: string;
    phone: {
      areaCode: string;
      number: string;
    };
  };
  date: string;
  lastEventDate: string;
  paymentLink?: string;
  grossAmountFormatted?: string;
  netAmountFormatted?: string;
}
