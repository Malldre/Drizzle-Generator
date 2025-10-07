/**
 * Interface for the return object of ColumnGenerator
 */
export interface ColumnGeneratorResult {
	column: string;
	imports: { [importPath: string]: string[] };
	tables: string[];
	error?: string;
}