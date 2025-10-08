# 🚀 Drizzle Schema Generator - Advanced Features

## 📖 Funcionalidades Avançadas

### 🔄 Schema Reader (Engenharia Reversa)

O **SchemaReader** permite ler esquemas Drizzle existentes e convertê-los de volta para formato JSON, possibilitando:

- ✅ Análise de projetos existentes
- ✅ Migração entre ambientes
- ✅ Backup e versionamento de schemas
- ✅ Integração com APIs e ferramentas externas

#### Exemplo de Uso:

```typescript
import { SchemaReader } from "@malldre/drizzle-schema-generator";

const reader = new SchemaReader("./path/to/drizzle/project");
const result = await reader.readSchema();

if (result.success) {
	console.log("Schema lido:", result.schema);
	console.log("Arquivos encontrados:", result.files);
} else {
	console.error("Erro:", result.message);
}
```

#### Funcionalidade de Conveniência:

```typescript
import { readSchema } from "@malldre/drizzle-schema-generator";

const schema = await readSchema("./path/to/project");
```

### 🔍 Schema Change Detector (Detecção Inteligente de Mudanças)

O **SchemaChangeDetector** analisa diferenças entre schemas e classifica mudanças por impacto:

#### 🟢 Mudanças Seguras (Safe)

- Adição de enums
- Adição de valores a enums existentes
- Adição de colunas opcionais
- Adição de tabelas
- Adição de helpers
- Mudanças em valores padrão

#### 🟡 Mudanças com Aviso (Warning)

- Adição de colunas NOT NULL
- Remoção de helpers
- Mudanças de NOT NULL constraints

#### 🔴 Mudanças Quebradoras (Breaking)

- Remoção de enums
- Remoção de valores de enums
- Remoção de tabelas
- Remoção de colunas
- Mudanças de tipos de colunas
- Mudanças de chaves primárias

#### Exemplo de Uso:

```typescript
import { SchemaChangeDetector } from "@malldre/drizzle-schema-generator";

const detector = new SchemaChangeDetector();

// Comparar schemas
const comparison = await detector.compareSchemas(currentSchema, newSchema);

console.log(`Total de mudanças: ${comparison.summary.totalChanges}`);
console.log(`Seguras: ${comparison.summary.byImpact.safe}`);
console.log(`Com avisos: ${comparison.summary.byImpact.warning}`);
console.log(`Quebradoras: ${comparison.summary.byImpact.breaking}`);

// Ver recomendações
comparison.recommendations.forEach((rec) => console.log(rec));

// Aplicar apenas mudanças seguras
const result = await detector.applySafeChanges("./project/path", comparison, {
	allowWarning: false,
	dryRun: true,
});

console.log(`${result.applied.length} mudanças aplicadas`);
console.log(`${result.rejected.length} mudanças rejeitadas`);
```

### 📊 Tipos de Mudanças Detectadas

#### Enums:

- `enum_added` - Enum adicionado
- `enum_removed` - Enum removido
- `enum_value_added` - Valor adicionado ao enum
- `enum_value_removed` - Valor removido do enum

#### Helpers:

- `helper_added` - Helper adicionado
- `helper_removed` - Helper removido
- `helper_column_added` - Coluna adicionada ao helper
- `helper_column_removed` - Coluna removida do helper

#### Tables:

- `table_added` - Tabela adicionada
- `table_removed` - Tabela removida
- `table_column_added` - Coluna adicionada à tabela
- `table_column_removed` - Coluna removida da tabela
- `table_helper_reference_added` - Referência de helper adicionada
- `table_helper_reference_removed` - Referência de helper removida
- `table_composite_primary_key_changed` - Chave primária composta alterada

#### Colunas:

- `column_type_changed` - Tipo da coluna alterado
- `column_primary_key_changed` - Status de chave primária alterado
- `column_not_null_changed` - Constraint NOT NULL alterada
- `column_default_changed` - Valor padrão alterado
- `column_references_changed` - Referências alteradas

### 🛡️ Aplicação Seletiva de Mudanças

