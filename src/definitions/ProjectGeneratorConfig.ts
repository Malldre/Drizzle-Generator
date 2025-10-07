import { EnumDefinition, HelperDefinition, TableDefinition } from "./index.js";

/**
 * Interface for the main project generation configuration
 */
export interface ProjectGeneratorConfig {
	outputDir: string;
	enums?: EnumDefinition[];
	helpers?: HelperDefinition[];
	tables?: TableDefinition[];
	overwrite?: boolean;
}