import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import { join } from "path";
import { ProjectGenerator, generateProject } from "../../src/generators/ProjectGenerator.js";
import type { ProjectGeneratorConfig } from "../../src/definitions/index.js";

const TEST_OUTPUT_DIR = "./test-output";

describe("ProjectGenerator", () => {
	beforeEach(async () => {
		// Clean up test directory before each test
		try {
			await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
		} catch {
			// Directory doesn't exist, ignore
		}
	});

	afterEach(async () => {
		// Clean up test directory after each test
		try {
			await fs.rm(TEST_OUTPUT_DIR, { recursive: true, force: true });
		} catch {
			// Directory doesn't exist, ignore
		}
	});

	it("should generate complete project structure", async () => {
		const config: ProjectGeneratorConfig = {
			outputDir: TEST_OUTPUT_DIR,
			overwrite: true,
			enums: [
				{
					name: "UserStatus",
					values: ["active", "inactive", "pending"],
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
							name: "status",
							options: {
								enumValues: "UserStatus",
								default: "pending",
							},
						},
					],
					helperReferences: ["AuditColumns"],
				},
			],
		};

		const result = await generateProject(config);

		expect(result.success).toBe(true);
		expect(result.errors).toBeUndefined();
		expect(result.generatedFiles).toHaveLength(7); // 3 main files + 3 index files + 1 main index

		// Check directory structure
		expect(result.structure.enumsDir).toBe(join(TEST_OUTPUT_DIR, "enums"));
		expect(result.structure.helpersDir).toBe(join(TEST_OUTPUT_DIR, "helpers"));
		expect(result.structure.tablesDir).toBe(join(TEST_OUTPUT_DIR, "tables"));

		// Check generated files
		expect(result.structure.files.enums).toEqual(["UserStatus.ts"]);
		expect(result.structure.files.helpers).toEqual(["AuditColumns.ts"]);
		expect(result.structure.files.tables).toEqual(["Users.ts"]);
		expect(result.structure.files.indexes).toHaveLength(4); // 3 subdirectory indexes + 1 main index

		// Verify files exist
		const enumFile = await fs.readFile(join(TEST_OUTPUT_DIR, "enums", "UserStatus.ts"), "utf-8");
		expect(enumFile).toContain("export const UserStatus = pgEnum('user_status', ['Active', 'Inactive', 'Pending'] as const);");

		const helperFile = await fs.readFile(join(TEST_OUTPUT_DIR, "helpers", "AuditColumns.ts"), "utf-8");
		expect(helperFile).toContain("export const AuditColumns = {");

		const tableFile = await fs.readFile(join(TEST_OUTPUT_DIR, "tables", "Users.ts"), "utf-8");
		expect(tableFile).toContain("export const users = pgTable");
	});

	it("should generate project with only enums", async () => {
		const config: ProjectGeneratorConfig = {
			outputDir: TEST_OUTPUT_DIR,
			overwrite: true,
			enums: [
				{
					name: "Color",
					values: ["red", "green", "blue"],
				},
				{
					name: "Size",
					values: ["small", "medium", "large"],
				},
			],
		};

		const result = await generateProject(config);

		expect(result.success).toBe(true);
		expect(result.structure.files.enums).toEqual(["Color.ts", "Size.ts"]);
		expect(result.structure.files.helpers).toEqual([]);
		expect(result.structure.files.tables).toEqual([]);
		expect(result.structure.files.indexes).toEqual(["enums/index.ts", "index.ts"]);
	});

	it("should generate project with only helpers", async () => {
		const config: ProjectGeneratorConfig = {
			outputDir: TEST_OUTPUT_DIR,
			overwrite: true,
			helpers: [
				{
					name: "AuditColumns",
					columns: [
						{
							name: "createdAt",
							type: "date",
							options: { notNull: true },
						},
					],
				},
			],
		};

		const result = await generateProject(config);

		expect(result.success).toBe(true);
		expect(result.structure.files.enums).toEqual([]);
		expect(result.structure.files.helpers).toEqual(["AuditColumns.ts"]);
		expect(result.structure.files.tables).toEqual([]);
		expect(result.structure.files.indexes).toEqual(["helpers/index.ts", "index.ts"]);
	});

	it("should generate project with only tables", async () => {
		const config: ProjectGeneratorConfig = {
			outputDir: TEST_OUTPUT_DIR,
			overwrite: true,
			tables: [
				{
					name: "Users",
					columns: [
						{
							name: "id",
							type: "serial",
							options: { primaryKey: true },
						},
					],
				},
			],
		};

		const result = await generateProject(config);

		expect(result.success).toBe(true);
		expect(result.structure.files.enums).toEqual([]);
		expect(result.structure.files.helpers).toEqual([]);
		expect(result.structure.files.tables).toEqual(["Users.ts"]);
		expect(result.structure.files.indexes).toEqual(["tables/index.ts", "index.ts"]);
	});

	it("should handle file overwrite settings", async () => {
		const config: ProjectGeneratorConfig = {
			outputDir: TEST_OUTPUT_DIR,
			overwrite: false,
			enums: [
				{
					name: "TestEnum",
					values: ["value1"],
				},
			],
		};

		// Generate once
		const firstResult = await generateProject(config);
		expect(firstResult.success).toBe(true);

		// Generate again with overwrite false
		const secondResult = await generateProject(config);
		expect(secondResult.success).toBe(false);
		expect(secondResult.errors).toBeDefined();
		expect(secondResult.errors?.some((error) => error.includes("already exists"))).toBe(true);
	});

	it("should handle generation errors gracefully", async () => {
		const config: ProjectGeneratorConfig = {
			outputDir: TEST_OUTPUT_DIR,
			overwrite: true,
			enums: [
				{
					name: "", // Invalid name
					values: ["value1"],
				},
			],
		};

		const result = await generateProject(config);

		expect(result.success).toBe(false);
		expect(result.errors).toBeDefined();
		expect(result.errors?.some((error) => error.includes("Enum name and values are mandatory"))).toBe(true);
	});

	it("should generate proper index files", async () => {
		const config: ProjectGeneratorConfig = {
			outputDir: TEST_OUTPUT_DIR,
			overwrite: true,
			enums: [
				{
					name: "Status",
					values: ["active"],
				},
			],
			helpers: [
				{
					name: "CommonColumns",
					columns: [
						{
							name: "id",
							type: "serial",
							options: { primaryKey: true },
						},
					],
				},
			],
			tables: [
				{
					name: "Users",
					columns: [
						{
							name: "email",
							type: "string",
						},
					],
				},
			],
		};

		const result = await generateProject(config);
		expect(result.success).toBe(true);

		// Check enum index
		const enumIndex = await fs.readFile(join(TEST_OUTPUT_DIR, "enums", "index.ts"), "utf-8");
		expect(enumIndex).toContain("export * from './Status.js';");

		// Check helper index
		const helperIndex = await fs.readFile(join(TEST_OUTPUT_DIR, "helpers", "index.ts"), "utf-8");
		expect(helperIndex).toContain("export * from './CommonColumns.js';");

		// Check table index
		const tableIndex = await fs.readFile(join(TEST_OUTPUT_DIR, "tables", "index.ts"), "utf-8");
		expect(tableIndex).toContain("export * from './Users.js';");

		// Check main index
		const mainIndex = await fs.readFile(join(TEST_OUTPUT_DIR, "index.ts"), "utf-8");
		expect(mainIndex).toContain("export * from './enums/index.js';");
		expect(mainIndex).toContain("export * from './helpers/index.js';");
		expect(mainIndex).toContain("export * from './tables/index.js';");
	});

	it("should use ProjectGenerator class directly", async () => {
		const config: ProjectGeneratorConfig = {
			outputDir: TEST_OUTPUT_DIR,
			overwrite: true,
			enums: [
				{
					name: "TestEnum",
					values: ["test"],
				},
			],
		};

		const generator = new ProjectGenerator(config);
		const result = await generator.generate();

		expect(result.success).toBe(true);
		expect(result.generatedFiles).toHaveLength(3); // enum file + enum index + main index
	});
});
