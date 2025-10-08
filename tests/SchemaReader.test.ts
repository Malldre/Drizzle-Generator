import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { SchemaReader } from "../src/generators/SchemaReader.js";
import { generateProject } from "../src/generators/ProjectGenerator.js";
import { ProjectGeneratorConfig } from "../src/definitions/index.js";

describe("SchemaReader", () => {
	let tempDir: string;
	let testProjectPath: string;

	beforeEach(async () => {
		tempDir = await fs.mkdtemp(join(tmpdir(), "schema-reader-test-"));
		testProjectPath = join(tempDir, "test-project");
	});

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	describe("readSchema", () => {
		it("should return error for non-existent project", async () => {
			const reader = new SchemaReader("/non/existent/path");
			const result = await reader.readSchema();

			expect(result.success).toBe(false);
			expect(result.message).toContain("Project directory not found");
			expect(result.errors).toBeDefined();
		});

		it("should read a complete schema with enums, helpers, and tables", async () => {
			// Create a test schema first
			const config: ProjectGeneratorConfig = {
				outputDir: testProjectPath,
				enums: [
					{
						name: "UserStatus",
						values: ["active", "inactive", "pending"],
					},
				],
				helpers: [
					{
						name: "BaseFields",
						columns: [
							{
								name: "id",
								type: "serial",
								options: { primaryKey: true },
							},
							{
								name: "createdAt",
								type: "date",
								options: { notNull: true, default: "sql.now()" },
							},
						],
					},
				],
				tables: [
					{
						name: "users",
						columns: [
							{
								name: "name",
								type: "string",
								options: { length: 255, notNull: true },
							},
							{
								name: "status",
								options: { enumValues: "UserStatus", default: "active" },
							},
						],
						helperReferences: ["BaseFields"],
					},
				],
				overwrite: true,
			};

			// Generate the project
			await generateProject(config);

			// Now read it back
			const reader = new SchemaReader(testProjectPath);
			const result = await reader.readSchema();

			expect(result.success).toBe(true);
			expect(result.schema).toBeDefined();
			expect(result.files.enums).toContain("UserStatus.ts");
			expect(result.files.helpers).toContain("BaseFields.ts");
			expect(result.files.tables).toContain("users.ts");
			expect(result.metadata.totalFiles).toBeGreaterThan(0);
		});

		it("should handle enum parsing correctly", async () => {
			const config: ProjectGeneratorConfig = {
				outputDir: testProjectPath,
				enums: [
					{
						name: "Priority",
						values: ["low", "medium", "high"],
					},
				],
				overwrite: true,
			};

			await generateProject(config);

			const reader = new SchemaReader(testProjectPath);
			const result = await reader.readSchema();

			expect(result.success).toBe(true);
			expect(result.schema?.enums).toBeDefined();
			expect(result.schema?.enums).toHaveLength(1);

			const readEnum = result.schema?.enums?.[0];
			expect(readEnum?.name).toBe("Priority");
			expect(readEnum?.values).toEqual(["low", "medium", "high"]);
		});

		it("should handle table with composite primary key", async () => {
			const config: ProjectGeneratorConfig = {
				outputDir: testProjectPath,
				tables: [
					{
						name: "userRoles",
						columns: [
							{
								name: "userId",
								type: "number",
								options: { notNull: true },
							},
							{
								name: "roleId",
								type: "number",
								options: { notNull: true },
							},
						],
						compositePrimaryKey: ["userId", "roleId"],
					},
				],
				overwrite: true,
			};

			await generateProject(config);

			const reader = new SchemaReader(testProjectPath);
			const result = await reader.readSchema();

			expect(result.success).toBe(true);
			expect(result.schema?.tables).toBeDefined();

			const readTable = result.schema?.tables?.[0];
			expect(readTable?.compositePrimaryKey).toEqual(["userId", "roleId"]);
		});

		it("should handle helper with various column types", async () => {
			const config: ProjectGeneratorConfig = {
				outputDir: testProjectPath,
				helpers: [
					{
						name: "ComplexHelper",
						columns: [
							{
								name: "textField",
								type: "text",
								options: { notNull: true },
							},
							{
								name: "jsonField",
								type: "json",
							},
							{
								name: "boolField",
								type: "boolean",
								options: { default: false },
							},
						],
					},
				],
				overwrite: true,
			};

			await generateProject(config);

			const reader = new SchemaReader(testProjectPath);
			const result = await reader.readSchema();

			expect(result.success).toBe(true);
			expect(result.schema?.helpers).toBeDefined();

			const readHelper = result.schema?.helpers?.[0];
			expect(readHelper?.columns).toHaveLength(3);

			const textField = readHelper?.columns.find((c: any) => c.name === "textField");
			expect(textField?.type).toBe("text");
			expect(textField?.options?.notNull).toBe(true);

			const boolField = readHelper?.columns.find((c: any) => c.name === "boolField");
			expect(boolField?.type).toBe("boolean");
			expect(boolField?.options?.default).toBe(false);
		});

		it("should handle empty project correctly", async () => {
			const config: ProjectGeneratorConfig = {
				outputDir: testProjectPath,
				overwrite: true,
			};

			await generateProject(config);

			const reader = new SchemaReader(testProjectPath);
			const result = await reader.readSchema();

			expect(result.success).toBe(true);
			expect(result.schema?.enums).toBeUndefined();
			expect(result.schema?.helpers).toBeUndefined();
			expect(result.schema?.tables).toBeUndefined();
			expect(result.files.enums).toHaveLength(0);
			expect(result.files.helpers).toHaveLength(0);
			expect(result.files.tables).toHaveLength(0);
		});

		it("should collect and report errors for malformed files", async () => {
			// Create project directory
			await fs.mkdir(testProjectPath, { recursive: true });
			await fs.writeFile(join(testProjectPath, "index.ts"), 'export * from "./enums/index.js";');

			// Create malformed enum file
			await fs.mkdir(join(testProjectPath, "enums"), { recursive: true });
			await fs.writeFile(join(testProjectPath, "enums", "BadEnum.ts"), "export const BadEnum = invalidSyntax;");
			await fs.writeFile(join(testProjectPath, "enums", "index.ts"), "");

			const reader = new SchemaReader(testProjectPath);
			const result = await reader.readSchema();

			expect(result.success).toBe(false);
			expect(result.errors).toBeDefined();
			expect(result.errors!.length).toBeGreaterThan(0);
			expect(result.message).toContain("errors");
		});
	});

	describe("convenience function", () => {
		it("should work as expected", async () => {
			const config: ProjectGeneratorConfig = {
				outputDir: testProjectPath,
				enums: [{ name: "Status", values: ["active"] }],
				overwrite: true,
			};

			await generateProject(config);

			// Test the convenience function
			const { readSchema } = await import("../src/generators/SchemaReader.js");
			const result = await readSchema(testProjectPath);

			expect(result.success).toBe(true);
			expect(result.schema?.enums).toHaveLength(1);
		});
	});
});
