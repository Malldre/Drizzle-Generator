import { promises as fs } from "fs";
import { join, dirname } from "path";
import { EnumGenerator } from "./EnumGenerator";
import { HelperGenerator } from "./HelperGenerator";
import { TableGenerator } from "./TableGenerator";
import { ImportManager } from "../utils";
import { ProjectGeneratorConfig, ProjectGeneratorResult } from "../definitions";

/**
 * Main project generator that creates the complete Drizzle structure
 */
export class ProjectGenerator {
	private config: ProjectGeneratorConfig;
	private generatedFiles: string[] = [];
	private errors: string[] = [];

	constructor(config: ProjectGeneratorConfig) {
		this.config = config;
	}

	/**
	 * Generate the complete project structure
	 */
	async generate(): Promise<ProjectGeneratorResult> {
		try {
			// Create base output directory
			await this.ensureDirectory(this.config.outputDir);

			// Create subdirectories
			const enumsDir = join(this.config.outputDir, "enums");
			const helpersDir = join(this.config.outputDir, "helpers");
			const tablesDir = join(this.config.outputDir, "tables");

			await this.ensureDirectory(enumsDir);
			await this.ensureDirectory(helpersDir);
			await this.ensureDirectory(tablesDir);

			// Generate enums
			const enumFiles = await this.generateEnums(enumsDir);

			// Generate helpers
			const helperFiles = await this.generateHelpers(helpersDir);

			// Generate tables
			const tableFiles = await this.generateTables(tablesDir);

			// Generate index files
			const indexFiles = await this.generateIndexFiles({
				enumsDir,
				helpersDir,
				tablesDir,
				enumFiles,
				helperFiles,
				tableFiles,
			});

			const result: ProjectGeneratorResult = {
				success: this.errors.length === 0,
				message: this.errors.length === 0 ? `Successfully generated ${this.generatedFiles.length} files` : `Generated with ${this.errors.length} errors`,
				errors: this.errors.length > 0 ? this.errors : undefined,
				generatedFiles: this.generatedFiles,
				structure: {
					enumsDir,
					helpersDir,
					tablesDir,
					files: {
						enums: enumFiles,
						helpers: helperFiles,
						tables: tableFiles,
						indexes: indexFiles,
					},
				},
			};

			return result;
		} catch (error) {
			return {
				success: false,
				message: `Failed to generate project: ${error instanceof Error ? error.message : String(error)}`,
				errors: [String(error)],
				generatedFiles: this.generatedFiles,
				structure: {
					enumsDir: "",
					helpersDir: "",
					tablesDir: "",
					files: { enums: [], helpers: [], tables: [], indexes: [] },
				},
			};
		}
	}

	/**
	 * Generate enum files
	 */
	private async generateEnums(enumsDir: string): Promise<string[]> {
		const enumFiles: string[] = [];

		if (!this.config.enums || this.config.enums.length === 0) {
			return enumFiles;
		}

		for (const enumDef of this.config.enums) {
			try {
				const result = EnumGenerator(enumDef);

				if (result.error) {
					this.errors.push(`Enum '${enumDef.name}': ${result.error}`);
					continue;
				}

				const fileName = `${enumDef.name}.ts`;
				const filePath = join(enumsDir, fileName);

				// Create complete file content with imports
				const importManager = new ImportManager();
				importManager.merge(result.imports);

				const fileContent = `${importManager.toString()}\n\n${result.enumCode}\n`;

				await this.writeFile(filePath, fileContent);
				enumFiles.push(fileName);
			} catch (error) {
				this.errors.push(`Error generating enum '${enumDef.name}': ${error}`);
			}
		}

		return enumFiles;
	}

	/**
	 * Generate helper files
	 */
	private async generateHelpers(helpersDir: string): Promise<string[]> {
		const helperFiles: string[] = [];

		if (!this.config.helpers || this.config.helpers.length === 0) {
			return helperFiles;
		}

		for (const helperDef of this.config.helpers) {
			try {
				const result = HelperGenerator(helperDef);

				if (result.error) {
					this.errors.push(`Helper '${helperDef.name}': ${result.error}`);
					continue;
				}

				const fileName = `${helperDef.name}.ts`;
				const filePath = join(helpersDir, fileName);

				// Create complete file content with imports
				const importManager = new ImportManager();
				importManager.merge(result.imports);

				const fileContent = `${importManager.toString()}\n\n${result.helperCode}\n`;

				await this.writeFile(filePath, fileContent);
				helperFiles.push(fileName);
			} catch (error) {
				this.errors.push(`Error generating helper '${helperDef.name}': ${error}`);
			}
		}

		return helperFiles;
	}

