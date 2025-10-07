import { ColumnDefinition, ColumnGeneratorResult } from "../definitions";
import { TypeMap, addImportToMap, PascalCase } from "../utils";

/**
 * Converts a column definition to Drizzle column code with imports and table references.
 */
export function ColumnGenerator(definition: ColumnDefinition): ColumnGeneratorResult {
	const { name, type, options = {} } = definition;

	const result: ColumnGeneratorResult = {
		column: "",
		imports: {},
		tables: [],
	};

	const addImport = (importPath: string, importName: string) => {
		addImportToMap(result.imports, importPath, importName);
	};
	let inferredType = type;
	if (!inferredType) {
		if (options.enumValues) {
			inferredType = "enum";
		} else {
			result.error = `Type is required for column '${name}'. Provide either 'type' property or 'enumValues' in options.`;
			return result;
		}
	}

	const drizzleFunc = TypeMap[inferredType.toLowerCase()];

	if (!drizzleFunc) {
		result.error = `Unsupported type '${inferredType}' for column '${name}'.`;
		return result;
	}

	if (inferredType.toLowerCase() !== "enum") {
		addImport("drizzle-orm/pg-core", drizzleFunc);
	}

	let columnCode = `${name}: `;
	let functionArgs: (string | number)[] = [`'${name}'`];

	// Handle type-specific configuration
	if (drizzleFunc === "varchar" && options.length) {
		functionArgs.push(`{ length: ${options.length ?? 255} }`);
	} else if (inferredType.toLowerCase() === "enum" && options.enumValues) {
		columnCode = `${name}: ${options.enumValues}(`;
		functionArgs = [`'${name}'`];
		addImport("../enums/index.js", options.enumValues);
	}

	// Build function call
	if (inferredType.toLowerCase() === "enum" && options.enumValues) {
		columnCode += functionArgs.join(", ");
	} else {
		columnCode += drizzleFunc + "(" + functionArgs.join(", ");
	}

	columnCode += ")";

	// Add chainable options
	if (options.primaryKey) {
		columnCode += ".primaryKey()";
	}

	if (options.notNull) {
		columnCode += ".notNull()";
	}

	if (options.default !== undefined) {
		let defaultValue = options.default;
		if (typeof defaultValue === "string") {
			if (defaultValue === "sql.now()") {
				defaultValue = "sql`now()`";
				addImport("drizzle-orm", "sql");
			} else if (defaultValue.startsWith("sql.")) {
				const sqlFunction = defaultValue.replace(/^sql\.(\w+)\(\)$/, "sql`$1()`");
				defaultValue = sqlFunction;
				addImport("drizzle-orm", "sql");
			} else if (!defaultValue.includes("(") && !defaultValue.includes(".") && !defaultValue.includes("`")) {
				if (inferredType.toLowerCase() === "enum") {
					defaultValue = `'${PascalCase(defaultValue)}'`;
				} else {
					defaultValue = `'${defaultValue}'`;
				}
			}
		}
		columnCode += `.default(${defaultValue})`;
	}

	// Handle foreign key references
	if (options.references) {
		const { table, column: refColumn } = options.references;
		result.tables.push(table);
		columnCode += `.references(() => ${table}.${refColumn})`;
		addImport("../tables/index.js", table);
	}

	columnCode += ",";

	result.column = columnCode;
	result.tables = [...new Set(result.tables)];

	return result;
}
