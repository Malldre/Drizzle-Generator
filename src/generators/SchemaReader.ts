import { promises as fs } from "fs";
import { join, dirname } from "path";
import { EnumDefinition, HelperDefinition, TableDefinition, ProjectGeneratorConfig } from "../definitions/index.js";
import { SchemaReaderResult } from "../definitions/SchemaReaderResult.js";

/**
 * Reads and parses existing Drizzle schema files back to JSON format
 */
export class SchemaReader {
	private projectPath: string;
	private errors: string[] = [];

	constructor(projectPath: string) {
		this.projectPath = projectPath;
	}

	/**
	 * Read the complete schema from generated files
	 */
	async readSchema(): Promise<SchemaReaderResult> {
		try {
			// Check if project exists
			const exists = await this.checkProjectExists();
			if (!exists) {
				return {
					success: false,
					message: "Project directory not found or not a valid Drizzle project",
					files: { enums: [], helpers: [], tables: [], indexes: [] },
					errors: ["Project directory does not exist or is not a valid Drizzle project"],
					metadata: {
						lastModified: new Date(),
						totalFiles: 0,
						projectPath: this.projectPath,
					},
				};
			}

			// Read file structure
			const files = await this.getFileStructure();

			// Parse each category
			const enums = await this.parseEnums(files.enums);
			const helpers = await this.parseHelpers(files.helpers);
			const tables = await this.parseTables(files.tables);

			// Get metadata
			const metadata = await this.getMetadata(files);

			const schema: ProjectGeneratorConfig = {
				outputDir: this.projectPath,
				enums: enums.length > 0 ? enums : undefined,
				helpers: helpers.length > 0 ? helpers : undefined,
				tables: tables.length > 0 ? tables : undefined,
				overwrite: true,
			};

			return {
				success: this.errors.length === 0,
				message: this.errors.length === 0 ? `Successfully read schema with ${enums.length} enums, ${helpers.length} helpers, ${tables.length} tables` : `Read schema with ${this.errors.length} errors`,
				schema,
				files,
				errors: this.errors.length > 0 ? this.errors : undefined,
				metadata,
			};
		} catch (error) {
			return {
				success: false,
				message: `Failed to read schema: ${error instanceof Error ? error.message : String(error)}`,
				files: { enums: [], helpers: [], tables: [], indexes: [] },
				errors: [String(error)],
				metadata: {
					lastModified: new Date(),
					totalFiles: 0,
					projectPath: this.projectPath,
				},
			};
		}
	}

	/**
	 * Check if the project directory exists and is valid
	 */
	private async checkProjectExists(): Promise<boolean> {
		try {
			await fs.access(this.projectPath);

			// Check if it's a valid project directory by looking for main index file OR subdirectories
			const mainIndex = join(this.projectPath, "index.ts");
			try {
				await fs.access(mainIndex);
				return true;
			} catch {
				// If no main index, check if it has the expected subdirectories
				const expectedDirs = ["enums", "helpers", "tables"];
				let hasValidStructure = false;

				for (const dir of expectedDirs) {
					try {
						await fs.access(join(this.projectPath, dir));
						hasValidStructure = true;
						break;
					} catch {
						// Directory doesn't exist, continue checking
					}
				}

				return hasValidStructure;
			}
		} catch {
			return false;
		}
	}

	/**
	 * Get the file structure of the project
	 */
	private async getFileStructure() {
		const files = {
			enums: [] as string[],
			helpers: [] as string[],
			tables: [] as string[],
			indexes: [] as string[],
		};

		// Read enums directory
		try {
			const enumsDir = join(this.projectPath, "enums");
			await fs.access(enumsDir);
			const enumFiles = await fs.readdir(enumsDir);
			files.enums = enumFiles.filter((f) => f.endsWith(".ts") && f !== "index.ts");
		} catch {
			// Enums directory doesn't exist or is empty
		}

		// Read helpers directory
		try {
			const helpersDir = join(this.projectPath, "helpers");
			await fs.access(helpersDir);
			const helperFiles = await fs.readdir(helpersDir);
			files.helpers = helperFiles.filter((f) => f.endsWith(".ts") && f !== "index.ts");
		} catch {
			// Helpers directory doesn't exist or is empty
		}

		// Read tables directory
		try {
			const tablesDir = join(this.projectPath, "tables");
			await fs.access(tablesDir);
			const tableFiles = await fs.readdir(tablesDir);
			files.tables = tableFiles.filter((f) => f.endsWith(".ts") && f !== "index.ts");
		} catch {
			// Tables directory doesn't exist or is empty
		}

		// Find index files
		const indexFiles = ["index.ts"];
		if (files.enums.length > 0) indexFiles.push("enums/index.ts");
		if (files.helpers.length > 0) indexFiles.push("helpers/index.ts");
		if (files.tables.length > 0) indexFiles.push("tables/index.ts");
		files.indexes = indexFiles;

		return files;
	}

