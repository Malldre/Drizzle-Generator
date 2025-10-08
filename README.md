# Drizzle Schema Generator

A powerful TypeScript library for generating Drizzle ORM schema code from type definitions with bidirectional support and intelligent change management.

[![npm version](https://badge.fury.io/js/drizzle-schema-generator.svg)](https://www.npmjs.com/package/drizzle-schema-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **Type-safe**: Full TypeScript support with type definitions
- **Flexible**: Support for PostgreSQL, MySQL, and SQLite
- **Comprehensive**: Generate tables, enums, views, and relationships
- **Modular**: Import only what you need
- **Well-tested**: Comprehensive test suite with 115+ tests
- **🆕 Schema Reading**: Reverse engineer existing Drizzle projects back to JSON
- **🆕 Change Detection**: Intelligent analysis of schema differences with impact assessment
- **🆕 Safe Migration**: Apply schema changes selectively based on safety levels

## 📦 Installation

```bash
npm install @malldre/drizzle-schema-generator
```

## 🛠 Quick Start

### Schema Generation

```typescript
import { generateProject } from "@malldre/drizzle-schema-generator";

const config = {
	outputDir: "./src/db",
	enums: [
		{
			name: "UserRole",
			values: ["admin", "user", "guest"],
		},
	],
	tables: [
		{
			name: "users",
			columns: [
				{
					name: "id",
					type: "serial",
					options: { primaryKey: true },
				},
				{
					name: "email",
					type: "string",
					options: { length: 255, notNull: true },
				},
				{
					name: "role",
					options: { enumValues: "UserRole", default: "user" },
				},
			],
		},
	],
	overwrite: true,
};

// Generate complete project
const result = await generateProject(config);
console.log(`Generated ${result.generatedFiles.length} files`);
```

### Schema Reading (Reverse Engineering)

```typescript
import { SchemaReader } from "@malldre/drizzle-schema-generator";

const reader = new SchemaReader();

// Read existing schema back to JSON
const schema = await reader.readSchema("./src/db");
console.log(`Found ${schema.enums.length} enums, ${schema.tables.length} tables`);
```

### Intelligent Change Detection

```typescript
import { SchemaChangeDetector } from "@malldre/drizzle-schema-generator";

const detector = new SchemaChangeDetector();

// Compare schemas and detect changes
const comparison = detector.compareSchemas(oldSchema, newSchema);
console.log(`Found ${comparison.changes.length} changes`);

// Apply only safe changes
const result = await detector.applySafeChanges(comparison, "./src/db");
console.log(`Applied ${result.appliedChanges.length} safe changes`);
```

## 📖 API Reference

### Core Generators

#### `generateProject(config: ProjectGeneratorConfig): GenerationResult`

Generates a complete Drizzle project with all schema files.

#### `generateTable(definition: TableDefinition): string`

Generates Drizzle table schema code.

#### `generateEnum(definition: EnumDefinition): string`

Generates Drizzle enum schema code.

#### `generateView(definition: ViewDefinition): string`

Generates Drizzle view schema code.

### Advanced Features

#### `SchemaReader`

Reverse engineers existing Drizzle TypeScript code back to JSON configuration:

```typescript
const reader = new SchemaReader();
const schema = await reader.readSchema("./path/to/db");
```

#### `SchemaChangeDetector`

Intelligently compares schemas and manages changes:

```typescript
const detector = new SchemaChangeDetector();

// Compare two schemas
const comparison = detector.compareSchemas(oldSchema, newSchema);

// Apply changes based on safety level
const safeResult = await detector.applySafeChanges(comparison, outputDir);
const allResult = await detector.applyAllChanges(comparison, outputDir, {
	allowBreaking: true,
});
```

### Change Impact Classification

Changes are automatically classified by impact level:

- **SAFE**: Additions that don't affect existing code (new tables, columns, enums)
- **WARNING**: Modifications that might need attention (column type changes, default value changes)
- **BREAKING**: Changes that will break existing code (removing tables/columns, constraint changes)

## 🏗 Complete Example

```typescript
import { generateProject, SchemaReader, SchemaChangeDetector, TableDefinition, EnumDefinition } from "@malldre/drizzle-schema-generator";

// Initial schema generation
const config = {
	outputDir: "./src/db",
	enums: [
		{
			name: "UserRole",
			values: ["admin", "user", "guest"],
		},
	],
	tables: [
		{
			name: "users",
			columns: [
				{
					name: "id",
					type: "serial",
					options: { primaryKey: true },
				},
				{
					name: "email",
					type: "string",
					options: { length: 255, notNull: true },
				},
				{
					name: "role",
					options: { enumValues: "UserRole", default: "user" },
				},
			],
		},
	],
};

await generateProject(config);

// Later: Read existing schema
const reader = new SchemaReader();
const currentSchema = await reader.readSchema("./src/db");

// Define updated schema
const updatedConfig = {
	...config,
	tables: [
		...config.tables,
		{
			name: "posts",
			columns: [
				{
					name: "id",
					type: "serial",
					options: { primaryKey: true },
				},
				{
					name: "title",
					type: "string",
					options: { length: 255, notNull: true },
				},
				{
					name: "authorId",
					type: "integer",
					options: {
						notNull: true,
						references: { table: "users", column: "id" },
					},
				},
			],
		},
	],
};

// Detect and apply changes intelligently
const detector = new SchemaChangeDetector();
const comparison = detector.compareSchemas(currentSchema, updatedConfig);

console.log(`Detected ${comparison.changes.length} changes:`);
comparison.changes.forEach((change) => {
	console.log(`- ${change.type}: ${change.description} (${change.impact})`);
});

// Apply only safe changes
const result = await detector.applySafeChanges(comparison, "./src/db");
console.log(`Applied ${result.appliedChanges.length} safe changes`);
```

## 📁 Generated Structure

```text
generated/
├── enums/
│   └── UserRole.ts
├── tables/
│   ├── Users.ts
│   └── Posts.ts
├── helpers/
│   └── HelperFunctions.ts
├── views/
│   └── UserPosts.ts
└── index.ts
```

## 🎯 Supported Database Types

### PostgreSQL

- `serial`, `bigserial`, `smallserial`
- `integer`, `bigint`, `smallint`
- `decimal`, `numeric`, `real`, `doublePrecision`
- `varchar`, `char`, `text`
- `boolean`
- `date`, `timestamp`, `time`, `interval`
- `json`, `jsonb`
- `uuid`
- Arrays and custom types

### MySQL

- `int`, `bigint`, `tinyint`, `smallint`, `mediumint`
- `decimal`, `float`, `double`
- `varchar`, `char`, `text`, `tinytext`, `mediumtext`, `longtext`
- `boolean`
- `date`, `datetime`, `timestamp`, `time`, `year`
- `json`

### SQLite

- `integer`, `real`, `text`, `blob`
- `numeric`

## 🔧 Advanced Features

### Schema Migration Workflow

1. **Generate Initial Schema**: Create your Drizzle schema from JSON configuration
2. **Read Existing Schema**: Use `SchemaReader` to reverse-engineer current state
3. **Compare Changes**: Use `SchemaChangeDetector` to analyze differences
4. **Apply Safely**: Apply changes based on impact level and safety preferences

### Change Detection Types

The system detects 16 different types of schema changes:

- **Enum Changes**: `enum_added`, `enum_removed`, `enum_value_added`, `enum_value_removed`
- **Helper Changes**: `helper_added`, `helper_removed`, `helper_column_added`, `helper_column_removed`
- **Table Changes**: `table_added`, `table_removed`
- **Column Changes**: `column_added`, `column_removed`, `column_type_changed`, `column_constraint_added`, `column_constraint_removed`, `column_default_changed`

### Safety Controls

- **Dry Run Mode**: Preview changes without applying them
- **Impact Filtering**: Apply only changes below a certain impact threshold
- **Breaking Change Protection**: Prevent accidental data loss
- **Rollback Support**: Generate rollback scripts for applied changes

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Test specific features
npm test -- --grep "SchemaReader"
npm test -- --grep "SchemaChangeDetector"
```

## 📚 Advanced Documentation

For detailed documentation on advanced features, see [ADVANCED-FEATURES.md](./ADVANCED-FEATURES.md).

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Drizzle ORM](https://orm.drizzle.team/) - The amazing ORM this library generates code for
- [TypeScript](https://www.typescriptlang.org/) - For excellent type support

---

Made with ❤️ by [Malldre](https://github.com/Malldre)
