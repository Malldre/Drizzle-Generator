import { TableDefinition, ColumnGeneratorResult, TableGeneratorResult } from "../definitions";
import { ColumnGenerator } from "./ColumnGenerator";
import { ImportManager, SnakeCase } from "../utils";

/**
 * Generates a complete Drizzle table definition with columns, helpers, and constraints.
 */
export function TableGenerator(definition: TableDefinition): TableGeneratorResult {
	const { name, dbName, columns = [], helperReferences = [], compositePrimaryKey } = definition;

	const result: TableGeneratorResult = {
		tableCode: "",
		imports: {},
		tables: [],
	};

	if (!name || !name.trim()) {
		result.error = "Table name is required.";
		return result;
	}

	if (columns.length === 0 && helperReferences.length === 0) {
		result.error = "Table must have at least one column or helper reference.";
		return result;
	}

	const importManager = new ImportManager();
	const allTables: string[] = [];
	const columnCodes: string[] = [];

	importManager.addImport("drizzle-orm/pg-core", "pgTable");

	// Process columns
	for (const columnDef of columns) {
		const columnResult: ColumnGeneratorResult = ColumnGenerator(columnDef);

		if (columnResult.error) {
			result.error = `Error in column '${columnDef.name}': ${columnResult.error}`;
			return result;
		}

		const cleanColumnCode = columnResult.column.replace(/,+$/, "");
		columnCodes.push(`    ${cleanColumnCode}`);
		importManager.merge(columnResult.imports);
		allTables.push(...columnResult.tables);
	}

	// Process helper references
	const helperSpreads: string[] = [];
	if (helperReferences.length > 0) {
		importManager.addImports("../helpers/index.js", helperReferences);

		helperReferences.forEach((helper) => {
			helperSpreads.push(`    ...${helper}`);
		});
	}

	const tableName = dbName || SnakeCase(name);

	// Build table structure
	const allColumnEntries = [...columnCodes, ...helperSpreads];
	const tableStructure = allColumnEntries.length > 0 ? `{\n${allColumnEntries.join(",\n")}\n}` : "{}";

	// Handle composite primary key
	let compositePKCode = "";
	if (compositePrimaryKey && compositePrimaryKey.length > 1) {
		importManager.addImport("drizzle-orm/pg-core", "primaryKey");
		const tableVarName = name.toLowerCase();
		const pkColumns = compositePrimaryKey.map((col) => `${tableVarName}.${col}`).join(", ");
		compositePKCode = `, (${tableVarName}) => ({\n    compositePK: primaryKey({ columns: [${pkColumns}] })\n})`;
	}

	const tableVarName = name.toLowerCase();
	const tableCode = `export const ${tableVarName} = pgTable('${tableName}', ${tableStructure}${compositePKCode});`;

	result.tableCode = tableCode;
	result.imports = importManager.getImports();
	result.tables = [...new Set(allTables)];

	return result;
}

/**
 * Generates multiple tables and consolidates their imports.
 */
export function generateMultipleTables(definitions: TableDefinition[]) {
	const importManager = new ImportManager();
	const allTables: string[] = [];
	const tableCodes: string[] = [];
	const errors: string[] = [];

	for (const definition of definitions) {
		const result = TableGenerator(definition);

		if (result.error) {
			errors.push(`Error in table '${definition.name}': ${result.error}`);
			continue;
		}

		tableCodes.push(result.tableCode);
		importManager.merge(result.imports);
		allTables.push(...result.tables);
	}

	return {
		tableCodes,
		imports: importManager.getImports(),
		importStatements: importManager.toString(),
		tables: [...new Set(allTables)],
		errors: errors.length > 0 ? errors : undefined,
		fullFile: `${importManager.toString()}\n\n${tableCodes.join("\n\n")}`,
	};
}

/**
 * Generates a complete database schema file with tables and imports.
 */
export function generateCompleteSchema(tableDefinitions: TableDefinition[], additionalImports: { [path: string]: string[] } = {}) {
	const result = generateMultipleTables(tableDefinitions);

	const importManager = new ImportManager();
	importManager.merge(result.imports);
	Object.entries(additionalImports).forEach(([path, imports]) => {
		importManager.addImports(path, imports);
	});

	const fileHeader = `// Generated schema file
// This file contains all table definitions for the database
`;

	return {
		...result,
		fullFile: `${fileHeader}\n${importManager.toString()}\n\n${result.tableCodes.join("\n\n")}`,
		importStatements: importManager.toString(),
	};
}