	/**
	 * Parse enum files back to EnumDefinition
	 */
	private async parseEnums(enumFiles: string[]): Promise<EnumDefinition[]> {
		const enums: EnumDefinition[] = [];

		for (const file of enumFiles) {
			try {
				const content = await fs.readFile(join(this.projectPath, "enums", file), "utf-8");
				const enumDef = this.parseEnumContent(content, file);
				if (enumDef) {
					enums.push(enumDef);
				}
			} catch (error) {
				this.errors.push(`Error parsing enum file ${file}: ${error}`);
			}
		}

		return enums;
	}

	/**
	 * Parse enum file content
	 */
	private parseEnumContent(content: string, filename: string): EnumDefinition | null {
		try {
			// Match: export const UserStatus = pgEnum('user_status', ['Active', 'Inactive'] as const);
			const enumMatch = content.match(/export const (\w+) = pgEnum\('([^']+)', \[([^\]]+)\] as const\);/);

			if (!enumMatch) {
				this.errors.push(`Could not parse enum in ${filename}`);
				return null;
			}

			const name = enumMatch[1];
			const valuesString = enumMatch[3];

			// Extract values from ['Value1', 'Value2', ...]
			const valuesMatch = valuesString.match(/'([^']+)'/g);
			if (!valuesMatch) {
				this.errors.push(`Could not parse enum values in ${filename}`);
				return null;
			}

			// Convert PascalCase back to original format
			const values = valuesMatch.map((v) => {
				const cleaned = v.replace(/'/g, "");
				// Convert PascalCase to snake_case
				return cleaned.replace(/([A-Z])/g, (match, p1, offset) => {
					return (offset > 0 ? "_" : "") + p1.toLowerCase();
				});
			});

			return { name, values };
		} catch (error) {
			this.errors.push(`Error parsing enum content in ${filename}: ${error}`);
			return null;
		}
	}

	/**
	 * Parse helper files back to HelperDefinition
	 */
	private async parseHelpers(helperFiles: string[]): Promise<HelperDefinition[]> {
		const helpers: HelperDefinition[] = [];

		for (const file of helperFiles) {
			try {
				const content = await fs.readFile(join(this.projectPath, "helpers", file), "utf-8");
				const helperDef = this.parseHelperContent(content, file);
				if (helperDef) {
					helpers.push(helperDef);
				}
			} catch (error) {
				this.errors.push(`Error parsing helper file ${file}: ${error}`);
			}
		}

		return helpers;
	}

	/**
	 * Parse helper file content
	 */
	private parseHelperContent(content: string, filename: string): HelperDefinition | null {
		try {
			// Match: export const HelperName = { ... };
			const helperMatch = content.match(/export const (\w+) = \{([\s\S]*?)\};/);

			if (!helperMatch) {
				this.errors.push(`Could not parse helper in ${filename}`);
				return null;
			}

			const name = helperMatch[1];
			const bodyContent = helperMatch[2];

			// Parse individual columns
			const columns = this.parseHelperColumns(bodyContent, filename);

			return { name, columns };
		} catch (error) {
			this.errors.push(`Error parsing helper content in ${filename}: ${error}`);
			return null;
		}
	}

	/**
	 * Parse helper columns from body content
	 */
	private parseHelperColumns(bodyContent: string, filename: string): any[] {
		const columns: any[] = [];

		// Match column definitions like: columnName: type('name').constraint()
		const columnMatches = bodyContent.match(/(\w+):\s*([^,\n}]+)/g);

