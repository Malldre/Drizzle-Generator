import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { join } from "path";
import { promises as fs } from "fs";
import { tmpdir } from "os";
import { SchemaChangeDetector } from "../src/generators/SchemaChangeDetector.js";
import { SchemaChangeCategory, SchemaChangeImpact } from "../src/definitions/SchemaReaderResult.js";
import { ProjectGeneratorConfig } from "../src/definitions/index.js";

describe("SchemaChangeDetector", () => {
	let detector: SchemaChangeDetector;
	let tempDir: string;

	beforeEach(async () => {
		detector = new SchemaChangeDetector();
		tempDir = await fs.mkdtemp(join(tmpdir(), "schema-change-test-"));
	});

	afterEach(async () => {
		await fs.rm(tempDir, { recursive: true, force: true });
	});

	describe("compareSchemas", () => {
		it("should detect no changes when schemas are identical", async () => {
			const schema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				enums: [
					{
						name: "Status",
						values: ["active", "inactive"],
					},
				],
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(schema, schema);

			expect(comparison.changes).toHaveLength(0);
			expect(comparison.summary.totalChanges).toBe(0);
			expect(comparison.recommendations).toContain("🎉 No changes detected. Schemas are identical.");
		});

		it("should detect enum additions", async () => {
			const currentSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				enums: [
					{
						name: "Status",
						values: ["active", "inactive"],
					},
				],
				overwrite: true,
			};

			const newSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				enums: [
					{
						name: "Status",
						values: ["active", "inactive"],
					},
					{
						name: "Priority",
						values: ["low", "high"],
					},
				],
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(currentSchema, newSchema);

			expect(comparison.changes).toHaveLength(1);
			expect(comparison.changes[0].type).toBe("enum_added");
			expect(comparison.changes[0].category).toBe(SchemaChangeCategory.ADDITION);
			expect(comparison.changes[0].impact).toBe(SchemaChangeImpact.SAFE);
			expect(comparison.changes[0].target.name).toBe("Priority");
			expect(comparison.summary.byImpact[SchemaChangeImpact.SAFE]).toBe(1);
		});

		it("should detect enum removals as breaking changes", async () => {
			const currentSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				enums: [
					{
						name: "Status",
						values: ["active", "inactive"],
					},
					{
						name: "Priority",
						values: ["low", "high"],
					},
				],
				overwrite: true,
			};

			const newSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				enums: [
					{
						name: "Status",
						values: ["active", "inactive"],
					},
				],
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(currentSchema, newSchema);

			expect(comparison.changes).toHaveLength(1);
			expect(comparison.changes[0].type).toBe("enum_removed");
			expect(comparison.changes[0].category).toBe(SchemaChangeCategory.REMOVAL);
			expect(comparison.changes[0].impact).toBe(SchemaChangeImpact.BREAKING);
			expect(comparison.changes[0].target.name).toBe("Priority");
			expect(comparison.summary.byImpact[SchemaChangeImpact.BREAKING]).toBe(1);
		});

		it("should detect enum value additions", async () => {
			const currentSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				enums: [
					{
						name: "Status",
						values: ["active", "inactive"],
					},
				],
				overwrite: true,
			};

			const newSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				enums: [
					{
						name: "Status",
						values: ["active", "inactive", "pending"],
					},
				],
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(currentSchema, newSchema);

			expect(comparison.changes).toHaveLength(1);
			expect(comparison.changes[0].type).toBe("enum_value_added");
			expect(comparison.changes[0].impact).toBe(SchemaChangeImpact.SAFE);
			expect(comparison.changes[0].details.value).toBe("pending");
		});

		it("should detect enum value removals as breaking changes", async () => {
			const currentSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				enums: [
					{
						name: "Status",
						values: ["active", "inactive", "pending"],
					},
				],
				overwrite: true,
			};

			const newSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				enums: [
					{
						name: "Status",
						values: ["active", "inactive"],
					},
				],
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(currentSchema, newSchema);

			expect(comparison.changes).toHaveLength(1);
			expect(comparison.changes[0].type).toBe("enum_value_removed");
			expect(comparison.changes[0].impact).toBe(SchemaChangeImpact.BREAKING);
			expect(comparison.changes[0].details.value).toBe("pending");
		});

		it("should detect helper additions", async () => {
			const currentSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				overwrite: true,
			};

			const newSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				helpers: [
					{
						name: "BaseFields",
						columns: [
							{
								name: "id",
								type: "serial",
								options: { primaryKey: true },
							},
						],
					},
				],
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(currentSchema, newSchema);

			expect(comparison.changes).toHaveLength(1);
			expect(comparison.changes[0].type).toBe("helper_added");
			expect(comparison.changes[0].impact).toBe(SchemaChangeImpact.SAFE);
			expect(comparison.changes[0].target.name).toBe("BaseFields");
		});

		it("should detect table additions", async () => {
			const currentSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				overwrite: true,
			};

			const newSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				tables: [
					{
						name: "users",
						columns: [
							{
								name: "id",
								type: "serial",
								options: { primaryKey: true },
							},
						],
					},
				],
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(currentSchema, newSchema);

			expect(comparison.changes).toHaveLength(1);
			expect(comparison.changes[0].type).toBe("table_added");
			expect(comparison.changes[0].impact).toBe(SchemaChangeImpact.SAFE);
			expect(comparison.changes[0].target.name).toBe("users");
		});

		it("should detect table removals as breaking changes", async () => {
			const currentSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				tables: [
					{
						name: "users",
						columns: [
							{
								name: "id",
								type: "serial",
								options: { primaryKey: true },
							},
						],
					},
				],
				overwrite: true,
			};

			const newSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(currentSchema, newSchema);

			expect(comparison.changes).toHaveLength(1);
			expect(comparison.changes[0].type).toBe("table_removed");
			expect(comparison.changes[0].impact).toBe(SchemaChangeImpact.BREAKING);
			expect(comparison.changes[0].target.name).toBe("users");
		});

		it("should detect column additions", async () => {
			const currentSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				tables: [
					{
						name: "users",
						columns: [
							{
								name: "id",
								type: "serial",
								options: { primaryKey: true },
							},
						],
					},
				],
				overwrite: true,
			};

			const newSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
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
								name: "name",
								type: "string",
								options: { length: 255 },
							},
						],
					},
				],
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(currentSchema, newSchema);

			expect(comparison.changes).toHaveLength(1);
			expect(comparison.changes[0].type).toBe("table_column_added");
			expect(comparison.changes[0].impact).toBe(SchemaChangeImpact.SAFE);
			expect(comparison.changes[0].target.column).toBe("name");
		});

		it("should detect NOT NULL column additions as warnings", async () => {
			const currentSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				tables: [
					{
						name: "users",
						columns: [
							{
								name: "id",
								type: "serial",
								options: { primaryKey: true },
							},
						],
					},
				],
				overwrite: true,
			};

			const newSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
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
						],
					},
				],
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(currentSchema, newSchema);

			expect(comparison.changes).toHaveLength(1);
			expect(comparison.changes[0].type).toBe("table_column_added");
			expect(comparison.changes[0].impact).toBe(SchemaChangeImpact.WARNING);
			expect(comparison.changes[0].description).toContain("NOT NULL");
		});

		it("should detect column removals as breaking changes", async () => {
			const currentSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
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
								options: { length: 255 },
							},
						],
					},
				],
				overwrite: true,
			};

			const newSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				tables: [
					{
						name: "users",
						columns: [
							{
								name: "id",
								type: "serial",
								options: { primaryKey: true },
							},
						],
					},
				],
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(currentSchema, newSchema);

			expect(comparison.changes).toHaveLength(1);
			expect(comparison.changes[0].type).toBe("table_column_removed");
			expect(comparison.changes[0].impact).toBe(SchemaChangeImpact.BREAKING);
			expect(comparison.changes[0].target.column).toBe("email");
		});

		it("should detect type changes as breaking", async () => {
			const currentSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				tables: [
					{
						name: "users",
						columns: [
							{
								name: "age",
								type: "string",
							},
						],
					},
				],
				overwrite: true,
			};

			const newSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				tables: [
					{
						name: "users",
						columns: [
							{
								name: "age",
								type: "number",
							},
						],
					},
				],
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(currentSchema, newSchema);

			expect(comparison.changes).toHaveLength(1);
			expect(comparison.changes[0].type).toBe("column_type_changed");
			expect(comparison.changes[0].impact).toBe(SchemaChangeImpact.BREAKING);
			expect(comparison.changes[0].details.from).toBe("string");
			expect(comparison.changes[0].details.to).toBe("number");
		});

		it("should generate proper recommendations", async () => {
			const currentSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				tables: [
					{
						name: "users",
						columns: [
							{
								name: "id",
								type: "serial",
								options: { primaryKey: true },
							},
						],
					},
				],
				overwrite: true,
			};

			const newSchema: ProjectGeneratorConfig = {
				outputDir: tempDir,
				tables: [
					{
						name: "posts",
						columns: [
							{
								name: "id",
								type: "serial",
								options: { primaryKey: true },
							},
						],
					},
				],
				overwrite: true,
			};

			const comparison = await detector.compareSchemas(currentSchema, newSchema);

			expect(comparison.changes).toHaveLength(2); // One removal, one addition
			expect(comparison.recommendations.some((r) => r.includes("breaking changes"))).toBe(true);
			expect(comparison.recommendations.some((r) => r.includes("safe changes"))).toBe(true);
		});
	});

	describe("applySafeChanges", () => {
		it("should apply only safe changes by default", async () => {
			const comparison = {
				changes: [
					{
						type: "enum_added" as const,
						category: SchemaChangeCategory.ADDITION,
						impact: SchemaChangeImpact.SAFE,
						description: "Added enum",
						target: { type: "enum" as const, name: "Status" },
					},
					{
						type: "table_removed" as const,
						category: SchemaChangeCategory.REMOVAL,
						impact: SchemaChangeImpact.BREAKING,
						description: "Removed table",
						target: { type: "table" as const, name: "users" },
					},
				],
				summary: {
					totalChanges: 2,
					byCategory: {} as any,
					byImpact: {} as any,
					byType: {} as any,
				},
				recommendations: [],
				canApply: {
					safe: true,
					withWarnings: false,
					withBreaking: false,
				},
			};

			const result = await detector.applySafeChanges(tempDir, comparison, { dryRun: true });

			expect(result.applied).toHaveLength(1);
			expect(result.rejected).toHaveLength(1);
			expect(result.applied[0].impact).toBe(SchemaChangeImpact.SAFE);
			expect(result.rejected[0].impact).toBe(SchemaChangeImpact.BREAKING);
			expect(result.metadata.dryRun).toBe(true);
		});

		it("should apply warning changes when allowed", async () => {
			const comparison = {
				changes: [
					{
						type: "table_column_added" as const,
						category: SchemaChangeCategory.ADDITION,
						impact: SchemaChangeImpact.WARNING,
						description: "Added NOT NULL column",
						target: { type: "table" as const, name: "users", column: "email" },
					},
				],
				summary: {
					totalChanges: 1,
					byCategory: {} as any,
					byImpact: {} as any,
					byType: {} as any,
				},
				recommendations: [],
				canApply: {
					safe: false,
					withWarnings: true,
					withBreaking: false,
				},
			};

			const result = await detector.applySafeChanges(tempDir, comparison, {
				allowWarning: true,
				dryRun: true,
			});

			expect(result.applied).toHaveLength(1);
			expect(result.rejected).toHaveLength(0);
			expect(result.applied[0].impact).toBe(SchemaChangeImpact.WARNING);
		});

		it("should apply breaking changes when explicitly allowed", async () => {
			const comparison = {
				changes: [
					{
						type: "table_removed" as const,
						category: SchemaChangeCategory.REMOVAL,
						impact: SchemaChangeImpact.BREAKING,
						description: "Removed table",
						target: { type: "table" as const, name: "users" },
					},
				],
				summary: {
					totalChanges: 1,
					byCategory: {} as any,
					byImpact: {} as any,
					byType: {} as any,
				},
				recommendations: [],
				canApply: {
					safe: false,
					withWarnings: false,
					withBreaking: true,
				},
			};

			const result = await detector.applySafeChanges(tempDir, comparison, {
				allowBreaking: true,
				dryRun: true,
			});

			expect(result.applied).toHaveLength(1);
			expect(result.rejected).toHaveLength(0);
			expect(result.applied[0].impact).toBe(SchemaChangeImpact.BREAKING);
		});
	});
});
