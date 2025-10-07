/**
 * Interface for the return object of HelperGenerator
 */
export interface HelperGeneratorResult {
	helperCode: string;
	imports: { [importPath: string]: string[] };
	tables: string[];
	error?: string;
}