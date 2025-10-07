# Drizzle Schema Generator

A powerful TypeScript library for generating Drizzle ORM schema code from type definitions.

[![npm version](https://badge.fury.io/js/drizzle-schema-generator.svg)](https://www.npmjs.com/package/drizzle-schema-generator)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **Type-safe**: Full TypeScript support with type definitions
- **Flexible**: Support for PostgreSQL, MySQL, and SQLite
- **Comprehensive**: Generate tables, enums, views, and relationships
- **Modular**: Import only what you need
- **Well-tested**: Comprehensive test suite with 91+ tests

## 📦 Installation

```bash
npm install drizzle-schema-generator
```

## 🛠 Quick Start

```typescript
import { generateTable, generateEnum } from "drizzle-schema-generator";

// Generate an enum
const userRole = generateEnum({
	name: "userRole",
	values: ["admin", "user", "guest"],
});

// Generate a table
const userTable = generateTable({
	name: "users",
	columns: [
		{
			name: "id",
			type: "serial",
			constraints: ["primaryKey"],
		},
		{
			name: "email",
			type: "text",
			constraints: ["notNull", "unique"],
		},
		{
			name: "role",
			type: "userRole",
			defaultValue: "'user'",
		},
	],
});

console.log(userRole); // Generated enum code
console.log(userTable); // Generated table code
```

## 📖 API Reference

### Core Generators

#### `generateTable(definition: TableDefinition): string`

Generates Drizzle table schema code.

#### `generateEnum(definition: EnumDefinition): string`

Generates Drizzle enum schema code.

#### `generateView(definition: ViewDefinition): string`

Generates Drizzle view schema code.

#### `generateColumn(definition: ColumnDefinition): string`

Generates individual column definitions.

### Utilities

#### `toPascalCase(input: string): string`

Converts strings to PascalCase.

#### `toSnakeCase(input: string): string`

Converts strings to snake_case.

#### Import Management

Automatically manages Drizzle ORM imports in generated code.

## 🏗 Complete Example

```typescript
import { generateProject, TableDefinition, EnumDefinition } from "drizzle-schema-generator";

const userRole: EnumDefinition = {
	name: "userRole",
	values: ["admin", "user", "guest"],
};

const usersTable: TableDefinition = {
	name: "users",
	columns: [
		{
			name: "id",
			type: "serial",
			constraints: ["primaryKey"],
		},
		{
			name: "email",
			type: "text",
			constraints: ["notNull", "unique"],
		},
		{
			name: "name",
			type: "varchar",
			size: 255,
			constraints: ["notNull"],
		},
		{
			name: "role",
			type: "userRole",
			defaultValue: "'user'",
		},
		{
			name: "createdAt",
			type: "timestamp",
			defaultValue: "now()",
			constraints: ["notNull"],
		},
	],
};

const postsTable: TableDefinition = {
	name: "posts",
	columns: [
		{
			name: "id",
			type: "serial",
			constraints: ["primaryKey"],
		},
		{
			name: "title",
			type: "varchar",
			size: 255,
			constraints: ["notNull"],
		},
		{
			name: "content",
			type: "text",
		},
		{
			name: "authorId",
			type: "integer",
			constraints: ["notNull"],
			references: {
				table: "users",
				column: "id",
			},
		},
	],
};

// Generate complete project
const project = generateProject({
	enums: [userRole],
	tables: [usersTable, postsTable],
	outputDir: "./generated",
});
```

## 📁 Generated Structure

```
generated/
├── enums/
│   └── UserRole.ts
├── tables/
│   ├── Users.ts
│   └── Posts.ts
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

## 🔧 Constraints Support

- `primaryKey`
- `notNull`
- `unique`
- `default`
- `references` (Foreign Keys)
- Composite primary keys
- Check constraints

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

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
