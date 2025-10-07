import { describe, it, expect } from "vitest";
import { ColumnGenerator } from "../../src/generators/ColumnGenerator.js";
import type { ColumnDefinition } from "../../src/definitions/index.js";

describe("ColumnGenerator", () => {
	describe("Basic column types", () => {
		it("should generate a serial column", () => {
			const definition: ColumnDefinition = {
				name: "id",
				type: "serial",
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("id: serial('id'),");
			expect(result.imports).toEqual({
				"drizzle-orm/pg-core": ["serial"],
			});
			expect(result.tables).toEqual([]);
		});

		it("should generate a varchar column with length", () => {
			const definition: ColumnDefinition = {
				name: "email",
				type: "string",
				options: {
					length: 255,
				},
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("email: varchar('email', { length: 255 }),");
			expect(result.imports).toEqual({
				"drizzle-orm/pg-core": ["varchar"],
			});
		});

		it("should generate a text column", () => {
			const definition: ColumnDefinition = {
				name: "description",
				type: "text",
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("description: text('description'),");
			expect(result.imports).toEqual({
				"drizzle-orm/pg-core": ["text"],
			});
		});

		it("should generate an integer column", () => {
			const definition: ColumnDefinition = {
				name: "age",
				type: "number",
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("age: integer('age'),");
			expect(result.imports).toEqual({
				"drizzle-orm/pg-core": ["integer"],
			});
		});

		it("should generate a boolean column", () => {
			const definition: ColumnDefinition = {
				name: "isActive",
				type: "boolean",
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("isActive: boolean('isActive'),");
			expect(result.imports).toEqual({
				"drizzle-orm/pg-core": ["boolean"],
			});
		});

		it("should generate a timestamp column", () => {
			const definition: ColumnDefinition = {
				name: "createdAt",
				type: "date",
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("createdAt: timestamp('createdAt'),");
			expect(result.imports).toEqual({
				"drizzle-orm/pg-core": ["timestamp"],
			});
		});
	});

	describe("Column constraints", () => {
		it("should add primary key constraint", () => {
			const definition: ColumnDefinition = {
				name: "id",
				type: "serial",
				options: {
					primaryKey: true,
				},
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("id: serial('id').primaryKey(),");
		});

		it("should add not null constraint", () => {
			const definition: ColumnDefinition = {
				name: "email",
				type: "string",
				options: {
					notNull: true,
				},
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("email: varchar('email').notNull(),");
		});

		it("should combine multiple constraints", () => {
			const definition: ColumnDefinition = {
				name: "id",
				type: "serial",
				options: {
					primaryKey: true,
					notNull: true,
				},
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("id: serial('id').primaryKey().notNull(),");
		});
	});

	describe("Default values", () => {
		it("should handle string default values", () => {
			const definition: ColumnDefinition = {
				name: "name",
				type: "string",
				options: {
					default: "Anonymous",
				},
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("name: varchar('name').default('Anonymous'),");
		});

		it("should handle number default values", () => {
			const definition: ColumnDefinition = {
				name: "count",
				type: "number",
				options: {
					default: 0,
				},
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("count: integer('count').default(0),");
		});

		it("should handle boolean default values", () => {
			const definition: ColumnDefinition = {
				name: "isActive",
				type: "boolean",
				options: {
					default: true,
				},
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("isActive: boolean('isActive').default(true),");
		});

		it("should handle SQL function default values", () => {
			const definition: ColumnDefinition = {
				name: "createdAt",
				type: "date",
				options: {
					default: "sql.now()",
				},
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("createdAt: timestamp('createdAt').default(sql`now()`),");
			expect(result.imports).toEqual({
				"drizzle-orm/pg-core": ["timestamp"],
				"drizzle-orm": ["sql"],
			});
		});
	});

	describe("Enum columns", () => {
		it("should generate enum column without type when enumValues is provided", () => {
			const definition: ColumnDefinition = {
				name: "status",
				options: {
					enumValues: "UserStatus",
				},
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("status: UserStatus('status'),");
			expect(result.imports).toEqual({
				"../enums/index.js": ["UserStatus"],
			});
		});

		it("should generate enum column with enum default value", () => {
			const definition: ColumnDefinition = {
				name: "status",
				options: {
					enumValues: "UserStatus",
					default: "pending",
				},
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("status: UserStatus('status').default('Pending'),");
			expect(result.imports).toEqual({
				"../enums/index.js": ["UserStatus"],
			});
		});
	});

	describe("Foreign key references", () => {
		it("should generate column with foreign key reference", () => {
			const definition: ColumnDefinition = {
				name: "userId",
				type: "number",
				options: {
					references: {
						table: "users",
						column: "id",
					},
				},
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("userId: integer('userId').references(() => users.id),");
			expect(result.imports).toEqual({
				"drizzle-orm/pg-core": ["integer"],
				"../tables/index.js": ["users"],
			});
			expect(result.tables).toEqual(["users"]);
		});

		it("should combine foreign key with other constraints", () => {
			const definition: ColumnDefinition = {
				name: "userId",
				type: "number",
				options: {
					notNull: true,
					references: {
						table: "users",
						column: "id",
					},
				},
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.column).toBe("userId: integer('userId').notNull().references(() => users.id),");
		});
	});

	describe("Error handling", () => {
		it("should return error when type is not provided and no enumValues", () => {
			const definition: ColumnDefinition = {
				name: "status",
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBe("Type is required for column 'status'. Provide either 'type' property or 'enumValues' in options.");
			expect(result.column).toBe("");
		});

		it("should return error for unsupported type", () => {
			const definition: ColumnDefinition = {
				name: "data",
				type: "unsupported",
			};

			const result = ColumnGenerator(definition);

			expect(result.error).toBe("Unsupported type 'unsupported' for column 'data'.");
			expect(result.column).toBe("");
		});
	});
});
