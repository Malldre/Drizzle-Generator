import { describe, it, expect, beforeEach } from "vitest";
import { ImportManager, addImportToMap, mergeImportMaps } from "../../src/utils/AddImport.js";

describe("ImportManager", () => {
	let importManager: ImportManager;

	beforeEach(() => {
		importManager = new ImportManager();
	});

	describe("addImport", () => {
		it("should add a single import", () => {
			importManager.addImport("drizzle-orm/pg-core", "serial");

			expect(importManager.getImports()).toEqual({
				"drizzle-orm/pg-core": ["serial"],
			});
		});

		it("should add multiple imports to the same path", () => {
			importManager.addImport("drizzle-orm/pg-core", "serial");
			importManager.addImport("drizzle-orm/pg-core", "varchar");

			expect(importManager.getImports()).toEqual({
				"drizzle-orm/pg-core": ["serial", "varchar"],
			});
		});

		it("should not add duplicate imports", () => {
			importManager.addImport("drizzle-orm/pg-core", "serial");
			importManager.addImport("drizzle-orm/pg-core", "serial");

			expect(importManager.getImports()).toEqual({
				"drizzle-orm/pg-core": ["serial"],
			});
		});
	});

	describe("addImports", () => {
		it("should add multiple imports at once", () => {
			importManager.addImports("drizzle-orm/pg-core", ["serial", "varchar", "boolean"]);

			expect(importManager.getImports()).toEqual({
				"drizzle-orm/pg-core": ["serial", "varchar", "boolean"],
			});
		});
	});

	describe("merge", () => {
		it("should merge from another ImportManager", () => {
			const otherManager = new ImportManager();
			otherManager.addImport("drizzle-orm/pg-core", "serial");
			otherManager.addImport("drizzle-orm", "sql");

			importManager.addImport("react", "useState");
			importManager.merge(otherManager);

			expect(importManager.getImports()).toEqual({
				react: ["useState"],
				"drizzle-orm/pg-core": ["serial"],
				"drizzle-orm": ["sql"],
			});
		});

		it("should merge from ImportMap object", () => {
			const importMap = {
				"drizzle-orm/pg-core": ["serial", "varchar"],
				"drizzle-orm": ["sql"],
			};

			importManager.addImport("react", "useState");
			importManager.merge(importMap);

			expect(importManager.getImports()).toEqual({
				react: ["useState"],
				"drizzle-orm/pg-core": ["serial", "varchar"],
				"drizzle-orm": ["sql"],
			});
		});
	});

	describe("hasImport", () => {
		beforeEach(() => {
			importManager.addImport("drizzle-orm/pg-core", "serial");
			importManager.addImport("drizzle-orm/pg-core", "varchar");
		});

		it("should check if path exists", () => {
			expect(importManager.hasImport("drizzle-orm/pg-core")).toBe(true);
			expect(importManager.hasImport("non-existent")).toBe(false);
		});

		it("should check if specific import exists", () => {
			expect(importManager.hasImport("drizzle-orm/pg-core", "serial")).toBe(true);
			expect(importManager.hasImport("drizzle-orm/pg-core", "boolean")).toBe(false);
		});
	});

	describe("generateImportStatements", () => {
		it("should generate import statements", () => {
			importManager.addImport("drizzle-orm/pg-core", "varchar");
			importManager.addImport("drizzle-orm/pg-core", "serial");
			importManager.addImport("drizzle-orm", "sql");

			const statements = importManager.generateImportStatements();

			expect(statements).toEqual(["import { serial, varchar } from 'drizzle-orm/pg-core';", "import { sql } from 'drizzle-orm';"]);
		});

		it("should sort imports alphabetically within each path", () => {
			importManager.addImport("drizzle-orm/pg-core", "varchar");
			importManager.addImport("drizzle-orm/pg-core", "boolean");
			importManager.addImport("drizzle-orm/pg-core", "serial");

			const statements = importManager.generateImportStatements();

			expect(statements[0]).toBe("import { boolean, serial, varchar } from 'drizzle-orm/pg-core';");
		});

		it("should filter out empty import arrays", () => {
			importManager.addImport("drizzle-orm/pg-core", "serial");
			const imports = importManager.getImports();
			imports["empty-path"] = [];

			const statements = importManager.generateImportStatements();

			expect(statements).toEqual(["import { serial } from 'drizzle-orm/pg-core';"]);
		});
	});

	describe("toString", () => {
		it("should return formatted import statements", () => {
			importManager.addImport("drizzle-orm/pg-core", "serial");
			importManager.addImport("drizzle-orm", "sql");

			const result = importManager.toString();

			// The order depends on Object.entries() which preserves insertion order
			expect(result).toBe("import { serial } from 'drizzle-orm/pg-core';\nimport { sql } from 'drizzle-orm';");
		});
	});

	describe("clear", () => {
		it("should clear all imports", () => {
			importManager.addImport("drizzle-orm/pg-core", "serial");
			importManager.addImport("drizzle-orm", "sql");

			importManager.clear();

			expect(importManager.getImports()).toEqual({});
		});
	});
});

describe("addImportToMap", () => {
	it("should add import to new path", () => {
		const imports = {};
		addImportToMap(imports, "drizzle-orm/pg-core", "serial");

		expect(imports).toEqual({
			"drizzle-orm/pg-core": ["serial"],
		});
	});

	it("should add import to existing path", () => {
		const imports = {
			"drizzle-orm/pg-core": ["serial"],
		};
		addImportToMap(imports, "drizzle-orm/pg-core", "varchar");

		expect(imports).toEqual({
			"drizzle-orm/pg-core": ["serial", "varchar"],
		});
	});

	it("should not add duplicate imports", () => {
		const imports = {
			"drizzle-orm/pg-core": ["serial"],
		};
		addImportToMap(imports, "drizzle-orm/pg-core", "serial");

		expect(imports).toEqual({
			"drizzle-orm/pg-core": ["serial"],
		});
	});
});

describe("mergeImportMaps", () => {
	it("should merge two import maps", () => {
		const target = {
			"drizzle-orm/pg-core": ["serial"],
		};
		const source = {
			"drizzle-orm/pg-core": ["varchar"],
			"drizzle-orm": ["sql"],
		};

		mergeImportMaps(target, source);

		expect(target).toEqual({
			"drizzle-orm/pg-core": ["serial", "varchar"],
			"drizzle-orm": ["sql"],
		});
	});
});
