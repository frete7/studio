# Actions Organizadas - Frete7

## 📁 Estrutura de Arquivos

```
src/lib/actions/
├── index.ts                    # Exporta todas as actions
├── user-actions.ts            # Usuários, perfis, status
├── freight-actions.ts         # Fretes e rotas
├── vehicle-actions.ts         # Veículos, tipos, categorias
├── company-actions.ts         # Empresas, colaboradores, estatísticas
├── driver-actions.ts          # Motoristas, viagens de retorno
├── notification-actions.ts    # Notificações e configurações
├── support-actions.ts         # Chat, sugestões, denúncias
└── utils/                     # Utilitários compartilhados
    ├── error-handling.ts      # Tratamento de erros
    ├── firestore-helpers.ts   # Helpers do Firestore
    ├── validation.ts          # Validações
    └── type-helpers.ts        # Helpers de tipos
```

## 🚀 Benefícios da Nova Estrutura

### **1. Organização por Domínio**
- Cada arquivo tem responsabilidades específicas
- Fácil localização de funcionalidades
- Melhor manutenibilidade

### **2. Reutilização de Código**
- Utilitários compartilhados
- Validações padronizadas
- Tratamento de erros consistente

### **3. Facilidade de Manutenção**
- Arquivos menores e focados
- Menos duplicação de código
- Testes mais específicos

### **4. Escalabilidade**
- Fácil adição de novas funcionalidades
- Separação clara de responsabilidades
- Importações organizadas

## 📝 Como Usar

### **Importação Simples**
```typescript
import { 
    updateUserStatus, 
    addAggregationFreight,
    validateCPF 
} from '@/lib/actions';
```

### **Importação Específica**
```typescript
import { updateUserStatus } from '@/lib/actions/user-actions';
import { validateCPF } from '@/lib/actions/utils/validation';
```

## 🔧 Utilitários Disponíveis

### **Error Handling**
- `handleFirestoreError()` - Tratamento padronizado de erros
- `validateRequiredField()` - Validação de campos obrigatórios
- `validateRequiredFields()` - Validação múltipla

### **Firestore Helpers**
- `safeGetDoc()` - Busca segura de documentos
- `safeUpdateDoc()` - Atualização segura
- `safeAddDoc()` - Adição segura
- `safeQueryDocs()` - Consulta segura
- `executeTransaction()` - Execução de transações

### **Validation**
- `validateCPF()` - Validação de CPF
- `validateEmail()` - Validação de email
- `validatePhone()` - Validação de telefone
- `validateCNPJ()` - Validação de CNPJ
- `sanitizeString()` - Limpeza de strings

### **Type Helpers**
- `convertTimestampToISO()` - Conversão de timestamps
- `generateUniqueId()` - Geração de IDs únicos
- `convertFirestoreDoc()` - Conversão de documentos

## 📊 Comparação: Antes vs Depois

### **Antes (actions.ts)**
- ❌ 1 arquivo com 1200+ linhas
- ❌ Mistura de responsabilidades
- ❌ Código duplicado
- ❌ Difícil manutenção
- ❌ Importações confusas

### **Depois (Estrutura Organizada)**
- ✅ Múltiplos arquivos focados
- ✅ Responsabilidades separadas
- ✅ Código reutilizável
- ✅ Fácil manutenção
- ✅ Importações claras

## 🎯 Próximos Passos

1. **Migrar actions restantes** para módulos específicos
2. **Adicionar testes unitários** para cada módulo
3. **Implementar cache** para operações frequentes
4. **Adicionar logging** estruturado
5. **Criar documentação** de API para cada módulo

## 🔄 Migração

Para migrar o arquivo `actions.ts` existente:

1. **Identificar domínios** de cada função
2. **Mover para módulos apropriados**
3. **Refatorar usando utilitários**
4. **Atualizar importações**
5. **Testar funcionalidades**
6. **Remover arquivo antigo**

## 📚 Exemplos de Uso

### **Criar Fretes**
```typescript
import { addAggregationFreight } from '@/lib/actions';

const freightIds = await addAggregationFreight(companyId, companyName, freightData);
```

### **Atualizar Usuário**
```typescript
import { updateUserStatus } from '@/lib/actions';

await updateUserStatus(userId, 'active');
```

### **Validar CPF**
```typescript
import { validateCPF } from '@/lib/actions';

if (!validateCPF(cpf)) {
    throw new Error('CPF inválido');
}
```
