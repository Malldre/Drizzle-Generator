/**
 * Interface for the return object of TableGenerator
 */
export interface TableGeneratorResult {
	tableCode: string;
	imports: { [importPath: string]: string[] };
	tables: string[];
	error?: string;
}