```typescript
// Aplicar apenas mudanças seguras
const safeResult = await detector.applySafeChanges(projectPath, comparison);

// Aplicar mudanças seguras e com avisos
const warningResult = await detector.applySafeChanges(projectPath, comparison, {
	allowWarning: true,
});

// Aplicar todas as mudanças (incluindo quebradoras)
const allResult = await detector.applySafeChanges(projectPath, comparison, {
	allowWarning: true,
	allowBreaking: true,
});

// Modo dry-run (simulação)
const dryRunResult = await detector.applySafeChanges(projectPath, comparison, {
	dryRun: true,
});
```

### 📈 Casos de Uso Práticos

#### 1. Pipeline de CI/CD

```typescript
// Verificar se as mudanças são seguras para deploy automático
const comparison = await detector.compareSchemas(prodSchema, newSchema);

if (comparison.summary.byImpact.breaking > 0) {
	throw new Error("Mudanças quebradoras detectadas - revisão manual necessária");
}

if (comparison.summary.byImpact.warning > 0) {
	console.warn("Mudanças com avisos detectadas - revisar antes do deploy");
}

// Deploy automático apenas com mudanças seguras
await detector.applySafeChanges(deployPath, comparison);
```

#### 2. Migração de Ambiente

```typescript
// Ler schema de produção
const prodSchema = await readSchema("./prod-schema");

// Ler schema de desenvolvimento
const devSchema = await readSchema("./dev-schema");

// Detectar diferenças
const changes = await detector.compareSchemas(prodSchema, devSchema);

// Gerar relatório de migração
console.log("Relatório de Migração:");
changes.recommendations.forEach((rec) => console.log(rec));
```

#### 3. Backup e Versionamento

```typescript
// Backup do schema atual
const currentSchema = await readSchema("./current-project");

// Salvar como JSON para versionamento
await fs.writeFile(`./backups/schema-${new Date().toISOString()}.json`, JSON.stringify(currentSchema.schema, null, 2));
```

### 🔧 Configurações Avançadas

#### Opções do SchemaChangeDetector

```typescript
interface ApplyOptions {
	allowBreaking?: boolean; // Permitir mudanças quebradoras
	allowWarning?: boolean; // Permitir mudanças com avisos
	dryRun?: boolean; // Modo simulação
}
```

#### Resultado da Comparação

```typescript
interface SchemaComparison {
	changes: SchemaChange[];
	summary: {
		totalChanges: number;
		byCategory: Record<SchemaChangeCategory, number>;
		byImpact: Record<SchemaChangeImpact, number>;
		byType: Record<string, number>;
	};
	recommendations: string[];
	canApply: {
		safe: boolean;
		withWarnings: boolean;
		withBreaking: boolean;
	};
}
```

### 🎯 Demonstração Completa

Execute o arquivo de demonstração para ver todas as funcionalidades em ação:

```bash
npx tsx demo-schema-features.ts
```

Esta demonstração criará schemas de exemplo, detectará mudanças e mostrará como aplicar mudanças seletivamente.

### 🧪 Testes

As novas funcionalidades incluem testes abrangentes:

```bash
# Executar testes do SchemaReader
npx vitest run tests/SchemaReader.test.ts

# Executar testes do SchemaChangeDetector
npx vitest run tests/SchemaChangeDetector.test.ts

# Executar todos os testes
npm test
```

**Total de testes:** 115 ✅

- SchemaReader: 8 testes
- SchemaChangeDetector: 16 testes
- Funcionalidades existentes: 91 testes

### 📋 Próximos Passos

As funcionalidades implementadas fornecem uma base sólida para:

1. **Ferramentas de DevOps**: Integração em pipelines de CI/CD
2. **Gestão de Migração**: Análise automática de impacto de mudanças
3. **Documentação Automática**: Geração de relatórios de mudanças
4. **Validação de Schema**: Verificação de compatibilidade entre ambientes
5. **Backup e Recuperação**: Versionamento de schemas em JSON

### 🤝 Contribuição

Para contribuir com melhorias nas funcionalidades avançadas:

1. Faça fork do repositório
2. Crie uma branch para sua feature
3. Adicione testes para novas funcionalidades
4. Execute `npm test` para validar
5. Submeta um Pull Request

---

**🎉 Com essas funcionalidades, o Drizzle Schema Generator agora oferece capacidades completas de engenharia reversa e detecção inteligente de mudanças, tornando-se uma ferramenta poderosa para gestão de schemas de banco de dados!**
