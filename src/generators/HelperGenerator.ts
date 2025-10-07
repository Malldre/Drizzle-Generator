import { HelperDefinition, ColumnGeneratorResult, HelperGeneratorResult } from "../definitions";
import { ColumnGenerator } from "./index.js";
import { ImportManager } from "../utils";

/**
 * Generates a reusable column helper set that can be spread into multiple tables.
 */
export function HelperGenerator(definition: HelperDefinition): HelperGeneratorResult {
	const { name, columns } = definition;

	const result: HelperGeneratorResult = {
		helperCode: "",
		imports: {},
		tables: [],
	};

	if (!name || !name.trim()) {
		result.error = "Helper name is required.";
		return result;
	}

	if (!columns || columns.length === 0) {
		result.error = "At least one column is required for a helper.";
		return result;
	}

	const importManager = new ImportManager();
	const allTables: string[] = [];
	const columnCodes: string[] = [];

	for (const columnDef of columns) {
		const columnResult: ColumnGeneratorResult = ColumnGenerator(columnDef);

		if (columnResult.error) {
			result.error = `Error in column '${columnDef.name}': ${columnResult.error}`;
			return result;
		}

		const cleanColumnCode = columnResult.column.replace(/,$/, "");
		columnCodes.push(`    ${cleanColumnCode}`);

		importManager.merge(columnResult.imports);
		allTables.push(...columnResult.tables);
	}

	const helperCode = `export const ${name} = {
${columnCodes.join(",\n")}
};`;

	result.helperCode = helperCode;
	result.imports = importManager.getImports();
	result.tables = [...new Set(allTables)];

	return result;
}

/**
 * Generates multiple helpers and consolidates their imports
 *
 * @param {HelperDefinition[]} definitions - Array of helper definitions
 * @returns Object containing all helper codes, consolidated imports, and tables
 */
export function generateMultipleHelpers(definitions: HelperDefinition[]) {
	const importManager = new ImportManager();
	const allTables: string[] = [];
	const helperCodes: string[] = [];
	const errors: string[] = [];

	for (const definition of definitions) {
		const result = HelperGenerator(definition);

		if (result.error) {
			errors.push(`Error in helper '${definition.name}': ${result.error}`);
			continue;
		}

		helperCodes.push(result.helperCode);
		importManager.merge(result.imports);
		allTables.push(...result.tables);
	}

	return {
		helperCodes,
		imports: importManager.getImports(),
		importStatements: importManager.toString(),
		tables: [...new Set(allTables)],
		errors: errors.length > 0 ? errors : undefined,
		fullFile: `${importManager.toString()}\n\n${helperCodes.join("\n\n")}`,
	};
}
