import { describe, it, expect } from "vitest";
import { HelperGenerator } from "../../src/generators/HelperGenerator.js";
import type { HelperDefinition } from "../../src/definitions/index.js";

describe("HelperGenerator", () => {
	it("should generate a simple helper with audit columns", () => {
		const definition: HelperDefinition = {
			name: "AuditColumns",
			columns: [
				{
					name: "createdAt",
					type: "date",
					options: {
						notNull: true,
						default: "sql.now()",
					},
				},
				{
					name: "updatedAt",
					type: "date",
				},
			],
		};

		const result = HelperGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.helperCode).toBe(`export const AuditColumns = {
    createdAt: timestamp('createdAt').notNull().default(sql\`now()\`),
    updatedAt: timestamp('updatedAt')
};`);
		expect(result.imports).toEqual({
			"drizzle-orm/pg-core": ["timestamp"],
			"drizzle-orm": ["sql"],
		});
		expect(result.tables).toEqual([]);
	});

	it("should generate helper with address columns", () => {
		const definition: HelperDefinition = {
			name: "AddressColumns",
			columns: [
				{
					name: "street",
					type: "string",
					options: {
						length: 255,
						notNull: true,
					},
				},
				{
					name: "city",
					type: "string",
					options: {
						length: 100,
						notNull: true,
					},
				},
				{
					name: "zipCode",
					type: "string",
					options: {
						length: 10,
					},
				},
			],
		};

		const result = HelperGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.helperCode).toBe(`export const AddressColumns = {
    street: varchar('street', { length: 255 }).notNull(),
    city: varchar('city', { length: 100 }).notNull(),
    zipCode: varchar('zipCode', { length: 10 })
};`);
		expect(result.imports).toEqual({
			"drizzle-orm/pg-core": ["varchar"],
		});
	});

	it("should generate helper with mixed column types", () => {
		const definition: HelperDefinition = {
			name: "UserMetadata",
			columns: [
				{
					name: "id",
					type: "serial",
					options: {
						primaryKey: true,
					},
				},
				{
					name: "isActive",
					type: "boolean",
					options: {
						default: true,
					},
				},
				{
					name: "loginCount",
					type: "number",
					options: {
						default: 0,
					},
				},
			],
		};

		const result = HelperGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.helperCode).toBe(`export const UserMetadata = {
    id: serial('id').primaryKey(),
    isActive: boolean('isActive').default(true),
    loginCount: integer('loginCount').default(0)
};`);
		expect(result.imports).toEqual({
			"drizzle-orm/pg-core": ["serial", "boolean", "integer"],
		});
	});

	it("should handle helper with foreign key references", () => {
		const definition: HelperDefinition = {
			name: "UserRelations",
			columns: [
				{
					name: "createdBy",
					type: "number",
					options: {
						references: {
							table: "users",
							column: "id",
						},
					},
				},
				{
					name: "organizationId",
					type: "number",
					options: {
						notNull: true,
						references: {
							table: "organizations",
							column: "id",
						},
					},
				},
			],
		};

		const result = HelperGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.helperCode).toBe(`export const UserRelations = {
    createdBy: integer('createdBy').references(() => users.id),
    organizationId: integer('organizationId').notNull().references(() => organizations.id)
};`);
		expect(result.imports).toEqual({
			"drizzle-orm/pg-core": ["integer"],
			"../tables/index.js": ["users", "organizations"],
		});
		expect(result.tables).toEqual(["users", "organizations"]);
	});

	it("should handle helper with enum columns", () => {
		const definition: HelperDefinition = {
			name: "StatusColumns",
			columns: [
				{
					name: "status",
					options: {
						enumValues: "UserStatus",
						default: "pending",
					},
				},
				{
					name: "priority",
					options: {
						enumValues: "Priority",
						notNull: true,
					},
				},
			],
		};

		const result = HelperGenerator(definition);

		expect(result.error).toBeUndefined();
		expect(result.helperCode).toBe(`export const StatusColumns = {
    status: UserStatus('status').default('Pending'),
    priority: Priority('priority').notNull()
};`);
		expect(result.imports).toEqual({
			"../enums/index.js": ["UserStatus", "Priority"],
		});
	});

	describe("Error handling", () => {
		it("should return error for empty helper name", () => {
			const definition: HelperDefinition = {
				name: "",
				columns: [
					{
						name: "id",
						type: "serial",
					},
				],
			};

			const result = HelperGenerator(definition);

			expect(result.error).toBe("Helper name is required.");
			expect(result.helperCode).toBe("");
		});

		it("should return error for whitespace-only helper name", () => {
			const definition: HelperDefinition = {
				name: "   ",
				columns: [
					{
						name: "id",
						type: "serial",
					},
				],
			};

			const result = HelperGenerator(definition);

			expect(result.error).toBe("Helper name is required.");
		});

		it("should return error for empty columns array", () => {
			const definition: HelperDefinition = {
				name: "EmptyHelper",
				columns: [],
			};

			const result = HelperGenerator(definition);

			expect(result.error).toBe("At least one column is required for a helper.");
		});

		it("should return error for missing columns property", () => {
			const definition: HelperDefinition = {
				name: "MissingColumns",
				columns: undefined as any,
			};

			const result = HelperGenerator(definition);

			expect(result.error).toBe("At least one column is required for a helper.");
		});

		it("should return error when column generation fails", () => {
			const definition: HelperDefinition = {
				name: "InvalidHelper",
				columns: [
					{
						name: "invalidColumn",
						type: "unsupported",
					},
				],
			};

			const result = HelperGenerator(definition);

			expect(result.error).toBe("Error in column 'invalidColumn': Unsupported type 'unsupported' for column 'invalidColumn'.");
		});
	});
});
