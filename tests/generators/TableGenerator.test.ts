import { describe, it, expect } from "vitest";
import { TableGenerator } from "../../src/generators/TableGenerator.js";
import type { TableDefinition } from "../../src/definitions/index.js";

describe("TableGenerator", () => {
	it("should generate a simple table with basic columns", () => {
		const definition: TableDefinition = {
			name: "Users",
			columns: [
				{
					name: "id",
					type: "serial",
					options: {
						primaryKey: true,
					},
				},
				{
					name: "email",
					type: "string",
					options: {
						length: 255,
						notNull: true,
					},
				},
				{
					name: "name",
					type: "string",
					options: {
						length: 100,
					},
				},
			],
		};

		const result = TableGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.tableCode).toBe(`export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 100 })
});`);
		expect(result.imports).toEqual({
			"drizzle-orm/pg-core": ["pgTable", "serial", "varchar"],
		});
		expect(result.tables).toEqual([]);
	});

	it("should generate table with custom database name", () => {
		const definition: TableDefinition = {
			name: "Users",
			dbName: "app_users",
			columns: [
				{
					name: "id",
					type: "serial",
					options: {
						primaryKey: true,
					},
				},
			],
		};

		const result = TableGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.tableCode).toBe(`export const users = pgTable('app_users', {
    id: serial('id').primaryKey()
});`);
	});

	it("should generate table with helper references", () => {
		const definition: TableDefinition = {
			name: "Users",
			columns: [
				{
					name: "id",
					type: "serial",
					options: {
						primaryKey: true,
					},
				},
				{
					name: "email",
					type: "string",
					options: {
						notNull: true,
					},
				},
			],
			helperReferences: ["AuditColumns", "AddressColumns"],
		};

		const result = TableGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.tableCode).toBe(`export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email').notNull(),
    ...AuditColumns,
    ...AddressColumns
});`);
		expect(result.imports).toEqual({
			"drizzle-orm/pg-core": ["pgTable", "serial", "varchar"],
			"../helpers/index.js": ["AuditColumns", "AddressColumns"],
		});
	});

	it("should generate table with foreign key references", () => {
		const definition: TableDefinition = {
			name: "Orders",
			columns: [
				{
					name: "id",
					type: "serial",
					options: {
						primaryKey: true,
					},
				},
				{
					name: "userId",
					type: "number",
					options: {
						notNull: true,
						references: {
							table: "users",
							column: "id",
						},
					},
				},
				{
					name: "productId",
					type: "number",
					options: {
						references: {
							table: "products",
							column: "id",
						},
					},
				},
			],
		};

		const result = TableGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.tableCode).toBe(`export const orders = pgTable('orders', {
    id: serial('id').primaryKey(),
    userId: integer('userId').notNull().references(() => users.id),
    productId: integer('productId').references(() => products.id)
});`);
		expect(result.imports).toEqual({
			"drizzle-orm/pg-core": ["pgTable", "serial", "integer"],
			"../tables/index.js": ["users", "products"],
		});
		expect(result.tables).toEqual(["users", "products"]);
	});

	it("should generate table with composite primary key", () => {
		const definition: TableDefinition = {
			name: "OrderItems",
			columns: [
				{
					name: "orderId",
					type: "number",
					options: {
						notNull: true,
					},
				},
				{
					name: "productId",
					type: "number",
					options: {
						notNull: true,
					},
				},
				{
					name: "quantity",
					type: "number",
					options: {
						notNull: true,
					},
				},
			],
			compositePrimaryKey: ["orderId", "productId"],
		};

		const result = TableGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.tableCode).toBe(`export const orderitems = pgTable('order_items', {
    orderId: integer('orderId').notNull(),
    productId: integer('productId').notNull(),
    quantity: integer('quantity').notNull()
}, (orderitems) => ({
    compositePK: primaryKey({ columns: [orderitems.orderId, orderitems.productId] })
}));`);
		expect(result.imports).toEqual({
			"drizzle-orm/pg-core": ["pgTable", "integer", "primaryKey"],
		});
	});

	it("should generate table with enum columns", () => {
		const definition: TableDefinition = {
			name: "Users",
			columns: [
				{
					name: "id",
					type: "serial",
					options: {
						primaryKey: true,
					},
				},
				{
					name: "status",
					options: {
						enumValues: "UserStatus",
						default: "pending",
					},
				},
				{
					name: "role",
					options: {
						enumValues: "UserRole",
						notNull: true,
					},
				},
			],
		};

		const result = TableGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.tableCode).toBe(`export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    status: UserStatus('status').default('Pending'),
    role: UserRole('role').notNull()
});`);
		expect(result.imports).toEqual({
			"drizzle-orm/pg-core": ["pgTable", "serial"],
			"../enums/index.js": ["UserStatus", "UserRole"],
		});
	});

	it("should generate table with mixed columns and helpers", () => {
		const definition: TableDefinition = {
			name: "Users",
			columns: [
				{
					name: "id",
					type: "serial",
					options: {
						primaryKey: true,
					},
				},
				{
					name: "email",
					type: "string",
					options: {
						notNull: true,
					},
				},
			],
			helperReferences: ["AuditColumns"],
		};

		const result = TableGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.tableCode).toBe(`export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    email: varchar('email').notNull(),
    ...AuditColumns
});`);
		expect(result.imports).toEqual({
			"drizzle-orm/pg-core": ["pgTable", "serial", "varchar"],
			"../helpers/index.js": ["AuditColumns"],
		});
	});

	describe("Error handling", () => {
		it("should return error for empty table name", () => {
			const definition: TableDefinition = {
				name: "",
				columns: [
					{
						name: "id",
						type: "serial",
					},
				],
			};

			const result = TableGenerator(definition);

			expect(result.error).toBe("Table name is required.");
			expect(result.tableCode).toBe("");
		});

		it("should return error for whitespace-only table name", () => {
			const definition: TableDefinition = {
				name: "   ",
				columns: [
					{
						name: "id",
						type: "serial",
					},
				],
			};

			const result = TableGenerator(definition);

			expect(result.error).toBe("Table name is required.");
		});

		it("should return error for table without columns or helpers", () => {
			const definition: TableDefinition = {
				name: "EmptyTable",
				columns: [],
			};

			const result = TableGenerator(definition);

			expect(result.error).toBe("Table must have at least one column or helper reference.");
		});

		it("should return error when column generation fails", () => {
			const definition: TableDefinition = {
				name: "InvalidTable",
				columns: [
					{
						name: "invalidColumn",
						type: "unsupported",
					},
				],
			};

			const result = TableGenerator(definition);

			expect(result.error).toBe("Error in column 'invalidColumn': Unsupported type 'unsupported' for column 'invalidColumn'.");
		});

		it("should handle single column in composite primary key", () => {
			const definition: TableDefinition = {
				name: "Users",
				columns: [
					{
						name: "id",
						type: "serial",
					},
				],
				compositePrimaryKey: ["id"], // Single column should not generate composite PK
			};

			const result = TableGenerator(definition);

			expect(result.error).toBeUndefined();
			expect(result.tableCode).toBe(`export const users = pgTable('users', {
    id: serial('id')
});`);
			// Should not include primaryKey import for single column
			expect(result.imports).toEqual({
				"drizzle-orm/pg-core": ["pgTable", "serial"],
			});
		});
	});
});
