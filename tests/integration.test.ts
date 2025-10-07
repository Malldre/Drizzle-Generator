import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { generateProject } from "../src/generators/ProjectGenerator.js";
import type { ProjectGeneratorConfig } from "../src/definitions/index.js";

const TEST_OUTPUT_DIR = "./test-integration-output";

describe("Integration Tests", () => {
	beforeEach(async () => {
		try {
			await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
		} catch {
			// Directory doesn't exist, ignore
		}
	});

	afterEach(async () => {
		try {
			await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
		} catch {
			// Directory doesn't exist, ignore
		}
	});

	it("should generate a complete e-commerce schema", async () => {
		const config: ProjectGeneratorConfig = {
			outputDir: TEST_OUTPUT_DIR,
			overwrite: true,
			enums: [
				{
					name: "UserRole",
					values: ["admin", "customer", "seller"],
				},
				{
					name: "OrderStatus",
					values: ["pending", "processing", "shipped", "delivered", "cancelled"],
				},
				{
					name: "PaymentStatus",
					values: ["pending", "completed", "failed", "refunded"],
				},
			],
			helpers: [
				{
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
							options: {
								default: "sql.now()",
							},
						},
					],
				},
				{
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
							name: "postalCode",
							type: "string",
							options: {
								length: 20,
							},
						},
						{
							name: "country",
							type: "string",
							options: {
								length: 2,
								notNull: true,
							},
						},
					],
				},
			],
			tables: [
				{
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
							name: "firstName",
							type: "string",
							options: {
								length: 100,
								notNull: true,
							},
						},
						{
							name: "lastName",
							type: "string",
							options: {
								length: 100,
								notNull: true,
							},
						},
						{
							name: "role",
							options: {
								enumValues: "UserRole",
								default: "customer",
							},
						},
						{
							name: "isActive",
							type: "boolean",
							options: {
								default: true,
							},
						},
					],
					helperReferences: ["AuditColumns"],
				},
				{
					name: "Products",
					columns: [
						{
							name: "id",
							type: "serial",
							options: {
								primaryKey: true,
							},
						},
						{
							name: "name",
							type: "string",
							options: {
								length: 255,
								notNull: true,
							},
						},
						{
							name: "description",
							type: "text",
						},
						{
							name: "price",
							type: "number",
							options: {
								notNull: true,
							},
						},
						{
							name: "sellerId",
							type: "number",
							options: {
								notNull: true,
								references: {
									table: "users",
									column: "id",
								},
							},
						},
					],
					helperReferences: ["AuditColumns"],
				},
				{
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
							name: "customerId",
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
							name: "status",
							options: {
								enumValues: "OrderStatus",
								default: "pending",
							},
						},
						{
							name: "totalAmount",
							type: "number",
							options: {
								notNull: true,
							},
						},
					],
					helperReferences: ["AuditColumns", "AddressColumns"],
				},
				{
					name: "OrderItems",
					columns: [
						{
							name: "orderId",
							type: "number",
							options: {
								notNull: true,
								references: {
									table: "orders",
									column: "id",
								},
							},
						},
						{
							name: "productId",
							type: "number",
							options: {
								notNull: true,
								references: {
									table: "products",
									column: "id",
								},
							},
						},
						{
							name: "quantity",
							type: "number",
							options: {
								notNull: true,
							},
						},
						{
							name: "unitPrice",
							type: "number",
							options: {
								notNull: true,
							},
						},
					],
					compositePrimaryKey: ["orderId", "productId"],
				},
			],
		};

		const result = await generateProject(config);

		expect(result.success).toBe(true);
		expect(result.errors).toBeUndefined();

		// Verify all files were generated
		expect(result.generatedFiles).toHaveLength(13); // 3 enums + 2 helpers + 4 tables + 4 indexes

		// Check that files have correct content structure
		const userTableFile = await fs.readFile(join(TEST_OUTPUT_DIR, "tables", "Users.ts"), "utf-8");
		expect(userTableFile).toContain("import { boolean, pgTable, serial, varchar } from 'drizzle-orm/pg-core';");
		expect(userTableFile).toContain("import { UserRole } from '../enums/index.js';");
		expect(userTableFile).toContain("import { AuditColumns } from '../helpers/index.js';");
		expect(userTableFile).toContain("export const users = pgTable");
		expect(userTableFile).toContain("...AuditColumns");

		const orderItemsFile = await fs.readFile(join(TEST_OUTPUT_DIR, "tables", "OrderItems.ts"), "utf-8");
		expect(orderItemsFile).toContain("import { integer, pgTable, primaryKey }");
		expect(orderItemsFile).toContain("compositePK: primaryKey");
		expect(orderItemsFile).toContain("references(() => orders.id)");
		expect(orderItemsFile).toContain("references(() => products.id)");

		const enumFile = await fs.readFile(join(TEST_OUTPUT_DIR, "enums", "OrderStatus.ts"), "utf-8");
		expect(enumFile).toContain("pgEnum('order_status', ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'] as const)");

		const helperFile = await fs.readFile(join(TEST_OUTPUT_DIR, "helpers", "AddressColumns.ts"), "utf-8");
		expect(helperFile).toContain("export const AddressColumns = {");
		expect(helperFile).toContain("street: varchar");
		expect(helperFile).toContain("city: varchar");

		// Check main index file exports everything
		const mainIndex = await fs.readFile(join(TEST_OUTPUT_DIR, "index.ts"), "utf-8");
		expect(mainIndex).toContain("export * from './enums/index.js';");
		expect(mainIndex).toContain("export * from './helpers/index.js';");
		expect(mainIndex).toContain("export * from './tables/index.js';");
	});

	it("should generate blog schema with complex relationships", async () => {
		const config: ProjectGeneratorConfig = {
			outputDir: TEST_OUTPUT_DIR,
			overwrite: true,
			enums: [
				{
					name: "PostStatus",
					values: ["draft", "published", "archived"],
				},
				{
					name: "CommentStatus",
					values: ["pending", "approved", "rejected"],
				},
			],
			helpers: [
				{
					name: "TimestampColumns",
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
				},
			],
			tables: [
				{
					name: "Authors",
					columns: [
						{
							name: "id",
							type: "serial",
							options: {
								primaryKey: true,
							},
						},
						{
							name: "name",
							type: "string",
							options: {
								length: 255,
								notNull: true,
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
					],
					helperReferences: ["TimestampColumns"],
				},
				{
					name: "Posts",
					columns: [
						{
							name: "id",
							type: "serial",
							options: {
								primaryKey: true,
							},
						},
						{
							name: "title",
							type: "string",
							options: {
								length: 255,
								notNull: true,
							},
						},
						{
							name: "content",
							type: "text",
							options: {
								notNull: true,
							},
						},
						{
							name: "authorId",
							type: "number",
							options: {
								notNull: true,
								references: {
									table: "authors",
									column: "id",
								},
							},
						},
						{
							name: "status",
							options: {
								enumValues: "PostStatus",
								default: "draft",
							},
						},
					],
					helperReferences: ["TimestampColumns"],
				},
				{
					name: "Comments",
					columns: [
						{
							name: "id",
							type: "serial",
							options: {
								primaryKey: true,
							},
						},
						{
							name: "content",
							type: "text",
							options: {
								notNull: true,
							},
						},
						{
							name: "postId",
							type: "number",
							options: {
								notNull: true,
								references: {
									table: "posts",
									column: "id",
								},
							},
						},
						{
							name: "authorId",
							type: "number",
							options: {
								references: {
									table: "authors",
									column: "id",
								},
							},
						},
						{
							name: "status",
							options: {
								enumValues: "CommentStatus",
								default: "pending",
							},
						},
					],
					helperReferences: ["TimestampColumns"],
				},
			],
		};

		const result = await generateProject(config);

		expect(result.success).toBe(true);
		expect(result.errors).toBeUndefined();

		// Verify complex relationships are handled correctly
		const postsFile = await fs.readFile(join(TEST_OUTPUT_DIR, "tables", "Posts.ts"), "utf-8");
		expect(postsFile).toContain("references(() => authors.id)");
		expect(postsFile).toContain("import { authors } from '../tables/index.js';");

		const commentsFile = await fs.readFile(join(TEST_OUTPUT_DIR, "tables", "Comments.ts"), "utf-8");
		expect(commentsFile).toContain("references(() => posts.id)");
		expect(commentsFile).toContain("references(() => authors.id)");
		expect(commentsFile).toContain("import { authors, posts } from '../tables/index.js';");
	});
});