	/**
	 * Generate table files
	 */
	private async generateTables(tablesDir: string): Promise<string[]> {
		const tableFiles: string[] = [];

		if (!this.config.tables || this.config.tables.length === 0) {
			return tableFiles;
		}

		for (const tableDef of this.config.tables) {
			try {
				const result = TableGenerator(tableDef);

				if (result.error) {
					this.errors.push(`Table '${tableDef.name}': ${result.error}`);
					continue;
				}

				const fileName = `${tableDef.name}.ts`;
				const filePath = join(tablesDir, fileName);

				// Create complete file content with imports
				const importManager = new ImportManager();
				importManager.merge(result.imports);

				const fileContent = `${importManager.toString()}\n\n${result.tableCode}\n`;

				await this.writeFile(filePath, fileContent);
				tableFiles.push(fileName);
			} catch (error) {
				this.errors.push(`Error generating table '${tableDef.name}': ${error}`);
			}
		}

		return tableFiles;
	}

	/**
	 * Generate index files for each directory
	 */
	private async generateIndexFiles(params: { enumsDir: string; helpersDir: string; tablesDir: string; enumFiles: string[]; helperFiles: string[]; tableFiles: string[] }): Promise<string[]> {
		const indexFiles: string[] = [];

		try {
			// Generate enums index
			if (params.enumFiles.length > 0) {
				const enumIndexPath = join(params.enumsDir, "index.ts");
				const enumExports = params.enumFiles.map((file) => `export * from './${file.replace(".ts", "")}.js';`).join("\n");

				await this.writeFile(enumIndexPath, `${enumExports}\n`);
				indexFiles.push("enums/index.ts");
			}

			// Generate helpers index
			if (params.helperFiles.length > 0) {
				const helperIndexPath = join(params.helpersDir, "index.ts");
				const helperExports = params.helperFiles.map((file) => `export * from './${file.replace(".ts", "")}.js';`).join("\n");

				await this.writeFile(helperIndexPath, `${helperExports}\n`);
				indexFiles.push("helpers/index.ts");
			}

			// Generate tables index
			if (params.tableFiles.length > 0) {
				const tableIndexPath = join(params.tablesDir, "index.ts");
				const tableExports = params.tableFiles.map((file) => `export * from './${file.replace(".ts", "")}.js';`).join("\n");

				await this.writeFile(tableIndexPath, `${tableExports}\n`);
				indexFiles.push("tables/index.ts");
			}

			// Generate main index file
			const mainIndexPath = join(this.config.outputDir, "index.ts");
			const mainExports: string[] = [];

			if (params.enumFiles.length > 0) {
				mainExports.push("export * from './enums/index.js';");
			}
			if (params.helperFiles.length > 0) {
				mainExports.push("export * from './helpers/index.js';");
			}
			if (params.tableFiles.length > 0) {
				mainExports.push("export * from './tables/index.js';");
			}

			if (mainExports.length > 0) {
				await this.writeFile(mainIndexPath, `${mainExports.join("\n")}\n`);
				indexFiles.push("index.ts");
			}
		} catch (error) {
			this.errors.push(`Error generating index files: ${error}`);
		}

		return indexFiles;
	}

	/**
	 * Ensure directory exists
	 */
	private async ensureDirectory(dirPath: string): Promise<void> {
		try {
			await fs.access(dirPath);
		} catch {
			await fs.mkdir(dirPath, { recursive: true });
		}
	}

	/**
	 * Write file with overwrite check
	 */
	private async writeFile(filePath: string, content: string): Promise<void> {
		// Check if file exists and overwrite is disabled
		if (!this.config.overwrite) {
			try {
				await fs.access(filePath);
				this.errors.push(`File already exists: ${filePath} (use overwrite: true to replace)`);
				return;
			} catch {
				// File doesn't exist, proceed
			}
		}

		// Ensure directory exists
		await this.ensureDirectory(dirname(filePath));

		// Write file
		await fs.writeFile(filePath, content, "utf-8");
		this.generatedFiles.push(filePath);
	}
}

/**
 * Convenience function to generate a complete project
 */
export async function generateProject(config: ProjectGeneratorConfig): Promise<ProjectGeneratorResult> {
	const generator = new ProjectGenerator(config);
	return await generator.generate();
}
