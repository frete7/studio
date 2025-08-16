import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { 
  PAGSEGURO_CONFIG, 
  PagSeguroEnvironment, 
  PagSeguroCredentials,
  PagSeguroPaymentRequest,
  PagSeguroPaymentResponse,
  PagSeguroTransaction,
  PagSeguroWebhookData
} from './config';

export class PagSeguroClient {
  private client: AxiosInstance;
  private credentials: PagSeguroCredentials;
  private environment: PagSeguroEnvironment;

  constructor(credentials: PagSeguroCredentials, environment: PagSeguroEnvironment = 'sandbox') {
    this.credentials = credentials;
    this.environment = environment;
    
    const config = environment === 'production' ? PAGSEGURO_CONFIG.PRODUCTION : PAGSEGURO_CONFIG.SANDBOX;
    
    this.client = axios.create({
      baseURL: config.API_URL,
      timeout: PAGSEGURO_CONFIG.REQUEST_TIMEOUT,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
    });

    // Interceptor para adicionar credenciais em todas as requisições
    this.client.interceptors.request.use((config) => {
      if (config.method === 'post' || config.method === 'put') {
        config.data = new URLSearchParams(config.data);
      }
      return config;
    });

    // Interceptor para tratamento de erros
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error) => {
        console.error('PagSeguro API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Cria um pagamento PIX
   */
  async createPixPayment(request: PagSeguroPaymentRequest): Promise<PagSeguroPaymentResponse> {
    try {
      const paymentData = {
        email: this.credentials.email,
        token: this.credentials.token,
        paymentMode: 'default',
        paymentMethod: 'pix',
        receiverEmail: this.credentials.email,
        currency: PAGSEGURO_CONFIG.DEFAULT_CURRENCY,
        reference: request.reference,
        senderName: request.customer.name,
        senderEmail: request.customer.email,
        senderCPF: request.customer.cpf,
        senderCNPJ: request.customer.cnpj,
        senderAreaCode: request.customer.phone?.areaCode,
        senderPhone: request.customer.phone?.number,
        senderAddressStreet: request.customer.address?.street,
        senderAddressNumber: request.customer.address?.number,
        senderAddressComplement: request.customer.address?.complement,
        senderAddressDistrict: request.customer.address?.district,
        senderAddressCity: request.customer.address?.city,
        senderAddressState: request.customer.address?.state,
        senderAddressCountry: request.customer.address?.country,
        senderAddressPostalCode: request.customer.address?.postalCode,
        notificationURL: request.notificationURL,
        extraAmount: request.extraAmount,
        ...this.formatItems(request.items),
      };

      const response = await this.client.post('/v2/checkout', paymentData);
      
      if (response.data && response.data.code) {
        // Buscar detalhes da transação para obter QR Code PIX
        const transactionDetails = await this.getTransactionDetails(response.data.code);
        
        return {
          success: true,
          code: response.data.code,
          transactionId: response.data.code,
          paymentUrl: `${PAGSEGURO_CONFIG[this.environment.toUpperCase()].PAYMENT_URL}/checkout/payment.html?code=${response.data.code}`,
          qrCode: transactionDetails.qrCode,
          qrCodeText: transactionDetails.qrCodeText,
          status: 'pending',
        };
      }

      throw new Error('Falha ao criar pagamento PIX');
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
          message: error.response?.data?.error?.message || error.message || 'Erro desconhecido',
        },
      };
    }
  }

