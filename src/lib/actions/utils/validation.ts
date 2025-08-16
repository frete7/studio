// Validation utilities for data validation

/**
 * Validates if a value is not empty (null, undefined, empty string, or empty array)
 */
export function isNotEmpty(value: any): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

/**
 * Validates if a value is a valid email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates if a value is a valid CPF format
 */
export function validateCPF(cpf: string): boolean {
  if (!cpf || typeof cpf !== 'string') return false;
  
  // Remove non-numeric characters
  const cleanCPF = cpf.replace(/\D/g, '');
  
  // Check if it has 11 digits
  if (cleanCPF.length !== 11) return false;
  
  // Check if all digits are the same (invalid CPF)
  if (/^(\d)\1{10}$/.test(cleanCPF)) return false;
  
  // Validate CPF algorithm
  let sum = 0;
  let remainder;
  
  for (let i = 1; i <= 9; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(9, 10))) return false;
  
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum = sum + parseInt(cleanCPF.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleanCPF.substring(10, 11))) return false;
  
  return true;
}

/**
 * Validates if a value is a valid CNPJ format
 */
export function validateCNPJ(cnpj: string): boolean {
  if (!cnpj || typeof cnpj !== 'string') return false;
  
  // Remove non-numeric characters
  const cleanCNPJ = cnpj.replace(/\D/g, '');
  
  // Check if it has 14 digits
  if (cleanCNPJ.length !== 14) return false;
  
  // Check if all digits are the same (invalid CNPJ)
  if (/^(\d)\1{13}$/.test(cleanCNPJ)) return false;
  
  // Validate CNPJ algorithm
  let size = cleanCNPJ.length - 2;
  let numbers = cleanCNPJ.substring(0, size);
  const digits = cleanCNPJ.substring(size);
  let sum = 0;
  let pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  size = size + 1;
  numbers = cleanCNPJ.substring(0, size);
  sum = 0;
  pos = size - 7;
  
  for (let i = size; i >= 1; i--) {
    sum += parseInt(numbers.charAt(size - i)) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

/**
 * Validates if a value is a valid phone number format
 */
export function validatePhone(phone: string): boolean {
  if (!phone || typeof phone !== 'string') return false;
  
  // Remove non-numeric characters
  const cleanPhone = phone.replace(/\D/g, '');
  
  // Brazilian phone numbers have 10 or 11 digits
  return cleanPhone.length >= 10 && cleanPhone.length <= 11;
}

/**
 * Validates if a value is a valid CEP (postal code) format
 */
export function validateCEP(cep: string): boolean {
  if (!cep || typeof cep !== 'string') return false;
  
  // Remove non-numeric characters
  const cleanCEP = cep.replace(/\D/g, '');
  
  // Brazilian CEP has 8 digits
  return cleanCEP.length === 8;
}

/**
 * Validates if a value is a valid CNH (driver's license) format
 */
export function validateCNH(cnh: string): boolean {
  if (!cnh || typeof cnh !== 'string') return false;
  
  // Remove non-numeric characters
  const cleanCNH = cnh.replace(/\D/g, '');
  
  // Brazilian CNH has 11 digits
  return cleanCNH.length === 11;
}

/**
 * Validates if a value is a valid date
 */
export function validateDate(date: any): boolean {
  if (!date) return false;
  
  const dateObj = new Date(date);
  return !isNaN(dateObj.getTime());
}

/**
 * Validates if a value is a valid URL
 */
export function validateURL(url: string): boolean {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validates if a value is within a specific range
 */
export function validateRange(value: number, min: number, max: number): boolean {
  if (typeof value !== 'number') return false;
  return value >= min && value <= max;
}

/**
 * Validates if a value has a minimum length
 */
export function validateMinLength(value: string | any[], minLength: number): boolean {
  if (!value) return false;
  return value.length >= minLength;
}

/**
 * Validates if a value has a maximum length
 */
export function validateMaxLength(value: string | any[], maxLength: number): boolean {
  if (!value) return false;
  return value.length <= maxLength;
}

/**
 * Sanitizes a string by removing dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .substring(0, 1000); // Limit length
}

/**
 * Validates if a value is a valid status
 */
export function validateStatus(status: string): boolean {
  const validStatuses = ['incomplete', 'pending', 'active', 'blocked', 'suspended'];
  return validStatuses.includes(status);
}

/**
 * Validates if a value is a valid role
 */
export function validateRole(role: string): boolean {
  const validRoles = ['driver', 'company', 'admin'];
  return validRoles.includes(role);
}

/**
 * Validates if a value is a valid freight type
 */
export function validateFreightType(type: string): boolean {
  const validTypes = ['comum', 'agregamento', 'frete-completo', 'frete-retorno'];
  return validTypes.includes(type);
}

/**
 * Validates if a value is a valid freight status
 */
export function validateFreightStatus(status: string): boolean {
  const validStatuses = ['active', 'completed', 'pending', 'cancelled'];
  return validStatuses.includes(status);
}

/**
 * Validates if a value is a valid document status
 */
export function validateDocumentStatus(status: string): boolean {
  const validStatuses = ['pending', 'approved', 'rejected'];
  return validStatuses.includes(status);
}

/**
 * Comprehensive validation function for user data
 */
export function validateUserData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data) {
    return { isValid: false, errors: ['Dados não fornecidos'] };
  }
  
  // Validate required fields
  if (!isNotEmpty(data.name)) {
    errors.push('Nome é obrigatório');
  }
  
  if (!validateEmail(data.email)) {
    errors.push('Email inválido');
  }
  
  if (!validateRole(data.role)) {
    errors.push('Tipo de usuário inválido');
  }
  
  if (!validateStatus(data.status)) {
    errors.push('Status inválido');
  }
  
  // Validate role-specific fields
  if (data.role === 'company') {
    if (!isNotEmpty(data.tradingName)) {
      errors.push('Nome fantasia é obrigatório para empresas');
    }
    
    if (!validateCNPJ(data.cnpj)) {
      errors.push('CNPJ inválido');
    }
    
    if (data.responsible && !validateCPF(data.responsible.cpf)) {
      errors.push('CPF do responsável inválido');
    }
  }
  
  if (data.role === 'driver') {
    if (!validateCNH(data.cnh)) {
      errors.push('CNH inválida');
    }
    
    if (!isNotEmpty(data.cnhCategory)) {
      errors.push('Categoria da CNH é obrigatória');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Comprehensive validation function for freight data
 */
export function validateFreightData(data: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!data) {
    return { isValid: false, errors: ['Dados não fornecidos'] };
  }
  
  if (!validateFreightType(data.freightType)) {
    errors.push('Tipo de frete inválido');
  }
  
  if (!isNotEmpty(data.origin)) {
    errors.push('Origem é obrigatória');
  }
  
  if (!isNotEmpty(data.destinations)) {
    errors.push('Destinos são obrigatórios');
  }
  
  if (!isNotEmpty(data.companyId)) {
    errors.push('ID da empresa é obrigatório');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