		if (!columnMatches) {
			this.errors.push(`Could not parse helper columns in ${filename}`);
			return [];
		}

		for (const columnMatch of columnMatches) {
			try {
				const column = this.parseColumnDefinition(columnMatch, filename);
				if (column) {
					columns.push(column);
				}
			} catch (error) {
				this.errors.push(`Error parsing column in ${filename}: ${error}`);
			}
		}

		return columns;
	}

	/**
	 * Parse table files back to TableDefinition
	 */
	private async parseTables(tableFiles: string[]): Promise<TableDefinition[]> {
		const tables: TableDefinition[] = [];

		for (const file of tableFiles) {
			try {
				const content = await fs.readFile(join(this.projectPath, "tables", file), "utf-8");
				const tableDef = this.parseTableContent(content, file);
				if (tableDef) {
					tables.push(tableDef);
				}
			} catch (error) {
				this.errors.push(`Error parsing table file ${file}: ${error}`);
			}
		}

		return tables;
	}

	/**
	 * Parse table file content
	 */
	private parseTableContent(content: string, filename: string): TableDefinition | null {
		try {
			// Match: export const tableName = pgTable('table_name', { ... });
			const tableMatch = content.match(/export const (\w+) = pgTable\('([^']+)', \{([\s\S]*?)\}(?:, \([^)]+\) => \(\{[\s\S]*?\}\))?\);/);

			if (!tableMatch) {
				this.errors.push(`Could not parse table in ${filename}`);
				return null;
			}

			const variableName = tableMatch[1];
			const dbName = tableMatch[2];
			const bodyContent = tableMatch[3];

			// Derive table name from filename (remove .ts extension)
			const name = filename.replace(".ts", "");

			// Parse columns and helper references
			const { columns, helperReferences } = this.parseTableBody(bodyContent, filename);

			// Check for composite primary key
			const compositePrimaryKey = this.parseCompositePrimaryKey(content);

			const tableDef: TableDefinition = {
				name,
				columns,
			};

			if (dbName !== name.toLowerCase()) {
				tableDef.dbName = dbName;
			}

			if (helperReferences.length > 0) {
				tableDef.helperReferences = helperReferences;
			}

			if (compositePrimaryKey.length > 0) {
				tableDef.compositePrimaryKey = compositePrimaryKey;
			}

			return tableDef;
		} catch (error) {
			this.errors.push(`Error parsing table content in ${filename}: ${error}`);
			return null;
		}
	}

	/**
	 * Parse table body for columns and helper references
	 */
	private parseTableBody(bodyContent: string, filename: string): { columns: any[]; helperReferences: string[] } {
		const columns: any[] = [];
		const helperReferences: string[] = [];

		// Split by lines and process each
		const lines = bodyContent
			.split("\n")
			.map((line) => line.trim())
			.filter((line) => line);

		for (const line of lines) {
			if (line.startsWith("...")) {
				// Helper reference: ...HelperName
				const helperMatch = line.match(/\.\.\.(\w+)/);
				if (helperMatch) {
					helperReferences.push(helperMatch[1]);
				}
			} else if (line.includes(":")) {
				// Column definition
				const column = this.parseColumnDefinition(line, filename);
				if (column) {
					columns.push(column);
				}
			}
		}

		return { columns, helperReferences };
	}

	/**
	 * Parse column definition from line
	 */
	private parseColumnDefinition(line: string, filename: string): any | null {
		try {
			// Remove trailing comma
			const cleanLine = line.replace(/,$/, "");

			// Match: columnName: type('name').constraints()
			const columnMatch = cleanLine.match(/(\w+):\s*(.+)/);
			if (!columnMatch) return null;

			const name = columnMatch[1];
			const definition = columnMatch[2];

			// Basic column structure
			const column: any = { name };

			// Determine type and parse options
			const typeResult = this.parseColumnType(definition);
			if (typeResult.type) {
				column.type = typeResult.type;
			}
			if (Object.keys(typeResult.options).length > 0) {
				column.options = typeResult.options;
			}

			return column;
		} catch (error) {
			this.errors.push(`Error parsing column definition "${line}" in ${filename}: ${error}`);
			return null;
		}
	}

	/**
	 * Parse column type and options from definition
	 */
	private parseColumnType(definition: string): { type?: string; options: any } {
		const options: any = {};

		// Map Drizzle functions back to our types
		const typeMap: { [key: string]: string } = {
			serial: "serial",
			varchar: "string",
			text: "text",
			integer: "number",
			bigint: "bigint",
			boolean: "boolean",
			timestamp: "date",
			jsonb: "json",
			uuid: "uuid",
		};

		// Check for enum type (doesn't start with known function)
		const enumMatch = definition.match(/^(\w+)\(/);
		if (enumMatch && !typeMap[enumMatch[1]]) {
			options.enumValues = enumMatch[1];

			// Parse enum-specific options
			if (definition.includes(".default(")) {
				const defaultMatch = definition.match(/\.default\('([^']+)'\)/);
				if (defaultMatch) {
					options.default = defaultMatch[1].toLowerCase();
				}
			}
			if (definition.includes(".notNull()")) {
				options.notNull = true;
			}

			return { options };
		}

		// Parse regular types
		let type: string | undefined;
		for (const [drizzleType, ourType] of Object.entries(typeMap)) {
			if (definition.startsWith(drizzleType + "(")) {
				type = ourType;
				break;
			}
		}

		// Parse length option for varchar
		if (definition.includes("{ length:")) {
			const lengthMatch = definition.match(/\{ length: (\d+) \}/);
			if (lengthMatch) {
				options.length = parseInt(lengthMatch[1]);
			}
		}

		// Parse constraints
		if (definition.includes(".primaryKey()")) {
			options.primaryKey = true;
		}
		if (definition.includes(".notNull()")) {
			options.notNull = true;
		}

		// Parse default values
		if (definition.includes(".default(")) {
			const defaultMatch = definition.match(/\.default\(([^)]+)\)/);
			if (defaultMatch) {
				const defaultValue = defaultMatch[1];
				if (defaultValue === "true" || defaultValue === "false") {
					options.default = defaultValue === "true";
				} else if (defaultValue.match(/^\d+$/)) {
					options.default = parseInt(defaultValue);
				} else if (defaultValue.includes("sql`")) {
					const sqlMatch = defaultValue.match(/sql`([^`]+)`/);
					if (sqlMatch) {
						options.default = `sql.${sqlMatch[1]}()`;
					}
				} else {
					options.default = defaultValue.replace(/'/g, "");
				}
			}
		}

		// Parse references
		if (definition.includes(".references(")) {
			const refMatch = definition.match(/\.references\(\(\) => (\w+)\.(\w+)\)/);
			if (refMatch) {
				options.references = {
					table: refMatch[1],
					column: refMatch[2],
				};
			}
		}

		return { type, options };
	}

	/**
	 * Parse composite primary key from table content
	 */
	private parseCompositePrimaryKey(content: string): string[] {
		const compositePKMatch = content.match(/primaryKey\(\{ columns: \[([^\]]+)\] \}\)/);
		if (!compositePKMatch) return [];

		const columnsString = compositePKMatch[1];
		const columnMatches = columnsString.match(/\w+\.(\w+)/g);

		if (!columnMatches) return [];

		return columnMatches.map((match) => match.split(".")[1]);
	}

	/**
	 * Get project metadata
	 */
	private async getMetadata(files: any) {
		try {
			const indexPath = join(this.projectPath, "index.ts");
			const stats = await fs.stat(indexPath);

			const totalFiles = files.enums.length + files.helpers.length + files.tables.length + files.indexes.length;

			return {
				lastModified: stats.mtime,
				totalFiles,
				projectPath: this.projectPath,
			};
		} catch {
			return {
				lastModified: new Date(),
				totalFiles: 0,
				projectPath: this.projectPath,
			};
		}
	}
}

/**
 * Convenience function to read a schema
 */
export async function readSchema(projectPath: string): Promise<SchemaReaderResult> {
	const reader = new SchemaReader(projectPath);
	return await reader.readSchema();
}