  /**
   * Cria um pagamento com cartão de crédito
   */
  async createCreditCardPayment(request: PagSeguroPaymentRequest): Promise<PagSeguroPaymentResponse> {
    try {
      if (!request.paymentMethod.cardData) {
        throw new Error('Dados do cartão são obrigatórios');
      }

      const paymentData = {
        email: this.credentials.email,
        token: this.credentials.token,
        paymentMode: 'default',
        paymentMethod: 'creditcard',
        receiverEmail: this.credentials.email,
        currency: PAGSEGURO_CONFIG.DEFAULT_CURRENCY,
        reference: request.reference,
        senderName: request.customer.name,
        senderEmail: request.customer.email,
        senderCPF: request.customer.cpf,
        senderCNPJ: request.customer.cnpj,
        senderAreaCode: request.customer.phone?.areaCode,
        senderPhone: request.customer.phone?.number,
        senderAddressStreet: request.customer.address?.street,
        senderAddressNumber: request.customer.address?.number,
        senderAddressComplement: request.customer.address?.complement,
        senderAddressDistrict: request.customer.address?.district,
        senderAddressCity: request.customer.address?.city,
        senderAddressState: request.customer.address?.state,
        senderAddressCountry: request.customer.address?.country,
        senderAddressPostalCode: request.customer.address?.postalCode,
        notificationURL: request.notificationURL,
        extraAmount: request.extraAmount,
        creditCardToken: request.paymentMethod.cardData.number, // Em produção, usar token do cartão
        creditCardHolderName: request.paymentMethod.cardData.holder.name,
        creditCardHolderCPF: request.paymentMethod.cardData.holder.cpf,
        creditCardHolderBirthDate: request.paymentMethod.cardData.holder.birthDate,
        creditCardHolderAreaCode: request.customer.phone?.areaCode,
        creditCardHolderPhone: request.customer.phone?.number,
        creditCardInstallmentQuantity: request.paymentMethod.installments || 1,
        creditCardInstallmentValue: Math.round(request.items.reduce((sum, item) => sum + item.amount, 0) / (request.paymentMethod.installments || 1)),
        ...this.formatItems(request.items),
      };

      const response = await this.client.post('/v2/checkout', paymentData);
      
      if (response.data && response.data.code) {
        return {
          success: true,
          code: response.data.code,
          transactionId: response.data.code,
          paymentUrl: `${PAGSEGURO_CONFIG[this.environment.toUpperCase()].PAYMENT_URL}/checkout/payment.html?code=${response.data.code}`,
          status: 'pending',
        };
      }

      throw new Error('Falha ao criar pagamento com cartão');
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
          message: error.response?.data?.error?.message || error.message || 'Erro desconhecido',
        },
      };
    }
  }

  /**
   * Cria um pagamento com boleto
   */
  async createBoletoPayment(request: PagSeguroPaymentRequest): Promise<PagSeguroPaymentResponse> {
    try {
      const paymentData = {
        email: this.credentials.email,
        token: this.credentials.token,
        paymentMode: 'default',
        paymentMethod: 'boleto',
        receiverEmail: this.credentials.email,
        currency: PAGSEGURO_CONFIG.DEFAULT_CURRENCY,
        reference: request.reference,
        senderName: request.customer.name,
        senderEmail: request.customer.email,
        senderCPF: request.customer.cpf,
        senderCNPJ: request.customer.cnpj,
        senderAreaCode: request.customer.phone?.areaCode,
        senderPhone: request.customer.phone?.number,
        senderAddressStreet: request.customer.address?.street,
        senderAddressNumber: request.customer.address?.number,
        senderAddressComplement: request.customer.address?.complement,
        senderAddressDistrict: request.customer.address?.district,
        senderAddressCity: request.customer.address?.city,
        senderAddressState: request.customer.address?.state,
        senderAddressCountry: request.customer.address?.country,
        senderAddressPostalCode: request.customer.address?.postalCode,
        notificationURL: request.notificationURL,
        extraAmount: request.extraAmount,
        ...this.formatItems(request.items),
      };

      const response = await this.client.post('/v2/checkout', paymentData);
      
      if (response.data && response.data.code) {
        return {
          success: true,
          code: response.data.code,
          transactionId: response.data.code,
          paymentUrl: `${PAGSEGURO_CONFIG[this.environment.toUpperCase()].PAYMENT_URL}/checkout/payment.html?code=${response.data.code}`,
          status: 'pending',
        };
      }

      throw new Error('Falha ao criar boleto');
    } catch (error: any) {
      return {
        success: false,
        error: {
          code: error.response?.data?.error?.code || 'UNKNOWN_ERROR',
          message: error.response?.data?.error?.message || error.message || 'Erro desconhecido',
        },
      };
    }
  }

  /**
   * Obtém detalhes de uma transação
   */
  async getTransactionDetails(transactionCode: string): Promise<PagSeguroTransaction> {
    try {
      const response = await this.client.get(`/v3/transactions/${transactionCode}?email=${this.credentials.email}&token=${this.credentials.token}`);
      
      const transaction = response.data;
      
      return {
        code: transaction.code,
        reference: transaction.reference,
        status: transaction.status,
        statusText: this.getStatusText(transaction.status),
        paymentMethod: {
          type: transaction.paymentMethod.type,
          code: transaction.paymentMethod.code,
        },
        grossAmount: transaction.grossAmount,
        discountAmount: transaction.discountAmount,
        feeAmount: transaction.feeAmount,
        netAmount: transaction.netAmount,
        extraAmount: transaction.extraAmount,
        installmentCount: transaction.installmentCount,
        itemCount: transaction.itemCount,
        items: transaction.items,
        sender: transaction.sender,
        date: transaction.date,
        lastEventDate: transaction.lastEventDate,
        paymentLink: transaction.paymentLink,
        grossAmountFormatted: this.formatCurrency(parseFloat(transaction.grossAmount)),
        netAmountFormatted: this.formatCurrency(parseFloat(transaction.netAmount)),
        qrCode: transaction.qrCode,
        qrCodeText: transaction.qrCodeText,
      };
    } catch (error: any) {
      throw new Error(`Falha ao obter detalhes da transação: ${error.message}`);
    }
  }

  /**
   * Processa notificação de webhook
   */
  async processWebhook(notificationCode: string): Promise<PagSeguroTransaction> {
    try {
      const response = await this.client.get(`/v3/transactions/notifications/${notificationCode}?email=${this.credentials.email}&token=${this.credentials.token}`);
      
      if (response.data && response.data.transaction) {
        return this.getTransactionDetails(response.data.transaction.code);
      }

      throw new Error('Formato de notificação inválido');
    } catch (error: any) {
      throw new Error(`Falha ao processar webhook: ${error.message}`);
    }
  }

  /**
   * Cancela uma transação
   */
  async cancelTransaction(transactionCode: string): Promise<boolean> {
    try {
      const response = await this.client.put(`/v3/transactions/${transactionCode}/cancel`, {
        email: this.credentials.email,
        token: this.credentials.token,
      });
      
      return response.status === 200;
    } catch (error: any) {
      console.error('Erro ao cancelar transação:', error);
      return false;
    }
  }

  /**
   * Formata itens para a API do PagSeguro
   */
  private formatItems(items: any[]): Record<string, any> {
    const formatted: Record<string, any> = {};
    
    items.forEach((item, index) => {
      const prefix = `item${index + 1}`;
      formatted[`${prefix}Id`] = item.id;
      formatted[`${prefix}Description`] = item.description;
      formatted[`${prefix}Amount`] = Math.round(item.amount * 100); // Converter para centavos
      formatted[`${prefix}Quantity`] = item.quantity;
      if (item.weight) {
        formatted[`${prefix}Weight`] = item.weight;
      }
    });
    
    formatted.itemCount = items.length;
    
    return formatted;
  }

  /**
   * Converte código de status para texto
   */
  private getStatusText(status: number): string {
    const statusMap: Record<number, string> = {
      1: 'Aguardando pagamento',
      2: 'Em análise',
      3: 'Paga',
      4: 'Disponível',
      5: 'Em disputa',
      6: 'Devolvida',
      7: 'Cancelada',
    };
    
    return statusMap[status] || 'Status desconhecido';
  }

  /**
   * Formata valor monetário
   */
  private formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value / 100); // Converter de centavos para reais
  }

  /**
   * Obtém configuração atual
   */
  getConfig() {
    return PAGSEGURO_CONFIG[this.environment.toUpperCase()];
  }

  /**
   * Altera ambiente (sandbox/production)
   */
  setEnvironment(environment: PagSeguroEnvironment) {
    this.environment = environment;
    const config = environment === 'production' ? PAGSEGURO_CONFIG.PRODUCTION : PAGSEGURO_CONFIG.SANDBOX;
    this.client.defaults.baseURL = config.API_URL;
  }
}
