// Error handling utilities for better error management

export type ErrorContext = {
  action: string;
  userId?: string;
  data?: any;
  timestamp: Date;
};

export type ErrorResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
  context?: ErrorContext;
};

/**
 * Handles Firestore errors with better error messages and context
 */
export function handleFirestoreError(
  error: unknown, 
  context: string, 
  allowRecovery: boolean = false
): never | ErrorResult<never> {
  console.error(`Error in ${context}:`, error);
  
  let errorMessage = 'Erro desconhecido';
  let isRecoverable = false;
  
  if (error instanceof Error) {
    errorMessage = error.message;
    
    // Check if error is recoverable
    if (error.message.includes('permission-denied')) {
      errorMessage = 'Acesso negado. Verifique suas permissões.';
      isRecoverable = true;
    } else if (error.message.includes('not-found')) {
      errorMessage = 'Recurso não encontrado.';
      isRecoverable = true;
    } else if (error.message.includes('already-exists')) {
      errorMessage = 'Recurso já existe.';
      isRecoverable = true;
    } else if (error.message.includes('unavailable')) {
      errorMessage = 'Serviço temporariamente indisponível. Tente novamente.';
      isRecoverable = true;
    } else if (error.message.includes('deadline-exceeded')) {
      errorMessage = 'Operação expirou. Tente novamente.';
      isRecoverable = true;
    } else if (error.message.includes('resource-exhausted')) {
      errorMessage = 'Limite de recursos excedido. Tente novamente mais tarde.';
      isRecoverable = true;
    }
  } else if (typeof error === 'object' && error !== null && 'code' in error) {
    errorMessage = String(error.code);
  }
  
  const errorContext: ErrorContext = {
    action: context,
    timestamp: new Date(),
  };
  
  if (allowRecovery && isRecoverable) {
    return {
      success: false,
      error: `Falha em ${context}: ${errorMessage}`,
      context: errorContext,
    };
  }
  
  throw new Error(`Falha em ${context}: ${errorMessage}`);
}

/**
 * Validates if a single field is not empty
 */
export function validateRequiredField(value: any, fieldName: string): void {
  if (value === null || value === undefined) {
    throw new Error(`${fieldName} é obrigatório.`);
  }
  
  if (typeof value === 'string' && value.trim().length === 0) {
    throw new Error(`${fieldName} não pode estar vazio.`);
  }
  
  if (Array.isArray(value) && value.length === 0) {
    throw new Error(`${fieldName} deve conter pelo menos um item.`);
  }
  
  if (typeof value === 'object' && Object.keys(value).length === 0) {
    throw new Error(`${fieldName} não pode estar vazio.`);
  }
}

/**
 * Validates multiple required fields at once
 */
export function validateRequiredFields(fields: Record<string, any>): void {
  const errors: string[] = [];
  
  Object.entries(fields).forEach(([name, value]) => {
    try {
      validateRequiredField(value, name);
    } catch (error) {
      if (error instanceof Error) {
        errors.push(error.message);
      }
    }
  });
  
  if (errors.length > 0) {
    throw new Error(`Campos obrigatórios não preenchidos: ${errors.join(', ')}`);
  }
}

/**
 * Validates if a field has a specific type
 */
export function validateFieldType(value: any, fieldName: string, expectedType: string): void {
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  
  if (actualType !== expectedType) {
    throw new Error(`${fieldName} deve ser do tipo ${expectedType}, recebido ${actualType}.`);
  }
}

/**
 * Validates if a field is within a specific range
 */
export function validateFieldRange(
  value: number, 
  fieldName: string, 
  min: number, 
  max: number
): void {
  if (typeof value !== 'number') {
    throw new Error(`${fieldName} deve ser um número.`);
  }
  
  if (value < min || value > max) {
    throw new Error(`${fieldName} deve estar entre ${min} e ${max}.`);
  }
}

/**
 * Validates if a field has a specific length
 */
export function validateFieldLength(
  value: string | any[], 
  fieldName: string, 
  minLength: number, 
  maxLength?: number
): void {
  if (!value) {
    throw new Error(`${fieldName} é obrigatório.`);
  }
  
  if (value.length < minLength) {
    throw new Error(`${fieldName} deve ter pelo menos ${minLength} caracteres.`);
  }
  
  if (maxLength && value.length > maxLength) {
    throw new Error(`${fieldName} deve ter no máximo ${maxLength} caracteres.`);
  }
}

/**
 * Creates a standardized error result
 */
export function createErrorResult<T>(
  error: string, 
  context?: Partial<ErrorContext>
): ErrorResult<T> {
  return {
    success: false,
    error,
    context: {
      action: context?.action || 'unknown',
      userId: context?.userId,
      data: context?.data,
      timestamp: context?.timestamp || new Date(),
    },
  };
}

/**
 * Creates a standardized success result
 */
export function createSuccessResult<T>(data: T): ErrorResult<T> {
  return {
    success: true,
    data,
  };
}

/**
 * Wraps an async function with error handling
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: string,
  allowRecovery: boolean = false
): Promise<ErrorResult<T>> {
  try {
    const result = await fn();
    return createSuccessResult(result);
  } catch (error) {
    if (allowRecovery) {
      return handleFirestoreError(error, context, true) as ErrorResult<T>;
    }
    
    throw error;
  }
}

/**
 * Retries an operation with exponential backoff
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt === maxRetries) {
        throw lastError;
      }
      
      // Exponential backoff
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError!;
}

/**
 * Logs errors for monitoring and debugging
 */
export function logError(error: Error, context: ErrorContext): void {
  // In production, you would send this to a logging service
  console.error('Error logged:', {
    message: error.message,
    stack: error.stack,
    context,
  });
}

/**
 * Handles validation errors specifically
 */
export function handleValidationError(
  errors: string[], 
  context: string
): never {
  const errorMessage = `Erro de validação em ${context}: ${errors.join(', ')}`;
  throw new Error(errorMessage);
}

/**
 * Checks if an error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return message.includes('permission-denied') ||
           message.includes('not-found') ||
           message.includes('already-exists') ||
           message.includes('unavailable') ||
           message.includes('deadline-exceeded') ||
           message.includes('resource-exhausted');
  }
  return false;
}
